const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Backend is running" });
});

// Basic test endpoint
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "Flight Booking System Backend API" });
});

// Test routes for error handling
app.get("/api/error/sync", (req, res) => {
  throw new Error("Synchronous error test");
});

app.get("/api/error/async", async (req, res, next) => {
  try {
    throw new Error("Asynchronous error test");
  } catch (error) {
    next(error);
  }
});

app.get("/api/error/next", (req, res, next) => {
  const error = new Error("Error passed to next()");
  next(error);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Internal Server Error", message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
