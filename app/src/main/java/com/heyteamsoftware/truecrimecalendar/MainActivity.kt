package com.heyteamsoftware.truecrimecalendar

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import com.heyteamsoftware.truecrimecalendar.audio.ConexionAudio
import com.heyteamsoftware.truecrimecalendar.audio.DescargaCintasService
import com.heyteamsoftware.truecrimecalendar.audio.EstadoAudio
import com.heyteamsoftware.truecrimecalendar.notificaciones.ControlAvisos
import com.heyteamsoftware.truecrimecalendar.puente.PuenteNativo
import org.json.JSONObject
import java.io.IOException

/**
 * Muestra el calendario (app/src/main/assets/index.html) a pantalla completa.
 *
 * La página se sirve desde https://appassets.androidplatform.net/assets/ para que
 * funcione como una web normal (localStorage, peticiones a Wikipedia, historial).
 * Habla con la parte nativa (podcast y avisos) mediante window.TCCNative: ver docs/CONTRATO.md.
 */
class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var audio: ConexionAudio
    private val avisos = ControlAvisos(this) { json -> llamarWeb("TCC_onNotificationSettings", json) }

    // La página ha terminado de cargar: ya se le pueden pedir cosas (abrir un expediente…).
    private var paginaLista = false
    // Expediente pedido por una notificación mientras la página aún cargaba.
    private var casoPendiente: String? = null

    // Si la página tiene historial (por ejemplo, un expediente abierto), Atrás vuelve
    // dentro de la página; si no, Atrás cierra la app como siempre.
    private val backInPage = object : OnBackPressedCallback(false) {
        override fun handleOnBackPressed() = webView.goBack()
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)

        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        audio = ConexionAudio(this) { json -> llamarWeb("TCC_onPlayerState", json) }
        avisos.iniciar()

        webView = WebView(this).apply {
            setBackgroundColor(DESK_COLOR)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = AppWebViewClient()
            addJavascriptInterface(PuenteNativo(this@MainActivity, audio, avisos), "TCCNative")
        }
        val root = FrameLayout(this).apply {
            setBackgroundColor(DESK_COLOR)
            addView(webView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        }
        setContentView(root)

        // Deja libres la barra de estado, la barra de navegación, el notch y el teclado.
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout() or
                    WindowInsetsCompat.Type.ime()
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        onBackPressedDispatcher.addCallback(this, backInPage)

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            // Arranque en frío desde una notificación: la página abre el expediente del hash.
            val caso = if (savedInstanceState == null && !desdeRecientes(intent)) AbrirApp.casoDe(intent) else null
            webView.loadUrl(if (caso != null) "$START_URL#$caso" else START_URL)
        }
    }

    // La actividad es singleTask: las notificaciones llegan aquí si la app ya estaba abierta.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val caso = AbrirApp.casoDe(intent)
        when {
            caso != null && paginaLista -> llamarWeb("TCC_openCase", JSONObject.quote(caso))
            caso != null -> casoPendiente = caso
            // Varios casos hoy: la app ya muestra el calendario; si la web define este gancho
            // opcional (no está en el contrato), lo lleva al día de hoy.
            AbrirApp.pideHoy(intent) && paginaLista -> llamarWeb("TCC_openToday", "")
        }
    }

    override fun onStart() {
        super.onStart()
        audio.conectar()
        DescargaCintasService.oyente = { json -> llamarWeb("TCC_onTapeDownload", json) }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        avisos.refrescar()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onStop() {
        DescargaCintasService.oyente = null
        audio.desconectar()
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onDestroy() {
        audio.desconectar()
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }

    /** Llama a `window.<funcion>(<argumento>)` si la página la define. [argumento] ya va en JSON. */
    private fun llamarWeb(funcion: String, argumento: String) {
        if (!::webView.isInitialized || isDestroyed) return
        webView.evaluateJavascript("window.$funcion && window.$funcion($argumento)", null)
    }

    private fun desdeRecientes(intent: Intent?): Boolean =
        intent != null && intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0

    private fun openExternally(uri: Uri) {
        if (uri.scheme?.lowercase() !in EXTERNAL_SCHEMES) return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            // No hay ninguna app que pueda abrir el enlace: se ignora.
        }
    }

    private inner class AppWebViewClient : WebViewClient() {

        private val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this@MainActivity))
            .build()

        override fun shouldInterceptRequest(
            view: WebView,
            request: WebResourceRequest,
        ): WebResourceResponse? {
            val url = request.url
            val path = url.path.orEmpty()
            return when {
                // La página pide las fuentes a Google Fonts: se sirven las copias incluidas en la app.
                url.host == FONTS_HOST -> asset("fonts/fonts.css", "text/css")
                url.host == WebViewAssetLoader.DEFAULT_DOMAIN && path.startsWith("/assets/fonts/") ->
                    asset(path.removePrefix("/assets/"), "font/woff2")
                else -> assetLoader.shouldInterceptRequest(url)
            }
        }

        // Enlaces a otras webs (Wikipedia, Leaflet…) se abren en el navegador del móvil.
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host == WebViewAssetLoader.DEFAULT_DOMAIN) return false
            openExternally(request.url)
            return true
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            paginaLista = false
        }

        override fun onPageFinished(view: WebView, url: String?) {
            paginaLista = true
            casoPendiente?.let { llamarWeb("TCC_openCase", JSONObject.quote(it)) }
            casoPendiente = null
            // Por si el audio ya sonaba (por ejemplo, la actividad se ha recreado).
            llamarWeb("TCC_onPlayerState", EstadoAudio.ultimoJson)
        }

        override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
            backInPage.isEnabled = view.canGoBack()
        }

        // Si Android cierra el motor web (por ejemplo, por falta de memoria), se recarga
        // la pantalla en lugar de cerrar la app.
        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            recreate()
            return true
        }

        private fun asset(path: String, mimeType: String): WebResourceResponse? = try {
            WebResourceResponse(
                mimeType,
                if (mimeType.startsWith("text/")) "utf-8" else null,
                200,
                "OK",
                mapOf("Access-Control-Allow-Origin" to "*"),
                assets.open(path),
            )
        } catch (_: IOException) {
            null
        }
    }

    private companion object {
        const val START_URL = "https://${WebViewAssetLoader.DEFAULT_DOMAIN}/assets/index.html"
        const val FONTS_HOST = "fonts.googleapis.com"
        val EXTERNAL_SCHEMES = setOf("http", "https", "mailto", "tel")
        val DESK_COLOR = Color.rgb(0x23, 0x1E, 0x18)
    }
}
