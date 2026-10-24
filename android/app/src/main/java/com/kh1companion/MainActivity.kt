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
     * The app icon is an on/off switch, like any other app: tap to show the companion on the
     * bottom screen, tap again to close it. No settings screen gets in the way unless a
     * permission is missing or Settings was asked for (long-press shortcut, notification).
     * Returns true when the activity finished instead of showing settings.
     */
    private fun handleLaunch(intent: Intent): Boolean {
        val ready = Settings.canDrawOverlays(this) && Environment.isExternalStorageManager()
        val start = intent.getBooleanExtra("start", false) // adb: `--ez start true`
        val toggle = intent.action == Intent.ACTION_MAIN && intent.hasCategory(Intent.CATEGORY_LAUNCHER)
        when {
            intent.action == ACTION_CLOSE || (toggle && CompanionService.running) -> {
                CompanionService.stop(this)
                Toast.makeText(this, "KH1 Companion closed", Toast.LENGTH_SHORT).show()
            }
            (start || toggle) && ready -> {
                startForegroundService(Intent(this, CompanionService::class.java))
                Toast.makeText(this, "KH1 Companion on the bottom screen. Tap the icon again to close.", Toast.LENGTH_SHORT).show()
            }
            else -> return false
        }
        finish()
        return true
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun save() {
        prefs.statePath = statePath.text.toString().ifBlank { Prefs.defaultStatePath() }
        prefs.devUrl = devUrl.text.toString()
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
    }
}
