package com.kh1companion

import android.app.ActivityOptions
import android.content.Context
import android.content.Intent
import android.os.Environment
import android.view.Display
import org.json.JSONObject
import java.io.File

/**
 * Puts the bridge in place with no manual steps.
 *
 * 1. [deploy] copies what the app ships (assets) to Download/KH1Companion/: the bridge script
 *    into scripts/, the LuaBackend files and install.bat into mod/. It runs again after every
 *    app update, so script fixes arrive with the app.
 * 2. [runInstaller] asks GameNative to run mod/install.bat inside KH's container for one launch
 *    (LAUNCH_GAME with a container_config that overrides the executable; GameNative maps D: to
 *    Download). The bat copies DINPUT8.dll and LuaBackend.toml into the game folder, sets the
 *    DLL override in the container's registry, and writes mod/install.log.
 */
object Installer {
    private val root: File
        get() = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS).resolve("KH1Companion")
    private val log: File get() = root.resolve("mod/install.log")
    private val unlog: File get() = root.resolve("mod/uninstall.log")
    private val MOD_FILES = listOf("DINPUT8.dll", "LuaBackend.toml", "install.bat", "uninstall.bat", "LuaBackend-LICENSE.txt", "NOTICE.txt")

    /** Copy the shipped files out, once per app version. Needs all files access. */
    fun deploy(context: Context, force: Boolean = false): Boolean {
        if (!Environment.isExternalStorageManager()) return false
        val prefs = Prefs(context)
        val version = context.packageManager.getPackageInfo(context.packageName, 0).longVersionCode
        if (!force && prefs.deployedVersion == version && root.resolve("mod/install.bat").exists()) return true
        return try {
            copyAsset(context, "kh1companion.lua", root.resolve("scripts/kh1companion.lua"))
            for (f in MOD_FILES) copyAsset(context, "mod/$f", root.resolve("mod/$f"))
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

    /** What install.bat reported: null if it hasn't run, else (ok, detail). */
    fun result(): Pair<Boolean, String>? {
        val text = try { log.readText().trim() } catch (e: Exception) { return null }
        if (text.isEmpty()) return null
        return if (text.startsWith("OK")) true to text.removePrefix("OK").trim() else false to text.removePrefix("FAIL").trim()
    }

    /** What uninstall.bat reported, like [result]. */
    fun removeResult(): Pair<Boolean, String>? {
        val text = try { unlog.readText().trim() } catch (e: Exception) { return null }
        if (text.isEmpty()) return null
        return if (text.startsWith("OK")) true to text.removePrefix("OK").trim() else false to text.removePrefix("FAIL").trim()
    }

    /** The bridge has written its file at some point: it's installed, however that happened. */
    fun bridgeSeen(context: Context) = File(Prefs(context).statePath).exists()

    fun installed(context: Context) = removeResult()?.first != true && (result()?.first == true || bridgeSeen(context))

    fun gameNativeInstalled(context: Context) = try {
        context.packageManager.getPackageInfo(PlayActivity.GAMENATIVE, 0); true
    } catch (e: Exception) { false }

    /** Have GameNative run install.bat in KH's container, one time. */
    fun runInstaller(context: Context) {
        log.delete()
        unlog.delete()
        launch(context, JSONObject().put("executablePath", "D:\\KH1Companion\\mod\\install.bat"))
    }

    /** Have GameNative run uninstall.bat: takes the mod back out of the game folder and registry. */
    fun runUninstaller(context: Context) {
        deploy(context, force = true)
        unlog.delete()
        launch(context, JSONObject().put("executablePath", "D:\\KH1Companion\\mod\\uninstall.bat"))
    }

    /** Delete everything the app put in Download/KH1Companion/ (script, mod files, state, logs). */
    fun deleteFiles(context: Context): Boolean {
        Prefs(context).deployedVersion = 0
        return root.deleteRecursively()
    }

    /**
     * If GameNative's "save these settings?" prompt was answered Save after the install run,
     * the container would keep running install.bat instead of the game. Launching once with the
     * game's executable and choosing Save puts it back.
     */
    fun repairExecutable(context: Context) {
        launch(context, JSONObject().put("executablePath", "KINGDOM HEARTS FINAL MIX.exe"))
    }

    private fun launch(context: Context, config: JSONObject) {
        val prefs = Prefs(context)
        val intent = Intent("app.gamenative.LAUNCH_GAME")
            .setPackage(PlayActivity.GAMENATIVE)
            .putExtra("app_id", prefs.gameAppId)
            .putExtra("game_source", prefs.gameSource)
            .putExtra("container_config", config.toString())
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent, ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY).toBundle())
    }
}
