import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_BASE_URL, INSPECTOR_WEB_URL } from "../config/api";
import { INSPECTOR_BRIDGE, INSPECTOR_SESSION_SCRIPT, INSPECTOR_LOGOUT_SCRIPT, inspectorEntryState, isInspectorUrl, safeDownloadName } from "../services/inspectorBridge";
import InspectorWelcome from "./InspectorWelcome";
import { inspectorProfileScript, isInspectorHome, INSPECTOR_BRANDING_SCRIPT } from "../services/inspectorBridge";
import InspectorHome from "./InspectorHome";
import { profilePhotoScript } from "../services/profilePhoto";
import { useInspectorProfile } from "../storage/InspectorProfileContext";

const PROFILE_SCRIPT = inspectorProfileScript(API_BASE_URL);

export default function InspectorScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { profileState, setProfileState, profileRequest, refreshProfile, setInspectorSession, photoRequest, finishPhoto } = useInspectorProfile();
  const [webSession, setWebSession] = useState(null);
  const webView = useRef(null);
  const canGoBack = useRef(false);
  const currentUrl = useRef(INSPECTOR_WEB_URL);
  const sharing = useRef(false);
  const logoutPending = useRef(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [instance, setInstance] = useState(0);
  const [entry, setEntry] = useState("welcome");
  const [openingModule, setOpeningModule] = useState(null);
  const reportIncident = () => navigation.navigate("Incident", { screen: "HomeScreen" });
  const showHome = entry === "quality" && isInspectorHome(webSession) && !error && !openingModule;
  const hideWeb = entry === "welcome" || showHome;
  const openModule = (path) => {
    // Cover the old web dashboard before revealing the WebView for navigation.
    setOpeningModule(path);
    setWebSession((previous) => ({ ...previous, path }));
    webView.current?.injectJavaScript(`window.location.assign(${JSON.stringify(path)}); true;`);
  };

  const returnHome = useCallback(() => {
    setOpeningModule(null);
    if (entry === "login") {
      setEntry("welcome");
      return;
    }
    setError("");
    if (error) {
      canGoBack.current = false;
      setInstance((value) => value + 1);
    } else {
      webView.current?.injectJavaScript(`window.location.replace(${JSON.stringify(INSPECTOR_WEB_URL)}); true;`);
    }
  }, [entry, error]);

  const goBack = useCallback(() => {
    setOpeningModule(null);
    if (entry === "login") setEntry("welcome");
    else if (!error && canGoBack.current) webView.current?.goBack();
    else returnHome();
  }, [entry, error, returnHome]);

  useEffect(() => {
    if (sessionReady && !logoutPending.current) webView.current?.injectJavaScript(PROFILE_SCRIPT);
  }, [profileRequest, sessionReady]);

  useEffect(() => {
    if (photoRequest && sessionReady && !logoutPending.current) {
      webView.current?.injectJavaScript(profilePhotoScript(API_BASE_URL, photoRequest));
    }
  }, [photoRequest, sessionReady]);

  useEffect(() => {
    let active = true;
    logoutPending.current = true;
    AsyncStorage.getItem("inspectorLogoutPending").then((pending) => {
      if (!active) return;
      logoutPending.current = pending === "true";
      if (logoutPending.current) {
        setInspectorSession(null);
        setProfileState({ status: "signed-out" });
        setEntry("welcome");
        webView.current?.injectJavaScript(INSPECTOR_LOGOUT_SCRIPT);
      }
      setSessionReady(true);
    }).catch(() => {
      if (active) setError("Unable to check your session. Please reopen the app.");
    });
    return () => { active = false; };
  }, [route?.params?.logoutRequest, setProfileState, setInspectorSession]);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (entry === "welcome") return false;
      if (showHome) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [entry, showHome, goBack]));

  const retry = () => {
    setOpeningModule(null);
    setError("");
    setLoading(true);
    canGoBack.current = false;
    setInstance((value) => value + 1);
  };

  const openExternal = async (url) => {
    if (!/^(https?:|mailto:|tel:)/i.test(url)) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open link", "Please try again.");
    }
  };

  const saveDownload = async (message) => {
    if (sharing.current) return;
    sharing.current = true;
    setSaving(true);
    let directory;
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing is unavailable on this device.");
      directory = `${FileSystem.cacheDirectory}inspector-${Date.now()}/`;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const uri = directory + safeDownloadName(message.name);
      if (message.type === "download-data") {
        if (typeof message.data !== "string") throw new Error("Invalid export file.");
        const match = /^data:[^,]*;base64,([A-Za-z0-9+/=\r\n]*)$/.exec(message.data);
        if (!match) throw new Error("Invalid export file.");
        await FileSystem.writeAsStringAsync(uri, match[1], { encoding: FileSystem.EncodingType.Base64 });
      } else {
        if (!/^https?:\/\//i.test(message.url)) throw new Error("Unsupported download link.");
        const result = await FileSystem.downloadAsync(message.url, uri);
        if (result.status !== 200) throw new Error("The file could not be downloaded.");
      }
      await Sharing.shareAsync(uri, {
        dialogTitle: "Save inspection file",
        ...(message.mimeType ? { mimeType: message.mimeType } : {}),
      });
    } catch (failure) {
      Alert.alert("Download failed", failure.message || "Please try again.");
    } finally {
      if (directory) await FileSystem.deleteAsync(directory, { idempotent: true }).catch(() => {});
      sharing.current = false;
      setSaving(false);
    }
  };

  const onMessage = ({ nativeEvent }) => {
    if (!isInspectorUrl(nativeEvent.url, INSPECTOR_WEB_URL)) return;
    let message;
    try { message = JSON.parse(nativeEvent.data); } catch { return; }
    if (!message || typeof message !== "object") return;
    if (message.type === "inspector-photo" && !logoutPending.current) finishPhoto(message);
    if (message.type === "inspector-logout") {
      setOpeningModule(null);
      setInspectorSession(null);
      setWebSession(null);
      setProfileState({ status: "signed-out" });
      logoutPending.current = false;
      setEntry("welcome");
      canGoBack.current = false;
      webView.current?.clearHistory();
      void AsyncStorage.removeItem("inspectorLogoutPending").catch(() => {});
    }
    if (message.type === "inspector-session") {
      if (logoutPending.current) return;
      setInspectorSession(message.signedIn ? { signedIn: true, username: message.username, role: message.role } : null);
      setEntry((current) => inspectorEntryState(current, message.signedIn));
      setWebSession({ signedIn: message.signedIn, role: message.role, username: message.username, path: message.path });
      if (message.signedIn) {
        if (!webSession?.signedIn || webSession.username !== message.username) webView.current?.injectJavaScript(PROFILE_SCRIPT);
      } else setProfileState({ status: "signed-out" });
    }
    if (message.type === "inspector-profile" && !logoutPending.current) {
      const state = message.state;
      if (state && ["signed-out", "loading", "ready", "error"].includes(state.status)) setProfileState(state);
    }
    if (message.type === "download-data" || message.type === "download-url") void saveDownload(message);
    if (message.type === "download-error") Alert.alert("Download failed", "Please try exporting the file again.");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {!hideWeb && (
        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={({ pressed }) => [styles.navigationButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={22} color="#276c65" />
            <Text style={styles.navigationLabel}>Back</Text>
          </Pressable>
          {entry === "login" ? <Text style={styles.toolbarTitle}>Inspector Login</Text> : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle navigation menu"
              accessibilityState={{ disabled: loading || Boolean(error) || Boolean(openingModule) }}
              disabled={loading || Boolean(error) || Boolean(openingModule)}
              onPress={() => webView.current?.injectJavaScript("document.querySelector('.custom-navbar .hamburger-btn')?.click(); true;")}
              style={({ pressed }) => [styles.navigationButton, pressed && styles.pressed]}
            >
              <Ionicons name="menu-outline" size={23} color="#276c65" />
            </Pressable>
          )}
        </View>
      )}
      <View style={styles.container} accessibilityElementsHidden={hideWeb} importantForAccessibility={hideWeb ? "no-hide-descendants" : "auto"}>
      {sessionReady && <WebView
        key={instance}
        ref={webView}
        source={{ uri: INSPECTOR_WEB_URL }}
        style={[styles.container, openingModule && styles.hiddenWeb]}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled={false}
        allowsBackForwardNavigationGestures
        // No reload on tab focus: keep the current form, login and field values.
        injectedJavaScriptBeforeContentLoaded={INSPECTOR_BRIDGE + INSPECTOR_BRANDING_SCRIPT}
        injectedJavaScript={INSPECTOR_BRIDGE + INSPECTOR_BRANDING_SCRIPT + INSPECTOR_SESSION_SCRIPT}
        onMessage={onMessage}
        onNavigationStateChange={(state) => {
          canGoBack.current = state.canGoBack;
          currentUrl.current = state.url;
        }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={({ nativeEvent }) => {
          setLoading(false);
          if (openingModule && isInspectorUrl(nativeEvent.url, INSPECTOR_WEB_URL)) {
            const loadedPath = new URL(nativeEvent.url).pathname.replace(/\/+$/, "");
            if ([openingModule.replace(/\/+$/, ""), "/login", "/change-password"].includes(loadedPath)) {
              setOpeningModule(null);
            }
          }
          if (logoutPending.current && isInspectorUrl(currentUrl.current, INSPECTOR_WEB_URL)) {
            webView.current?.injectJavaScript(INSPECTOR_LOGOUT_SCRIPT);
          }
        }}
        onError={() => { setLoading(false); setError("Unable to connect to Quality. Check your connection and try again."); }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.url?.split("#")[0] === currentUrl.current.split("#")[0]) {
            setLoading(false);
            setError("The Quality portal is temporarily unavailable. Please try again.");
          }
        }}
        onShouldStartLoadWithRequest={(request) => {
          if (isInspectorUrl(request.url, INSPECTOR_WEB_URL) || request.url === "about:blank") return true;
          void openExternal(request.url);
          return false;
        }}
        onOpenWindow={({ nativeEvent }) => {
          if (isInspectorUrl(nativeEvent.targetUrl, INSPECTOR_WEB_URL)) {
            webView.current?.injectJavaScript(`window.location.href = ${JSON.stringify(nativeEvent.targetUrl)}; true;`);
          } else void openExternal(nativeEvent.targetUrl);
        }}
        onFileDownload={({ nativeEvent }) => void saveDownload({
          type: "download-url", url: nativeEvent.downloadUrl,
          name: nativeEvent.downloadUrl.split("/").pop()?.split("?")[0],
        })}
        onContentProcessDidTerminate={() => setError("Quality was closed by your device. Reopen it to continue from your last saved work.")}
        onRenderProcessGone={() => setError("Quality was closed by your device. Reopen it to continue from your last saved work.")}
      />}
      {!!openingModule && !error && (
        <View style={styles.moduleLoading} accessibilityRole="progressbar" accessibilityLabel="Opening form">
          <ActivityIndicator color="#1f6f5f" />
          <Text>Opening form…</Text>
        </View>
      )}
      {(loading || saving) && !error && !openingModule && (
        <View style={styles.progress} pointerEvents="none">
          <ActivityIndicator color="#1f6f5f" />
          <Text>{saving ? "Preparing inspection file…" : "Loading Quality…"}</Text>
        </View>
      )}
      {!!error && (
        <View style={styles.error}>
          <Text style={styles.title}>Quality</Text>
          <Text style={styles.message}>{error}</Text>
          <Pressable style={styles.button} onPress={retry} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      )}
      </View>
      {showHome && (
        <View style={[StyleSheet.absoluteFillObject, { top: insets.top, left: insets.left, right: insets.right }]}>
          <InspectorHome
            refreshing={profileState.status === "loading"}
            onRefresh={refreshProfile}
            name={profileState.data?.name || webSession?.username}
            onOpenModule={openModule}
            onProfile={() => navigation.navigate("MyProfile")}
          />
        </View>
      )}
      {entry === "welcome" && (
        <View style={[StyleSheet.absoluteFillObject, { top: insets.top, left: insets.left, right: insets.right }]}>
          <InspectorWelcome
            onLogin={() => setEntry("login")}
            onReportIncident={reportIncident}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  hiddenWeb: { opacity: 0 },
  moduleLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#f4f6f8", alignItems: "center", justifyContent: "center", gap: 12 },
  toolbar: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 4, gap: 8, backgroundColor: "#fffdf8", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e3eae5" },
  toolbarTitle: { fontSize: 17, fontWeight: "700", color: "#20364a", flexShrink: 1 },
  navigationButton: { minHeight: 44, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 12, backgroundColor: "#e8f4ef" },
  navigationLabel: { fontSize: 15, fontWeight: "700", color: "#276c65" },
  pressed: { opacity: 0.65 },
  progress: { position: "absolute", top: 8, alignSelf: "center", flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: "#ffffff", elevation: 3 },
  error: { ...StyleSheet.absoluteFillObject, backgroundColor: "#f4f6f8", alignItems: "center", justifyContent: "center", padding: 28, gap: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#20364a" },
  message: { textAlign: "center", fontSize: 16, color: "#475569" },
  button: { backgroundColor: "#1f6f5f", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
