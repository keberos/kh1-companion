package com.kh1companion

import android.app.Activity
import android.content.Intent
import android.hardware.display.DisplayManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.text.InputType
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.io.File

/** Settings and permissions. The companion itself runs in [CompanionService]. */
class MainActivity : Activity() {
    private lateinit var prefs: Prefs
    private lateinit var status: TextView
    private lateinit var statePath: EditText
    private lateinit var devUrl: EditText
    private lateinit var gameId: EditText

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        if (handleLaunch(intent)) return
        val pad = (16 * resources.displayMetrics.density).toInt()
        val col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
        }
        fun label(text: String) = TextView(this).apply { this.text = text; setPadding(0, pad, 0, pad / 4) }
        fun button(text: String, onClick: () -> Unit) =
            Button(this).apply { this.text = text; setOnClickListener { onClick() } }

        status = TextView(this)
        statePath = EditText(this).apply { setText(prefs.statePath); inputType = InputType.TYPE_CLASS_TEXT }
        devUrl = EditText(this).apply {
            setText(prefs.devUrl)
            hint = "empty = bundled page; e.g. http://192.168.1.20:8737/"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
        }

        col.addView(status)
        col.addView(button("Allow drawing over other apps") {
            startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
        })
        col.addView(button("Allow reading the state file (all files access)") {
            startActivity(Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:$packageName")))
        })
        col.addView(label("State file written by the game bridge"))
        col.addView(statePath)
        gameId = EditText(this).apply {
            setText(prefs.gameAppId.toString()); inputType = InputType.TYPE_CLASS_NUMBER
        }
        col.addView(label("Play KH1 starts this GameNative game (Steam app id)"))
        col.addView(gameId)
        col.addView(label("Dev URL (PC dev server, run with --lan)"))
        col.addView(devUrl)
        col.addView(button("Save and start companion") {
            save()
            CompanionService.stop(this)
            startForegroundService(Intent(this, CompanionService::class.java))
            status.postDelayed({ refresh() }, 500)
        })
        col.addView(button("Close companion") {
            CompanionService.stop(this)
            status.postDelayed({ refresh() }, 300)
        })
        setContentView(ScrollView(this).apply { addView(col) })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleLaunch(intent)
    }

    /**
     * The app icon plays the game with its companion: tap it and the companion opens and KH1
     * starts in GameNative (see [PlayActivity]); quitting the game closes the companion. If the
     * game is already running, the tap just opens the companion. Tapping while the companion
     * is open closes it. Long-press shortcuts: companion only, close, settings.
     * Returns true when the activity finished instead of showing settings.
     */
    private fun handleLaunch(intent: Intent): Boolean {
        val ready = Settings.canDrawOverlays(this) && Environment.isExternalStorageManager()
        val start = intent.getBooleanExtra("start", false) || intent.action == ACTION_COMPANION // adb: `--ez start true`
        val tap = intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_LAUNCHER)
        when {
            intent.action == ACTION_CLOSE || (tap && CompanionService.running) -> {
                CompanionService.stop(this)
                Toast.makeText(this, "Companion closed", Toast.LENGTH_SHORT).show()
            }
            tap && ready && !gameRunning() -> startActivity(Intent(this, PlayActivity::class.java))
            (start || tap) && ready -> {
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

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun save() {
        prefs.statePath = statePath.text.toString().ifBlank { Prefs.defaultStatePath() }
        prefs.devUrl = devUrl.text.toString()
        gameId.text.toString().toIntOrNull()?.let { prefs.gameAppId = it }
    }

    private fun refresh() {
        val displays = getSystemService(DisplayManager::class.java).displays
        val file = File(prefs.statePath)
        val age = if (file.exists()) "${(System.currentTimeMillis() - file.lastModified()) / 1000}s old" else "not found"
        fun mark(ok: Boolean) = if (ok) "✓" else "✗"
        status.text = buildString {
            appendLine("${mark(Settings.canDrawOverlays(this@MainActivity))} Draw over other apps")
            appendLine("${mark(Environment.isExternalStorageManager())} All files access")
            appendLine("${mark(displays.size > 1)} Displays: ${displays.joinToString { "${it.displayId} ${it.name}" }}")
            appendLine("State file: $age")
            append("Companion: ${if (CompanionService.running) "running" else "stopped"}")
        }
    }

    companion object {
        const val ACTION_CLOSE = "com.kh1companion.CLOSE"
        const val ACTION_SETTINGS = "com.kh1companion.SETTINGS"
        const val ACTION_COMPANION = "com.kh1companion.COMPANION"
    }
}
