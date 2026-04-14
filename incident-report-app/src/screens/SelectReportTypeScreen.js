import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { REPORT_OPTIONS } from "../constants/reportOptions";

const CATEGORY_META = {
  "Learning Event": {
    icon: "book-outline",
    activeColor: "#1f6f5f",
    activeBg: "#e8f5f2",
    headerBg: "#1f6f5f",
    description: "Report unsafe conditions, acts, or near misses to prevent future incidents.",
  },
  Incident: {
    icon: "warning-outline",
    activeColor: "#b77932",
    activeBg: "#fdf0e4",
    headerBg: "#b77932",
    description: "Log fires, injuries, property damage, or any confirmed incident.",
  },
};

const TYPE_ICONS = {
  "Unsafe Condition": "construct-outline",
  "Unsafe Act": "hand-left-outline",
  "Near Miss": "eye-outline",
  "Fire Incident": "flame-outline",
  "First Aid": "medkit-outline",
  Minor: "bandage-outline",
  Major: "alert-circle-outline",
  Illness: "thermometer-outline",
  "Property Damage": "business-outline",
  "Dangerous Occurrence": "nuclear-outline",
  "Environment Issue": "leaf-outline",
};

export default function SelectReportTypeScreen({ navigation }) {
  const [expandedCategory, setExpandedCategory] = useState("Learning Event");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Page header */}
      <View style={styles.pageHeader}>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>STEP 1 OF 3</Text>
        </View>
        <Text style={styles.heading}>Choose a report path</Text>
        <Text style={styles.subheading}>
          Each category uses different required fields. Select the one that matches your event.
        </Text>
      </View>

      {Object.entries(REPORT_OPTIONS).map(([category, types]) => {
        const meta = CATEGORY_META[category];
        const isOpen = expandedCategory === category;

        return (
          <View key={category} style={styles.section}>
            {/* Category toggle header */}
            <Pressable
              style={({ pressed }) => [
                styles.sectionToggle,
                isOpen && { borderColor: meta.activeColor, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
                pressed && !isOpen && styles.sectionTogglePressed,
              ]}
              onPress={() => setExpandedCategory((c) => (c === category ? "" : category))}
            >
              <View style={styles.toggleLeft}>
                <View style={[styles.categoryIconWrap, isOpen && { backgroundColor: meta.activeColor }]}>
                  <Ionicons
                    name={meta.icon}
                    size={20}
                    color={isOpen ? "#fff" : meta.activeColor}
                  />
                </View>
                <View style={styles.toggleLabelGroup}>
                  <Text style={[styles.sectionTitle, isOpen && { color: meta.activeColor }]}>{category}</Text>
                  <Text style={styles.sectionTypeCount}>{types.length} types available</Text>
                </View>
              </View>
              <View style={[styles.chevronWrap, isOpen && { backgroundColor: meta.activeBg }]}>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={isOpen ? meta.activeColor : "#9aa3ac"}
                />
              </View>
            </Pressable>

            {/* Description strip when open */}
            {isOpen && (
              <View style={[styles.descStrip, { borderColor: meta.activeColor }]}>
                <Ionicons name="information-circle-outline" size={15} color={meta.activeColor} />
                <Text style={[styles.descText, { color: meta.activeColor }]}>{meta.description}</Text>
              </View>
            )}

            {/* Type list */}
            {isOpen && (
              <View style={[styles.dropdown, { borderColor: meta.activeColor }]}>
                {types.map((type, index) => (
                  <Pressable
                    key={`${category}-${type}`}
                    style={({ pressed }) => [
                      styles.optionRow,
                      index === types.length - 1 && styles.optionRowLast,
                      pressed && { backgroundColor: meta.activeBg },
                    ]}
                    onPress={() => navigation.navigate("ReportForm", { reportCategory: category, reportType: type })}
                  >
                    <View style={[styles.typeIconWrap, { backgroundColor: meta.activeBg }]}>
                      <Ionicons
                        name={TYPE_ICONS[type] ?? "ellipse-outline"}
                        size={17}
                        color={meta.activeColor}
                      />
                    </View>
                    <Text style={styles.optionText}>{type}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#b0bac4" style={styles.optionArrow} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Helper note */}
      <View style={styles.helperBox}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#1f6f5f" />
        <Text style={styles.helperText}>
          Not sure which to pick? A <Text style={styles.helperBold}>Learning Event</Text> is anything that did not yet cause harm. An <Text style={styles.helperBold}>Incident</Text> is when harm or damage has already occurred.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f3ea",
  },
  container: {
    padding: 18,
    gap: 14,
    paddingBottom: 36,
  },

  /* Page header */
  pageHeader: {
    gap: 8,
    marginBottom: 4,
  },
  stepPill: {
    alignSelf: "flex-start",
    backgroundColor: "#20364a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  stepPillText: {
    color: "#7ee8d4",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heading: {
    fontSize: 28,
    lineHeight: 35,
    color: "#20364a",
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subheading: {
    color: "#66707d",
    lineHeight: 21,
    fontSize: 14,
  },

  /* Section */
  section: {
    gap: 0,
  },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: "#fffdf8",
    borderWidth: 1.5,
    borderColor: "#e2d7c0",
  },
  sectionTogglePressed: {
    backgroundColor: "#f5eddc",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0e9d8",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleLabelGroup: {
    gap: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1f3242",
  },
  sectionTypeCount: {
    fontSize: 12,
    color: "#8a9098",
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f0e9d8",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Description strip */
  descStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fffdf8",
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "#e2d7c0",
  },
  descText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Dropdown */
  dropdown: {
    backgroundColor: "#fffdf8",
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: "#e2d7c0",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0e9d8",
    gap: 12,
  },
  optionRowLast: {
    borderBottomWidth: 0,
  },
  typeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#243240",
  },
  optionArrow: {
    marginLeft: "auto",
  },

  /* Helper note */
  helperBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#e8f5f2",
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: "#2e5a50",
    lineHeight: 20,
  },
  helperBold: {
    fontWeight: "700",
  },
});
