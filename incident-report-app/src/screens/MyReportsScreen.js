import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getMyIncidentReports } from "../services/incidents";
import { getReporterProfile } from "../storage/reporterProfile";

export default function MyReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);

  const loadReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const savedProfile = await getReporterProfile();
      setProfile(savedProfile);

      if (!savedProfile?.empId && !savedProfile?.mobileNumber) {
        setReports([]);
        setError("");
        return;
      }

      const myReports = await getMyIncidentReports({
        empId: savedProfile.empId,
        mobileNumber: savedProfile.mobileNumber,
      });

      setReports(myReports);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Unable to load your reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReports(true)} tintColor="#1f6f5f" />}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>My Reports</Text>
        <Text style={styles.title}>Your submitted incident records.</Text>
        {profile ? (
          <Text style={styles.body}>
            Showing reports for {profile.name || "Reporter"} {profile.empId ? `(${profile.empId})` : ""}
          </Text>
        ) : (
          <Text style={styles.body}>Submit one report first so the app can identify your records.</Text>
        )}
      </View>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!profile ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No reporter profile found.</Text>
          <Text style={styles.body}>Once you submit a report, your employee details will be reused here.</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyTitle}>No submissions found yet.</Text>
          <Text style={styles.body}>Your new incident or learning event submissions will appear here.</Text>
        </View>
      ) : (
        reports.map((report) => (
          <Pressable key={report._id} style={styles.reportCard} onPress={() => setSelectedReport(report)}>
            <View style={styles.reportTop}>
              <Text style={styles.reference}>{report.referenceNo || report._id}</Text>
              <Text style={styles.badge}>{report.reportCategory}</Text>
            </View>
            <Text style={styles.reportType}>{report.reportType}</Text>
            <Text style={styles.reportMeta}>Location: {report.location || "Not set"}</Text>
            <Text style={styles.reportMeta}>
              Incident time: {report.incidentDate ? new Date(report.incidentDate).toLocaleDateString() : "--"} {report.incidentTime || ""}
            </Text>
            <Text style={styles.reportMeta}>Attachments: {report.attachmentCount || 0}</Text>
            <Text style={styles.reportMeta}>Submitted: {new Date(report.createdAt).toLocaleString()}</Text>
            <Text style={styles.tapHint}>Tap to view full details</Text>
          </Pressable>
        ))
      )}

      <Modal
        visible={Boolean(selectedReport)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedReport ? (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.reference}>{selectedReport.referenceNo || selectedReport._id}</Text>
                    <Text style={styles.reportType}>{selectedReport.reportType}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedReport(null)}>
                    <Text style={styles.closeText}>Close</Text>
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={styles.modalContent}>
                  <DetailRow label="Current Status" value={selectedReport.currentStatus || "Submitted"} />
                  <DetailRow label="Category" value={selectedReport.reportCategory} />
                  <DetailRow label="Reporter" value={selectedReport.reportedBy?.name} />
                  <DetailRow label="Emp ID" value={selectedReport.reportedBy?.empId} />
                  <DetailRow label="Mobile" value={selectedReport.reportedBy?.mobileNumber} />
                  <DetailRow label="Department / Contractor" value={selectedReport.reportedBy?.departmentContractor} />
                  <DetailRow label="Department" value={selectedReport.reportedBy?.department} />
                  <DetailRow label="Date" value={selectedReport.incidentDate ? new Date(selectedReport.incidentDate).toLocaleDateString() : "--"} />
                  <DetailRow label="Time" value={selectedReport.incidentTime} />
                  <DetailRow label="Location" value={selectedReport.location} />
                  <DetailRow label="Victim Name" value={selectedReport.victimName} />
                  <DetailRow label="Victim Department" value={selectedReport.victimDepartment} />
                  <DetailRow label="Observation" value={selectedReport.observation} />
                  <DetailRow label="Responsible Department" value={selectedReport.responsibleDepartment} />
                  <DetailRow label="Description" value={selectedReport.description} />
                  <DetailRow label="Attachments" value={String(selectedReport.attachmentCount || 0)} />
                  <DetailRow label="Submitted On" value={new Date(selectedReport.createdAt).toLocaleString()} />
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
    gap: 14,
    paddingBottom: 36,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f3ea",
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
    color: "#1f6f5f",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#25313d",
  },
  body: {
    color: "#66707d",
    lineHeight: 21,
  },
  messageCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5dbc7",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#25313d",
  },
  errorText: {
    color: "#a24343",
    fontWeight: "600",
  },
  reportCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5dbc7",
    gap: 8,
  },
  reportTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  reference: {
    color: "#1f6f5f",
    fontWeight: "700",
    fontSize: 16,
  },
  badge: {
    color: "#7d5a33",
    backgroundColor: "#efe3ce",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700",
    overflow: "hidden",
  },
  reportType: {
    fontSize: 21,
    fontWeight: "700",
    color: "#25313d",
  },
  reportMeta: {
    color: "#66707d",
  },
  tapHint: {
    color: "#1f6f5f",
    fontWeight: "600",
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "82%",
    backgroundColor: "#fffdf8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  closeText: {
    color: "#1f6f5f",
    fontWeight: "700",
  },
  modalContent: {
    gap: 12,
    paddingBottom: 16,
  },
  detailRow: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee5d4",
  },
  detailLabel: {
    color: "#7d8690",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    color: "#25313d",
    fontSize: 15,
    lineHeight: 21,
  },
});
