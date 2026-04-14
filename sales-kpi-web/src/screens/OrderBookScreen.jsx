import React, { useEffect, useState } from 'react';
import api from '../api';
import axios from 'axios';

const OrderBookScreen = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrderBook = async () => {
      try {
        const res = await api.get('/enquiries/orders');
        setOrders(res.data);
      } catch (err) {
        console.error('Error fetching order book:', err);
      }
    };
    fetchOrderBook();
  }, []);

  return (
    <div>
      <h2>📘 Order Book</h2>
      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Confirmed Date</th>
            <th>Project ID</th>
            <th>Client Type</th>
            <th>Client Name</th>
            <th>Wagon Type</th>
            <th>Total Wagons</th>
            <th>Total Wagon Value</th>
            <th>Delivery Start</th>
            <th>Delivery End</th>
            <th>Wagon Sold</th>
            <th>Pending Wagon</th>
            <th>Value in Hand</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, idx) => (
            <tr key={idx}>
              <td>{new Date(o.confirmedDate).toLocaleDateString()}</td>
              <td>{o.projectId}</td>
              <td>{o.clientType}</td>
              <td>{o.clientName}</td>
              <td>{o.wagonType}</td>
              <td>{o.totalWagons}</td>
              <td>₹{o.totalValue.toFixed(2)}</td>
              <td>{o.deliveryStart}</td>
              <td>{o.deliveryEnd}</td>
              <td>{o.wagonsSold}</td>
              <td>{o.pendingWagons}</td>
              <td>₹{o.valueInHand.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderBookScreen;
