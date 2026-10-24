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
        // `--ez start true`: start the companion with saved settings and get out of the way
        // (adb, or a launcher shortcut), so the game keeps the main screen.
        if (intent.getBooleanExtra("start", false)) {
            startForegroundService(Intent(this, CompanionService::class.java))
            finish()
            return
        }
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
            stopService(Intent(this, CompanionService::class.java))
            startForegroundService(Intent(this, CompanionService::class.java))
            status.postDelayed({ refresh() }, 500)
        })
        col.addView(button("Stop companion") {
            stopService(Intent(this, CompanionService::class.java))
            status.postDelayed({ refresh() }, 300)
        })
        setContentView(ScrollView(this).apply { addView(col) })
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
}
