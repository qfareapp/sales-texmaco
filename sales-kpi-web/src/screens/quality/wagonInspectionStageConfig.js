export const inspectionStages = [
  { key: "uf_fit_up", label: "U/F Fit-Up" },
  { key: "boxing", label: "Boxing" },
  { key: "manipulator_bmp", label: "Manipulator / BMP" },
  { key: "reverse_visual", label: "Reverse Visual" },
  { key: "top_visual_final_inspection", label: "Top Visual / Final Inspection" },
  { key: "blasting", label: "Blasting" },
  { key: "wheeling", label: "Wheeling" },
  { key: "container_test", label: "Container Test" },
  { key: "dm_line", label: "DM Line" },
];

export const pdiStages = [
  { key: "weld_visual_clear_by_tpi", label: "Weld Visual Clear by TPI" },
  { key: "pipe_infringement_clear_by_tpi", label: "Pipe Infringement Clear by TPI" },
  { key: "air_brake_clear_by_tpi", label: "Air Brake Clear by TPI" },
  { key: "hand_brake_clear_by_tpi", label: "Hand Brake Clear by TPI" },
  { key: "lsd_gap_clear_by_tpi", label: "LSD Gap Clear by TPI" },
  { key: "coupler_articulation_and_operation", label: "Coupler Articulation & Operation" },
  { key: "apd_pdi_clear_by_tpi", label: "APD / PDI Clear by TPI" },
  { key: "painting_clear_by_tpi", label: "Painting Clear by TPI" },
  { key: "lettring_clear_by_tpi", label: "Lettring Clear by TPI" },
];

export const stageStatusLabel = (stage) => {
  if (!stage) return "";
  if (stage.status === "completed") return formatStageDate(stage.completedOn);
  if (stage.status === "skipped") return stage.isOptional ? "Skipped" : "Skipped - revisit";
  return "Pending";
};

export const stageStatusPalette = (stage, active = false, pdiMode = false) => {
  if (stage?.status === "completed") {
    return {
      bg: "#f0fdf4",
      border: "#86efac",
      text: "#166534",
      dot: "#16a34a",
    };
  }

  if (stage?.status === "skipped") {
    return {
      bg: "#fff7ed",
      border: "#fdba74",
      text: "#c2410c",
      dot: "#f97316",
    };
  }

  if (active) {
    return pdiMode
      ? { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8", dot: "#1d4ed8" }
      : { bg: "#fffbeb", border: "#fcd34d", text: "#b45309", dot: "#b45309" };
  }

  return {
    bg: "#f8fafc",
    border: "#e5e7eb",
    text: "#94a3b8",
    dot: "#d1d5db",
  };
};

export const formatStageDate = (value) => {
  if (!value) return "";

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return `${day}-${month}-${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
