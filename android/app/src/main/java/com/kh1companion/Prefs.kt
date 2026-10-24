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

    companion object {
        fun defaultStatePath(): String =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                .resolve("KH1Companion/state.json").absolutePath
    }
}
