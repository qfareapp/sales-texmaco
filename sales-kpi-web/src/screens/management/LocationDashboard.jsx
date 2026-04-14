import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../../api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const siteMeta = {
  agarpara: {
    title: 'Agarpara Works',
    description: 'Overview of production activities, pullouts, and readiness for dispatch.',
  },
  sodepur: {
    title: 'Sodepur Works',
    description: 'Snapshot of current production status and daily updates.',
  },
  belgharia: {
    title: 'Belgharia Works',
    description: 'Production progress, bottlenecks, and upcoming targets.',
  },
  'texmaco-west': {
    title: 'Texmaco West',
    description: 'Live view of production readiness and completions.',
  },
};

const LocationDashboard = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const fullDashboardSites = ['agarpara', 'sodepur'];
  const [rows, setRows] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [totals, setTotals] = useState({ target: 0, achieved: 0, weeks: [0, 0, 0, 0] });
  const [dispatchRows, setDispatchRows] = useState([]);
  const [dispatchTotals, setDispatchTotals] = useState({ target: 0, achieved: 0, weeks: [0, 0, 0, 0] });
  const [dispatchError, setDispatchError] = useState('');
  const [issueRows, setIssueRows] = useState([]);
  const [issuesError, setIssuesError] = useState('');
  const [stageData, setStageData] = useState([]);
  const [stageError, setStageError] = useState('');
  const reportRef = useRef(null);

  const meta = siteMeta[siteId] || {
    title: 'Unknown Site',
    description: 'This site is not configured yet.',
  };

  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const prodPct = totals.target > 0 ? Math.round((totals.achieved / totals.target) * 100) : 0;
  const dispatchPct = dispatchTotals.target > 0 ? Math.round((dispatchTotals.achieved / dispatchTotals.target) * 100) : 0;
  const stageSummary = stageData.length
    ? stageData.reduce(
        (acc, wagon) => {
          wagon.stages.forEach((s) => {
            acc.cfLast += Number(s.cfLast) || 0;
            acc.prodn += Number(s.prodn) || 0;
            acc.totalCurr += Number(s.totalCurr) || 0;
            acc.inHand += Number(s.inHand) || 0;
          });
          return acc;
        },
        { cfLast: 0, prodn: 0, totalCurr: 0, inHand: 0 }
      )
    : null;
  const reportDateObj = reportDate ? new Date(reportDate) : new Date();
  const reportDayOfMonth = reportDateObj.getDate();
  const reportDaysInMonth = new Date(reportDateObj.getFullYear(), reportDateObj.getMonth() + 1, 0).getDate();
  const daysCovered = Math.max(1, reportDayOfMonth);
  const remainingDays = Math.max(1, reportDaysInMonth - reportDayOfMonth);
  const totalAvgPerDay = (totals.achieved / daysCovered).toFixed(1);
  const totalNeededPerDay = (() => {
    const remaining = Math.max(0, totals.target - totals.achieved);
    return (remaining / remainingDays).toFixed(1);
  })();
  const dispatchAvgPerDay = (dispatchTotals.achieved / daysCovered).toFixed(1);
  const dispatchNeededPerDay = (() => {
    const remaining = Math.max(0, dispatchTotals.target - dispatchTotals.achieved);
    return (remaining / remainingDays).toFixed(1);
  })();

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const element = reportRef.current;
    // Hide upload controls during export
    const uploadSections = element.querySelectorAll('.upload-section');
    uploadSections.forEach((el) => (el.style.display = 'none'));
    const noPrintEls = element.querySelectorAll('.no-print');
    noPrintEls.forEach((el) => (el.style.display = 'none'));

    const canvas = await html2canvas(element, {
      scale: 1.2, // lower scale to reduce image size
      useCORS: true,
      scrollY: -window.scrollY,
      scrollX: -window.scrollX,
    });

    uploadSections.forEach((el) => (el.style.display = ''));
    noPrintEls.forEach((el) => (el.style.display = ''));
    const imgData = canvas.toDataURL('image/jpeg', 0.7); // JPEG with moderate quality to shrink size
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    let page = 1;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    pdf.setFontSize(9);
    pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
    heightLeft -= pageHeight;
    page += 1;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      pdf.setFontSize(9);
      pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      heightLeft -= pageHeight;
      page += 1;
    }

    pdf.save(`management-report-${siteId}-${reportDate || 'today'}.pdf`);
  };

  const stageTotalsByName = (() => {
    if (!stageData.length) return {};
    const totals = {};
    stageData.forEach((wagon) => {
      wagon.stages.forEach((s) => {
        const key = s.stage;
        if (!totals[key]) {
          totals[key] = { totalCurr: 0, inHand: 0 };
        }
        totals[key].totalCurr += Number(s.totalCurr) || 0;
        totals[key].inHand += Number(s.inHand) || 0;
      });
    });
    return totals;
  })();

  const dispatchOutstandingByWagon = dispatchRows.reduce((acc, row) => {
    const key = String(row.description || '').trim().toLowerCase();
    acc[key] = Math.max(0, Number(row.target || 0) - Number(row.achieved || 0));
    return acc;
  }, {});

  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const fetchStoredFile = async (category, parser, setError) => {
    try {
      const res = await api.get(`/dashboard-uploads/${siteId}/${category}/latest`);
      const base64 = res.data?.file?.data;
      if (!base64) return;
      const buffer = base64ToArrayBuffer(base64);
      await parser(buffer);
    } catch (err) {
      // 404 is expected if nothing uploaded yet
      if (err?.response?.status !== 404) {
        console.error(`Fetch ${category} failed`, err);
        setError?.('Could not load saved file from server.');
      }
    }
  };

  useEffect(() => {
    if (fullDashboardSites.includes(siteId)) {
      fetchStoredFile('production', parseProductionBuffer, setUploadError);
      fetchStoredFile('dispatch', parseDispatchBuffer, setDispatchError);
      fetchStoredFile('stage', parseStageBuffer, setStageError);
      fetchStoredFile('issues', parseIssuesBuffer, setIssuesError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const parseProductionSheet = (sheet) => {
    const rows2D = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const findHeaderRow = () => {
      let idx = rows2D.findIndex((r) => r.some((cell) => String(cell).toLowerCase().includes('wagon')));
      if (idx !== -1) return idx;
      idx = rows2D.findIndex((r) => {
        const lc = r.map((c) => String(c).toLowerCase());
        return lc.some((c) => c.includes('target')) && lc.some((c) => c.includes('achvd'));
      });
      if (idx !== -1) return idx;
      idx = rows2D.findIndex((r) => r.some((cell) => String(cell).toLowerCase().includes('description')));
      return idx;
    };

    let headerIdx = findHeaderRow();
    if (headerIdx === -1) throw new Error('Header row with Wagon/Target/Achvd not found');
    // If the next row clearly has the Wagon columns, shift header to that row (two-line headers)
    if (
      rows2D[headerIdx + 1] &&
      rows2D[headerIdx + 1].some((cell) => String(cell).toLowerCase().includes('wagon'))
    ) {
      headerIdx = headerIdx + 1;
    }

    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const tryResolve = (rowIdx) => {
      const headerRow = rows2D[rowIdx].map((c) => normalize(c));
      const findIdx = (key) => headerRow.findIndex((c) => c.includes(key));
      const locateWeek = (num) =>
        headerRow.findIndex((c) => c.includes(`wk${num}`) || c === `${num}` || c.endsWith(`${num}`));

      const slIdx = findIdx('sl');
      const descIdx = findIdx('wagon') !== -1 ? findIdx('wagon') : findIdx('description');
      const targetIdx = findIdx('target');
      const achievedIdx = findIdx('achvd') !== -1 ? findIdx('achvd') : findIdx('achieved');
      const wkIdx = [
        locateWeek(1),
        locateWeek(2),
        locateWeek(3),
        locateWeek(4),
      ];
      return { slIdx, descIdx, targetIdx, achievedIdx, wkIdx };
    };

    let cols = tryResolve(headerIdx);
    if (cols.wkIdx.some((i) => i === -1) || cols.descIdx === -1 || cols.targetIdx === -1 || cols.achievedIdx === -1) {
      if (rows2D[headerIdx + 1]) {
        cols = tryResolve(headerIdx + 1);
      }
    }

    if (cols.descIdx === -1 || cols.targetIdx === -1 || cols.achievedIdx === -1 || cols.wkIdx.some((i) => i === -1)) {
      throw new Error('Missing expected columns (Wagon/Target/Achvd./Weeks)');
    }

    const dataRows = rows2D.slice(headerIdx + 1);
    const parsed = [];

    for (const row of dataRows) {
      const description = String(row[cols.descIdx] || '').trim();
      const isTotalRow = description.toLowerCase().startsWith('total');
      if (isTotalRow) break;
      if (!description) continue;

      const target = Number(row[cols.targetIdx]) || 0;
      const achieved = Number(row[cols.achievedIdx]) || 0;
      const weeks = cols.wkIdx.map((idx) => Number(row[idx]) || 0);
      const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;

      parsed.push({
        sl: cols.slIdx !== -1 ? row[cols.slIdx] || parsed.length + 1 : parsed.length + 1,
        description,
        target,
        achieved,
        weeks,
        pct,
      });
    }

    const totalsCalc = parsed.reduce(
      (acc, r) => {
        acc.target += r.target;
        acc.achieved += r.achieved;
        r.weeks.forEach((w, i) => {
          acc.weeks[i] += w;
        });
        return acc;
      },
      { target: 0, achieved: 0, weeks: [0, 0, 0, 0] }
    );

    return { parsed, totalsCalc };
  };

  const parseProductionBuffer = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const { parsed, totalsCalc } = parseProductionSheet(sheet);
    setRows(parsed);
    setTotals(totalsCalc);
    return { parsed, totalsCalc };
  };

  const saveFileToServer = async (category, file) => {
    const formData = new FormData();
    formData.append('siteId', siteId);
    formData.append('category', category);
    formData.append('file', file);
    await api.post('/dashboard-uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const data = await file.arrayBuffer();
      await parseProductionBuffer(data);
      await saveFileToServer('production', file);
    } catch (err) {
      console.error(err);
      setUploadError('Could not read the Excel file. Please use the preset format.');
      setRows([]);
      setTotals({ target: 0, achieved: 0, weeks: [0, 0, 0, 0] });
    }
  };

  const parseDespatchSheet = (sheet) => {
    const rows2D = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const quickNumberFallback = () => {
      // Handle ultra-minimal sheets (e.g., two numbers: Target and Achieved)
      for (const row of rows2D) {
        const nums = row.filter((c) => !Number.isNaN(Number(c))).map((c) => Number(c));
        if (nums.length >= 2) {
          const target = nums[0] || 0;
          const achieved = nums[1] || 0;
          const parsed = [
            {
              id: 1,
              description: 'Total',
              target,
              achieved,
              weeks: [0, 0, 0, 0],
              pct: target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0,
            },
          ];
          return {
            parsed,
            totalsCalc: {
              target,
              achieved,
              weeks: [0, 0, 0, 0],
            },
          };
        }
      }
      return null;
    };

    const findHeaderRow = () => {
      let idx = rows2D.findIndex((r) => {
        const lc = r.map((c) => String(c).toLowerCase());
        return lc.some((c) => c.includes('target')) && lc.some((c) => c.includes('ach'));
      });
      if (idx !== -1) return idx;
      idx = rows2D.findIndex((r) => r.some((cell) => String(cell).toLowerCase().includes('dm')));
      if (idx !== -1) return idx;
      idx = rows2D.findIndex((r) => {
        const lc = r.map((c) => String(c).toLowerCase());
        return lc.some((c) => c.includes('wagon')) && lc.some((c) => c.includes('target'));
      });
      return idx;
    };

    let headerIdx = findHeaderRow();
    if (headerIdx === -1) {
      const fallback = quickNumberFallback();
      if (fallback) return fallback;
      throw new Error('Header row with Target/Achvd not found');
    }
    if (
      rows2D[headerIdx + 1] &&
      rows2D[headerIdx + 1].some((cell) => String(cell).toLowerCase().includes('target'))
    ) {
      headerIdx = headerIdx + 1;
    }

    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const tryResolve = (rowIdx) => {
      const headerRow = rows2D[rowIdx].map((c) => normalize(c));
      const findIdx = (key) => headerRow.findIndex((c) => c.includes(key));
      const locateWeek = (num) =>
        headerRow.findIndex((c) => c.includes(`wk${num}`) || c === `${num}` || c.endsWith(`${num}`));

      const descIdx = findIdx('wagon') !== -1 ? findIdx('wagon') : findIdx('description');
      const targetIdx = findIdx('target');
      const achievedIdx =
        findIdx('dm') !== -1
          ? findIdx('dm')
          : findIdx('achvd') !== -1
          ? findIdx('achvd')
          : findIdx('achieved');
      const wkIdx = [locateWeek(1), locateWeek(2), locateWeek(3), locateWeek(4)].map((i) =>
        i === -1 ? null : i
      );
      return { descIdx, targetIdx, achievedIdx, wkIdx };
    };

    let cols = tryResolve(headerIdx);
    if (cols.descIdx === -1 || cols.targetIdx === -1 || cols.achievedIdx === -1) {
      if (rows2D[headerIdx + 1]) cols = tryResolve(headerIdx + 1);
    }
    if (cols.descIdx === -1 || cols.targetIdx === -1 || cols.achievedIdx === -1) {
      throw new Error('Missing expected columns (Wagon/Target/Achvd./Weeks)');
    }

    const dataRows = rows2D.slice(headerIdx + 1);
    const parsed = [];

    for (const row of dataRows) {
      const description = String(row[cols.descIdx] || '').trim();
      const isTotalRow =
        description.toLowerCase().startsWith('total') ||
        String(row[cols.targetIdx]).toLowerCase().includes('total');
      if (isTotalRow) break;
      if (!description) continue;
      const target = Number(row[cols.targetIdx]) || 0;
      const achieved = Number(row[cols.achievedIdx]) || 0;
      const weeks = cols.wkIdx.map((idx) => (idx === null ? 0 : Number(row[idx]) || 0));
      const pct = target > 0 ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
      parsed.push({
        id: parsed.length + 1,
        description,
        target,
        achieved,
        weeks,
        pct,
      });
    }

    const totalsCalc = parsed.reduce(
      (acc, r) => {
        acc.target += r.target;
        acc.achieved += r.achieved;
        r.weeks.forEach((w, i) => {
          acc.weeks[i] += w;
        });
        return acc;
      },
      { target: 0, achieved: 0, weeks: [0, 0, 0, 0] }
    );

    return { parsed, totalsCalc };
  };

  const parseDispatchBuffer = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const { parsed, totalsCalc } = parseDespatchSheet(sheet);
    setDispatchRows(parsed);
    setDispatchTotals(totalsCalc);
    return { parsed, totalsCalc };
  };

  const handleDispatchFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDispatchError('');
    try {
      const data = await file.arrayBuffer();
      await parseDispatchBuffer(data);
      await saveFileToServer('dispatch', file);
    } catch (err) {
      console.error(err);
      setDispatchError('Could not read the Excel file. Please use the Despatch format.');
      setDispatchRows([]);
      setDispatchTotals({ target: 0, achieved: 0, weeks: [0, 0, 0, 0] });
    }
  };

  const parseStageSheet = (sheet) => {
    const rows2D = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const stageHeaderIdx = rows2D.findIndex((r) => r.some((cell) => String(cell).toLowerCase().includes('stage')));
    if (stageHeaderIdx === -1 || !rows2D[stageHeaderIdx + 2]) {
      throw new Error('Stage header row not found');
    }

    let wagonRow = rows2D[stageHeaderIdx + 1];
    let subHeaderRow = rows2D[stageHeaderIdx + 2];

    // If wagon names are one row lower (two-line header), shift
    if (wagonRow.every((c) => String(c).trim() === '') && rows2D[stageHeaderIdx + 2]) {
      wagonRow = rows2D[stageHeaderIdx + 2];
      subHeaderRow = rows2D[stageHeaderIdx + 3] || [];
    }

    const parseDmTillFromLabel = (label) => {
      const str = String(label);
      const match = str.match(/=>\s*([0-9.]+)/i);
      if (match) return Number(match[1]) || 0;
      const trailing = str.match(/([0-9.]+)\s*$/);
      if (trailing) return Number(trailing[1]) || 0;
      return 0;
    };

    const parseNumberFromCell = (val) => {
      const matches = String(val).match(/-?\d+(?:\.\d+)?/g);
      if (!matches || !matches.length) return 0;
      const num = Number(matches[matches.length - 1]);
      return Number.isFinite(num) ? num : 0;
    };

    const cleanWagonName = (label) => {
      const parts = String(label).split(/dm\s+till/i);
      const name = parts[0]?.trim();
      return name || String(label).trim();
    };

    const groupStarts = [];
    for (let i = 1; i < wagonRow.length; i += 1) {
      if (String(wagonRow[i]).trim()) groupStarts.push(i);
    }
    if (!groupStarts.length) throw new Error('No wagon columns found');

    const groups = groupStarts.map((startIdx, idx) => {
      const endIdx = groupStarts[idx + 1] ? groupStarts[idx + 1] - 1 : wagonRow.length - 1;
      const labelRaw = String(wagonRow[startIdx]).trim();
      return {
        startIdx,
        endIdx,
        label: labelRaw,
        dmTill: parseDmTillFromLabel(labelRaw),
        displayName: cleanWagonName(labelRaw),
      };
    });

    const keyFromHeader = (cell) => {
      const c = String(cell).toLowerCase();
      if (c.includes('c/f')) return 'cfLast';
      if (c.includes('prodn')) return 'prodn';
      if (c.includes('current')) return 'totalCurr';
      if (c.includes('hand')) return 'inHand';
      if (c.includes('total')) return 'totalPrev';
      return null;
    };

    const dataRows = rows2D.slice(stageHeaderIdx + 3);
    const outstandingLoads = {};
    const wagons = groups.map((g, idx) => ({
      id: idx + 1,
      name: g.displayName || `Wagon ${idx + 1}`,
      dmTill: g.dmTill || 0,
      stages: [],
    }));

    for (const row of dataRows) {
      // Stage name typically in column 1 (after Sl. No.), fallback to first cell
      const stageName = String(row[1] || row[0] || '').trim();
      if (!stageName) continue;
      if (stageName.toLowerCase().startsWith('total')) break;

      if (stageName.toLowerCase().includes('out standing')) {
        groups.forEach((g) => {
          const sliceValues = row.slice(g.startIdx, g.endIdx + 1);
          let valNum = 0;
          for (const v of sliceValues) {
            if (String(v).trim()) {
              valNum = parseNumberFromCell(v);
              break;
            }
          }
          outstandingLoads[g.displayName.toLowerCase()] = valNum;
        });
        continue;
      }

      groups.forEach((g, gi) => {
        const sliceHeaders = subHeaderRow.slice(g.startIdx, g.endIdx + 1);
        const sliceValues = row.slice(g.startIdx, g.endIdx + 1);
        const stageEntry = { stage: stageName, totalPrev: 0, cfLast: 0, prodn: 0, totalCurr: 0, inHand: 0 };

        sliceHeaders.forEach((h, idx) => {
          const key = keyFromHeader(h);
          if (!key) return;
          const val = Number(sliceValues[idx]) || 0;
          stageEntry[key] = val;
        });

        // If all zero and stage already pushed, still keep to mirror sheet
        wagons[gi].stages.push(stageEntry);
      });
    }

    wagons.forEach((w) => {
      const key = String(w.name || '').toLowerCase();
      if (key in outstandingLoads) {
        w.outstanding = outstandingLoads[key];
      }
    });

    return wagons;
  };

  const parseStageBuffer = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const wagons = parseStageSheet(sheet);
    setStageData(wagons);
    return wagons;
  };

  const parseIssuesSheet = (sheet) => {
    const rows2D = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rows2D.length) throw new Error('Sheet is empty');

    // First row: wagon headers starting column B onward
    const headerRow = rows2D[0];
    const headers = headerRow.slice(1).map((h) => String(h || '').trim());
    const headerIndexes = headers
      .map((name, idx) => ({ name, idx: idx + 1 }))
      .filter((h) => h.name);

    if (!headerIndexes.length) {
      throw new Error('Expected wagon type headers in the first row (columns B onward).');
    }

    const parsed = [];

    for (let r = 1; r < rows2D.length; r += 1) {
      const row = rows2D[r] || [];
      const label = String(row[0] || '').trim(); // e.g., "Reason for Prod. Loss till date"
      headerIndexes.forEach((h) => {
        const issueText = String(row[h.idx] || '').trim();
        if (!issueText) return;
        parsed.push({
          id: parsed.length + 1,
          wagon: h.name,
          issue: label ? `${label}: ${issueText}` : issueText,
        });
      });
    }

    return { parsed };
  };

  const parseIssuesBuffer = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const { parsed } = parseIssuesSheet(sheet);
    setIssueRows(parsed);
    setIssuesError('');
    return { parsed };
  };

  const handleIssuesFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIssuesError('');
    try {
      const data = await file.arrayBuffer();
      await parseIssuesBuffer(data);
      await saveFileToServer('issues', file);
    } catch (err) {
      console.error(err);
      setIssuesError('Could not read the Issues tracker. Use the format with wagon headers on row 1 (from column B) and reasons beneath.');
      setIssueRows([]);
    }
  };

  const handleStageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStageError('');
    try {
      const data = await file.arrayBuffer();
      await parseStageBuffer(data);
      await saveFileToServer('stage', file);
    } catch (err) {
      console.error(err);
      setStageError('Could not read the Stage tracker. Please use the provided format.');
      setStageData([]);
    }
  };

  return (
    <div className="container mt-5 pt-4 management-page" ref={reportRef}>
      <div className="management-hero mb-4 p-4 rounded-3">
        <div>
          <p className="text-uppercase text-muted mb-1 small letter-wide">Management</p>
          <h2 className="fw-bold m-0 text-white">{meta.title}</h2>
          <p className="text-light opacity-75 mt-2 mb-0">{meta.description}</p>
        </div>
        <div className="d-flex flex-wrap gap-2 no-print">
          <button className="btn btn-warning btn-sm fw-semibold" onClick={handleExportPDF}>
            Export PDF
          </button>
        </div>
      </div>

      {fullDashboardSites.includes(siteId) && (
        <>
          <div className="d-flex flex-column flex-md-row align-items-md-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 fw-semibold">Report date:</label>
              <input
                type="date"
                className="form-control"
                style={{ maxWidth: '200px' }}
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <small className="text-muted ms-md-3">
              Days of production counted: {daysCovered} (1st to selected date)
            </small>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100 kpi-card kpi-gradient-blue">
                <div className="card-body">
                  <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                    Target vs Achievement
                  </p>
                  <h4 className="fw-bold mb-1">{prodPct}%</h4>
                  <small className="text-muted">
                    Achieved {totals.achieved} of {totals.target} | Weeks: {totals.weeks[0]} / {totals.weeks[1]} / {totals.weeks[2]} / {totals.weeks[3]}
                  </small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100 kpi-card kpi-gradient-green">
                <div className="card-body">
                  <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                    Target vs Dispatch (DM & TPC)
                  </p>
                  <h4 className="fw-bold mb-1">{dispatchPct}%</h4>
                  <small className="text-muted">
                    Dispatched {dispatchTotals.achieved} of {dispatchTotals.target} | Weeks: {dispatchTotals.weeks[0]} / {dispatchTotals.weeks[1]} / {dispatchTotals.weeks[2]} / {dispatchTotals.weeks[3]}
                  </small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100 kpi-card kpi-gradient-orange">
                <div className="card-body">
                  <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                    Wagon Rate (Avg vs Needed)
                  </p>
                  <h4 className="fw-bold mb-1">{totalAvgPerDay} / {totalNeededPerDay} per day</h4>
                  <small className="text-muted">
                    Avg/day so far vs required/day to meet target (report date drives day count)
                  </small>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                    Dispatch Rate (Avg vs Needed)
                  </p>
                  <h4 className="fw-bold mb-1">{dispatchAvgPerDay} / {dispatchNeededPerDay} per day</h4>
                  <small className="text-muted">
                    Avg/day dispatched vs required/day to meet dispatch target (report date drives day count)
                  </small>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {fullDashboardSites.includes(siteId) && (
        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 upload-section">
              <div>
                <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                  Prodn Target vs Achievement for the Month
                </p>
                {/* <h5 className="fw-bold m-0">Upload production tracker (Excel)</h5>
                <small className="text-muted">
                  Format with columns: Sl., Description/Wagon, Target, Achvd., Wk 1(7th), Wk 2 (14th), Wk 3 (21st), Wk 4(31st). The parser finds the row where "Wagon" appears.
                </small> */}
              </div>
              <div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="form-control"
                  onChange={handleFile}
                />
            </div>
          </div>
          {uploadError && <div className="alert alert-danger py-2 mb-3">{uploadError}</div>}

          {rows.length > 0 && (
            <div className="table-responsive">
              <table className="table table-sm align-middle table-striped table-hover text-center target-table">
                <thead className="table-dark">
                    <tr>
                      <th style={{ width: '60px' }}>Sl.</th>
                      <th className="text-start">Description / Wagon</th>
                      <th>Target</th>
                      <th>Achvd.</th>
                      <th>Avg / Day</th>
                      <th>Needed / Day</th>
                      <th>% Completion</th>
                      <th>Wk 1 (7th)</th>
                      <th>Wk 2 (14th)</th>
                      <th>Wk 3 (21st)</th>
                      <th>Wk 4 (31st)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.description}>
                        <td>{row.sl}</td>
                        <td className="text-start fw-semibold">{row.description}</td>
                        <td>{row.target}</td>
                        <td>{row.achieved}</td>
                        <td>{(row.achieved / daysCovered).toFixed(1)}</td>
                        <td>
                          {(() => {
                            const remaining = Math.max(0, row.target - row.achieved);
                            return (remaining / remainingDays).toFixed(1);
                          })()}
                        </td>
                        <td>
                          <div className="d-flex flex-column align-items-center gap-1">
                            <div className="progress w-100 target-progress">
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: `${row.pct}%` }}
                                aria-valuenow={row.pct}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              />
                            </div>
                            <small className="text-muted">{row.pct}%</small>
                          </div>
                        </td>
                        {row.weeks.map((w, idx) => (
                          <td key={idx}>{w}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="fw-semibold table-light">
                      <td />
                      <td className="text-start">Total :</td>
                      <td>{totals.target}</td>
                      <td>{totals.achieved}</td>
                      <td>{(totals.achieved / daysCovered).toFixed(1)}</td>
                      <td>
                        {(() => {
                          const remaining = Math.max(0, totals.target - totals.achieved);
                          return (remaining / remainingDays).toFixed(1);
                        })()}
                      </td>
                      <td>
                        <div className="d-flex flex-column align-items-center gap-1">
                          <div className="progress w-100 target-progress">
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{
                                width: `${totals.target > 0 ? Math.min(100, Math.round((totals.achieved / totals.target) * 100)) : 0}%`,
                              }}
                              aria-valuenow={totals.target > 0 ? Math.round((totals.achieved / totals.target) * 100) : 0}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                          <small className="text-muted">
                            {totals.target > 0 ? Math.round((totals.achieved / totals.target) * 100) : 0}%
                          </small>
                        </div>
                      </td>
                      {totals.weeks.map((w, idx) => (
                        <td key={idx}>{w}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {fullDashboardSites.includes(siteId) && (
        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 upload-section">
              <div>
                <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                  Stage-wise Progress
                </p>
                {/* <h5 className="fw-bold m-0">Upload stage tracker (Excel)</h5>
                <small className="text-muted">
                  Use the provided format with STAGE rows and wagon columns (Total upto last month, C/F, Prodn on dt, Total Current, In hand).
                </small> */}
              </div>
              <div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="form-control"
                  onChange={handleStageFile}
                />
              </div>
            </div>
            {stageError && <div className="alert alert-danger py-2 mb-3">{stageError}</div>}

            {stageData.length > 0 && (
              <>
                {Object.keys(stageTotalsByName).length > 0 && (
                  <div className="card border-0 shadow-sm mb-3">
                    <div className="card-body">
                      <h6 className="fw-bold mb-2">Stage Totals (All Wagons)</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-striped align-middle text-center">
                          <thead className="table-light">
                            <tr>
                              <th className="text-start">Stage</th>
                              <th>Completed this month</th>
                              <th>In hand</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(stageTotalsByName).map(([stageName, vals]) => (
                              <tr key={stageName}>
                                <td className="text-start fw-semibold">{stageName}</td>
                                <td>{vals.totalCurr}</td>
                                <td>{vals.inHand}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {stageData.length > 0 && (
                  <div className="card border-0 shadow-sm mb-3">
                    <div className="card-body">
                      <h6 className="fw-bold mb-2">DM Till Date (by Wagon)</h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-striped align-middle">
                          <thead className="table-light">
                            <tr>
                              <th>Wagon</th>
                              <th>DM Till Date</th>
                              <th>Outstanding Load</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stageData.map((wagon) => (
                              <tr key={wagon.id}>
                                <td className="fw-semibold">{wagon.name}</td>
                                <td>{wagon.dmTill}</td>
                                <td>
                                  {(() => {
                                    const key = String(wagon.name || '').trim().toLowerCase();
                                    if (wagon.outstanding !== undefined) return wagon.outstanding;
                                    return dispatchOutstandingByWagon[key] ?? '-';
                                  })()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}
          </div>
        </div>
      )}

      {fullDashboardSites.includes(siteId) && (
        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
              <div>
                <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                  Despatch Target vs Achievement for the Month
                </p>
                {/* <h5 className="fw-bold m-0">Upload despatch tracker (Excel)</h5>
                <small className="text-muted">
                  Format with columns: Target, DM &amp; TPC Achvd., Wk 1(7th), Wk 2 (14th), Wk 3 (21st), Wk 4(31st). The parser looks for the row containing Target/Achvd.
                </small> */}
              </div>
              <div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="form-control"
                  onChange={handleDispatchFile}
                />
              </div>
            </div>
            {dispatchError && <div className="alert alert-danger py-2 mb-3">{dispatchError}</div>}

            {dispatchRows.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle table-striped table-hover text-center target-table">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: '60px' }}>Sl.</th>
                      <th className="text-start">Wagon</th>
                      <th>Target</th>
                      <th>DM &amp; TPC Achvd.</th>
                      <th>% Completion</th>
                      <th>Wk 1 (7th)</th>
                      <th>Wk 2 (14th)</th>
                      <th>Wk 3 (21st)</th>
                      <th>Wk 4 (31st)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td className="text-start fw-semibold">{row.description}</td>
                        <td>{row.target}</td>
                        <td>{row.achieved}</td>
                        <td>
                          <div className="d-flex flex-column align-items-center gap-1">
                            <div className="progress w-100 target-progress">
                              <div
                                className="progress-bar"
                                role="progressbar"
                                style={{ width: `${row.pct}%` }}
                                aria-valuenow={row.pct}
                                aria-valuemin="0"
                                aria-valuemax="100"
                              />
                            </div>
                            <small className="text-muted">{row.pct}%</small>
                          </div>
                        </td>
                        {row.weeks.map((w, idx) => (
                          <td key={idx}>{w}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="fw-semibold table-light">
                      <td />
                      <td className="text-start">Total :</td>
                      <td>{dispatchTotals.target}</td>
                      <td>{dispatchTotals.achieved}</td>
                      <td>
                        <div className="d-flex flex-column align-items-center gap-1">
                          <div className="progress w-100 target-progress">
                            <div
                              className="progress-bar bg-success"
                              role="progressbar"
                              style={{
                                width: `${dispatchTotals.target > 0 ? Math.min(100, Math.round((dispatchTotals.achieved / dispatchTotals.target) * 100)) : 0}%`,
                              }}
                              aria-valuenow={dispatchTotals.target > 0 ? Math.round((dispatchTotals.achieved / dispatchTotals.target) * 100) : 0}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                          <small className="text-muted">
                            {dispatchTotals.target > 0 ? Math.round((dispatchTotals.achieved / dispatchTotals.target) * 100) : 0}%
                          </small>
                        </div>
                      </td>
                      {dispatchTotals.weeks.map((w, idx) => (
                        <td key={idx}>{w}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {fullDashboardSites.includes(siteId) && (
        <div className="card shadow-sm border-0 mt-4">
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3 upload-section">
              <div>
                <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                  Issues by Wagon Type 
                </p>
                {/*
                <small className="text-muted d-block">
                  Use the provided format: row 1 wagon headers (from column B onward), subsequent rows with reason labels in column A and issue text under each wagon.
                </small>
                */}
              </div>
              <div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="form-control"
                  onChange={handleIssuesFile}
                />
              </div>
            </div>

            {issuesError && <div className="alert alert-danger py-2 mb-3">{issuesError}</div>}

            {issueRows.length > 0 && (
              <div className="table-responsive">
                <table className="table table-sm align-middle table-striped table-hover text-center">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: '60px' }}>Sl.</th>
                      <th className="text-start">Wagon Type</th>
                      <th className="text-start">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td className="text-start fw-semibold">{row.wagon || '-'}</td>
                        <td className="text-start">{row.issue || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDashboard;
