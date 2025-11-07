const AWS = require("aws-sdk");
const { error, info } = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

class DynamoDBService {
  constructor() {
    this.tableName = process.env.DYNAMODB_TABLE_NAME || "ops-care-dash";
    this.requestTableName =
      process.env.DYNAMODB_SIM_REQUEST_TABLE ||
      process.env.DYNAMODB_TABLE_SIM_REQUESTS ||
      "ops-care-sim-requests";
    this.resultTableName =
      process.env.DYNAMODB_SIM_RESULT_TABLE ||
      process.env.DYNAMODB_TABLE_SIM_RESULTS ||
      "ops-care-sim-results";
    this.pharmacyTableName =
      process.env.DYNAMODB_PHARMACY_TABLE || "ops-care-pharmacy";
  }

  async createAuditLog(auditData) {
    try {
      info(`Creating audit log: ${auditData.action} by ${auditData.userId}`);
      const params = {
        TableName: this.tableName,
        Item: {
          PK: `AUDIT#${Date.now()}`,
          SK: `LOG#${auditData.userId}`,
          timestamp: new Date().toISOString(),
          userId: auditData.userId,
          action: auditData.action,
          resource: auditData.resource || "N/A",
          status: auditData.status || "success",
          ip: auditData.ip || "N/A",
          details: auditData.details || "N/A",
          TTL: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year TTL
        },
      };

      await dynamodb.put(params).promise();
      info("Audit log created successfully");
      return params.Item;
    } catch (err) {
      error("Error creating audit log", err);
      throw new Error(`Failed to create audit log: ${err.message}`);
    }
  }

  // Simulation Requests (Clinical -> Operator)
  async createSimulationRequest(requestData) {
    try {
      const id = uuidv4();
      const params = {
        TableName: this.requestTableName,
        Item: {
          PK: `SIMREQ#${id}`,
          SK: `REQ#${requestData.orgId || "ORG"}`,
          id,
          status: "pending",
          timestamp: new Date().toISOString(),
          requestedBy: requestData.requestedBy,
          orgId: requestData.orgId || null,
          name: requestData.name || "Clinical Simulation Request",
          type: requestData.type || "clinic",
          parameters: requestData.parameters || {},
          TTL: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        },
      };
      await dynamodb.put(params).promise();
      // Audit: request created
      try {
        await this.createAuditLog({
          userId: requestData.requestedBy || "unknown",
          action: "SIMULATION_REQUEST_CREATED",
          resource: `SimulationRequest:${id}`,
          status: "success",
          details: `Type=${params.Item.type}`,
        });
      } catch (_) {}
      return params.Item;
    } catch (err) {
      error("Error creating simulation request", err);
      throw new Error(`Failed to create simulation request: ${err.message}`);
    }
  }

  async listSimulationRequests(filter = { status: "pending" }) {
    try {
      let filterExpr = "begins_with(PK, :pk)";
      const exprNames = {};
      const exprVals = { ":pk": "SIMREQ#" };

      if (filter.status) {
        // Allow comma-separated list
        const statuses = String(filter.status)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (statuses.length === 1) {
          filterExpr += " AND #status = :status0";
          exprNames["#status"] = "status";
          exprVals[":status0"] = statuses[0];
        } else if (statuses.length > 1) {
          exprNames["#status"] = "status";
          const parts = [];
          statuses.forEach((s, idx) => {
            const key = `:status${idx}`;
            exprVals[key] = s;
            parts.push(`#status = ${key}`);
          });
          filterExpr += " AND (" + parts.join(" OR ") + ")";
        }
      }

      const params = {
        TableName: this.requestTableName,
        FilterExpression: filterExpr,
        ExpressionAttributeValues: exprVals,
        ExpressionAttributeNames: Object.keys(exprNames).length
          ? exprNames
          : undefined,
      };
      const result = await dynamodb.scan(params).promise();
      return result.Items.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (err) {
      error("Error listing simulation requests", err);
      throw new Error(`Failed to list simulation requests: ${err.message}`);
    }
  }

  async listSimulationRequestsByUser(userId, filter = {}) {
    try {
      if (!userId) {
        error("listSimulationRequestsByUser called without userId");
        throw new Error("Missing user identifier");
      }
      info(`Listing simulation requests for user: ${userId}`, {
        userId,
        filter,
      });
      const params = {
        TableName: this.requestTableName,
        FilterExpression:
          "begins_with(PK, :pk) AND requestedBy = :uid" +
          (filter.status ? " AND #status = :status" : ""),
        ExpressionAttributeValues: {
          ":pk": "SIMREQ#",
          ":uid": userId,
          ...(filter.status ? { ":status": filter.status } : {}),
        },
        ExpressionAttributeNames: filter.status
          ? { "#status": "status" }
          : undefined,
      };
      console.log(
        "[DEBUG] DynamoDB Query Params:",
        JSON.stringify(params, null, 2)
      );
      console.log("[DEBUG] Table name:", this.requestTableName);
      const result = await dynamodb.scan(params).promise();
      console.log("[DEBUG] DynamoDB Raw result count:", result.Items.length);
      console.log("[DEBUG] DynamoDB Raw items:", result.Items);

      // Let's also try a scan without filters to see all items
      const allItemsParams = {
        TableName: this.requestTableName,
        FilterExpression: "begins_with(PK, :pk)",
        ExpressionAttributeValues: { ":pk": "SIMREQ#" },
      };
      const allResult = await dynamodb.scan(allItemsParams).promise();
      console.log("[DEBUG] All SIMREQ items in table:", allResult.Items.length);
      console.log(
        "[DEBUG] All items requestedBy values:",
        allResult.Items.map((item) => ({
          PK: item.PK,
          requestedBy: item.requestedBy,
          name: item.name,
        }))
      );

      return result.Items.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (err) {
      error("Error listing user simulation requests", err);
      throw new Error(
        `Failed to list user simulation requests: ${err.message}`
      );
    }
  }

  async getSimulationRequestById(requestId) {
    try {
      console.log(`[DYNAMODB] Fetching simulation request: ${requestId}`);
      const params = {
        TableName: this.requestTableName,
        FilterExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `SIMREQ#${requestId}` },
      };
      const result = await dynamodb.scan(params).promise();
      const item = result.Items && result.Items[0] ? result.Items[0] : null;
      if (item) {
        console.log(
          `[DYNAMODB] ✓ Request found: ${item.name} (status: ${
            item.status || "unknown"
          })`
        );
      } else {
        console.log(`[DYNAMODB] ✗ Request not found: ${requestId}`);
      }
      return item;
    } catch (err) {
      console.error(
        `[DYNAMODB] ✗ Error getting simulation request ${requestId}:`,
        err.message
      );
      error("Error getting simulation request", err);
      throw new Error(`Failed to get simulation request: ${err.message}`);
    }
  }

  async updateSimulationRequestStatus(requestId, status, extra = {}) {
    try {
      console.log(
        `[DYNAMODB] Updating request ${requestId} status to: ${status}`
      );
      // We need the item key; scan to get SK first
      const existing = await this.getSimulationRequestById(requestId);
      if (!existing) {
        console.error(
          `[DYNAMODB] ✗ Cannot update status: Request ${requestId} not found`
        );
        throw new Error("Request not found");
      }
      const params = {
        TableName: this.requestTableName,
        Key: { PK: existing.PK, SK: existing.SK },
        UpdateExpression:
          "SET #status = :status, #updatedAt = :updatedAt" +
          (extra.error ? ", #error = :error" : ""),
        ExpressionAttributeNames: {
          "#status": "status",
          "#updatedAt": "updatedAt",
          ...(extra.error ? { "#error": "error" } : {}),
        },
        ExpressionAttributeValues: {
          ":status": status,
          ":updatedAt": new Date().toISOString(),
          ...(extra.error ? { ":error": String(extra.error) } : {}),
        },
        ReturnValues: "ALL_NEW",
      };
      const result = await dynamodb.update(params).promise();
      console.log(`[DYNAMODB] ✓ Status updated successfully: ${status}`);
      if (extra.error) {
        console.log(`[DYNAMODB] Error details: ${extra.error}`);
      }
      // Audit: status change
      try {
        await this.createAuditLog({
          userId: extra.operatorId || existing.requestedBy || "system",
          action: `SIMULATION_REQUEST_STATUS_${status.toUpperCase()}`,
          resource: `SimulationRequest:${requestId}`,
          status: extra.error ? "failed" : "success",
          details: JSON.stringify({ ...extra, requestName: existing.name }),
        });
      } catch (_) {}
      return result.Attributes;
    } catch (err) {
      console.error(`[DYNAMODB] ✗ Error updating status:`, err.message);
      error("Error updating simulation request status", err);
      throw new Error(`Failed to update simulation request: ${err.message}`);
    }
  }

  // Simulation Results (Operator -> Clinical)
  async writeSimulationResult(
    requestId,
    engineId,
    resultSummary,
    details = {}
  ) {
    try {
      const id = uuidv4();
      // Ensure engineId is in summary if not already present
      const summaryWithEngine = {
        ...resultSummary,
        engine: resultSummary.engine || engineId,
      };
      const params = {
        TableName: this.resultTableName,
        Item: {
          PK: `SIMRES#${requestId}`,
          SK: `RES#${engineId}#${id}`,
          id,
          requestId,
          engineId: String(engineId), // Ensure it's a string
          summary: summaryWithEngine,
          details,
          timestamp: new Date().toISOString(),
          TTL: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      };
      console.log(
        `[DYNAMODB] Writing simulation result for request ${requestId}, engine ${engineId}`
      );
      console.log(
        `[DYNAMODB] Result summary:`,
        JSON.stringify(summaryWithEngine, null, 2)
      );
      await dynamodb.put(params).promise();
      console.log(
        `[DYNAMODB] ✓ Result written successfully (PK: ${params.Item.PK}, SK: ${params.Item.SK})`
      );
      // Audit: result published
      try {
        await this.createAuditLog({
          userId: details.operatorId || details.requestedBy || "system",
          action: "SIMULATION_RESULT_PUBLISHED",
          resource: `SimulationRequest:${requestId}`,
          status: "success",
          details: JSON.stringify({ engineId, summary: summaryWithEngine }),
        });
      } catch (_) {}
      return params.Item;
    } catch (err) {
      error("Error writing simulation result", err);
      throw new Error(`Failed to write simulation result: ${err.message}`);
    }
  }

  async getResultsForRequest(requestId) {
    try {
      console.log(`[DYNAMODB] Fetching results for request: ${requestId}`);
      const params = {
        TableName: this.resultTableName,
        FilterExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `SIMRES#${requestId}` },
      };
      const result = await dynamodb.scan(params).promise();
      const items = (result.Items || []).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      console.log(
        `[DYNAMODB] ✓ Found ${items.length} result(s) for request ${requestId}`
      );
      items.forEach((item, idx) => {
        console.log(
          `[DYNAMODB]   Result ${idx + 1}: ${item.engineId} - ${
            item.summary?.avgWaitMinutes
          }min wait, ${item.summary?.overallUtilizationPct}% util`
        );
      });
      return items;
    } catch (err) {
      console.error(
        `[DYNAMODB] ✗ Error getting results for ${requestId}:`,
        err.message
      );
      error("Error getting simulation results", err);
      throw new Error(`Failed to get simulation results: ${err.message}`);
    }
  }

  async getAuditLogs(limit = 10) {
    try {
      info(`Fetching audit logs from DynamoDB, limit: ${limit}`);
      const params = {
        TableName: this.tableName,
        FilterExpression: "begins_with(PK, :pk)",
        ExpressionAttributeValues: {
          ":pk": "AUDIT#",
        },
        Limit: 100, // Get more than needed for sorting
      };

      const result = await dynamodb.scan(params).promise();

      // Sort by timestamp descending and take only the last 10
      const sortedItems = result.Items.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      )
        .slice(0, limit)
        .map((item) => ({
          _id: item.PK,
          timestamp: item.timestamp,
          user: item.userId,
          action: item.action,
          resource: item.resource,
          status: item.status,
          ip: item.ip,
          details: item.details,
        }));

      info(`Retrieved ${sortedItems.length} audit logs`);
      return sortedItems;
    } catch (err) {
      error("Error getting audit logs", err);
      throw new Error(`Failed to get audit logs: ${err.message}`);
    }
  }

  async getAuditLogsFallback(limit = 50) {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "begins_with(PK, :pk)",
        ExpressionAttributeValues: {
          ":pk": "AUDIT#",
        },
        Limit: limit,
      };

      const result = await dynamodb.scan(params).promise();

      return result.Items.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ).map((item) => ({
        _id: item.PK,
        timestamp: item.timestamp,
        user: item.userId,
        action: item.action,
        resource: item.resource,
        status: item.status,
        ip: item.ip,
        details: item.details,
      }));
    } catch (error) {
      console.error("Error getting audit logs (fallback):", error);
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }
  }

  // Medicines and reorders
  async createMedicineStock(name, initial = 100) {
    try {
      const params = {
        TableName: this.pharmacyTableName,
        Item: {
          PK: `MED#${name}`,
          SK: `INFO#${name}`,
          name,
          stock: Number(initial),
          timestamp: new Date().toISOString(),
          TTL: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        },
      };
      await dynamodb.put(params).promise();
      return params.Item;
    } catch (err) {
      error("Error creating medicine stock", err);
      throw new Error(`Failed to create medicine stock: ${err.message}`);
    }
  }

  async getMedicine(name) {
    try {
      const params = {
        TableName: this.pharmacyTableName,
        FilterExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `MED#${name}` },
      };
      const result = await dynamodb.scan(params).promise();
      return result.Items && result.Items[0] ? result.Items[0] : null;
    } catch (err) {
      error("Error getting medicine", err);
      throw new Error(`Failed to get medicine: ${err.message}`);
    }
  }

  async listMedicines() {
    try {
      const params = {
        TableName: this.pharmacyTableName,
        FilterExpression: "begins_with(PK, :pk)",
        ExpressionAttributeValues: { ":pk": "MED#" },
      };
      const result = await dynamodb.scan(params).promise();
      let items = result.Items || [];

      // If no medicines exist, initialize default medicines
      if (items.length === 0) {
        info("No medicines found, initializing default medicines");
        const defaults = [
          { name: "paracetamol", initial: 100 },
          { name: "atropine", initial: 100 },
          { name: "tramadol", initial: 100 },
        ];
        for (const d of defaults) {
          const created = await this.createMedicineStock(d.name, d.initial);
          items.push(created);
        }
      }

      return items.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      error("Error listing medicines", err);
      throw new Error(`Failed to list medicines: ${err.message}`);
    }
  }

  async decrementMedicine(name, amount = 1) {
    try {
      console.log(
        `[DYNAMODB] decrementMedicine called: name=${name}, amount=${amount}`
      );

      // Ensure item exists
      const existing = await this.getMedicine(name);
      console.log(`[DYNAMODB] Existing medicine:`, existing);

      if (!existing) {
        console.log(
          `[DYNAMODB] Medicine ${name} doesn't exist, creating with stock 100`
        );
        await this.createMedicineStock(name, 100);
      }

      // Use update to decrement atomically and return new value
      const params = {
        TableName: this.pharmacyTableName,
        Key: { PK: `MED#${name}`, SK: `INFO#${name}` },
        UpdateExpression:
          "SET #stock = if_not_exists(#stock, :zero) - :amt, #updatedAt = :now",
        ExpressionAttributeNames: {
          "#stock": "stock",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":amt": Number(amount),
          ":now": new Date().toISOString(),
          ":zero": 0,
        },
        ReturnValues: "ALL_NEW",
      };

      console.log(`[DYNAMODB] Update params:`, JSON.stringify(params, null, 2));

      const result = await dynamodb.update(params).promise();
      console.log(`[DYNAMODB] Update result:`, result);

      return result.Attributes;
    } catch (err) {
      console.error(`[DYNAMODB] Error decrementing medicine ${name}:`, err);
      error("Error decrementing medicine", err);
      throw new Error(`Failed to decrement medicine: ${err.message}`);
    }
  }

  async createMedicineReorder(
    medName,
    suggestedAmount = 100,
    requestedBy = null
  ) {
    try {
      const id = uuidv4();
      const params = {
        TableName: this.pharmacyTableName,
        Item: {
          PK: `MEDREQ#${id}`,
          SK: `REQ#${medName}`,
          id,
          medName,
          suggestedAmount,
          requestedBy,
          status: "pending",
          timestamp: new Date().toISOString(),
          TTL: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        },
      };
      await dynamodb.put(params).promise();
      return params.Item;
    } catch (err) {
      error("Error creating medicine reorder", err);
      throw new Error(`Failed to create medicine reorder: ${err.message}`);
    }
  }

  async listMedicineReorders(filter = { status: "pending" }) {
    try {
      let filterExpr = "begins_with(PK, :pk)";
      const exprVals = { ":pk": "MEDREQ#" };
      if (filter.status) {
        filterExpr += " AND #status = :status";
      }
      const params = {
        TableName: this.pharmacyTableName,
        FilterExpression: filterExpr,
        ExpressionAttributeValues: {
          ...exprVals,
          ...(filter.status ? { ":status": filter.status } : {}),
        },
        ExpressionAttributeNames: filter.status
          ? { "#status": "status" }
          : undefined,
      };
      const result = await dynamodb.scan(params).promise();
      return result.Items.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (err) {
      error("Error listing medicine reorders", err);
      throw new Error(`Failed to list medicine reorders: ${err.message}`);
    }
  }

  async approveMedicineReorder(reorderId, operatorId, amountOrdered, cost) {
    try {
      // find existing reorder
      const paramsScan = {
        TableName: this.pharmacyTableName,
        FilterExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `MEDREQ#${reorderId}` },
      };
      const found = await dynamodb.scan(paramsScan).promise();
      const item = found.Items && found.Items[0] ? found.Items[0] : null;
      if (!item) throw new Error("Reorder not found");

      const updateParams = {
        TableName: this.pharmacyTableName,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression:
          "SET #status = :status, #approvedBy = :op, #approvedAt = :now, #amountOrdered = :amt, #cost = :cost",
        ExpressionAttributeNames: {
          "#status": "status",
          "#approvedBy": "approvedBy",
          "#approvedAt": "approvedAt",
          "#amountOrdered": "amountOrdered",
          "#cost": "cost",
        },
        ExpressionAttributeValues: {
          ":status": "approved",
          ":op": operatorId,
          ":now": new Date().toISOString(),
          ":amt": Number(amountOrdered),
          ":cost": String(cost),
        },
        ReturnValues: "ALL_NEW",
      };
      const updated = await dynamodb.update(updateParams).promise();
      // Increase medicine stock by the ordered amount
      console.log(
        `[PHARMACY] Incrementing stock for ${item.medName} by ${amountOrdered}`
      );
      try {
        const medKey = {
          PK: `MED#${item.medName}`,
          SK: `INFO#${item.medName}`,
        };
        const incParams = {
          TableName: this.pharmacyTableName,
          Key: medKey,
          UpdateExpression:
            "SET #stock = if_not_exists(#stock, :zero) + :inc, #updatedAt = :now",
          ExpressionAttributeNames: {
            "#stock": "stock",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":inc": Number(amountOrdered),
            ":now": new Date().toISOString(),
            ":zero": 0,
          },
          ReturnValues: "ALL_NEW",
        };

        console.log(
          `[PHARMACY] Stock increment params:`,
          JSON.stringify(incParams, null, 2)
        );
        const incResult = await dynamodb.update(incParams).promise();
        console.log(`[PHARMACY] Stock increment result:`, incResult.Attributes);

        // Prepare receipt content (do not persist file)
        const receiptContent = `Reorder ID: ${reorderId}\nMedicine: ${
          item.medName
        }\nAmount Ordered: ${amountOrdered}\nCost: ${cost}\nApproved By: ${operatorId}\nTimestamp: ${new Date().toISOString()}\n`;

        return {
          updated: updated.Attributes,
          newMedicineState: incResult.Attributes,
          receiptContent,
        };
      } catch (innerErr) {
        // return updated reorder even if stock update fails
        return {
          updated: updated.Attributes,
          receiptContent: `Reorder ID: ${reorderId}\nMedicine: ${
            item.medName
          }\nAmount Ordered: ${amountOrdered}\nCost: ${cost}\nApproved By: ${operatorId}\nTimestamp: ${new Date().toISOString()}\n`,
        };
      }
    } catch (err) {
      error("Error approving medicine reorder", err);
      throw new Error(`Failed to approve medicine reorder: ${err.message}`);
    }
  }

  async createSimulation(simulationData) {
    try {
      const params = {
        TableName: this.tableName,
        Item: {
          PK: `SIMULATION#${Date.now()}`,
          SK: `SIM#${simulationData.userId}`,
          timestamp: new Date().toISOString(),
          userId: simulationData.userId,
          name: simulationData.name,
          description: simulationData.description,
          status: simulationData.status || "pending",
          parameters: simulationData.parameters || {},
          results: simulationData.results || {},
          TTL: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days TTL
        },
      };

      await dynamodb.put(params).promise();
      return params.Item;
    } catch (error) {
      console.error("Error creating simulation:", error);
      throw new Error(`Failed to create simulation: ${error.message}`);
    }
  }

  async getSimulations(userId) {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "begins_with(PK, :pk) AND userId = :userId",
        ExpressionAttributeValues: {
          ":pk": "SIMULATION#",
          ":userId": userId,
        },
      };

      const result = await dynamodb.scan(params).promise();

      return result.Items.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ).map((item) => ({
        _id: item.PK,
        name: item.name,
        description: item.description,
        status: item.status,
        timestamp: item.timestamp,
        parameters: item.parameters,
        results: item.results,
      }));
    } catch (error) {
      console.error("Error getting simulations:", error);
      throw new Error(`Failed to get simulations: ${error.message}`);
    }
  }

  async createFeedback(feedbackData) {
    try {
      const params = {
        TableName: this.tableName,
        Item: {
          PK: `FEEDBACK#${Date.now()}`,
          SK: `FB#${feedbackData.userId}`,
          timestamp: new Date().toISOString(),
          userId: feedbackData.userId,
          type: feedbackData.type,
          message: feedbackData.message,
          rating: feedbackData.rating,
          status: feedbackData.status || "pending",
          TTL: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
        },
      };

      await dynamodb.put(params).promise();
      return params.Item;
    } catch (error) {
      console.error("Error creating feedback:", error);
      throw new Error(`Failed to create feedback: ${error.message}`);
    }
  }

  async getFeedback() {
    try {
      const params = {
        TableName: this.tableName,
        FilterExpression: "begins_with(PK, :pk)",
        ExpressionAttributeValues: {
          ":pk": "FEEDBACK#",
        },
      };

      const result = await dynamodb.scan(params).promise();

      return result.Items.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      ).map((item) => ({
        _id: item.PK,
        type: item.type,
        message: item.message,
        rating: item.rating,
        status: item.status,
        timestamp: item.timestamp,
        userId: item.userId,
      }));
    } catch (error) {
      console.error("Error getting feedback:", error);
      throw new Error(`Failed to get feedback: ${error.message}`);
    }
  }

  async createPatient(patientData) {
    try {
      const id = uuidv4();
      const params = {
        TableName: this.tableName,
        Item: {
          PK: `PATIENT#${id}`,
          SK: `CLINICAL#${patientData.admittedAt}`,
          ...patientData,
          id,
          timestamp: new Date().toISOString(),
          TTL: Math.floor(Date.now() / 1000) + 180 * 24 * 60 * 60, // 180 days
        },
      };
      await dynamodb.put(params).promise();
      return params.Item;
    } catch (err) {
      error("Error creating patient record", err);
      throw new Error(`Failed to create patient: ${err.message}`);
    }
  }

  async getPatients(filter = {}) {
    try {
      let filterExpr = "begins_with(PK, :pk)";
      let exprVals = { ":pk": "PATIENT#" };
      // Optionally add window (admittedAt range) filters here
      if (filter.start || filter.end) {
        filterExpr += " AND admittedAt BETWEEN :start AND :end";
        exprVals[":start"] = filter.start || "0000-00-00T00:00:00Z";
        exprVals[":end"] = filter.end || "9999-12-31T23:59:59Z";
      }
      const params = {
        TableName: this.tableName,
        FilterExpression: filterExpr,
        ExpressionAttributeValues: exprVals,
      };
      const result = await dynamodb.scan(params).promise();
      return result.Items;
    } catch (err) {
      error("Error getting patients", err);
      throw new Error(`Failed to get patients: ${err.message}`);
    }
  }
}

module.exports = new DynamoDBService();
