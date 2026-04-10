const express = require("express");
const flightController = require("../controllers/flightController");

const router = express.Router();

// POST /api/flights/search (with JSON body)
router.post("/search", (req, res) => flightController.searchFlights(req, res));

module.exports = router;
