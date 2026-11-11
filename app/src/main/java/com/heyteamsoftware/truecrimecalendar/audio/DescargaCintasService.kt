package com.heyteamsoftware.truecrimecalendar.audio

import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationChannelCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import com.heyteamsoftware.truecrimecalendar.R
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * «Descargar todas las cintas» (contrato 7.7): baja del servidor las cintas que aún no están
 * guardadas, para escucharlas sin conexión.
 *
 * Es un servicio en primer plano con su notificación de avance, para que la descarga siga con la
 * app en segundo plano o la pantalla apagada. Se puede cancelar desde la notificación o desde la
 * ficha de ajustes; lo ya descargado se conserva y la siguiente vez solo se baja lo que falte.
 */
class DescargaCintasService : Service() {

    private val principal = Handler(Looper.getMainLooper())
    private var bloqueo: PowerManager.WakeLock? = null
    private var total = 0
    private val hechas = AtomicInteger()
    private var avisoPendiente = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACCION_CANCELAR) {
            cancelada = true
            if (!enMarcha) stopSelf()
            return START_NOT_STICKY
        }
        if (enMarcha) return START_NOT_STICKY
        enMarcha = true
        cancelada = false
        resultado = ""
        fallos = 0
        hechas.set(0)
        total = 0

        crearCanal()
        ServiceCompat.startForeground(this, ID_AVISO, aviso(), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        bloqueo = (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "$packageName:descarga-cintas")
            .apply { acquire(MAXIMO_MS) }
        publicar(this)
        Thread({ descargarTodo() }, "descarga-cintas").start()
        return START_NOT_STICKY
    }

    /** Android 15 limita a unas horas los servicios de este tipo: si se agota, se deja para otro rato. */
    override fun onTimeout(startId: Int, fgsType: Int) {
        cancelada = true
    }

    override fun onDestroy() {
        cancelada = true
        soltarBloqueo()
        super.onDestroy()
    }

    private fun descargarTodo() {
        AlmacenCintas.limpiarParciales(this)
        val faltan = AlmacenCintas.catalogo(this).filter { !AlmacenCintas.guardada(this, it.id, it.n) }
        total = faltan.size
        val fallidas = AtomicInteger()
        val seguidas = AtomicInteger() // fallos seguidos: sin conexión no se insiste con las 477
        val hilos = Executors.newFixedThreadPool(DESCARGAS_A_LA_VEZ)
        for (ref in faltan) {
            hilos.execute {
                if (cancelada || seguidas.get() >= FALLOS_SEGUIDOS_MAX) return@execute
                val bien = AlmacenCintas.descargar(this, ref.id, ref.n) { cancelada } ||
                    (!cancelada && AlmacenCintas.descargar(this, ref.id, ref.n) { cancelada })
                if (bien) {
                    seguidas.set(0)
                    hechas.incrementAndGet()
                } else if (!cancelada) {
                    seguidas.incrementAndGet()
                    fallidas.incrementAndGet()
                }
                avisarAvance()
            }
        }
        hilos.shutdown()
        try {
            hilos.awaitTermination(MAXIMO_MS, TimeUnit.MILLISECONDS)
        } catch (_: InterruptedException) {
            hilos.shutdownNow()
        }
        val quedan = total - hechas.get()
        fallos = quedan
        resultado = when {
            quedan == 0 -> RESULTADO_COMPLETA
            cancelada -> RESULTADO_CANCELADA
            else -> RESULTADO_ERROR
        }
        Log.i(TAG, "Descarga de cintas: ${hechas.get()} de $total ($resultado, ${fallidas.get()} fallos)")
        principal.post { terminar() }
    }

    private fun terminar() {
        enMarcha = false
        soltarBloqueo()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        publicar(this)
        stopSelf()
    }

    private fun soltarBloqueo() {
        bloqueo?.takeIf { it.isHeld }?.release()
        bloqueo = null
    }

    /** Desde los hilos de descarga: como mucho, un aviso cada [CADENCIA_MS]. */
    private fun avisarAvance() {
        principal.post {
            if (avisoPendiente || !enMarcha) return@post
            avisoPendiente = true
            principal.postDelayed({
                avisoPendiente = false
                if (!enMarcha) return@postDelayed
                NotificationManagerCompat.from(this).takeIf { it.areNotificationsEnabled() }?.let {
                    try {
                        it.notify(ID_AVISO, aviso())
                    } catch (_: SecurityException) {
                        // Sin permiso de notificaciones: la descarga sigue sin aviso.
                    }
                }
                publicar(this)
            }, CADENCIA_MS)
        }
    }

    private fun crearCanal() {
        val canal = NotificationChannelCompat.Builder(CANAL, NotificationManagerCompat.IMPORTANCE_LOW)
            .setName(getString(R.string.canal_descargas))
            .setDescription(getString(R.string.canal_descargas_descripcion))
            .build()
        NotificationManagerCompat.from(this).createNotificationChannel(canal)
    }

    private fun aviso() = NotificationCompat.Builder(this, CANAL)
        .setSmallIcon(R.drawable.ic_stat_tcc)
        .setColor(ContextCompat.getColor(this, R.color.rojo_tcc))
        .setContentTitle(getString(R.string.descarga_titulo))
        .setContentText(if (total > 0) getString(R.string.descarga_avance, hechas.get(), total) else getString(R.string.descarga_preparando))
        .setProgress(total, hechas.get(), total == 0)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        .setContentIntent(AbrirApp.pendiente(this, AbrirApp.PETICION_DESCARGA, AbrirApp.intentApp(this)))
        .addAction(
            0,
            getString(R.string.descarga_cancelar),
            PendingIntent.getService(
                this,
                0,
                Intent(this, DescargaCintasService::class.java).setAction(ACCION_CANCELAR),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            ),
        )
        .build()

    companion object {
        private const val TAG = "DescargaCintas"
        private const val CANAL = "descargas"
        private const val ID_AVISO = 2
        private const val ACCION_CANCELAR = "com.heyteamsoftware.truecrimecalendar.CANCELAR_DESCARGA"
        private const val DESCARGAS_A_LA_VEZ = 4
        private const val FALLOS_SEGUIDOS_MAX = 6
        private const val CADENCIA_MS = 400L
        private const val MAXIMO_MS = 60 * 60 * 1000L

        private const val RESULTADO_COMPLETA = "complete"
        private const val RESULTADO_CANCELADA = "cancelled"
        private const val RESULTADO_ERROR = "error"

        @Volatile
        private var enMarcha = false

        @Volatile
        private var cancelada = false

        /** Cómo acabó la última descarga de esta sesión: "", "complete", "cancelled" o "error". */
        @Volatile
        private var resultado = ""

        /** Cintas que quedaron sin bajar en la última descarga. */
        @Volatile
        private var fallos = 0

        /** La actividad recibe aquí el estado (`TapeDownloadState`, en JSON) en el hilo principal. */
        @Volatile
        var oyente: ((String) -> Unit)? = null

        fun empezar(context: Context) {
            if (enMarcha) return
            ContextCompat.startForegroundService(context, Intent(context, DescargaCintasService::class.java))
        }

        fun cancelar() {
            cancelada = true
        }

        /** Borra las copias guardadas. No hace nada mientras hay una descarga en marcha. */
        fun borrar(context: Context) {
            if (enMarcha) return
            val app = context.applicationContext
            Thread({
                AlmacenCintas.borrarTodo(app)
                resultado = ""
                fallos = 0
                publicar(app)
            }, "borrar-cintas").start()
        }

        /** `TapeDownloadState` del contrato (7.7). Lee el disco: no llamar desde el hilo principal en bucle. */
        fun estadoJson(context: Context): String {
            val r = AlmacenCintas.resumen(context)
            return JSONObject()
                .put("total", r.total)
                .put("saved", r.guardadas)
                .put("bytes", r.bytes)
                .put("totalBytes", r.bytesTotal)
                .put("running", enMarcha)
                .put("result", resultado)
                .put("failed", fallos)
                .toString()
        }

        private fun publicar(context: Context) {
            val destino = oyente ?: return
            val json = estadoJson(context)
            Handler(Looper.getMainLooper()).post { destino(json) }
        }
    }
}
