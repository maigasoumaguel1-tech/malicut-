package com.malikit.v8;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.*;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadCallback;
    private PermissionRequest pendingWebPermission;
    private static final int FILE_REQUEST = 1001;
    private static final int MEDIA_PERMISSION_REQUEST = 1002;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = cb;
                try { startActivityForResult(params.createIntent(), FILE_REQUEST); }
                catch (Exception e) { uploadCallback=null; return false; }
                return true;
            }

            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> requestWebMediaPermissions(request));
            }

            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingWebPermission == request) pendingWebPermission = null;
            }
        });
        webView.loadUrl("https://malikit.oranda.com/");
    }

    private void requestWebMediaPermissions(PermissionRequest request) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            request.grant(request.getResources());
            return;
        }
        ArrayList<String> required = new ArrayList<>();
        for (String resource : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) required.add(Manifest.permission.RECORD_AUDIO);
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) required.add(Manifest.permission.CAMERA);
        }
        ArrayList<String> missing = new ArrayList<>();
        for (String permission : required) {
            if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) missing.add(permission);
        }
        if (missing.isEmpty()) {
            request.grant(request.getResources());
        } else {
            pendingWebPermission = request;
            requestPermissions(missing.toArray(new String[0]), MEDIA_PERMISSION_REQUEST);
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MEDIA_PERMISSION_REQUEST || pendingWebPermission == null) return;
        boolean granted = grantResults.length > 0;
        for (int result : grantResults) granted = granted && result == PackageManager.PERMISSION_GRANTED;
        PermissionRequest request = pendingWebPermission;
        pendingWebPermission = null;
        if (granted) request.grant(request.getResources());
        else request.deny();
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_REQUEST && uploadCallback != null) {
            uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            uploadCallback = null;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
