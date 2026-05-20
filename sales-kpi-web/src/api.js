import axios from "axios";
import { API_ROOT } from "./config/apiBase";

const api = axios.create({
  baseURL: API_ROOT,
});

export default api;
