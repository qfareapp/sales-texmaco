import { useCallback, useMemo, useState } from "react";
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

const FILTER_OPTIONS = [
  { key: "thisMonth", label: "This Month" },
  { key: "previousMonth", label: "Previous Month" },
  { key: "custom", label: "Custom" },
];

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDateOnly(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countBy(items, resolver) {
  return items.reduce((acc, item) => {
    const key = resolver(item) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function formatTopEntries(source, limit = 4) {
  return Object.entries(source)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export default function DashboardScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterMode, setFilterMode] = useState("thisMonth");
  const [customMonth, setCustomMonth] = useState(new Date().getMonth());
  const [customYear, setCustomYear] = useState(new Date().getFullYear());

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const allReports = await getAllIncidentReports();
      setReports(allReports);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load EHS dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const filteredReports = useMemo(() => {
    const now = new Date();
    let rangeStart;
    let rangeEnd;

    if (filterMode === "thisMonth") {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (filterMode === "previousMonth") {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      rangeStart = new Date(customYear, customMonth, 1);
      rangeEnd = new Date(customYear, customMonth + 1, 1);
    }

    return reports.filter((report) => {
      const createdAt = new Date(report.createdAt);
      return createdAt >= rangeStart && createdAt < rangeEnd;
    });
  }, [reports, filterMode, customMonth, customYear]);

  const metrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const learningEvents = filteredReports.filter((r) => r.reportCategory === "Learning Event");
    const incidents = filteredReports.filter((r) => r.reportCategory === "Incident");
    const nearMisses = filteredReports.filter((r) => r.reportType === "Near Miss");
    const highSeverity = filteredReports.filter((r) => HIGH_SEVERITY_TYPES.has(r.reportType));
    const withAttachments = filteredReports.filter((r) => (r.attachmentCount || 0) > 0);
    const recentReports = filteredReports.filter((r) => new Date(r.createdAt) >= sevenDaysAgo);

    const safeDays = filteredReports.length
      ? Math.max(0, Math.floor((now - new Date(filteredReports[0].createdAt)) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      totalReports: filteredReports.length,
      learningEvents: learningEvents.length,
      incidents: incidents.length,
      nearMisses: nearMisses.length,
      highSeverity: highSeverity.length,
      recentReports: recentReports.length,
      monthReports: filteredReports.length,
      attachmentCoverage: filteredReports.length
        ? Math.round((withAttachments.length / filteredReports.length) * 100)
        : 0,
      safeDays,
      topLocations: formatTopEntries(countBy(filteredReports, (r) => r.location)),
      departmentMix: formatTopEntries(countBy(filteredReports, (r) => r.reportedBy?.department)),
      incidentTypes: formatTopEntries(countBy(filteredReports, (r) => r.reportType), 6),
      statusMix: formatTopEntries(countBy(filteredReports, () => "Submitted"), 3),
      recentFeed: filteredReports.slice(0, 5),
    };
  }, [filteredReports]);

  const availableYears = useMemo(() => {
    const years = new Set(reports.map((report) => new Date(report.createdAt).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [reports]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1f6f5f" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor="#1f6f5f" />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" size={13} color="#7ee8d4" />
          <Text style={styles.eyebrow}>EHS Dashboard</Text>
        </View>
        <Text style={styles.title}>Safety Reporting Overview</Text>
        <Text style={styles.body}>
          Live metrics from submitted learning events and incidents, designed for quick admin review.
        </Text>

        {/* Filter period — compact, inline */}
        <View style={styles.filterRow}>
          <Ionicons name="funnel-outline" size={12} color="#7ee8d4" />
          {FILTER_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              style={[styles.filterPill, filterMode === option.key && styles.filterPillActive]}
              onPress={() => setFilterMode(option.key)}
            >
              <Text style={[styles.filterPillText, filterMode === option.key && styles.filterPillTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {filterMode === "custom" ? (
        <View style={styles.customFilterCard}>
          <View style={styles.filterSelectGroup}>
            <Text style={styles.filterLabel}>Month</Text>
            <View style={styles.filterChips}>
              {MONTH_OPTIONS.map((month, index) => (
                <Pressable
                  key={month}
                  style={[styles.filterChip, customMonth === index && styles.filterChipActive]}
                  onPress={() => setCustomMonth(index)}
                >
                  <Text style={[styles.filterChipText, customMonth === index && styles.filterChipTextActive]}>
                    {month.slice(0, 3)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.filterSelectGroup}>
            <Text style={styles.filterLabel}>Year</Text>
            <View style={styles.filterChips}>
              {availableYears.map((year) => (
                <Pressable
                  key={year}
                  style={[styles.filterChip, customYear === year && styles.filterChipActive]}
                  onPress={() => setCustomYear(year)}
                >
                  <Text style={[styles.filterChipText, customYear === year && styles.filterChipTextActive]}>
                    {year}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.card, styles.errorCard]}>
          <Ionicons name="alert-circle-outline" size={18} color="#a24343" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.metricGrid}>
        <MetricCard label="Total Reports" value={metrics.totalReports} tone="dark" icon="document-text-outline" />
        <MetricCard label="Learning Events" value={metrics.learningEvents} tone="green" icon="book-outline" />
        <MetricCard label="Incidents" value={metrics.incidents} tone="amber" icon="warning-outline" />
        <MetricCard label="Near Misses" value={metrics.nearMisses} tone="teal" icon="eye-outline" />
        <MetricCard label="High Severity" value={metrics.highSeverity} tone="red" icon="flame-outline" />
        <MetricCard label="This Month" value={metrics.monthReports} tone="navy" icon="calendar-outline" />
      </View>

      <View style={styles.sectionRow}>
        <InsightCard
          title="Reporting Pulse"
          primary={`${metrics.recentReports} in last 7 days`}
          secondary={`${metrics.attachmentCoverage}% include attachments`}
          caption={`${metrics.safeDays} days since the oldest logged item`}
        />
        <InsightCard
          title="Current Status"
          primary={metrics.statusMix[0] ? `${metrics.statusMix[0][1]} ${metrics.statusMix[0][0]}` : "No records"}
          secondary="Status tracking can be extended later"
          caption="Status is currently defaulted to Submitted"
        />
      </View>

      <SectionCard title="Incident Type Mix" subtitle="Most reported event classes">
        {metrics.incidentTypes.length ? (
          metrics.incidentTypes.map(([label, value]) => (
            <BarRow key={label} label={label} value={value} max={metrics.totalReports || 1} />
          ))
        ) : (
          <EmptyState text="No incident data available yet." />
        )}
      </SectionCard>

      <SectionCard title="Hotspot Locations" subtitle="Areas with the highest reporting activity">
        {metrics.topLocations.length ? (
          metrics.topLocations.map(([label, value]) => (
            <BarRow key={label} label={label} value={value} max={metrics.totalReports || 1} />
          ))
        ) : (
          <EmptyState text="No locations captured yet." />
        )}
      </SectionCard>

      <SectionCard title="Department Exposure" subtitle="Reporting volume by department">
        {metrics.departmentMix.length ? (
          metrics.departmentMix.map(([label, value]) => (
            <BarRow key={label} label={label} value={value} max={metrics.totalReports || 1} />
          ))
        ) : (
          <EmptyState text="No department data available yet." />
        )}
      </SectionCard>

      {/* ── Recent Alerts ── */}
      <View style={styles.card}>
        <View style={styles.alertsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <Text style={styles.sectionSubtitle}>Latest submitted incidents and learning events</Text>
          </View>
          <View style={styles.alertsCountBadge}>
            <Text style={styles.alertsCountText}>{metrics.recentFeed.length}</Text>
          </View>
        </View>

        <View style={styles.sectionBody}>
          {metrics.recentFeed.length ? (
            metrics.recentFeed.map((report) => (
              <AlertCard
                key={report._id}
                report={report}
                onPress={() => setSelectedReport(report)}
              />
            ))
          ) : (
            <EmptyState icon="notifications-off-outline" text="No recent submissions yet." />
          )}
        </View>
      </View>

      {/* ── Detail Modal ── */}
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
    </ScrollView>
  );
}

/* ─────────────────────────────────────────
   Alert Card
───────────────────────────────────────── */
function AlertCard({ report, onPress }) {
  const isHigh = HIGH_SEVERITY_TYPES.has(report.reportType);
  const accentColor = CATEGORY_COLOR[report.reportCategory] ?? "#1f6f5f";
  const accentBg = CATEGORY_BG[report.reportCategory] ?? "#e8f5f2";
  const catIcon = CATEGORY_ICON[report.reportCategory] ?? "document-outline";
  const typeIcon = TYPE_ICONS[report.reportType] ?? "ellipse-outline";
  const imageAttachment = report.attachments?.find((attachment) => attachment.mimeType?.startsWith("image/"));
  const displayDate =
    getDateOnly(report.incidentDate)?.toLocaleDateString() ??
    new Date(report.createdAt).toLocaleDateString();

  return (
    <Pressable
      style={({ pressed }) => [styles.alertCard, pressed && styles.alertCardPressed]}
      onPress={onPress}
    >
      {/* Left accent bar */}
      <View style={[styles.alertAccent, { backgroundColor: isHigh ? "#a24343" : accentColor }]} />

      <View style={styles.alertBody}>
        {imageAttachment?.url ? (
          <Image source={{ uri: imageAttachment.url }} style={styles.alertPreview} />
        ) : null}

        {/* Top row */}
        <View style={styles.alertTopRow}>
          <Text style={[styles.alertRef, { color: accentColor }]}>{report.referenceNo}</Text>
          <View style={styles.alertBadges}>
            {isHigh && (
              <View style={styles.severityBadge}>
                <Ionicons name="flame" size={11} color="#fff" />
                <Text style={styles.severityBadgeText}>High</Text>
              </View>
            )}
            <View style={[styles.categoryBadge, { backgroundColor: accentBg }]}>
              <Ionicons name={catIcon} size={11} color={accentColor} />
              <Text style={[styles.categoryBadgeText, { color: accentColor }]}>
                {report.reportCategory}
              </Text>
            </View>
          </View>
        </View>

        {/* Type row */}
        <View style={styles.alertTypeRow}>
          <View style={[styles.typeIconChip, { backgroundColor: accentBg }]}>
            <Ionicons name={typeIcon} size={16} color={accentColor} />
          </View>
          <Text style={styles.alertTitle} numberOfLines={1}>{report.reportType}</Text>
        </View>

        {/* Meta rows */}
        <View style={styles.alertMetaRow}>
          <Ionicons name="location-outline" size={13} color="#8a9098" />
          <Text style={styles.alertMeta} numberOfLines={1}>
            {report.location || "Unknown location"}
          </Text>
          <Text style={styles.alertMetaDot}>·</Text>
          <Ionicons name="business-outline" size={13} color="#8a9098" />
          <Text style={styles.alertMeta} numberOfLines={1}>
            {report.reportedBy?.department || "Unknown dept"}
          </Text>
        </View>

        <View style={styles.alertMetaRow}>
          <Ionicons name="person-outline" size={13} color="#8a9098" />
          <Text style={styles.alertMeta}>{report.reportedBy?.name || "Unknown reporter"}</Text>
          <Text style={styles.alertMetaDot}>·</Text>
          <Ionicons name="calendar-outline" size={13} color="#8a9098" />
          <Text style={styles.alertMeta}>
            {displayDate}{report.incidentTime ? `  ${report.incidentTime}` : ""}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.alertFooter}>
          <View style={styles.alertStatusChip}>
            <View style={styles.alertStatusDot} />
            <Text style={styles.alertStatusText}>
              {report.currentStatus || "Submitted"}
            </Text>
          </View>
          <View style={styles.alertCta}>
            <Text style={[styles.alertCtaText, { color: accentColor }]}>View details</Text>
            <Ionicons name="chevron-forward" size={14} color={accentColor} />
          </View>
        </View>
      </View>
    </Pressable>
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
  const imageAttachment = report.attachments?.find((attachment) => attachment.mimeType?.startsWith("image/"));
  const victims = Array.isArray(report.victims) && report.victims.length
    ? report.victims
    : (report.victimName || report.victimDepartment)
      ? [{ name: report.victimName, department: report.victimDepartment }]
      : [];

  return (
    <>
      {/* Drag handle */}
      <View style={styles.dragHandle} />

      {/* Sheet header */}
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

      {/* Chips row */}
      <View style={styles.sheetChips}>
        <View style={[styles.sheetCategoryChip, { backgroundColor: accentBg }]}>
          <Ionicons name={catIcon} size={13} color={accentColor} />
          <Text style={[styles.sheetCategoryChipText, { color: accentColor }]}>
            {report.reportCategory}
          </Text>
        </View>
        {isHigh && (
          <View style={styles.sheetSeverityChip}>
            <Ionicons name="flame" size={13} color="#fff" />
            <Text style={styles.sheetSeverityChipText}>High Severity</Text>
          </View>
        )}
        <View style={styles.sheetStatusChip}>
          <View style={styles.sheetStatusDot} />
          <Text style={styles.sheetStatusChipText}>{report.currentStatus || "Submitted"}</Text>
        </View>
      </View>

      {imageAttachment?.url ? (
        <Image source={{ uri: imageAttachment.url }} style={styles.sheetPreview} />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.sheetScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Reporter section */}
        <DetailSection icon="person-circle-outline" title="Reporter">
          <DetailRow label="Name" value={report.reportedBy?.name} />
          <DetailRow label="Emp ID" value={report.reportedBy?.empId} />
          <DetailRow label="Type" value={report.reportedBy?.departmentContractor} />
          <DetailRow label="Department" value={report.reportedBy?.department} last />
        </DetailSection>

        {/* Incident section */}
        <DetailSection icon="warning-outline" title="Incident">
          <DetailRow label="Location" value={report.location} />
          <DetailRow
            label="Date"
            value={report.incidentDate ? new Date(report.incidentDate).toLocaleDateString() : null}
          />
          <DetailRow label="Time" value={report.incidentTime} last />
        </DetailSection>

        {/* Victim / Observation (conditional) */}
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
          <DetailSection icon="book-outline" title="Learning Event Details">
            <DetailRow label="Observation" value={report.observation} />
            <DetailRow label="Responsible Dept" value={report.responsibleDepartment} last />
          </DetailSection>
        ) : null}

        {report.description ? (
          <DetailSection icon="document-text-outline" title="Description">
            <DetailRow label="Details" value={report.description} last />
          </DetailSection>
        ) : null}

        {/* Submission */}
        <DetailSection icon="checkmark-circle-outline" title="Submission">
          <DetailRow label="Attachments" value={String(report.attachmentCount || 0)} />
          <DetailRow label="Submitted On" value={new Date(report.createdAt).toLocaleString()} last />
        </DetailSection>
      </ScrollView>
    </>
  );
}

/* ─────────────────────────────────────────
   Shared sub-components
───────────────────────────────────────── */
function MetricCard({ label, value, tone, icon }) {
  return (
    <View style={[styles.metricCard, toneStyles[tone]]}>
      <Ionicons name={icon} size={20} color="rgba(255,255,255,0.6)" />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function InsightCard({ title, primary, secondary, caption }) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightPrimary}>{primary}</Text>
      <Text style={styles.insightSecondary}>{secondary}</Text>
      <Text style={styles.insightCaption}>{caption}</Text>
    </View>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function BarRow({ label, value, max }) {
  const widthPercent = Math.max(6, Math.round((value / max) * 100));
  return (
    <View style={styles.barRow}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${widthPercent}%` }]} />
      </View>
    </View>
  );
}

function DetailSection({ icon, title, children }) {
  return (
    <View style={styles.detailSection}>
      <View style={styles.detailSectionHeader}>
        <View style={styles.detailSectionIcon}>
          <Ionicons name={icon} size={14} color="#1f6f5f" />
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

function EmptyState({ icon = "document-outline", text }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={28} color="#c5b89a" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────
   Styles
───────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f3ea" },
  content: { padding: 18, gap: 16, paddingBottom: 36 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f3ea" },

  /* Hero */
  hero: { backgroundColor: "#20364a", borderRadius: 28, padding: 24, gap: 10 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    backgroundColor: "rgba(126,232,212,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  eyebrow: { color: "#7ee8d4", fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 24, lineHeight: 32, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  body: { color: "#c4ced8", lineHeight: 21 },

  /* Error */
  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fdf0f0", borderColor: "#f5c6c6" },
  errorText: { color: "#a24343", fontWeight: "700", flex: 1 },

  /* Metric grid */
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    width: "48%", borderRadius: 22, padding: 18, minHeight: 118,
    justifyContent: "space-between",
  },
  metricValue: { fontSize: 34, fontWeight: "800", color: "#ffffff" },
  metricLabel: { color: "#f3f5f7", fontWeight: "600", lineHeight: 20 },

  /* Insight */
  sectionRow: { gap: 12 },
  insightCard: { backgroundColor: "#fffdf8", borderRadius: 22, padding: 18, gap: 8, borderWidth: 1, borderColor: "#e5dbc7" },
  insightTitle: { color: "#7d8690", textTransform: "uppercase", letterSpacing: 1, fontWeight: "700", fontSize: 12 },
  insightPrimary: { color: "#25313d", fontSize: 22, fontWeight: "700" },
  insightSecondary: { color: "#1f6f5f", fontWeight: "700" },
  insightCaption: { color: "#66707d", lineHeight: 20 },

  /* Generic card */
  card: { backgroundColor: "#fffdf8", borderRadius: 24, padding: 20, gap: 8, borderWidth: 1, borderColor: "#e5dbc7" },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "800", color: "#25313d" },
  sectionSubtitle: { color: "#66707d", lineHeight: 20 },
  sectionBody: { marginTop: 14, gap: 12 },
  /* Filter period — compact strip inside hero */
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 4,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  filterPillActive: {
    backgroundColor: "rgba(126,232,212,0.22)",
  },
  filterPillText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    fontSize: 12,
  },
  filterPillTextActive: {
    color: "#7ee8d4",
    fontSize: 12,
  },
  /* Custom date picker — slim card below hero */
  customFilterCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e5dbc7",
  },
  filterSelectGroup: {
    gap: 6,
  },
  filterLabel: {
    color: "#8a9098",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5dbc7",
    backgroundColor: "#f4eee1",
  },
  filterChipActive: {
    backgroundColor: "#1f6f5f",
    borderColor: "#1f6f5f",
  },
  filterChipText: {
    color: "#5a6472",
    fontWeight: "700",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#ffffff",
    fontSize: 12,
  },

  /* Alerts section header */
  alertsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  alertsCountBadge: {
    backgroundColor: "#20364a", borderRadius: 20, minWidth: 32,
    paddingHorizontal: 10, paddingVertical: 5, alignItems: "center",
  },
  alertsCountText: { color: "#7ee8d4", fontSize: 13, fontWeight: "800" },

  /* Bar chart */
  barRow: { gap: 6 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  barLabel: { flex: 1, color: "#31404d", fontWeight: "600" },
  barValue: { color: "#20364a", fontWeight: "700" },
  barTrack: { height: 10, borderRadius: 999, backgroundColor: "#ece4d4", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999, backgroundColor: "#1f6f5f" },

  /* Alert card */
  alertCard: {
    flexDirection: "row",
    backgroundColor: "#fdfaf4",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e8dfc9",
    overflow: "hidden",
  },
  alertCardPressed: { opacity: 0.82 },
  alertAccent: { width: 4, borderRadius: 4 },
  alertBody: { flex: 1, padding: 14, gap: 8 },
  alertPreview: {
    width: "100%",
    height: 138,
    borderRadius: 14,
    backgroundColor: "#e7dcc5",
  },
  alertTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  alertRef: { fontSize: 12, fontWeight: "700" },
  alertBadges: { flexDirection: "row", gap: 6, alignItems: "center" },
  severityBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#a24343", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  severityBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  categoryBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: "700" },
  alertTypeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  typeIconChip: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  alertTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: "#1f2a37" },
  alertMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  alertMeta: { fontSize: 12, color: "#5a6472", flex: 1 },
  alertMetaDot: { color: "#c0c8d0", fontSize: 12, marginHorizontal: 2 },
  alertFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  alertStatusChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#e8f5f2", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  alertStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#1f6f5f" },
  alertStatusText: { fontSize: 11, fontWeight: "700", color: "#1f6f5f" },
  alertCta: { flexDirection: "row", alignItems: "center", gap: 3 },
  alertCtaText: { fontSize: 12, fontWeight: "700" },

  /* Modal */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.55)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalCard: {
    maxHeight: "86%",
    backgroundColor: "#fffdf8",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },

  /* Detail sheet */
  dragHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#d9d2c3", alignSelf: "center", marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14,
  },
  sheetIconWrap: {
    width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center",
  },
  sheetHeaderText: { flex: 1, gap: 2 },
  sheetRef: { fontSize: 12, fontWeight: "700", color: "#8a9098" },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: "#1f2a37", lineHeight: 26 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f0e9d8", justifyContent: "center", alignItems: "center",
  },
  closeBtnPressed: { backgroundColor: "#e4d4b5" },
  sheetChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  sheetCategoryChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  sheetCategoryChipText: { fontSize: 12, fontWeight: "700" },
  sheetSeverityChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#a24343", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  sheetSeverityChipText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sheetStatusChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#e8f5f2", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  sheetStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#1f6f5f" },
  sheetStatusChipText: { color: "#1f6f5f", fontSize: 12, fontWeight: "700" },
  sheetPreview: {
    width: "100%",
    height: 190,
    borderRadius: 18,
    backgroundColor: "#e7dcc5",
    marginBottom: 18,
  },
  sheetScrollContent: { gap: 12, paddingBottom: 16 },

  /* Detail sections */
  detailSection: {
    backgroundColor: "#f7f3ea", borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: "#ece4d4",
  },
  detailSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "#f0e9d8", borderBottomWidth: 1, borderBottomColor: "#ece4d4",
  },
  detailSectionIcon: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: "#e8f5f2", justifyContent: "center", alignItems: "center",
  },
  detailSectionTitle: { fontSize: 12, fontWeight: "800", color: "#3d4e5c", textTransform: "uppercase", letterSpacing: 0.5 },
  detailSectionBody: { paddingHorizontal: 14, paddingVertical: 6 },
  detailRow: { paddingVertical: 10 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: "#ece4d4" },
  detailLabel: { fontSize: 11, fontWeight: "700", color: "#8a9098", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  detailValue: { fontSize: 15, color: "#1f2a37", lineHeight: 21 },

  /* Empty state */
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { color: "#8a9098", fontSize: 14 },
});

const toneStyles = StyleSheet.create({
  dark: { backgroundColor: "#20364a" },
  green: { backgroundColor: "#1f6f5f" },
  amber: { backgroundColor: "#b77932" },
  teal: { backgroundColor: "#2f7f95" },
  red: { backgroundColor: "#a24343" },
  navy: { backgroundColor: "#384b6a" },
});
