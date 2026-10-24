"""What each KH1 chest needs, read from Archipelago's KH1 logic (tools/sources/ap-kh1-Rules.py, MIT).

Archipelago writes one rule per location as a lambda over a CollectionState. This walks those
lambdas symbolically at its easiest ("Beginner") difficulty with every randomizer option off,
which is the closest match to the vanilla game, and turns each into alternatives: a list of
requirement sets, any one of which is enough. An atom is "Item" or "Item:count".

Anything it can't read (combat checks, world counts, unknown helpers) counts as already met:
the companion should never claim a chest is locked when it isn't.
"""
import ast
from pathlib import Path

LOGIC = {"LOGIC_BEGINNER": 0, "LOGIC_NORMAL": 5, "LOGIC_PROUD": 10, "LOGIC_MINIMAL": 15}
DIFFICULTY = 0
TRUE = [frozenset()]
FALSE = []
# Items that are worlds or that every vanilla player has by the time it matters.
ALWAYS = {
    "Destiny Islands", "Traverse Town", "Wonderland", "Olympus Coliseum", "Deep Jungle", "Agrabah", "Monstro",
    "Atlantica", "Halloween Town", "Neverland", "Hollow Bastion", "End of the World", "100 Acre Wood",
}


def _and(a, b):
    return _min([x | y for x in a for y in b])


def _or(a, b):
    return _min(a + b)


def _min(alts):
    alts = list(dict.fromkeys(alts))
    return [a for a in alts if not any(o < a for o in alts)]


def _atom(item, count=1):
    if item in ALWAYS:
        return TRUE
    return [frozenset({item if count == 1 else f"{item}:{count}"})]


def _dnf(v):
    if isinstance(v, list):
        return v
    if v is None:
        return TRUE  # unknown: assume met
    return TRUE if v else FALSE


class Walker:
    def __init__(self, module):
        self.helpers = {f.name: f for f in module.body if isinstance(f, ast.FunctionDef)}

    def eval(self, node, env):
        m = getattr(self, "_" + type(node).__name__, None)
        return m(node, env) if m else None

    def _Constant(self, n, env):
        return n.value

    def _Name(self, n, env):
        if n.id in LOGIC:
            return LOGIC[n.id]
        if n.id in ("difficulty", "logic_difficulty"):
            return DIFFICULTY
        if n.id in env:
            return env[n.id]
        return False  # option-derived locals (stacking_world_items, ...) are off in vanilla

    def _Attribute(self, n, env):
        return False  # options.* : every randomizer option off

    def _Set(self, n, env):
        return [self.eval(e, env) for e in n.elts]

    _List = _Set

    def _Dict(self, n, env):
        return {self.eval(k, env): self.eval(v, env) for k, v in zip(n.keys, n.values)}

    def _BoolOp(self, n, env):
        vals = [self.eval(v, env) for v in n.values]
        if all(not isinstance(v, list) and v is not None for v in vals):
            return all(vals) if isinstance(n.op, ast.And) else any(vals)
        out = _dnf(vals[0])
        for v in vals[1:]:
            out = _and(out, _dnf(v)) if isinstance(n.op, ast.And) else _or(out, _dnf(v))
        return out

    def _UnaryOp(self, n, env):
        v = self.eval(n.operand, env)
        if isinstance(n.op, ast.Not) and not isinstance(v, list) and v is not None:
            return not v
        return None

    def _Compare(self, n, env):
        left = self.eval(n.left, env)
        if len(n.ops) != 1:
            return None
        right = self.eval(n.comparators[0], env)
        if isinstance(left, list) or isinstance(right, list) or left is None or right is None:
            return None
        try:
            return {ast.Gt: left > right, ast.GtE: left >= right, ast.Lt: left < right, ast.LtE: left <= right,
                    ast.Eq: left == right, ast.NotEq: left != right}[type(n.ops[0])]
        except (KeyError, TypeError):
            return None

    def _Call(self, n, env):
        f = n.func
        args = [self.eval(a, env) for a in n.args]
        if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id == "state":
            if f.attr == "has":
                count = args[2] if len(args) > 2 else 1
                ok = isinstance(args[0], str) and isinstance(count, int) and not isinstance(count, bool)
                return _atom(args[0], count) if ok else None
            if f.attr in ("has_all", "has_any"):
                out = TRUE if f.attr == "has_all" else FALSE
                for item in args[0] or []:
                    out = _and(out, _atom(item)) if f.attr == "has_all" else _or(out, _atom(item))
                return out
            if f.attr in ("has_all_counts", "has_any_count"):
                out = TRUE if f.attr == "has_all_counts" else FALSE
                for item, count in (args[0] or {}).items():
                    out = _and(out, _atom(item, count)) if f.attr == "has_all_counts" else _or(out, _atom(item, count))
                return out
            return None  # has_group etc.
        if isinstance(f, ast.Name) and f.id in self.helpers:
            fn = self.helpers[f.id]
            params = [a.arg for a in fn.args.args]
            local = dict(zip(params, args))
            for p in ("logic_difficulty", "difficulty"):
                if p in local:
                    local[p] = DIFFICULTY
            ret = next((s for s in fn.body if isinstance(s, ast.Return)), None)
            if f.id in ("has_x_worlds", "has_emblems", "has_puppies", "has_basic_tools", "has_defensive_tools",
                        "has_offensive_magic", "has_lucky_emblems", "has_final_rest_door"):
                return None  # world counts, combat readiness: not a place you can't reach
            return self.eval(ret.value, local) if ret else None
        return None

    def _Lambda(self, n, env):
        return self.eval(n.body, env)


def chest_requirements(rules_path):
    """{location name: [[atom, ...], ...]} for locations with a real requirement."""
    module = ast.parse(Path(rules_path).read_text(encoding="utf-8"))
    w = Walker(module)
    out = {}
    for node in ast.walk(module):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "add_rule"):
            continue
        target, rule = node.args[0], node.args[1]
        if not (isinstance(target, ast.Call) and isinstance(target.func, ast.Attribute)
                and target.func.attr == "get_location" and isinstance(target.args[0], ast.Constant)):
            continue
        name = target.args[0].value
        dnf = _dnf(w.eval(rule, {}))
        out[name] = _and(out.get(name, TRUE), dnf)
    return {k: sorted(sorted(a) for a in v) for k, v in out.items() if v != TRUE}


if __name__ == "__main__":
    import collections
    import sys
    reqs = chest_requirements(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / "sources" / "ap-kh1-Rules.py")
    atoms = collections.Counter(a.split(":")[0] for alts in reqs.values() for alt in alts for a in alt)
    print(len(reqs), "locations with requirements")
    for a, n in atoms.most_common():
        print(f"  {n:4d}  {a}")
