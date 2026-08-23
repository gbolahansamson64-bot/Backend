const express = require("express");

const router = express.Router();

const {
  getStatistics
} = require("../controllers/adminStatisticsController");

const protectAdmin =
    require("../middleware/adminMiddleware");

router.get(
    "/",
    protectAdmin,
    getStatistics
);

module.exports = router;