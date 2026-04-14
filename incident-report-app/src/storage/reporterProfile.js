import AsyncStorage from "@react-native-async-storage/async-storage";

const REPORTER_PROFILE_KEY = "incident-reporter-profile";

export async function saveReporterProfile(profile) {
  await AsyncStorage.setItem(REPORTER_PROFILE_KEY, JSON.stringify(profile));
}

export async function getReporterProfile() {
  const raw = await AsyncStorage.getItem(REPORTER_PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}
