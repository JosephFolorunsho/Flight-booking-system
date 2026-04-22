import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const searchFlights = async (params) => {
  const response = await api.post("/api/flights/search", params);
  return response.data;
};

export const searchRoutes = async (params) => {
  const response = await api.post("/api/routes/search", params);
  console.log("response", response);
  return response.data;
};

export const createBooking = async (bookingData) => {
  const response = await api.post("/api/bookings", bookingData);
  return response.data;
};

export const getBooking = async (bookingId) => {
  const response = await api.get(`/api/bookings/${bookingId}`);
  return response.data;
};

export default api;
