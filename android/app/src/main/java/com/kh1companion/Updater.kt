package com.kh1companion

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Display
import org.json.JSONArray
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Updates from GitHub releases (all betas are pre-releases, so it reads the full list, not /latest).
 * One request when Settings opens, and at most once a day when the companion starts; never polls,
 * and all network work runs on its own thread. The APK is handed to Android's package installer,
 * which asks the user to confirm; it's signed with the same key, so it installs over this one.
 */
object Updater {
    private const val RELEASES = "https://api.github.com/repos/keberos/kh1-companion/releases?per_page=10"
    private const val DAY_MS = 24 * 60 * 60_000L
    private const val SETTINGS_MS = 10 * 60_000L // Settings reopening (e.g. back from a permission screen)
    private val main = Handler(Looper.getMainLooper())
    @Volatile private var checking = false

    data class Release(val tag: String, val url: String)

    /** The newer release found by the last check, or null when up to date (or never checked). */
    fun available(context: Context): Release? {
        val p = Prefs(context)
        val tag = p.updateTag.ifEmpty { return null }
        return if (newer(tag, installedName(context))) Release(tag, p.updateUrl) else null
    }

    /** Checks unless one ran within [maxAgeMs]; [done] runs on the main thread when a check finishes. */
    fun checkIfDue(context: Context, maxAgeMs: Long = DAY_MS, done: (() -> Unit)? = null) {
        val app = context.applicationContext
        val p = Prefs(app)
        if (checking || System.currentTimeMillis() - p.updateCheckedAt < maxAgeMs) return
        checking = true
        Thread {
            try {
                latest()?.let { (tag, url) -> p.updateTag = tag; p.updateUrl = url }
                p.updateCheckedAt = System.currentTimeMillis()
            } catch (e: Exception) {
                Log.i(CompanionService.TAG, "update check failed: $e") // offline: try again next time
            } finally {
                checking = false
            }
            done?.let { main.post(it) }
        }.apply { priority = Thread.MIN_PRIORITY }.start()
    }

    fun checkForSettings(context: Context, done: () -> Unit) = checkIfDue(context, SETTINGS_MS, done)

    /** Newest non-draft release with an APK attached. */
    private fun latest(): Pair<String, String>? {
        val conn = URL(RELEASES).openConnection() as HttpURLConnection
        conn.connectTimeout = 10_000; conn.readTimeout = 15_000
        conn.setRequestProperty("Accept", "application/vnd.github+json")
        val body = try { conn.inputStream.bufferedReader().readText() } finally { conn.disconnect() }
        val list = JSONArray(body)
        var best: Pair<String, String>? = null
        for (i in 0 until list.length()) {
            val r = list.getJSONObject(i)
            if (r.optBoolean("draft")) continue
            val tag = r.getString("tag_name")
            val assets = r.optJSONArray("assets") ?: continue
            val apk = (0 until assets.length()).map { assets.getJSONObject(it) }
                .firstOrNull { it.getString("name").let { n -> n.startsWith("KH1-Companion-") && n.endsWith(".apk") } } ?: continue
            if (best == null || newer(tag, best.first)) best = tag to apk.getString("browser_download_url")
        }
        return best
    }

    private fun installedName(context: Context) =
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: ""

    /** "v0.9.0-beta.8.1" → "beta.8.1", for the Settings line. */
    fun short(tag: String) = tag.removePrefix("v").substringAfter('-', tag.removePrefix("v"))

    /**
     * Is version [a] newer than [b]? Semver-like: 0.9.0 < 0.9.1, a pre-release sorts before its
     * release (0.9.0-beta.8 < 0.9.0), and pre-release parts compare number by number, a missing
     * part lowest (beta.8 < beta.8.1 < beta.9).
     */
    fun newer(a: String, b: String): Boolean = compare(a, b) > 0

    fun compare(a: String, b: String): Int {
        fun split(v: String): Pair<List<Int>, List<String>?> {
            val s = v.trim().removePrefix("v")
            val core = s.substringBefore('-').split('.').map { it.toIntOrNull() ?: 0 }
            val pre = if ('-' in s) s.substringAfter('-').split('.') else null
            return core to pre
        }
        val (ca, pa) = split(a)
        val (cb, pb) = split(b)
        for (i in 0 until maxOf(ca.size, cb.size)) {
            val d = ca.getOrElse(i) { 0 }.compareTo(cb.getOrElse(i) { 0 })
            if (d != 0) return d
        }
        if (pa == null || pb == null) return (if (pa == null) 1 else 0) - (if (pb == null) 1 else 0)
        for (i in 0 until maxOf(pa.size, pb.size)) {
            val x = pa.getOrNull(i) ?: return -1
            val y = pb.getOrNull(i) ?: return 1
            val xi = x.toIntOrNull(); val yi = y.toIntOrNull()
            val d = if (xi != null && yi != null) xi.compareTo(yi) else x.compareTo(y)
            if (d != 0) return d
        }
        return 0
    }

    /**
     * Downloads [r] to the cache and starts Android's installer. [progress] gets 0-100 then null when
     * the installer takes over, or an error message; all on the main thread. Needs Install unknown apps.
     */
    fun install(context: Context, r: Release, progress: (Int?, String?) -> Unit) {
        val app = context.applicationContext
        Thread {
            try {
                val apk = File(app.cacheDir, "update.apk")
                val conn = URL(r.url).openConnection() as HttpURLConnection // GitHub redirects to its CDN; followed
                conn.connectTimeout = 10_000; conn.readTimeout = 30_000
                try {
                    val total = conn.contentLengthLong
                    var read = 0L; var shown = -1
                    conn.inputStream.use { input ->
                        apk.outputStream().use { out ->
                            val buf = ByteArray(64 * 1024)
                            while (true) {
                                val n = input.read(buf); if (n < 0) break
                                out.write(buf, 0, n); read += n
                                val pct = if (total > 0) (read * 100 / total).toInt() else 0
                                if (pct != shown) { shown = pct; main.post { progress(pct, null) } }
                            }
                        }
                    }
                } finally { conn.disconnect() }

                val pi = app.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
                    .apply { setAppPackageName(app.packageName) }
                val id = pi.createSession(params)
                pi.openSession(id).use { s ->
                    s.openWrite("update.apk", 0, apk.length()).use { out -> apk.inputStream().use { it.copyTo(out) }; s.fsync(out) }
                    Prefs(app).updating = true // reopen Settings once the new version is in (UpdateReceiver)
                    val status = PendingIntent.getBroadcast(app, 0, Intent(app, UpdateReceiver::class.java),
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
                    s.commit(status.intentSender)
                }
                main.post { progress(null, null) }
            } catch (e: Exception) {
                Log.w(CompanionService.TAG, "update failed", e)
                Prefs(app).updating = false
                main.post { progress(null, "Couldn't download the update. Check the Wi-Fi and try again.") }
            }
        }.start()
    }
}

/** The installer's status (confirm screen, failure) and, after the update, reopening Settings. */
class UpdateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val prefs = Prefs(context)
        if (intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            if (!prefs.updating) return
            prefs.updating = false
            File(context.cacheDir, "update.apk").delete()
            // Only allowed from the background with Display over other apps (setup's step 1).
            if (!android.provider.Settings.canDrawOverlays(context)) return
            val opts = android.app.ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY)
            context.startActivity(Intent(context, MainActivity::class.java)
                .setAction(MainActivity.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), opts.toBundle())
            return
        }
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT) ?: return
                val opts = android.app.ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY)
                context.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), opts.toBundle())
            }
            PackageInstaller.STATUS_SUCCESS -> {}
            else -> {
                prefs.updating = false
                val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                Log.w(CompanionService.TAG, "update not installed: $msg")
                android.widget.Toast.makeText(context, "Update not installed", android.widget.Toast.LENGTH_LONG).show()
            }
        }
    }
}
