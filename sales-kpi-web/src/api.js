import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.MODE === "production"
      ? "https://sales-backend-covv.onrender.com/api"
      : "http://localhost:5000/api",
});

export default api;
