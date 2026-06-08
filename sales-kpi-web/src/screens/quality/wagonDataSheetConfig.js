export const wagonConfigurationOptions = [
  "BLANK",
  "A CAR",
  "B CAR",
  "C CAR",
  "A & B CAR",
  "A & C CAR",
  "B & C CAR",
  "A, B, C CAR",
];

export const buildProjectLabel = (project) =>
  [
    project.projectName,
    project.contractPoNumber,
    project.wagonTypeOffered,
  ]
    .filter(Boolean)
    .join(" | ");
