const express = require("express");
const mongoose = require("mongoose");
const WagonDataSheetProject = require("../models/WagonDataSheetProject");
const WagonDataSheetRow = require("../models/WagonDataSheetRow");

const router = express.Router();

const asText = (value) => String(value || "").trim();
const normalizeWheelDataKey = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
const asSerialNumbers = (value) => {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  return source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
};

const getNextSlNo = async (projectId) => {
  const existingRows = await WagonDataSheetRow.find({ projectId }).select("slNo").lean();
  const maxSlNo = existingRows.reduce((maxValue, row) => {
    const numericValue = Number.parseInt(String(row?.slNo || ""), 10);
    return Number.isFinite(numericValue) ? Math.max(maxValue, numericValue) : maxValue;
  }, 0);

  return String(maxSlNo + 1);
};

router.get("/projects", async (_req, res) => {
  try {
    const projects = await WagonDataSheetProject.find().sort({ createdAt: -1 }).lean();

    const ids = projects.map((project) => project._id);
    const rowSummary = await WagonDataSheetRow.aggregate([
      { $match: { projectId: { $in: ids } } },
      {
        $group: {
          _id: "$projectId",
          totalRows: { $sum: 1 },
          completedRows: {
            $sum: {
              $cond: [{ $ifNull: ["$secondZone.submittedAt", false] }, 1, 0],
            },
          },
          finalCompletedRows: {
            $sum: {
              $cond: [{ $ifNull: ["$finalAssembly.submittedAt", false] }, 1, 0],
            },
          },
          finalPendingRows: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ifNull: ["$secondZone.submittedAt", false] },
                    { $not: [{ $ifNull: ["$finalAssembly.submittedAt", false] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const summaryMap = new Map(rowSummary.map((item) => [String(item._id), item]));

    res.json({
      success: true,
      data: projects.map((project) => {
        const summary = summaryMap.get(String(project._id));
        return {
          ...project,
          totalRows: summary?.totalRows || 0,
          completedRows: summary?.completedRows || 0,
          pendingRows: (summary?.totalRows || 0) - (summary?.completedRows || 0),
          finalCompletedRows: summary?.finalCompletedRows || 0,
          finalPendingRows: summary?.finalPendingRows || 0,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching wagon data sheet projects:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const payload = {
      projectName: asText(req.body.projectName),
      contractPoNumber: asText(req.body.contractPoNumber),
      contractPoDate: asText(req.body.contractPoDate),
      deliveryPeriodUpto: asText(req.body.deliveryPeriodUpto),
      totalQuantity: asText(req.body.totalQuantity),
      wagonTypeInPo: asText(req.body.wagonTypeInPo),
      contractPlacedBy: asText(req.body.contractPlacedBy),
      wagonManufacturer: asText(req.body.wagonManufacturer),
      wagonTypeOffered: asText(req.body.wagonTypeOffered),
      wagonsOfferedForInspection: asText(req.body.wagonsOfferedForInspection),
      inspectionOfferDate: asText(req.body.inspectionOfferDate),
      notes: asText(req.body.notes),
    };

    const project = await WagonDataSheetProject.create(payload);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("Error creating wagon data sheet project:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/projects/:projectId/detail", async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const [project, rows] = await Promise.all([
      WagonDataSheetProject.findById(projectId).lean(),
      WagonDataSheetRow.find({ projectId }).sort({ createdAt: 1 }).lean(),
    ]);

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    res.json({ success: true, data: { project, rows } });
  } catch (error) {
    console.error("Error fetching wagon data sheet project detail:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const rows = await WagonDataSheetRow.find({ projectId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching wagon data sheet rows:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows/pending-second-zone", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const rows = await WagonDataSheetRow.find({
      projectId,
      "secondZone.submittedAt": null,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching pending second zone rows:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows/final-details-options", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const rows = await WagonDataSheetRow.find({
      projectId,
      "secondZone.submittedAt": { $ne: null },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching final details options:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/rows/first-zone", async (req, res) => {
  try {
    const { projectId } = req.body;
    const wheelDataKey = normalizeWheelDataKey(req.body.wheelDataKey);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }
    if (!wheelDataKey) {
      return res.status(400).json({ success: false, message: "Wheel data key is required." });
    }

    const existingRow = await WagonDataSheetRow.findOne({ projectId, wheelDataKey })
      .select("_id slNo")
      .lean();

    const row = await WagonDataSheetRow.findOneAndUpdate(
      { projectId, wheelDataKey },
      {
        $setOnInsert: {
          projectId,
          wheelDataKey,
          slNo: existingRow?.slNo || await getNextSlNo(projectId),
        },
        $set: {
          texNo: asText(req.body.texNo),
          wagonNo: asText(req.body.wagonNo),
          wagonConfiguration: asText(req.body.wagonConfiguration),
          "firstZone.bogie.make": asText(req.body.bogieMake),
          "firstZone.bogie.serialNumbers": asSerialNumbers(req.body.bogieSerialNumbers),
          "firstZone.coupler.make": asText(req.body.couplerMake),
          "firstZone.coupler.serialNumbers": asSerialNumbers(req.body.couplerSerialNumbers),
          "firstZone.draftGear.make": asText(req.body.draftGearMake),
          "firstZone.draftGear.serialNumbers": asSerialNumbers(req.body.draftGearSerialNumbers),
          "firstZone.dv.make": asText(req.body.dvMake),
          "firstZone.dv.serialNumbers": asSerialNumbers(req.body.dvSerialNumbers),
          "firstZone.bc.make": asText(req.body.bcMake),
          "firstZone.bc.serialNumbers": asSerialNumbers(req.body.bcSerialNumbers),
          "firstZone.ar.make": asText(req.body.arMake),
          "firstZone.ar.serialNumbers": asSerialNumbers(req.body.arSerialNumbers),
          "firstZone.sabMake": asText(req.body.sabMake),
          "firstZone.atlMake": asText(req.body.atlMake),
          "firstZone.crfMake": asText(req.body.crfMake),
          "firstZone.submittedAt": new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(existingRow ? 200 : 201).json({ success: true, data: row });
  } catch (error) {
    console.error("Error saving first zone row:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/rows/second-zone", async (req, res) => {
  try {
    const { projectId } = req.body;
    const wheelDataKey = normalizeWheelDataKey(req.body.wheelDataKey);

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }
    if (!wheelDataKey) {
      return res.status(400).json({ success: false, message: "Wheel data key is required." });
    }

    const existingRow = await WagonDataSheetRow.findOne({ projectId, wheelDataKey })
      .select("_id slNo")
      .lean();

    const row = await WagonDataSheetRow.findOneAndUpdate(
      { projectId, wheelDataKey },
      {
        $setOnInsert: {
          projectId,
          wheelDataKey,
          slNo: existingRow?.slNo || await getNextSlNo(projectId),
        },
        $set: {
          "secondZone.axle.make": asText(req.body.axleMake),
          "secondZone.axle.serialNumbers": asSerialNumbers(req.body.axleSerialNumbers),
          "secondZone.wheel.make": asText(req.body.wheelMake),
          "secondZone.wheel.serialNumbers": asSerialNumbers(req.body.wheelSerialNumbers),
          "secondZone.bearing.make": asText(req.body.bearingMake),
          "secondZone.bearing.serialNumbers": asSerialNumbers(req.body.bearingSerialNumbers),
          "secondZone.submittedAt": new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(existingRow ? 200 : 201).json({ success: true, data: row });
  } catch (error) {
    console.error("Error saving second zone row:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/rows/final-details", async (req, res) => {
  try {
    const { rowId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findByIdAndUpdate(
      rowId,
      {
        $set: {
          "finalAssembly.tareWeight": asText(req.body.tareWeight),
          "finalAssembly.txrFitDate": asText(req.body.txrFitDate),
          "finalAssembly.manufactureDate": asText(req.body.manufactureDate),
          "finalAssembly.rfidNo": asText(req.body.rfidNo),
          "finalAssembly.dmNoAndDate": asText(req.body.dmNoAndDate),
          "finalAssembly.rohDate": asText(req.body.rohDate),
          "finalAssembly.returnOrPohDate": asText(req.body.returnOrPohDate),
          "finalAssembly.submittedAt": new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error("Error saving final assembly details:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
