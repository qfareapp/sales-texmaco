import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable } from "react-native";
import HomeScreen from "./src/screens/HomeScreen";
import AdminScreen from "./src/screens/AdminScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import MyProfileScreen from "./src/screens/MyProfileScreen";
import MyReportsScreen from "./src/screens/MyReportsScreen";
import SelectReportTypeScreen from "./src/screens/SelectReportTypeScreen";
import ReportFormScreen from "./src/screens/ReportFormScreen";
import SuccessScreen from "./src/screens/SuccessScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
        gap: 4,
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

function HomeStack({ isAdmin, onAdminLogin }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: "#f7f3ea" },
        headerTintColor: "#1f2a37",
        headerTitleAlign: "left",
        contentStyle: { backgroundColor: "#f7f3ea" },
      }}
    >
      <Stack.Screen
        name="HomeScreen"
        options={{ title: "", headerLeft: () => <LogoHeader /> }}
      >
        {(props) => <HomeScreen {...props} isAdmin={isAdmin} onAdminLogin={onAdminLogin} />}
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
        name="AdminScreen"
        component={AdminScreen}
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

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);

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
            } else if (route.name === "MyReports" || route.name === "Dashboard") {
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
          {(props) => <HomeStack {...props} isAdmin={isAdmin} onAdminLogin={() => setIsAdmin(true)} />}
        </Tab.Screen>
        {isAdmin ? (
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: "", tabBarLabel: "Dashboard" }}
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
          {(props) => <MyProfileScreen {...props} isAdmin={isAdmin} onAdminLogout={() => setIsAdmin(false)} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
