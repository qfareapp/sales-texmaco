// src/api/salesProd.js
import api from "../api";

/* 🔹 Fetch full analytics (KPI + monthly + quarterly) */
export const getSalesAnalytics = (fy, compareFy) =>
  api.get(`/sales/production/analytics?fy=${fy}&compareFy=${compareFy}`);

/* 🔹 Add or update a Plan record */
export const addSalesPlan = (data) =>
  api.post("/sales/production/plan", data);

/* 🔹 Add or update an Achievement record */
export const addSalesAchievement = (data) =>
  api.post("/sales/production/achievement", data);
