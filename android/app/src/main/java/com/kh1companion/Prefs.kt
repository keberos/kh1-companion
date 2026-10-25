package com.kh1companion

import android.content.Context
import android.os.Environment

/** User settings, shared by the settings screen and the overlay service. */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("kh1companion", Context.MODE_PRIVATE)

    /** Where the game bridge writes its snapshot (via a Wine drive mapped to shared storage). */
    var statePath: String
        get() = sp.getString("statePath", null) ?: defaultStatePath()
        set(v) = sp.edit().putString("statePath", v.trim()).apply()

    /** When set, load the page from the PC dev server instead of the bundled copy. */
    var devUrl: String
        get() = sp.getString("devUrl", "") ?: ""
        set(v) = sp.edit().putString("devUrl", v.trim()).apply()

    /** The game GameNative starts for "Play KH1": Steam app id of KINGDOM HEARTS HD 1.5+2.5 ReMIX. */
    var gameAppId: Int
        get() = sp.getInt("gameAppId", 2552430)
        set(v) = sp.edit().putInt("gameAppId", v).apply()

    /** GameNative's store name for that game (STEAM, EPIC, GOG, ...). */
    var gameSource: String
        get() = sp.getString("gameSource", "STEAM") ?: "STEAM"
        set(v) = sp.edit().putString("gameSource", v.trim().uppercase()).apply()

    /** App version whose shipped files were last copied to Download/KH1Companion/. */
    var deployedVersion: Long
        get() = sp.getLong("deployedVersion", 0)
        set(v) = sp.edit().putLong("deployedVersion", v).apply()

    /** When the bridge took the mod out of the game (its uninstall.log's time), 0 if it hasn't. Kept
     *  here because Delete files removes the log along with the rest of the folder. */
    var removedAt: Long
        get() = sp.getLong("removedAt", 0)
        set(v) = sp.edit().putLong("removedAt", v).apply()

    /** The user deleted Download/KH1Companion/: don't copy the files back until they set up again. */
    var filesDeleted: Boolean
        get() = sp.getBoolean("filesDeleted", false)
        set(v) = sp.edit().putBoolean("filesDeleted", v).apply()

    companion object {
        fun defaultStatePath(): String =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                .resolve("KH1Companion/state.json").absolutePath
    }
}
