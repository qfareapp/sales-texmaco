import { useCallback } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useInspectorProfile } from "../storage/InspectorProfileContext";
import InspectorPhotoEditor from "./InspectorPhotoEditor";

export default function MyProfileScreen({ onAdminLogout, navigation }) {
  const { profileState, setProfileState, refreshProfile, setInspectorSession, inspectorSession } = useInspectorProfile();
  useFocusEffect(useCallback(() => { refreshProfile(); }, [refreshProfile]));
  const profile = profileState.data;
  const date = (value) => value ? new Date(value).toLocaleString() : "Not available";
  const fields = profile ? [
    ["Name", profile.name], ["Username", profile.username], ["Account role", profile.role],
    ["Serial number", profile.slNo], ["Job role", profile.jobRole], ["Bay", profile.bay],
    ["Agency", profile.agency], ["Account status", profile.isActive ? "Active" : "Inactive"],
    ["Password change required", profile.mustChangePassword ? "Yes" : "No"],
    ["Account created", date(profile.createdAt)], ["Last updated", date(profile.updatedAt)],
    ["Account ID", profile._id],
  ] : [];
  async function handleSupportEmail() {
    const mailtoUrl = "mailto:pranjal.mullick@texmaco.in";
    const supported = await Linking.canOpenURL(mailtoUrl);

    if (supported) {
      await Linking.openURL(mailtoUrl);
    } else {
      Alert.alert("Email not available", "No email application is configured on this device.");
    }
  }

  function handleLogout() {
    Alert.alert("Logout", "Log out of the app? Unsaved inspection changes will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            // Persist the request so a closed/offline WebView also logs out on restart.
            await AsyncStorage.setItem("inspectorLogoutPending", "true");
            setProfileState({ status: "signed-out" });
            setInspectorSession(null);
            onAdminLogout?.();
            navigation.navigate("Home", { logoutRequest: Date.now() });
          } catch {
            Alert.alert("Logout failed", "Please try again.");
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} alwaysBounceVertical refreshControl={<RefreshControl refreshing={profileState.status === "loading"} onRefresh={refreshProfile} enabled={Boolean(inspectorSession?.signedIn)} tintColor="#276c65" colors={["#276c65"]} />}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>My Profile</Text>
        <Text style={styles.title}>{profile?.name || profile?.username || "Inspector Profile"}</Text>
        {inspectorSession?.signedIn && inspectorSession.role === "ground-inspector" && <InspectorPhotoEditor key={inspectorSession.username} />}
        {profileState.status === "loading" && <ActivityIndicator color="#fff" accessibilityLabel="Loading inspector profile" />}
        {profileState.status === "signed-out" && <Text style={styles.body}>Log in as an inspector from Home to view your profile.</Text>}
        {profileState.status === "error" && <Text style={styles.body}>{profileState.message || "Unable to load your profile."}</Text>}
        {profileState.status === "ready" && fields.map(([label, value]) => (
          <View key={label} style={styles.field}>
            <Text style={styles.eyebrow}>{label}</Text>
            <Text selectable style={styles.body}>{value === undefined || value === null || value === "" ? "Not available" : String(value)}</Text>
          </View>
        ))}
        {profileState.status !== "signed-out" && (
          <Pressable accessibilityRole="button" onPress={refreshProfile} disabled={profileState.status === "loading"}>
            <Text style={styles.refresh}>{profileState.status === "loading" ? "Loading profile..." : "Refresh Profile"}</Text>
          </Pressable>
        )}
      </View>

        <Pressable accessibilityRole="button" style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>

      <View style={styles.supportWrap}>
        <Text style={styles.supportText}>For support or queries:</Text>
        <Pressable onPress={handleSupportEmail}>
          <Text style={styles.supportEmail}>pranjal.mullick@texmaco.in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
    backgroundColor: "#f7f3ea",
  },
  card: {
    backgroundColor: "#20364a",
    borderRadius: 24,
    padding: 22,
    gap: 10,
  },
  field: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#40576a" },
  refresh: { color: "#7ee8d4", fontWeight: "700", paddingVertical: 12 },
  eyebrow: {
    color: "#b8d8d3",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#ffffff",
  },
  body: {
    color: "#d7dce2",
    lineHeight: 21,
  },
  logoutButton: {
    backgroundColor: "#fffdf8",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0c9c9",
  },
  logoutButtonText: {
    color: "#a24343",
    fontWeight: "700",
    fontSize: 16,
  },
  supportWrap: {
    marginTop: "auto",
    alignItems: "center",
    paddingTop: 16,
    gap: 4,
  },
  supportText: {
    color: "#66707d",
    fontSize: 14,
  },
  supportEmail: {
    color: "#1f6f5f",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
