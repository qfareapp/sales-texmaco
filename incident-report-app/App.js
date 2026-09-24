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
import MyWagonReportsScreen from "./src/screens/MyWagonReportsScreen";
import SelectReportTypeScreen from "./src/screens/SelectReportTypeScreen";
import ReportFormScreen from "./src/screens/ReportFormScreen";
import SuccessScreen from "./src/screens/SuccessScreen";
import InspectorScreen from "./src/screens/InspectorScreen";
import { InspectorProfileProvider } from "./src/storage/InspectorProfileContext";

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

function BackButton({ navigation, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress || (() => navigation.goBack())}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        paddingVertical: 6,
        paddingHorizontal: 4,
        borderRadius: 10,
        opacity: pressed ? 0.6 : 1,
      })}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="chevron-back" size={24} color="#1f2a37" />
      <Text style={{ color: "#1f2a37", fontWeight: "600", fontSize: 15 }}>Back</Text>
    </Pressable>
  );
}

function HomeStack({ onAdminLogin }) {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen
        name="HomeScreen"
        options={({ navigation }) => ({
          title: "",
          headerLeft: () => <BackButton navigation={navigation} onPress={() => navigation.navigate("Home")} />,
        })}
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
        options={{ title: "" }}
      />
    </Stack.Navigator>
  );
}

function MyReportsStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="FilledWagonForms" component={MyWagonReportsScreen} options={({ navigation }) => ({
        title: "My Reports",
        headerLeft: () => <BackButton navigation={navigation} onPress={() => navigation.getParent()?.navigate("Home")} />,
      })} />
      <Stack.Screen name="SubmittedIncidents" component={MyReportsScreen} options={({ navigation }) => ({
        title: "Submitted Incidents", headerLeft: () => <BackButton navigation={navigation} />,
      })} />
    </Stack.Navigator>
  );
}

/* ── Custom JS splash screen ── */
function AppSplash({ onReady }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const loadingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /* Hide the native splash, show our custom one */
    SplashScreen.hideAsync().catch(() => {});
    const loadingAnimation = Animated.loop(Animated.timing(loadingAnim, {
      toValue: 1,
      duration: 1100,
      useNativeDriver: true,
    }));
    loadingAnimation.start();

    /* After a short hold, fade out */
    const hold = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onReady());
    }, 1800);

    return () => {
      clearTimeout(hold);
      loadingAnimation.stop();
      fadeAnim.stopAnimation();
    };
  }, []);

  return (
    <Animated.View style={[styles.splash, { opacity: fadeAnim }]}>
      <View style={styles.splashContent}>
        <Image
          source={require("./assets/texmaco-logo.png")}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <View style={styles.loadingTrack} accessibilityRole="progressbar" accessibilityLabel="App loading">
          <Animated.View style={[styles.loadingBar, { transform: [{ translateX: loadingAnim.interpolate({ inputRange: [0, 1], outputRange: [-72, 240] }) }] }]} />
        </View>
        <Text style={styles.loadingLabel}>Loading…</Text>
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
        <StatusBar style="dark" />
        <AppSplash onReady={() => setAppReady(true)} />
      </>
    );
  }

  return (
    <InspectorProfileProvider>
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        initialRouteName="Home"
        backBehavior="initialRoute"
        detachInactiveScreens={false}
        screenOptions={({ route }) => ({
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#f7f3ea" },
          headerTintColor: "#1f2a37",
          headerTitleAlign: "left",
          tabBarActiveTintColor: "#1f6f5f",
          tabBarInactiveTintColor: "#7c8692",
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, size, focused }) => {
            let iconName;
            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Incident") {
              iconName = focused ? "alert-circle" : "alert-circle-outline";
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
          component={InspectorScreen}
          options={{ headerShown: false, tabBarLabel: "Home", freezeOnBlur: false }}
        />

        {isAdmin ? (
          <Tab.Screen
            name="Reports"
            component={DashboardScreen}
            options={{ title: "", tabBarLabel: "Reports" }}
          />
        ) : (
          <Tab.Screen
            name="MyReports"
            component={MyReportsStack}
            options={{ headerShown: false, tabBarLabel: "My Reports", popToTopOnBlur: true }}
          />
        )}

        <Tab.Screen
          name="Incident"
          options={{
            headerShown: false,
            tabBarLabel: "Report Incident",
            tabBarAccessibilityLabel: "Report an incident",
            tabBarActiveTintColor: "#dc2626",
            tabBarInactiveTintColor: "#dc2626",
            tabBarLabelStyle: { fontSize: 11, fontWeight: "800" },
          }}
        >
          {isAdmin
            ? () => <AdminHomeStack />
            : (props) => <HomeStack {...props} onAdminLogin={() => setIsAdmin(true)} />}
        </Tab.Screen>

        <Tab.Screen
          name="MyProfile"
          options={({ navigation }) => ({
            title: "", tabBarLabel: "My Profile",
            headerLeft: () => <BackButton navigation={navigation} onPress={() => navigation.navigate("Home")} />,
          })}
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
    </InspectorProfileProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  splashContent: {
    alignItems: "center",
    gap: 16,
  },
  splashLogo: {
    width: 240,
    height: 100,
    marginBottom: 20,
  },
  loadingTrack: { width: 240, height: 5, borderRadius: 3, backgroundColor: "#e8eeeb", overflow: "hidden" },
  loadingBar: { width: 72, height: 5, borderRadius: 3, backgroundColor: "#1f6f5f" },
  loadingLabel: { fontSize: 14, color: "#64748b" },
});
