package com.heyteamsoftware.truecrimecalendar

import android.app.PendingIntent
import android.content.Context
import android.content.Intent

/**
 * Intents que abren [MainActivity] en un expediente concreto o en el día de hoy.
 * Los usan la notificación multimedia del podcast y los avisos diarios.
 */
object AbrirApp {

    const val ACCION_ABRIR_CASO = "com.heyteamsoftware.truecrimecalendar.ABRIR_CASO"
    const val ACCION_ABRIR_HOY = "com.heyteamsoftware.truecrimecalendar.ABRIR_HOY"
    private const val EXTRA_CASO = "caso"

    // Un código por origen para que el PendingIntent de uno no sustituya al de otro.
    const val PETICION_AVISO = 1
    const val PETICION_PODCAST = 2

    /** Ids de caso aceptados (los del HTML: letras, números, guion y guion bajo). */
    private val ID_VALIDO = Regex("[A-Za-z0-9_-]{1,64}")

    fun idValido(id: String?): Boolean = id != null && ID_VALIDO.matches(id)

    fun intentApp(context: Context): Intent =
        Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    fun intentCaso(context: Context, id: String): Intent =
        intentApp(context).setAction(ACCION_ABRIR_CASO).putExtra(EXTRA_CASO, id)

    fun intentHoy(context: Context): Intent = intentApp(context).setAction(ACCION_ABRIR_HOY)

    fun pendiente(context: Context, peticion: Int, intent: Intent): PendingIntent =
        PendingIntent.getActivity(
            context,
            peticion,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

    /** Id del expediente que pide abrir [intent], o null si no pide ninguno. */
    fun casoDe(intent: Intent?): String? =
        intent?.takeIf { it.action == ACCION_ABRIR_CASO }
            ?.getStringExtra(EXTRA_CASO)
            ?.takeIf(::idValido)

    fun pideHoy(intent: Intent?): Boolean = intent?.action == ACCION_ABRIR_HOY
}
