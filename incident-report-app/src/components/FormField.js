import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function FormField({
  label,
  value,
  onChangeText,
  multiline = false,
  placeholder,
  keyboardType = "default",
  icon,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, multiline && styles.inputWrapMultiline]}>
        {icon && !multiline ? (
          <Ionicons name={icon} size={18} color={focused ? "#1f6f5f" : "#9aa3ac"} style={styles.icon} />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#a0aab3"
          keyboardType={keyboardType}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.textarea, icon && !multiline && styles.inputWithIcon]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4a5568",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ddd5be",
    backgroundColor: "#fdfaf4",
    paddingHorizontal: 14,
  },
  inputWrapFocused: {
    borderColor: "#1f6f5f",
    backgroundColor: "#ffffff",
  },
  inputWrapMultiline: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: "#1f2a37",
    fontSize: 15,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 0,
  },
});
