const express = require("express");
const {
  getReports,
  getAuditLogs,
  exportAuditLogs,
} = require("../controllers/reportController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/reports", authMiddleware, roleMiddleware(["viewer"]), getReports);
router.get(
  "/audit/logs",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAuditLogs
);
router.get(
  "/audit/logs/export",
  authMiddleware,
  roleMiddleware(["admin"]),
  exportAuditLogs
);

module.exports = router;
