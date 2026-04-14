import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./AfricaRailOpportunityDashboard.css";

const outlookRows = [
  {
    type: "Hopper Wagon",
    outlook: "Very High",
    cagr: "6-8%",
    strength: 5,
    drivers: "Coal, phosphates, copper, cobalt, maize",
  },
  {
    type: "Tank Wagon",
    outlook: "High",
    cagr: "5-7%",
    strength: 4,
    drivers: "Crude oil, petroleum products, chemicals",
  },
  {
    type: "Open / Gondola Wagon",
    outlook: "High",
    cagr: "5-6%",
    strength: 4,
    drivers: "Bulk minerals, stones, coal",
  },
  {
    type: "Flat Wagon",
    outlook: "Moderate-High",
    cagr: "4-6%",
    strength: 3,
    drivers: "Containers, machinery, timber",
  },
  {
    type: "Box / Covered Wagon",
    outlook: "Moderate",
    cagr: "3-4%",
    strength: 2,
    drivers: "Gold, diamonds, bagged agri, FMCG",
  },
];

const demandMix = [
  { label: "Hopper Wagons", value: 34 },
  { label: "Tank Wagons", value: 24 },
  { label: "Open / Gondola", value: 20 },
  { label: "Flat Wagons", value: 16 },
  { label: "Box / Covered", value: 6 },
];

const wagonEnquiries = [
  { type: "Gondola / Open Top Gondola", qty: 7473 },
  { type: "Flat / Flat Bed", qty: 1456 },
  { type: "Tank Wagons", qty: 480 },
  { type: "Jumbo Freight", qty: 458 },
  { type: "Rail Carrier", qty: 85 },
];

const locoEnquiries = [
  { type: "Refurbished DE Locos", qty: 174, region: "Southern + Central" },
  { type: "New DE Locos", qty: 50, region: "Central" },
  { type: "Electric Locos", qty: 54, region: "Southern" },
];

const regionDemand = [
  { region: "Southern Africa", share: 88, notes: "Mining corridors, private freight" },
  { region: "Central Africa", share: 9, notes: "Mining + EPC bundles" },
  { region: "West Africa", share: 2, notes: "Pilot / niche orders" },
  { region: "East Africa", share: 0, notes: "No active enquiries" },
];

const gaugeTable = [
  { region: "Northern Africa", primary: "Standard (1,435 mm)", secondary: "-" },
  { region: "Western Africa", primary: "Cape (1,067 mm)", secondary: "Standard (new lines)" },
  { region: "Central Africa", primary: "Cape (1,067 mm)", secondary: "Metre (1,000 mm)" },
  { region: "Eastern Africa", primary: "Metre (1,000 mm)", secondary: "Standard (rapid growth)" },
  { region: "Southern Africa", primary: "Cape (1,067 mm)", secondary: "-" },
];

const strategicTakeaways = [
  "Focus wagons: hopper + tank for near-term scale",
  "Mining exposure is strongest in Central and Southern Africa",
  "Fastest growth: flat wagons driven by containerization",
  "Stable long-term contracts: tank wagon fleets",
  "Refurbished DE locomotives are winning today",
];

const executionPlan = [
  { phase: "0-6 months", actions: "Close anchor orders in Southern Africa, lock references" },
  { phase: "6-24 months", actions: "Develop Africa-specific wagon platforms, expand refurbishment" },
  { phase: "24+ months", actions: "Regional assembly and service hubs" },
];

const risks = [
  { risk: "Currency volatility", mitigation: "USD pricing + hedging" },
  { risk: "Country risk", mitigation: "Prioritize private operators" },
  { risk: "Logistics cost", mitigation: "Bulk shipments + local assembly" },
  { risk: "After-sales expectations", mitigation: "Local service partners" },
];


const projectionRows2030 = [
  {
    region: "North Africa",
    goods: "Crude Oil, Gas, Phosphates",
    baseline: "Oil ~1.4 mbpd (Libya), Phosphate ~35 Mt",
    projection: "Oil ~2.0 mbpd, Phosphate ~40-50 Mt",
    driver: "Energy security, fertilizer exports",
  },
  {
    region: "West Africa",
    goods: "Gold, Cocoa, Oil",
    baseline: "Gold ~120-140 t",
    projection: "Gold ~130-150 t",
    driver: "Stable output, limited rail penetration",
  },
  {
    region: "Central Africa",
    goods: "Copper, Cobalt, Timber",
    baseline: "Copper ~3.3 Mt, Cobalt ~200 kt",
    projection: "Copper ~3.8-4.0 Mt, Cobalt ~270 kt",
    driver: "EV demand, supply chains",
  },
  {
    region: "East Africa",
    goods: "Containers, Timber, Machinery",
    baseline: "Low rail share",
    projection: "Moderate increase",
    driver: "Port-led containerization",
  },
  {
    region: "Southern Africa",
    goods: "Coal, Iron Ore, Diamonds, Maize",
    baseline: "Coal ~234 Mt, Diamonds ~18 Mct",
    projection: "Coal ~225-230 Mt, Diamonds ~15-20 Mct",
    driver: "Heavy-haul mining, exports",
  },
];

const modalShiftRows2030 = [
  { metric: "Rail freight share", baseline: "~12-15%", projection: "~18-22%" },
  { metric: "Road freight share", baseline: "~78-82%", projection: "~72-78%" },
];

const wagonRequirementRows2030 = [
  { item: "Effective usable wagons today", value: "~180,000" },
  { item: "Incremental wagons needed (growth)", value: "~50,000-55,000" },
  { item: "Replacement wagons (5 yrs)", value: "~15,000-20,000" },
];

const gapSummaryRows2030 = [
  { item: "Structural requirement by 2030", value: "~65,000-75,000" },
  { item: "Visible live enquiries", value: "~9,950" },
  { item: "Unaddressed / latent gap", value: "~55,000-65,000" },
];

const gapByTypeRows2030 = [
  { type: "Gondola / Open Top", share: "~45-50%", gap: "~25,000-30,000" },
  { type: "Flat / Flatbed", share: "~20-25%", gap: "~12,000-15,000" },
  { type: "Hopper", share: "~15-20%", gap: "~9,000-12,000" },
  { type: "Tank", share: "~10-12%", gap: "~6,000-7,000" },
  { type: "Others", share: "~5%", gap: "~3,000" },
];

const validationPoints2030 = [
  "Enquiries skew to gondola and flat wagons, matching projected mineral flows.",
  "Low enquiry visibility elsewhere reflects timing and financing, not lack of demand.",
  "Enquiries represent the first 10-15% of a larger demand cycle.",
];

const strategicMeaning2030 = [
  "Africa is capacity-constrained, not enquiry-constrained.",
  "Early movers can lock multi-year frame contracts.",
  "Heavy-haul freight wagons are the core capture opportunity.",
];

const executiveConclusion2030 =
  "Based on mineral production growth, modal shift toward rail, and replacement of ageing rolling stock, Africa will require approximately 65,000-75,000 freight wagons by 2030. Current live enquiries account for only about 10,000 wagons, leaving a latent demand gap of nearly 55,000-65,000 wagons. The enquiry pattern is aligned with projected commodity flows and confirms that demand is real, mining-led, and expected to materialise progressively over the next five years.";


const KpiCard = ({ title, value, subtitle }) => (
  <div className="africa-kpi-card">
    <p>{title}</p>
    <h3>{value}</h3>
    <span>{subtitle}</span>
  </div>
);

const MeterBar = ({ label, value }) => (
  <div className="africa-meter">
    <div className="africa-meter-header">
      <span>{label}</span>
      <strong>{value}%</strong>
    </div>
    <div className="africa-meter-track">
      <div className="africa-meter-fill" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const StrengthDots = ({ count }) => (
  <div className="africa-strength">
    {Array.from({ length: 5 }).map((_, index) => (
      <span
        key={index}
        className={index < count ? "africa-dot active" : "africa-dot"}
      />
    ))}
  </div>
);

export default function AfricaRailOpportunityDashboard() {
  const contentRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!contentRef.current || isExporting) return;
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const element = contentRef.current;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("Africa-Rail-Opportunity-DPR.pdf");
    setIsExporting(false);
  };

  return (
    <div className={`africa-dpr ${isExporting ? "is-exporting" : ""}`}>
      <div className="africa-export-bar">
        <button
          type="button"
          className="africa-export-button africa-export-top"
          onClick={handleExportPdf}
          disabled={isExporting}
        >
          {isExporting ? "Exporting PDF..." : "Export as PDF"}
        </button>
      </div>
      <div ref={contentRef} className="africa-dpr-content">
        <header className="africa-hero">
          <div>
            <p className="africa-eyebrow">Management Ready Dashboard</p>
          <h1>Africa Rail Wagon & Locomotive Opportunity</h1>
          <p className="africa-subtitle">
            Compiled from 5-year demand outlook (2026-2030) and live enquiry data
            across Africa. Focused on freight-led, mining-driven demand.
          </p>
        </div>
        <div className="africa-hero-stack">
          <div className="africa-hero-card">
            <h4>Executive Summary</h4>
            <p>
              Africa shows immediate demand for nearly 10,000 wagons and 278
              locomotives. Southern Africa dominates volume, while Central Africa
              offers high-value bundled opportunities. Refurbished diesel-electric
              locos lead new builds due to cost sensitivity.
            </p>
          </div>
        </div>
      </header>

      <section className="africa-section-highlight africa-section-outlook">
        <div className="africa-section-header">
          <div>
            <p className="africa-section-eyebrow">Next 5 Years Projection</p>
            <h3>2026-2030 Outlook</h3>
          </div>
          <span className="africa-section-tag">Demand Projection</span>
        </div>
        <div className="africa-kpis africa-kpis-outlook">
          <KpiCard
            title="Next 5 Years Outlook"
            value="Hopper + Tank + Gondola"
            subtitle="Demand focus"
          />
          <KpiCard
            title="Regional Focus"
            value="Southern + Central Africa"
            subtitle="Volume anchors"
          />
          <KpiCard
            title="Rail Tonnage Growth"
            value="~30-35%"
            subtitle="Modal shift impact"
          />
          <KpiCard
            title="Latent Wagon Gap"
            value="~55-65k wagons"
            subtitle="By 2030"
          />
        </div>
      </section>

      <section className="africa-section-highlight africa-section-enquiry">
        <div className="africa-section-header">
          <div>
            <p className="africa-section-eyebrow">Current Enquiries</p>
            <h3>Live Market Signal</h3>
          </div>
          <span className="africa-section-tag">Visible Today</span>
        </div>
        <div className="africa-kpis">
          <KpiCard title="Total Wagon Enquiries" value="~9,950" subtitle="Live enquiry volume" />
          <KpiCard title="Total Loco Enquiries" value="278" subtitle="Refurb + new + electric" />
          <KpiCard title="Opportunity Size" value="$1.3-1.7B" subtitle="Wagons + locomotives" />
          <KpiCard title="Top Region" value="Southern Africa" subtitle="85-90% demand share" />
          <KpiCard title="Anchor Products" value="Hopper + Tank" subtitle="Near-term scale" />
          <KpiCard title="Gauge Priority" value="Cape Gauge" subtitle="Heavy haul mining" />
        </div>
      </section>

      <section className="africa-grid">
        <div className="africa-card">
          <h2>5-Year Wagon Demand Outlook (Pan-Africa)</h2>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Wagon Type</th>
                <th>Outlook</th>
                <th>CAGR</th>
                <th>Demand Strength</th>
                <th>Key Drivers</th>
              </tr>
            </thead>
            <tbody>
              {outlookRows.map((row) => (
                <tr key={row.type}>
                  <td>{row.type}</td>
                  <td>{row.outlook}</td>
                  <td>{row.cagr}</td>
                  <td>
                    <StrengthDots count={row.strength} />
                  </td>
                  <td>{row.drivers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="africa-card">
          <h2>Expected Demand Mix</h2>
          <p className="africa-muted">Share of new demand over 2026-2030.</p>
          <div className="africa-mix">
            {demandMix.map((item) => (
              <MeterBar key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>
      </section>

      <section className="africa-grid">
        <div className="africa-card">
          <h2>Live Enquiry Snapshot - Wagons</h2>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Wagon Type</th>
                <th>Enquired Qty</th>
              </tr>
            </thead>
            <tbody>
              {wagonEnquiries.map((row) => (
                <tr key={row.type}>
                  <td>{row.type}</td>
                  <td>{row.qty.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>~9,950+</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="africa-card">
          <h2>Live Enquiry Snapshot - Locomotives</h2>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Loco Type</th>
                <th>Qty</th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              {locoEnquiries.map((row) => (
                <tr key={row.type}>
                  <td>{row.type}</td>
                  <td>{row.qty}</td>
                  <td>{row.region}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>278</td>
                <td>Refurbishment leads</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>



      <section className="africa-grid">
        <div className="africa-card">
          <h2>Africa Rail Freight Outlook - Integrated Demand & Gap View (to 2030)</h2>
          <p className="africa-muted">
            Compiled view across mineral projections, live enquiries, and 2030 gap.
          </p>
          <h4 className="africa-subhead">Mineral / Goods Projection by 2030</h4>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Key Minerals / Goods</th>
                <th>2025 Baseline</th>
                <th>2030 Projection</th>
                <th>Growth Driver</th>
              </tr>
            </thead>
            <tbody>
              {projectionRows2030.map((row) => (
                <tr key={row.region}>
                  <td>{row.region}</td>
                  <td>{row.goods}</td>
                  <td>{row.baseline}</td>
                  <td>{row.projection}</td>
                  <td>{row.driver}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="africa-muted">
            Bulk minerals (coal, copper, cobalt, phosphates) dominate growth and
            remain rail-favorable cargo.
          </p>
        </div>

        <div className="africa-card">
          <h2>Modal Shift Assumption (to 2030)</h2>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>2025</th>
                <th>2030 (Projected)</th>
              </tr>
            </thead>
            <tbody>
              {modalShiftRows2030.map((row) => (
                <tr key={row.metric}>
                  <td>{row.metric}</td>
                  <td>{row.baseline}</td>
                  <td>{row.projection}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="africa-muted">Rail tonnage growth of roughly 30-35% over 5 years.</p>

          <h4 className="africa-subhead">Wagon Requirement Derived (to 2030)</h4>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Estimate</th>
              </tr>
            </thead>
            <tbody>
              {wagonRequirementRows2030.map((row) => (
                <tr key={row.item}>
                  <td>{row.item}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="africa-muted">
            Total structural wagon requirement by 2030: <strong>~65,000-75,000</strong>.
          </p>
        </div>
      </section>

      <section className="africa-grid">
        <div className="africa-card">
          <h2>Gap Analysis by 2030</h2>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Wagons</th>
              </tr>
            </thead>
            <tbody>
              {gapSummaryRows2030.map((row) => (
                <tr key={row.item}>
                  <td>{row.item}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="africa-muted">About 85% of required wagons are not yet contracted.</p>

          <h4 className="africa-subhead">Gap by Wagon Type (Indicative)</h4>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Wagon Type</th>
                <th>% of Demand</th>
                <th>Gap (Units)</th>
              </tr>
            </thead>
            <tbody>
              {gapByTypeRows2030.map((row) => (
                <tr key={row.type}>
                  <td>{row.type}</td>
                  <td>{row.share}</td>
                  <td>{row.gap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="africa-card">
          <h2>How Enquiries Validate the Projection</h2>
          <ul className="africa-list">
            {validationPoints2030.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h4 className="africa-subhead">Executive Conclusion</h4>
          <p className="africa-quote">{executiveConclusion2030}</p>

          <h4 className="africa-subhead">Strategic Meaning</h4>
          <ul className="africa-list">
            {strategicMeaning2030.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="africa-grid">
        <div className="africa-card">
          <h2>Region-wise Demand Concentration</h2>
          <p className="africa-muted">Based on live enquiries.</p>
          <div className="africa-mix">
            {regionDemand.map((item) => (
              <div key={item.region} className="africa-region-row">
                <MeterBar label={item.region} value={item.share} />
                <span className="africa-region-note">{item.notes}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="africa-card">
          <h2>Regional Demand Map</h2>
          <img
            className="africa-image"
            src="/region.png"
            alt="Africa region demand map"
          />
          <p className="africa-muted">
            Hopper and gondola demand concentrated in Southern Africa. Tank and
            box wagons lead in Northern and Western regions.
          </p>
        </div>
      </section>

      <section className="africa-grid">
        <div className="africa-card">
          <h2>Rail Gauge Landscape</h2>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Primary Gauge</th>
                <th>Secondary / Emerging</th>
              </tr>
            </thead>
            <tbody>
              {gaugeTable.map((row) => (
                <tr key={row.region}>
                  <td>{row.region}</td>
                  <td>{row.primary}</td>
                  <td>{row.secondary}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="africa-muted">
            Standard gauge is growing fastest, while Cape gauge remains dominant
            in mining-heavy corridors.
          </p>
        </div>
        <div className="africa-card">
          <h2>Gauge Map</h2>
          <img className="africa-image" src="/gauge.jpg" alt="Africa rail gauges" />
        </div>
      </section>

      <section className="africa-grid">
        <div className="africa-card">
          <h2>Strategic Takeaways</h2>
          <ul className="africa-list">
            {strategicTakeaways.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="africa-card">
          <h2>Commercial Opportunity</h2>
          <div className="africa-stats">
            <div>
              <h4>Wagons</h4>
              <p>$700-900M pipeline</p>
            </div>
            <div>
              <h4>Locomotives</h4>
              <p>$600-800M pipeline</p>
            </div>
            <div>
              <h4>Total</h4>
              <p>$1.3-1.7B multi-year</p>
            </div>
          </div>
        </div>
      </section>

      <section className="africa-grid">
        <div className="africa-card">
          <h2>Execution Roadmap</h2>
          <div className="africa-timeline">
            {executionPlan.map((step) => (
              <div key={step.phase}>
                <h4>{step.phase}</h4>
                <p>{step.actions}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="africa-card">
          <h2>Risks & Mitigation</h2>
          <table className="africa-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((row) => (
                <tr key={row.risk}>
                  <td>{row.risk}</td>
                  <td>{row.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

        <footer className="africa-footer">
          <div>
            <strong>Recommendation:</strong> Treat Africa freight rail as a strategic
            export vertical with Southern Africa as anchor, Central Africa for
            expansion, and West Africa for relationship seeding.
          </div>
        </footer>
      </div>
    </div>
  );
}
