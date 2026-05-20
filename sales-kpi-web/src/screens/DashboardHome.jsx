import React from 'react';

const fmt = (val) => '₹' + Number(val).toLocaleString('en-IN');

const MetricCard = ({ icon, label, value, color, bg, subValue }) => (
  <div style={{
    background: bg || '#f8f9fa',
    borderRadius: 14,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    borderLeft: `4px solid ${color}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    minWidth: 0,
  }}>
    <div style={{ fontSize: 22 }}>{icon}</div>
    <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: color }}>{value}</div>
    {subValue && <div style={{ fontSize: 12, color: '#999' }}>{subValue}</div>}
  </div>
);

const CategoryBadge = ({ label, pct, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 90 }}>
    <div style={{
      background: color + '18',
      border: `2px solid ${color}`,
      borderRadius: 20,
      padding: '4px 14px',
      fontWeight: 700,
      color: color,
      fontSize: 15,
    }}>{pct}%</div>
    <div style={{ fontSize: 11, color: '#777', fontWeight: 600 }}>{label}</div>
  </div>
);

const ProgressBar = ({ pct, color }) => (
  <div style={{ background: '#eee', borderRadius: 99, height: 8, overflow: 'hidden', margin: '6px 0 2px' }}>
    <div style={{
      width: `${Math.min(pct, 100)}%`,
      background: color,
      height: '100%',
      borderRadius: 99,
      transition: 'width 0.6s ease',
    }} />
  </div>
);

const DashboardHome = ({
  pvt = 0,
  rail = 0,
  exportCnt = 0,
  total = 1,
  totalEnquiryValue = 0,
  totalConfirmedValue = 0,
  totalLostValue = 0,
  enquiryVsConfirmedPercent = 0,
  totalOrder = 0,
  totalVUs = 0,
  twrlOrder = 0,
  twrlVUs = 0,
  trelOrder = 0,
  trelVUs = 0
}) => {
  const pvtPct = ((pvt / total) * 100).toFixed(1);
  const railPct = ((rail / total) * 100).toFixed(1);
  const exportPct = ((exportCnt / total) * 100).toFixed(1);
  const convRate = Number(enquiryVsConfirmedPercent).toFixed(1);
  const lossRate = totalEnquiryValue > 0 ? ((totalLostValue / totalEnquiryValue) * 100).toFixed(1) : '0.0';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f4ff 0%, #fff 100%)',
      borderRadius: 18,
      padding: '28px 28px 24px',
      maxWidth: 900,
      margin: '0 auto',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      fontFamily: "'Segoe UI', sans-serif",
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 32 }}>📊</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>KPI Dashboard</h3>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Sales Performance Overview</div>
          </div>
        </div>
        <div style={{
          background: '#fff',
          border: '1px solid #e0e7ff',
          borderRadius: 10,
          padding: '6px 16px',
          fontSize: 13,
          color: '#5c6bc0',
          fontWeight: 600,
        }}>
          Total Enquiries: {total}
        </div>
      </div>

      {/* Category Breakdown */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: 12, color: '#aaa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
          Enquiry Category Split
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <CategoryBadge label="Private" pct={pvtPct} color="#3b82f6" />
          <div style={{ flex: 1, minWidth: 120 }}>
            <ProgressBar pct={Number(pvtPct)} color="#3b82f6" />
            <ProgressBar pct={Number(railPct)} color="#10b981" />
            <ProgressBar pct={Number(exportPct)} color="#f59e0b" />
          </div>
          <CategoryBadge label="Indian Railways" pct={railPct} color="#10b981" />
          <CategoryBadge label="Export" pct={exportPct} color="#f59e0b" />
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        <MetricCard
          icon="📩"
          label="Total Enquiry Value"
          value={fmt(totalEnquiryValue)}
          color="#3b82f6"
          bg="#eff6ff"
        />
        <MetricCard
          icon="✅"
          label="Confirmed Value"
          value={fmt(totalConfirmedValue)}
          color="#10b981"
          bg="#f0fdf4"
          subValue={`${convRate}% conversion rate`}
        />
        <MetricCard
          icon="❌"
          label="Lost Value"
          value={fmt(totalLostValue)}
          color="#ef4444"
          bg="#fef2f2"
          subValue={`${lossRate}% loss rate`}
        />
        <MetricCard
          icon="📈"
          label="Enquiry → Confirmed"
          value={`${convRate}%`}
          color="#8b5cf6"
          bg="#f5f3ff"
        />
      </div>

      {/* Order in Hand Section */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: 14,
        padding: '20px 24px',
        color: '#fff',
      }}>
        <div style={{ fontSize: 12, color: '#aab4d4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
          Orders in Hand
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📦</span>
            <div>
              <div style={{ fontSize: 11, color: '#aab4d4' }}>TOTAL ORDER VALUE</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7dd3fc' }}>{fmt(totalOrder)}</div>
            </div>
          </div>
          <div style={{
            background: '#2d3561',
            borderRadius: 10,
            padding: '8px 18px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#aab4d4' }}>TOTAL VUs</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>🚆 {totalVUs}</div>
          </div>
        </div>

        {/* TWRL / TREL split */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'TWRL', order: twrlOrder, vus: twrlVUs, color: '#34d399', accent: '#065f46' },
            { label: 'TREL', order: trelOrder, vus: trelVUs, color: '#fb923c', accent: '#7c2d12' },
          ].map(({ label, order, vus, color, accent }) => (
            <div key={label} style={{
              background: '#2d3561',
              borderRadius: 10,
              padding: '14px 16px',
              borderTop: `3px solid ${color}`,
            }}>
              <div style={{ fontSize: 12, color: '#aab4d4', fontWeight: 700, marginBottom: 6 }}>🏷️ {label} Order</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: color }}>{fmt(order)}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#c4c9e2' }}>
                🚆 <strong style={{ color: '#e0e7ff' }}>{vus}</strong> VUs
              </div>
              {totalOrder > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: '#aab4d4', marginBottom: 4 }}>
                    {((order / totalOrder) * 100).toFixed(1)}% of total
                  </div>
                  <div style={{ background: '#1a1a2e', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min((order / totalOrder) * 100, 100)}%`,
                      background: color,
                      height: '100%',
                      borderRadius: 99,
                    }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
