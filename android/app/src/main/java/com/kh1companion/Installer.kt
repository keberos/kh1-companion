package com.kh1companion

import android.content.Context
import android.os.Environment
import java.io.File

/**
 * Puts the bridge's files where the game can reach them, and takes the mod back out.
 *
 * [deploy] copies what the app ships (assets) to Download/KH1Companion/, which GameNative maps
 * to D: inside the game: the bridge script into scripts/ (LuaBackend loads it from there), and
 * DINPUT8.dll + LuaBackend.toml into mod/ for the user to import into the game folder with
 * GameNative's Import Files. It runs again after every app update, so script fixes arrive with
 * the app. The game folder itself is GameNative's private storage: no other app can write
 * there, and GameNative 1.3 ignores executable overrides in launch intents, so the user does the
 * import, and turns on the container's "Enable mod loaders" (GameNative then loads our
 * DINPUT8.dll itself: it adds dinput8=n,b for a dinput8.dll beside the game's exe).
 *
 * Removal needs no GameNative steps: [requestRemoval] leaves mod/uninstall.flag, and the next
 * time the game starts, the bridge (running inside the game) renames its own DLL so it never
 * loads again, deletes LuaBackend.toml, and writes mod/uninstall.log.
 */
object Installer {
    private val root: File
        get() = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).resolve("KH1Companion")
    private val flag: File get() = root.resolve("mod/uninstall.flag")
    private val unlog: File get() = root.resolve("mod/uninstall.log")
    // Only the two files to import sit in mod/, so the file picker shows nothing else to choose.
    private val MOD_FILES = listOf("DINPUT8.dll", "LuaBackend.toml")
    private val LICENSE_FILES = listOf("LuaBackend-LICENSE.txt", "NOTICE.txt")

    const val GAMENATIVE = "app.gamenative"
    private const val ACTION_LAUNCH_GAME = "app.gamenative.LAUNCH_GAME"

    /** Copy the shipped files out, once per app version, unless the user deleted them. Needs all files access. */
    fun deploy(context: Context, force: Boolean = false): Boolean {
        if (!Environment.isExternalStorageManager()) return false
        val prefs = Prefs(context)
        if (prefs.filesDeleted) return false
        val version = context.packageManager.getPackageInfo(context.packageName, 0).longVersionCode
        if (!force && prefs.deployedVersion == version && root.resolve("mod/DINPUT8.dll").exists()) return true
        return try {
            val copied = mutableListOf(root.resolve("scripts/kh1companion.lua"))
            copyAsset(context, "kh1companion.lua", copied[0])
            for (f in MOD_FILES) copyAsset(context, "mod/$f", root.resolve("mod/$f").also { copied += it })
            for (f in LICENSE_FILES) {
                copyAsset(context, "mod/$f", root.resolve("mod/licenses/$f").also { copied += it })
                root.resolve("mod/$f").delete() // older versions kept them next to the mod files
            }
            // The file picker lists Downloads from Android's media index, which doesn't notice files
            // written straight to disk: without this a fresh install's picker shows an empty mod folder.
            android.media.MediaScannerConnection.scanFile(context, copied.map { it.path }.toTypedArray(), null, null)
            prefs.deployedVersion = version
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun copyAsset(context: Context, name: String, to: File) {
        to.parentFile?.mkdirs()
        val tmp = File(to.path + ".tmp")
        context.assets.open(name).use { input -> tmp.outputStream().use { input.copyTo(it) } }
        if (!tmp.renameTo(to)) { to.delete(); tmp.renameTo(to) }
    }

    /** The bridge has written its file at some point: the mod is in the game and working. */
    fun bridgeSeen(context: Context) = File(Prefs(context).statePath).exists()

    fun installed(context: Context) = bridgeSeen(context) && !removed(context) && !removalPending()

    /**
     * The bridge took the mod out of the game and hasn't written since. Remembered in [Prefs] so it
     * outlives Delete files; the bridge writing again (the mod added back) clears it.
     */
    fun removed(context: Context): Boolean {
        val prefs = Prefs(context)
        if (prefs.removedAt == 0L && removeResult()?.first == true) prefs.removedAt = unlog.lastModified()
        if (prefs.removedAt == 0L) return false
        if (File(prefs.statePath).lastModified() <= prefs.removedAt) return true
        prefs.removedAt = 0
        unlog.delete()
        return false
    }

    /** Removing (or removed, or files deleted): setup waits until the user chooses [setUpAgain]. */
    fun removing(context: Context) = removalPending() || removed(context) || Prefs(context).filesDeleted

    /** Undo a removal: forget it and copy the files back, so setup starts over. */
    fun setUpAgain(context: Context) {
        val prefs = Prefs(context)
        flag.delete()
        unlog.delete()
        prefs.removedAt = 0
        prefs.filesDeleted = false
        deploy(context, force = true)
    }

    fun gameNativeInstalled(context: Context) = try {
        context.packageManager.getPackageInfo(GAMENATIVE, 0); true
    } catch (e: Exception) { false }

    /**
     * Start the game in GameNative on the main screen, with the companion on the bottom one. Setup
     * uses it to check the mod works; day to day a launcher (Cocoon Shell's companion app) or the
     * player starts the game, and the companion closes itself when the game exits.
     */
    fun launchGame(context: Context): Boolean {
        val watching = CompanionService.running
        if (android.provider.Settings.canDrawOverlays(context)) {
            context.startForegroundService(android.content.Intent(context, CompanionService::class.java))
        }
        val prefs = Prefs(context)
        val game = android.content.Intent(ACTION_LAUNCH_GAME).setPackage(GAMENATIVE)
            .putExtra("app_id", prefs.gameAppId).putExtra("game_source", prefs.gameSource)
            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        val main = android.app.ActivityOptions.makeBasic().setLaunchDisplayId(android.view.Display.DEFAULT_DISPLAY)
        return try {
            context.startActivity(game, main.toBundle())
            // Close the companion the moment the game exits, as when a launcher opens it (see WatchActivity).
            if (!watching) context.startActivity(android.content.Intent(context, WatchActivity::class.java)
                .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
            true
        } catch (e: android.content.ActivityNotFoundException) { false }
    }

    /** Ask the bridge to take the mod out of the game folder the next time the game starts. */
    fun requestRemoval(context: Context): Boolean {
        Prefs(context).filesDeleted = false // the bridge script does the removal, so it has to be there
        deploy(context)
        unlog.delete()
        return try { flag.parentFile?.mkdirs(); flag.writeText("remove\n"); true } catch (e: Exception) { false }
    }

    fun cancelRemoval() { flag.delete() }

    fun removalPending() = flag.exists()

    /** What the bridge reported after removing itself: null if it hasn't run, else (ok, detail). */
    fun removeResult(): Pair<Boolean, String>? {
        val text = try { unlog.readText().trim() } catch (e: Exception) { return null }
        if (text.isEmpty()) return null
        return if (text.startsWith("OK")) true to text.removePrefix("OK").trim() else false to text.removePrefix("FAIL").trim()
    }

    /** Delete everything the app put in Download/KH1Companion/ (script, mod files, state, logs). */
    fun deleteFiles(context: Context): Boolean {
        val prefs = Prefs(context)
        removed(context) // note a finished removal before its log goes
        prefs.deployedVersion = 0
        prefs.filesDeleted = true
        return root.deleteRecursively()
    }
}
