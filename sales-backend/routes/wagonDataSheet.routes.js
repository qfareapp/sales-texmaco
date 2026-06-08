const express = require("express");
const mongoose = require("mongoose");
const WagonDataSheetProject = require("../models/WagonDataSheetProject");
const WagonDataSheetRow = require("../models/WagonDataSheetRow");

const router = express.Router();

const asText = (value) => String(value || "").trim();
const asSerialNumbers = (value) => {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n|,/);
  return source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 8);
};

router.get("/projects", async (_req, res) => {
  try {
    const projects = await WagonDataSheetProject.find()
      .sort({ createdAt: -1 })
      .lean();

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

    const summaryMap = new Map(
      rowSummary.map((item) => [String(item._id), item])
    );

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
    console.error("❌ Error fetching wagon data sheet projects:", error);
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
      wagonConfiguration: asText(req.body.wagonConfiguration),
      wagonsOfferedForInspection: asText(req.body.wagonsOfferedForInspection),
      inspectionOfferDate: asText(req.body.inspectionOfferDate),
      notes: asText(req.body.notes),
    };

    const project = await WagonDataSheetProject.create(payload);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error("❌ Error creating wagon data sheet project:", error);
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
    console.error("❌ Error fetching wagon data sheet project detail:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/rows", async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const rows = await WagonDataSheetRow.find({ projectId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Error fetching wagon data sheet rows:", error);
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
    console.error("❌ Error fetching pending second zone rows:", error);
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
    console.error("❌ Error fetching final details options:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/rows/first-zone", async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, message: "Valid projectId is required." });
    }

    const row = await WagonDataSheetRow.create({
      projectId,
      slNo: asText(req.body.slNo),
      texNo: asText(req.body.texNo),
      wagonNo: asText(req.body.wagonNo),
      wheelDataKey: asText(req.body.wheelDataKey),
      firstZone: {
        bogie: {
          make: asText(req.body.bogieMake),
          serialNumbers: asSerialNumbers(req.body.bogieSerialNumbers),
        },
        coupler: {
          make: asText(req.body.couplerMake),
          serialNumbers: asSerialNumbers(req.body.couplerSerialNumbers),
        },
        draftGear: {
          make: asText(req.body.draftGearMake),
          serialNumbers: asSerialNumbers(req.body.draftGearSerialNumbers),
        },
        dv: {
          make: asText(req.body.dvMake),
          serialNumbers: asSerialNumbers(req.body.dvSerialNumbers),
        },
        bc: {
          make: asText(req.body.bcMake),
          serialNumbers: asSerialNumbers(req.body.bcSerialNumbers),
        },
        ar: {
          make: asText(req.body.arMake),
          serialNumbers: asSerialNumbers(req.body.arSerialNumbers),
        },
        sabMake: asText(req.body.sabMake),
        atlMake: asText(req.body.atlMake),
        crfMake: asText(req.body.crfMake),
      },
    });

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error("❌ Error saving first zone row:", error);
    const status = error?.code === 11000 ? 409 : 400;
    const message =
      error?.code === 11000
        ? "Wheel data key already exists for this project."
        : error.message;
    res.status(status).json({ success: false, message });
  }
});

router.post("/rows/second-zone", async (req, res) => {
  try {
    const { rowId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(rowId)) {
      return res.status(400).json({ success: false, message: "Valid rowId is required." });
    }

    const row = await WagonDataSheetRow.findByIdAndUpdate(
      rowId,
      {
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
      { new: true, runValidators: true }
    );

    if (!row) {
      return res.status(404).json({ success: false, message: "Wagon row not found." });
    }

    res.json({ success: true, data: row });
  } catch (error) {
    console.error("❌ Error saving second zone row:", error);
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
    console.error("❌ Error saving final assembly details:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
