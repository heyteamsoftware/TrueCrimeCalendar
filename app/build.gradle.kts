import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.heyteamsoftware.truecrimecalendar"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.heyteamsoftware.truecrimecalendar"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "2.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.media3.exoplayer)
    implementation(libs.androidx.media3.session)
}
