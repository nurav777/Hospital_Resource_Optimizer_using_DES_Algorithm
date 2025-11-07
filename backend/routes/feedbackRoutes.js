const express = require("express");
const {
  getPatients,
  submitFeedback,
  getFeedbacks,
  addPatient,
  getAllPatients,
} = require("../controllers/feedbackController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/patients",
  authMiddleware,
  roleMiddleware(["clinical"]),
  getPatients
);
router.post(
  "/feedback",
  authMiddleware,
  roleMiddleware(["clinical"]),
  submitFeedback
);
router.get(
  "/feedback",
  authMiddleware,
  roleMiddleware(["clinical"]),
  getFeedbacks
);
router.post(
  "/patients",
  authMiddleware,
  roleMiddleware(["clinical"]),
  addPatient
);
router.get(
  "/all-patients",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  getAllPatients
);

module.exports = router;
