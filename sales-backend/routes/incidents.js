const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const IncidentReport = require('../models/IncidentReport');

const router = express.Router();

/* ── Cloudinary config ── */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* ── Multer → Cloudinary storage ── */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'texmaco-incidents',
      resource_type: isImage ? 'image' : 'raw',
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
});

/* ── Constants ── */
const LEARNING_TYPES = ['Unsafe Condition', 'Unsafe Act', 'Near Miss'];
const INCIDENT_TYPES = [
  'Fire Incident',
  'Near Miss',
  'First Aid',
  'Minor',
  'Major',
  'Illness',
  'Property Damage',
  'Dangerous Occurrence',
  'Environment Issue',
];

/* ── Helpers ── */
async function generateNextReferenceNo() {
  const latestReport = await IncidentReport.findOne(
    { referenceNo: /^TEX-\d+$/ },
    { referenceNo: 1 }
  )
    .sort({ createdAt: -1 })
    .lean();

  const currentNumber = latestReport?.referenceNo
    ? Number.parseInt(latestReport.referenceNo.replace('TEX-', ''), 10)
    : 0;

  return `TEX-${String(currentNumber + 1).padStart(6, '0')}`;
}

function parseDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseVictims(rawVictims, fallbackName, fallbackDepartment) {
  let parsedVictims = [];

  if (rawVictims) {
    try {
      const normalized = typeof rawVictims === 'string' ? JSON.parse(rawVictims) : rawVictims;
      if (Array.isArray(normalized)) {
        parsedVictims = normalized
          .map((victim) => ({
            name: String(victim?.name || '').trim(),
            department: String(victim?.department || '').trim(),
          }))
          .filter((victim) => victim.name && victim.department);
      }
    } catch (_) {}
  }

  if (!parsedVictims.length && fallbackName && fallbackDepartment) {
    parsedVictims = [{ name: String(fallbackName).trim(), department: String(fallbackDepartment).trim() }];
  }

  return parsedVictims;
}

function validatePayload(body) {
  const errors = [];
  const category = body.reportCategory;
  const type = body.reportType;

  if (!['Learning Event', 'Incident'].includes(category)) {
    errors.push('reportCategory must be Learning Event or Incident');
  }

  if (!type) {
    errors.push('reportType is required');
  } else if (category === 'Learning Event' && !LEARNING_TYPES.includes(type)) {
    errors.push('Invalid reportType for Learning Event');
  } else if (category === 'Incident' && !INCIDENT_TYPES.includes(type)) {
    errors.push('Invalid reportType for Incident');
  }

  const requiredFields = [
    ['reportedByName', 'Reported by name is required'],
    ['departmentContractor', 'Department / Contractor is required'],
    ['empId', 'Emp ID is required'],
    ['mobileNumber', 'Mobile number is required'],
    ['department', 'Department is required'],
    ['location', 'Location is required'],
  ];

  requiredFields.forEach(([field, message]) => {
    if (!body[field]) errors.push(message);
  });

  if (category === 'Learning Event') {
    if (!body.observation) errors.push('Observation is required for Learning Event');
    if (!body.responsibleDepartment) errors.push('Responsible Department is required for Learning Event');
  }

  if (category === 'Incident') {
    const victims = parseVictims(body.victims, body.victimName, body.victimDepartment);
    if (!body.incidentDate) errors.push('Date is required for Incident');
    if (!body.incidentTime) errors.push('Time is required for Incident');
    if (!victims.length) errors.push('At least one victim is required for Incident');
    if (!body.description) errors.push('Description of Incident is required for Incident');
  }

  return errors;
}

/* ── Format attachment for API response ── */
function formatAttachment(attachment) {
  return {
    _id: attachment._id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    url: attachment.url,
  };
}

/* ────────────────────────────────────────
   POST /api/incidents
───────────────────────────────────────── */
router.post('/', upload.array('attachments', 5), async (req, res, next) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) {
      // Clean up any files already uploaded to Cloudinary if validation fails
      await Promise.allSettled(
        (req.files || []).map((file) =>
          cloudinary.uploader.destroy(file.filename, {
            resource_type: file.mimetype?.startsWith('image/') ? 'image' : 'raw',
          })
        )
      );
      return res.status(400).json({ success: false, errors });
    }

    const referenceNo = await generateNextReferenceNo();
    const victims = parseVictims(req.body.victims, req.body.victimName, req.body.victimDepartment);

    const report = await IncidentReport.create({
      referenceNo,
      reportCategory: req.body.reportCategory,
      reportType: req.body.reportType,
      reportedBy: {
        name: req.body.reportedByName,
        departmentContractor: req.body.departmentContractor,
        empId: req.body.empId,
        mobileNumber: req.body.mobileNumber,
        department: req.body.department,
      },
      observation: req.body.observation,
      responsibleDepartment: req.body.responsibleDepartment,
      incidentDate: parseDate(req.body.incidentDate),
      incidentTime: req.body.incidentTime,
      location: req.body.location,
      victims,
      victimName: victims[0]?.name || req.body.victimName,
      victimDepartment: victims[0]?.department || req.body.victimDepartment,
      description: req.body.description,
      attachments: (req.files || []).map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: file.path,          // Cloudinary secure_url
        publicId: file.filename, // Cloudinary public_id
      })),
    });

    return res.status(201).json({
      success: true,
      report: {
        id: report._id,
        referenceNo: report.referenceNo,
        reportCategory: report.reportCategory,
        reportType: report.reportType,
        createdAt: report.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/* ────────────────────────────────────────
   GET /api/incidents
───────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const query = {};
    if (req.query.empId) query['reportedBy.empId'] = req.query.empId;
    if (req.query.mobileNumber) query['reportedBy.mobileNumber'] = req.query.mobileNumber;

    const reports = await IncidentReport.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      reports: reports.map((report) => ({
        ...report,
        attachments: (report.attachments || []).map(formatAttachment),
        attachmentCount: report.attachments?.length || 0,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

/* ────────────────────────────────────────
   GET /api/incidents/:id
───────────────────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const report = await IncidentReport.findById(req.params.id).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }

    return res.json({
      success: true,
      report: {
        ...report,
        attachments: (report.attachments || []).map(formatAttachment),
        attachmentCount: report.attachments?.length || 0,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
