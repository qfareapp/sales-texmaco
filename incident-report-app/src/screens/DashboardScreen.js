import { useCallback, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Image,
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
import AttachmentViewerModal from "../components/AttachmentViewerModal";

/* ── Constants ── */
const HIGH_SEVERITY_TYPES = new Set(["Major", "Fire Incident", "Dangerous Occurrence", "Property Damage"]);

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

const CATEGORY_COLOR = { "Learning Event": "#1f6f5f", Incident: "#b77932" };
const CATEGORY_BG    = { "Learning Event": "#e8f5f2", Incident: "#fdf0e4" };
const CATEGORY_ICON  = { "Learning Event": "book-outline", Incident: "warning-outline" };

const FILTER_OPTIONS = [
  { key: "thisMonth",     label: "This Month" },
  { key: "previousMonth", label: "Prev Month" },
  { key: "custom",        label: "Custom" },
];

const MONTH_OPTIONS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getDisplayDate(report) {
  if (report.incidentDate) {
    const d = new Date(report.incidentDate);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return new Date(report.createdAt).toLocaleDateString();
}

function getFilterRange(filterMode, customMonth, customYear) {
  const now = new Date();
  if (filterMode === "thisMonth") {
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
  if (filterMode === "previousMonth") {
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
  }
  // custom
  return {
    start: new Date(customYear, customMonth, 1),
    end: new Date(customYear, customMonth + 1, 0, 23, 59, 59),
  };
}

/* ══════════════════════════════════════════
   Main screen
══════════════════════════════════════════ */
export default function DashboardScreen() {
  const [reports, setReports]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [visibleCount, setVisibleCount]     = useState(10);
  const [filterMode, setFilterMode]         = useState("thisMonth");
  const [customMonth, setCustomMonth]       = useState(new Date().getMonth());
  const [customYear, setCustomYear]         = useState(new Date().getFullYear());

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else if (!reports.length) setLoading(true);
      const all = await getAllIncidentReports({ forceRefresh: isRefresh });
      setReports(Array.isArray(all) ? all : []);
      setError("");
    } catch (e) {
      setError("Could not load reports. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reports.length]);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  /* Filtered reports */
  const filteredReports = useMemo(() => {
    const { start, end } = getFilterRange(filterMode, customMonth, customYear);
    return reports.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= start && d <= end;
    });
  }, [reports, filterMode, customMonth, customYear]);

  const sortedReports  = useMemo(() => [...filteredReports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [filteredReports]);
  const visibleReports = sortedReports.slice(0, visibleCount);
  const hasMore        = visibleCount < sortedReports.length;
  const remaining      = sortedReports.length - visibleCount;

  /* Custom year options */
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f6f5f" />
        <Text style={styles.loadingText}>Loading reports…</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setVisibleCount(10); load(true); }}
            tintColor="#1f6f5f"
          />
        }
      >
        {/* Filter card */}
        <View style={styles.filterCard}>
          <View style={styles.filterHeader}>
            <View style={styles.filterIconWrap}>
              <Ionicons name="funnel" size={14} color="#1f6f5f" />
            </View>
            <Text style={styles.filterLabel}>Filter Period</Text>
          </View>
          <View style={styles.filterPills}>
            {FILTER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.filterPill, filterMode === opt.key && styles.filterPillActive]}
                onPress={() => { setFilterMode(opt.key); setVisibleCount(10); }}
              >
                <Text style={[styles.filterPillText, filterMode === opt.key && styles.filterPillTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {filterMode === "custom" && (
            <View style={styles.customPicker}>
              <View style={styles.customRow}>
                {MONTH_OPTIONS.map((m, i) => (
                  <Pressable
                    key={m}
                    style={[styles.customChip, customMonth === i && styles.customChipActive]}
                    onPress={() => { setCustomMonth(i); setVisibleCount(10); }}
                  >
                    <Text style={[styles.customChipText, customMonth === i && styles.customChipTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.customRow}>
                {yearOptions.map((y) => (
                  <Pressable
                    key={y}
                    style={[styles.customChip, customYear === y && styles.customChipActive]}
                    onPress={() => { setCustomYear(y); setVisibleCount(10); }}
                  >
                    <Text style={[styles.customChipText, customYear === y && styles.customChipTextActive]}>{y}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#a24343" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Reports count header */}
        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <Ionicons name="document-text" size={16} color="#1f6f5f" />
            <Text style={styles.listHeaderTitle}>All Reports</Text>
          </View>
          <View style={styles.listHeaderBadge}>
            <Text style={styles.listHeaderCount}>{sortedReports.length}</Text>
          </View>
        </View>

        {/* Reports list */}
        {sortedReports.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={32} color="#a0a8b2" />
            </View>
            <Text style={styles.emptyTitle}>No reports this period</Text>
            <Text style={styles.emptyDesc}>Try selecting a different filter period above</Text>
          </View>
        ) : (
          <>
            {visibleReports.map((report, idx) => (
              <ReportCard
                key={report._id}
                report={report}
                index={idx + 1}
                onPress={() => setSelectedReport(report)}
              />
            ))}

            {hasMore && (
              <Pressable
                style={({ pressed }) => [styles.seeMoreBtn, pressed && { opacity: 0.8 }]}
                onPress={() => setVisibleCount((c) => c + 10)}
              >
                <Text style={styles.seeMoreText}>
                  Show {Math.min(remaining, 10)} more
                </Text>
                <View style={styles.seeMoreBadge}>
                  <Text style={styles.seeMoreBadgeText}>+{remaining}</Text>
                </View>
              </Pressable>
            )}

            {!hasMore && sortedReports.length > 0 && (
              <View style={styles.allShownRow}>
                <Ionicons name="checkmark-circle" size={14} color="#1f6f5f" />
                <Text style={styles.allShownText}>All {sortedReports.length} reports shown</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Detail Sheet */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setSelectedReport(null)} />
          <View style={styles.modalCard}>
            {selectedReport && (
              <ReportDetailSheet
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ── Report Card ── */
function ReportCard({ report, index, onPress }) {
  const catColor  = CATEGORY_COLOR[report.reportCategory] || "#8a7f6e";
  const catBg     = CATEGORY_BG[report.reportCategory]    || "#f0e9d8";
  const catIcon   = CATEGORY_ICON[report.reportCategory]  || "alert-circle-outline";
  const typeIcon  = TYPE_ICONS[report.reportType]         || "alert-circle-outline";
  const isHigh    = HIGH_SEVERITY_TYPES.has(report.reportType);

  return (
    <Pressable
      style={({ pressed }) => [styles.reportCard, pressed && { opacity: 0.95 }]}
      onPress={onPress}
    >
      <View style={[styles.reportCardAccent, { backgroundColor: catColor }]} />
      <View style={styles.reportCardInner}>
        {/* Top row */}
        <View style={styles.reportCardTop}>
          <View style={[styles.reportTypeIcon, { backgroundColor: catBg }]}>
            <Ionicons name={typeIcon} size={18} color={catColor} />
          </View>
          <View style={styles.reportCardMeta}>
            <Text style={styles.reportCardType} numberOfLines={1}>{report.reportType}</Text>
            <View style={[styles.reportCatChip, { backgroundColor: catBg }]}>
              <Ionicons name={catIcon} size={10} color={catColor} />
              <Text style={[styles.reportCatChipText, { color: catColor }]}>{report.reportCategory}</Text>
            </View>
          </View>
          <View style={styles.reportCardRight}>
            <Text style={styles.reportCardIndex}>#{index}</Text>
            {isHigh && (
              <View style={styles.highBadge}>
                <Text style={styles.highBadgeText}>HIGH</Text>
              </View>
            )}
          </View>
        </View>

        {/* Meta grid */}
        <View style={styles.reportCardGrid}>
          <MetaItem icon="location-outline" label={report.location || "—"} />
          <MetaItem icon="calendar-outline" label={getDisplayDate(report)} />
          <MetaItem icon="person-outline" label={report.reportedBy?.name || "—"} />
          <MetaItem icon="pricetag-outline" label={report.referenceNo || "—"} color="#1f6f5f" />
        </View>

        {/* Footer */}
        <View style={styles.reportCardFooter}>
          <Text style={styles.reportCardSub} numberOfLines={1}>
            {report.reportedBy?.reporterType || report.reportedBy?.departmentContractor || "—"}
            {report.reportedBy?.department ? ` · ${report.reportedBy.department}` : ""}
          </Text>
          <View style={styles.viewDetailRow}>
            <Text style={styles.viewDetailText}>View details</Text>
            <Ionicons name="chevron-forward" size={13} color="#1f6f5f" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MetaItem({ icon, label, color }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={color || "#69727c"} />
      <Text style={[styles.metaItemText, color && { color, fontWeight: "700" }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/* ── Detail Sheet (same format as AdminScreen) ── */
function ReportDetailSheet({ report, onClose }) {
  const [viewingAttachment, setViewingAttachment] = useState(null);
  const insets      = useSafeAreaInsets();
  const isHigh      = HIGH_SEVERITY_TYPES.has(report.reportType);
  const accentColor = CATEGORY_COLOR[report.reportCategory] ?? "#1f6f5f";
  const accentBg    = CATEGORY_BG[report.reportCategory] ?? "#e8f5f2";
  const catIcon     = CATEGORY_ICON[report.reportCategory] ?? "document-outline";
  const typeIcon    = TYPE_ICONS[report.reportType] ?? "ellipse-outline";
  const victims     = Array.isArray(report.victims) && report.victims.length
    ? report.victims
    : (report.victimName || report.victimDepartment)
      ? [{ name: report.victimName, department: report.victimDepartment }]
      : [];

  return (
    <>
      <View style={styles.dragHandle} />
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
          <Text style={[styles.sheetChipText, { color: "#1f6f5f" }]}>{report.currentStatus || "Submitted"}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <DetailSection icon="person-circle-outline" title="Reporter">
          <DetailRow label="Name"       value={report.reportedBy?.name} />
          <DetailRow label="Emp ID"     value={report.reportedBy?.empId} />
          <DetailRow label="Type"       value={report.reportedBy?.reporterType || report.reportedBy?.departmentContractor} />
          <DetailRow label="Contractor" value={report.reportedBy?.contractorName} />
          <DetailRow label="Mobile"     value={report.reportedBy?.mobileNumber} />
          <DetailRow label="Department" value={report.reportedBy?.department} last />
        </DetailSection>
        <DetailSection icon="warning-outline" title="Incident">
          <DetailRow label="Location" value={report.location} />
          <DetailRow label="Date"     value={report.incidentDate ? new Date(report.incidentDate).toLocaleDateString() : null} />
          <DetailRow label="Time"     value={report.incidentTime} last />
        </DetailSection>
        {victims.length ? (
          <DetailSection icon="person-outline" title="Victims">
            {victims.map((v, i) => (
              <DetailRow
                key={i}
                label={`Victim ${i + 1}`}
                value={`${v.name}${v.department ? ` (${v.department})` : ""}`}
                last={i === victims.length - 1}
              />
            ))}
          </DetailSection>
        ) : null}
        {(report.observation || report.responsibleDepartment) ? (
          <DetailSection icon="book-outline" title="Learning Event">
            <DetailRow label="Observation"      value={report.observation} />
            <DetailRow label="Responsible Dept" value={report.responsibleDepartment} last />
          </DetailSection>
        ) : null}
        {report.description ? (
          <DetailSection icon="document-text-outline" title="Description">
            <DetailRow label="Details" value={report.description} last />
          </DetailSection>
        ) : null}
        {report.attachments?.length > 0 && (
          <DetailSection icon="attach-outline" title={`Attachments (${report.attachments.length})`}>
            <View style={styles.attachmentsGrid}>
              {report.attachments.map((att) =>
                att.mimeType?.startsWith("image/") ? (
                  <Pressable
                    key={att._id}
                    onPress={() => setViewingAttachment(att)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Image source={{ uri: att.url }} style={styles.attThumb} resizeMode="cover" />
                    <View style={styles.attOverlay}>
                      <Ionicons name="expand-outline" size={14} color="#fff" />
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    key={att._id}
                    onPress={() => setViewingAttachment(att)}
                    style={({ pressed }) => [styles.attFileBadge, pressed && { opacity: 0.8 }]}
                  >
                    <Ionicons name="document-text-outline" size={20} color="#7a6b54" />
                    <Text style={styles.attFileName} numberOfLines={2}>{att.originalName}</Text>
                  </Pressable>
                )
              )}
            </View>
          </DetailSection>
        )}
        <AttachmentViewerModal
          attachment={viewingAttachment}
          onClose={() => setViewingAttachment(null)}
        />
        <DetailSection icon="checkmark-circle-outline" title="Submission">
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

/* ══════════════════════════════════════════
   Styles
══════════════════════════════════════════ */
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f7f3ea" },
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: "#f7f3ea" },
  loadingText: { color: "#69727c", fontSize: 14 },

  /* Filter */
  filterCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8dfc9",
    gap: 10,
  },
  filterHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterIconWrap: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: "#e8f5f2", justifyContent: "center", alignItems: "center",
  },
  filterLabel: { fontSize: 13, fontWeight: "700", color: "#1f2a37" },
  filterPills: { flexDirection: "row", gap: 8 },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "#d9d2c3",
    backgroundColor: "#f7f3ea",
  },
  filterPillActive: { backgroundColor: "#1f6f5f", borderColor: "#1f6f5f" },
  filterPillText: { fontSize: 12, fontWeight: "600", color: "#69727c" },
  filterPillTextActive: { color: "#fff" },
  customPicker: { gap: 8, marginTop: 4 },
  customRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  customChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1, borderColor: "#d9d2c3",
    backgroundColor: "#f7f3ea",
  },
  customChipActive: { backgroundColor: "#20364a", borderColor: "#20364a" },
  customChipText: { fontSize: 11, fontWeight: "600", color: "#69727c" },
  customChipTextActive: { color: "#fff" },

  /* Error */
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fdf2f2", borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: "#f3c6c6",
  },
  errorText: { color: "#a24343", fontSize: 13, flex: 1 },

  /* List header */
  listHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 2,
  },
  listHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  listHeaderTitle: { fontSize: 14, fontWeight: "700", color: "#1f2a37" },
  listHeaderBadge: {
    backgroundColor: "#e8f5f2", borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  listHeaderCount: { fontSize: 12, fontWeight: "700", color: "#1f6f5f" },

  /* Empty */
  emptyState: {
    backgroundColor: "#fffdf8", borderRadius: 20,
    padding: 32, alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: "#e8dfc9",
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "#f0e9d8", justifyContent: "center", alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1f2a37" },
  emptyDesc: { fontSize: 13, color: "#69727c", textAlign: "center" },

  /* Report Card */
  reportCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 18, borderWidth: 1, borderColor: "#e8dfc9",
    flexDirection: "row", overflow: "hidden",
  },
  reportCardAccent: { width: 4 },
  reportCardInner: { flex: 1, padding: 14, gap: 10 },
  reportCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  reportTypeIcon: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
  },
  reportCardMeta: { flex: 1, gap: 5 },
  reportCardType: { fontSize: 14, fontWeight: "700", color: "#1f2a37" },
  reportCatChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  reportCatChipText: { fontSize: 10, fontWeight: "700" },
  reportCardRight: { alignItems: "flex-end", gap: 4 },
  reportCardIndex: { fontSize: 12, fontWeight: "700", color: "#a0a8b2" },
  highBadge: {
    backgroundColor: "#fdf2f2", paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: "#f3c6c6",
  },
  highBadgeText: { fontSize: 9, fontWeight: "800", color: "#a24343" },
  reportCardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, width: "47%" },
  metaItemText: { fontSize: 12, color: "#69727c", flex: 1 },
  reportCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, borderTopWidth: 1, borderTopColor: "#f0e9d8" },
  reportCardSub: { fontSize: 12, color: "#8a7f6e", flex: 1 },
  viewDetailRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewDetailText: { fontSize: 12, fontWeight: "700", color: "#1f6f5f" },

  /* See more */
  seeMoreBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 14,
    backgroundColor: "#fffdf8", borderRadius: 16, borderWidth: 1, borderColor: "#e8dfc9",
  },
  seeMoreText: { fontSize: 14, fontWeight: "700", color: "#1f2a37" },
  seeMoreBadge: {
    backgroundColor: "#e8f5f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  seeMoreBadgeText: { fontSize: 12, fontWeight: "700", color: "#1f6f5f" },
  allShownRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  allShownText: { fontSize: 12, color: "#8a7f6e", fontWeight: "600" },

  /* Modal wrapper (same as AdminScreen) */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.6)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalCard: {
    backgroundColor: "#fffdf8", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "88%", overflow: "hidden",
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e8dfc9",
  },

  /* Sheet internals */
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#d9d2c3", alignSelf: "center", marginBottom: 18, marginTop: 12 },
  sheetHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 18, paddingBottom: 14,
  },
  sheetIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sheetHeaderText: { flex: 1, gap: 3 },
  sheetRef: { fontSize: 11, fontWeight: "700", color: "#8a9098", textTransform: "uppercase", letterSpacing: 0.5 },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a37", lineHeight: 23 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: "#f0e9d8", justifyContent: "center", alignItems: "center",
  },
  closeBtnPressed: { opacity: 0.7 },
  sheetChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 18, paddingBottom: 14 },
  sheetChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  sheetChipText: { fontSize: 11, fontWeight: "700" },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1f6f5f" },
  sheetScroll: { gap: 12, paddingBottom: 16, paddingHorizontal: 18, paddingTop: 4 },
  detailSection: { backgroundColor: "#f7f3ea", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#ece4d4" },
  detailSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#f0e9d8", borderBottomWidth: 1, borderBottomColor: "#ece4d4" },
  detailSectionIconWrap: { width: 24, height: 24, borderRadius: 7, backgroundColor: "#e8f5f2", justifyContent: "center", alignItems: "center" },
  detailSectionTitle: { fontSize: 11, fontWeight: "800", color: "#3d4e5c", textTransform: "uppercase", letterSpacing: 0.5 },
  detailSectionBody: { paddingHorizontal: 14, paddingVertical: 6 },
  detailRow: { paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: "#ece4d4" },
  detailLabel: { fontSize: 11, fontWeight: "700", color: "#8a9098", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  detailValue: { fontSize: 15, color: "#1f2a37", lineHeight: 21 },

  /* Attachments */
  attachmentsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 },
  attThumb: { width: 100, height: 100, borderRadius: 12, backgroundColor: "#e8dfc9" },
  attOverlay: {
    position: "absolute", bottom: 6, right: 6,
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, padding: 3,
  },
  attFileBadge: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: "#f0e9d8", borderWidth: 1, borderColor: "#e8dfc9",
    justifyContent: "center", alignItems: "center", gap: 6, padding: 8,
  },
  attFileName: { fontSize: 10, color: "#7a6b54", textAlign: "center" },
});
