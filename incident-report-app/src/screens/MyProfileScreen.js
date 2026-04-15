import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";

export default function MyProfileScreen({ isAdmin, onAdminLogout, navigation }) {
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
    Alert.alert("Admin Logout", "Do you want to logout from admin mode?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          onAdminLogout?.();
          navigation.navigate("Home");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>My Profile</Text>
        <Text style={styles.title}>Profile details can be prefilled here later.</Text>
        <Text style={styles.body}>
          This screen is ready for employee info, department defaults, and contact details used in the report form.
        </Text>
      </View>

      {isAdmin ? (
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout Admin</Text>
        </Pressable>
      ) : null}

      <View style={styles.supportWrap}>
        <Text style={styles.supportText}>For support or queries:</Text>
        <Pressable onPress={handleSupportEmail}>
          <Text style={styles.supportEmail}>pranjal.mullick@texmaco.in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
