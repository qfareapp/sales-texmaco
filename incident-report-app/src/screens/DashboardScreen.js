import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getAllIncidentReports } from "../services/incidents";

const HIGH_SEVERITY_TYPES = new Set([
  "Major",
  "Fire Incident",
  "Dangerous Occurrence",
  "Property Damage",
]);

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

  const metrics = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const learningEvents = reports.filter((report) => report.reportCategory === "Learning Event");
    const incidents = reports.filter((report) => report.reportCategory === "Incident");
    const nearMisses = reports.filter((report) => report.reportType === "Near Miss");
    const highSeverity = reports.filter((report) => HIGH_SEVERITY_TYPES.has(report.reportType));
    const withAttachments = reports.filter((report) => (report.attachmentCount || 0) > 0);
    const recentReports = reports.filter((report) => {
      const createdAt = new Date(report.createdAt);
      return createdAt >= sevenDaysAgo;
    });
    const monthReports = reports.filter((report) => {
      const createdAt = new Date(report.createdAt);
      return createdAt >= monthStart;
    });

    const safeDays = reports.length
      ? Math.max(
          0,
          Math.floor(
            (now - new Date(reports[0].createdAt)) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    const locationCounts = countBy(reports, (report) => report.location);
    const departmentCounts = countBy(reports, (report) => report.reportedBy?.department);
    const typeCounts = countBy(reports, (report) => report.reportType);
    const submittedStatusCounts = countBy(reports, () => "Submitted");

    return {
      totalReports: reports.length,
      learningEvents: learningEvents.length,
      incidents: incidents.length,
      nearMisses: nearMisses.length,
      highSeverity: highSeverity.length,
      recentReports: recentReports.length,
      monthReports: monthReports.length,
      attachmentCoverage: reports.length ? Math.round((withAttachments.length / reports.length) * 100) : 0,
      safeDays,
      topLocations: formatTopEntries(locationCounts),
      departmentMix: formatTopEntries(departmentCounts),
      incidentTypes: formatTopEntries(typeCounts, 6),
      statusMix: formatTopEntries(submittedStatusCounts, 3),
      recentFeed: reports.slice(0, 5),
    };
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
        <Text style={styles.eyebrow}>EHS Dashboard</Text>
        <Text style={styles.title}>Environment, health, and safety reporting overview.</Text>
        <Text style={styles.body}>
          Live metrics from submitted learning events and incidents, designed for quick admin review.
        </Text>
      </View>

      {error ? (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.metricGrid}>
        <MetricCard label="Total Reports" value={metrics.totalReports} tone="dark" />
        <MetricCard label="Learning Events" value={metrics.learningEvents} tone="green" />
        <MetricCard label="Incidents" value={metrics.incidents} tone="amber" />
        <MetricCard label="Near Misses" value={metrics.nearMisses} tone="teal" />
        <MetricCard label="High Severity" value={metrics.highSeverity} tone="red" />
        <MetricCard label="This Month" value={metrics.monthReports} tone="navy" />
      </View>

      <View style={styles.sectionRow}>
        <InsightCard
          title="Reporting Pulse"
          primary={`${metrics.recentReports} in last 7 days`}
          secondary={`${metrics.attachmentCoverage}% include attachments`}
          caption={`${metrics.safeDays} days since the oldest logged item in current dashboard dataset`}
        />
        <InsightCard
          title="Current Status"
          primary={metrics.statusMix[0] ? `${metrics.statusMix[0][1]} ${metrics.statusMix[0][0]}` : "No records"}
          secondary="Workflow status tracking can be extended later"
          caption="Status is currently defaulted to Submitted"
        />
      </View>

      <SectionCard title="Incident Type Mix" subtitle="Most reported event classes">
        {metrics.incidentTypes.length ? (
          metrics.incidentTypes.map(([label, value]) => (
            <BarRow key={label} label={label} value={value} max={metrics.totalReports || 1} />
          ))
        ) : (
          <Text style={styles.emptyText}>No incident data available yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Hotspot Locations" subtitle="Areas with the highest reporting activity">
        {metrics.topLocations.length ? (
          metrics.topLocations.map(([label, value]) => (
            <BarRow key={label} label={label} value={value} max={metrics.totalReports || 1} />
          ))
        ) : (
          <Text style={styles.emptyText}>No locations captured yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Department Exposure" subtitle="Reporting volume by reporting department">
        {metrics.departmentMix.length ? (
          metrics.departmentMix.map(([label, value]) => (
            <BarRow key={label} label={label} value={value} max={metrics.totalReports || 1} />
          ))
        ) : (
          <Text style={styles.emptyText}>No department data available yet.</Text>
        )}
      </SectionCard>

      <SectionCard title="Recent Alerts" subtitle="Latest submitted incidents and learning events">
        {metrics.recentFeed.length ? (
          metrics.recentFeed.map((report) => (
            <View key={report._id} style={styles.feedItem}>
              <View style={styles.feedTop}>
                <Text style={styles.feedRef}>{report.referenceNo}</Text>
                <Text style={styles.feedBadge}>{report.reportCategory}</Text>
              </View>
              <Text style={styles.feedTitle}>{report.reportType}</Text>
              <Text style={styles.feedMeta}>
                {report.location || "Unknown location"} | {report.reportedBy?.department || "Unknown department"}
              </Text>
              <Text style={styles.feedMeta}>
                {getDateOnly(report.incidentDate)?.toLocaleDateString() || new Date(report.createdAt).toLocaleDateString()} {report.incidentTime || ""}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent submissions yet.</Text>
        )}
      </SectionCard>
    </ScrollView>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <View style={[styles.metricCard, toneStyles[tone]]}>
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
  const widthPercent = Math.max(10, Math.round((value / max) * 100));

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f3ea",
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 36,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f3ea",
  },
  hero: {
    backgroundColor: "#20364a",
    borderRadius: 28,
    padding: 24,
    gap: 10,
  },
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 24,
    padding: 22,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5dbc7",
  },
  eyebrow: {
    color: "#c7e2dd",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    color: "#ffffff",
  },
  body: {
    color: "#d7dce2",
    lineHeight: 21,
  },
  errorText: {
    color: "#a24343",
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    width: "48%",
    borderRadius: 22,
    padding: 18,
    minHeight: 118,
    justifyContent: "space-between",
  },
  metricValue: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
  },
  metricLabel: {
    color: "#f3f5f7",
    fontWeight: "600",
    lineHeight: 20,
  },
  sectionRow: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 22,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5dbc7",
  },
  insightTitle: {
    color: "#7d8690",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
    fontSize: 12,
  },
  insightPrimary: {
    color: "#25313d",
    fontSize: 24,
    fontWeight: "700",
  },
  insightSecondary: {
    color: "#1f6f5f",
    fontWeight: "700",
  },
  insightCaption: {
    color: "#66707d",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#25313d",
  },
  sectionSubtitle: {
    color: "#66707d",
    lineHeight: 20,
    marginTop: 4,
  },
  sectionBody: {
    marginTop: 16,
    gap: 12,
  },
  barRow: {
    gap: 8,
  },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  barLabel: {
    flex: 1,
    color: "#31404d",
    fontWeight: "600",
  },
  barValue: {
    color: "#20364a",
    fontWeight: "700",
  },
  barTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#ece4d4",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#1f6f5f",
  },
  feedItem: {
    backgroundColor: "#f8f3e8",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  feedTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  feedRef: {
    color: "#1f6f5f",
    fontWeight: "700",
  },
  feedBadge: {
    color: "#7d5a33",
    backgroundColor: "#efe3ce",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "700",
    fontSize: 12,
  },
  feedTitle: {
    color: "#25313d",
    fontSize: 18,
    fontWeight: "700",
  },
  feedMeta: {
    color: "#66707d",
    lineHeight: 19,
  },
  emptyText: {
    color: "#66707d",
  },
});

const toneStyles = StyleSheet.create({
  dark: {
    backgroundColor: "#20364a",
  },
  green: {
    backgroundColor: "#1f6f5f",
  },
  amber: {
    backgroundColor: "#b77932",
  },
  teal: {
    backgroundColor: "#2f7f95",
  },
  red: {
    backgroundColor: "#a24343",
  },
  navy: {
    backgroundColor: "#384b6a",
  },
});
