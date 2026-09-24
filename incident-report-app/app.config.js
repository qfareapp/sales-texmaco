const LIVE_API_BASE_URL = "https://texmaco-backend.onrender.com/api";
const LIVE_INSPECTOR_WEB_URL = "https://texmaco-frontend.vercel.app/quality-dashboard";
const DEV_API_BASE_URL = "http://192.168.16.22:5000/api";
const EAS_PROJECT_ID = "a46a9018-2c3e-41ac-910d-2f19032063dc";

module.exports = () => {
  const appEnv = process.env.APP_ENV || "production";
  const isProduction = appEnv === "production";
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || (isProduction ? LIVE_API_BASE_URL : DEV_API_BASE_URL);
  const devInspectorUrl = new URL(apiBaseUrl);
  devInspectorUrl.port = "5173";
  devInspectorUrl.pathname = "/quality-dashboard";
  const inspectorWebUrl = process.env.EXPO_PUBLIC_INSPECTOR_WEB_URL ||
    (isProduction ? LIVE_INSPECTOR_WEB_URL : devInspectorUrl.toString());

  return {
    expo: {
      name: "texView",
      slug: "tex-ehs",
      owner: "qfareindia",
      version: "1.0.0",
      orientation: "portrait",
      userInterfaceStyle: "light",
      newArchEnabled: false,
      icon: "./assets/tex-short-logo.png",
      splash: {
        image: "./assets/texmaco-logo.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
      assetBundlePatterns: ["**/*"],
      android: {
        package: "com.texmaco.incidentreport",
        softwareKeyboardLayoutMode: "resize",
        adaptiveIcon: {
          foregroundImage: "./assets/tex-short-logo.png",
          backgroundColor: "#ffffff",
        },
      },
      plugins: ["expo-document-picker", "expo-image-picker", ["expo-splash-screen", {
        image: "./assets/texmaco-logo.png",
        imageWidth: 240,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      }]],
      extra: {
        appEnv,
        apiBaseUrl,
        inspectorWebUrl,
        eas: {
          projectId: process.env.EAS_PROJECT_ID || EAS_PROJECT_ID,
        },
      },
    },
  };
};
