const SimulationService = require("../services/SimulationService");
const DynamoDBService = require("../services/DynamoDBService");
const { info, error } = require("../utils/logger");
const Engines = require("../services/simulationEngines");

const runSimulation = async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    info("runSimulation requested", { userId });
    const simulation = await SimulationService.runSimulation(req.body, userId);
    res.status(201).json(simulation);
  } catch (error) {
    error("runSimulation failed", error);
    res.status(500).json({ message: error.message });
  }
};

const listSimulations = async (req, res) => {
  try {
    const simulations = await SimulationService.listSimulations();
    res.json(simulations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { runSimulation, listSimulations };

// Clinical user submits a simulation request (saved to DDB request table)
const submitSimulationRequest = async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    const allowedTypes = ["clinic", "or", "bed"];
    const rawType = req.body?.type || req.body?.requestType || "clinic";
    const type = String(rawType).toLowerCase();
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid request type: ${rawType}. Allowed: ${allowedTypes.join(
          ", "
        )}`,
      });
    }

    const payload = {
      requestedBy: userId,
      orgId: req.user?.orgId || null,
      name: req.body?.name || "Clinical Simulation Request",
      type,
      parameters: req.body?.parameters || req.body || {},
    };
    info("submitSimulationRequest", {
      userId,
      payload: { name: payload.name, type: payload.type },
    });
    const item = await DynamoDBService.createSimulationRequest(payload);
    res.status(201).json(item);
  } catch (error) {
    error("submitSimulationRequest failed", error);
    res.status(500).json({ message: error.message });
  }
};

// Operator fetches pending requests
const listSimulationRequests = async (req, res) => {
  try {
    const items = await DynamoDBService.listSimulationRequests({
      status: req.query.status || "pending",
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Operator processes a request using all engines, stores results, and marks best
const processSimulationRequest = async (req, res) => {
  const startTime = Date.now();
  try {
    const { requestId } = req.params;
    const operatorId = req.user?.sub || req.user?.id || req.user?._id || null;
    const { engine: engineKey, sync } = req.body || {};

    console.log(
      `\n[CONTROLLER] ========== processSimulationRequest called ==========`
    );
    console.log(`[CONTROLLER] Request ID: ${requestId}`);
    console.log(`[CONTROLLER] Operator ID: ${operatorId}`);
    console.log(
      `[CONTROLLER] Engine Key: ${engineKey || "none (will use type mapping)"}`
    );
    console.log(
      `[CONTROLLER] Sync mode: ${
        sync ? "YES (synchronous)" : "NO (asynchronous)"
      }`
    );

    info("processSimulationRequest", {
      requestId,
      operatorId,
      engineKey,
      sync,
    });

    // If sync=true in body, run synchronously and return result (legacy behavior)
    if (sync) {
      console.log(
        `[CONTROLLER] Running in SYNC mode - will wait for completion`
      );
      const result = await SimulationService.processRequest(
        requestId,
        operatorId,
        engineKey || null
      );
      const duration = Date.now() - startTime;
      console.log(`[CONTROLLER] ✓ Sync processing completed in ${duration}ms`);
      console.log(
        `[CONTROLLER] =================================================\n`
      );
      return res.json(result);
    }

    // Background processing: start async task and return 202
    console.log(
      `[CONTROLLER] Running in ASYNC mode - returning immediately, processing in background`
    );
    console.log(
      `[CONTROLLER] =================================================\n`
    );

    (async () => {
      const bgStartTime = Date.now();
      try {
        console.log(
          `[BACKGROUND] Background task started for request ${requestId}`
        );
        await SimulationService.processRequest(
          requestId,
          operatorId,
          engineKey || null
        );
        const bgDuration = Date.now() - bgStartTime;
        console.log(
          `[BACKGROUND] ✓ Background processing completed in ${bgDuration}ms for request ${requestId}`
        );
        info("background processing complete", {
          requestId,
          duration: bgDuration,
        });
      } catch (err) {
        const bgDuration = Date.now() - bgStartTime;
        console.error(
          `[BACKGROUND] ✗ Background processing FAILED after ${bgDuration}ms for request ${requestId}`
        );
        console.error(`[BACKGROUND] Error:`, err.message);
        console.error(`[BACKGROUND] Stack:`, err.stack);
        error("background processing failed", {
          requestId,
          error: err.message,
          stack: err.stack,
        });
        try {
          await DynamoDBService.updateSimulationRequestStatus(
            requestId,
            "failed",
            { error: err.message }
          );
          console.log(`[BACKGROUND] ✓ Status updated to 'failed'`);
        } catch (e) {
          console.error(
            `[BACKGROUND] ✗ Failed to update status to 'failed':`,
            e.message
          );
          error("failed to mark request as failed", e);
        }
      }
    })();

    return res.status(202).json({ message: "Processing started" });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[CONTROLLER] ✗ processSimulationRequest FAILED after ${duration}ms`
    );
    console.error(`[CONTROLLER] Error:`, error.message);
    console.error(`[CONTROLLER] Stack:`, error.stack);
    error("processSimulationRequest failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: error.message });
  }
};

// Clinical user fetches results for a request
const getResultsForRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    console.log(`[CONTROLLER] Fetching results for request: ${requestId}`);
    const items = await DynamoDBService.getResultsForRequest(requestId);
    console.log(
      `[CONTROLLER] Found ${items.length} result(s) for request ${requestId}`
    );
    res.json(items);
  } catch (error) {
    console.error(
      `[CONTROLLER] Error fetching results for ${req.params.requestId}:`,
      error.message
    );
    res.status(500).json({ message: error.message });
  }
};

// Clinical user lists own simulation requests
const listMySimulationRequests = async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id || req.user?._id || null;
    console.log(
      "[DEBUG] listMySimulationRequests - Full user object:",
      req.user
    );
    console.log("[DEBUG] listMySimulationRequests - Extracted userId:", userId);
    console.log(
      "[DEBUG] listMySimulationRequests - Status filter:",
      req.query.status
    );
    info("listMySimulationRequests", { userId, status: req.query.status });
    const items = await DynamoDBService.listSimulationRequestsByUser(userId, {
      status: req.query.status,
    });
    console.log(
      "[DEBUG] listMySimulationRequests - Found items:",
      items.length
    );
    console.log("[DEBUG] listMySimulationRequests - Items:", items);
    res.json(items);
  } catch (error) {
    error("listMySimulationRequests failed", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  runSimulation,
  listSimulations,
  submitSimulationRequest,
  listSimulationRequests,
  processSimulationRequest,
  getResultsForRequest,
  listMySimulationRequests,
};
