const LIVE_API_BASE_URL = "https://sales-backend-covv.onrender.com/api";
const DEV_API_BASE_URL = "http://192.168.16.21:5000/api";
const EAS_PROJECT_ID = "ab51ed3f-57bd-45b3-a05b-c78dfb18f4fe";

module.exports = () => {
  const appEnv = process.env.APP_ENV || "development";
  const isProduction = appEnv === "production";

  return {
    expo: {
      name: "TexEhs",
      slug: "tex-ehs",
      version: "1.0.0",
      orientation: "portrait",
      userInterfaceStyle: "light",
      assetBundlePatterns: ["**/*"],
      android: {
        package: "com.texmaco.incidentreport",
        softwareKeyboardLayoutMode: "resize",
      },
      plugins: ["expo-document-picker", "expo-image-picker"],
      extra: {
        appEnv,
        apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || (isProduction ? LIVE_API_BASE_URL : DEV_API_BASE_URL),
        eas: {
          projectId: process.env.EAS_PROJECT_ID || EAS_PROJECT_ID,
        },
      },
    },
  };
};
