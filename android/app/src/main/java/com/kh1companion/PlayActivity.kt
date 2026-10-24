package com.kh1companion

import android.app.Activity
import android.app.ActivityOptions
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.view.Display
import android.widget.Toast

/**
 * "Play KH1": opens the companion, starts the game through GameNative, and closes the
 * companion when the game exits. No watcher: GameNative's external-launch support
 * (app.gamenative.LAUNCH_GAME) finishes its own screen when a game it was asked to start
 * exits, which brings this invisible activity back to the front, and that's the cue.
 */
class PlayActivity : Activity() {
    private var launched = false
    private var away = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        launched = savedInstanceState?.getBoolean(KEY_LAUNCHED) ?: false
        away = savedInstanceState?.getBoolean(KEY_AWAY) ?: false
        if (launched) return

        // Tapped on the bottom screen: hop to the top one first, so the game opens there and
        // this activity sits underneath it, ready to notice the game closing.
        if (display?.displayId != Display.DEFAULT_DISPLAY && !intent.getBooleanExtra(EXTRA_MOVED, false)) {
            val opts = ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY)
            startActivity(
                Intent(this, PlayActivity::class.java).putExtra(EXTRA_MOVED, true)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_MULTIPLE_TASK),
                opts.toBundle(),
            )
            finish()
            return
        }

        if (!Settings.canDrawOverlays(this) || !Environment.isExternalStorageManager()) {
            startActivity(Intent(this, MainActivity::class.java).setAction(MainActivity.ACTION_SETTINGS))
            finish()
            return
        }

        val prefs = Prefs(this)
        startForegroundService(Intent(this, CompanionService::class.java))
        val game = Intent(ACTION_LAUNCH_GAME)
            .setPackage(GAMENATIVE)
            .putExtra("app_id", prefs.gameAppId)
            .putExtra("game_source", prefs.gameSource)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        try {
            startActivity(game, ActivityOptions.makeBasic().setLaunchDisplayId(Display.DEFAULT_DISPLAY).toBundle())
            launched = true
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, "GameNative isn't installed", Toast.LENGTH_LONG).show()
            CompanionService.stop(this)
            finish()
        }
    }

    override fun onPause() {
        super.onPause()
        if (launched) away = true
    }

    override fun onResume() {
        super.onResume()
        // Back in front after the game had it: the game is over.
        if (launched && away) {
            CompanionService.stop(this)
            finish()
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean(KEY_LAUNCHED, launched)
        outState.putBoolean(KEY_AWAY, away)
    }

    companion object {
        const val GAMENATIVE = "app.gamenative"
        private const val ACTION_LAUNCH_GAME = "app.gamenative.LAUNCH_GAME"
        private const val EXTRA_MOVED = "moved"
        private const val KEY_LAUNCHED = "launched"
        private const val KEY_AWAY = "away"
    }
}
