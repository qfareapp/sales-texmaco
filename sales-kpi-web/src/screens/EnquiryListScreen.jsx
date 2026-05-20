import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DatePicker from 'react-datepicker';
import DashboardHome from '../screens/DashboardHome';
import api from '../api';
import 'react-datepicker/dist/react-datepicker.css';

/* ─── helpers ─── */
const fmtINR = v => '₹' + Number(v).toLocaleString('en-IN');

const STAGE_META = {
  Enquiry:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Quoted:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  Confirmed: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Lost:      { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  Cancelled: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
};

const StageBadge = ({ stage }) => {
  const m = STAGE_META[stage] || STAGE_META.Cancelled;
  return (
    <span style={{
      background: m.bg,
      color: m.color,
      border: `1px solid ${m.border}`,
      borderRadius: 20,
      padding: '3px 12px',
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{stage}</span>
  );
};

const ClientBadge = ({ type }) => {
  const map = {
    'Indian Railways': { bg: '#f0fdf4', color: '#166534' },
    'Private':         { bg: '#eff6ff', color: '#1e40af' },
    'Export':          { bg: '#fffbeb', color: '#92400e' },
  };
  const m = map[type] || { bg: '#f9fafb', color: '#374151' };
  return (
    <span style={{
      background: m.bg, color: m.color,
      borderRadius: 6, padding: '2px 8px',
      fontSize: 12, fontWeight: 600,
    }}>{type || 'N/A'}</span>
  );
};

/* ─── component ─── */
const EnquiryListScreen = () => {
  const [enquiries, setEnquiries]         = useState([]);
  const [orders, setOrders]               = useState([]);
  const [stageFilter, setStageFilter]     = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('');
  const [fromDate, setFromDate]           = useState(null);
  const [toDate, setToDate]               = useState(null);
  const [filteredSales, setFilteredSales] = useState(0);
  const [filteredVUs, setFilteredVUs]     = useState(0);
  const navigate = useNavigate();

  /* ── fetch ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enquiryRes, updatesRes, ordersRes] = await Promise.all([
          api.get('/enquiries'),
          api.get('/daily-updates'),
          api.get('/enquiries/orders'),
        ]);

        const enquiriesData = enquiryRes.data || [];
        const updatesData   = updatesRes.data || [];
        const ordersData    = (ordersRes.data && ordersRes.data.orders) || [];

        const deliveredMap = {};
        const dateWiseMap  = {};
        updatesData.forEach(({ projectId, date, wagonSold }) => {
          const sold = Number(wagonSold) || 0;
          deliveredMap[projectId] = (deliveredMap[projectId] || 0) + sold;
          (dateWiseMap[projectId] ||= []).push({ date, wagonSold: sold });
        });

        const enrichedEnquiries = enquiriesData.map(e => ({
          ...e,
          wagonsSoldTillDate: deliveredMap[e.projectId] || 0,
          dateWiseDelivery:   dateWiseMap[e.projectId]  || [],
        }));

        const enrichedOrders = ordersData.map(o => {
          const totalWagons      = (Number(o.noOfRakes) || 0) * (Number(o.wagonsPerRake) || 0);
          const sold             = deliveredMap[o.projectId] || 0;
          const pending          = Math.max(totalWagons - sold, 0);
          const currentOrderInHand = pending * (Number(o.pricePerWagon) || 0);
          return { ...o, totalWagons, wagonsSoldTillDate: sold, pending, currentOrderInHand };
        });

        setEnquiries(enrichedEnquiries);
        setOrders(enrichedOrders);
      } catch (err) {
        console.error('Error fetching KPI data:', err);
      }
    };
    fetchData();
  }, []);

  /* ── KPI calcs ── */
  const total    = enquiries.length || 1;
  const pvt      = enquiries.filter(e => e.clientType === 'Private').length;
  const rail     = enquiries.filter(e => e.clientType === 'Indian Railways').length;
  const exportCnt= enquiries.filter(e => e.clientType === 'Export').length;

  const totalEnquiryValue   = enquiries.filter(e => e.stage === 'Enquiry').reduce((s,e) => s + (Number(e.estimatedAmount)||0), 0);
  const totalConfirmedValue = enquiries.filter(e => e.stage === 'Confirmed').reduce((s,e) => s + (Number(e.quotedPrice)||0), 0);
  const totalLostValue      = enquiries.filter(e => e.stage === 'Lost').reduce((s,e) => s + (Number(e.quotedPrice)||0), 0);
  const confirmed           = enquiries.filter(e => e.stage === 'Confirmed').length;
  const enquiryVsConfirmedPercent = ((confirmed / total) * 100).toFixed(1);

  const totalOrder = orders.reduce((s,o) => s + (Number(o.currentOrderInHand)||0), 0);
  const totalVUs   = orders.reduce((s,o) => s + (Number(o.pending)||0), 0);

  const twrlOrders = orders.filter(o => (o.owner||'').toUpperCase() === 'TWRL');
  const twrlOrder  = twrlOrders.reduce((s,o) => s + (Number(o.currentOrderInHand)||0), 0);
  const twrlVUs    = twrlOrders.reduce((s,o) => s + (Number(o.pending)||0), 0);

  const trelOrders = orders.filter(o => (o.owner||'').toUpperCase() === 'TREL');
  const trelOrder  = trelOrders.reduce((s,o) => s + (Number(o.currentOrderInHand)||0), 0);
  const trelVUs    = trelOrders.reduce((s,o) => s + (Number(o.pending)||0), 0);

  /* ── filter ── */
  const filtered = enquiries.filter(e =>
    (stageFilter      === '' || e.stage      === stageFilter) &&
    (clientTypeFilter === '' || e.clientType === clientTypeFilter)
  );

  const getProgress = (e) => {
    const tw = (Number(e.noOfRakes)||0) * (Number(e.wagonsPerRake)||0);
    const dl = Number(e.wagonsSoldTillDate)||0;
    return tw > 0 ? ((dl/tw)*100).toFixed(1) : '0.0';
  };

  /* ── date-range sales ── */
  useEffect(() => {
    const run = async () => {
      if (!fromDate || !toDate) return;
      try {
        const res   = await api.get('/daily-updates');
        const start = new Date(fromDate); start.setHours(0,0,0,0);
        const end   = new Date(toDate);   end.setHours(23,59,59,999);
        const within = res.data.filter(u => {
          const d = new Date(u.date); d.setHours(0,0,0,0);
          return d >= start && d <= end;
        });
        const { value, vus } = within.reduce((acc, item) => {
          const eq = enquiries.find(e => String(e.projectId) === String(item.projectId) && e.stage === 'Confirmed');
          if (!eq) return acc;
          const tw    = (Number(eq.noOfRakes)||0)*(Number(eq.wagonsPerRake)||0);
          const price = Number(eq.pricePerWagon) || (tw>0 ? (Number(eq.quotedPrice)||0)/tw : 0);
          const sold  = Number(item.wagonSold)||0;
          acc.value += sold * price;
          acc.vus   += sold;
          return acc;
        }, { value: 0, vus: 0 });
        setFilteredSales(value);
        setFilteredVUs(vus);
      } catch (err) { console.error(err); }
    };
    run();
  }, [fromDate, toDate, enquiries]);

  /* ── exports ── */
  const exportToExcel = () => {
    if (!enquiries.length) return alert('No enquiries to export.');
    const rows = enquiries.map(e => {
      const tw = (Number(e.noOfRakes)||0)*(Number(e.wagonsPerRake)||0);
      const dl = Number(e.wagonsSoldTillDate)||0;
      const price = Number(e.pricePerWagon)||(tw>0?(Number(e.quotedPrice)||0)/tw:0);
      return {
        'Order ID': e.orderId, 'Project ID': e.projectId, 'Client Name': e.clientName,
        'Client Type': e.clientType, 'Stage': e.stage,
        'Quoted Price': Number(e.quotedPrice)||0, 'Estimated Amount': Number(e.estimatedAmount)||0,
        'Product': e.product, 'Wagon Type': e.wagonType, 'Owner': e.owner,
        'No of Rakes': e.noOfRakes, 'Wagons per Rake': e.wagonsPerRake,
        'Enquiry Date': e.enquiryDate ? new Date(e.enquiryDate).toLocaleDateString() : '',
        'Wagons Delivered': dl,
        'Current Order Value': Math.round(Math.max(tw-dl,0)*price),
        'Progress %': getProgress(e),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');
    saveAs(new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/octet-stream'}), 'Enquiry_List.xlsx');
  };

  const exportFilteredSalesToExcel = () => {
    if (!fromDate || !toDate || filteredVUs === 0) return alert('Please select a date range with confirmed sales.');
    const start = new Date(fromDate); start.setHours(0,0,0,0);
    const end   = new Date(toDate);   end.setHours(23,59,59,999);
    const rows = enquiries.flatMap(e => {
      if (e.stage !== 'Confirmed') return [];
      const tw    = (Number(e.noOfRakes)||0)*(Number(e.wagonsPerRake)||0);
      const price = Number(e.pricePerWagon)||(tw>0?(Number(e.quotedPrice)||0)/tw:0);
      return (e.dateWiseDelivery||[])
        .filter(x => { const d=new Date(x.date); d.setHours(0,0,0,0); return d>=start&&d<=end; })
        .map(x => ({
          Date: new Date(x.date).toLocaleDateString(),
          'Project ID': e.projectId, 'Wagon Type': e.wagonType||'N/A',
          'Wagons Sold': Number(x.wagonSold)||0, 'Price per Wagon': price,
          'Total Sales Value': (Number(x.wagonSold)||0)*price,
        }));
    });
    if (!rows.length) return alert('No confirmed delivery records found for this date range.');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered Sales Details');
    saveAs(new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/octet-stream'}),
      `Filtered_Sales_${fromDate.toISOString().slice(0,10)}_to_${toDate.toISOString().slice(0,10)}.xlsx`);
  };

  /* ─────────── render ─────────── */
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* ── Top Navigation Bar ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26 }}>🚆</span>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: 0.3 }}>TEMACO Sales</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>Enquiry Management System</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/production')}
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff',
            padding: '9px 22px',
            fontSize: 13,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            letterSpacing: 0.3,
            boxShadow: '0 2px 8px rgba(109,40,217,0.4)',
          }}
        >
          🏭 Production Dashboard
        </button>
      </div>

      {/* ── Page Body ── */}
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a' }}>All Enquiries</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Manage and track all sales enquiries in one place
          </p>
        </div>

        {/* ── KPI Dashboard ── */}
        <div style={{ marginBottom: 28 }}>
          <DashboardHome
            pvt={pvt} rail={rail} exportCnt={exportCnt} total={total}
            totalEnquiryValue={totalEnquiryValue}
            totalConfirmedValue={totalConfirmedValue}
            totalLostValue={totalLostValue}
            enquiryVsConfirmedPercent={enquiryVsConfirmedPercent}
            totalOrder={totalOrder} totalVUs={totalVUs}
            twrlOrder={twrlOrder}   twrlVUs={twrlVUs}
            trelOrder={trelOrder}   trelVUs={trelVUs}
          />
        </div>

        {/* ── Sales Filter Card ── */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 24,
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
        }}>
          <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🗓️</span> Date-Range Sales Filter
          </h3>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[['From', fromDate, setFromDate], ['To', toDate, setToDate]].map(([lbl, val, setter]) => (
              <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{lbl}</label>
                <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#f8fafc' }}>
                  <DatePicker
                    selected={val}
                    onChange={setter}
                    dateFormat="yyyy-MM-dd"
                    placeholderText={`Select ${lbl.toLowerCase()} date`}
                    style={{ padding: '8px 12px' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {(fromDate && toDate) && (
            <div style={{
              marginTop: 20,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 12,
            }}>
              <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Sales Value</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#059669' }}>{fmtINR(filteredSales)}</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 16px', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>VUs Sold</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#2563eb' }}>{filteredVUs}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={exportFilteredSalesToExcel}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff',
                    padding: '12px 22px',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  📥 Export Sales
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Filters + Export Row ── */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

            {/* Stage filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Stage</label>
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                style={{
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: '#1e293b',
                  background: '#fff',
                  cursor: 'pointer',
                  minWidth: 150,
                }}
              >
                <option value="">All Stages</option>
                {['Enquiry','Quoted','Confirmed','Lost','Cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Client Type filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Client Type</label>
              <select
                value={clientTypeFilter}
                onChange={e => setClientTypeFilter(e.target.value)}
                style={{
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: '#1e293b',
                  background: '#fff',
                  cursor: 'pointer',
                  minWidth: 170,
                }}
              >
                <option value="">All Client Types</option>
                {['Indian Railways','Private','Export'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Count chip */}
            <div style={{
              alignSelf: 'flex-end',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 13,
              color: '#475569',
              fontWeight: 600,
            }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          <button
            onClick={exportToExcel}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              boxShadow: '0 2px 8px rgba(5,150,105,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            📥 Export Enquiries
          </button>
        </div>

        {/* ── Table ── */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
                  {[
                    'Order ID','Project ID','Client Name','Client Type','Stage',
                    'Quoted Price','Est. Amount','Product','Wagon Type','Owner',
                    'Rakes','VUs/Rake','Date','Order in Hand','GST','Delivered','Progress','Action'
                  ].map(h => (
                    <th key={h} style={{
                      padding: '13px 14px',
                      color: '#94a3b8',
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #0f172a',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={18} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 15 }}>
                      No enquiries found
                    </td>
                  </tr>
                ) : filtered.map((e, idx) => {
                  const tw          = (Number(e.noOfRakes)||0)*(Number(e.wagonsPerRake)||0);
                  const delivered   = Number(e.wagonsSoldTillDate)||0;
                  const price       = Number(e.pricePerWagon)||(tw>0?(Number(e.quotedPrice)||0)/tw:0);
                  const pendingVal  = Math.max(tw-delivered, 0)*price;
                  const progress    = parseFloat(getProgress(e));
                  const isEven      = idx % 2 === 0;

                  return (
                    <tr
                      key={e._id}
                      style={{
                        background: isEven ? '#fff' : '#f8fafc',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={ev => ev.currentTarget.style.background = isEven ? '#fff' : '#f8fafc'}
                    >
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <Link to={`/project/${e._id}`} style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                          {e.orderId}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <Link to={`/delivery-details/${e.projectId}`} style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
                          {e.projectId || 'N/A'}
                        </Link>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {e.clientName}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <ClientBadge type={e.clientType} />
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <StageBadge stage={e.stage} />
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontWeight: 600 }}>
                        {Number(e.quotedPrice)>0 ? fmtINR(e.quotedPrice) : <span style={{color:'#94a3b8'}}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#0369a1' }}>
                        {Number(e.estimatedAmount)>0 ? fmtINR(e.estimatedAmount) : <span style={{color:'#94a3b8'}}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>{e.product}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>{e.wagonType||'—'}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: '#334155' }}>
                          {e.owner}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#475569' }}>{e.noOfRakes}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#475569' }}>{e.wagonsPerRake}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {e.enquiryDate ? new Date(e.enquiryDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#b45309' }}>
                        {e.stage==='Confirmed' ? fmtINR(Math.round(pendingVal)) : <span style={{color:'#94a3b8'}}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: '#7c3aed' }}>
                        {e.stage==='Confirmed' ? fmtINR(Number(e.gstAmount)||0) : <span style={{color:'#94a3b8'}}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                        {delivered}
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', minWidth: 120 }}>
                        <div style={{ background: '#e2e8f0', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(progress, 100)}%`,
                            background: progress >= 100 ? '#10b981' : progress >= 50 ? '#3b82f6' : '#f59e0b',
                            height: '100%',
                            borderRadius: 99,
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, textAlign: 'center' }}>{progress}%</div>
                      </td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => navigate(`/enquiry/${e._id}`)}
                          style={{
                            padding: '6px 14px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 7,
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: 12,
                            boxShadow: '0 1px 4px rgba(37,99,235,0.3)',
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32, color: '#94a3b8', fontSize: 12 }}>
          TEMACO Sales Management · {filtered.length} of {enquiries.length} enquiries shown
        </div>
      </div>
    </div>
  );
};

export default EnquiryListScreen;
