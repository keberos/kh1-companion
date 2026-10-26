package com.kh1companion

import android.app.Activity
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
 * Setup and settings. First run walks through a checklist (permissions, the GameNative step, a
 * first launch that confirms it works, then pairing it with the game in a launcher); after that
 * the app icon opens the companion (see [handleLaunch]). Below the checklist: Close companion,
 * Remove everything, and Advanced settings. The companion itself runs in [CompanionService].
 */
class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private lateinit var steps: LinearLayout
    private lateinit var update: LinearLayout
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
        col.addView(text("Your progress, room maps, chests, bosses and level-ups on the bottom screen while you play.", 15f))
        col.addView(heading("Updates"))
        update = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        col.addView(update)
        col.addView(heading("Setup"))
        steps = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        col.addView(steps)

        statePath = EditText(this).apply { setText(prefs.statePath); inputType = InputType.TYPE_CLASS_TEXT }
        gameId = EditText(this).apply { setText(prefs.gameAppId.toString()); inputType = InputType.TYPE_CLASS_NUMBER }
        devUrl = EditText(this).apply {
            setText(prefs.devUrl)
            hint = "empty = bundled page; e.g. http://192.168.1.20:8737/"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
        }
        col.addView(heading("Companion"))
        col.addView(button("Close companion") {
            CompanionService.stop(this)
            Toast.makeText(this, "Companion closed", Toast.LENGTH_SHORT).show()
        })
        col.addView(heading("More"))
        removal = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
        col.addView(button("Remove everything…") { removal.visibility = if (removal.visibility == View.GONE) View.VISIBLE else View.GONE })
        col.addView(removal)

        val advanced = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; visibility = View.GONE }
        advanced.addView(text("GameNative game (Steam app id of KINGDOM HEARTS HD 1.5+2.5 ReMIX)", 14f))
        advanced.addView(gameId)
        advanced.addView(text("State file the game writes", 14f))
        advanced.addView(statePath)
        advanced.addView(text("Dev URL (PC dev server, run with --lan)", 14f))
        advanced.addView(devUrl)
        advanced.addView(button("Save") { save(); Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show() })
        advanced.addView(text(licenses(), 12f))
        col.addView(button("Advanced settings") { advanced.visibility = if (advanced.visibility == View.GONE) View.VISIBLE else View.GONE })
        col.addView(advanced)
        // The top bar stays put while the page scrolls, so closing is always one tap away.
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(pad, pad / 2, pad / 2, pad / 2)
            setBackgroundColor(0xFF1B2140.toInt())
        }
        val titles = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        titles.addView(text("KH1 Companion", 22f, bold = true))
        titles.addView(text("Version ${packageManager.getPackageInfo(packageName, 0).versionName}", 14f))
        bar.addView(titles, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        bar.addView(Button(this).apply {
            text = "✕"; textSize = 24f; isAllCaps = false
            contentDescription = "Close settings"
            minWidth = dp(56); minHeight = dp(56)
            setOnClickListener { finish() }
        }, LinearLayout.LayoutParams(dp(64), dp(64)))
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(bar)
        root.addView(ScrollView(this).apply { addView(col) }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
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
            refreshUpdate()
            Updater.checkForSettings(this) { if (!isDestroyed) refreshUpdate() }
        }
    }

    private var downloading = false

    /** "Update available" with its button, or "Up to date" and when it last checked; always the GitHub link. */
    private fun refreshUpdate() {
        if (downloading) return
        update.removeAllViews()
        val github = button("View on GitHub") {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/keberos/kh1-companion/releases")))
        }
        val r = Updater.available(this)
        if (r == null) {
            val checked = prefs.updateCheckedAt
            update.addView(text("✓ Up to date: version ${packageManager.getPackageInfo(packageName, 0).versionName}", 18f, bold = true))
            update.addView(text(if (checked > 0) "Last checked " + android.text.format.DateUtils.getRelativeTimeSpanString(checked) + "."
                else "Checks for a new release when Settings opens.", 14f))
            update.addView(github)
            return
        }
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        box.addView(text("Update available: ${Updater.short(r.tag)}", 18f, bold = true))
        val note = text("", 14f).apply { visibility = View.GONE }
        box.addView(note)
        box.addView(button("Update") {}.apply {
            setOnClickListener { b ->
                if (!packageManager.canRequestPackageInstalls()) {
                    // Android asks once per app before it installs anything from it.
                    note.text = "Android asks once: on the next screen, turn on Allow from this source, then go back and tap Update again."
                    note.visibility = View.VISIBLE
                    startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")))
                    return@setOnClickListener
                }
                b.isEnabled = false
                downloading = true
                note.visibility = View.VISIBLE
                Updater.install(this@MainActivity, r) { pct, error ->
                    when {
                        error != null -> { downloading = false; b.isEnabled = true; note.text = error }
                        pct != null -> (b as Button).text = "Downloading… $pct%"
                        else -> { downloading = false; b.isEnabled = true; (b as Button).text = "Update"
                            note.text = "In Android's installer, tap Update. The companion reopens here once it's in." }
                    }
                }
            }
        })
        update.addView(box)
        update.addView(github)
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
                startForegroundService(Intent(this, CompanionService::class.java))
                // Watch for the game closing, and give the game the controller back (see WatchActivity).
                WatchActivity.watchOrFocus(this)
            }
            else -> return false
        }
        finishAndRemoveTask() // nothing to come back to: don't leave an empty entry in recents
        return true
    }

    private fun refresh() {
        steps.removeAllViews()
        if (Installer.removing(this)) {
            // Don't walk back through setup in the middle of taking everything out.
            removal.visibility = View.VISIBLE
            step("Setup is paused", false,
                "The companion is being removed: the steps are under Remove everything below. Changed your mind? " +
                    "Set up again puts the files back and starts setup over.",
                listOf("Set up again" to { Installer.setUpAgain(this); refresh() }), mark = false)
            refreshRemoval()
            return
        }
        val overlay = Settings.canDrawOverlays(this)
        val files = Environment.isExternalStorageManager()
        val gn = Installer.gameNativeInstalled(this)
        val working = files && Installer.installed(this)
        // Once it's working, the finished checklist folds to one line so the rest of Settings is in view.
        if (overlay && working && !setupOpen) {
            step("Set up and working", true, "The KH1 Companion icon opens the companion, and it closes by itself when the game exits.",
                listOf("Show setup steps" to { setupOpen = true; refresh() }))
            refreshRemoval()
            return
        }
        if (overlay && working) steps.addView(button("Hide setup steps") { setupOpen = false; refresh() })
        val openGameNative = "Open GameNative" to {
            // On the other screen, so these steps stay in view while you tap through GameNative.
            val here = display?.displayId ?: android.view.Display.DEFAULT_DISPLAY
            val other = getSystemService(android.hardware.display.DisplayManager::class.java).displays
                .map { it.displayId }.firstOrNull { it != here }
            val opts = other?.let { android.app.ActivityOptions.makeBasic().setLaunchDisplayId(it).toBundle() }
            packageManager.getLaunchIntentForPackage(Installer.GAMENATIVE)
                ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)?.let { startActivity(it, opts) }
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
            step("3. Add the mod in GameNative", working,
                "Copy two files the app has ready for you into the game, and turn on one switch. All from the game's " +
                    "gear in GameNative, about a minute." + if (working) "" else " This ticks itself off in step 4, once the game connects.",
                if (!working && files) listOf(openGameNative) else emptyList())
            if (!working && files) guide("import", listOf(
                "In GameNative, pick KINGDOM HEARTS HD 1.5+2.5 ReMIX and tap the gear." to "gear",
                "Scroll down and tap Import Files." to "import-menu",
                "Tap Select files." to "select-files",
                "Go to Download › KH1Companion › mod. Press and hold DINPUT8.dll, tap LuaBackend.toml so both are " +
                    "selected, then tap Select." to "pick-files",
                "Leave Game Directory as the place, tick Replace existing files, and tap Copy 2 files." to "copy",
                "Tap the gear again, then Edit container." to "edit-container",
                "On the General tab, scroll down and turn on Enable mod loaders." to "mod-loaders",
                "Tap the save icon at the top right." to "save",
            ))
            step("4. Check it", working,
                if (working) "Working: the game has talked to the companion."
                else "Start the game here. Once its title screen shows, the companion connects and this ticks itself off. " +
                    "If it doesn't, the companion's \"Not connecting?\" help lists what to check.",
                if (!working && overlay && files) listOf("Start the game" to { startGame() }) else emptyList())
            step("5. Open it with the game", false,
                "The companion opens from its own icon and closes by itself when the game exits. To have it open with the " +
                    "game too, in Cocoon Shell set KH1 Companion as Kingdom Hearts' companion app: launching the game " +
                    "from Cocoon then opens both. Without Cocoon, start the game, then tap the KH1 Companion icon.",
                emptyList(), mark = false)
            step("6. Optional: start straight into Kingdom Hearts Final Mix", false,
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
        val removed = Installer.removed(this)
        val deleted = prefs.filesDeleted
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
            "In GameNative: ⚙ → Edit container → General → turn off Enable mod loaders. Harmless to leave once " +
                "the mod is out. If you pointed the game straight at KH1 (setup step 6), you can set Executable Path back " +
                "to KINGDOM HEARTS HD 1.5+2.5 Launcher.exe on the General tab.", emptyList(), into = removal, mark = false)
        step("3. Delete the companion's files", deleted,
            if (deleted) "Done: Download/KH1Companion is gone."
            else "Removes Download/KH1Companion: the bridge script, the two mod files and the game's progress file. " +
                "Your game saves aren't touched.",
            if (deleted) emptyList() else listOf("Delete files" to {
                if (Installer.removalPending()) {
                    Toast.makeText(this, "Start the game once first, so the mod can remove itself", Toast.LENGTH_LONG).show()
                } else confirmDelete()
            }), into = removal)
        step("4. Uninstall this app", false, "", listOf("Uninstall" to {
            CompanionService.stop(this)
            startActivity(Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName")))
        }), into = removal, mark = false)
    }

    private var setupOpen = false
    private val guidesOpen = mutableSetOf<String>()

    /** What the guide pictures show; screens may differ in other GameNative versions (tools/make_guide_images.py). */
    private val GUIDE_SOURCE = "Pictures from GameNative 1.3.0 on an AYN Thor (Android 13). Newer GameNative versions may look different."

    /** "Show me how": numbered pictures of the GameNative screens. */
    private fun guide(key: String, shots: List<Pair<String, String>>) {
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

    private fun confirmDelete() {
        android.app.AlertDialog.Builder(this)
            .setTitle("Delete the companion's files?")
            .setMessage("This deletes Download/KH1Companion. Your game saves aren't touched.")
            .setPositiveButton("Delete") { _, _ ->
                CompanionService.stop(this)
                if (!Installer.deleteFiles(this)) Toast.makeText(this, "Couldn't delete everything", Toast.LENGTH_SHORT).show()
                refresh()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun startGame() {
        if (!Installer.launchGame(this)) Toast.makeText(this, "GameNative isn't installed", Toast.LENGTH_LONG).show()
    }

    private fun text(s: String, size: Float, bold: Boolean = false) = TextView(this).apply {
        text = s; textSize = size; setPadding(0, pad / 4, 0, pad / 4)
        if (bold) setTypeface(typeface, Typeface.BOLD)
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    // Full-width, tall, normal-case buttons: easy to read and to hit on a handheld.
    private fun button(label: String, onClick: () -> Unit) =
        Button(this).apply {
            text = label; textSize = 17f; isAllCaps = false; minHeight = dp(56)
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
                .apply { topMargin = dp(6) }
            setOnClickListener { onClick() }
        }

    private fun heading(label: String) = text(label.uppercase(), 13f, bold = true).apply {
        setTextColor(0xFFF6D77A.toInt()); letterSpacing = 0.12f; setPadding(0, pad * 3 / 2, 0, pad / 4)
    }

    private fun licenses() = try {
        assets.open("mod/NOTICE.txt").bufferedReader().readText() +
            "\nThe full license text is in Download/KH1Companion/mod/licenses/LuaBackend-LICENSE.txt."
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
