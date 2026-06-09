export const wagonConfigurationOptions = [
  "BLANK",
  "A CAR",
  "B CAR",
  "C CAR",
];

export const buildProjectLabel = (project) =>
  [
    project.projectName,
    project.contractPoNumber,
    project.wagonTypeOffered,
  ]
    .filter(Boolean)
    .join(" | ");
