package com.kh1companion

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.io.File

/**
 * Setup and settings. First run walks through a checklist (permissions, the two GameNative steps,
 * a first launch that confirms it works, then pairing it with the game in a launcher); after that
 * the app icon opens the companion (see [handleLaunch]). Advanced has the settings and Remove
 * everything. The companion itself runs in [CompanionService].
 */
class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private lateinit var steps: LinearLayout
    private lateinit var removal: LinearLayout
    private lateinit var statePath: EditText
    private lateinit var devUrl: EditText
    private lateinit var gameId: EditText
    private var pad = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        Installer.deploy(this)
        if (handleLaunch(intent)) return
        pad = (16 * resources.displayMetrics.density).toInt()
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }
        col.addView(text("KH1 Companion", 22f, bold = true))
        col.addView(text("Shows your progress, a spoiler-free guide, maps and level-ups on the bottom screen while you play. " +
            "Version ${packageManager.getPackageInfo(packageName, 0).versionName}.", 15f))
        steps = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        col.addView(steps)

        statePath = EditText(this).apply { setText(prefs.statePath); inputType = InputType.TYPE_CLASS_TEXT }
        gameId = EditText(this).apply { setText(prefs.gameAppId.toString()); inputType = InputType.TYPE_CLASS_NUMBER }
        devUrl = EditText(this).apply {
            setText(prefs.devUrl)
            hint = "empty = bundled page; e.g. http://192.168.1.20:8737/"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
        }
        val advanced = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
        advanced.addView(text("GameNative game (Steam app id of KINGDOM HEARTS HD 1.5+2.5 ReMIX)", 14f))
        advanced.addView(gameId)
        advanced.addView(text("State file the game writes", 14f))
        advanced.addView(statePath)
        advanced.addView(text("Dev URL (PC dev server, run with --lan)", 14f))
        advanced.addView(devUrl)
        advanced.addView(button("Save") { save(); Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show() })
        advanced.addView(button("Close companion") { CompanionService.stop(this) })
        removal = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        advanced.addView(removal)
        advanced.addView(text(licenses(), 12f))
        col.addView(button("Advanced") { advanced.visibility = if (advanced.visibility == View.GONE) View.VISIBLE else View.GONE })
        col.addView(advanced)
        setContentView(ScrollView(this).apply { addView(col) })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleLaunch(intent)
    }

    override fun onResume() {
        super.onResume()
        if (::steps.isInitialized) {
            Installer.deploy(this)
            refresh()
        }
    }

    /**
     * Once set up, the app icon opens the companion on the bottom screen; it never starts the game.
     * That's what a launcher's companion-app setting expects (Cocoon Shell starts the game itself,
     * then opens this), and opening it while it's already up leaves it open. It closes itself when
     * the game exits ([WatchActivity]), or from its close button, its notification, or the icon's Close companion
     * shortcut. Until setup is done, the icon opens setup. Returns true when the activity finished
     * instead of showing this screen.
     */
    private fun handleLaunch(intent: Intent): Boolean {
        val ready = Settings.canDrawOverlays(this) && Environment.isExternalStorageManager()
        val start = intent.getBooleanExtra("start", false) || intent.action == ACTION_COMPANION // adb: `--ez start true`
        val tap = intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_LAUNCHER)
        val setUp = ready && Installer.installed(this)
        when {
            intent.action == ACTION_CLOSE -> {
                CompanionService.stop(this)
                Toast.makeText(this, "Companion closed", Toast.LENGTH_SHORT).show()
            }
            (start || (tap && setUp)) && ready -> {
                val already = CompanionService.running
                startForegroundService(Intent(this, CompanionService::class.java))
                // Watch for the game closing (see WatchActivity); once is enough.
                if (!already) startActivity(Intent(this, WatchActivity::class.java))
            }
            else -> return false
        }
        finish()
        return true
    }

    private fun refresh() {
        steps.removeAllViews()
        val overlay = Settings.canDrawOverlays(this)
        val files = Environment.isExternalStorageManager()
        val gn = Installer.gameNativeInstalled(this)
        val working = files && Installer.installed(this)
        val openGameNative = "Open GameNative" to {
            packageManager.getLaunchIntentForPackage(Installer.GAMENATIVE)?.let { startActivity(it) }
                ?: Toast.makeText(this, "GameNative isn't installed", Toast.LENGTH_SHORT).show()
        }

        step("1. Show on the second screen", overlay,
            "Lets the companion draw on the bottom screen without taking the controller from the game. " +
                "In the list that opens, pick KH1 Companion and turn it on.",
            if (!overlay) listOf("Allow" to { startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))) }) else emptyList())
        step("2. Read the game's progress", files,
            "The game writes its progress to the Download folder; this lets the companion read it. Turn on All files access.",
            if (!files) listOf("Allow" to { startActivity(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName"))) }) else emptyList())
        if (!gn) {
            step("3. GameNative", false, "Install GameNative and KINGDOM HEARTS HD 1.5+2.5 ReMIX in it first.", emptyList())
        } else {
            step("3. Copy the mod into the game", working,
                "In GameNative, copy two files the app has ready for you into the game's folder. About a minute.",
                if (!working && files) listOf(openGameNative) else emptyList())
            if (!working && files) guide("import", listOf(
                "In GameNative, pick KINGDOM HEARTS HD 1.5+2.5 ReMIX and tap the gear." to "gear",
                "Scroll down and tap Import Files." to "import-menu",
                "Tap Select files." to "select-files",
                "Go to Download › KH1Companion › mod. Press and hold DINPUT8.dll, tap LuaBackend.toml so both are " +
                    "selected, then tap Select." to "pick-files",
                "Leave Game Directory as the place, tick Replace existing files, and tap Copy 2 files." to "copy",
            ))
            step("4. Turn the mod on", working,
                "Add one setting to the game in GameNative. The app copies the text for you, so there's nothing to type.",
                if (!working && files) listOf(openGameNative) else emptyList())
            if (!working && files) guide("setting", listOf(
                "Tap the gear again, then Edit container." to "edit-container",
                "Open the Environment tab." to "environment-tab",
                "Scroll to the bottom and tap the + button." to "add-variable",
                "Tap Copy name below, then press and hold the Name box in GameNative and choose Paste. Do the same with " +
                    "Copy value for the Value box. Tap Ok." to "new-variable",
                "Tap the save icon at the top right." to "save",
            ), actionsAfter = 3, actions = listOf(
                "Copy name" to { copy(Installer.OVERRIDE_NAME) },
                "Copy value" to { copy(Installer.OVERRIDE_VALUE) },
            ))
            step("5. Check it", working,
                if (working) "Working: the game has talked to the companion."
                else "Start the game here. Once its title screen shows, the companion connects and this ticks itself off. " +
                    "If it doesn't, the companion's \"Not connecting?\" help lists what to check.",
                if (!working && overlay && files) listOf("Start the game" to { startGame() }) else emptyList())
            step("6. Open it with the game", false,
                "The companion opens from its own icon and closes by itself when the game exits. To have it open with the " +
                    "game too, in Cocoon Shell set KH1 Companion as Kingdom Hearts' companion app: launching the game " +
                    "from Cocoon then opens both. Without Cocoon, start the game, then tap the KH1 Companion icon.",
                emptyList(), mark = false)
            step("7. Optional: start straight into Kingdom Hearts Final Mix", false,
                "Out of the box, GameNative opens the collection's menu and you pick KH1 there, and quitting KH1 drops you " +
                    "back in that menu with the companion still open. Point GameNative straight at KH1 to go right into the " +
                    "game, and quitting closes the game and the companion together.",
                emptyList(), mark = false)
            guide("direct", listOf(
                "In GameNative, open KINGDOM HEARTS HD 1.5+2.5 ReMIX, tap the gear, then Edit container." to "edit-container",
                "On the General tab, tap Executable Path." to "general-tab",
                "Pick KINGDOM HEARTS FINAL MIX.exe. (To go back to the collection's menu later, pick " +
                    "KINGDOM HEARTS HD 1.5+2.5 Launcher.exe the same way.)" to "exe-list",
                "Tap the save icon at the top right." to "save",
            ))
        }
        steps.addView(text(if (working) "All set. The KH1 Companion icon opens the companion, and it closes by itself when the game exits."
            else "", 15f, bold = true))
        steps.addView(text("Black screen in the game? Set its display mode to fullscreen or borderless in the game's settings. " +
            "Windowed mode can sync from a PC through Steam Cloud and shows black under GameNative.", 13f))
        refreshRemoval()
    }

    /** Remove everything: the bridge takes itself out of the game on its next start, then files, then the app. */
    private fun refreshRemoval() {
        removal.removeAllViews()
        val result = Installer.removeResult()
        val pending = Installer.removalPending()
        val removed = result?.first == true
        removal.addView(text("Remove everything", 18f, bold = true))
        step("1. Take the mod out of the game", removed,
            when {
                removed -> "Done: the mod is out of the game folder and won't load again."
                result?.first == false -> "That didn't work: ${result.second}. Try again, or reinstall the game in GameNative."
                pending -> "Ready. Start the game once: the mod removes itself from the game folder as it loads (the companion stays quiet), then quit the game."
                else -> "No GameNative steps needed: the next time the game starts, the mod removes itself from the game folder."
            },
            when {
                removed -> emptyList()
                pending -> listOf("Start the game once" to { startGame() },
                    "Cancel" to { Installer.cancelRemoval(); refresh() })
                else -> listOf("Remove from the game" to {
                    CompanionService.stop(this)
                    if (!Installer.requestRemoval(this)) Toast.makeText(this, "Needs All files access", Toast.LENGTH_SHORT).show()
                    refresh()
                })
            }, into = removal)
        step("2. Optional: tidy GameNative's settings", false,
            "In GameNative: ⚙ → Edit container → Environment → delete ${Installer.OVERRIDE_NAME}. Harmless to leave once " +
                "the mod is out. If you pointed the game straight at KH1 (setup step 6), you can set Executable Path back " +
                "to KINGDOM HEARTS HD 1.5+2.5 Launcher.exe on the General tab.", emptyList(), into = removal, mark = false)
        step("3. Delete the companion's files", false, "Removes Download/KH1Companion.",
            listOf("Delete files" to {
                if (Installer.removalPending()) {
                    Toast.makeText(this, "Start the game once first, so the mod can remove itself", Toast.LENGTH_LONG).show()
                } else {
                    CompanionService.stop(this)
                    Toast.makeText(this, if (Installer.deleteFiles(this)) "Files deleted" else "Couldn't delete everything", Toast.LENGTH_SHORT).show()
                    refresh()
                }
            }), into = removal, mark = false)
        step("4. Uninstall this app", false, "", listOf("Uninstall" to {
            CompanionService.stop(this)
            startActivity(Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName")))
        }), into = removal, mark = false)
    }

    private val guidesOpen = mutableSetOf<String>()

    /** What the guide pictures show; screens may differ in other GameNative versions (tools/make_guide_images.py). */
    private val GUIDE_SOURCE = "Pictures from GameNative 1.3.0 on an AYN Thor (Android 13). Newer GameNative versions may look different."

    /** "Show me how": numbered pictures of the GameNative screens, plus any buttons the steps need. */
    private fun guide(key: String, shots: List<Pair<String, String>>, actions: List<Pair<String, () -> Unit>> = emptyList(),
                      actionsAfter: Int = shots.lastIndex) {
        val open = key in guidesOpen
        steps.addView(button(if (open) "Hide the pictures" else "Show me how, with pictures") {
            if (!guidesOpen.remove(key)) guidesOpen.add(key)
            refresh()
        })
        if (!open) return
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(pad, 0, 0, pad) }
        box.addView(text(GUIDE_SOURCE, 12f))
        shots.forEachIndexed { i, (text, image) ->
            box.addView(text("${i + 1}. $text", 15f, bold = true))
            try {
                // Screenshots of this very screen: show them pixel for pixel, not scaled up by density.
                val bmp = assets.open("guide/$image.png").use { BitmapFactory.decodeStream(it) }
                bmp.density = resources.displayMetrics.densityDpi
                box.addView(ImageView(this).apply {
                    setImageBitmap(bmp)
                    adjustViewBounds = true
                    scaleType = ImageView.ScaleType.FIT_START
                    setPadding(0, pad / 4, 0, pad / 2)
                }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT))
            } catch (e: Exception) { /* picture missing: the text still says it */ }
            if (i == actionsAfter) for ((label, run) in actions) box.addView(button(label, run))
        }
        steps.addView(box)
    }

    private fun step(title: String, done: Boolean, detail: String, actions: List<Pair<String, () -> Unit>>,
                     into: LinearLayout = steps, mark: Boolean = true) {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, pad, 0, 0) }
        box.addView(text((if (mark) (if (done) "✓ " else "○ ") else "") + title, 18f, bold = true))
        if (detail.isNotEmpty()) box.addView(text(detail, 14f))
        for ((label, run) in actions) box.addView(button(label, run))
        into.addView(box)
    }

    private fun startGame() {
        if (!Installer.launchGame(this)) Toast.makeText(this, "GameNative isn't installed", Toast.LENGTH_LONG).show()
    }

    private fun copy(value: String) {
        getSystemService(ClipboardManager::class.java).setPrimaryClip(ClipData.newPlainText("KH1 companion", value))
        Toast.makeText(this, "Copied: $value", Toast.LENGTH_SHORT).show()
    }

    private fun text(s: String, size: Float, bold: Boolean = false) = TextView(this).apply {
        text = s; textSize = size; setPadding(0, pad / 4, 0, pad / 4)
        if (bold) setTypeface(typeface, Typeface.BOLD)
    }

    private fun button(label: String, onClick: () -> Unit) =
        Button(this).apply { text = label; setOnClickListener { onClick() } }

    private fun licenses() = try {
        assets.open("mod/NOTICE.txt").bufferedReader().readText() +
            "\nThe full license text is in Download/KH1Companion/mod/LuaBackend-LICENSE.txt."
    } catch (e: Exception) { "" }

    private fun save() {
        prefs.statePath = statePath.text.toString().ifBlank { Prefs.defaultStatePath() }
        prefs.devUrl = devUrl.text.toString()
        gameId.text.toString().toIntOrNull()?.let { prefs.gameAppId = it }
    }

    companion object {
        const val ACTION_CLOSE = "com.kh1companion.CLOSE"
        const val ACTION_SETTINGS = "com.kh1companion.SETTINGS"
        const val ACTION_COMPANION = "com.kh1companion.COMPANION"
    }
}
