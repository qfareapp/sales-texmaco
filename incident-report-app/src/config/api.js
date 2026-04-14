import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || Constants.manifest2?.extra || {};

export const API_BASE_URL = extra.apiBaseUrl || "http://192.168.16.21:5000/api";
