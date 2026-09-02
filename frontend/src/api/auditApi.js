import axios from "axios";

// A single axios instance for the audit API. In dev, Vite proxies /api to the
// backend (see vite.config.js). In production serve /api from the same origin.
const api = axios.create({
  baseURL: "/api/audit",
  timeout: 120000, // audits may take a while (puppeteer + retries)
});

export const listJobs = async () => {
  const { data } = await api.get("/");
  return data;
};

export const createBatch = async (urls) => {
  const { data } = await api.post("/", { urls });
  return data;
};

export const getJobDetails = async (jobId) => {
  const { data } = await api.get(`/${jobId}`);
  return data;
};

export const getJobSummary = async (jobId) => {
  const { data } = await api.get(`/summary/${jobId}`);
  return data;
};

export const getJobQueueStatus = async (jobId) => {
  const { data } = await api.get(`/status/${jobId}`);
  return data;
};

export const deleteJob = async (jobId) => {
  const { data } = await api.delete(`/jobs/${jobId}`);
  return data;
};

export default api;
