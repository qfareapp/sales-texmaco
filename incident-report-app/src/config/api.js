import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || Constants.manifest2?.extra || {};

export const API_BASE_URL = extra.apiBaseUrl || "http://192.168.1.42:5000/api";
