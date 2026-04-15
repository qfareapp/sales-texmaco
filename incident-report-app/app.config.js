const LIVE_API_BASE_URL = "https://sales-texmaco.onrender.com/api";
const DEV_API_BASE_URL = "http://192.168.1.42:5000/api";
const EAS_PROJECT_ID = "ab51ed3f-57bd-45b3-a05b-c78dfb18f4fe";

module.exports = () => {
  const appEnv = process.env.APP_ENV || "development";
  const isProduction = appEnv === "production";

  return {
    expo: {
      name: "TexHSE",
      slug: "tex-ehs",
      version: "1.0.0",
      orientation: "portrait",
      userInterfaceStyle: "light",
      icon: "./assets/texhse-icon.png",
      splash: {
        image: "./assets/texhse-icon.png",
        resizeMode: "contain",
        backgroundColor: "#20364a",
      },
      assetBundlePatterns: ["**/*"],
      android: {
        package: "com.texmaco.incidentreport",
        softwareKeyboardLayoutMode: "resize",
        adaptiveIcon: {
          foregroundImage: "./assets/texhse-icon.png",
          backgroundColor: "#20364a",
        },
      },
      plugins: ["expo-document-picker", "expo-image-picker", "expo-splash-screen"],
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
