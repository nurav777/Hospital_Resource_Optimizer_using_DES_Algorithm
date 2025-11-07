const express = require("express");
const {
  runSimulation,
  listSimulations,
  submitSimulationRequest,
  listSimulationRequests,
  processSimulationRequest,
  getResultsForRequest,
  listMySimulationRequests,
} = require("../controllers/simulationController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  runSimulation
);
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  listSimulations
);

// List available engines
router.get(
  "/engines",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  (req, res) => {
    try {
      const Engines = require("../services/simulationEngines");
      return res.json(Engines.listEngines());
    } catch (err) {
      console.error("Failed to list engines", err);
      return res.status(500).json({ message: "Failed to list engines" });
    }
  }
);

// Clinical -> submit request
router.post(
  "/request",
  authMiddleware,
  roleMiddleware(["clinical", "admin"]),
  submitSimulationRequest
);
// Clinical -> list own requests
router.get(
  "/my-requests",
  authMiddleware,
  roleMiddleware(["clinical", "admin"]),
  listMySimulationRequests
);
// Operator -> list requests (optionally ?status=pending|processing|completed)
router.get(
  "/requests",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  listSimulationRequests
);
// Operator -> process a specific request
router.post(
  "/process/:requestId",
  authMiddleware,
  roleMiddleware(["operator", "admin"]),
  processSimulationRequest
);
// Clinical -> get results for request
router.get(
  "/results/:requestId",
  authMiddleware,
  roleMiddleware(["clinical", "operator", "admin"]),
  getResultsForRequest
);

module.exports = router;
