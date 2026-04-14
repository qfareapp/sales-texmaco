import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen({ navigation, isAdmin, onAdminLogin }) {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdmin) {
      navigation.navigate("AdminScreen");
    }
  }, [isAdmin, navigation]);

  function handleAdminLogin() {
    if (username === "admin" && password === "PassWord") {
      setShowAdminLogin(false);
      setUsername("");
      setPassword("");
      setError("");
      onAdminLogin?.();
      navigation.navigate("AdminScreen");
      return;
    }
    setError("Invalid admin username or password.");
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Banner */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons name="shield-checkmark" size={14} color="#7ee8d4" />
          <Text style={styles.heroBadgeText}>Factory Safety Platform</Text>
        </View>
        <Text style={styles.heroTitle}>Report. Track.{"\n"}Stay Safe.</Text>
        <Text style={styles.heroBody}>
          Quickly log safety incidents, learning events, and near misses — right from the factory floor.
        </Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNumber}>2</Text>
            <Text style={styles.heroStatLabel}>Report Types</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNumber}>12</Text>
            <Text style={styles.heroStatLabel}>Incident Categories</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNumber}>7</Text>
            <Text style={styles.heroStatLabel}>Locations</Text>
          </View>
        </View>
      </View>

      {/* Primary CTA */}
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
        onPress={() => navigation.navigate("SelectReportType")}
      >
        <View style={styles.primaryButtonContent}>
          <View style={styles.primaryButtonIcon}>
            <Ionicons name="add-circle" size={28} color="#fffaf0" />
          </View>
          <View style={styles.primaryButtonText}>
            <Text style={styles.primaryButtonTitle}>Report an Incident</Text>
            <Text style={styles.primaryButtonSub}>Safety, incident, or learning event</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#fef0d6" />
      </Pressable>

      {/* Section: What You Can Report */}
      <Text style={styles.sectionLabel}>WHAT YOU CAN REPORT</Text>
      <View style={styles.categoryRow}>
        <View style={[styles.categoryCard, { backgroundColor: "#e8f5f2" }]}>
          <View style={[styles.categoryIcon, { backgroundColor: "#1f6f5f" }]}>
            <Ionicons name="book-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.categoryTitle}>Learning Event</Text>
          <Text style={styles.categoryDesc}>Unsafe condition, unsafe act, near miss</Text>
        </View>
        <View style={[styles.categoryCard, { backgroundColor: "#fdf0e4" }]}>
          <View style={[styles.categoryIcon, { backgroundColor: "#b77932" }]}>
            <Ionicons name="warning-outline" size={20} color="#fff" />
          </View>
          <Text style={styles.categoryTitle}>Incident</Text>
          <Text style={styles.categoryDesc}>Fire, injury, property damage & more</Text>
        </View>
      </View>

      {/* Section: How It Works */}
      <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
      <View style={styles.stepsCard}>
        <StepRow icon="layers-outline" step="1" title="Select a category" desc="Choose between Learning Event or Incident" />
        <View style={styles.stepDivider} />
        <StepRow icon="list-outline" step="2" title="Pick incident type" desc="Narrow down the specific type of event" />
        <View style={styles.stepDivider} />
        <StepRow icon="create-outline" step="3" title="Fill in the details" desc="Describe what happened and attach photos" />
        <View style={styles.stepDivider} />
        <StepRow icon="checkmark-circle-outline" step="4" title="Submit your report" desc="Your report is sent for review instantly" />
      </View>

      {/* Admin Login */}
      <Pressable
        style={({ pressed }) => [styles.adminButton, pressed && styles.adminButtonPressed]}
        onPress={() => setShowAdminLogin(true)}
      >
        <Ionicons name="lock-closed-outline" size={18} color="#7d5a33" />
        <Text style={styles.adminButtonText}>Admin Login</Text>
      </Pressable>

      {/* Admin Login Modal */}
      <Modal
        visible={showAdminLogin}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdminLogin(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="lock-closed" size={22} color="#1f6f5f" />
              </View>
              <Text style={styles.modalTitle}>Admin Login</Text>
              <Text style={styles.modalSubtitle}>Enter your credentials to continue</Text>
            </View>
            <TextInput
              value={username}
              onChangeText={(v) => { setUsername(v); setError(""); }}
              placeholder="Username"
              placeholderTextColor="#8f96a1"
              style={styles.input}
              autoCapitalize="none"
            />
            <TextInput
              value={password}
              onChangeText={(v) => { setPassword(v); setError(""); }}
              placeholder="Password"
              placeholderTextColor="#8f96a1"
              style={styles.input}
              secureTextEntry
            />
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#a24343" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalSecondary}
                onPress={() => { setShowAdminLogin(false); setError(""); setUsername(""); setPassword(""); }}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={handleAdminLogin}>
                <Text style={styles.modalPrimaryText}>Login</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StepRow({ icon, step, title, desc }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumberWrap}>
        <Text style={styles.stepNumber}>{step}</Text>
      </View>
      <Ionicons name={icon} size={20} color="#1f6f5f" style={styles.stepIcon} />
      <View style={styles.stepText}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#f7f3ea",
  },
  container: {
    padding: 18,
    paddingBottom: 36,
    gap: 16,
  },

  /* Hero */
  hero: {
    backgroundColor: "#20364a",
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(126,232,212,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeText: {
    color: "#7ee8d4",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroBody: {
    color: "#c4ced8",
    lineHeight: 22,
    fontSize: 14,
  },
  heroStats: {
    flexDirection: "row",
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    justifyContent: "space-around",
    alignItems: "center",
  },
  heroStat: {
    alignItems: "center",
    flex: 1,
  },
  heroStatNumber: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: "#8da7bc",
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  /* Primary CTA */
  primaryButton: {
    backgroundColor: "#b77932",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#b77932",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonPressed: {
    opacity: 0.88,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  primaryButtonIcon: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 8,
  },
  primaryButtonText: {
    gap: 3,
  },
  primaryButtonTitle: {
    color: "#fffaf0",
    fontSize: 18,
    fontWeight: "800",
  },
  primaryButtonSub: {
    color: "#fef0d6",
    fontSize: 13,
  },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8a7f6e",
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: -4,
  },

  /* Categories */
  categoryRow: {
    flexDirection: "row",
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2a37",
  },
  categoryDesc: {
    fontSize: 12,
    color: "#5a6472",
    lineHeight: 17,
  },

  /* Steps */
  stepsCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e8dfc9",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
  },
  stepNumberWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#20364a",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  stepNumber: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  stepIcon: {
    marginTop: 1,
  },
  stepText: {
    flex: 1,
    gap: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2a37",
  },
  stepDesc: {
    fontSize: 12,
    color: "#69727c",
    lineHeight: 17,
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#f0e9d8",
    marginVertical: 6,
    marginLeft: 34,
  },

  /* Admin Button */
  adminButton: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ccbda1",
    backgroundColor: "#fffdf8",
    marginTop: 4,
  },
  adminButtonPressed: {
    backgroundColor: "#f5eddc",
  },
  adminButtonText: {
    color: "#7d5a33",
    fontWeight: "700",
    fontSize: 15,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 26,
    padding: 24,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e5dbc7",
  },
  modalHeader: {
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#e8f5f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#25313d",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#69727c",
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d9d2c3",
    backgroundColor: "#fffdf8",
    color: "#1f2a37",
    fontSize: 15,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    color: "#a24343",
    fontWeight: "600",
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccbda1",
  },
  modalSecondaryText: {
    color: "#7d5a33",
    fontWeight: "700",
  },
  modalPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#1f6f5f",
  },
  modalPrimaryText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
