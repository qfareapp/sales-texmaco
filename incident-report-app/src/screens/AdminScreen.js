import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllIncidentReports } from "../services/incidents";

const HIGH_SEVERITY_TYPES = new Set([
  "Major",
  "Fire Incident",
  "Dangerous Occurrence",
  "Property Damage",
]);

const TYPE_ICONS = {
  "Unsafe Condition": "construct-outline",
  "Unsafe Act": "hand-left-outline",
  "Near Miss": "eye-outline",
  "Fire Incident": "flame-outline",
  "First Aid": "medkit-outline",
  Minor: "bandage-outline",
  Major: "alert-circle-outline",
  Illness: "thermometer-outline",
  "Property Damage": "business-outline",
  "Dangerous Occurrence": "nuclear-outline",
  "Environment Issue": "leaf-outline",
};

const CATEGORY_COLOR = {
  "Learning Event": "#1f6f5f",
  Incident: "#b77932",
};
const CATEGORY_BG = {
  "Learning Event": "#e8f5f2",
  Incident: "#fdf0e4",
};
const CATEGORY_ICON = {
  "Learning Event": "book-outline",
  Incident: "warning-outline",
};

function getDisplayDate(report) {
  if (report.incidentDate) {
    const d = new Date(report.incidentDate);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return new Date(report.createdAt).toLocaleDateString();
}

export default function AdminScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const all = await getAllIncidentReports();
      setReports(all);
      setError("");
    } catch (e) {
      setError(e.message || "Unable to load reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: reports.length,
      highSeverity: reports.filter((r) => HIGH_SEVERITY_TYPES.has(r.reportType)).length,
      today: reports.filter((r) => new Date(r.createdAt) >= today).length,
      learning: reports.filter((r) => r.reportCategory === "Learning Event").length,
      incidents: reports.filter((r) => r.reportCategory === "Incident").length,
    };
  }, [reports]);

  const latest10 = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
    [reports]
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1f6f5f" />
        <Text style={styles.loadingText}>Loading reports…</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1f6f5f" />
        }
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="lock-closed" size={12} color="#7ee8d4" />
            <Text style={styles.heroBadgeText}>Admin Access</Text>
          </View>
          <Text style={styles.heroTitle}>Control Panel</Text>
          <Text style={styles.heroBody}>
            Review and monitor all submitted safety reports across the factory floor.
          </Text>

          {/* inline stat chips */}
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={styles.heroChipNum}>{stats.total}</Text>
              <Text style={styles.heroChipLabel}>Total</Text>
            </View>
            <View style={styles.heroChipDivider} />
            <View style={styles.heroChip}>
              <Text style={styles.heroChipNum}>{stats.today}</Text>
              <Text style={styles.heroChipLabel}>Today</Text>
            </View>
            <View style={styles.heroChipDivider} />
            <View style={styles.heroChip}>
              <Text style={[styles.heroChipNum, stats.highSeverity > 0 && styles.heroChipNumRed]}>
                {stats.highSeverity}
              </Text>
              <Text style={styles.heroChipLabel}>High Severity</Text>
            </View>
          </View>
        </View>

        {/* ── Quick-stat cards ── */}
        <View style={styles.statRow}>
          <StatCard
            icon="book-outline"
            label="Learning Events"
            value={stats.learning}
            color="#1f6f5f"
            bg="#e8f5f2"
          />
          <StatCard
            icon="warning-outline"
            label="Incidents"
            value={stats.incidents}
            color="#b77932"
            bg="#fdf0e4"
          />
          <StatCard
            icon="flame-outline"
            label="High Severity"
            value={stats.highSeverity}
            color="#a24343"
            bg="#fdf0f0"
          />
        </View>

        {/* ── Error ── */}
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#a24343" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Latest 10 reports ── */}
        <View style={styles.feedSection}>
          <View style={styles.feedHeader}>
            <View>
              <Text style={styles.feedTitle}>Latest Reports</Text>
              <Text style={styles.feedSubtitle}>Most recent 10 submissions</Text>
            </View>
            <View style={styles.feedBadge}>
              <Text style={styles.feedBadgeText}>{latest10.length}</Text>
            </View>
          </View>

          {latest10.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={36} color="#c5b89a" />
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptyBody}>Submitted reports will appear here.</Text>
            </View>
          ) : (
            <View style={styles.feedList}>
              {latest10.map((report, index) => (
                <ReportCard
                  key={report._id}
                  report={report}
                  index={index}
                  onPress={() => setSelectedReport(report)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Detail modal ── */}
      <Modal
        visible={Boolean(selectedReport)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setSelectedReport(null)} />
          <View style={styles.modalCard}>
            {selectedReport ? (
              <ReportDetailSheet
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ─────────────────────────────────────────
   Report Card
───────────────────────────────────────── */
function ReportCard({ report, index, onPress }) {
  const isHigh = HIGH_SEVERITY_TYPES.has(report.reportType);
  const accentColor = CATEGORY_COLOR[report.reportCategory] ?? "#1f6f5f";
  const accentBg = CATEGORY_BG[report.reportCategory] ?? "#e8f5f2";
  const catIcon = CATEGORY_ICON[report.reportCategory] ?? "document-outline";
  const typeIcon = TYPE_ICONS[report.reportType] ?? "ellipse-outline";
  const displayDate = getDisplayDate(report);

  return (
    <Pressable
      style={({ pressed }) => [styles.reportCard, pressed && styles.reportCardPressed]}
      onPress={onPress}
    >
      {/* Index badge */}
      <View style={styles.reportIndex}>
        <Text style={styles.reportIndexText}>{index + 1}</Text>
      </View>

      {/* Left accent bar */}
      <View style={[styles.reportAccent, { backgroundColor: isHigh ? "#a24343" : accentColor }]} />

      <View style={styles.reportBody}>
        {/* Top row: ref + badges */}
        <View style={styles.reportTopRow}>
          <Text style={[styles.reportRef, { color: accentColor }]}>{report.referenceNo}</Text>
          <View style={styles.reportBadges}>
            {isHigh && (
              <View style={styles.severityBadge}>
                <Ionicons name="flame" size={10} color="#fff" />
                <Text style={styles.severityBadgeText}>High</Text>
              </View>
            )}
            <View style={[styles.catBadge, { backgroundColor: accentBg }]}>
              <Ionicons name={catIcon} size={10} color={accentColor} />
              <Text style={[styles.catBadgeText, { color: accentColor }]}>
                {report.reportCategory}
              </Text>
            </View>
          </View>
        </View>

        {/* Type */}
        <View style={styles.reportTypeRow}>
          <View style={[styles.typeChip, { backgroundColor: accentBg }]}>
            <Ionicons name={typeIcon} size={15} color={accentColor} />
          </View>
          <Text style={styles.reportType} numberOfLines={1}>{report.reportType}</Text>
        </View>

        {/* Meta grid */}
        <View style={styles.metaGrid}>
          <MetaItem icon="person-outline" text={report.reportedBy?.name || "Unknown"} />
          <MetaItem icon="location-outline" text={report.location || "—"} />
          <MetaItem icon="business-outline" text={report.reportedBy?.department || "—"} />
          <MetaItem icon="calendar-outline" text={`${displayDate}${report.incidentTime ? "  " + report.incidentTime : ""}`} />
        </View>

        {/* Footer */}
        <View style={styles.reportFooter}>
          <View style={styles.statusChip}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{report.currentStatus || "Submitted"}</Text>
          </View>
          <View style={styles.viewCta}>
            <Text style={[styles.viewCtaText, { color: accentColor }]}>View details</Text>
            <Ionicons name="chevron-forward" size={13} color={accentColor} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MetaItem({ icon, text }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color="#8a9098" />
      <Text style={styles.metaText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────
   Stat Card
───────────────────────────────────────── */
function StatCard({ icon, label, value, color, bg }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────
   Report Detail Sheet
───────────────────────────────────────── */
function ReportDetailSheet({ report, onClose }) {
  const isHigh = HIGH_SEVERITY_TYPES.has(report.reportType);
  const accentColor = CATEGORY_COLOR[report.reportCategory] ?? "#1f6f5f";
  const accentBg = CATEGORY_BG[report.reportCategory] ?? "#e8f5f2";
  const catIcon = CATEGORY_ICON[report.reportCategory] ?? "document-outline";
  const typeIcon = TYPE_ICONS[report.reportType] ?? "ellipse-outline";
  const victims = Array.isArray(report.victims) && report.victims.length
    ? report.victims
    : (report.victimName || report.victimDepartment)
      ? [{ name: report.victimName, department: report.victimDepartment }]
      : [];

  return (
    <>
      <View style={styles.dragHandle} />

      {/* Header */}
      <View style={styles.sheetHeader}>
        <View style={[styles.sheetIconWrap, { backgroundColor: accentBg }]}>
          <Ionicons name={typeIcon} size={22} color={accentColor} />
        </View>
        <View style={styles.sheetHeaderText}>
          <Text style={styles.sheetRef}>{report.referenceNo || report._id}</Text>
          <Text style={styles.sheetTitle} numberOfLines={2}>{report.reportType}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color="#5a6472" />
        </Pressable>
      </View>

      {/* Chips */}
      <View style={styles.sheetChips}>
        <View style={[styles.sheetChip, { backgroundColor: accentBg }]}>
          <Ionicons name={catIcon} size={12} color={accentColor} />
          <Text style={[styles.sheetChipText, { color: accentColor }]}>{report.reportCategory}</Text>
        </View>
        {isHigh && (
          <View style={[styles.sheetChip, { backgroundColor: "#a24343" }]}>
            <Ionicons name="flame" size={12} color="#fff" />
            <Text style={[styles.sheetChipText, { color: "#fff" }]}>High Severity</Text>
          </View>
        )}
        <View style={[styles.sheetChip, { backgroundColor: "#e8f5f2" }]}>
          <View style={styles.statusDot} />
          <Text style={[styles.sheetChipText, { color: "#1f6f5f" }]}>
            {report.currentStatus || "Submitted"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
        <DetailSection icon="person-circle-outline" title="Reporter">
          <DetailRow label="Name" value={report.reportedBy?.name} />
          <DetailRow label="Emp ID" value={report.reportedBy?.empId} />
          <DetailRow label="Type" value={report.reportedBy?.departmentContractor} />
          <DetailRow label="Department" value={report.reportedBy?.department} last />
        </DetailSection>

        <DetailSection icon="warning-outline" title="Incident">
          <DetailRow label="Location" value={report.location} />
          <DetailRow
            label="Date"
            value={report.incidentDate ? new Date(report.incidentDate).toLocaleDateString() : null}
          />
          <DetailRow label="Time" value={report.incidentTime} last />
        </DetailSection>

        {victims.length ? (
          <DetailSection icon="person-outline" title="Victim">
            {victims.map((victim, index) => (
              <DetailRow
                key={`victim-${index}`}
                label={`Victim ${index + 1}`}
                value={`${victim.name}${victim.department ? ` (${victim.department})` : ""}`}
                last={index === victims.length - 1}
              />
            ))}
          </DetailSection>
        ) : null}

        {(report.observation || report.responsibleDepartment) ? (
          <DetailSection icon="book-outline" title="Learning Event">
            <DetailRow label="Observation" value={report.observation} />
            <DetailRow label="Responsible Dept" value={report.responsibleDepartment} last />
          </DetailSection>
        ) : null}

        {report.description ? (
          <DetailSection icon="document-text-outline" title="Description">
            <DetailRow label="Details" value={report.description} last />
          </DetailSection>
        ) : null}

        <DetailSection icon="checkmark-circle-outline" title="Submission">
          <DetailRow label="Attachments" value={String(report.attachmentCount || 0)} />
          <DetailRow label="Submitted On" value={new Date(report.createdAt).toLocaleString()} last />
        </DetailSection>
      </ScrollView>
    </>
  );
}

function DetailSection({ icon, title, children }) {
  return (
    <View style={styles.detailSection}>
      <View style={styles.detailSectionHeader}>
        <View style={styles.detailSectionIconWrap}>
          <Ionicons name={icon} size={13} color="#1f6f5f" />
        </View>
        <Text style={styles.detailSectionTitle}>{title}</Text>
      </View>
      <View style={styles.detailSectionBody}>{children}</View>
    </View>
  );
}

function DetailRow({ label, value, last }) {
  if (!value) return null;
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f3ea" },
  content: { padding: 18, gap: 16, paddingBottom: 40 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f3ea", gap: 12 },
  loadingText: { color: "#66707d", fontSize: 14 },

  /* Hero */
  hero: { backgroundColor: "#20364a", borderRadius: 28, padding: 24, gap: 12 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(126,232,212,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  heroBadgeText: { color: "#7ee8d4", fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  heroTitle: { color: "#ffffff", fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  heroBody: { color: "#c4ced8", lineHeight: 21, fontSize: 14 },
  heroChips: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 10, marginTop: 4,
  },
  heroChip: { alignItems: "center", flex: 1 },
  heroChipNum: { color: "#ffffff", fontSize: 22, fontWeight: "800" },
  heroChipNumRed: { color: "#f28b82" },
  heroChipLabel: { color: "#8da7bc", fontSize: 11, marginTop: 2, textAlign: "center" },
  heroChipDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.12)" },

  /* Stat row */
  statRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 18, padding: 14, gap: 6, alignItems: "flex-start" },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  statLabel: { fontSize: 11, color: "#5a6472", fontWeight: "600", lineHeight: 15 },

  /* Error */
  errorCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fdf0f0", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#f5c6c6",
  },
  errorText: { color: "#a24343", fontWeight: "700", flex: 1 },

  /* Feed section */
  feedSection: { backgroundColor: "#fffdf8", borderRadius: 24, padding: 20, gap: 0, borderWidth: 1, borderColor: "#e5dbc7" },
  feedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  feedTitle: { fontSize: 19, fontWeight: "800", color: "#1f2a37" },
  feedSubtitle: { color: "#8a9098", fontSize: 13, marginTop: 2 },
  feedBadge: {
    backgroundColor: "#20364a", borderRadius: 20, minWidth: 32,
    paddingHorizontal: 10, paddingVertical: 5, alignItems: "center",
  },
  feedBadgeText: { color: "#7ee8d4", fontSize: 13, fontWeight: "800" },
  feedList: { gap: 10 },

  /* Report card */
  reportCard: {
    flexDirection: "row", borderRadius: 16, backgroundColor: "#fdfaf4",
    borderWidth: 1, borderColor: "#e8dfc9", overflow: "hidden",
  },
  reportCardPressed: { opacity: 0.8 },
  reportIndex: {
    width: 28, alignItems: "center", justifyContent: "flex-start",
    paddingTop: 14, backgroundColor: "#f4ede0",
  },
  reportIndexText: { fontSize: 11, fontWeight: "800", color: "#9a8060" },
  reportAccent: { width: 3 },
  reportBody: { flex: 1, padding: 13, gap: 7 },

  reportTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  reportRef: { fontSize: 11, fontWeight: "700" },
  reportBadges: { flexDirection: "row", gap: 5, alignItems: "center" },
  severityBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#a24343", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  severityBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  catBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  catBadgeText: { fontSize: 10, fontWeight: "700" },

  reportTypeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeChip: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  reportType: { flex: 1, fontSize: 15, fontWeight: "800", color: "#1f2a37" },

  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, rowGap: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: "45%" },
  metaText: { fontSize: 11, color: "#5a6472", flex: 1 },

  reportFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#e8f5f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1f6f5f" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#1f6f5f" },
  viewCta: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewCtaText: { fontSize: 11, fontWeight: "700" },

  /* Empty state */
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#5a6472" },
  emptyBody: { fontSize: 13, color: "#8a9098", textAlign: "center" },

  /* Modal */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.55)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalCard: {
    maxHeight: "88%", backgroundColor: "#fffdf8",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32,
  },

  /* Detail sheet */
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#d9d2c3", alignSelf: "center", marginBottom: 18,
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  sheetIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sheetHeaderText: { flex: 1, gap: 2 },
  sheetRef: { fontSize: 12, fontWeight: "700", color: "#8a9098" },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: "#1f2a37", lineHeight: 26 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f0e9d8", justifyContent: "center", alignItems: "center",
  },
  closeBtnPressed: { backgroundColor: "#e4d4b5" },
  sheetChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  sheetChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  sheetChipText: { fontSize: 12, fontWeight: "700" },
  sheetScroll: { gap: 12, paddingBottom: 16 },

  detailSection: { backgroundColor: "#f7f3ea", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#ece4d4" },
  detailSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#f0e9d8", borderBottomWidth: 1, borderBottomColor: "#ece4d4",
  },
  detailSectionIconWrap: { width: 24, height: 24, borderRadius: 7, backgroundColor: "#e8f5f2", justifyContent: "center", alignItems: "center" },
  detailSectionTitle: { fontSize: 11, fontWeight: "800", color: "#3d4e5c", textTransform: "uppercase", letterSpacing: 0.5 },
  detailSectionBody: { paddingHorizontal: 14, paddingVertical: 6 },
  detailRow: { paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: "#ece4d4" },
  detailLabel: { fontSize: 11, fontWeight: "700", color: "#8a9098", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  detailValue: { fontSize: 15, color: "#1f2a37", lineHeight: 21 },
});
