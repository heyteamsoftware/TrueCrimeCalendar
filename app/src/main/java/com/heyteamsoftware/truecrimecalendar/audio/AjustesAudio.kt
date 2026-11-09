package com.heyteamsoftware.truecrimecalendar.audio

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/** Preferencias del podcast: volumen de las cintas (0 a 1, por defecto al máximo). */
internal object AjustesAudio {

    private const val ARCHIVO = "audio"
    private const val VOLUMEN = "volumen"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE)

    fun volumen(context: Context): Float = prefs(context).getFloat(VOLUMEN, 1f)

    fun guardarVolumen(context: Context, volumen: Float) =
        prefs(context).edit { putFloat(VOLUMEN, volumen.coerceIn(0f, 1f)) }
}
