import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { compressProfilePhoto } from "../services/profilePhoto";
import { useInspectorProfile } from "../storage/InspectorProfileContext";

export default function InspectorPhotoEditor() {
  const { requestPhoto, profileRequest } = useInspectorProfile();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const active = useRef(true);
  const working = useRef(false);

  async function loadPhoto() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await requestPhoto();
      if (active.current) setPhoto(saved);
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    // A refresh must not replace an unsaved crop or interrupt an upload.
    if (!preview && !working.current) void loadPhoto();
  }, [profileRequest]);

  async function choosePhoto() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], shape: "oval", quality: 1,
      });
      if (result.canceled || !active.current) return;
      const compressed = await compressProfilePhoto(result.assets[0]);
      if (active.current) setPreview(compressed);
    } catch (failure) {
      if (active.current) setError(failure.message || "Unable to open this photo. Please try another image.");
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  }

  async function savePhoto() {
    if (!preview || working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await requestPhoto("PUT", preview);
      if (active.current) { setPhoto(saved); setPreview(null); }
    } catch (failure) {
      if (active.current) setError(failure.message);
    } finally {
      working.current = false;
      if (active.current) setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        {preview || photo ? <Image source={{ uri: preview || photo }} style={styles.image} accessibilityLabel="Profile photo" /> : <Ionicons name="person-outline" size={52} color="#b8d8d3" />}
      </View>
      {busy && <ActivityIndicator color="#7ee8d4" accessibilityLabel="Processing profile photo" />}
      <Pressable accessibilityRole="button" disabled={busy} onPress={choosePhoto} style={[styles.button, busy && styles.disabled]}>
        <Text style={styles.buttonText}>{preview ? "Choose / crop again" : photo ? "Update profile photo" : "Upload profile photo"}</Text>
      </Pressable>
      <Text style={styles.hint}>Crop and adjust your photo before saving. Automatically compressed below 100 KB.</Text>
      {!!preview && <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={savePhoto} style={styles.button}><Text style={styles.buttonText}>Save photo</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setPreview(null); setError(""); }} style={styles.button}><Text style={styles.buttonText}>Cancel</Text></Pressable>
      </View>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!error && !preview && <Pressable accessibilityRole="button" disabled={busy} onPress={loadPhoto} style={styles.button}><Text style={styles.buttonText}>Retry loading photo</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 12, paddingVertical: 14 },
  circle: { width: 112, height: 112, borderRadius: 56, overflow: "hidden", backgroundColor: "#304e64", borderWidth: 2, borderColor: "#7ee8d4", alignItems: "center", justifyContent: "center" },
  image: { width: "100%", height: "100%" },
  button: { paddingHorizontal: 14, minHeight: 44, justifyContent: "center", borderRadius: 12, backgroundColor: "#304e64" },
  buttonText: { color: "#7ee8d4", fontWeight: "700", textAlign: "center" },
  hint: { color: "#d7dce2", textAlign: "center", fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 12 },
  error: { color: "#fecaca", textAlign: "center", lineHeight: 20 },
  disabled: { opacity: 0.5 },
});
