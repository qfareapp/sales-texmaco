import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const ManagementDashboard = () => {
  const navigate = useNavigate();
  const [uploadError, setUploadError] = useState('');
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ target: 0, achieved: 0, weeks: [0, 0, 0, 0] });

  const sites = [
    { id: 'agarpara', name: 'Agarpara Works', note: 'Production status and updates' },
    { id: 'sodepur', name: 'Sodepur Works', note: 'Production status and updates' },
    { id: 'belgharia', name: 'Belgharia Works', note: 'Production status and updates' },
    { id: 'texmaco-west', name: 'Texmaco West', note: 'Production status and updates' },
  ];

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
      const description = String(row[descIdx] || '').trim();
      const isTotalRow = description.toLowerCase().startsWith('total');
      if (isTotalRow) break;
      if (!description) continue;

      const target = Number(row[targetIdx]) || 0;
      const achieved = Number(row[achievedIdx]) || 0;
      const weeks = wkIdx.map((idx) => Number(row[idx]) || 0);
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

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const { parsed, totalsCalc } = parseProductionSheet(sheet);
      setRows(parsed);
      setTotals(totalsCalc);
    } catch (err) {
      console.error(err);
      setUploadError('Could not read the Excel file. Please use the preset format.');
      setRows([]);
      setTotals({ target: 0, achieved: 0, weeks: [0, 0, 0, 0] });
    }
  };

  return (
    <div className="container mt-5 pt-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
            Management
          </p>
          <h2 className="fw-bold m-0">Production Dashboards</h2>
          <p className="text-muted mt-2 mb-0">
            Choose a works location to view the latest production updates.
          </p>
        </div>
      </div>

      <div className="row g-3">
        {sites.map((site) => (
          <div className="col-12 col-md-6 col-lg-3" key={site.id}>
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title fw-semibold">{site.name}</h5>
                <p className="card-text text-muted small mb-3">{site.note}</p>
                <button
                  className="btn btn-primary mt-auto"
                  onClick={() => navigate(`/management/${site.id}`)}
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-sm border-0 mt-4">
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
            <div>
              <p className="text-uppercase text-muted mb-1" style={{ letterSpacing: '1px', fontSize: '12px' }}>
                Prodn Target vs Achievement for the Month
              </p>
              <h5 className="fw-bold m-0">Upload production tracker (Excel)</h5>
              <small className="text-muted">
                Format with columns: Sl., Description/Wagon, Target, Achvd., Wk 1(7th), Wk 2 (14th), Wk 3 (21st), Wk 4(31st). The parser finds the row where "Wagon" appears.
              </small>
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
    </div>
  );
};

export default ManagementDashboard;
