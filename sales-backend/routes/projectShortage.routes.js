const express = require("express");
const ShortageMaterial = require("../models/ShortageMaterial");
const ShortageProject = require("../models/ShortageProject");
const ShortageUpdate = require("../models/ShortageUpdate");

const router = express.Router();

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getAlertLevel(material) {
  const shortage = Math.max(toNumber(material.shortageQty), 0);
  const available = toNumber(material.availableQty);
  const inTransit = toNumber(material.inTransitQty);

  if (shortage > 0 && available <= 0) return "red";
  if (shortage > 0 || (shortage <= 0 && inTransit > 0)) return "yellow";
  return "green";
}

function normalizeProjectCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [projects, materials, recentUpdates] = await Promise.all([
      ShortageProject.find().sort({ projectCode: 1 }).lean(),
      ShortageMaterial.find().sort({ projectCode: 1, shortageQty: -1, itemName: 1 }).lean(),
      ShortageUpdate.find().sort({ updateDate: -1, createdAt: -1 }).limit(12).lean(),
    ]);

    const projectSummaryMap = new Map(
      projects.map((project) => [
        project.projectCode,
        {
          projectCode: project.projectCode,
          projectName: project.projectName || project.projectCode,
          client: project.client || "",
          wagonType: project.wagonType || project.projectCode,
          totalOrderQty: toNumber(project.totalOrderQty),
          totalItems: 0,
          shortageItems: 0,
          criticalItems: 0,
          totalShortageQty: 0,
          inTransitQty: 0,
          completionPct: 0,
          planningMonths: project.planningMonths || [],
          sourceSheets: project.sourceSheets || [],
        },
      ])
    );

    for (const material of materials) {
      const code = material.projectCode;
      if (!projectSummaryMap.has(code)) {
        projectSummaryMap.set(code, {
          projectCode: code,
          projectName: code,
          client: "",
          wagonType: code,
          totalOrderQty: 0,
          totalItems: 0,
          shortageItems: 0,
          criticalItems: 0,
          totalShortageQty: 0,
          inTransitQty: 0,
          completionPct: 0,
          planningMonths: [],
          sourceSheets: [],
        });
      }

      const summary = projectSummaryMap.get(code);
      const shortageQty = Math.max(toNumber(material.shortageQty), 0);
      summary.totalItems += 1;
      summary.totalShortageQty += shortageQty;
      summary.inTransitQty += toNumber(material.inTransitQty);

      if (shortageQty > 0) summary.shortageItems += 1;
      if (material.alertLevel === "red") summary.criticalItems += 1;
    }

    const projectSummary = Array.from(projectSummaryMap.values()).map((summary) => {
      const safeQty = summary.totalItems - summary.shortageItems;
      const completionPct = summary.totalItems
        ? Number(((safeQty / summary.totalItems) * 100).toFixed(1))
        : 0;

      return { ...summary, completionPct };
    });

    const criticalItems = materials
      .filter((item) => item.alertLevel === "red" || Math.max(toNumber(item.shortageQty), 0) > 0)
      .sort((a, b) => {
        if (a.alertLevel !== b.alertLevel) return a.alertLevel === "red" ? -1 : 1;
        return toNumber(b.shortageQty) - toNumber(a.shortageQty);
      })
      .slice(0, 25);

    res.json({
      success: true,
      data: {
        summary: {
          totalProjects: projectSummary.length,
          totalItems: materials.length,
          shortageItems: materials.filter((item) => Math.max(toNumber(item.shortageQty), 0) > 0).length,
          criticalShortages: materials.filter((item) => item.alertLevel === "red").length,
          materialValueAtRisk: materials.reduce((sum, item) => sum + Math.max(toNumber(item.shortageQty), 0), 0),
          delayedProjects: projectSummary.filter((item) => item.criticalItems > 0).length,
        },
        projectSummary,
        criticalItems,
        recentUpdates,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/projects", async (_req, res, next) => {
  try {
    const projects = await ShortageProject.find().sort({ projectCode: 1 }).lean();
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

router.get("/projects/:projectCode/materials", async (req, res, next) => {
  try {
    const projectCode = normalizeProjectCode(req.params.projectCode);
    const [project, materials, updates] = await Promise.all([
      ShortageProject.findOne({ projectCode }).lean(),
      ShortageMaterial.find({ projectCode }).sort({ shortageQty: -1, itemName: 1 }).lean(),
      ShortageUpdate.find({ projectCode }).sort({ updateDate: -1, createdAt: -1 }).limit(20).lean(),
    ]);

    res.json({
      success: true,
      data: {
        project,
        materials,
        updates,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/import", async (req, res, next) => {
  try {
    const payload = req.body || {};
    const projects = Array.isArray(payload.projects) ? payload.projects : [];
    const materials = Array.isArray(payload.materials) ? payload.materials : [];
    const uploadedBy = String(payload.uploadedBy || "System").trim();

    if (!projects.length || !materials.length) {
      return res.status(400).json({ success: false, message: "Projects and materials are required for import." });
    }

    const normalizedProjects = projects
      .map((project) => ({
        projectCode: normalizeProjectCode(project.projectCode),
        projectName: String(project.projectName || project.projectCode || "").trim(),
        client: String(project.client || "").trim(),
        wagonType: String(project.wagonType || project.projectCode || "").trim(),
        totalOrderQty: toNumber(project.totalOrderQty),
        activeStatus: String(project.activeStatus || "Active").trim(),
        sourceSheets: Array.isArray(project.sourceSheets) ? project.sourceSheets : [],
        planningMonths: Array.isArray(project.planningMonths) ? project.planningMonths : [],
        lastImportedAt: new Date(),
        extra: project.extra && typeof project.extra === "object" ? project.extra : {},
      }))
      .filter((project) => project.projectCode);

    const projectCodes = [...new Set(normalizedProjects.map((project) => project.projectCode))];

    for (const project of normalizedProjects) {
      await ShortageProject.findOneAndUpdate(
        { projectCode: project.projectCode },
        { $set: project },
        { upsert: true, new: true }
      );
    }

    await ShortageMaterial.deleteMany({ projectCode: { $in: projectCodes } });

    const normalizedMaterialMap = new Map();

    materials
      .map((material) => {
        const requiredQty = toNumber(material.requiredQty);
        const availableQty = toNumber(material.availableQty);
        const inTransitQty = toNumber(material.inTransitQty);
        const shortageQty =
          material.shortageQty !== undefined && material.shortageQty !== null
            ? Math.max(toNumber(material.shortageQty), 0)
            : Math.max(requiredQty - availableQty - inTransitQty, 0);

        const record = {
          projectCode: normalizeProjectCode(material.projectCode),
          materialCode: String(material.materialCode || "").trim(),
          itemName: String(material.itemName || "").trim(),
          qtyPerWagon: toNumber(material.qtyPerWagon),
          unit: String(material.unit || "").trim(),
          requiredQty,
          availableQty,
          availableWs: toNumber(material.availableWs),
          inTransitQty,
          shortageQty,
          remarks: String(material.remarks || "").trim(),
          sourceSheet: String(material.sourceSheet || "").trim(),
          importedBy: uploadedBy,
          lastUpdatedAt: new Date(),
          extra: material.extra && typeof material.extra === "object" ? material.extra : {},
        };

        record.alertLevel = getAlertLevel(record);
        return record;
      })
      .filter((material) => material.projectCode && material.materialCode && material.itemName)
      .forEach((material) => {
        const key = `${material.projectCode}::${material.materialCode}`;
        if (!normalizedMaterialMap.has(key)) {
          normalizedMaterialMap.set(key, material);
          return;
        }

        const existing = normalizedMaterialMap.get(key);
        normalizedMaterialMap.set(key, {
          ...existing,
          availableQty: Math.max(existing.availableQty, material.availableQty),
          availableWs: Math.max(existing.availableWs, material.availableWs),
          inTransitQty: Math.max(existing.inTransitQty, material.inTransitQty),
          requiredQty: Math.max(existing.requiredQty, material.requiredQty),
          shortageQty: Math.max(existing.shortageQty, material.shortageQty),
          remarks: existing.remarks || material.remarks,
          sourceSheet: [existing.sourceSheet, material.sourceSheet].filter(Boolean).join(", "),
        });
      });

    const normalizedMaterials = Array.from(normalizedMaterialMap.values());

    if (!normalizedMaterials.length) {
      return res.status(400).json({ success: false, message: "No valid material rows found in import payload." });
    }

    await ShortageMaterial.insertMany(normalizedMaterials, { ordered: false });

    res.json({
      success: true,
      message: "Project shortage workbook imported successfully.",
      data: {
        projectCount: normalizedProjects.length,
        materialCount: normalizedMaterials.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/updates", async (req, res, next) => {
  try {
    const {
      materialId,
      projectCode,
      materialCode,
      availableQty,
      inTransitQty,
      remarks,
      updatedBy,
    } = req.body || {};

    let material = null;

    if (materialId) {
      material = await ShortageMaterial.findById(materialId);
    }

    if (!material && projectCode && materialCode) {
      material = await ShortageMaterial.findOne({
        projectCode: normalizeProjectCode(projectCode),
        materialCode: String(materialCode).trim(),
      });
    }

    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found for update." });
    }

    const previousAvailableQty = toNumber(material.availableQty);
    const previousInTransitQty = toNumber(material.inTransitQty);
    const previousShortageQty = toNumber(material.shortageQty);

    if (availableQty !== undefined) material.availableQty = toNumber(availableQty);
    if (inTransitQty !== undefined) material.inTransitQty = toNumber(inTransitQty);
    if (remarks !== undefined) material.remarks = String(remarks || "").trim();

    material.shortageQty = Math.max(
      toNumber(material.requiredQty) - toNumber(material.availableQty) - toNumber(material.inTransitQty),
      0
    );
    material.alertLevel = getAlertLevel(material);
    material.lastUpdatedAt = new Date();

    await material.save();

    const updateLog = await ShortageUpdate.create({
      projectCode: material.projectCode,
      materialId: material._id,
      materialCode: material.materialCode,
      itemName: material.itemName,
      previousAvailableQty,
      newAvailableQty: toNumber(material.availableQty),
      previousInTransitQty,
      newInTransitQty: toNumber(material.inTransitQty),
      previousShortageQty,
      shortageAfterUpdate: toNumber(material.shortageQty),
      updatedBy: String(updatedBy || "Operations").trim(),
      remarks: String(remarks || "").trim(),
      updateDate: new Date(),
    });

    res.json({
      success: true,
      message: "Daily shortage update saved successfully.",
      data: {
        material,
        updateLog,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
