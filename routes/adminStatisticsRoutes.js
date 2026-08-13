const express = require("express");

const router = express.Router();

const {
  getStatistics
} = require("../controllers/adminStatisticsController");

router.get("/", getStatistics);

module.exports = router;