import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./TradeExportDashboard.css";

dayjs.extend(customParseFormat);

const TEXMACO_MATCH = /texmaco/i;
const CHART_COLORS = ["#e86a33", "#1f8a70", "#004aad", "#2f4858", "#f2c14e"];

const rawRows = [
  {
    date: "04-Jul-2025",
    hsCode: "8606920000",
    productDescription:
      "Railway or tramway goods vans and wagons, not self-propelled:, open, with non-removable sides of a height exceeding 60 cm",
    consignee: "RWS Logistics Company",
    shipper: "BGS Rail Holdings LLC",
    stdQuantity: "1.00",
    stdUnit: "NOS",
    grossWeight: "23,300.00",
    quantity: "1.00",
    unit: "NOS",
    unitRate: "46996.1",
    value: "48697",
    countryOrigin: "Ukraine",
    portOrigin: "Not Available",
    countryDestination: "Kazakhstan",
    portDestination: "Not Available",
    shipmentMode: "-",
    portDelivery: "-",
    containerTEU: "-",
    freightTerm: "-",
    sourceCountry: "Kazakhstan T3 Import",
  },
  {
    date: "24-Jun-2025",
    hsCode: "8606990000",
    productDescription:
      "Railway or tramway goods vans and wagons, not self-propelled:, other",
    consignee: "IP Wagon KST",
    shipper: "Railship Commerce OU",
    stdQuantity: "1.00",
    stdUnit: "NOS",
    grossWeight: "25,000.00",
    quantity: "1.00",
    unit: "NOS",
    unitRate: "36557",
    value: "36557",
    countryOrigin: "Russia",
    portOrigin: "Not Available",
    countryDestination: "Kazakhstan",
    portDestination: "Not Available",
    shipmentMode: "-",
    portDelivery: "-",
    containerTEU: "-",
    freightTerm: "-",
    sourceCountry: "Kazakhstan T3 Import",
  },
  {
    date: "16-Jun-2025",
    hsCode: "8606920000",
    productDescription:
      "Railway or tramway goods vans and wagons, not self-propelled:, open, with non-removable sides of a height exceeding 60 cm",
    consignee: "RWS Logistics Company",
    shipper: "BGS Rail Holdings LLC",
    stdQuantity: "1.00",
    stdUnit: "NOS",
    grossWeight: "23,600.00",
    quantity: "1.00",
    unit: "NOS",
    unitRate: "47421.23",
    value: "49324",
    countryOrigin: "Ukraine",
    portOrigin: "Not Available",
    countryDestination: "Kazakhstan",
    portDestination: "Not Available",
    shipmentMode: "-",
    portDelivery: "-",
    containerTEU: "-",
    freightTerm: "-",
    sourceCountry: "Kazakhstan T3 Import",
  },
  {
    date: "22-Apr-2025",
    hsCode: "8606990000",
    productDescription:
      "Railway or tramway goods vans and wagons, not self-propelled:, other",
    consignee: "IP Wagon KST",
    shipper: "Railship Commerce OU",
    stdQuantity: "1.00",
    stdUnit: "NOS",
    grossWeight: "25,000.00",
    quantity: "1.00",
    unit: "NOS",
    unitRate: "36557",
    value: "37500",
    countryOrigin: "Russia",
    portOrigin: "Not Available",
    countryDestination: "Kazakhstan",
    portDestination: "Not Available",
    shipmentMode: "-",
    portDelivery: "-",
    containerTEU: "-",
    freightTerm: "-",
    sourceCountry: "Kazakhstan T3 Import",
  },
  {
    date: "22-Apr-2025",
    hsCode: "8606990000",
    productDescription:
      "Railway or tramway goods vans and wagons, not self-propelled:, other",
    consignee: "IP Wagon KST",
    shipper: "Railship Commerce OU",
    stdQuantity: "1.00",
    stdUnit: "NOS",
    grossWeight: "25,000.00",
    quantity: "1.00",
    unit: "NOS",
    unitRate: "36557",
    value: "37500",
    countryOrigin: "Russia",
    portOrigin: "Not Available",
    countryDestination: "Kazakhstan",
    portDestination: "Not Available",
    shipmentMode: "-",
    portDelivery: "-",
    containerTEU: "-",
    freightTerm: "-",
    sourceCountry: "Kazakhstan T3 Import",
  },
  {
    date: "28-Apr-2025",
    hsCode: "8606920000",
    productDescription:
      "Railway or tramway goods vans and wagons, not self-propelled:, open, with non-removable sides of a height exceeding 60 cm",
    consignee: "RWS Logistics Company",
    shipper: "BGS RAIL HOLDINGS LLC",
    stdQuantity: "1.00",
    stdUnit: "NOS",
    grossWeight: "23,300.00",
    quantity: "1.00",
    unit: "NOS",
    unitRate: "46996.1",
    value: "48697",
    countryOrigin: "Ukraine",
    portOrigin: "Not Available",
    countryDestination: "Kazakhstan",
    portDestination: "Not Available",
    shipmentMode: "-",
    portDelivery: "-",
    containerTEU: "-",
    freightTerm: "-",
    sourceCountry: "Kazakhstan T3 Import",
  },
  {
    date: "19-Jun-2025",
    hsCode: "8606920000",
    productDescription:
      "Railway or tramway goods vans and wagons, not self-propelled:, open, with non-removable sides of a height exceeding 60 cm",
    consignee: "RWS Logistics Company",
    shipper: "BGS Rail Holdings LLC",
    stdQuantity: "1.00",
    stdUnit: "NOS",
    grossWeight: "23,500.00",
    quantity: "1.00",
    unit: "NOS",
    unitRate: "45163.38",
    value: "49115",
    countryOrigin: "Ukraine",
    portOrigin: "Not Available",
    countryDestination: "Kazakhstan",
    portDestination: "Not Available",
    shipmentMode: "-",
    portDelivery: "-",
    containerTEU: "-",
    freightTerm: "-",
    sourceCountry: "Kazakhstan T3 Import",
  },
];

const parseNumber = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const normalized = String(value).replace(/,/g, "");
  return Number(normalized) || 0;
};

const normalizeRows = (rows) =>
  rows.map((row) => ({
    ...row,
    quantity: parseNumber(row.quantity),
    value: parseNumber(row.value),
    unitRate: parseNumber(row.unitRate),
    grossWeight: parseNumber(row.grossWeight),
    stdQuantity: parseNumber(row.stdQuantity),
    dateObj: dayjs(row.date, "DD-MMM-YYYY"),
  }));

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value || 0);

const aggregateByKey = (rows, key) => {
  const map = new Map();
  rows.forEach((row) => {
    const name = row[key] || "Unknown";
    const entry = map.get(name) || {
      name,
      value: 0,
      quantity: 0,
      shipments: 0,
    };
    entry.value += row.value;
    entry.quantity += row.quantity;
    entry.shipments += 1;
    map.set(name, entry);
  });
  return Array.from(map.values());
};

const buildTrend = (rows, granularity) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.dateObj.isValid()) return;
    const key =
      granularity === "yearly"
        ? row.dateObj.format("YYYY")
        : row.dateObj.format("YYYY-MM");
    const label =
      granularity === "yearly"
        ? row.dateObj.format("YYYY")
        : row.dateObj.format("MMM YY");
    const sortKey = row.dateObj
      .startOf(granularity === "yearly" ? "year" : "month")
      .valueOf();
    const entry = map.get(key) || {
      key,
      label,
      sortKey,
      quantity: 0,
      value: 0,
      shipments: 0,
    };
    entry.quantity += row.quantity;
    entry.value += row.value;
    entry.shipments += 1;
    map.set(key, entry);
  });
  const series = Array.from(map.values()).sort((a, b) => a.sortKey - b.sortKey);
  return series.map((item) => ({
    ...item,
    unitPrice: item.quantity ? item.value / item.quantity : 0,
  }));
};

const median = (values) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const KpiCard = ({ label, value, helper }) => (
  <div className="trade-kpi-card">
    <p className="trade-kpi-label">{label}</p>
    <h3 className="trade-kpi-value">{value}</h3>
    {helper && <span className="trade-kpi-helper">{helper}</span>}
  </div>
);

export default function TradeExportDashboard() {
  const [trendGranularity, setTrendGranularity] = useState("monthly");
  const [filters, setFilters] = useState({
    year: "All",
    month: "All",
    country: "All",
    exporter: "All",
    minValue: "",
    minQuantity: "",
    texmacoOnly: false,
  });

  const rows = useMemo(() => normalizeRows(rawRows), []);

  const years = useMemo(() => {
    const set = new Set(rows.map((row) => row.dateObj.format("YYYY")));
    return ["All", ...Array.from(set).filter(Boolean).sort()];
  }, [rows]);

  const months = useMemo(() => {
    const set = new Set(rows.map((row) => row.dateObj.format("MMMM")));
    return ["All", ...Array.from(set).filter(Boolean)];
  }, [rows]);

  const countries = useMemo(() => {
    const set = new Set(rows.map((row) => row.countryDestination));
    return ["All", ...Array.from(set).filter(Boolean)];
  }, [rows]);

  const exporters = useMemo(() => {
    const set = new Set(rows.map((row) => row.shipper));
    return ["All", ...Array.from(set).filter(Boolean)];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesYear =
        filters.year === "All" || row.dateObj.format("YYYY") === filters.year;
      const matchesMonth =
        filters.month === "All" || row.dateObj.format("MMMM") === filters.month;
      const matchesCountry =
        filters.country === "All" || row.countryDestination === filters.country;
      const matchesExporter =
        filters.exporter === "All" || row.shipper === filters.exporter;
      const matchesTexmaco = !filters.texmacoOnly
        ? true
        : TEXMACO_MATCH.test(row.shipper) || TEXMACO_MATCH.test(row.consignee);
      const matchesValue =
        !filters.minValue || row.value >= parseNumber(filters.minValue);
      const matchesQuantity =
        !filters.minQuantity || row.quantity >= parseNumber(filters.minQuantity);
      return (
        matchesYear &&
        matchesMonth &&
        matchesCountry &&
        matchesExporter &&
        matchesTexmaco &&
        matchesValue &&
        matchesQuantity
      );
    });
  }, [filters, rows]);

  const totals = useMemo(() => {
    const totalValue = filteredRows.reduce((sum, row) => sum + row.value, 0);
    const totalQuantity = filteredRows.reduce(
      (sum, row) => sum + row.quantity,
      0
    );
    const avgUnitPrice = totalQuantity ? totalValue / totalQuantity : 0;
    const shipmentCount = filteredRows.length;
    const exportersCount = new Set(filteredRows.map((row) => row.shipper)).size;
    const importingCountries = new Set(
      filteredRows.map((row) => row.countryDestination)
    ).size;
    const dates = filteredRows
      .map((row) => row.dateObj)
      .filter((d) => d.isValid());
    const minDate = dates.length
      ? dates.reduce((min, current) => (current.isBefore(min) ? current : min))
      : null;
    const maxDate = dates.length
      ? dates.reduce((max, current) => (current.isAfter(max) ? current : max))
      : null;
    return {
      totalValue,
      totalQuantity,
      avgUnitPrice,
      shipmentCount,
      exportersCount,
      importingCountries,
      minDate,
      maxDate,
    };
  }, [filteredRows]);

  const trendSeries = useMemo(
    () => buildTrend(filteredRows, trendGranularity),
    [filteredRows, trendGranularity]
  );
  const shipmentTrend = useMemo(
    () => buildTrend(filteredRows, trendGranularity),
    [filteredRows, trendGranularity]
  );

  const countryStats = useMemo(
    () => aggregateByKey(filteredRows, "countryDestination"),
    [filteredRows]
  );
  const exporterStats = useMemo(
    () => aggregateByKey(filteredRows, "shipper"),
    [filteredRows]
  );

  const topCountryByValue = useMemo(
    () =>
      [...countryStats]
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [countryStats]
  );

  const topCountryByQuantity = useMemo(
    () =>
      [...countryStats]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6),
    [countryStats]
  );

  const topExportersByValue = useMemo(
    () =>
      [...exporterStats]
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [exporterStats]
  );

  const topExportersByQuantity = useMemo(
    () =>
      [...exporterStats]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6),
    [exporterStats]
  );

  const texmacoRows = useMemo(
    () =>
      filteredRows.filter(
        (row) => TEXMACO_MATCH.test(row.shipper) || TEXMACO_MATCH.test(row.consignee)
      ),
    [filteredRows]
  );

  const texmacoTotals = useMemo(() => {
    const value = texmacoRows.reduce((sum, row) => sum + row.value, 0);
    const quantity = texmacoRows.reduce((sum, row) => sum + row.quantity, 0);
    const avgUnitPrice = quantity ? value / quantity : 0;
    const countries = new Set(texmacoRows.map((row) => row.countryDestination));
    const shipmentFrequency = texmacoRows.length;
    return { value, quantity, avgUnitPrice, countries, shipmentFrequency };
  }, [texmacoRows]);

  const unitPriceBins = useMemo(() => {
    const prices = filteredRows.map((row) => row.unitRate).filter((v) => v > 0);
    if (!prices.length) return [];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const binCount = 5;
    const step = (max - min) / binCount || 1;
    const bins = Array.from({ length: binCount }, (_, index) => {
      const start = min + index * step;
      const end = start + step;
      return {
        name: `${Math.round(start)}-${Math.round(end)}`,
        count: 0,
      };
    });
    prices.forEach((price) => {
      const idx = Math.min(
        Math.floor((price - min) / step),
        binCount - 1
      );
      bins[idx].count += 1;
    });
    return bins;
  }, [filteredRows]);

  const countryPriceStats = useMemo(
    () =>
      countryStats.map((item) => ({
        name: item.name,
        avgUnitPrice: item.quantity ? item.value / item.quantity : 0,
      })),
    [countryStats]
  );

  const exporterPriceStats = useMemo(
    () =>
      exporterStats.map((item) => ({
        name: item.name,
        avgUnitPrice: item.quantity ? item.value / item.quantity : 0,
      })),
    [exporterStats]
  );

  const laneStats = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const lane = `${row.countryOrigin || "Unknown"} -> ${
        row.countryDestination || "Unknown"
      }`;
      const entry = map.get(lane) || { lane, shipments: 0 };
      entry.shipments += 1;
      map.set(lane, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.shipments - a.shipments);
  }, [filteredRows]);

  const portStats = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((row) => {
      const port = row.portDestination || row.portOrigin || "Unknown";
      const entry = map.get(port) || { name: port, shipments: 0 };
      entry.shipments += 1;
      map.set(port, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.shipments - a.shipments);
  }, [filteredRows]);

  const riskMetrics = useMemo(() => {
    const totalValue = totals.totalValue || 1;
    const sortedCountries = [...countryStats].sort(
      (a, b) => b.value - a.value
    );
    const top3 = sortedCountries.slice(0, 3).reduce((sum, c) => sum + c.value, 0);
    const top5 = sortedCountries.slice(0, 5).reduce((sum, c) => sum + c.value, 0);
    const exporterTotal = exporterStats.reduce((sum, e) => sum + e.value, 0) || 1;
    const sortedExporters = [...exporterStats].sort((a, b) => b.value - a.value);
    const topExporterShare = sortedExporters.length
      ? sortedExporters[0].value / exporterTotal
      : 0;
    const hhi = sortedCountries.reduce((sum, c) => {
      const share = c.value / totalValue;
      return sum + share * share;
    }, 0);
    return {
      top3Share: top3 / totalValue,
      top5Share: top5 / totalValue,
      topExporterShare,
      hhi,
    };
  }, [countryStats, exporterStats, totals.totalValue]);

  const opportunitySignals = useMemo(() => {
    const valueMedian = median(countryStats.map((c) => c.value));
    const shipmentMedian = median(countryStats.map((c) => c.shipments));
    const highValueLowPenetration = countryStats.filter(
      (c) => c.value >= valueMedian && c.shipments <= shipmentMedian
    );
    const priceMedian = median(countryPriceStats.map((c) => c.avgUnitPrice));
    const qtyMedian = median(countryStats.map((c) => c.quantity));
    const highPriceLowVolume = countryPriceStats.filter((c) => {
      const qty = countryStats.find((item) => item.name === c.name)?.quantity || 0;
      return c.avgUnitPrice >= priceMedian && qty <= qtyMedian;
    });
    return {
      highValueLowPenetration,
      highPriceLowVolume,
    };
  }, [countryPriceStats, countryStats]);

  return (
    <div className="trade-dashboard">
      <header className="trade-hero">
        <div>
          <p className="trade-eyebrow">HSN Export Intelligence</p>
          <h1>Trade Volume & Value Overview</h1>
          <p className="trade-subtitle">
            One-glance view of export health, time trends, and risk signals.
          </p>
        </div>
        <div className="trade-filters">
          <div className="trade-filter">
            <label>Year</label>
            <select
              value={filters.year}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, year: event.target.value }))
              }
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div className="trade-filter">
            <label>Month</label>
            <select
              value={filters.month}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, month: event.target.value }))
              }
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="trade-filter">
            <label>Country</label>
            <select
              value={filters.country}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, country: event.target.value }))
              }
            >
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div className="trade-filter">
            <label>Exporter</label>
            <select
              value={filters.exporter}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, exporter: event.target.value }))
              }
            >
              {exporters.map((exporter) => (
                <option key={exporter} value={exporter}>
                  {exporter}
                </option>
              ))}
            </select>
          </div>
          <div className="trade-filter">
            <label>Min Value ($)</label>
            <input
              type="number"
              value={filters.minValue}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, minValue: event.target.value }))
              }
              placeholder="0"
            />
          </div>
          <div className="trade-filter">
            <label>Min Quantity</label>
            <input
              type="number"
              value={filters.minQuantity}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  minQuantity: event.target.value,
                }))
              }
              placeholder="0"
            />
          </div>
          <label className="trade-checkbox">
            <input
              type="checkbox"
              checked={filters.texmacoOnly}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  texmacoOnly: event.target.checked,
                }))
              }
            />
            Texmaco only
          </label>
        </div>
      </header>

      <section className="trade-kpi-ribbon">
        <KpiCard
          label="Total Export Quantity"
          value={formatNumber(totals.totalQuantity)}
        />
        <KpiCard
          label="Total Export Value"
          value={formatCurrency(totals.totalValue)}
        />
        <KpiCard
          label="Average Unit Price"
          value={formatCurrency(totals.avgUnitPrice)}
        />
        <KpiCard label="No. of Shipments" value={totals.shipmentCount} />
        <KpiCard label="No. of Exporters" value={totals.exportersCount} />
        <KpiCard
          label="No. of Importing Countries"
          value={totals.importingCountries}
        />
        <KpiCard
          label="Time Period Covered"
          value={
            totals.minDate && totals.maxDate
              ? `${totals.minDate.format("DD MMM YY")} - ${totals.maxDate.format(
                  "DD MMM YY"
                )}`
              : "n/a"
          }
        />
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Time Trend Analysis</h2>
          <div className="trade-toggle">
            <button
              className={trendGranularity === "monthly" ? "active" : ""}
              onClick={() => setTrendGranularity("monthly")}
            >
              Monthly
            </button>
            <button
              className={trendGranularity === "yearly" ? "active" : ""}
              onClick={() => setTrendGranularity("yearly")}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="trade-grid-2">
          <div className="trade-card">
            <h3>Quantity vs Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="quantity"
                  stroke="#e86a33"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Value vs Time</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1f8a70"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Average Unit Price Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Line
                  type="monotone"
                  dataKey="unitPrice"
                  stroke="#004aad"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Opportunity Identification Dashboard</h2>
        </div>
        <div className="trade-grid-2">
          <div className="trade-card">
            <h3>High-Value Markets, Low Penetration</h3>
            <div className="trade-opportunity-list">
              {opportunitySignals.highValueLowPenetration.length ? (
                opportunitySignals.highValueLowPenetration.map((market) => (
                  <div key={market.name}>
                    <span>{market.name}</span>
                    <strong>{formatCurrency(market.value)}</strong>
                  </div>
                ))
              ) : (
                <p className="trade-muted">No markets match this signal.</p>
              )}
            </div>
          </div>
          <div className="trade-card">
            <h3>High Unit Price, Low Volume</h3>
            <div className="trade-opportunity-list">
              {opportunitySignals.highPriceLowVolume.length ? (
                opportunitySignals.highPriceLowVolume.map((market) => (
                  <div key={market.name}>
                    <span>{market.name}</span>
                    <strong>{formatCurrency(market.avgUnitPrice)}</strong>
                  </div>
                ))
              ) : (
                <p className="trade-muted">No markets match this signal.</p>
              )}
            </div>
          </div>
          <div className="trade-card">
            <h3>Price Gaps Texmaco Can Exploit</h3>
            <p className="trade-muted">
              {texmacoTotals.avgUnitPrice && totals.avgUnitPrice
                ? texmacoTotals.avgUnitPrice < totals.avgUnitPrice * 0.9
                  ? "Texmaco is priced below market average, room for premium positioning."
                  : "Texmaco pricing is in line with the market."
                : "Add Texmaco data to surface pricing gaps."}
            </p>
          </div>
          <div className="trade-card">
            <h3>Strategic Notes</h3>
            <p className="trade-muted">
              Use filters to isolate exporters or markets, then compare unit price
              trends with shipment frequency to flag structural shifts.
            </p>
          </div>
        </div>
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Market Concentration & Risk Analysis</h2>
        </div>
        <div className="trade-grid-3">
          <div className="trade-card">
            <h3>Country Dependence</h3>
            <div className="trade-stat-list">
              <span>Top 3 Countries: {(riskMetrics.top3Share * 100).toFixed(1)}%</span>
              <span>Top 5 Countries: {(riskMetrics.top5Share * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div className="trade-card">
            <h3>Exporter Dominance</h3>
            <div className="trade-stat-list">
              <span>
                Top Exporter Share: {(riskMetrics.topExporterShare * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="trade-card">
            <h3>HHI Concentration Score</h3>
            <div className="trade-stat-list">
              <span>{riskMetrics.hhi.toFixed(2)}</span>
              <span className="trade-muted">
                Higher values indicate concentrated markets.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Shipment & Logistics Patterns</h2>
        </div>
        <div className="trade-grid-2">
          <div className="trade-card">
            <h3>Shipment Count Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={shipmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="shipments"
                  stroke="#f2c14e"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Average Shipment Size</h3>
            <div className="trade-stat-list">
              <span>
                Avg Quantity / Shipment:{" "}
                {totals.shipmentCount
                  ? formatNumber(totals.totalQuantity / totals.shipmentCount)
                  : "n/a"}
              </span>
              <span>
                Avg Value / Shipment:{" "}
                {totals.shipmentCount
                  ? formatCurrency(totals.totalValue / totals.shipmentCount)
                  : "n/a"}
              </span>
            </div>
          </div>
          <div className="trade-card">
            <h3>Port-wise Shipment Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={portStats.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="shipments" fill="#004aad" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Frequent Shipment Lanes</h3>
            <div className="trade-lane-list">
              {laneStats.slice(0, 5).map((lane) => (
                <div key={lane.lane}>
                  <span>{lane.lane}</span>
                  <strong>{lane.shipments} shipments</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Price & Value Realization Analysis</h2>
        </div>
        <div className="trade-grid-2">
          <div className="trade-card">
            <h3>Unit Price Distribution</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={unitPriceBins}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1f8a70" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Country-wise Average Unit Price</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={countryPriceStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="avgUnitPrice" fill="#e86a33" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Exporter-wise Average Unit Price</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={exporterPriceStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="avgUnitPrice" fill="#2f4858" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Texmaco-Specific Deep Dive</h2>
          <p>Management relevance and pricing positioning.</p>
        </div>
        <div className="trade-grid-3">
          <div className="trade-card">
            <h3>Texmaco KPIs</h3>
            <div className="trade-stat-list">
              <span>Export Value: {formatCurrency(texmacoTotals.value)}</span>
              <span>Export Quantity: {formatNumber(texmacoTotals.quantity)}</span>
              <span>
                Avg Unit Price: {formatCurrency(texmacoTotals.avgUnitPrice)}
              </span>
              <span>
                Country Footprint: {texmacoTotals.countries.size || 0}
              </span>
              <span>Shipment Frequency: {texmacoTotals.shipmentFrequency}</span>
            </div>
          </div>
          <div className="trade-card">
            <h3>Pricing Position</h3>
            <div className="trade-stat-list">
              <span>
                Texmaco vs Market Price:{" "}
                {totals.avgUnitPrice
                  ? `${((texmacoTotals.avgUnitPrice / totals.avgUnitPrice) * 100).toFixed(
                      0
                    )}%`
                  : "n/a"}
              </span>
              <span>
                Market Avg Price: {formatCurrency(totals.avgUnitPrice)}
              </span>
            </div>
          </div>
          <div className="trade-card">
            <h3>Mix Comparison</h3>
            <div className="trade-stat-list">
              <span>
                Texmaco Markets:{" "}
                {texmacoTotals.countries.size
                  ? Array.from(texmacoTotals.countries).join(", ")
                  : "n/a"}
              </span>
              <span>Industry Markets: {countries.slice(1).join(", ")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Exporter (Indian Supplier) Analysis</h2>
          <p>Competitive benchmarking and supplier concentration.</p>
        </div>
        <div className="trade-grid-2">
          <div className="trade-card">
            <h3>Top Exporters by Value</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topExportersByValue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="value" fill="#004aad" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Top Exporters by Quantity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topExportersByQuantity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(val) => formatNumber(val)} />
                <Bar dataKey="quantity" fill="#2f4858" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Exporter Market Share</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Pie
                  data={exporterStats}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                >
                  {exporterStats.map((entry, index) => (
                    <Cell
                      key={`exporter-${entry.name}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Exporter Concentration</h3>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart
                data={[
                  {
                    name: "Top 5 Exporters",
                    value: topExportersByValue.reduce(
                      (sum, row) => sum + row.value,
                      0
                    ),
                  },
                  {
                    name: "Rest of Market",
                    value:
                      exporterStats.reduce((sum, row) => sum + row.value, 0) -
                      topExportersByValue.reduce(
                        (sum, row) => sum + row.value,
                        0
                      ),
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="value" fill="#f2c14e" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="trade-compare-panel">
              <h4>Texmaco vs Others</h4>
              {texmacoRows.length ? (
                <div className="trade-compare-metrics">
                  <span>
                    Texmaco Value: {formatCurrency(texmacoTotals.value)}
                  </span>
                  <span>
                    Market Share:{" "}
                    {totals.totalValue
                      ? `${((texmacoTotals.value / totals.totalValue) * 100).toFixed(
                          1
                        )}%`
                      : "0%"}
                  </span>
                </div>
              ) : (
                <p className="trade-muted">
                  No Texmaco shipments in the current filter set.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="trade-section">
        <div className="trade-section-title">
          <h2>Country-Wise Export Analysis</h2>
          <p>Market prioritization and exposure snapshot.</p>
        </div>
        <div className="trade-grid-2">
          <div className="trade-card">
            <h3>Top Destination Countries by Value</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCountryByValue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Bar dataKey="value" fill="#e86a33" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Top Destination Countries by Quantity</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topCountryByQuantity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(val) => formatNumber(val)} />
                <Bar dataKey="quantity" fill="#1f8a70" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Country Share (%)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Tooltip formatter={(val) => formatCurrency(val)} />
                <Pie
                  data={countryStats}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                >
                  {countryStats.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="trade-card">
            <h3>Heat Map: Country x Value</h3>
            <div className="trade-heatmap">
              {countryStats.map((country) => {
                const intensity =
                  totals.totalValue === 0
                    ? 0
                    : country.value / totals.totalValue;
                return (
                  <div
                    key={country.name}
                    className="trade-heatmap-cell"
                    style={{
                      backgroundColor: `rgba(232, 106, 51, ${
                        0.2 + intensity * 0.6
                      })`,
                    }}
                  >
                    <span>{country.name}</span>
                    <strong>{formatCurrency(country.value)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
