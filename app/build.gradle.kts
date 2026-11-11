import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// Clave de subida a Google Play: keystore.properties (fuera de git) con storeFile, storePassword, keyAlias y keyPassword.
val firma = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.heyteamsoftware.truecrimecalendar"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.heyteamsoftware.truecrimecalendar"
        minSdk = 26
        targetSdk = 36
        // -Pvc=1 sirve para probar el aviso de «versión demasiado antigua» con una compilación de prueba
        versionCode = (project.findProperty("vc") as String?)?.toInt() ?: 10
        versionName = "3.0.0"
    }

    signingConfigs {
        if (firma.containsKey("storeFile")) {
            create("subida") {
                storeFile = file(firma.getProperty("storeFile"))
                storePassword = firma.getProperty("storePassword")
                keyAlias = firma.getProperty("keyAlias")
                keyPassword = firma.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            signingConfigs.findByName("subida")?.let { signingConfig = it }
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
    implementation(libs.androidx.play.update)
    // La librería de Play arrastra un Fragment antiguo y lint (InvalidFragmentVersionForActivityResult) falla
    implementation(libs.androidx.fragment)

    testImplementation(libs.junit)
}
