import { useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import HomeScreen from "./src/screens/HomeScreen";
import AdminScreen from "./src/screens/AdminScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import MyReportsScreen from "./src/screens/MyReportsScreen";
import SelectReportTypeScreen from "./src/screens/SelectReportTypeScreen";
import ReportFormScreen from "./src/screens/ReportFormScreen";
import SuccessScreen from "./src/screens/SuccessScreen";

/* Keep native splash visible until we're ready */
SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const HEADER_OPTS = {
  headerShadowVisible: false,
  headerStyle: { backgroundColor: "#f7f3ea" },
  headerTintColor: "#1f2a37",
  headerTitleAlign: "left",
  contentStyle: { backgroundColor: "#f7f3ea" },
};

function LogoHeader() {
  return (
    <Image
      source={require("./assets/texmaco-logo.png")}
      style={{ width: 110, height: 36, resizeMode: "contain" }}
    />
  );
}

function BackButton({ navigation }) {
  return (
    <Pressable
      onPress={() => navigation.goBack()}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: 10,
        opacity: pressed ? 0.6 : 1,
      })}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={24} color="#1f2a37" />
    </Pressable>
  );
}

function HomeStack({ onAdminLogin }) {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen
        name="HomeScreen"
        options={{ title: "", headerLeft: () => <LogoHeader /> }}
      >
        {(props) => <HomeScreen {...props} onAdminLogin={onAdminLogin} />}
      </Stack.Screen>
      <Stack.Screen
        name="SelectReportType"
        component={SelectReportTypeScreen}
        options={({ navigation }) => ({
          title: "",
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="ReportForm"
        component={ReportFormScreen}
        options={({ navigation }) => ({
          title: "",
          headerLeft: () => <BackButton navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="Success"
        component={SuccessScreen}
        options={{ title: "", gestureEnabled: false, headerLeft: () => null }}
      />
    </Stack.Navigator>
  );
}

function AdminHomeStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen
        name="AdminHome"
        component={AdminScreen}
        options={{ title: "", headerLeft: () => <LogoHeader /> }}
      />
    </Stack.Navigator>
  );
}

/* ── Custom JS splash screen ── */
function AppSplash({ onReady }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    /* Hide the native splash, show our custom one */
    SplashScreen.hideAsync().catch(() => {});

    /* After a short hold, fade out */
    const hold = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onReady());
    }, 1800);

    return () => clearTimeout(hold);
  }, []);

  return (
    <Animated.View style={[styles.splash, { opacity: fadeAnim }]}>
      <View style={styles.splashContent}>
        <Image
          source={require("./assets/texhse-icon.png")}
          style={styles.splashIcon}
          resizeMode="contain"
        />
        <Text style={styles.splashName}>TexHSE</Text>
        <Text style={styles.splashTagline}>Safety Reporting Platform</Text>
      </View>
      <View style={styles.splashFooter}>
        <Image
          source={require("./assets/texmaco-logo.png")}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    </Animated.View>
  );
}

export default function App() {
  const [isAdmin, setIsAdmin]   = useState(false);
  const [appReady, setAppReady] = useState(false);

  if (!appReady) {
    return (
      <>
        <StatusBar style="light" />
        <AppSplash onReady={() => setAppReady(true)} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f7f3ea" },
          headerTintColor: "#1f2a37",
          headerLeft: () => <LogoHeader />,
          headerTitleAlign: "left",
          tabBarActiveTintColor: "#1f6f5f",
          tabBarInactiveTintColor: "#7c8692",
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;
            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "MyReports" || route.name === "Reports") {
              iconName = focused ? "document-text" : "document-text-outline";
            } else {
              iconName = focused ? "person-circle" : "person-circle-outline";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarStyle: {
            height: 68,
            paddingBottom: 10,
            paddingTop: 8,
            backgroundColor: "#fffdf8",
            borderTopColor: "#e6dcc7",
          },
          sceneStyle: { backgroundColor: "#f7f3ea" },
        })}
      >
        <Tab.Screen
          name="Home"
          options={{ headerShown: false, tabBarLabel: "Home" }}
        >
          {isAdmin
            ? () => <AdminHomeStack />
            : (props) => <HomeStack {...props} onAdminLogin={() => setIsAdmin(true)} />}
        </Tab.Screen>

        {isAdmin ? (
          <Tab.Screen
            name="Reports"
            component={DashboardScreen}
            options={{ title: "", tabBarLabel: "Reports" }}
          />
        ) : (
          <Tab.Screen
            name="MyReports"
            component={MyReportsScreen}
            options={{ title: "", tabBarLabel: "My Reports" }}
          />
        )}

        <Tab.Screen
          name="MyProfile"
          options={{ title: "", tabBarLabel: "My Profile" }}
        >
          {(props) => (
            <MyProfileScreen
              {...props}
              isAdmin={isAdmin}
              onAdminLogout={() => setIsAdmin(false)}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#20364a",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 140,
    paddingBottom: 52,
  },
  splashContent: {
    alignItems: "center",
    gap: 16,
  },
  splashIcon: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
  splashName: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 8,
  },
  splashTagline: {
    color: "#7ee8d4",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  splashFooter: {
    alignItems: "center",
    gap: 6,
  },
  splashLogo: {
    width: 100,
    height: 32,
    opacity: 0.5,
  },
});
