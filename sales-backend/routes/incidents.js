const express = require('express');
const multer = require('multer');
const IncidentReport = require('../models/IncidentReport');

const router = express.Router();

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
});

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

  const requiredReportedBy = [
    ['reportedByName', 'Reported by name is required'],
    ['departmentContractor', 'Department / Contractor is required'],
    ['empId', 'Emp ID is required'],
    ['mobileNumber', 'Mobile number is required'],
    ['department', 'Department is required'],
    ['location', 'Location is required'],
  ];

  requiredReportedBy.forEach(([field, message]) => {
    if (!body[field]) errors.push(message);
  });

  if (category === 'Learning Event') {
    if (!body.observation) errors.push('Observation is required for Learning Event');
    if (!body.responsibleDepartment) errors.push('Responsible Department is required for Learning Event');
  }

  if (category === 'Incident') {
    if (!body.incidentDate) errors.push('Date is required for Incident');
    if (!body.incidentTime) errors.push('Time is required for Incident');
    if (!body.victimName) errors.push('Name of Victim is required for Incident');
    if (!body.victimDepartment) errors.push('Department of Victim is required for Incident');
    if (!body.description) errors.push('Description of Incident is required for Incident');
  }

  return errors;
}

router.post('/', upload.array('attachments', 5), async (req, res, next) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const referenceNo = await generateNextReferenceNo();

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
      victimName: req.body.victimName,
      victimDepartment: req.body.victimDepartment,
      description: req.body.description,
      attachments: (req.files || []).map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer,
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

router.get('/', async (req, res, next) => {
  try {
    const query = {};
    if (req.query.empId) query['reportedBy.empId'] = req.query.empId;
    if (req.query.mobileNumber) query['reportedBy.mobileNumber'] = req.query.mobileNumber;

    const reports = await IncidentReport.find(query)
      .sort({ createdAt: -1 })
      .select('-attachments.data')
      .lean();

    return res.json({
      success: true,
      reports: reports.map((report) => ({
        ...report,
        attachmentCount: report.attachments?.length || 0,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const report = await IncidentReport.findById(req.params.id).select('-attachments.data').lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }

    return res.json({ success: true, report });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id/attachments/:attachmentId', async (req, res, next) => {
  try {
    const report = await IncidentReport.findById(req.params.id).select('attachments');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }

    const attachment = report.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    return res.send(attachment.data);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
