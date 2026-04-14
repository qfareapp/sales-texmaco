import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DatePicker from 'react-datepicker';
import DashboardHome from '../screens/DashboardHome'; // ← adjust if your file lives elsewhere
import api from '../api';
import 'react-datepicker/dist/react-datepicker.css';

const EnquiryListScreen = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stageFilter, setStageFilter] = useState('');
  const [clientTypeFilter, setClientTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [filteredSales, setFilteredSales] = useState(0);
  const [filteredVUs, setFilteredVUs] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [enquiryRes, updatesRes, ordersRes] = await Promise.all([
          api.get('/enquiries'),
          api.get('/daily-updates'),
          api.get('/enquiries/orders')
        ]);

        const enquiriesData = enquiryRes.data || [];
        const updatesData = updatesRes.data || [];
        const ordersData = (ordersRes.data && ordersRes.data.orders) || [];

        // Build delivered and date-wise maps
        const deliveredMap = {};
        const dateWiseMap = {};
        updatesData.forEach(({ projectId, date, wagonSold }) => {
          const sold = Number(wagonSold) || 0;
          deliveredMap[projectId] = (deliveredMap[projectId] || 0) + sold;
          (dateWiseMap[projectId] ||= []).push({ date, wagonSold: sold });
        });

        // Enrich enquiries
        const enrichedEnquiries = enquiriesData.map(e => ({
          ...e,
          wagonsSoldTillDate: deliveredMap[e.projectId] || 0,
          dateWiseDelivery: dateWiseMap[e.projectId] || []
        }));

        // Enrich orders (compute pending + order value)
        const enrichedOrders = ordersData.map(o => {
          const totalWagons = (Number(o.noOfRakes) || 0) * (Number(o.wagonsPerRake) || 0);
          const sold = deliveredMap[o.projectId] || 0;
          const pending = Math.max(totalWagons - sold, 0);
          const price = Number(o.pricePerWagon) || 0;
          const currentOrderInHand = pending * price;
          return {
            ...o,
            totalWagons,
            wagonsSoldTillDate: sold,
            pending,
            currentOrderInHand // keep numeric
          };
        });

        setEnquiries(enrichedEnquiries);
        setOrders(enrichedOrders);
      } catch (err) {
        console.error('❌ Error fetching KPI data:', err);
      }
    };

    fetchData();
  }, []);

  // KPI calculations
  const total = enquiries.length || 1;
  const pvt = enquiries.filter(e => e.clientType === 'Private').length;
  const rail = enquiries.filter(e => e.clientType === 'Indian Railways').length;
  const exportCnt = enquiries.filter(e => e.clientType === 'Export').length;

  const totalEnquiryValue = enquiries
    .filter(e => e.stage === 'Enquiry')
    .reduce((sum, e) => sum + (Number(e.estimatedAmount) || 0), 0);

  const totalConfirmedValue = enquiries
    .filter(e => e.stage === 'Confirmed')
    .reduce((sum, e) => sum + (Number(e.quotedPrice) || 0), 0);

  const totalLostValue = enquiries
    .filter(e => e.stage === 'Lost')
    .reduce((sum, e) => sum + (Number(e.quotedPrice) || 0), 0);

  const confirmed = enquiries.filter(e => e.stage === 'Confirmed').length;
  const enquiryVsConfirmedPercent = ((confirmed / total) * 100).toFixed(1);

  // Aggregation from orders (uses computed pending)
  const totalOrder = orders.reduce((sum, o) => sum + (Number(o.currentOrderInHand) || 0), 0);
  const totalVUs = orders.reduce((sum, o) => sum + (Number(o.pending) || 0), 0);

  const twrlOrders = orders.filter(o => (o.owner || '').toUpperCase() === 'TWRL');
  const twrlOrder = twrlOrders.reduce((sum, o) => sum + (Number(o.currentOrderInHand) || 0), 0);
  const twrlVUs = twrlOrders.reduce((sum, o) => sum + (Number(o.pending) || 0), 0);

  const trelOrders = orders.filter(o => (o.owner || '').toUpperCase() === 'TREL');
  const trelOrder = trelOrders.reduce((sum, o) => sum + (Number(o.currentOrderInHand) || 0), 0);
  const trelVUs = trelOrders.reduce((sum, o) => sum + (Number(o.pending) || 0), 0);

  // Filters
  const filtered = enquiries.filter(enquiry =>
    (stageFilter === '' || enquiry.stage === stageFilter) &&
    (clientTypeFilter === '' || enquiry.clientType === clientTypeFilter)
  );

  const getProgress = (e) => {
    const totalWagons = (Number(e.noOfRakes) || 0) * (Number(e.wagonsPerRake) || 0);
    const delivered = Number(e.wagonsSoldTillDate) || 0;
    return totalWagons > 0 ? ((delivered / totalWagons) * 100).toFixed(1) : '0.0';
    };

  // Date-range sales calc (confirmed only)
  useEffect(() => {
    const run = async () => {
      if (!fromDate || !toDate) return;
      try {
        const res = await api.get('/daily-updates');
        const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
        const end = new Date(toDate); end.setHours(23, 59, 59, 999);

        const within = res.data.filter(u => {
          const d = new Date(u.date);
          d.setHours(0, 0, 0, 0);
          return d >= start && d <= end;
        });

        const { value, vus } = within.reduce((acc, item) => {
          const enquiry = enquiries.find(e => String(e.projectId) === String(item.projectId) && e.stage === 'Confirmed');
          if (!enquiry) return acc;

          const totalWagons = (Number(enquiry.noOfRakes) || 0) * (Number(enquiry.wagonsPerRake) || 0);
          const derivedPrice = totalWagons > 0 ? (Number(enquiry.quotedPrice) || 0) / totalWagons : 0;
          const pricePerWagon = Number(enquiry.pricePerWagon) || derivedPrice;
          const sold = Number(item.wagonSold) || 0;

          acc.value += sold * pricePerWagon;
          acc.vus += sold;
          return acc;
        }, { value: 0, vus: 0 });

        setFilteredSales(value);
        setFilteredVUs(vus);
      } catch (err) {
        console.error('Error fetching filtered sales:', err);
      }
    };
    run();
  }, [fromDate, toDate, enquiries]);

  // Export: Enquiry list
  const exportToExcel = () => {
    if (!enquiries.length) return alert('No enquiries to export.');
    const rows = enquiries.map(e => {
      const totalWagons = (Number(e.noOfRakes) || 0) * (Number(e.wagonsPerRake) || 0);
      const delivered = Number(e.wagonsSoldTillDate) || 0;
      const derivedPrice = totalWagons > 0 ? (Number(e.quotedPrice) || 0) / totalWagons : 0;
      const pricePerWagon = Number(e.pricePerWagon) || derivedPrice;
      const pendingValue = Math.max(totalWagons - delivered, 0) * pricePerWagon;

      return {
        'Order ID': e.orderId,
        'Project ID': e.projectId,
        'Client Name': e.clientName,
        'Client Type': e.clientType,
        'Stage': e.stage,
        'Quoted Price': Number(e.quotedPrice) || 0,
        'Estimated Amount': Number(e.estimatedAmount) || 0,
        'Product': e.product,
        'Wagon Type': e.wagonType,
        'Owner': e.owner,
        'No of Rakes': e.noOfRakes,
        'Wagons per Rake': e.wagonsPerRake,
        'Enquiry Date': e.enquiryDate ? new Date(e.enquiryDate).toLocaleDateString() : '',
        'Wagons Delivered': delivered,
        'Current Order Value': Math.round(pendingValue),
        'Progress %': getProgress(e)
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enquiries');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'Enquiry_List.xlsx');
  };

  // Export: Filtered sales
  const exportFilteredSalesToExcel = () => {
    if (!fromDate || !toDate || filteredVUs === 0) {
      return alert('Please select a date range with confirmed sales.');
    }
    const start = new Date(fromDate); start.setHours(0, 0, 0, 0);
    const end = new Date(toDate); end.setHours(23, 59, 59, 999);

    const rows = enquiries.flatMap(e => {
      if (e.stage !== 'Confirmed') return [];
      const totalWagons = (Number(e.noOfRakes) || 0) * (Number(e.wagonsPerRake) || 0);
      const derivedPrice = totalWagons > 0 ? (Number(e.quotedPrice) || 0) / totalWagons : 0;
      const price = Number(e.pricePerWagon) || derivedPrice;

      return (e.dateWiseDelivery || [])
        .filter(x => {
          const d = new Date(x.date); d.setHours(0, 0, 0, 0);
          return d >= start && d <= end;
        })
        .map(x => ({
          Date: new Date(x.date).toLocaleDateString(),
          'Project ID': e.projectId,
          'Wagon Type': e.wagonType || 'N/A',
          'Wagons Sold': Number(x.wagonSold) || 0,
          'Price per Wagon': price,
          'Total Sales Value': (Number(x.wagonSold) || 0) * price
        }));
    });

    if (!rows.length) return alert('No confirmed delivery records found for this date range.');

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Filtered Sales Details');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const fn = `Filtered_Sales_${fromDate.toISOString().slice(0,10)}_to_${toDate.toISOString().slice(0,10)}.xlsx`;
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), fn);
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Navigation */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <button
          onClick={() => navigate('/production')}
          style={{ backgroundColor: '#6f42c1', color: '#fff', padding: '10px 20px', fontSize: '1rem', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          🏭 Go to Production Dashboard
        </button>
      </div>

     {/*<Link to="/sales-kpi">
        <button style={{ margin: 10, padding: 10 }}>View Sales KPIs</button>
      </Link>*/}

      <h2>All Enquiries</h2>

      {/* KPI Dashboard (reusable) */}
      <DashboardHome
        pvt={pvt}
        rail={rail}
        exportCnt={exportCnt}
        total={total}
        totalEnquiryValue={totalEnquiryValue}
        totalConfirmedValue={totalConfirmedValue}
        totalLostValue={totalLostValue}
        enquiryVsConfirmedPercent={enquiryVsConfirmedPercent}
        totalOrder={totalOrder}
        totalVUs={totalVUs}
        twrlOrder={twrlOrder}
        twrlVUs={twrlVUs}
        trelOrder={trelOrder}
        trelVUs={trelVUs}
      />

      {/* 🗓️ Total Sales Filter */}
      <div style={{ marginTop: 25, borderTop: '1px solid #eee', paddingTop: 20 }}>
        <h4 style={{ color: '#444', marginBottom: 10 }}>🗓️ Total Sales Filter</h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label><strong>From:</strong></label>
          <DatePicker selected={fromDate} onChange={setFromDate} dateFormat="yyyy-MM-dd" placeholderText="Start Date" />
          <label><strong>To:</strong></label>
          <DatePicker selected={toDate} onChange={setToDate} dateFormat="yyyy-MM-dd" placeholderText="End Date" />
        </div>
        <div style={{ marginTop: 12, fontSize: '1rem', color: '#333' }}>
          <p>💰 <strong>Total Sales Value:</strong> ₹{filteredSales.toLocaleString()}</p>
          <p>📦 <strong>Total VUs Sold:</strong> {filteredVUs}</p>
          <button onClick={exportFilteredSalesToExcel} style={{ marginTop: 10, backgroundColor: '#007bff', color: '#fff', padding: '8px 14px', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            📥 Export to Excel
          </button>
        </div>
      </div>

      {/* Export button */}
      <div style={{ margin: '20px 0', textAlign: 'right' }}>
        <button onClick={exportToExcel} style={{ backgroundColor: '#28a745', color: '#fff', padding: '10px 16px', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
          📥 Export Enquiries to Excel
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 15 }}>
        <div>
          <label>Filter by Stage: </label>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
            <option value="">All</option>
            <option value="Enquiry">Enquiry</option>
            <option value="Quoted">Quoted</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Lost">Lost</option>
          </select>
        </div>
        <div>
          <label>Filter by Client Type: </label>
          <select value={clientTypeFilter} onChange={e => setClientTypeFilter(e.target.value)}>
            <option value="">All</option>
            <option value="Indian Railways">Indian Railways</option>
            <option value="Private">Private</option>
            <option value="Export">Export</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: 0, maxWidth: '100%' }}>
        <div style={{ width: '100%', overflow: 'scroll', padding: 0 }}>
          <table border="1" cellPadding="10" cellSpacing="0">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Project ID</th>
                <th>Client Name</th>
                <th>Client Type</th>
                <th>Stage</th>
                <th>Quoted Price</th>
                <th>Estimated Amount</th>
                <th>Product</th>
                <th>Wagon Type</th>
                <th>Owner</th>
                <th>No of Rakes</th>
                <th>Wagons per Rake</th>
                <th>Date</th>
                <th><strong>📦 Current Order in Hand</strong></th>
                <th>GST Amount</th>
                <th>Delivered</th>
                <th>Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const totalWagons = (Number(e.noOfRakes) || 0) * (Number(e.wagonsPerRake) || 0);
                const delivered = Number(e.wagonsSoldTillDate) || 0;
                const derivedPrice = totalWagons > 0 ? (Number(e.quotedPrice) || 0) / totalWagons : 0;
                const pricePerWagon = Number(e.pricePerWagon) || derivedPrice;
                const pendingValue = Math.max(totalWagons - delivered, 0) * pricePerWagon;

                return (
                  <tr key={e._id}>
                    <td>
                      <Link to={`/project/${e._id}`} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
                        {e.orderId}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/delivery-details/${e.projectId}`} style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
                        {e.projectId || 'N/A'}
                      </Link>
                    </td>
                    <td>{e.clientName}</td>
                    <td>{e.clientType || 'N/A'}</td>
                    <td>{e.stage}</td>
                    <td>{Number(e.quotedPrice) > 0 ? `₹${Number(e.quotedPrice).toLocaleString()}` : 'N/A'}</td>
                    <td>{Number(e.estimatedAmount) > 0 ? `₹${Number(e.estimatedAmount).toLocaleString()}` : 'N/A'}</td>
                    <td>{e.product}</td>
                    <td>{e.wagonType || 'N/A'}</td>
                    <td>{e.owner}</td>
                    <td>{e.noOfRakes}</td>
                    <td>{e.wagonsPerRake}</td>
                    <td>{e.enquiryDate ? new Date(e.enquiryDate).toLocaleDateString() : 'N/A'}</td>
                    <td>{e.stage === 'Confirmed' ? `₹${Math.round(pendingValue).toLocaleString()}` : 'N/A'}</td>
                    <td>{e.stage === 'Confirmed' ? `₹${(Number(e.gstAmount) || 0).toLocaleString()}` : '-'}</td>
                    <td>{delivered}</td>
                    <td>
                      <div style={{ width: '100%', background: '#eee', borderRadius: 4 }}>
                        <div
                          style={{
                            width: `${getProgress(e)}%`,
                            background: '#4caf50',
                            padding: '4px 0',
                            borderRadius: 4,
                            textAlign: 'center',
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          {getProgress(e)}%
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/enquiry/${e._id}`)}
                        style={{ padding: '6px 12px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EnquiryListScreen;
