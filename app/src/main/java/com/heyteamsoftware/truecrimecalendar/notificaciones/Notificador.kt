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
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Canal «Efemérides del día» y notificaciones de los aniversarios. */
internal object Notificador {

    const val CANAL = "efemerides"
    private const val ID_AVISO = 1

    private val FORMATO_FECHA = DateTimeFormatter.ofPattern("d 'de' MMMM", Locale.forLanguageTag("es-ES"))

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
                base(context, titulo, lineaDe(context, caso), abrirCaso(context, caso.id))
                    .setStyle(NotificationCompat.BigTextStyle().bigText(lineaDe(context, caso)))
            } else {
                base(context, titulo, nombres(casos), abrirHoy(context))
                    .setStyle(bandeja(context, titulo, casos))
                    .setNumber(casos.size)
            },
        )
        return true
    }

    /** Prueba (testNotification): la de hoy o, si hoy no hay, la de la próxima efeméride. */
    fun probar(context: Context) {
        val hoy = LocalDate.now()
        if (avisarDelDia(context, hoy)) return
        val (fecha, casos) = AlmacenCasos.proximos(AlmacenCasos.cargar(context), hoy) ?: return
        val titulo = context.getString(R.string.aviso_titulo_proxima)
        val cuando = FORMATO_FECHA.format(fecha)
        publicar(
            context,
            if (casos.size == 1) {
                val caso = casos.single()
                val texto = context.getString(R.string.aviso_proxima, cuando, lineaDe(context, caso))
                base(context, titulo, texto, abrirCaso(context, caso.id))
                    .setStyle(NotificationCompat.BigTextStyle().bigText(texto))
            } else {
                val texto = context.getString(R.string.aviso_proxima, cuando, nombres(casos))
                base(context, titulo, texto, AbrirApp.pendiente(context, AbrirApp.PETICION_AVISO, AbrirApp.intentApp(context)))
                    .setStyle(bandeja(context, texto, casos))
            },
        )
    }

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
    private fun bandeja(context: Context, titulo: String, casos: List<Caso>) =
        NotificationCompat.InboxStyle().also { estilo ->
            estilo.setBigContentTitle(titulo)
            estilo.setSummaryText(
                context.resources.getQuantityString(R.plurals.aviso_varios_casos, casos.size, casos.size)
            )
            casos.forEach { estilo.addLine(lineaDe(context, it)) }
        }

    private fun lineaDe(context: Context, caso: Caso): String =
        if (caso.alias.isBlank()) caso.nombre else context.getString(R.string.aviso_caso, caso.nombre, caso.alias)

    private fun nombres(casos: List<Caso>) = casos.joinToString(", ") { it.nombre }

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
