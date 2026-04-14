import { Pressable, StyleSheet, Text, View } from "react-native";

export default function SuccessScreen({ navigation, route }) {
  const { reportCategory, reportType, reportId } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Report submitted</Text>
        <Text style={styles.title}>The incident has been recorded in the backend.</Text>
        <Text style={styles.meta}>{reportCategory} / {reportType}</Text>
        <Text style={styles.reportId}>Reference: {reportId}</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("Home")}>
        <Text style={styles.primaryText}>Back To Home</Text>
      </Pressable>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => navigation.replace("SelectReportType")}
      >
        <Text style={styles.secondaryText}>Report Another Incident</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    gap: 16,
    backgroundColor: "#f7f3ea",
  },
  panel: {
    backgroundColor: "#fffdf8",
    borderRadius: 26,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5dbc7",
  },
  eyebrow: {
    color: "#1f6f5f",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: "#25313d",
  },
  meta: {
    color: "#6f7782",
  },
  reportId: {
    color: "#8b5c28",
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#20364a",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccbda1",
  },
  secondaryText: {
    color: "#7d5a33",
    fontWeight: "700",
  },
});
