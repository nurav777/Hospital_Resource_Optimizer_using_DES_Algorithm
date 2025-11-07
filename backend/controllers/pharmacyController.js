const DynamoDBService = require("../services/DynamoDBService");
const { info, error } = require("../utils/logger");

class PharmacyController {
  async initStocks(req, res) {
    try {
      const defaults = [
        { name: "paracetamol", initial: 100 }, // For clinic patients
        { name: "atropine", initial: 100 }, // For surgery patients
        { name: "tramadol", initial: 100 }, // For bed patients
      ];
      const results = [];
      for (const d of defaults) {
        const existing = await DynamoDBService.getMedicine(d.name);
        if (!existing) {
          const created = await DynamoDBService.createMedicineStock(
            d.name,
            d.initial
          );
          results.push(created);
        } else {
          results.push(existing);
        }
      }
      return res.json({ ok: true, medicines: results });
    } catch (err) {
      error("initStocks error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  async listMedicines(req, res) {
    try {
      const meds = await DynamoDBService.listMedicines();
      return res.json({ ok: true, medicines: meds });
    } catch (err) {
      error("listMedicines error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  async listReorders(req, res) {
    try {
      const status = req.query.status || "pending";
      const reorders = await DynamoDBService.listMedicineReorders({ status });
      return res.json({ ok: true, reorders });
    } catch (err) {
      error("listReorders error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  async createReorder(req, res) {
    try {
      const medName = req.body?.medName;
      const suggestedAmount = req.body?.suggestedAmount || 100;
      const requestedBy =
        req.user?.sub || req.user?.id || req.user?._id || "pharmacist";
      if (!medName)
        return res.status(400).json({ ok: false, error: "medName required" });
      const reorder = await DynamoDBService.createMedicineReorder(
        medName,
        suggestedAmount,
        requestedBy
      );
      try {
        await DynamoDBService.createAuditLog({
          userId: requestedBy,
          action: "PHARMACY_REORDER_REQUESTED",
          resource: `Reorder:${reorder.id}`,
          status: "success",
          details: JSON.stringify({ medName, suggestedAmount }),
        });
      } catch (_) {}
      return res.json({ ok: true, reorder });
    } catch (err) {
      error("createReorder error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  async approveReorder(req, res) {
    try {
      const reorderId = req.params.reorderId;
      const operatorId =
        req.user?.sub || req.user?.id || req.user?._id || "operator";
      const { amountOrdered = 100, cost = "0" } = req.body || {};
      const result = await DynamoDBService.approveMedicineReorder(
        reorderId,
        operatorId,
        amountOrdered,
        cost
      );
      // Audit
      try {
        await DynamoDBService.createAuditLog({
          userId: operatorId,
          action: "PHARMACY_REORDER_APPROVED",
          resource: `Reorder:${reorderId}`,
          status: "success",
          details: JSON.stringify({ amountOrdered, cost }),
        });
      } catch (_) {}
      // If receiptContent provided, return it for client to download (do not store)
      if (result && result.receiptContent) {
        return res.json({
          ok: true,
          result,
          receiptContent: result.receiptContent,
        });
      }
      return res.json({ ok: true, result });
    } catch (err) {
      error("approveReorder error", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
}

module.exports = new PharmacyController();
