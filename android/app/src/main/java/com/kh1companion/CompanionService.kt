package com.kh1companion

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Display
import android.view.Gravity
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import java.io.File

/**
 * Shows the companion page as an overlay on the secondary (bottom) display.
 *
 * The overlay window is FLAG_NOT_FOCUSABLE: it still gets touches, but it never
 * becomes the focused window, so the controller keeps driving the game on the
 * top screen. In bundled mode the service reads state.json and pushes it into
 * the page; in dev mode the page polls the PC dev server itself.
 */
class CompanionService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var webView: WebView? = null
    private var lastPushed: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (webView == null) {
            startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            if (!Settings.canDrawOverlays(this)) {
                Log.w(TAG, "overlay permission missing; not starting")
                stopSelf()
                return START_NOT_STICKY
            }
            showOverlay()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        webView?.let { windowManager?.removeView(it); it.destroy() }
        webView = null
        running = false
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun showOverlay() {
        val displays = getSystemService(DisplayManager::class.java).displays
        val target = displays.firstOrNull { it.displayId != Display.DEFAULT_DISPLAY }
        val display = target ?: displays.first { it.displayId == Display.DEFAULT_DISPLAY }
        Log.i(TAG, "displays=${displays.map { "${it.displayId}:${it.name}" }} using=${display.displayId}")

        val windowContext = createDisplayContext(display)
            .createWindowContext(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY, null)
        val wm = windowContext.getSystemService(WindowManager::class.java)
        val view = WebView(windowContext).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true // room labels live in localStorage
            setBackgroundColor(0xFF0B1024.toInt())
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    lastPushed = null // re-send current state to the fresh page
                }
            }
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            // No second screen (e.g. a plain emulator): use the lower part of the main one.
            if (target != null) WindowManager.LayoutParams.MATCH_PARENT
            else (resources.displayMetrics.heightPixels * 0.45).toInt(),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.OPAQUE,
        ).apply {
            gravity = Gravity.BOTTOM
            // Cover the whole bottom screen, system bar area included: any strip left
            // uncovered shows that display's launcher, and touching it takes focus.
            fitInsetsTypes = 0
            layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
        }

        wm.addView(view, params)
        windowManager = wm
        webView = view
        running = true

        val prefs = Prefs(this)
        if (prefs.devUrl.isNotEmpty()) {
            view.loadUrl(prefs.devUrl)
        } else {
            view.loadUrl("file:///android_asset/index.html?native=1")
            handler.post(object : Runnable {
                override fun run() {
                    pushState(File(prefs.statePath))
                    handler.postDelayed(this, POLL_MS)
                }
            })
        }
    }

    private fun pushState(file: File) {
        val text = try {
            file.readText()
        } catch (e: Exception) {
            return // not written yet, or mid-swap
        }
        if (text == lastPushed || !text.trimStart().startsWith("{")) return
        lastPushed = text
        webView?.evaluateJavascript(
            "window.KH1Companion && window.KH1Companion.push(${JSONObject.quote(text)})", null,
        )
    }

    private fun notification(): Notification {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "Companion overlay", NotificationManager.IMPORTANCE_LOW),
        )
        val prefs = Prefs(this)
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentTitle("KH1 Companion running")
            .setContentText(if (prefs.devUrl.isNotEmpty()) "Dev: ${prefs.devUrl}" else prefs.statePath)
            .build()
    }

    companion object {
        const val TAG = "KH1Companion"
        private const val CHANNEL = "overlay"
        private const val NOTIFICATION_ID = 1
        private const val POLL_MS = 250L

        @Volatile
        var running = false
            private set
    }
}
