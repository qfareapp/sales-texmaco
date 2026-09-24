import AsyncStorage from "@react-native-async-storage/async-storage";

const REPORTER_PROFILE_KEY = "incident-reporter-profile";
const inspectorKey = (username) => `${REPORTER_PROFILE_KEY}:${encodeURIComponent(username)}`;

export async function saveReporterProfile(profile, username) {
  await AsyncStorage.setItem(REPORTER_PROFILE_KEY, JSON.stringify(profile));
  if (username) await AsyncStorage.setItem(inspectorKey(username), JSON.stringify(profile));
}

export async function getReporterProfile(username) {
  const raw = await AsyncStorage.getItem(username ? inspectorKey(username) : REPORTER_PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}
