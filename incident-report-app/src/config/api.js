import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || Constants.manifest2?.extra || {};

export const API_BASE_URL = (extra.apiBaseUrl || "https://texmaco-backend.onrender.com/api").replace(/\/+$/, "");
export const INSPECTOR_WEB_URL = extra.inspectorWebUrl || "https://texmaco-frontend.vercel.app/quality-dashboard";
