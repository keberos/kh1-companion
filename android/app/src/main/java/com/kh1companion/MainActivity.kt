package com.kh1companion

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.text.InputType
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.io.File

/**
 * Setup and settings. First run walks through a checklist (permissions, files, the one-time
 * mod install through GameNative); after that the app icon plays the game (see [handleLaunch]).
 * The companion itself runs in [CompanionService].
 */
class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private lateinit var steps: LinearLayout
    private lateinit var statePath: EditText
    private lateinit var devUrl: EditText
    private lateinit var gameId: EditText
    private lateinit var removeStatus: TextView
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
        col.addView(text("Kingdom Hearts Final Mix companion", 22f, bold = true))
        col.addView(text("Shows your progress, a spoiler-free guide, maps and level-ups on the bottom screen while you play.", 15f))
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
        advanced.addView(button("Reinstall the mod into the game") { Installer.deploy(this, force = true); Installer.runInstaller(this) })
        advanced.addView(text("If the game stopped starting after setup (GameNative's \"save settings?\" was answered Save), this launches it once with the right program. Choose Save when asked.", 13f))
        advanced.addView(button("Repair game launch") { Installer.repairExecutable(this) })
        advanced.addView(button("Close companion") { CompanionService.stop(this) })
        advanced.addView(text("Remove everything", 18f, bold = true))
        advanced.addView(text("Three steps, in order. 1 takes the mod back out of the game (GameNative opens for a few seconds; " +
            "choose Discard if it asks to save settings). 2 deletes this app's files from the Download folder. 3 uninstalls this app.", 13f))
        removeStatus = text("", 13f)
        advanced.addView(removeStatus)
        advanced.addView(button("1. Remove the mod from the game") { CompanionService.stop(this); Installer.runUninstaller(this) })
        advanced.addView(button("2. Delete the companion's files") {
            CompanionService.stop(this)
            Toast.makeText(this, if (Installer.deleteFiles(this)) "Files deleted" else "Couldn't delete everything", Toast.LENGTH_SHORT).show()
            refresh()
        })
        advanced.addView(button("3. Uninstall this app") {
            CompanionService.stop(this)
            startActivity(Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName")))
        })
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
     * Once set up, the app icon plays the game with its companion: tap it and the companion
     * opens and KH1 starts in GameNative (see [PlayActivity]); quitting the game closes the
     * companion. If the game is already running, the tap just opens the companion. Tapping
     * while the companion is open closes it. Until setup is done, the icon opens setup.
     * Returns true when the activity finished instead of showing this screen.
     */
    private fun handleLaunch(intent: Intent): Boolean {
        val ready = Settings.canDrawOverlays(this) && Environment.isExternalStorageManager()
        val start = intent.getBooleanExtra("start", false) || intent.action == ACTION_COMPANION // adb: `--ez start true`
        val tap = intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_LAUNCHER)
        val setUp = ready && Installer.installed(this)
        when {
            intent.action == ACTION_CLOSE || (tap && CompanionService.running) -> {
                CompanionService.stop(this)
                Toast.makeText(this, "Companion closed", Toast.LENGTH_SHORT).show()
            }
            tap && setUp && !gameRunning() -> startActivity(Intent(this, PlayActivity::class.java))
            (start || (tap && setUp)) && ready -> {
                startForegroundService(Intent(this, CompanionService::class.java))
                Toast.makeText(this, "Companion on the bottom screen. Tap the icon again to close it.", Toast.LENGTH_SHORT).show()
            }
            else -> return false
        }
        finish()
        return true
    }

    /** The bridge rewrites the state file every 2 s while the game runs. */
    private fun gameRunning(): Boolean {
        val f = File(Prefs(this).statePath)
        return f.exists() && System.currentTimeMillis() - f.lastModified() < 6_000
    }

    private fun refresh() {
        steps.removeAllViews()
        removeStatus.text = when (val r = Installer.removeResult()) {
            null -> ""
            else -> if (r.first) "✓ Mod removed from the game${if (r.second.isNotEmpty()) " (${r.second})" else ""}." else "✗ Removing didn't work: ${r.second}"
        }
        val overlay = Settings.canDrawOverlays(this)
        val files = Environment.isExternalStorageManager()
        val gn = Installer.gameNativeInstalled(this)
        val result = Installer.result()
        val installed = Installer.installed(this)

        step(1, "Show on the second screen", overlay,
            "Lets the companion draw on the bottom screen without taking the controller from the game.",
            if (!overlay) "Allow" to { startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))) } else null)
        step(2, "Read the game's progress", files,
            "The game writes its progress to the Download folder; this lets the companion read it.",
            if (!files) "Allow" to { startActivity(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName"))) } else null)
        val modDetail = when {
            !gn -> "Needs GameNative with KINGDOM HEARTS HD 1.5+2.5 ReMIX installed."
            result?.first == false -> "That didn't work: ${result.second}. Make sure the game is installed in GameNative, then try again."
            result?.first == true -> "Installed in the game folder (${result.second})."
            installed -> "Already installed: the game has talked to the companion before."
            else -> "One tap: GameNative opens, runs a small installer in the game's container, and closes again (a few seconds). " +
                "If it asks whether to save the settings, choose Discard."
        }
        step(3, "Add the companion to the game", installed, modDetail,
            if (overlay && files && gn && !installed) "Install" to { Installer.deploy(this, force = true); Installer.runInstaller(this) } else null)
        step(4, "Play", false,
            if (overlay && files && installed) "From now on the Kingdom Hearts Final Mix icon starts the game with the companion, and quitting the game closes it."
            else "Finish the steps above first.",
            if (overlay && files && installed) "Play now" to { startActivity(Intent(this, PlayActivity::class.java)); finish() } else null,
            showMark = false)
        steps.addView(text("Black screen in the game? Set its display mode to fullscreen or borderless in the game's settings. " +
            "Windowed mode can sync from a PC through Steam Cloud and shows black under GameNative.", 13f))
    }

    private fun step(n: Int, title: String, done: Boolean, detail: String, action: Pair<String, () -> Unit>?, showMark: Boolean = true) {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, pad, 0, 0) }
        box.addView(text((if (showMark) (if (done) "✓ " else "○ ") else "") + "$n. $title", 18f, bold = true))
        box.addView(text(detail, 14f))
        action?.let { (label, run) -> box.addView(button(label, run)) }
        steps.addView(box)
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
