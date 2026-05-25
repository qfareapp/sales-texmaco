const express = require('express');
const router = express.Router();
const PartInventoryLog = require('../models/PartInventoryLog');
const Inventory = require('../models/Inventory');

const buildPartName = ({ name, sapCode, description }) => {
  const explicitName = String(name || '').trim();
  if (explicitName) return explicitName;

  const code = String(sapCode || '').trim();
  const desc = String(description || '').trim();
  if (code && desc) return `${code} - ${desc}`;
  return code || desc;
};

const normalizeEntry = (entry = {}) => {
  const sapCode = String(entry.sapCode || '').trim();
  const description = String(entry.description || entry.itemDescription || '').trim();
  const unit = String(entry.unit || '').trim();
  const part = buildPartName({
    name: entry.name,
    sapCode,
    description
  });
  const quantity = Number(
    entry.quantity ?? entry.newEntry ?? 0
  );

  return {
    part,
    quantity,
    sapCode,
    description,
    unit
  };
};

// POST /api/inventory/add -> log entry + update Inventory collection
router.post('/add', async (req, res) => {
  const { date, projectId, wagonType, partEntries = [] } = req.body;

  try {
    if (!date || !projectId || !wagonType) {
      return res.status(400).json({ status: 'Error', message: 'date, projectId, wagonType required' });
    }

    const normalizedEntries = partEntries
      .map(normalizeEntry)
      .filter(entry => entry.part && Number.isFinite(entry.quantity) && entry.quantity !== 0);

    const logs = normalizedEntries.map(({ part, quantity, sapCode, description, unit }) => ({
      date,
      projectId,
      wagonType,
      part,
      quantity,
      sapCode,
      description,
      unit
    }));
    if (logs.length > 0) await PartInventoryLog.insertMany(logs);

    const ops = normalizedEntries.map(({ part, quantity, sapCode, description, unit }) => ({
      updateOne: {
        filter: { projectId, part },
        update: {
          $inc: { quantity },
          $set: { sapCode, description, unit }
        },
        upsert: true
      }
    }));
    if (ops.length > 0) await Inventory.bulkWrite(ops);

    res.status(201).json({ status: 'Success', message: 'Inventory logged & updated' });
  } catch (err) {
    console.error('Inventory update error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// GET /api/inventory/available/:projectId -> live inventory totals
router.get('/available/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const items = await Inventory.find({ projectId }).lean();

    const formatted = {};
    items.forEach(it => {
      formatted[it.part] = {
        available: it.quantity,
        reserved: it.reserved || 0,
        minLevel: it.minLevel || 0,
        maxLevel: it.maxLevel || 0,
        sapCode: it.sapCode || '',
        description: it.description || '',
        unit: it.unit || ''
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

module.exports = router;
