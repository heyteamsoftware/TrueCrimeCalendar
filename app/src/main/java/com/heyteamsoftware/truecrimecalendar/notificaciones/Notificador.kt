package com.heyteamsoftware.truecrimecalendar.notificaciones

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import com.heyteamsoftware.truecrimecalendar.R
import java.time.LocalDate

/** Canal «Efemérides del día» y notificaciones de los aniversarios. */
internal object Notificador {

    const val CANAL = "efemerides"
    private const val ID_AVISO = 1

    fun crearCanal(context: Context) {
        val canal = NotificationChannelCompat.Builder(CANAL, NotificationManagerCompat.IMPORTANCE_DEFAULT)
            .setName(context.getString(R.string.canal_efemerides))
            .setDescription(context.getString(R.string.canal_efemerides_descripcion))
            .build()
        NotificationManagerCompat.from(context).createNotificationChannel(canal)
    }

    /** Si Android dejará mostrar los avisos (permiso, notificaciones de la app y canal). */
    fun puedeNotificar(context: Context): Boolean {
        val gestor = NotificationManagerCompat.from(context)
        if (!tienePermiso(context) || !gestor.areNotificationsEnabled()) return false
        return !canalBloqueado(context)
    }

    fun tienePermiso(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED

    fun canalBloqueado(context: Context): Boolean =
        NotificationManagerCompat.from(context).getNotificationChannelCompat(CANAL)
            ?.importance == NotificationManagerCompat.IMPORTANCE_NONE

    /** Aviso diario: publica los casos de [hoy]. Devuelve false si no hay ninguno. */
    fun avisarDelDia(context: Context, hoy: LocalDate = LocalDate.now()): Boolean {
        val casos = AlmacenCasos.delDia(AlmacenCasos.cargar(context), hoy)
        if (casos.isEmpty()) return false
        val titulo = context.getString(R.string.aviso_titulo_hoy)
        publicar(
            context,
            if (casos.size == 1) {
                val caso = casos.single()
                val linea = lineaDe(context, caso, hoy)
                base(context, titulo, linea, abrirCaso(context, caso.id))
                    .setStyle(NotificationCompat.BigTextStyle().bigText(linea))
            } else {
                base(context, titulo, nombres(casos), abrirHoy(context))
                    .setStyle(bandeja(context, titulo, casos, hoy))
                    .setNumber(casos.size)
            },
        )
        return true
    }

    /**
     * Prueba (testNotification): igual que el aviso diario, solo se envía si hoy hay algún caso.
     * Los días sin caso la web lo explica en la ficha de ajustes y no se notifica nada.
     */
    fun probar(context: Context): Boolean = avisarDelDia(context, LocalDate.now())

    private fun base(context: Context, titulo: String, texto: String, alTocar: PendingIntent) =
        NotificationCompat.Builder(context, CANAL)
            .setSmallIcon(R.drawable.ic_stat_tcc)
            .setColor(ContextCompat.getColor(context, R.color.rojo_tcc))
            .setContentTitle(titulo)
            .setContentText(texto)
            .setContentIntent(alTocar)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)

    /** Varios casos: una línea por expediente. */
    private fun bandeja(context: Context, titulo: String, casos: List<Caso>, hoy: LocalDate) =
        NotificationCompat.InboxStyle().also { estilo ->
            estilo.setBigContentTitle(titulo)
            estilo.setSummaryText(
                context.resources.getQuantityString(R.plurals.aviso_varios_casos, casos.size, casos.size)
            )
            casos.forEach { estilo.addLine(lineaDe(context, it, hoy)) }
        }

    /**
     * Qué se conmemora (contrato 8), como en las fichas de la web:
     * «Nació un día como hoy · Ian Brady «El asesino de los páramos»» o
     * «Hoy hace 79 años del hallazgo · La Dalia Negra».
     */
    private fun lineaDe(context: Context, caso: Caso, hoy: LocalDate): String {
        val deQue = when (caso.efemeride) {
            Efemeride.NACIMIENTO -> {
                val quien = if (caso.alias.isBlank()) caso.nombre
                else context.getString(R.string.aviso_nombre_alias, caso.nombre, caso.alias)
                return context.getString(R.string.aviso_nacimiento, quien)
            }
            Efemeride.CRIMEN -> R.string.efemeride_de_crimen
            Efemeride.DETENCION -> R.string.efemeride_de_detencion
            Efemeride.CONDENA -> R.string.efemeride_de_condena
            Efemeride.HALLAZGO -> R.string.efemeride_de_hallazgo
            Efemeride.DESAPARICION -> R.string.efemeride_de_desaparicion
            Efemeride.GOLPE -> R.string.efemeride_de_golpe
        }
        // En los casos nuevos el alias suele ser el nombre del caso («La Dalia Negra»).
        val etiqueta = caso.alias.ifBlank { caso.nombre }
        val de = context.getString(deQue)
        val anios = caso.aniosEn(hoy.year)
            ?: return context.getString(R.string.aviso_aniversario, de, etiqueta)
        return context.resources.getQuantityString(R.plurals.aviso_hace, anios, anios, de, etiqueta)
    }

    /** Varios casos: los nombres (en los casos nuevos, el del caso: «La Dalia Negra»). */
    private fun nombres(casos: List<Caso>) = casos.joinToString(", ") {
        if (it.efemeride == Efemeride.NACIMIENTO) it.nombre else it.alias.ifBlank { it.nombre }
    }

    private fun abrirCaso(context: Context, id: String) =
        AbrirApp.pendiente(context, AbrirApp.PETICION_AVISO, AbrirApp.intentCaso(context, id))

    private fun abrirHoy(context: Context) =
        AbrirApp.pendiente(context, AbrirApp.PETICION_AVISO, AbrirApp.intentHoy(context))

    private fun publicar(context: Context, aviso: NotificationCompat.Builder) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) return
        crearCanal(context)
        NotificationManagerCompat.from(context).notify(ID_AVISO, aviso.build())
    }
}
