package com.heyteamsoftware.truecrimecalendar.audio

import android.content.Context
import android.net.Uri
import android.util.Log
import com.heyteamsoftware.truecrimecalendar.AbrirApp
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Dónde están las cintas (contrato 7.2 y 7.7).
 *
 * Las cintas no van dentro de la APK: están en el servidor, en `<SERVIDOR><id>/cinta-<n>.ogg`, y
 * la app guarda una copia de cada una en su almacenamiento privado (`files/cintas/<id>/`). La web
 * sigue pidiendo la ruta de siempre (`audio/<id>/cinta-<n>.ogg`) y aquí se decide de dónde sale:
 *
 * 1. de la copia guardada, si existe;
 * 2. de la APK, si esa cinta va incluida (ninguna, hoy);
 * 3. del servidor. En ese caso, la cinta se guarda a la vez para la próxima vez.
 *
 * Una copia solo recibe su nombre definitivo cuando ha llegado entera: si el archivo existe, está
 * completo.
 */
internal object AlmacenCintas {

    const val SERVIDOR = "https://myappsserver.duckdns.org/truecrimescalendar/"

    private const val TAG = "AlmacenCintas"
    private const val INDICE = "audio/index.json"
    private const val SUFIJO_PARCIAL = ".part"
    private val RUTA = Regex("audio/([^/]+)/cinta-(\\d{1,2})\\.ogg")
    private val OGG = byteArrayOf('O'.code.toByte(), 'g'.code.toByte(), 'g'.code.toByte(), 'S'.code.toByte())

    /** Una cinta del catálogo. [bytes] es su tamaño según el índice (0 si no lo dice). */
    class Ref(val id: String, val n: Int, val bytes: Long)

    /** Cuántas cintas hay guardadas y cuánto ocupan, frente al total del catálogo. */
    class Resumen(val total: Int, val guardadas: Int, val bytes: Long, val bytesTotal: Long)

    @Volatile
    private var catalogo: List<Ref>? = null

    // Copias que se guardan mientras se escucha un caso por primera vez.
    private val cola = Executors.newFixedThreadPool(2)

    fun carpeta(context: Context): File = File(context.filesDir, "cintas")

    fun archivo(context: Context, id: String, n: Int): File = File(carpeta(context), "$id/cinta-$n.ogg")

    fun url(id: String, n: Int): String = "$SERVIDOR$id/cinta-$n.ogg"

    fun guardada(context: Context, id: String, n: Int): Boolean {
        val f = archivo(context, id, n)
        return f.isFile && f.length() > 0
    }

    /** Caso y número de cinta de un `asset:///audio/<id>/cinta-<n>.ogg`, o null si es otra cosa. */
    fun cintaDe(uri: String): Pair<String, Int>? {
        val ruta = RutasAudio.rutaAsset(uri) ?: return null
        val m = RUTA.matchEntire(ruta) ?: return null
        val id = m.groupValues[1].takeIf(AbrirApp::idValido) ?: return null
        val n = m.groupValues[2].toInt().takeIf { it >= 1 } ?: return null
        return id to n
    }

    /** De dónde se reproduce [uri]: copia guardada, APK o servidor. Lo que no es una cinta queda igual. */
    fun uriReproducible(context: Context, uri: String): String {
        val (id, n) = cintaDe(uri) ?: return uri
        if (guardada(context, id, n)) return Uri.fromFile(archivo(context, id, n)).toString()
        if (enApk(context, uri)) return uri
        return url(id, n)
    }

    fun enApk(context: Context, uri: String): Boolean {
        val ruta = RutasAudio.rutaAsset(uri) ?: return false
        return try {
            context.assets.open(ruta).close()
            true
        } catch (_: IOException) {
            false
        }
    }

    /** Guarda en segundo plano las cintas de [caso] que aún se escuchan desde el servidor. */
    fun guardarCaso(context: Context, caso: CasoCintas) {
        val app = context.applicationContext
        for (cinta in caso.cintas) {
            val (id, n) = cintaDe(cinta.uri) ?: continue
            if (guardada(app, id, n) || enApk(app, cinta.uri)) continue
            cola.execute { descargar(app, id, n) }
        }
    }

    /** Todas las cintas que existen, según `assets/audio/index.json`. */
    fun catalogo(context: Context): List<Ref> {
        catalogo?.let { return it }
        val lista = ArrayList<Ref>()
        try {
            val texto = context.assets.open(INDICE).bufferedReader().use { it.readText() }
            val indice = JSONObject(texto)
            for (id in indice.keys()) {
                if (!AbrirApp.idValido(id)) continue
                val cintas = indice.optJSONObject(id)?.optJSONArray("cintas") ?: continue
                for (i in 0 until cintas.length()) {
                    val c = cintas.optJSONObject(i) ?: continue
                    val n = c.optInt("n", i + 1)
                    if (n in 1..99) lista += Ref(id, n, c.optLong("bytes", 0L).coerceAtLeast(0L))
                }
            }
        } catch (e: IOException) {
            Log.w(TAG, "No se puede leer $INDICE", e)
        } catch (e: JSONException) {
            Log.w(TAG, "$INDICE no es válido", e)
        }
        catalogo = lista
        return lista
    }

    fun resumen(context: Context): Resumen {
        val todas = catalogo(context)
        var guardadas = 0
        var bytes = 0L
        var bytesTotal = 0L
        for (ref in todas) {
            bytesTotal += ref.bytes
            val f = archivo(context, ref.id, ref.n)
            val largo = if (f.isFile) f.length() else 0L
            if (largo > 0) {
                guardadas++
                bytes += largo
            }
        }
        return Resumen(todas.size, guardadas, bytes, bytesTotal)
    }

    /**
     * Baja una cinta del servidor y la guarda. Bloquea: se llama desde un hilo de trabajo.
     * Devuelve true si la cinta queda guardada (o ya lo estaba).
     */
    fun descargar(context: Context, id: String, n: Int, cancelada: () -> Boolean = { false }): Boolean {
        val destino = archivo(context, id, n)
        if (destino.isFile && destino.length() > 0) return true
        val carpeta = destino.parentFile ?: return false
        // Nombre propio de este hilo: dos descargas de la misma cinta no se pisan.
        val parcial = File(carpeta, "${destino.name}.${Thread.currentThread().id}$SUFIJO_PARCIAL")
        var conexion: HttpURLConnection? = null
        try {
            conexion = (URL(url(id, n)).openConnection() as HttpURLConnection).apply {
                connectTimeout = ESPERA_CONEXION_MS
                readTimeout = ESPERA_LECTURA_MS
                instanceFollowRedirects = false
                setRequestProperty("Accept-Encoding", "identity")
            }
            if (conexion.responseCode != HttpURLConnection.HTTP_OK) {
                Log.w(TAG, "El servidor responde ${conexion.responseCode} a $id/cinta-$n")
                return false
            }
            val esperado = conexion.contentLengthLong
            // mkdirs devuelve false si otro hilo acaba de crearla (las dos cintas de un caso): se mira el resultado.
            carpeta.mkdirs()
            if (!carpeta.isDirectory) return false
            var total = 0L
            var esOgg = true
            conexion.inputStream.use { entrada ->
                parcial.outputStream().use { salida ->
                    val bloque = ByteArray(32 * 1024)
                    while (true) {
                        if (cancelada()) return false
                        val leidos = entrada.read(bloque)
                        if (leidos < 0) break
                        // Una página de un portal wifi también responde 200: tiene que ser un Ogg.
                        if (total == 0L && !(leidos >= OGG.size && OGG.indices.all { bloque[it] == OGG[it] })) {
                            esOgg = false
                            break
                        }
                        salida.write(bloque, 0, leidos)
                        total += leidos
                    }
                }
            }
            if (!esOgg || total == 0L || (esperado > 0 && total != esperado)) {
                Log.w(TAG, "Descarga incompleta o no válida de $id/cinta-$n ($total de $esperado bytes)")
                return false
            }
            return parcial.renameTo(destino) || (destino.isFile && destino.length() > 0)
        } catch (e: IOException) {
            Log.w(TAG, "No se puede descargar $id/cinta-$n: ${e.message}")
            return false
        } finally {
            conexion?.disconnect()
            parcial.delete() // si se renombró, ya no existe
        }
    }

    /** Borra todas las copias guardadas (y los restos de descargas a medias). */
    fun borrarTodo(context: Context) {
        carpeta(context).deleteRecursively()
    }

    /** Quita los restos de descargas que se cortaron al cerrarse la app. */
    fun limpiarParciales(context: Context) {
        carpeta(context).walkTopDown().filter { it.isFile && it.name.endsWith(SUFIJO_PARCIAL) }.forEach { it.delete() }
    }

    private const val ESPERA_CONEXION_MS = 15_000
    private const val ESPERA_LECTURA_MS = 20_000
}
