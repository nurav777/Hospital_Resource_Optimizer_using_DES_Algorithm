const express = require("express");
const {
  listUsers,
  deleteUser,
  addUser,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// Health check endpoint for AWS status
router.get("/health", async (req, res) => {
  try {
    // Try Cognito
    let cognitoStatus = "ok";
    try {
      await require("../services/AWSCognitoService").listUsers();
    } catch (e) {
      cognitoStatus = e.message || "error";
    }
    // Try Dynamo
    let dynamoStatus = "ok";
    try {
      await require("../services/DynamoDBService").getAuditLogs(1);
    } catch (e) {
      dynamoStatus = e.message || "error";
    }
    res.json({ health: "ok", cognito: cognitoStatus, dynamodb: dynamoStatus });
  } catch (err) {
    res.status(500).json({ health: "error", error: err.message });
  }
});

router.get("/", authMiddleware, roleMiddleware(["admin"]), listUsers);
router.post("/", authMiddleware, roleMiddleware(["admin"]), addUser);
router.delete("/:email", authMiddleware, roleMiddleware(["admin"]), deleteUser);

module.exports = router;
