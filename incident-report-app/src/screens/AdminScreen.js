import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SCREEN_H = Dimensions.get("window").height;
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

const BAR_COLORS = ["#1f6f5f","#2f7f95","#b77932","#7b5ea7","#a24343","#384b6a"];

function countBy(items, fn) {
  return items.reduce((acc, item) => {
    const key = fn(item) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}
function topEntries(obj, n = 4) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function getDisplayDate(report) {
  if (report.incidentDate) {
    const d = new Date(report.incidentDate);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  return new Date(report.createdAt).toLocaleDateString();
}

/* ══════════════════════════════════════════
   Main screen
══════════════════════════════════════════ */
export default function AdminScreen() {
  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const insets = useSafeAreaInsets();
  const [filterMode, setFilterMode]     = useState("thisMonth");
  const [customMonth, setCustomMonth]   = useState(new Date().getMonth());
  const [customYear, setCustomYear]     = useState(new Date().getFullYear());

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else if (!reports.length) setLoading(true);
      const all = await getAllIncidentReports({ forceRefresh: isRefresh });
      setReports(all);
      setError("");
    } catch (e) {
      setError(e.message || "Unable to load reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reports.length]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /* Latest report across ALL data (no filter) for the live panel */
  const latestReport = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ?? null,
    [reports]
  );

  /* Filtered dataset for analytics */
  const filteredReports = useMemo(() => {
    const now = new Date();
    let start, end;
    if (filterMode === "thisMonth") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (filterMode === "previousMonth") {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end   = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(customYear, customMonth, 1);
      end   = new Date(customYear, customMonth + 1, 1);
    }
    return reports.filter(r => { const d = new Date(r.createdAt); return d >= start && d < end; });
  }, [reports, filterMode, customMonth, customYear]);

  const metrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
    const withAttachments = filteredReports.filter(r => (r.attachmentCount || 0) > 0);
    const recentReports   = filteredReports.filter(r => new Date(r.createdAt) >= sevenDaysAgo);
    const safeDays = filteredReports.length
      ? Math.max(0, Math.floor((now - new Date(filteredReports[0].createdAt)) / 86400000))
      : 0;
    return {
      total:        filteredReports.length,
      learning:     filteredReports.filter(r => r.reportCategory === "Learning Event").length,
      incidents:    filteredReports.filter(r => r.reportCategory === "Incident").length,
      nearMisses:   filteredReports.filter(r => r.reportType === "Near Miss").length,
      highSeverity: filteredReports.filter(r => HIGH_SEVERITY_TYPES.has(r.reportType)).length,
      recentCount:  recentReports.length,
      attachPct:    filteredReports.length ? Math.round((withAttachments.length / filteredReports.length) * 100) : 0,
      safeDays,
      topLocations:   topEntries(countBy(filteredReports, r => r.location)),
      departmentMix:  topEntries(countBy(filteredReports, r => r.reportedBy?.department)),
      incidentTypes:  topEntries(countBy(filteredReports, r => r.reportType), 6),
    };
  }, [filteredReports]);

  const availableYears = useMemo(() => {
    const yrs = new Set(reports.map(r => new Date(r.createdAt).getFullYear()));
    yrs.add(new Date().getFullYear());
    return Array.from(yrs).sort((a, b) => b - a);
  }, [reports]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1f6f5f" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#1f6f5f" />}
      >

        {/* ── Live Notification Panel ── */}
        <Pressable
          style={({ pressed }) => [styles.livePanel, pressed && latestReport && styles.livePanelPressed]}
          onPress={() => latestReport && setSelectedReport(latestReport)}
          disabled={!latestReport}
        >
          {/* header row */}
          <View style={styles.livePanelHeader}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.livePanelLabel}>Latest Report</Text>
            {latestReport && <Ionicons name="chevron-forward" size={16} color="#7ee8d4" />}
          </View>

          {latestReport ? (() => {
            const isHigh       = HIGH_SEVERITY_TYPES.has(latestReport.reportType);
            const accentColor  = CATEGORY_COLOR[latestReport.reportCategory] ?? "#1f6f5f";
            const accentBg     = CATEGORY_BG[latestReport.reportCategory] ?? "#e8f5f2";
            const catIcon      = CATEGORY_ICON[latestReport.reportCategory] ?? "document-outline";
            const typeIcon     = TYPE_ICONS[latestReport.reportType] ?? "ellipse-outline";
            return (
              <View style={styles.liveContent}>
                {/* type row */}
                <View style={styles.liveTypeRow}>
                  <View style={[styles.liveTypeIcon, { backgroundColor: accentBg }]}>
                    <Ionicons name={typeIcon} size={18} color={accentColor} />
                  </View>
                  <Text style={styles.liveTypeName}>{latestReport.reportType}</Text>
                  {isHigh && (
                    <View style={styles.liveHighBadge}>
                      <Ionicons name="flame" size={11} color="#fff" />
                      <Text style={styles.liveHighText}>High</Text>
                    </View>
                  )}
                </View>
                {/* meta row */}
                <View style={styles.liveMetaRow}>
                  <View style={[styles.liveCatChip, { backgroundColor: accentBg }]}>
                    <Ionicons name={catIcon} size={11} color={accentColor} />
                    <Text style={[styles.liveCatText, { color: accentColor }]}>{latestReport.reportCategory}</Text>
                  </View>
                  <View style={styles.liveMeta}>
                    <Ionicons name="location-outline" size={12} color="#8da7bc" />
                    <Text style={styles.liveMetaText}>{latestReport.location || "—"}</Text>
                  </View>
                  <View style={styles.liveMeta}>
                    <Ionicons name="calendar-outline" size={12} color="#8da7bc" />
                    <Text style={styles.liveMetaText}>
                      {getDisplayDate(latestReport)}{latestReport.incidentTime ? "  " + latestReport.incidentTime : ""}
                    </Text>
                  </View>
                </View>
                <Text style={styles.liveRef}>{latestReport.referenceNo}</Text>
              </View>
            );
          })() : (
            <View style={styles.liveEmpty}>
              <Ionicons name="notifications-off-outline" size={24} color="#4e6275" />
              <Text style={styles.liveEmptyText}>No reports submitted yet</Text>
            </View>
          )}
        </Pressable>

        {/* ── Analytics: filter period ── */}
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <Ionicons name="funnel-outline" size={13} color="#66707d" />
            <Text style={styles.filterTitle}>Analytics Period</Text>
            <View style={styles.filterPills}>
              {FILTER_OPTIONS.map(opt => (
                <Pressable
                  key={opt.key}
                  style={[styles.filterPill, filterMode === opt.key && styles.filterPillActive]}
                  onPress={() => setFilterMode(opt.key)}
                >
                  <Text style={[styles.filterPillText, filterMode === opt.key && styles.filterPillTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {filterMode === "custom" && (
            <View style={styles.customPicker}>
              <View style={styles.customGroup}>
                <Text style={styles.customLabel}>Month</Text>
                <View style={styles.chipRow}>
                  {MONTH_OPTIONS.map((m, i) => (
                    <Pressable
                      key={m}
                      style={[styles.chip, customMonth === i && styles.chipActive]}
                      onPress={() => setCustomMonth(i)}
                    >
                      <Text style={[styles.chipText, customMonth === i && styles.chipTextActive]}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.customGroup}>
                <Text style={styles.customLabel}>Year</Text>
                <View style={styles.chipRow}>
                  {availableYears.map(yr => (
                    <Pressable
                      key={yr}
                      style={[styles.chip, customYear === yr && styles.chipActive]}
                      onPress={() => setCustomYear(yr)}
                    >
                      <Text style={[styles.chipText, customYear === yr && styles.chipTextActive]}>{yr}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ── Error ── */}
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#a24343" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Metric grid ── */}
        <View style={styles.metricGrid}>
          <MetricCard label="Total Reports"   value={metrics.total}        color="#20364a" icon="document-text-outline" />
          <MetricCard label="Learning Events" value={metrics.learning}     color="#1f6f5f" icon="book-outline" />
          <MetricCard label="Incidents"       value={metrics.incidents}    color="#b77932" icon="warning-outline" />
          <MetricCard label="Near Misses"     value={metrics.nearMisses}   color="#2f7f95" icon="eye-outline" />
          <MetricCard label="High Severity"   value={metrics.highSeverity} color="#a24343" icon="flame-outline" />
          <MetricCard label="Last 7 Days"     value={metrics.recentCount}  color="#7b5ea7" icon="time-outline" />
        </View>

        {/* ── Category split ── */}
        <CategorySplitCard
          learning={metrics.learning}
          incidents={metrics.incidents}
          total={metrics.total}
          attachPct={metrics.attachPct}
        />

        {/* ── Bar charts ── */}
        <ChartCard
          title="Incident Type Mix"
          icon="pie-chart-outline"
          subtitle="Most reported event classes"
          data={metrics.incidentTypes}
          total={metrics.total}
          colors={BAR_COLORS}
          emptyText="No incident data yet"
        />

        <ChartCard
          title="Hotspot Locations"
          icon="location-outline"
          subtitle="Areas with highest activity"
          data={metrics.topLocations}
          total={metrics.total}
          colors={BAR_COLORS}
          emptyText="No location data yet"
        />

        <ChartCard
          title="Department Exposure"
          icon="business-outline"
          subtitle="Reporting volume by department"
          data={metrics.departmentMix}
          total={metrics.total}
          colors={BAR_COLORS}
          emptyText="No department data yet"
        />

      </ScrollView>

      {/* ── Live panel detail modal ── */}
      <Modal
        visible={Boolean(selectedReport)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => setSelectedReport(null)} />
          <View style={[styles.modalCard, { marginBottom: insets.bottom }]}>
            {selectedReport && (
              <ReportDetailSheet report={selectedReport} onClose={() => setSelectedReport(null)} />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

/* ─────────────────────────────────────────
   Report Card  (kept for future use)
───────────────────────────────────────── */
function ReportCard({ report, index, onPress }) {
  const isHigh      = HIGH_SEVERITY_TYPES.has(report.reportType);
  const accentColor = CATEGORY_COLOR[report.reportCategory] ?? "#1f6f5f";
  const accentBg    = CATEGORY_BG[report.reportCategory] ?? "#e8f5f2";
  const catIcon     = CATEGORY_ICON[report.reportCategory] ?? "document-outline";
  const typeIcon    = TYPE_ICONS[report.reportType] ?? "ellipse-outline";

  return (
    <Pressable style={({ pressed }) => [styles.reportCard, pressed && styles.reportCardPressed]} onPress={onPress}>
      <View style={styles.reportIndex}><Text style={styles.reportIndexText}>{index + 1}</Text></View>
      <View style={[styles.reportAccent, { backgroundColor: isHigh ? "#a24343" : accentColor }]} />
      <View style={styles.reportBody}>
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
              <Text style={[styles.catBadgeText, { color: accentColor }]}>{report.reportCategory}</Text>
            </View>
          </View>
        </View>
        <View style={styles.reportTypeRow}>
          <View style={[styles.typeChip, { backgroundColor: accentBg }]}>
            <Ionicons name={typeIcon} size={15} color={accentColor} />
          </View>
          <Text style={styles.reportType} numberOfLines={1}>{report.reportType}</Text>
        </View>
        <View style={styles.metaGrid}>
          <MetaItem icon="person-outline"   text={report.reportedBy?.name || "Unknown"} />
          <MetaItem icon="location-outline" text={report.location || "—"} />
          <MetaItem icon="business-outline" text={report.reportedBy?.department || "—"} />
          <MetaItem icon="calendar-outline" text={`${getDisplayDate(report)}${report.incidentTime ? "  " + report.incidentTime : ""}`} />
        </View>
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
   Analytics sub-components
───────────────────────────────────────── */
function MetricCard({ label, value, color, icon }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: color }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={[styles.metricAccent, { backgroundColor: color }]} />
    </View>
  );
}

function CategorySplitCard({ learning, incidents, total, attachPct }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }).start();
  }, [learning, incidents]);

  const learnPct = total > 0 ? Math.round((learning / total) * 100) : 50;
  const incPct   = 100 - learnPct;
  const learnW   = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${learnPct}%`] });
  const incW     = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${incPct}%`] });

  return (
    <View style={styles.splitCard}>
      <View style={styles.splitHeader}>
        <Text style={styles.splitTitle}>Safety Overview</Text>
        <Text style={styles.splitSub}>{total} total · {attachPct}% with photos</Text>
      </View>

      {/* Segmented bar */}
      <View style={styles.splitBarTrack}>
        <Animated.View style={[styles.splitBarLearn, { width: learnW }]} />
        <Animated.View style={[styles.splitBarIncident, { width: incW }]} />
      </View>

      {/* Legend */}
      <View style={styles.splitLegend}>
        <View style={styles.splitLegendItem}>
          <View style={[styles.splitDot, { backgroundColor: "#1f6f5f" }]} />
          <Text style={styles.splitLegendText}>Learning Events</Text>
          <Text style={styles.splitLegendVal}>{learning} <Text style={styles.splitLegendPct}>({learnPct}%)</Text></Text>
        </View>
        <View style={styles.splitLegendItem}>
          <View style={[styles.splitDot, { backgroundColor: "#b77932" }]} />
          <Text style={styles.splitLegendText}>Incidents</Text>
          <Text style={styles.splitLegendVal}>{incidents} <Text style={styles.splitLegendPct}>({incPct}%)</Text></Text>
        </View>
      </View>
    </View>
  );
}

function ChartCard({ title, icon, subtitle, data, total, colors, emptyText }) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartCardHeader}>
        <View style={styles.chartCardIconWrap}>
          <Ionicons name={icon} size={14} color="#1f6f5f" />
        </View>
        <View style={styles.chartCardTitles}>
          <Text style={styles.chartCardTitle}>{title}</Text>
          <Text style={styles.chartCardSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.chartCardBadge}>
          <Text style={styles.chartCardBadgeText}>{data.length}</Text>
        </View>
      </View>
      <View style={styles.chartCardBody}>
        {data.length
          ? data.map(([label, value], i) => (
              <AnimatedBar
                key={label}
                label={label}
                value={value}
                max={total || 1}
                rank={i}
                color={colors[i % colors.length]}
              />
            ))
          : <View style={styles.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={28} color="#d9d2c3" />
              <Text style={styles.chartEmptyText}>{emptyText}</Text>
            </View>
        }
      </View>
    </View>
  );
}

function AnimatedBar({ label, value, max, rank, color }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = Math.max(4, Math.round((value / max) * 100));

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: pct,
      duration: 600 + rank * 80,
      useNativeDriver: false,
    }).start();
  }, [value, max]);

  const barWidth = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const RANK_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

  return (
    <View style={styles.animBar}>
      {/* Top row: rank + label + count */}
      <View style={styles.animBarHeader}>
        <View style={[styles.animBarRank, { backgroundColor: color }]}>
          <Text style={styles.animBarRankText}>{RANK_LABELS[rank] ?? `#${rank + 1}`}</Text>
        </View>
        <Text style={styles.animBarLabel} numberOfLines={1}>{label}</Text>
        <View style={[styles.animBarCountBadge, { borderColor: color }]}>
          <Text style={[styles.animBarCount, { color }]}>{value}</Text>
        </View>
      </View>

      {/* Bar track */}
      <View style={styles.animBarTrack}>
        <Animated.View style={[styles.animBarFill, { width: barWidth, backgroundColor: color }]}>
          {pct > 18 && (
            <Text style={styles.animBarPct}>{pct}%</Text>
          )}
        </Animated.View>
        {pct <= 18 && (
          <Text style={[styles.animBarPctOutside, { color }]}>{pct}%</Text>
        )}
      </View>
    </View>
  );
}

function EmptyState({ text }) {
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyRowText}>{text}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────
   Detail Sheet
───────────────────────────────────────── */
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
    <View style={{ flex: 1 }}>
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.sheetScroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <DetailSection icon="person-circle-outline" title="Reporter">
          <DetailRow label="Name"       value={report.reportedBy?.name} />
          <DetailRow label="Emp ID"     value={report.reportedBy?.empId} />
          <DetailRow label="Type"       value={report.reportedBy?.reporterType || report.reportedBy?.departmentContractor} />
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
    </View>
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

  /* Live Notification Panel */
  livePanel: {
    backgroundColor: "#20364a", borderRadius: 26, padding: 20, gap: 14,
  },
  livePanelPressed: { opacity: 0.88 },
  livePanelHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(126,232,212,0.18)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  liveBadgeText: { color: "#7ee8d4", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  livePanelLabel: { flex: 1, color: "#8da7bc", fontSize: 13, fontWeight: "600" },
  liveContent: { gap: 10 },
  liveTypeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveTypeIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  liveTypeName: { flex: 1, color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  liveHighBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#a24343", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  liveHighText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  liveMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  liveCatChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  liveCatText: { fontSize: 11, fontWeight: "700" },
  liveMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  liveMetaText: { color: "#8da7bc", fontSize: 12 },
  liveRef: { color: "#4e6275", fontSize: 11, fontWeight: "700" },
  liveEmpty: { alignItems: "center", gap: 8, paddingVertical: 12 },
  liveEmptyText: { color: "#4e6275", fontSize: 14 },

  /* Filter */
  filterCard: { backgroundColor: "#fffdf8", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#e5dbc7", gap: 12 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  filterTitle: { color: "#66707d", fontSize: 12, fontWeight: "700", marginRight: 2 },
  filterPills: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  filterPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, backgroundColor: "#f0e9d8" },
  filterPillActive: { backgroundColor: "#20364a" },
  filterPillText: { color: "#5a6472", fontWeight: "700", fontSize: 12 },
  filterPillTextActive: { color: "#7ee8d4", fontSize: 12 },
  customPicker: { gap: 12 },
  customGroup: { gap: 6 },
  customLabel: { fontSize: 11, fontWeight: "700", color: "#8a9098", textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#e5dbc7", backgroundColor: "#f4eee1" },
  chipActive: { backgroundColor: "#1f6f5f", borderColor: "#1f6f5f" },
  chipText: { color: "#5a6472", fontWeight: "700", fontSize: 12 },
  chipTextActive: { color: "#fff", fontSize: 12 },

  /* Error */
  errorCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fdf0f0", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#f5c6c6" },
  errorText: { color: "#a24343", fontWeight: "700", flex: 1 },

  /* Metric grid */
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: {
    flexBasis: "30%", flexGrow: 1, backgroundColor: "#fffdf8",
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: "#e8dfc9",
    gap: 6, overflow: "hidden",
  },
  metricIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
    marginBottom: 2,
  },
  metricValue: { fontSize: 26, fontWeight: "800", color: "#1f2a37", lineHeight: 30 },
  metricLabel: { fontSize: 11, fontWeight: "600", color: "#69727c", lineHeight: 15 },
  metricAccent: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },

  /* Category split */
  splitCard: {
    backgroundColor: "#fffdf8", borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: "#e8dfc9", gap: 14,
  },
  splitHeader: { gap: 2 },
  splitTitle: { fontSize: 16, fontWeight: "800", color: "#1f2a37" },
  splitSub: { fontSize: 12, color: "#8a9098" },
  splitBarTrack: {
    height: 16, borderRadius: 999, flexDirection: "row",
    backgroundColor: "#f0e9d8", overflow: "hidden",
  },
  splitBarLearn: { height: "100%", backgroundColor: "#1f6f5f" },
  splitBarIncident: { height: "100%", backgroundColor: "#b77932" },
  splitLegend: { flexDirection: "row", gap: 20 },
  splitLegendItem: { flexDirection: "row", alignItems: "center", gap: 7, flex: 1 },
  splitDot: { width: 10, height: 10, borderRadius: 5 },
  splitLegendText: { fontSize: 12, color: "#5a6472", fontWeight: "600", flex: 1 },
  splitLegendVal: { fontSize: 13, fontWeight: "800", color: "#1f2a37" },
  splitLegendPct: { fontSize: 11, fontWeight: "600", color: "#8a9098" },

  /* Chart card */
  chartCard: {
    backgroundColor: "#fffdf8", borderRadius: 22,
    borderWidth: 1, borderColor: "#e8dfc9", overflow: "hidden",
  },
  chartCardHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#f7f3ea", paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#ece4d4",
  },
  chartCardIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: "#e8f5f2", justifyContent: "center", alignItems: "center",
  },
  chartCardTitles: { flex: 1, gap: 1 },
  chartCardTitle: { fontSize: 14, fontWeight: "800", color: "#1f2a37" },
  chartCardSubtitle: { fontSize: 11, color: "#8a9098" },
  chartCardBadge: {
    backgroundColor: "#20364a", borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chartCardBadgeText: { color: "#7ee8d4", fontSize: 12, fontWeight: "800" },
  chartCardBody: { padding: 16, gap: 14 },
  chartEmpty: { alignItems: "center", paddingVertical: 20, gap: 8 },
  chartEmptyText: { color: "#a0a8b2", fontSize: 13 },

  /* Animated bar */
  animBar: { gap: 7 },
  animBarHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  animBarRank: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
    minWidth: 36, alignItems: "center",
  },
  animBarRankText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  animBarLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: "#31404d" },
  animBarCountBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    borderWidth: 1.5,
  },
  animBarCount: { fontSize: 12, fontWeight: "800" },
  animBarTrack: {
    height: 22, borderRadius: 999, backgroundColor: "#f0e9d8",
    overflow: "visible", flexDirection: "row", alignItems: "center",
  },
  animBarFill: {
    height: "100%", borderRadius: 999,
    justifyContent: "center", alignItems: "flex-end",
    paddingRight: 8, overflow: "hidden",
  },
  animBarPct: { color: "#fff", fontSize: 10, fontWeight: "800" },
  animBarPctOutside: { fontSize: 10, fontWeight: "700", marginLeft: 6 },

  emptyRow: { paddingVertical: 8 },
  emptyRowText: { color: "#8a9098", fontSize: 13 },

  /* Feed */
  feedSection: { backgroundColor: "#fffdf8", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#e5dbc7" },
  feedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  feedTitle: { fontSize: 18, fontWeight: "800", color: "#1f2a37" },
  feedSubtitle: { color: "#8a9098", fontSize: 12, marginTop: 2 },
  feedBadge: { backgroundColor: "#20364a", borderRadius: 20, minWidth: 32, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center" },
  feedBadgeText: { color: "#7ee8d4", fontSize: 13, fontWeight: "800" },
  feedList: { gap: 10 },

  /* Report card */
  reportCard: { flexDirection: "row", borderRadius: 16, backgroundColor: "#fdfaf4", borderWidth: 1, borderColor: "#e8dfc9", overflow: "hidden" },
  reportCardPressed: { opacity: 0.8 },
  reportIndex: { width: 28, alignItems: "center", justifyContent: "flex-start", paddingTop: 14, backgroundColor: "#f4ede0" },
  reportIndexText: { fontSize: 11, fontWeight: "800", color: "#9a8060" },
  reportAccent: { width: 3 },
  reportBody: { flex: 1, padding: 13, gap: 7 },
  reportTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  reportRef: { fontSize: 11, fontWeight: "700" },
  reportBadges: { flexDirection: "row", gap: 5, alignItems: "center" },
  severityBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#a24343", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  severityBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  catBadgeText: { fontSize: 10, fontWeight: "700" },
  reportTypeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeChip: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  reportType: { flex: 1, fontSize: 15, fontWeight: "800", color: "#1f2a37" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, rowGap: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: "45%" },
  metaText: { fontSize: 11, color: "#5a6472", flex: 1 },
  reportFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#e8f5f2", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1f6f5f" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#1f6f5f" },
  viewCta: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewCtaText: { fontSize: 11, fontWeight: "700" },

  /* See more / all loaded */
  seeMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: "#c8e8e0", backgroundColor: "#f0faf8", marginTop: 2 },
  seeMoreBtnPressed: { backgroundColor: "#ddf2ec" },
  seeMoreText: { color: "#1f6f5f", fontWeight: "700", fontSize: 14 },
  allLoadedRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  allLoadedText: { color: "#8a9098", fontSize: 13 },

  /* Empty state */
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#5a6472" },
  emptyBody: { fontSize: 13, color: "#8a9098", textAlign: "center" },

  /* Modal */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(17,24,39,0.55)", justifyContent: "flex-end" },
  modalDismiss: { flex: 1 },
  modalCard: { height: SCREEN_H * 0.88, backgroundColor: "#fffdf8", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, overflow: "hidden" },

  /* Detail sheet */
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#d9d2c3", alignSelf: "center", marginBottom: 18 },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  sheetIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sheetHeaderText: { flex: 1, gap: 2 },
  sheetRef: { fontSize: 12, fontWeight: "700", color: "#8a9098" },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: "#1f2a37", lineHeight: 26 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f0e9d8", justifyContent: "center", alignItems: "center" },
  closeBtnPressed: { backgroundColor: "#e4d4b5" },
  sheetChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  sheetChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  sheetChipText: { fontSize: 12, fontWeight: "700" },
  sheetScroll: { gap: 12, paddingBottom: 16 },
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
    backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6,
    padding: 3,
  },
  attFileBadge: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: "#f0e9d8", borderWidth: 1, borderColor: "#e8dfc9",
    justifyContent: "center", alignItems: "center", gap: 6, padding: 8,
  },
  attFileName: { fontSize: 10, color: "#7a6b54", textAlign: "center" },
});

