package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Android borra las alarmas al reiniciar y la hora cambia con el reloj o la zona horaria:
 * en esos casos (y tras actualizar la app) se vuelve a programar el aviso diario.
 */
class ReprogramarAvisosReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> ProgramadorAvisos.programar(context)
        }
    }
}
