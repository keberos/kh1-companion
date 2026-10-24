plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.kh1companion"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kh1companion"
        minSdk = 30 // createWindowContext for overlays on a secondary display
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
    }

    sourceSets {
        // Bundle the same companion page the PC dev server serves.
        getByName("main").assets.srcDir("../../companion")
    }
    androidResources {
        ignoreAssetsPattern = "!.svn:!.git:.*:!CVS:!thumbs.db:!*~:!state.json:!state.json.tmp"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
