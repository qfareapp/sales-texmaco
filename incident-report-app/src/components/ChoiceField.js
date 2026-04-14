import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ChoiceField({ label, options, value, onChange }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !selected && styles.optionPressed,
              ]}
            >
              {selected ? (
                <Ionicons name="checkmark-circle" size={15} color="#ffffff" style={styles.checkIcon} />
              ) : null}
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4a5568",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#ddd5be",
    backgroundColor: "#fdfaf4",
    gap: 5,
  },
  optionSelected: {
    backgroundColor: "#1f6f5f",
    borderColor: "#1f6f5f",
  },
  optionPressed: {
    backgroundColor: "#f0e9d8",
  },
  checkIcon: {
    marginTop: 0,
  },
  optionText: {
    color: "#5b6570",
    fontWeight: "600",
    fontSize: 14,
  },
  optionTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
