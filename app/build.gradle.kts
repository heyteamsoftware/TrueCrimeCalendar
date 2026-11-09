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
        versionCode = 4
        versionName = "3.0-piloto"
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
    testOptions {
        // Los tests JVM del efecto de casete no usan Android; si algo toca un método de android.jar, que no falle.
        unitTests.isReturnDefaultValues = true
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

    testImplementation(libs.junit)
}
