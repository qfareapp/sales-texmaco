import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function InspectorWelcome({ onLogin, onReportIncident }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <Image source={require("../../assets/texmaco-logo.png")} style={styles.logo} resizeMode="contain" />
        <View style={styles.brandBadge}><Text style={styles.brandText}>texView</Text></View>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>INSPECT. RECORD. STAY SAFE.</Text>
        <Text style={styles.heroTitle}>Good work starts{"\n"}with a good check.</Text>
        <Text style={styles.heroDescription}>Your inspections, saved forms and safety reporting. Together in one place.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Welcome, Inspector</Text>
        <Text style={styles.description}>Sign in with your existing account to start an inspection or continue saved work.</Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.login, pressed && styles.pressed]} onPress={onLogin}>
          <Text style={styles.loginText}>Inspector Login</Text>
          <Ionicons name="arrow-forward" size={21} color="#fff" />
        </Pressable>
        <Text style={styles.or}>or</Text>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.report, pressed && styles.pressed]} onPress={onReportIncident}>
          <Ionicons name="alert-circle-outline" size={21} color="#966026" />
          <Text style={styles.reportText}>Report an Incident</Text>
        </Pressable>
        <Text style={styles.note}>You can report an incident without an inspector login.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: "center", padding: 20, paddingBottom: 32, backgroundColor: "#f4f7f5" },
  brandRow: { width: "100%", maxWidth: 560, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 26 },
  logo: { width: 126, height: 42 },
  brandBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandText: { fontSize: 13, fontWeight: "700", color: "#527568" },
  hero: { width: "100%", maxWidth: 560, backgroundColor: "#173e36", borderRadius: 26, padding: 25, marginBottom: 18 },
  heroEyebrow: { fontSize: 9, letterSpacing: 1.4, fontWeight: "800", color: "#b1e5d1", marginBottom: 13 },
  heroTitle: { fontSize: 31, lineHeight: 38, letterSpacing: -0.7, fontWeight: "800", color: "#fff" },
  heroDescription: { fontSize: 14, lineHeight: 23, color: "#c0d5cc", marginTop: 14 },
  card: { width: "100%", maxWidth: 560, padding: 22, backgroundColor: "#fff", borderRadius: 22, borderWidth: 1, borderColor: "#e3eae5" },
  title: { fontSize: 23, fontWeight: "800", color: "#243c32" },
  description: { fontSize: 14, lineHeight: 23, color: "#6c7b75", marginTop: 9, marginBottom: 22 },
  login: { width: "100%", flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center", backgroundColor: "#276c65", padding: 17, borderRadius: 14 },
  loginText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  or: { color: "#7c8692", textAlign: "center", marginVertical: 12 },
  report: { width: "100%", flexDirection: "row", gap: 9, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#eddcbc", backgroundColor: "#fff8ea", padding: 16, borderRadius: 14 },
  reportText: { fontSize: 15, fontWeight: "700", color: "#966026", flexShrink: 1 },
  note: { textAlign: "center", fontSize: 13, lineHeight: 20, color: "#64748b", marginTop: 16 },
  pressed: { opacity: 0.72 },
});
