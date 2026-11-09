package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.time.ZonedDateTime

/**
 * Programa la alarma del aviso diario. No usa alarmas exactas (no hace falta el permiso
 * SCHEDULE_EXACT_ALARM): setAndAllowWhileIdle puede llegar unos minutos tarde, también en reposo.
 */
internal object ProgramadorAvisos {

    /** Programa el próximo aviso o lo cancela si están desactivados. Se puede llamar las veces que haga falta. */
    fun programar(context: Context) {
        val alarmas = context.getSystemService(AlarmManager::class.java) ?: return
        val alarma = pendiente(context)
        if (!AjustesAvisos.activados(context)) {
            alarmas.cancel(alarma)
            return
        }
        val cuando = siguiente(ZonedDateTime.now(), AjustesAvisos.hora(context), AjustesAvisos.minuto(context))
        alarmas.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando.toInstant().toEpochMilli(), alarma)
    }

    /** Próxima vez que el reloj marque [hora]:[minuto] después de [ahora]. */
    fun siguiente(ahora: ZonedDateTime, hora: Int, minuto: Int): ZonedDateTime {
        val hoy = ahora.toLocalDate().atTime(hora, minuto).atZone(ahora.zone)
        return if (hoy.isAfter(ahora)) hoy
        else ahora.toLocalDate().plusDays(1).atTime(hora, minuto).atZone(ahora.zone)
    }

    private fun pendiente(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        0,
        Intent(context, AvisoDiarioReceiver::class.java).setAction(AvisoDiarioReceiver.ACCION),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
}
