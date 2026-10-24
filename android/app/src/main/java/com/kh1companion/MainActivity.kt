package com.kh1companion

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
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
 * Setup and settings. First run walks through a checklist (permissions, the two GameNative steps,
 * a first launch that confirms it works); after that the app icon plays the game (see
 * [handleLaunch]). Advanced has the settings and Remove everything. The companion itself runs
 * in [CompanionService].
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
        col.addView(text("Kingdom Hearts Final Mix companion", 22f, bold = true))
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
        val overlay = Settings.canDrawOverlays(this)
        val files = Environment.isExternalStorageManager()
        val gn = Installer.gameNativeInstalled(this)
        val working = files && Installer.installed(this)
        val openGameNative = "Open GameNative" to {
            packageManager.getLaunchIntentForPackage(PlayActivity.GAMENATIVE)?.let { startActivity(it) }
                ?: Toast.makeText(this, "GameNative isn't installed", Toast.LENGTH_SHORT).show()
        }

        step("1. Show on the second screen", overlay,
            "Lets the companion draw on the bottom screen without taking the controller from the game. " +
                "In the list that opens, pick Kingdom Hearts Final Mix and turn it on.",
            if (!overlay) listOf("Allow" to { startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))) }) else emptyList())
        step("2. Read the game's progress", files,
            "The game writes its progress to the Download folder; this lets the companion read it. Turn on All files access.",
            if (!files) listOf("Allow" to { startActivity(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName"))) }) else emptyList())
        if (!gn) {
            step("3. GameNative", false, "Install GameNative and KINGDOM HEARTS HD 1.5+2.5 ReMIX in it first.", emptyList())
        } else {
            step("3. Copy the mod into the game", working,
                "In GameNative, open KINGDOM HEARTS HD 1.5+2.5 ReMIX → ⚙ → Import Files. Pick both files in " +
                    "Download/KH1Companion/mod (DINPUT8.dll and LuaBackend.toml), choose Game Directory, then Copy.",
                if (!working && files) listOf(openGameNative) else emptyList())
            step("4. Turn the mod on", working,
                "Still in GameNative: ⚙ → Edit container → Environment variables → add\n" +
                    "${Installer.OVERRIDE_NAME} = ${Installer.OVERRIDE_VALUE}\nand save.",
                if (!working && files) listOf(
                    "Copy name" to { copy(Installer.OVERRIDE_NAME) },
                    "Copy value" to { copy(Installer.OVERRIDE_VALUE) },
                    openGameNative,
                ) else emptyList())
            step("5. Check it", working,
                if (working) "Working: the game has talked to the companion."
                else "Start the game here. Once its title screen shows, the companion connects and this ticks itself off. " +
                    "If it doesn't, the companion's \"Not connecting?\" help lists what to check.",
                if (!working && overlay && files) listOf("Start the game" to { startActivity(Intent(this, PlayActivity::class.java)) }) else emptyList())
        }
        steps.addView(text(if (working) "All set. From now on the Kingdom Hearts Final Mix icon starts the game with the companion, and quitting the game closes it."
            else "", 15f, bold = true))
        if (working) steps.addView(button("Play now") { startActivity(Intent(this, PlayActivity::class.java)); finish() })
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
                pending -> listOf("Start the game once" to { startActivity(Intent(this, PlayActivity::class.java)) },
                    "Cancel" to { Installer.cancelRemoval(); refresh() })
                else -> listOf("Remove from the game" to {
                    CompanionService.stop(this)
                    if (!Installer.requestRemoval(this)) Toast.makeText(this, "Needs All files access", Toast.LENGTH_SHORT).show()
                    refresh()
                })
            }, into = removal)
        step("2. Optional: tidy GameNative's setting", false,
            "In GameNative: ⚙ → Edit container → Environment variables → delete ${Installer.OVERRIDE_NAME}. " +
                "Harmless to leave once the mod is out.", emptyList(), into = removal, mark = false)
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

    private fun step(title: String, done: Boolean, detail: String, actions: List<Pair<String, () -> Unit>>,
                     into: LinearLayout = steps, mark: Boolean = true) {
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, pad, 0, 0) }
        box.addView(text((if (mark) (if (done) "✓ " else "○ ") else "") + title, 18f, bold = true))
        if (detail.isNotEmpty()) box.addView(text(detail, 14f))
        for ((label, run) in actions) box.addView(button(label, run))
        into.addView(box)
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
