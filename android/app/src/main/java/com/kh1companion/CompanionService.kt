package com.kh1companion

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.os.Handler
import android.os.IBinder
import android.os.Environment
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Display
import android.view.Gravity
import android.view.WindowManager
import android.webkit.JavascriptInterface
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
 *
 * It closes itself once the game is gone. [WatchActivity] catches that the moment GameNative's game
 * screen closes; as a backup, after it has connected, the bridge going quiet for [QUIET_MS] while the
 * screen is on means the game exited. Right after the title screen or in the
 * Dive it waits [QUIET_INTRO_MS] instead: the opening movie pauses the bridge for about 3.5 minutes.
 */
class CompanionService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var webView: WebView? = null
    private var lastPushed: String? = null
    private var connected = false       // a fresh state arrived since this overlay opened
    private var quietMs = 0L            // screen-on time since the bridge last wrote
    private var lastTick = 0L
    private var introQuiet = false      // the last state was the title or the Dive: allow for the movie

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (webView == null) {
            startForeground(NOTIFICATION_ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            if (!Settings.canDrawOverlays(this)) {
                Log.w(TAG, "overlay permission missing; not starting")
                stopSelf()
                return START_NOT_STICKY
            }
            showOverlay()
        }
        // Not sticky: once closed (or killed), it stays closed until opened again.
        return START_NOT_STICKY
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
            // Lets the page's close button shut the companion down (the page asks first).
            addJavascriptInterface(object {
                @JavascriptInterface
                fun close() { handler.post { stopSelf() } }

                @JavascriptInterface
                fun openSettings() { handler.post { this@CompanionService.openSettings() } }

                /** For the page's "Not connecting?" help: what the app can see of the bridge's file. */
                @JavascriptInterface
                fun status(): String {
                    val f = File(Prefs(this@CompanionService).statePath)
                    val exists = f.exists()
                    return JSONObject()
                        .put("path", f.path)
                        .put("exists", exists)
                        .put("ageSec", if (exists) (System.currentTimeMillis() - f.lastModified()) / 1000 else JSONObject.NULL)
                        .put("filesAccess", Environment.isExternalStorageManager())
                        .put("gameNative", try {
                            packageManager.getPackageInfo(Installer.GAMENATIVE, 0); true
                        } catch (e: Exception) { false })
                        .toString()
                }
            }, "KH1Native")
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
                    val file = File(prefs.statePath)
                    pushState(file)
                    if (gameGone(file)) {
                        Log.i(TAG, "bridge quiet: the game has closed, closing the companion")
                        stopSelf()
                        return
                    }
                    handler.postDelayed(this, POLL_MS)
                }
            })
        }
    }

    /** True once the bridge has been quiet long enough, with the screen on, after connecting. */
    private fun gameGone(file: File): Boolean {
        val now = System.currentTimeMillis()
        val dt = if (lastTick == 0L) 0L else now - lastTick
        lastTick = now
        if (!connected) return false
        val fresh = now - file.lastModified() < FRESH_MS
        val screenOn = getSystemService(android.os.PowerManager::class.java).isInteractive
        quietMs = when {
            fresh -> 0L
            screenOn -> quietMs + dt
            else -> quietMs // the Thor asleep pauses the game too
        }
        return quietMs > if (introQuiet) QUIET_INTRO_MS else QUIET_MS
    }

    private fun pushState(file: File) {
        // The file outlives the game: what's there before the bridge starts is the last
        // session's. The bridge rewrites it every 2 s while running, so only take a fresh one.
        if (System.currentTimeMillis() - file.lastModified() > FRESH_MS) return
        val text = try {
            file.readText()
        } catch (e: Exception) {
            return // not written yet, or mid-swap
        }
        if (text == lastPushed || !text.trimStart().startsWith("{")) return
        lastPushed = text
        connected = true
        introQuiet = try {
            JSONObject(text).optInt("world", -1) == 0 // title screen or the Dive (the movie comes after New Game)
        } catch (e: Exception) { false }
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
        val close = PendingIntent.getService(
            this, 0, Intent(this, CompanionService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE,
        )
        val settings = PendingIntent.getActivity(
            this, 1, settingsIntent(), PendingIntent.FLAG_IMMUTABLE,
        )
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle("KH1 companion is on the bottom screen")
            .setContentText(if (prefs.devUrl.isNotEmpty()) "Dev: ${prefs.devUrl}" else "Closes when the game does, or tap Close")
            .setContentIntent(settings)
            .addAction(Notification.Action.Builder(null, "Close", close).build())
            .addAction(Notification.Action.Builder(null, "Settings", settings).build())
            .build()
    }

    private fun settingsIntent() = Intent(this, MainActivity::class.java)
        .setAction(MainActivity.ACTION_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    private fun openSettings() {
        // Open on the main screen; the bottom one is under the overlay.
        val opts = android.app.ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY)
        startActivity(settingsIntent(), opts.toBundle())
    }

    companion object {
        const val TAG = "KH1Companion"
        private const val CHANNEL = "overlay"
        private const val NOTIFICATION_ID = 1
        private const val POLL_MS = 250L
        private const val FRESH_MS = 6_000L
        private const val QUIET_MS = 60_000L
        private const val QUIET_INTRO_MS = 5 * 60_000L
        const val ACTION_STOP = "com.kh1companion.STOP"

        fun stop(context: Context) {
            context.stopService(Intent(context, CompanionService::class.java))
        }

        @Volatile
        var running = false
            private set
    }
}
