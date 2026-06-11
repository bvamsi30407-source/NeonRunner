package com.neon.runner

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.Window
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled", "PrivateApi")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make activity fullscreen
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )

        // Keep screen on while playing the game
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Hide navigation bar and status bar for complete immersive feel
        hideSystemUI()

        // Create WebView
        webView = WebView(this)
        setContentView(webView)

        // Configure WebView settings for optimized canvas gaming
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        
        // Optimize rendering performance
        webView.setInitialScale(1)
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        
        // Scrollbar configs
        webView.scrollBarStyle = WebView.SCROLLBARS_OUTSIDE_OVERLAY
        webView.isScrollbarFadingEnabled = true

        // File access for local scripts & index.html relative routing
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        
        // Use reflection or standard setters for file system properties
        try {
            val allowFileAccessFromFileURLsMethod = settings.javaClass.getMethod("setAllowFileAccessFromFileURLs", Boolean::class.java)
            allowFileAccessFromFileURLsMethod.invoke(settings, true)
            
            val allowUniversalAccessFromFileURLsMethod = settings.javaClass.getMethod("setAllowUniversalAccessFromFileURLs", Boolean::class.java)
            allowUniversalAccessFromFileURLsMethod.invoke(settings, true)
        } catch (e: Exception) {
            // Fallback for different OS versions if reflection isn't direct
        }

        // Prevent links from launching in external Web Browser app
        webView.webViewClient = object : WebViewClient() {
            @Deprecated("Deprecated in Java", ReplaceWith("false"))
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                view.loadUrl(url)
                return true
            }
        }

        webView.webChromeClient = WebChromeClient()

        // Load the local compiled TypeScript app entry asset
        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            hideSystemUI()
        }
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
