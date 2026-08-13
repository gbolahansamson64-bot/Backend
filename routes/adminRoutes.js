const express = require("express");
const router = express.Router();

const {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  forgotAdminCredential,
  verifyAdminRecoveryCode,
  resetAdminCredential,
  getAllCustomers,
  deleteCustomer,
  getAllOrders,
  deleteOrder,
  deleteSelectedOrders,
  updateOrderStatus
  
} = require("../controllers/adminController");

const { getDashboard } = require("../controllers/adminDashboardController");

const protectAdmin = require("../middleware/adminMiddleware");


// PUBLIC ROUTES

router.post("/register", registerAdmin);

router.post("/login", loginAdmin);

router.post("/logout", logoutAdmin);

router.post("/forgot-password", forgotAdminCredential);

router.post("/verify-reset-code", verifyAdminRecoveryCode);

router.post("/reset-password", resetAdminCredential);


// PROTECTED ROUTES

router.get("/me", protectAdmin, getAdminProfile);
router.get("/dashboard", protectAdmin, getDashboard);
router.get( "/customers", protectAdmin, getAllCustomers);
router.delete( "/customers/:id", protectAdmin, deleteCustomer);
router.get( "/orders", protectAdmin, getAllOrders);
router.delete( "/orders/:id", protectAdmin, deleteOrder);
router.delete( "/orders", protectAdmin, deleteSelectedOrders);
router.patch( "/orders/:id/status", protectAdmin, updateOrderStatus);

module.exports = router;