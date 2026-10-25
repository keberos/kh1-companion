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
 * there, and GameNative 1.3 ignores executable overrides in launch intents, so the import and
 * the DLL override are the two steps the user does in GameNative.
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
    const val OVERRIDE_NAME = "WINEDLLOVERRIDES"
    const val OVERRIDE_VALUE = "dinput8=n,b;dbghelp=b"

    /** Copy the shipped files out, once per app version. Needs all files access. */
    fun deploy(context: Context, force: Boolean = false): Boolean {
        if (!Environment.isExternalStorageManager()) return false
        val prefs = Prefs(context)
        val version = context.packageManager.getPackageInfo(context.packageName, 0).longVersionCode
        if (!force && prefs.deployedVersion == version && root.resolve("mod/DINPUT8.dll").exists()) return true
        return try {
            copyAsset(context, "kh1companion.lua", root.resolve("scripts/kh1companion.lua"))
            for (f in MOD_FILES) copyAsset(context, "mod/$f", root.resolve("mod/$f"))
            for (f in LICENSE_FILES) {
                copyAsset(context, "mod/$f", root.resolve("mod/licenses/$f"))
                root.resolve("mod/$f").delete() // older versions kept them next to the mod files
            }
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

    fun installed(context: Context) = bridgeSeen(context) && removeResult()?.first != true && !removalPending()

    fun gameNativeInstalled(context: Context) = try {
        context.packageManager.getPackageInfo(GAMENATIVE, 0); true
    } catch (e: Exception) { false }

    /**
     * Start the game in GameNative on the main screen, with the companion on the bottom one. Setup
     * uses it to check the mod works; day to day a launcher (Cocoon Shell's companion app) or the
     * player starts the game, and the companion closes itself when the game exits.
     */
    fun launchGame(context: Context): Boolean {
        if (android.provider.Settings.canDrawOverlays(context)) {
            context.startForegroundService(android.content.Intent(context, CompanionService::class.java))
        }
        val prefs = Prefs(context)
        val game = android.content.Intent(ACTION_LAUNCH_GAME).setPackage(GAMENATIVE)
            .putExtra("app_id", prefs.gameAppId).putExtra("game_source", prefs.gameSource)
            .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
        val main = android.app.ActivityOptions.makeBasic().setLaunchDisplayId(android.view.Display.DEFAULT_DISPLAY)
        return try {
            context.startActivity(game, main.toBundle()); true
        } catch (e: android.content.ActivityNotFoundException) { false }
    }

    /** Ask the bridge to take the mod out of the game folder the next time the game starts. */
    fun requestRemoval(context: Context): Boolean {
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
        Prefs(context).deployedVersion = 0
        return root.deleteRecursively()
    }
}
