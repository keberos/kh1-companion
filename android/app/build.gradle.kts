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
        versionCode = 10
        versionName = "0.9.0-beta.8.1"
    }

    // Release signing comes from the environment (CI secrets, or a local key), so every release
    // is signed with the same key and installs over the last one.
    signingConfigs {
        create("release") {
            System.getenv("KH1C_KEYSTORE")?.let { path ->
                storeFile = file(path)
                storePassword = System.getenv("KH1C_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KH1C_KEY_ALIAS")
                keyPassword = System.getenv("KH1C_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = if (System.getenv("KH1C_KEYSTORE") != null) signingConfigs.getByName("release") else null
        }
    }

    sourceSets {
        // Bundle the same companion page the PC dev server serves, plus the bridge script the
        // app copies to Download/KH1Companion/scripts/ (assets/mod/ holds the LuaBackend files).
        getByName("main").assets.srcDir("../../companion")
        getByName("main").assets.srcDir("../../lua")
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
