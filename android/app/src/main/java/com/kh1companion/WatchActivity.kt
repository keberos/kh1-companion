package com.kh1companion

import android.app.Activity
import android.app.ActivityOptions
import android.content.Intent
import android.os.Bundle
import android.view.Display

/**
 * Closes the companion the moment the game exits. Opened along with the companion, it hops to the
 * main screen, puts GameNative back on top of itself (bringing its window forward, not launching the
 * game again: a launcher such as Cocoon Shell has already started it), and waits there unseen.
 * GameNative closes its game screen when a game it was asked to start exits, which brings this
 * activity back to the front: that's the cue. CompanionService's quiet-bridge check is the backup.
 */
class WatchActivity : Activity() {
    private var sent = false
    private var away = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        sent = savedInstanceState?.getBoolean(KEY_SENT) ?: false
        away = savedInstanceState?.getBoolean(KEY_AWAY) ?: false
        if (sent) return

        // Opened on the bottom screen: hop to the top one, where the game is.
        if (display?.displayId != Display.DEFAULT_DISPLAY && !intent.getBooleanExtra(EXTRA_MOVED, false)) {
            startActivity(
                Intent(this, WatchActivity::class.java).putExtra(EXTRA_MOVED, true)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_MULTIPLE_TASK),
                ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY).toBundle(),
            )
            finish()
            return
        }

        if (!focusGame(this)) { finish(); return }
        sent = true
        watching = true
    }

    override fun onDestroy() {
        super.onDestroy()
        if (sent) watching = false
    }

    override fun onPause() {
        super.onPause()
        if (sent) away = true
    }

    override fun onResume() {
        super.onResume()
        // Back in front after GameNative had it: the game is over.
        if (sent && away) {
            CompanionService.stop(this)
            finish()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(KEY_SENT, sent)
        outState.putBoolean(KEY_AWAY, away)
    }

    companion object {
        /** A watcher is waiting under the game, so another launch only needs to hand focus back. */
        @Volatile var watching = false

        /**
         * Bring GameNative's window forward on the main screen. Besides putting the game on top, this
         * gives it input focus back: opening the companion from a launcher on the bottom screen
         * (Cocoon Shell) leaves focus there, and the controller does nothing until the top is tapped.
         */
        fun focusGame(context: android.content.Context): Boolean {
            val front = context.packageManager.getLaunchIntentForPackage(Installer.GAMENATIVE)
                ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED) ?: return false
            context.startActivity(front, ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY).toBundle())
            return true
        }

        /** Start watching for the game to exit, or, if already watching, just hand focus back to it. */
        fun watchOrFocus(context: android.content.Context) {
            if (watching) focusGame(context)
            else context.startActivity(Intent(context, WatchActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }

        private const val EXTRA_MOVED = "moved"
        private const val KEY_SENT = "sent"
        private const val KEY_AWAY = "away"
    }
}
