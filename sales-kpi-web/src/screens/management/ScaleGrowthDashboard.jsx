import React, { useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  LabelList,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const baseData = [
  {
    period: "FY21",
    wagons: 1813,
    steel: 21804,
    revenue: 168885,
    ebitda: 14376,
    ebitdaMargin: 8.5,
    pat: 1202,
    patMargin: 0.7,
    eps: 0.62,
    dividend: 10,
    netWorth: 112513,
    sharePrice: 24.24,
  },
  {
    period: "FY22",
    wagons: 1604,
    steel: 20889,
    revenue: 162174,
    ebitda: 16265,
    ebitdaMargin: 10.0,
    pat: 2053,
    patMargin: 1.3,
    eps: 0.75,
    dividend: 10,
    netWorth: 131427,
    sharePrice: 41.7,
  },
  {
    period: "FY23",
    wagons: 3073,
    steel: 29942,
    revenue: 224328,
    ebitda: 17178,
    ebitdaMargin: 7.7,
    pat: 2580,
    patMargin: 1.2,
    eps: 0.81,
    dividend: 15,
    netWorth: 137592,
    sharePrice: 42.45,
  },
  {
    period: "FY24",
    wagons: 7028,
    steel: 42792,
    revenue: 350287,
    ebitda: 33307,
    ebitdaMargin: 9.5,
    pat: 11298,
    patMargin: 3.2,
    eps: 3.29,
    dividend: 50,
    netWorth: 251669,
    sharePrice: 164.8,
  },
  {
    period: "FY25",
    wagons: 10612,
    steel: 41685,
    revenue: 510657,
    ebitda: 52494,
    ebitdaMargin: 10.3,
    pat: 24888,
    patMargin: 4.9,
    eps: 6.24,
    dividend: 75,
    netWorth: 278586,
    sharePrice: 134.7,
  },
];

const enrichedData = baseData.map((row, idx) => {
  const prev = idx > 0 ? baseData[idx - 1] : null;
  const patGrowth = prev ? ((row.pat - prev.pat) / prev.pat) * 100 : null;
  const revenuePerWagon = row.revenue / row.wagons;
  const ebitdaPerWagon = row.ebitda / row.wagons;
  return {
    ...row,
    patGrowth,
    revenuePerWagon,
    ebitdaPerWagon,
  };
});

const formatNumber = (value) => {
  if (value === null || value === undefined) return "NA";
  return Number(value).toLocaleString("en-IN");
};

const formatCompact = (value) => {
  if (value === null || value === undefined) return "";
  const absValue = Math.abs(value);
  if (absValue >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (absValue >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value;
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "NA";
  return `${value.toFixed(1)}%`;
};

const calcCagr = (start, end, years) => {
  if (!start || !end || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
};

const revenueCagr = calcCagr(baseData[0].revenue, baseData[4].revenue, 4);
const epsGrowthMultiple = baseData[4].eps / baseData[2].eps;
const netWorthGrowth = ((baseData[4].netWorth / baseData[2].netWorth) - 1) * 100;
const latestEntry = baseData[baseData.length - 1];

const kpiTiles = [
  { label: "Revenue CAGR FY21-25", value: formatPercent(revenueCagr) },
  { label: "EBITDA Margin (Latest)", value: formatPercent(latestEntry.ebitdaMargin) },
  { label: "PAT Margin (Latest)", value: formatPercent(latestEntry.patMargin) },
  { label: "EPS Growth (FY23-25)", value: `${epsGrowthMultiple.toFixed(1)}x` },
  { label: "Net Worth Growth (FY23-25)", value: formatPercent(netWorthGrowth) },
];

const acquisitionMetrics = [
  { key: "Revenue", field: "revenue" },
  { key: "EBITDA", field: "ebitda" },
  { key: "Net Worth", field: "netWorth" },
  { key: "Wagons", field: "wagons" },
].map((metric) => {
  const pre = baseData.slice(0, 3).reduce((sum, row) => sum + row[metric.field], 0) / 3;
  const post = baseData.slice(3, 5).reduce((sum, row) => sum + row[metric.field], 0) / 2;
  return {
    metric: metric.key,
    preIndex: 100,
    postIndex: Math.round((post / pre) * 100),
  };
});

export default function ScaleGrowthDashboard() {
  const reportRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!reportRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const element = reportRef.current;
      const noPrintEls = element.querySelectorAll(".no-print");
      noPrintEls.forEach((el) => (el.style.display = "none"));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(element, {
        scale: 1.2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
      });

      noPrintEls.forEach((el) => (el.style.display = ""));
      const imgData = canvas.toDataURL("image/jpeg", 0.8);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      let page = 1;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      pdf.setFontSize(9);
      pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 5, { align: "center" });
      heightLeft -= pageHeight;
      page += 1;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        pdf.setFontSize(9);
        pdf.text(`Page ${page}`, pageWidth / 2, pageHeight - 5, { align: "center" });
        heightLeft -= pageHeight;
        page += 1;
      }

      pdf.save("scale-growth-dashboard.pdf");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container-fluid scale-growth-dashboard" ref={reportRef}>
      <div className="scale-growth-hero mb-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3">
          <div>
            <p className="section-title text-white mb-1">Executive View</p>
            <h1 className="h3 fw-bold mb-2">Scale and Growth Dashboard</h1>
            <p className="mb-0 opacity-75">
              Consolidated performance
            </p>
          </div>
          <div className="d-flex align-items-center gap-2 no-print">
            <span className="badge text-bg-light text-uppercase letter-wide">FY21 to FY25</span>
            <button
              className="btn btn-sm btn-light"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
            <div>
              <p className="section-title mb-1">Executive Summary</p>
              <h4 className="fw-bold mb-1">Key KPIs and strategic narrative</h4>
              <p className="text-muted mb-0">
                Scale expansion, operating leverage, and balance sheet strengthening after FY23.
              </p>
            </div>
          </div>
          <div className="row g-3 mt-2">
            {kpiTiles.map((tile) => (
              <div className="col-6 col-lg-2" key={tile.label}>
                <div className="kpi-tile h-100">
                  <div className="kpi-label">{tile.label}</div>
                  <div className="kpi-value">{tile.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="row g-3 mt-2">
            <div className="col-12 col-lg-6">
              <div className="summary-card">
                <h6 className="fw-bold">Strategic Narratives</h6>
                <ul className="insight-list mb-0">
                  <li>Scale expansion in wagons and casting capacity post FY23.</li>
                  <li>Operating leverage: profits compounding faster than revenue.</li>
                  <li>Quality of growth improving with stable margins.</li>
                  <li>Balance sheet strength enables diversification and capex.</li>
                  <li>Investor confidence anchored on EPS momentum.</li>
                </ul>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="summary-card">
                <h6 className="fw-bold">Management Takeaway</h6>
                <p className="text-muted mb-2">
                  Execution capacity has multiplied nearly six times in four years, with profitability compounding faster than revenue.
                </p>
                <p className="text-muted mb-0">
                  FY25 includes acquisition impact of Texmaco West, reflected in scale metrics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-block">
        <p className="section-title">Scale and Growth</p>
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">Wagon Production Trend</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatCompact} />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Line type="monotone" dataKey="wagons" stroke="#2563eb" strokeWidth={3} label={{ position: "top", fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Clear structural scale-up from FY23 onward.</li>
                  <li>FY24 to FY25 shows step-change growth, not incremental.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">Steel Casting Volume Trend (MT)</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatCompact} />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Area type="monotone" dataKey="steel" stroke="#16a34a" fill="#86efac" label={{ position: "top", fontSize: 10 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Strong volume growth through FY24.</li>
                  <li>FY25 moderation hints at product mix optimization.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-block">
        <p className="section-title">Revenue and Profitability</p>
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">Revenue Growth Trajectory</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatCompact} />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Bar dataKey="revenue" fill="#0ea5e9" name="Revenue">
                        <LabelList dataKey="revenue" position="top" fontSize={10} formatter={formatCompact} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Revenue CAGR accelerates post FY23.</li>
                  <li>FY25 jump reflects acquisition plus scale benefits.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">EBITDA and PAT Absolute Growth</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" tickFormatter={formatCompact} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={formatCompact} />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="ebitda" fill="#1d4ed8" name="EBITDA">
                        <LabelList dataKey="ebitda" position="top" fontSize={10} formatter={formatCompact} />
                      </Bar>
                      <Bar yAxisId="right" dataKey="pat" fill="#f97316" name="PAT">
                        <LabelList dataKey="pat" position="top" fontSize={10} formatter={formatCompact} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>EBITDA grew 3.6x from FY23 to FY25.</li>
                  <li>PAT grew 10x with strong operating leverage.</li>
                  <li>Profitability compounding faster than revenue.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="chart-title">Margin Trend (Quality of Growth)</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatPercent} />
                      <Tooltip formatter={(value) => formatPercent(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="ebitdaMargin" stroke="#2563eb" strokeWidth={3} name="EBITDA %" label={{ position: "top", fontSize: 10 }} />
                      <Line type="monotone" dataKey="patMargin" stroke="#ef4444" strokeWidth={3} name="PAT %" label={{ position: "top", fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>EBITDA margin holds around 9.5 to 10.3 percent at scale.</li>
                  <li>PAT margin rose from sub 1 percent to ~5 percent.</li>
                  <li>Growth quality improves with cost absorption and integration.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-block">
        <p className="section-title">Shareholder Value</p>
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">EPS Growth Curve</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => value} />
                      <Line type="monotone" dataKey="eps" stroke="#7c3aed" strokeWidth={3} label={{ position: "top", fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>EPS inflection from FY24 onwards.</li>
                  <li>EPS nearly 10x in two years through FY25.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">Dividend vs PAT Growth</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatPercent} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "PAT Growth %") return formatPercent(value);
                          if (value === null || value === undefined) return "NA";
                          return `${value}%`;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="dividend" fill="#0f766e" name="Dividend %">
                        <LabelList dataKey="dividend" position="top" fontSize={10} />
                      </Bar>
                      <Bar dataKey="patGrowth" fill="#f59e0b" name="PAT Growth %">
                        <LabelList dataKey="patGrowth" position="top" fontSize={10} formatter={formatPercent} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Conservative payout till FY23, aggressive reward post FY24.</li>
                  <li>Payout increase aligns with profitability acceleration.</li>
                  <li>Board confidence in sustainable cash flows.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="chart-title">Net Worth Accretion</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatCompact} />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Area type="monotone" dataKey="netWorth" stroke="#0284c7" fill="#bae6fd" label={{ position: "top", fontSize: 10 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Net worth doubled between FY23 and FY25.</li>
                  <li>Sharp FY24 to FY25 jump reflects acquisition impact.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-block">
        <p className="section-title">Market Perception and Valuation</p>
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">Share Price vs EPS</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis yAxisId="left" tickFormatter={formatCompact} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value, name) => (name === "EPS" ? value : formatNumber(value))} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="sharePrice" stroke="#1d4ed8" strokeWidth={3} name="Share Price" label={{ position: "top", fontSize: 10 }} />
                      <Line yAxisId="right" type="monotone" dataKey="eps" stroke="#f97316" strokeWidth={3} name="EPS" label={{ position: "top", fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Market re-rating initiated in FY24.</li>
                  <li>Share price tracks earnings visibility over topline.</li>
                  <li>FY25 correction reflects valuation normalization.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">Revenue vs Share Price Correlation</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="revenue" name="Revenue" tickFormatter={formatCompact} />
                      <YAxis dataKey="sharePrice" name="Share Price" tickFormatter={formatCompact} />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === "Revenue") return formatNumber(value);
                          return value;
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0] && payload[0].payload) {
                            return payload[0].payload.period;
                          }
                          return label;
                        }}
                      />
                      <Scatter data={enrichedData} fill="#22c55e" label={{ position: "top", fontSize: 10 }} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Strong correlation post FY23.</li>
                  <li>Supports investor confidence narrative.</li>
                  <li>Useful for investor communication decks.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-block">
        <p className="section-title">Efficiency and Productivity</p>
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">Revenue per Wagon (Rs Lakhs)</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toFixed(2)} />
                      <Line type="monotone" dataKey="revenuePerWagon" stroke="#0ea5e9" strokeWidth={3} label={{ position: "top", fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Shift from volume-driven to value-driven production.</li>
                  <li>Supports premiumization and product mix strategy.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="chart-title">EBITDA per Wagon (Rs Lakhs)</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={enrichedData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip formatter={(value) => value.toFixed(2)} />
                      <Bar dataKey="ebitdaPerWagon" fill="#16a34a">
                        <LabelList dataKey="ebitdaPerWagon" position="top" fontSize={10} formatter={(value) => value.toFixed(2)} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="insight-list">
                  <li>Demonstrates operating leverage per unit.</li>
                  <li>Reinforces margin sustainability narrative.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-block">
        <p className="section-title">Acquisition Impact</p>
        <div className="row g-3">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="chart-title">Pre vs Post Acquisition Comparison (Indexed)</div>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={acquisitionMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="metric" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value} index`} />
                      <Legend />
                      <Bar dataKey="preIndex" fill="#94a3b8" name="FY21-23">
                        <LabelList dataKey="preIndex" position="top" fontSize={10} />
                      </Bar>
                      <Bar dataKey="postIndex" fill="#2563eb" name="FY24-25">
                        <LabelList dataKey="postIndex" position="top" fontSize={10} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-muted mb-0">
                  FY25 increased due to acquisition of Texmaco West. Indexed view shows structural uplift post acquisition.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
