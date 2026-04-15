import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/* ── Download states ── */
const DL_IDLE        = "idle";
const DL_DOWNLOADING = "downloading";
const DL_DONE        = "done";
const DL_ERROR       = "error";

export default function AttachmentViewerModal({ attachment, onClose }) {
  const [dlState, setDlState]     = useState(DL_IDLE);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlError, setDlError]     = useState("");

  if (!attachment) return null;

  const isImage = attachment.mimeType?.startsWith("image/");
  const fileName = attachment.originalName || "attachment";

  async function handleDownload() {
    try {
      setDlState(DL_DOWNLOADING);
      setDlProgress(0);
      setDlError("");

      const localUri = FileSystem.cacheDirectory + fileName.replace(/\s+/g, "_");

      const downloadResumable = FileSystem.createDownloadResumable(
        attachment.url,
        localUri,
        {},
        (progress) => {
          const pct = progress.totalBytesExpectedToDownload > 0
            ? Math.round((progress.totalBytesWritten / progress.totalBytesExpectedToDownload) * 100)
            : 0;
          setDlProgress(pct);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      setDlState(DL_DONE);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: attachment.mimeType || "application/octet-stream",
          dialogTitle: `Save ${fileName}`,
          UTI: attachment.mimeType || "public.data",
        });
      }
    } catch (e) {
      setDlState(DL_ERROR);
      setDlError("Download failed. Check your connection and try again.");
    }
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Close button */}
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>

        {/* File name pill */}
        <View style={styles.namePill}>
          <Ionicons
            name={isImage ? "image-outline" : "document-text-outline"}
            size={13}
            color="#c4ced8"
          />
          <Text style={styles.namePillText} numberOfLines={1}>{fileName}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isImage ? (
            <Image
              source={{ uri: attachment.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.docPreview}>
              <View style={styles.docIconWrap}>
                <Ionicons name="document-text-outline" size={52} color="#8da7bc" />
              </View>
              <Text style={styles.docName} numberOfLines={3}>{fileName}</Text>
              <Text style={styles.docHint}>Preview not available for this file type</Text>
            </View>
          )}
        </View>

        {/* Download bar */}
        <View style={styles.bottomBar}>
          {dlState === DL_ERROR && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={14} color="#f87171" />
              <Text style={styles.errorText}>{dlError}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.downloadBtn,
              dlState === DL_DOWNLOADING && styles.downloadBtnBusy,
              pressed && dlState === DL_IDLE && styles.downloadBtnPressed,
            ]}
            onPress={handleDownload}
            disabled={dlState === DL_DOWNLOADING}
          >
            {dlState === DL_DOWNLOADING ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.downloadBtnText}>
                  {dlProgress > 0 ? `Downloading… ${dlProgress}%` : "Downloading…"}
                </Text>
              </>
            ) : dlState === DL_DONE ? (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.downloadBtnText}>Download again</Text>
              </>
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.downloadBtnText}>Download</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 20, 0.96)",
    justifyContent: "space-between",
  },

  /* Close */
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Name pill */
  namePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginTop: 56,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: SCREEN_W - 80,
  },
  namePillText: {
    color: "#c4ced8",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
  },

  /* Image */
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  fullImage: {
    width: SCREEN_W - 24,
    height: SCREEN_H * 0.6,
    borderRadius: 12,
  },

  /* Document fallback */
  docPreview: {
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 32,
  },
  docIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },
  docName: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
  },
  docHint: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    gap: 10,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(248,113,113,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  errorText: {
    color: "#f87171",
    fontSize: 13,
    flex: 1,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1f6f5f",
    paddingVertical: 16,
    borderRadius: 18,
  },
  downloadBtnBusy: {
    backgroundColor: "#1a5a4c",
  },
  downloadBtnPressed: {
    opacity: 0.85,
  },
  downloadBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
