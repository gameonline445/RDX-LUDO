import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err?.response?.data?.detail || err?.message || "Something went wrong";
    return Promise.reject(new Error(msg));
  }
);

export const wsUrl = (battleId) => {
  const base = BACKEND_URL.replace(/^http/, "ws");
  const token = localStorage.getItem("token");
  return `${base}/api/ws/battle/${battleId}?token=${encodeURIComponent(token || "")}`;
};
