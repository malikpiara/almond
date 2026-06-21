package com.moonwith.almond;

import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;

import java.util.Collections;

/**
 * Native Google authorization for Drive's appData scope, via Google Identity
 * Services' AuthorizationClient. Returns an access token SILENTLY when the grant
 * exists; shows a one-time OS consent dialog otherwise. That's the unlock for
 * background sync on app open / focus (the web GIS popup can't run gesture-free).
 *
 * The consent dialog is a PendingIntent, launched via the AndroidX
 * ActivityResultLauncher (registered in load(), before the activity resumes) so
 * its result routes back reliably under Capacitor 8.
 */
@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    private static final String TAG = "GoogleAuth";
    private static final String DRIVE_APPDATA = "https://www.googleapis.com/auth/drive.appdata";
    private String pendingCallId;
    private ActivityResultLauncher<IntentSenderRequest> consentLauncher;

    @Override
    public void load() {
        consentLauncher = getActivity().registerForActivityResult(
                new ActivityResultContracts.StartIntentSenderForResult(),
                this::onConsentResult);
        Log.d(TAG, "loaded; consent launcher registered");
    }

    @PluginMethod
    public void getToken(final PluginCall call) {
        final boolean interactive = Boolean.TRUE.equals(call.getBoolean("interactive", false));
        Log.d(TAG, "getToken interactive=" + interactive);
        AuthorizationRequest request = AuthorizationRequest.builder()
                .setRequestedScopes(Collections.singletonList(new Scope(DRIVE_APPDATA)))
                .build();
        Identity.getAuthorizationClient(getActivity())
                .authorize(request)
                .addOnSuccessListener(result -> {
                    if (result.hasResolution()) {
                        Log.d(TAG, "authorize: needs consent (interactive=" + interactive + ")");
                        if (!interactive) {
                            call.reject("needs-consent");
                            return;
                        }
                        try {
                            bridge.saveCall(call);
                            pendingCallId = call.getCallbackId();
                            IntentSenderRequest req = new IntentSenderRequest.Builder(
                                    result.getPendingIntent().getIntentSender()).build();
                            consentLauncher.launch(req);
                        } catch (Exception e) {
                            Log.e(TAG, "consent launch failed", e);
                            call.reject("consent-launch-failed: " + e.getMessage());
                        }
                    } else {
                        Log.d(TAG, "authorize: silent token");
                        resolveToken(call, result);
                    }
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "authorize failed", e);
                    call.reject("authorize-failed: " + e.getMessage());
                });
    }

    private void onConsentResult(ActivityResult activityResult) {
        Log.d(TAG, "consent result code=" + activityResult.getResultCode());
        PluginCall call = pendingCallId != null ? bridge.getSavedCall(pendingCallId) : null;
        pendingCallId = null;
        if (call == null) {
            Log.w(TAG, "consent result but no saved call");
            return;
        }
        try {
            AuthorizationResult result = Identity.getAuthorizationClient(getActivity())
                    .getAuthorizationResultFromIntent(activityResult.getData());
            resolveToken(call, result);
        } catch (Exception e) {
            Log.e(TAG, "consent result parse failed", e);
            call.reject("consent-result-failed: " + e.getMessage());
        } finally {
            bridge.releaseCall(call);
        }
    }

    private void resolveToken(PluginCall call, AuthorizationResult result) {
        String token = result.getAccessToken();
        Log.d(TAG, "resolveToken: " + (token != null ? "len=" + token.length() : "null"));
        if (token == null) {
            call.reject("no-access-token");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("accessToken", token);
        call.resolve(ret);
    }
}
