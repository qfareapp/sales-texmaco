import React from 'react';

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
  return (
    <div className="container mt-5 p-4 bg-white shadow rounded" style={{ maxWidth: '850px' }}>
      <h3 style={{ marginBottom: '20px', color: '#333', fontWeight: '600' }}>📊 KPI Dashboard</h3>

      {/* Category % */}
      <p style={{ fontSize: '1rem', marginBottom: '15px', color: '#444' }}>
        <strong style={{ color: '#007bff' }}>Private:</strong> {((pvt / total) * 100).toFixed(1)}% &nbsp;|&nbsp;
        <strong style={{ color: '#28a745' }}>Indian Railways:</strong> {((rail / total) * 100).toFixed(1)}% &nbsp;|&nbsp;
        <strong style={{ color: '#ff8800' }}>Export:</strong> {((exportCnt / total) * 100).toFixed(1)}%
      </p>

      {/* KPI Metrics */}
      <div style={{ fontSize: '1rem', lineHeight: '1.8', color: '#555' }}>
        <div>📩 <strong>Total Enquiry Value:</strong> ₹{totalEnquiryValue.toLocaleString()}</div>
        <div>✅ <strong>Total Confirmed Value:</strong> ₹{totalConfirmedValue.toLocaleString()}</div>
        <div>❌ <strong>Total Lost Value:</strong> ₹{totalLostValue.toLocaleString()}</div>
        <div>📈 <strong>Enquiry vs Confirmed:</strong> {enquiryVsConfirmedPercent}%</div>
      </div>

      <hr style={{ margin: '20px 0', borderColor: '#eee' }} />

      {/* Order Summary */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '15px' }}>
        <div style={{ fontSize: '16px', paddingLeft: '16px', marginBottom: '10px' }}>
          📦 <strong>Total Order in Hand:</strong> ₹{totalOrder.toLocaleString()} &nbsp;&nbsp;
          🚆 <strong>VUs:</strong> {totalVUs}
        </div>

        <div style={{ fontSize: '15px', paddingLeft: '32px', marginTop: '8px' }}>
          <div style={{ fontSize: '15px', paddingLeft: '24px', marginBottom: '6px' }}>
            🏷️ <strong>TWRL Order:</strong> ₹{twrlOrder.toLocaleString()} 🚆 <strong>VUs:</strong> {twrlVUs}
          </div>
          <div style={{ fontSize: '15px', paddingLeft: '24px' }}>
            🏷️ <strong>TREL Order:</strong> ₹{trelOrder.toLocaleString()} 🚆 <strong>VUs:</strong> {trelVUs}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
