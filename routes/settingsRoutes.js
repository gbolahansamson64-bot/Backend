const express = require("express");

const router = express.Router();

const {
  getStoreSettings,
  updateStoreSettings
} = require("../controllers/settingsController");

const protectAdmin = require("../middleware/adminMiddleware");

router.get("/", protectAdmin, getStoreSettings);

router.put("/", protectAdmin, updateStoreSettings);

module.exports = router;