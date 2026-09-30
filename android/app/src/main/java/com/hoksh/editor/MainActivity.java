package com.hoksh.editor;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.content.Intent;

public class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<android.net.Uri[]> fileCallback;
    private static final int FILE_REQUEST = 42;

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        setContentView(web);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<android.net.Uri[]> cb, FileChooserParams params) {
                fileCallback = cb;
                Intent i = params.createIntent();
                try { startActivityForResult(i, FILE_REQUEST); }
                catch(Exception e) { fileCallback=null; return false; }
                return true;
            }
        });
        web.loadUrl("https://mo444444444444444-coder.github.io/HOKSH/");
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==FILE_REQUEST && fileCallback!=null){
            android.net.Uri[] r = (resultCode==RESULT_OK && data!=null && data.getData()!=null) ? new android.net.Uri[]{data.getData()} : null;
            fileCallback.onReceiveValue(r); fileCallback=null;
        }
    }

    @Override public void onBackPressed() {
        if(web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
}
