import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ROOT = "/quality/wagon-data-sheet";
const forms = [
  { title: "Stage Inspection Dashboard", subtitle: "View stages and continue inspections", icon: "grid-outline", path: "/stage-dashboard", color: "#256b65", background: "#e8f4ef" },
  { title: "CTRB · Wheel Data", subtitle: "Wheel and bearing details", icon: "ellipse-outline", path: "/first-zone", color: "#256b65", background: "#e8f4ef" },
  { title: "DM Line Data", subtitle: "Assembly and line inspection", icon: "git-network-outline", path: "/second-zone", color: "#4667a2", background: "#edf1fb" },
  { title: "DM Final Data", subtitle: "Final wagon details", icon: "checkmark-done-outline", path: "/final-details", color: "#966026", background: "#fcf1de" },
];

function Action({ title, subtitle, icon, color = "#276c65", background = "#e8f4ef", onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: background }]}><Ionicons name={icon} size={23} color={color} /></View>
      <View style={styles.actionCopy}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionSubtitle}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={18} color="#82928e" />
    </Pressable>
  );
}

export default function InspectorHome({ name, onOpenModule, onProfile, refreshing, onRefresh }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.25;
  const displayName = name?.trim() || "Inspector";
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} alwaysBounceVertical refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#276c65" colors={["#276c65"]} />}>
      <View style={styles.brandRow}>
        <View style={styles.brandLockup}>
          <Image source={require("../../assets/texmaco-logo.png")} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandName}>texView</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open My Profile" onPress={onProfile} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Pick up where you left off</Text></View>
      <View style={[styles.shortcuts, compact && styles.shortcutsStack]}>
        {[
          { title: "Drafts", description: "Continue saved work", icon: "create-outline", path: "/drafts" },
          { title: "My Forms", description: "View submissions", icon: "documents-outline", path: "/my-submissions" },
          { title: "Search", description: "Find filled data", icon: "search-outline", path: "/search" },
        ].map((item) => (
          <Pressable key={item.path} accessibilityRole="button" accessibilityLabel={`${item.title}: ${item.description}`} onPress={() => onOpenModule(ROOT + item.path)} style={({ pressed }) => [styles.shortcut, compact && styles.shortcutCompact, pressed && styles.pressed]}>
            <Ionicons name={item.icon} size={24} color="#276c65" />
            <View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>{item.title}</Text><Text style={styles.shortcutDescription}>{item.description}</Text></View>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Wagon data entry</Text><Text style={styles.sectionNote}>SELECT A FORM</Text></View>
      <View style={styles.actionGroup}>
        {forms.map((item) => <Action key={item.path} {...item} onPress={() => onOpenModule(ROOT + item.path)} />)}
      </View>

      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Bogie inspections</Text></View>
      <View style={styles.actionGroup}>
        <Action title="Bogie Inspection" subtitle="Checklist and measurements" icon="construct-outline" color="#4667a2" background="#edf1fb" onPress={() => onOpenModule("/bogie-inspection-form")} />
        <Action title="After-Wheeling Inspection" subtitle="Checks after the bogies are wheeled" icon="cog-outline" color="#966026" background="#fcf1de" onPress={() => onOpenModule("/bogie-after-wheel-inspection")} />
      </View>

      <View style={styles.upcoming}>
        <Text style={styles.upcomingLabel}>COMING SOON</Text>
        <Text style={styles.upcomingText}>Coupler · Draft Gear · Wheel Set</Text>
      </View>
      <View style={styles.tip}><Ionicons name="shield-checkmark-outline" size={18} color="#61766d" /><Text style={styles.tipText}>Spotted a safety concern? Use the Report Incident tab below.</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7f5" },
  content: { padding: 20, paddingBottom: 30, maxWidth: 720, width: "100%", alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  logo: { width: 126, height: 42 },
  brandLockup: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, flex: 1, marginRight: 12 },
  brandName: { color: "#173e36", fontSize: 19, fontWeight: "800", letterSpacing: -0.4 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#e3eee7", borderWidth: 1, borderColor: "#d1dfd5", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 19, fontWeight: "700", color: "#285d4c" },
  sectionHeading: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 27, marginBottom: 13 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#243c32" },
  sectionNote: { fontSize: 9, fontWeight: "700", letterSpacing: 1, color: "#77897e" },
  shortcuts: { flexDirection: "row", gap: 9 },
  shortcutsStack: { flexDirection: "column" },
  shortcut: { flex: 1, padding: 14, paddingVertical: 18, gap: 13, borderRadius: 17, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e3eae5" },
  shortcutCompact: { flexDirection: "row", alignItems: "center" },
  shortcutCopy: { flexShrink: 1 },
  shortcutTitle: { fontSize: 14, fontWeight: "700", color: "#243c32" },
  shortcutDescription: { fontSize: 11, lineHeight: 16, color: "#76847c", marginTop: 5 },
  actionGroup: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e3eae5", borderRadius: 20, overflow: "hidden" },
  action: { flexDirection: "row", alignItems: "center", gap: 13, padding: 16, minHeight: 82, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e9eeeb" },
  actionIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionCopy: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21, color: "#243c32" },
  actionSubtitle: { fontSize: 12, lineHeight: 18, color: "#76847c", marginTop: 3 },
  upcoming: { marginTop: 23, padding: 17, borderRadius: 15, borderWidth: 1, borderStyle: "dashed", borderColor: "#cfdcd4", gap: 7 },
  upcomingLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.3, color: "#74877c" },
  upcomingText: { fontSize: 13, lineHeight: 20, color: "#73847a" },
  tip: { flexDirection: "row", gap: 9, marginTop: 22, paddingHorizontal: 5 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 19, color: "#73847a" },
  pressed: { opacity: 0.72 },
});
