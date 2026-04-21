const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

router.post("/", bookingController.createBooking.bind(bookingController));
router.get("/:reference", bookingController.getBooking.bind(bookingController));
router.get(
  "/:reference/payments",
  bookingController.getPaymentAttempts.bind(bookingController),
);

module.exports = router;
