import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import ChoiceField from "../components/ChoiceField";
import FormField from "../components/FormField";
import {
  DEPARTMENT_CONTRACTOR_OPTIONS,
  DEPARTMENT_OPTIONS,
  LOCATION_OPTIONS,
} from "../constants/reportOptions";
import { submitIncidentReport } from "../services/incidents";
import { saveReporterProfile } from "../storage/reporterProfile";

const initialState = {
  reportedByName: "",
  departmentContractor: "",
  empId: "",
  mobileNumber: "",
  department: "",
  observation: "",
  responsibleDepartment: "",
  incidentDate: "",
  incidentTime: "",
  location: "",
  victimName: "",
  victimDepartment: "",
  description: "",
  attachments: [],
};

const MAX_IMAGE_BYTES = 100 * 1024;

const CATEGORY_COLOR = {
  "Learning Event": "#1f6f5f",
  Incident: "#b77932",
};

const CATEGORY_BG = {
  "Learning Event": "#e8f5f2",
  Incident: "#fdf0e4",
};

const CATEGORY_ICON = {
  "Learning Event": "book-outline",
  Incident: "warning-outline",
};

function estimateBase64Bytes(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.ceil((base64.length * 3) / 4) - padding;
}

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Ionicons name={icon} size={16} color="#1f6f5f" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SelectListField({ label, value, options, placeholder, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.selectField}>
      <Text style={styles.selectLabel}>{label}</Text>
      <Pressable
        style={({ pressed }) => [
          styles.selectTrigger,
          open && styles.selectTriggerOpen,
          pressed && !open && styles.selectTriggerPressed,
        ]}
        onPress={() => setOpen((c) => !c)}
      >
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>
          {value || placeholder}
        </Text>
        <View style={[styles.selectChevronWrap, open && styles.selectChevronWrapOpen]}>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={16}
            color={open ? "#1f6f5f" : "#9aa3ac"}
          />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.selectMenu}>
          {options.map((option, index) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.selectOption,
                  index === options.length - 1 && styles.selectOptionLast,
                  selected && styles.selectOptionSelected,
                  pressed && !selected && styles.selectOptionPressed,
                ]}
                onPress={() => {
                  onSelect(option);
                  setOpen(false);
                }}
              >
                <Text style={[styles.selectOptionText, selected && styles.selectOptionTextSelected]}>
                  {option}
                </Text>
                {selected ? <Ionicons name="checkmark" size={16} color="#1f6f5f" /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export default function ReportFormScreen({ navigation, route }) {
  const { reportCategory, reportType } = route.params;
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const isLearningEvent = useMemo(() => reportCategory === "Learning Event", [reportCategory]);
  const accentColor = CATEGORY_COLOR[reportCategory] ?? "#1f6f5f";
  const accentBg = CATEGORY_BG[reportCategory] ?? "#e8f5f2";
  const categoryIcon = CATEGORY_ICON[reportCategory] ?? "document-outline";

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function compressImage(asset, fallbackName) {
    const originalWidth = asset.width || 1600;
    const originalHeight = asset.height || 1200;
    let targetWidth = Math.min(originalWidth, 1600);
    let compress = 0.7;
    let bestResult = null;

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const resizedHeight = Math.round((originalHeight / originalWidth) * targetWidth);
      const result = await manipulateAsync(
        asset.uri,
        [{ resize: { width: targetWidth, height: resizedHeight } }],
        { compress, format: SaveFormat.JPEG, base64: true }
      );

      const estimatedBytes = estimateBase64Bytes(result.base64 || "");
      bestResult = result;

      if (estimatedBytes <= MAX_IMAGE_BYTES) {
        return { uri: result.uri, name: fallbackName, mimeType: "image/jpeg", size: estimatedBytes };
      }

      targetWidth = Math.max(480, Math.round(targetWidth * 0.82));
      compress = Math.max(0.2, Number((compress * 0.82).toFixed(2)));
    }

    return {
      uri: bestResult?.uri || asset.uri,
      name: fallbackName,
      mimeType: "image/jpeg",
      size: bestResult?.base64 ? estimateBase64Bytes(bestResult.base64) : undefined,
    };
  }

  function appendAttachment(asset, fallbackName) {
    updateField("attachments", [
      ...form.attachments,
      {
        uri: asset.uri,
        name: asset.fileName || fallbackName,
        mimeType: asset.mimeType || "application/octet-stream",
      },
    ]);
  }

  async function handlePickImage() {
    Alert.alert("Add Image", "Choose image source", [
      {
        text: "Camera",
        onPress: async () => {
          try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission required", "Allow camera access to capture images.");
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (result.canceled || !result.assets?.length) return;
            const compressed = await compressImage(result.assets[0], `camera-image-${Date.now()}.jpg`);
            appendAttachment(compressed, compressed.name);
          } catch {
            Alert.alert("Image processing failed", "Unable to prepare the camera image for upload.");
          }
        },
      },
      {
        text: "Gallery",
        onPress: async () => {
          try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert("Permission required", "Allow media library access to select images.");
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (result.canceled || !result.assets?.length) return;
            const compressed = await compressImage(result.assets[0], `image-${Date.now()}.jpg`);
            appendAttachment(compressed, compressed.name);
          } catch {
            Alert.alert("Image processing failed", "Unable to prepare the selected image for upload.");
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    updateField("attachments", [
      ...form.attachments,
      { uri: asset.uri, name: asset.name, mimeType: asset.mimeType || "application/octet-stream" },
    ]);
  }

  function removeAttachment(index) {
    updateField("attachments", form.attachments.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    try {
      setSubmitting(true);
      const payload = { reportCategory, reportType, ...form };
      const response = await submitIncidentReport(payload);
      await saveReporterProfile({
        name: form.reportedByName,
        empId: form.empId,
        mobileNumber: form.mobileNumber,
        departmentContractor: form.departmentContractor,
        department: form.department,
      });
      navigation.replace("Success", {
        reportCategory,
        reportType,
        reportId: response.report.referenceNo || response.report.id,
      });
    } catch (error) {
      Alert.alert("Submission failed", error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      <KeyboardAwareScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        enableOnAndroid
        extraScrollHeight={90}
        extraHeight={140}
        enableAutomaticScroll
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerTop}>
            <View style={[styles.bannerStepPill]}>
              <Text style={styles.bannerStepText}>STEP 2 OF 3</Text>
            </View>
            <View style={[styles.bannerCategoryPill, { backgroundColor: accentBg }]}>
              <Ionicons name={categoryIcon} size={13} color={accentColor} />
              <Text style={[styles.bannerCategoryText, { color: accentColor }]}>{reportCategory}</Text>
            </View>
          </View>
          <Text style={styles.bannerTitle}>{reportType}</Text>
          <Text style={styles.bannerBody}>
            Fill in the details below. All sections are required unless marked optional.
          </Text>
        </View>

        {/* Reported By */}
        <View style={styles.section}>
          <SectionHeader icon="person-outline" title="Reported By" />
          <FormField
            label="Full Name"
            value={form.reportedByName}
            onChangeText={(v) => updateField("reportedByName", v)}
            icon="person-outline"
            placeholder="Your full name"
          />
          <ChoiceField
            label="Department / Contractor"
            options={DEPARTMENT_CONTRACTOR_OPTIONS}
            value={form.departmentContractor}
            onChange={(v) => updateField("departmentContractor", v)}
          />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <FormField
                label="Emp ID"
                value={form.empId}
                onChangeText={(v) => updateField("empId", v)}
                icon="card-outline"
                placeholder="Employee ID"
              />
            </View>
            <View style={styles.rowItem}>
              <FormField
                label="Mobile Number"
                value={form.mobileNumber}
                onChangeText={(v) => updateField("mobileNumber", v)}
                keyboardType="phone-pad"
                icon="call-outline"
                placeholder="Contact number"
              />
            </View>
          </View>
          {form.departmentContractor === "Department" ? (
            <SelectListField
              label="Department"
              value={form.department}
              options={DEPARTMENT_OPTIONS}
              placeholder="Select your department"
              onSelect={(v) => updateField("department", v)}
            />
          ) : null}
        </View>

        {/* Time of Incident */}
        <View style={styles.section}>
          <SectionHeader icon="time-outline" title="Time of Incident" />
          <View style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.pickerButton, pressed && styles.pickerButtonPressed, form.incidentDate && styles.pickerButtonFilled]}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.pickerInner}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={form.incidentDate ? "#1f6f5f" : "#9aa3ac"}
                />
                <View style={styles.pickerText}>
                  <Text style={styles.pickerLabel}>Date</Text>
                  <Text style={[styles.pickerValue, !form.incidentDate && styles.pickerPlaceholder]}>
                    {form.incidentDate || "Select date"}
                  </Text>
                </View>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.pickerButton, pressed && styles.pickerButtonPressed, form.incidentTime && styles.pickerButtonFilled]}
              onPress={() => setShowTimePicker(true)}
            >
              <View style={styles.pickerInner}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={form.incidentTime ? "#1f6f5f" : "#9aa3ac"}
                />
                <View style={styles.pickerText}>
                  <Text style={styles.pickerLabel}>Time</Text>
                  <Text style={[styles.pickerValue, !form.incidentTime && styles.pickerPlaceholder]}>
                    {form.incidentTime || "Select time"}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Learning Event / Incident Details */}
        {isLearningEvent ? (
          <View style={styles.section}>
            <SectionHeader icon="book-outline" title="Learning Event Details" />
            <FormField
              label="Observation"
              value={form.observation}
              onChangeText={(v) => updateField("observation", v)}
              multiline
              placeholder="Describe what you observed..."
            />
            <SelectListField
              label="Responsible Department"
              value={form.responsibleDepartment}
              options={DEPARTMENT_OPTIONS}
              placeholder="Select department"
              onSelect={(v) => updateField("responsibleDepartment", v)}
            />
            <ChoiceField
              label="Location"
              options={LOCATION_OPTIONS}
              value={form.location}
              onChange={(v) => updateField("location", v)}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <SectionHeader icon="warning-outline" title="Incident Details" />
            <ChoiceField
              label="Location"
              options={LOCATION_OPTIONS}
              value={form.location}
              onChange={(v) => updateField("location", v)}
            />
            <FormField
              label="Name of Victim"
              value={form.victimName}
              onChangeText={(v) => updateField("victimName", v)}
              icon="person-outline"
              placeholder="Victim's full name"
            />
            <SelectListField
              label="Department of Victim"
              value={form.victimDepartment}
              options={DEPARTMENT_OPTIONS}
              placeholder="Select department"
              onSelect={(v) => updateField("victimDepartment", v)}
            />
            <FormField
              label="Description of Incident"
              value={form.description}
              onChangeText={(v) => updateField("description", v)}
              multiline
              placeholder="Describe what happened in detail..."
            />
          </View>
        )}

        {/* Attachments */}
        <View style={styles.section}>
          <SectionHeader icon="attach-outline" title="Attachments" />
          <View style={styles.row}>
            <Pressable
              style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
              onPress={handlePickImage}
            >
              <Ionicons name="image-outline" size={18} color="#7a5326" />
              <Text style={styles.attachBtnText}>Add Image</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
              onPress={handlePickDocument}
            >
              <Ionicons name="document-outline" size={18} color="#7a5326" />
              <Text style={styles.attachBtnText}>Add File</Text>
            </Pressable>
          </View>

          {form.attachments.length === 0 ? (
            <View style={styles.emptyAttachments}>
              <Ionicons name="cloud-upload-outline" size={32} color="#c5b89a" />
              <Text style={styles.emptyAttachmentsText}>No attachments added yet</Text>
              <Text style={styles.emptyAttachmentsSub}>Photos or documents can help support the report</Text>
            </View>
          ) : (
            <View style={styles.attachmentList}>
              {form.attachments.map((file, index) => (
                <View key={`${file.uri}-${index}`} style={styles.attachmentItem}>
                  {file.mimeType?.startsWith("image/") ? (
                    <Image source={{ uri: file.uri }} style={styles.attachmentPreview} />
                  ) : (
                    <View style={styles.fileBadge}>
                      <Ionicons name="document-text-outline" size={22} color="#7a6b54" />
                    </View>
                  )}
                  <View style={styles.attachmentMeta}>
                    <Text style={styles.attachmentName} numberOfLines={2}>{file.name}</Text>
                    <Text style={styles.attachmentType}>
                      {file.mimeType?.startsWith("image/") ? "Image" : "Document"}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
                    onPress={() => removeAttachment(index)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#a24343" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [styles.submitButton, submitting && styles.submitButtonDisabled, pressed && !submitting && styles.submitButtonPressed]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#ffffff" />
              <Text style={styles.submitText}>Submit Report</Text>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollView>

      {showDatePicker ? (
        <DateTimePicker
          mode="date"
          value={form.incidentDate ? new Date(form.incidentDate) : new Date()}
          onChange={(_, selectedDate) => {
            setShowDatePicker(Platform.OS === "ios");
            if (selectedDate) updateField("incidentDate", selectedDate.toISOString().slice(0, 10));
          }}
        />
      ) : null}

      {showTimePicker ? (
        <DateTimePicker
          mode="time"
          value={new Date()}
          onChange={(_, selectedDate) => {
            setShowTimePicker(Platform.OS === "ios");
            if (selectedDate) {
              const formatted = selectedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              updateField("incidentTime", formatted);
            }
          }}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f3ea",
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 120,
  },

  /* Banner */
  banner: {
    backgroundColor: "#20364a",
    padding: 22,
    borderRadius: 26,
    gap: 10,
  },
  bannerTop: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  bannerStepPill: {
    backgroundColor: "rgba(126,232,212,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bannerStepText: {
    color: "#7ee8d4",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  bannerCategoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bannerCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bannerBody: {
    color: "#c4ced8",
    lineHeight: 20,
    fontSize: 13,
  },

  /* Section card */
  section: {
    backgroundColor: "#fffdf8",
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e7dcc5",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#f0e9d8",
    marginBottom: 2,
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#e8f5f2",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#273440",
  },

  /* Row layout */
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },

  /* SelectListField */
  selectField: {
    gap: 7,
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4a5568",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  selectTrigger: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ddd5be",
    backgroundColor: "#fdfaf4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectTriggerOpen: {
    borderColor: "#1f6f5f",
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  selectTriggerPressed: {
    backgroundColor: "#f5eddc",
  },
  selectValue: {
    color: "#1f2a37",
    fontSize: 15,
    flex: 1,
  },
  selectPlaceholder: {
    color: "#a0aab3",
  },
  selectChevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f0e9d8",
    justifyContent: "center",
    alignItems: "center",
  },
  selectChevronWrapOpen: {
    backgroundColor: "#e8f5f2",
  },
  selectMenu: {
    borderRadius: 16,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: "#1f6f5f",
    backgroundColor: "#fffdf8",
    overflow: "hidden",
    marginTop: -4,
  },
  selectOption: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f0e9d8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectOptionLast: {
    borderBottomWidth: 0,
  },
  selectOptionSelected: {
    backgroundColor: "#f0faf8",
  },
  selectOptionPressed: {
    backgroundColor: "#f5eddc",
  },
  selectOptionText: {
    color: "#31404d",
    fontSize: 15,
    fontWeight: "500",
  },
  selectOptionTextSelected: {
    color: "#1f6f5f",
    fontWeight: "700",
  },

  /* Date / Time pickers */
  pickerButton: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ddd5be",
    backgroundColor: "#fdfaf4",
  },
  pickerButtonPressed: {
    backgroundColor: "#f5eddc",
  },
  pickerButtonFilled: {
    borderColor: "#1f6f5f",
    backgroundColor: "#f0faf8",
  },
  pickerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerText: {
    gap: 3,
    flex: 1,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4a5568",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pickerValue: {
    color: "#1f2a37",
    fontSize: 14,
    fontWeight: "600",
  },
  pickerPlaceholder: {
    color: "#a0aab3",
    fontWeight: "400",
  },

  /* Attachment buttons */
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#efe3ce",
    borderRadius: 16,
    paddingVertical: 13,
  },
  attachBtnPressed: {
    backgroundColor: "#e4d4b5",
  },
  attachBtnText: {
    color: "#7a5326",
    fontWeight: "700",
    fontSize: 14,
  },

  /* Empty attachment state */
  emptyAttachments: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#d9cdb5",
  },
  emptyAttachmentsText: {
    color: "#7d8690",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyAttachmentsSub: {
    color: "#a0aab3",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  /* Attachment list */
  attachmentList: {
    gap: 10,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#f5efe3",
    borderWidth: 1,
    borderColor: "#e8dfc9",
    gap: 12,
  },
  attachmentPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#e7dcc5",
  },
  fileBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#e8dfcf",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentMeta: {
    flex: 1,
    gap: 3,
  },
  attachmentName: {
    color: "#31404d",
    fontWeight: "600",
    fontSize: 13,
  },
  attachmentType: {
    color: "#7d8690",
    fontSize: 12,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#fde8e8",
    justifyContent: "center",
    alignItems: "center",
  },
  removeBtnPressed: {
    backgroundColor: "#f7cece",
  },

  /* Submit */
  submitButton: {
    backgroundColor: "#1f6f5f",
    borderRadius: 20,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#1f6f5f",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.65,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonPressed: {
    opacity: 0.88,
  },
  submitText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
});
