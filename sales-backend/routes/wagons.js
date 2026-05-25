const express = require('express');
const router = express.Router();
const WagonConfig = require('../models/WagonConfig');
const StageMaster = require('../models/StageMaster');

const getItemInventoryName = (item = {}) => {
  const sapCode = String(item?.sapCode || '').trim();
  const description = String(item?.description || '').trim();
  if (sapCode && description) return `${sapCode} - ${description}`;
  return sapCode || description;
};

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

const normalizeStages = (stages = []) =>
  Array.isArray(stages)
    ? stages
        .map(s => ({
          name: String(s?.name || s || '').trim()
        }))
        .filter(s => s.name)
    : [];

const normalizeItems = (items = []) =>
  Array.isArray(items)
    ? items
        .map(item => ({
          sapCode: String(item?.sapCode || '').trim(),
          sectionGroup: String(item?.sectionGroup || '').trim(),
          description: String(item?.description || '').trim(),
          qtyPerWagon: Number(item?.qtyPerWagon || 0),
          uom: String(item?.uom || '').trim(),
          requiredNos: Number(item?.requiredNos || 0)
        }))
        .filter(
          item =>
            item.sapCode ||
            item.sectionGroup ||
            item.description ||
            item.qtyPerWagon ||
            item.uom ||
            item.requiredNos
        )
    : [];

const serializeConfig = (doc) => ({
  _id: doc._id,
  wagonType: doc.wagonType,
  parts: derivePartsFromItems(doc),
  stages: normalizeStages(doc.stages),
  dmItems: normalizeItems(doc.dmItems),
  nonDmItems: normalizeItems(doc.nonDmItems),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

// CREATE/UPDATE a wagon config
router.post('/', async (req, res) => {
  try {
    let { wagonType, stages, dmItems, nonDmItems } = req.body;

    if (!wagonType) {
      return res.status(400).json({ error: 'wagonType is required' });
    }

    wagonType = String(wagonType).trim();

    stages = normalizeStages(stages);
    dmItems = normalizeItems(dmItems);
    nonDmItems = normalizeItems(nonDmItems);

    const uniqueStageNames = [...new Set(stages.map(stage => stage.name))];
    if (uniqueStageNames.length) {
      await StageMaster.bulkWrite(
        uniqueStageNames.map(name => ({
          updateOne: {
            filter: { name },
            update: { $setOnInsert: { name } },
            upsert: true
          }
        }))
      );
    }

    const saved = await WagonConfig.findOneAndUpdate(
      { wagonType },
      { wagonType, parts: [], stages, dmItems, nonDmItems },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(serializeConfig(saved));
  } catch (err) {
    console.error('Error saving wagon config:', err);
    res.status(500).json({ error: 'Failed to save wagon config' });
  }
});

router.get('/stages/master', async (_req, res) => {
  try {
    const stages = await StageMaster.find().sort({ name: 1 }).lean();
    res.json(stages.map(stage => ({ name: stage.name })));
  } catch (err) {
    console.error('Error fetching stage master:', err);
    res.status(500).json({ error: 'Failed to fetch stage master' });
  }
});

// GET all configs
router.get('/', async (_req, res) => {
  try {
    const configs = await WagonConfig.find().sort({ wagonType: 1 }).lean();
    res.json(configs.map(serializeConfig));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

// GET normalized BOM for a type (case-insensitive)
router.get('/bom/:wagonType', async (req, res) => {
  try {
    const safe = String(req.params.wagonType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await WagonConfig.findOne({ wagonType: new RegExp(`^${safe}$`, 'i') }).lean();

    if (!doc) {
      return res.status(404).json({ error: `No BOM found for wagonType ${req.params.wagonType}` });
    }

    res.json(serializeConfig(doc));
  } catch (err) {
    console.error('Error fetching BOM:', err);
    res.status(500).json({ error: 'Failed to fetch BOM' });
  }
});

// GET a single wagon config by wagonType (case-insensitive)
router.get('/:wagonType', async (req, res) => {
  try {
    const safe = String(req.params.wagonType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await WagonConfig.findOne({ wagonType: new RegExp(`^${safe}$`, 'i') }).lean();

    if (!doc) {
      return res.status(404).json({ error: `No config found for wagonType ${req.params.wagonType}` });
    }

    res.json(serializeConfig(doc));
  } catch (err) {
    console.error('Error fetching wagon config:', err);
    res.status(500).json({ error: 'Failed to fetch wagon config' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await WagonConfig.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Wagon config not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting wagon config:', err);
    res.status(500).json({ error: 'Failed to delete wagon config' });
  }
});

module.exports = router;
