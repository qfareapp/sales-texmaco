// SalesKPIScreen.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import axios from 'axios';

const SalesKPIScreen = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/enquiries/orders');

        // Step 1: Compute delivery map from existing daily updates
        const updatesRes = await api.get('/daily-updates');
        const updates = updatesRes.data;

        const deliveredMap = {};
        updates.forEach(update => {
          const pid = update.projectId;
          if (!deliveredMap[pid]) deliveredMap[pid] = 0;
          deliveredMap[pid] += update.wagonSold || 0;
        });

        const enrichedOrders = (res.data.orders || []).map(order => {
          const totalWagons = (order.noOfRakes || 0) * (order.wagonsPerRake || 0);
          const sold = deliveredMap[order.projectId] || 0;
          const price = parseFloat(order.pricePerWagon) || 0;

          return {
            ...order,
            wagonsSoldTillDate: sold,
            totalWagons,
            currentOrderInHand: (totalWagons - sold) * price
          };
        });

        setOrders(enrichedOrders);
      } catch (err) {
        console.error('❌ Error loading KPI data:', err);
      }
    };

    fetchOrders();
  }, []);

  // Compute KPIs
  const totalOrderValue = orders.reduce((sum, order) => {
    return sum + (order.totalWagons * (parseFloat(order.pricePerWagon) || 0));
  }, 0);

  const totalVU = orders.reduce((sum, order) => {
    return sum + (order.totalWagons - order.wagonsSoldTillDate);
  }, 0);

  const twrlOrders = orders.filter(o => o.clientType === 'TWRL');
  const trelOrders = orders.filter(o => o.clientType === 'TREL');

  const twrlOrderValue = twrlOrders.reduce((sum, o) => {
    return sum + (o.totalWagons * (parseFloat(o.pricePerWagon) || 0));
  }, 0);

  const trelOrderValue = trelOrders.reduce((sum, o) => {
    return sum + (o.totalWagons * (parseFloat(o.pricePerWagon) || 0));
  }, 0);

  const twrlVU = twrlOrders.reduce((sum, o) => {
    return sum + (o.totalWagons - o.wagonsSoldTillDate);
  }, 0);

  const trelVU = trelOrders.reduce((sum, o) => {
    return sum + (o.totalWagons - o.wagonsSoldTillDate);
  }, 0);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: '30px', background: '#f4f4f4', borderRadius: '10px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '25px' }}>📊 Sales KPI Dashboard</h2>

      <div style={{ fontSize: '1.1rem', lineHeight: '2em' }}>
        <p>📦 <strong>Total Order:</strong> ₹{totalOrderValue.toLocaleString()} &nbsp;&nbsp; 🧍‍♂️ <strong>VUs:</strong> {totalVU}</p>
        <p>🏷️ <strong>TWRL Order:</strong> ₹{twrlOrderValue.toLocaleString()} &nbsp;&nbsp; 🧍‍♂️ <strong>VUs:</strong> {twrlVU}</p>
        <p>🏷️ <strong>TREL Order:</strong> ₹{trelOrderValue.toLocaleString()} &nbsp;&nbsp; 🧍‍♂️ <strong>VUs:</strong> {trelVU}</p>
      </div>
    </div>
  );
};

export default SalesKPIScreen;
