const Simulation = require("../models/Simulation");
const AuditLog = require("../models/AuditLog");
const { log, info, error } = require("../utils/logger");
const DynamoDBService = require("./DynamoDBService");

// Clear engine cache to ensure latest code is used
delete require.cache[require.resolve("./simulationEngines")];
delete require.cache[require.resolve("./simulationEngines/queueingEngine")];
delete require.cache[
  require.resolve("./simulationEngines/priorityBedAllocator")
];
delete require.cache[require.resolve("./simulationEngines/orSchedulingEngine")];

const Engines = require("./simulationEngines");
const priorityMap = { high: 3, medium: 2, low: 1 };
const typeResourceMap = {
  emergency: { beds: 1, doctors: 2, nurses: 2, treatMean: 75 },
  surgery: { beds: 1, doctors: 1, nurses: 2, treatMean: 90 },
  routine: { beds: 1, doctors: 1, nurses: 1, treatMean: 30 },
  postop: { beds: 1, doctors: 1, nurses: 1, treatMean: 60 },
};

const { v4: uuidv4 } = require("uuid");

const getRandomExponential = (rate) => -Math.log(1 - Math.random()) / rate;

class SimulationService {
  async runSimulation(parameters, userId) {
    // This method directly runs a simulation based on provided parameters (legacy entrypoint)
    const engineKey = parameters.engine || "engineA";
    const engine = Engines.getEngine(engineKey);
    const result = engine.simulate(parameters);
    await DynamoDBService.createSimulation({
      userId,
      name: parameters.name || `Ad-hoc Simulation (${engineKey})`,
      description: "Ad-hoc run from operator",
      status: "completed",
      parameters,
      results: result.summary,
    });
    return result.summary;
  }

  async processRequest(requestId, operatorId, engineKey = null) {
    console.log(
      `\n[SIMULATION] ========== Starting simulation process ==========`
    );
    console.log(`[SIMULATION] Request ID: ${requestId}`);
    console.log(`[SIMULATION] Operator ID: ${operatorId}`);
    console.log(
      `[SIMULATION] Engine Key (if specified): ${engineKey || "none"}`
    );
    console.log(`[SIMULATION] Stage 1/7: Fetching request from database...`);

    // Fetch request from DynamoDB, run three engines, choose best, write results
    const request = await DynamoDBService.getSimulationRequestById(requestId);
    if (!request) {
      console.error(
        `[SIMULATION] ERROR: Request ${requestId} not found in database`
      );
      throw new Error("Simulation request not found");
    }
    console.log(
      `[SIMULATION] ✓ Request found: ${request.name} (type: ${request.type})`
    );
    console.log(`[SIMULATION] Current status: ${request.status || "unknown"}`);
    console.log(
      `[SIMULATION] Parameters:`,
      JSON.stringify(request.parameters || {}, null, 2)
    );

    console.log(`[SIMULATION] Stage 2/7: Updating status to 'processing'...`);
    await DynamoDBService.updateSimulationRequestStatus(
      requestId,
      "processing",
      { operatorId }
    );
    console.log(`[SIMULATION] ✓ Status updated to 'processing'`);

    const parameters = request.parameters || {};
    // Map request types to engines (clinic -> queueing engine, bed -> priority bed allocator, or -> OR scheduling)
    const typeToEngineKey = {
      clinic: "engineA",
      bed: "engineB",
      or: "engineC",
      emergency: "engineA",
      routine: "engineA",
      surgery: "engineC",
    };

    console.log(`[SIMULATION] Stage 3/7: Selecting engines to run...`);
    let engines = [];
    if (engineKey) {
      engines = [{ key: engineKey, name: engineKey }];
      console.log(`[SIMULATION] Using specified engine: ${engineKey}`);
    } else if (request.type && typeToEngineKey[request.type]) {
      const key = typeToEngineKey[request.type];
      engines = [{ key, name: key }];
      console.log(
        `[SIMULATION] Using engine mapped from request type '${request.type}': ${key}`
      );
    } else {
      engines = Engines.listEngines();
      console.log(
        `[SIMULATION] Using all available engines: ${engines
          .map((e) => e.key)
          .join(", ")}`
      );
    }
    console.log(`[SIMULATION] ✓ Will run ${engines.length} engine(s)`);

    console.log(`[SIMULATION] Stage 4/7: Running engines...`);
    const results = [];
    for (let i = 0; i < engines.length; i++) {
      const { key, name } = engines[i];
      console.log(
        `[SIMULATION]   [${i + 1}/${engines.length}] Running ${key}...`
      );
      try {
        const engineImpl = Engines.getEngine(key);
        if (!engineImpl || !engineImpl.simulate) {
          throw new Error(`Engine ${key} not found or invalid`);
        }
        console.log(
          `[SIMULATION]   [${key}] Parameters:`,
          JSON.stringify(parameters, null, 2)
        );

        const outcome = engineImpl.simulate(parameters);
        console.log(`[SIMULATION]   [${key}] ✓ Simulation complete`);
        console.log(`[SIMULATION]   [${key}] Results:`, {
          avgWaitMinutes: outcome.summary?.avgWaitMinutes,
          overallUtilizationPct: outcome.summary?.overallUtilizationPct,
          patientsServed: outcome.summary?.patientsServed,
        });

        results.push({ key, name, outcome });

        console.log(`[SIMULATION]   [${key}] Writing result to database...`);
        await DynamoDBService.writeSimulationResult(
          requestId,
          key,
          outcome.summary,
          { ...outcome.details, operatorId }
        );
        console.log(`[SIMULATION]   [${key}] ✓ Result written to database`);
      } catch (err) {
        console.error(`[SIMULATION]   [${key}] ✗ FAILED:`, err.message);
        console.error(`[SIMULATION]   [${key}] Error stack:`, err.stack);
        error(`Engine ${key} failed:`, err);
      }
    }

    console.log(`[SIMULATION] Stage 5/7: Validating results...`);
    console.log(`[SIMULATION] Total results produced: ${results.length}`);
    if (!results.length) {
      console.error(`[SIMULATION] ERROR: No engines produced results`);
      await DynamoDBService.updateSimulationRequestStatus(requestId, "failed", {
        error: "No engines produced results",
      });
      throw new Error("No engines produced results");
    }

    console.log(`[SIMULATION] Stage 6/7: Selecting best result...`);
    // Select best by minimal avgWaitMinutes; tie-breaker highest utilization
    results.sort((a, b) => {
      const awA = a.outcome.summary.avgWaitMinutes ?? Infinity;
      const awB = b.outcome.summary.avgWaitMinutes ?? Infinity;
      if (awA !== awB) return awA - awB;
      const utilA = a.outcome.summary.overallUtilizationPct ?? 0;
      const utilB = b.outcome.summary.overallUtilizationPct ?? 0;
      return utilB - utilA;
    });
    const best = results[0];
    console.log(`[SIMULATION] ✓ Best engine selected: ${best.key}`);
    console.log(`[SIMULATION] Best result:`, {
      engine: best.key,
      avgWaitMinutes: best.outcome.summary.avgWaitMinutes,
      overallUtilizationPct: best.outcome.summary.overallUtilizationPct,
      patientsServed: best.outcome.summary.patientsServed,
    });

    // Decrement medicine stock based on the request type and patients served
    try {
      const medMap = {
        clinic: "paracetamol",
        or: "atropine",
        bed: "tramadol",
        emergency: "paracetamol",
        routine: "paracetamol",
        surgery: "atropine",
      };
      const medName = medMap[request.type];
      const patientsServed = Math.max(
        1,
        Number(best.outcome.summary?.patientsServed || 1)
      );

      console.log(`[SIMULATION] Request type: ${request.type}`);
      console.log(`[SIMULATION] Medicine mapping: ${medName}`);
      console.log(`[SIMULATION] Patients served: ${patientsServed}`);

      if (medName) {
        console.log(
          `[SIMULATION] About to decrement medicine '${medName}' by ${patientsServed}`
        );

        // Check current stock before decrementing
        const currentStock = await DynamoDBService.getMedicine(medName);
        console.log(
          `[SIMULATION] Current stock before decrement:`,
          currentStock
        );

        const updated = await DynamoDBService.decrementMedicine(
          medName,
          patientsServed
        );

        console.log(`[SIMULATION] Updated medicine result:`, updated);
        console.log(
          `[SIMULATION] Medicine '${medName}' new stock: ${updated.stock}`
        );
        // If stock below threshold, create a reorder if none pending
        const threshold = 20;
        if (Number(updated.stock) < threshold) {
          console.log(
            `[SIMULATION] Stock below threshold (${threshold}) for ${medName}, checking reorders...`
          );
          const pending = await DynamoDBService.listMedicineReorders({
            status: "pending",
          });
          const exists = (pending || []).some((r) => r.medName === medName);
          if (!exists) {
            console.log(
              `[SIMULATION] Creating reorder for ${medName} suggestedAmount=100`
            );
            await DynamoDBService.createMedicineReorder(
              medName,
              100,
              operatorId || request.requestedBy || "system"
            );
          } else {
            console.log(
              `[SIMULATION] A pending reorder already exists for ${medName}`
            );
          }
        }
      }
    } catch (err) {
      console.error(
        "[SIMULATION] Warning: failed to decrement medicine or create reorder",
        err.message
      );
    }

    console.log(
      `[SIMULATION] Stage 7/7: Updating request status to 'completed'...`
    );
    // Mark as completed (per workflow)
    await DynamoDBService.updateSimulationRequestStatus(
      requestId,
      "completed",
      {
        bestEngine: best.key,
        avgWaitMinutes: best.outcome.summary.avgWaitMinutes,
        overallUtilizationPct: best.outcome.summary.overallUtilizationPct,
        operatorId,
      }
    );
    console.log(`[SIMULATION] ✓ Status updated to 'completed'`);
    console.log(
      `[SIMULATION] ========== Simulation process COMPLETE ==========\n`
    );

    return {
      requestId,
      bestEngine: best.key,
      summary: best.outcome.summary,
    };
  }

  async listSimulations() {
    return await Simulation.find()
      .populate("createdBy", "email role")
      .sort({ createdAt: -1 });
  }
}

module.exports = new SimulationService();
