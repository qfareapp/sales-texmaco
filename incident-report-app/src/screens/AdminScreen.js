import { StyleSheet, Text, View } from "react-native";

export default function AdminScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.eyebrow}>Admin Access</Text>
        <Text style={styles.title}>Admin login successful.</Text>
        <Text style={styles.body}>
          This area is reserved for admin-only actions. We can wire status updates, report review, and dashboards here next.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f7f3ea",
  },
  panel: {
    backgroundColor: "#20364a",
    borderRadius: 26,
    padding: 24,
    gap: 10,
  },
  eyebrow: {
    color: "#b8d8d3",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
  },
  body: {
    color: "#d7dce2",
    lineHeight: 21,
  },
});
