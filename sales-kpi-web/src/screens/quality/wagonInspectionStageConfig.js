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
