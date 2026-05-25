const mongoose = require('mongoose');

const express = require('express');
const router = express.Router();
const ProductionPlan = require('../models/ProductionPlan');
const Inventory = require('../models/Inventory');
const WagonConfig = require('../models/WagonConfig');
const DailyWagonLog = require('../models/DailyWagonLog'); // ✅ Log model
const DailyUpdate = require('../models/DailyUpdate');

const getItemInventoryName = (item = {}) => {
  const sapCode = String(item?.sapCode || '').trim();
  const description = String(item?.description || '').trim();
  if (sapCode && description) return `${sapCode} - ${description}`;
  return sapCode || description;
};

const normalizeStageKey = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const derivePartsFromItems = (doc = {}) => {
  const allItems = [...(doc.dmItems || []), ...(doc.nonDmItems || [])];
  if (!allItems.length) {
    return (doc.parts || []).map(part => ({
      name: String(part?.name || '').trim(),
      total: Number(part?.total || 0)
    })).filter(part => part.name);
  }
  const merged = new Map();

  allItems.forEach(item => {
    const name = getItemInventoryName(item);
    const total = Number(item?.qtyPerWagon || 0);
    if (!name) return;

    merged.set(name, {
      name,
      total: (merged.get(name)?.total || 0) + total
    });
  });

  return Array.from(merged.values());
};

// ----------------------
// ✅ Monthly Planning
// ----------------------
router.post('/monthly-planning', async (req, res) => {
  try {
    const { projectId, month, monthlyTarget, clientName, clientType, wagonType } = req.body;

    if (!month) {
      return res.status(400).json({ status: 'Error', message: 'Month is required (YYYY-MM)' });
    }

    const [y, m] = month.split('-');
    const year = Number(y);
    const monthNum = Number(m);

    // 🔑 Key: use projectId + year + monthNum as unique selector
    const plan = await ProductionPlan.findOneAndUpdate(
      { projectId, year, monthNum },
      {
        $set: {
          projectId,
          clientName,
          clientType,
          wagonType,
          month,
          monthNum,
          year,
          monthlyTarget
        }
      },
      { upsert: true, new: true }
    );

    res.json({ status: 'Success', plan });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});



// 🔄 UPDATE HERE in productionRoutes.js
router.get('/monthly-planning', async (req, res) => {
  try {
    const { projectId, month, year } = req.query;

    let query = {};
    if (projectId) query.projectId = projectId;
    if (year) query.year = Number(year);
    if (month) query.monthNum = Number(month); // month is 1–12

    const plans = await ProductionPlan.find(query).sort({ year: -1, monthNum: -1 }).lean();

    const logs = await DailyWagonLog.aggregate([
      {
        $group: {
          _id: {
            projectId: '$projectId',
            year: { $year: '$date' },
            monthNum: { $month: '$date' }
          },
          totalPDI: { $sum: '$pdiCount' },
          totalPullout: { $sum: '$pulloutDone' }
        }
      }
    ]);

    const logMap = new Map(
      logs.map(l => [
        `${l._id.projectId}-${l._id.year}-${l._id.monthNum}`,
        {
          totalPDI: l.totalPDI,
          totalPullout: l.totalPullout,
          readyForPullout: l.totalPDI - l.totalPullout
        }
      ])
    );

    const enriched = plans.map(p => {
      const key = `${p.projectId}-${p.year}-${p.monthNum}`;
      const logStats = logMap.get(key) || { totalPDI: 0, totalPullout: 0, readyForPullout: 0 };

      return {
        ...p,
        pdi: logStats.totalPDI,
        readyForPullout: logStats.readyForPullout,
        pulloutDone: logStats.totalPullout
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});


// ----------------------
// ✅ Daily Wagon Update (store PDI as Ready for Pullout)
// ----------------------
router.post('/daily-wagon-update', async (req, res) => {
  const {
    date,
    projectId,
    wagonType,
    partsProduced = {},
    stagesCompleted = {},
    wagonReadyCount = 0
  } = req.body;

  try {
    if (!date || !projectId || !wagonType) {
      return res.status(400).json({
        status: 'Error',
        message: 'date, projectId, and wagonType are required'
      });
    }

    // 1. 🔼 Update inventory (Stock In)
    for (const part in partsProduced) {
      const qty = partsProduced[part];
      await Inventory.updateOne(
        { projectId, part },
        { $inc: { quantity: qty } },
        { upsert: true }
      );
    }

    // 2. Item consumption is no longer mapped to stages.
    const totalPartsToConsume = {};

    // 3. 📝 Log entry
    const airBrakeTestingCount = Object.entries(stagesCompleted || {}).reduce((count, [stageName, rawQty]) => {
      if (normalizeStageKey(stageName) !== normalizeStageKey('Air Brake Testing')) {
        return count;
      }
      return Math.max(0, parseInt(rawQty, 10) || 0);
    }, 0);

    if (airBrakeTestingCount > 0) {
      const bom = await WagonConfig.findOne({ wagonType }).lean();

      if (!bom) {
        return res.status(400).json({
          status: 'Error',
          message: `No wagon configuration found for wagonType ${wagonType}`
        });
      }

      derivePartsFromItems(bom).forEach((part) => {
        const name = String(part?.name || '').trim();
        const perWagonQty = Number(part?.total || 0);
        if (!name || perWagonQty <= 0) return;
        totalPartsToConsume[name] = perWagonQty * airBrakeTestingCount;
      });

      for (const [part, qtyToDeduct] of Object.entries(totalPartsToConsume)) {
        await Inventory.updateOne(
          { projectId, part },
          { $inc: { quantity: -qtyToDeduct } },
          { upsert: true }
        );
      }
    }

    const pdiCount = Number(stagesCompleted?.PDI || 0);

    await DailyWagonLog.create({
      date,
      projectId,
      wagonType,
      partsProduced,
      stagesCompleted,
      partsConsumed: totalPartsToConsume,
      wagonReadyCount,
      pdiCount,                 // ✅ final stage
      readyForPullout: pdiCount,// ✅ mirror PDI
      pulloutDone: 0            // ✅ no pullout at creation
    });

    res.json({ status: 'Success', message: '✅ Daily update saved successfully' });
  } catch (err) {
    console.error('❌ Daily wagon update error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Update Pullout (cumulative by projectId)
// ----------------------
router.post('/pullout-update/:projectId', async (req, res) => {
  try {
    const { count } = req.body;
    const { projectId } = req.params;

    if (!count || count <= 0) {
      return res.status(400).json({ status: 'Error', message: 'Count must be greater than 0' });
    }

    // 1. Get totals from logs
    const totals = await DailyWagonLog.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalPDI: { $sum: '$pdiCount' },
          totalPullout: { $sum: '$pulloutDone' }
        }
      }
    ]);

    const stats = totals[0] || { totalPDI: 0, totalPullout: 0 };
    const readyForPullout = stats.totalPDI - stats.totalPullout;

    if (count > readyForPullout) {
      return res.status(400).json({
        status: 'Error',
        message: `Only ${readyForPullout} wagons available for pullout`
      });
    }

    // 2. Log the pullout in production logs
    await DailyWagonLog.create({
      date: new Date(),
      projectId,
      wagonType: 'N/A',
      partsProduced: {},
      stagesCompleted: {},
      partsConsumed: {},
      wagonReadyCount: 0,
      pdiCount: 0,
      readyForPullout: 0,
      pulloutDone: count
    });

    // 3. 🔄 ALSO log the pullout into DailyUpdate (sales side)
    const today = new Date();
today.setHours(0, 0, 0, 0);

await DailyUpdate.create({
  date: today,
  projectId,
  wagonSold: count,
  source: 'pullout'
});

    res.json({
      status: 'Success',
      message: `${count} wagons pulled out & delivered successfully`,
      newTotals: {
        totalPDI: stats.totalPDI,
        totalPullout: stats.totalPullout + count,
        readyForPullout: readyForPullout - count
      }
    });
  } catch (err) {
    console.error('❌ Pullout update error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Get BOM
// ----------------------
router.get('/bom/:wagonType', async (req, res) => {
  try {
    const safe = String(req.params.wagonType)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await WagonConfig.findOne({
      wagonType: new RegExp(`^${safe}$`, 'i')
    }).lean();

    if (!doc) {
      return res.status(404).json({
        status: 'Error',
        message: `No BOM found for wagonType ${req.params.wagonType}`
      });
    }

    const parts = derivePartsFromItems(doc);

    const stages = (doc.stages || []).map(s => ({
      name: String(s?.name || '')
    }));

    const dmItems = (doc.dmItems || []).map(item => ({
      sapCode: String(item?.sapCode || ''),
      sectionGroup: String(item?.sectionGroup || ''),
      description: String(item?.description || ''),
      qtyPerWagon: Number(item?.qtyPerWagon || 0),
      uom: String(item?.uom || ''),
      requiredNos: Number(item?.requiredNos || 0)
    }));
    const nonDmItems = (doc.nonDmItems || []).map(item => ({
      sapCode: String(item?.sapCode || ''),
      sectionGroup: String(item?.sectionGroup || ''),
      description: String(item?.description || ''),
      qtyPerWagon: Number(item?.qtyPerWagon || 0),
      uom: String(item?.uom || ''),
      requiredNos: Number(item?.requiredNos || 0)
    }));

    res.json({ wagonType: doc.wagonType, parts, stages, dmItems, nonDmItems });
  } catch (err) {
    console.error('❌ Error fetching BOM:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Get Inventory for a Project
// ----------------------
router.get('/parts/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const items = await Inventory.find({ projectId });

    const inventoryObj = {};
    items.forEach(item => {
      inventoryObj[item.part] = item.quantity;
    });

    res.json(inventoryObj);
  } catch (err) {
    console.error('❌ Error fetching project inventory:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Project Overview (single view)
// ----------------------
router.get('/projects/:projectId/overview', async (req, res) => {
  try {
    const { projectId } = req.params;

    const plan = await ProductionPlan.findOne({ projectId }).lean();
    if (!plan) {
      return res.status(404).json({ status: 'Error', message: 'Project not found' });
    }

    // Inventory
    const inventory = await Inventory.find({ projectId }).lean();

    // Logs (day-wise)
    const logs = await DailyWagonLog.find({ projectId }).sort({ date: -1 }).lean();

    // Aggregate totals
    const totals = await DailyWagonLog.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalPDI: { $sum: '$pdiCount' },
          totalPullout: { $sum: '$pulloutDone' }
        }
      }
    ]);

    const stats = totals[0] || { totalPDI: 0, totalPullout: 0 };
    const readyForPullout = stats.totalPDI - stats.totalPullout;

    res.json({
      project: plan,
      inventory,
      logs,
      totals: {
        pdi: stats.totalPDI,
        pulloutDone: stats.totalPullout,
        readyForPullout
      }
    });
  } catch (err) {
    console.error('❌ Project overview error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Stage-wise Aggregation
// ----------------------
router.get('/stages/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { month, year } = req.query;

    // If month/year not passed → default to current month
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month ? Number(month) - 1 : now.getMonth();

    const startOfMonth = new Date(y, m, 1);
    const startOfNextMonth = new Date(y, m + 1, 1);

    // 1) Aggregate completions for selected month
    const logs = await DailyWagonLog.find({
      projectId,
      date: { $gte: startOfMonth, $lt: startOfNextMonth }
    }).lean();

    const stageTotals = {};
    logs.forEach(log => {
      if (log.stagesCompleted) {
        for (const [stage, qty] of Object.entries(log.stagesCompleted)) {
          stageTotals[stage] = stageTotals[stage] || { stage, completed: 0 };
          stageTotals[stage].completed += Number(qty) || 0;
        }
      }
    });

    // 2) Get monthly plan for that month
    const plan = await ProductionPlan.findOne({
      projectId,
      year: y,
      monthNum: m + 1
    }).lean();

    // 3) Load BOM (for optional per-stage targets)
    let wagonType = plan?.wagonType;
    if (!wagonType) {
      const latestLog = logs[logs.length - 1];
      if (latestLog?.wagonType) wagonType = latestLog.wagonType;
    }
    const bom = wagonType ? await WagonConfig.findOne({ wagonType }).lean() : null;
    const bomStageMap = new Map(
      (bom?.stages || []).map(s => [String(s?.name || ''), Number(s?.target || 0)])
    );

    // 4) Use wagon-config stage order first, then append any logged stages not in config
    const configuredStageRows = (bom?.stages || [])
      .map(s => String(s?.name || '').trim())
      .filter(Boolean);
    const loggedStageRows = Object.keys(stageTotals);
    const STAGE_ROWS = [
      ...configuredStageRows,
      ...loggedStageRows.filter(name => !configuredStageRows.includes(name))
    ];

    // 5) Build rows
    const rows = STAGE_ROWS.map((name, index) => {
      const completed = stageTotals[name]?.completed || 0;
      const total = bomStageMap.get(name) || plan?.monthlyTarget || 0; // 🔑 monthly target per month
      return { stageNo: index + 1, stage: name, completed, total };
    });

    res.json(rows);
  } catch (err) {
    console.error('❌ Stage aggregation error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});


// ----------------------
// ✅ Daily Logs (supports month/year query)
// ----------------------
router.get('/daily', async (req, res) => {
  try {
    const { projectId, month, year } = req.query;

    if (!projectId) {
      return res.status(400).json({ status: 'Error', message: 'projectId is required' });
    }

    // If month/year not passed → default to current month
    const now = new Date();
    const y = year ? Number(year) : now.getFullYear();
    const m = month ? Number(month) - 1 : now.getMonth(); // 0-indexed

    const startOfMonth = new Date(y, m, 1);
    const startOfNextMonth = new Date(y, m + 1, 1);

    const logs = await DailyWagonLog.find({
      projectId,
      date: { $gte: startOfMonth, $lt: startOfNextMonth }
    })
      .sort({ date: 1 })
      .lean();

    res.json(logs);
  } catch (err) {
    console.error('❌ Daily logs fetch error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Overall Project Totals (all months)
// ----------------------
router.get('/projects/:projectId/overall', async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1) Aggregate all logs for this project (all months)
    const totals = await DailyWagonLog.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalPDI: { $sum: '$pdiCount' },
          totalPullout: { $sum: '$pulloutDone' }
        }
      }
    ]);

    const stats = totals[0] || { totalPDI: 0, totalPullout: 0 };
    const readyForPullout = stats.totalPDI - stats.totalPullout;

    // 2) Find confirmed order for this projectId
    const confirmedOrder = await mongoose.model('Enquiry').findOne({
      projectId,
      stage: 'Confirmed'
    }).lean();

    // 3) Compute total ordered wagons
    const totalOrdered = confirmedOrder
      ? (Number(confirmedOrder.noOfRakes || 0) * Number(confirmedOrder.wagonsPerRake || 0))
      : 0;

    // 4) Response
    res.json({
      projectId,
      overallCompleted: stats.totalPDI,
      overallPulloutDone: stats.totalPullout,
      readyForPullout,
      totalOrdered
    });
  } catch (err) {
    console.error('❌ Overall totals error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});




module.exports = router;
