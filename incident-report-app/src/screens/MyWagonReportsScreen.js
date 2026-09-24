import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { INSPECTOR_WEB_URL } from "../config/api";
import { useInspectorProfile } from "../storage/InspectorProfileContext";
import { HISTORY_PULL_REFRESH_SCRIPT } from "../services/historyPullRefresh";
import { isInspectorUrl } from "../services/inspectorBridge";

const HISTORY_URL = new URL("/quality/wagon-data-sheet/my-submissions", INSPECTOR_WEB_URL).toString();
const HISTORY_STYLE = `
(function () {
  if (document.getElementById('tex-history-layout')) return;
  var style = document.createElement('style');
  style.id = 'tex-history-layout';
  style.textContent = '.custom-navbar, .sidebar { display: none !important; } .main-content { margin: 0 !important; padding: 8px !important; }';
  (document.head || document.documentElement).appendChild(style);
})(); true;`;

export default function MyWagonReportsScreen({ navigation }) {
  const { inspectorSession } = useInspectorProfile();
  const [instance, setInstance] = useState(0);
  const [error, setError] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const allowed = inspectorSession?.signedIn && inspectorSession.role === "ground-inspector";
  const refresh = useCallback(() => {
    setError("");
    setRequiresLogin(false);
    setInstance((value) => value + 1);
  }, []);
  useFocusEffect(refresh);

  return (
    <View style={styles.screen}>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("SubmittedIncidents")} style={({ pressed }) => [styles.incidents, pressed && styles.pressed]}>
          <Ionicons name="document-text-outline" size={21} color="#9a3412" />
          <Text style={styles.incidentText}>Submitted Incidents</Text>
          <Ionicons name="chevron-forward" size={18} color="#9a3412" />
        </Pressable>
        {allowed && <Pressable accessibilityRole="button" accessibilityLabel="Refresh filled wagon forms" onPress={refresh} style={styles.refresh}><Ionicons name="refresh-outline" size={22} color="#276c65" /></Pressable>}
      </View>
      {!allowed || requiresLogin ? (
        <View style={styles.message}>
          <Ionicons name="documents-outline" size={42} color="#276c65" />
          <Text style={styles.title}>My Filled Wagon Forms</Text>
          <Text style={styles.description}>Sign in with your inspector account to view your submitted wagon forms.</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate("Home")} style={styles.signIn}><Text style={styles.signInText}>Go to Inspector Login</Text></Pressable>
        </View>
      ) : (
        <View style={styles.webContainer}>
          <WebView
            key={`${inspectorSession.username}:${instance}`}
            source={{ uri: HISTORY_URL }}
            style={styles.screen}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled={false}
            pullToRefreshEnabled={Platform.OS === "ios"}
            injectedJavaScriptBeforeContentLoaded={HISTORY_STYLE}
            injectedJavaScript={HISTORY_STYLE + (Platform.OS === "android" ? HISTORY_PULL_REFRESH_SCRIPT : "")}
            onMessage={({ nativeEvent }) => {
              if (!isInspectorUrl(nativeEvent.url, INSPECTOR_WEB_URL)) return;
              try {
                if (JSON.parse(nativeEvent.data).type === "history-pull-refresh") refresh();
              } catch { /* Ignore unrelated web messages. */ }
            }}
            startInLoadingState
            renderLoading={() => <View style={styles.loading}><ActivityIndicator color="#276c65" /><Text>Loading filled wagon forms...</Text></View>}
            onNavigationStateChange={({ url }) => {
              try {
                const path = new URL(url).pathname;
                if (path === "/login" || path === "/change-password") setRequiresLogin(true);
              } catch { /* Ignore intermediate browser URLs. */ }
            }}
            onShouldStartLoadWithRequest={({ url }) => url === HISTORY_URL || url.startsWith(HISTORY_URL + "?") || url === "about:blank" || url === new URL("/login", INSPECTOR_WEB_URL).toString() || url === new URL("/change-password", INSPECTOR_WEB_URL).toString()}
            onError={() => setError("Unable to load wagon forms. Check your connection and try again.")}
            onHttpError={({ nativeEvent }) => { if (nativeEvent.url === HISTORY_URL) setError("Wagon forms are temporarily unavailable. Please try again."); }}
            onContentProcessDidTerminate={() => setError("Reopen your wagon forms to continue.")}
            onRenderProcessGone={() => setError("Reopen your wagon forms to continue.")}
          />
          {!!error && <View style={[styles.message, StyleSheet.absoluteFillObject]}><Text style={styles.description}>{error}</Text><Pressable accessibilityRole="button" style={styles.signIn} onPress={refresh}><Text style={styles.signInText}>Try again</Text></Pressable></View>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7f5" },
  webContainer: { flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  incidents: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 15, borderRadius: 14, backgroundColor: "#fff0cf", borderWidth: 1, borderColor: "#efb958" },
  incidentText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#9a3412" },
  refresh: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  message: { flex: 1, backgroundColor: "#f4f7f5", alignItems: "center", justifyContent: "center", padding: 28, gap: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#243c32", textAlign: "center" },
  description: { fontSize: 15, lineHeight: 23, color: "#64748b", textAlign: "center" },
  signIn: { backgroundColor: "#276c65", borderRadius: 12, padding: 15 },
  signInText: { color: "#fff", fontWeight: "700" },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#f4f7f5", alignItems: "center", justifyContent: "center", gap: 12 },
  pressed: { opacity: 0.7 },
});
