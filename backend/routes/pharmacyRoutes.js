const express = require("express");
const router = express.Router();
const PharmacyController = require("../controllers/pharmacyController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Initialize default medicines (dev/demo) - allow only admin/operator
router.post(
  "/init",
  authMiddleware,
  roleMiddleware(["admin", "operator"]),
  (req, res) => PharmacyController.initStocks(req, res)
);

// List medicines - any authenticated user
router.get("/medicines", authMiddleware, (req, res) =>
  PharmacyController.listMedicines(req, res)
);

// List reorders - operator/admin
router.get(
  "/reorders",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  (req, res) => PharmacyController.listReorders(req, res)
);
// Pharmacist creates a reorder request
router.post(
  "/reorders",
  authMiddleware,
  roleMiddleware(["pharmacist"]),
  (req, res) => PharmacyController.createReorder(req, res)
);

// Approve a reorder (operator action) - operator only
router.post(
  "/reorders/:reorderId/approve",
  authMiddleware,
  roleMiddleware(["operator"]),
  (req, res) => PharmacyController.approveReorder(req, res)
);

module.exports = router;
