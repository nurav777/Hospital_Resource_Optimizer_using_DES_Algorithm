const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { verifyToken } = require("../utils/jwt");
require("dotenv").config();

// Verifier for Cognito ID tokens (includes email, requires clientId)
const cognitoIdVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

// Verifier for Cognito Access tokens (no clientId needed)
const cognitoAccessVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access",
});

function inferRoleFromEmail(email) {
  const mail = (email || "").toLowerCase();
  if (mail.includes("admin")) return "admin";
  if (mail.includes("operator")) return "operator";
  if (mail.includes("pharmacist")) return "pharmacist";
  if (mail.includes("clinical")) return "clinical";
  return "clinical";
}

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  // Heuristic: if JWT header contains a 'kid', treat as Cognito-signed
  let header;
  try {
    const [headerB64] = token.split(".");
    header = JSON.parse(Buffer.from(headerB64, "base64").toString("utf8"));
  } catch (_) {
    header = null;
  }

  try {
    if (header && header.kid) {
      // Try ID token first (has email), fall back to Access token
      let payload;
      try {
        payload = await cognitoIdVerifier.verify(token);
      } catch (_) {
        payload = await cognitoAccessVerifier.verify(token);
      }

      const email =
        payload.email || payload.username || payload["cognito:username"] || "";
      // Prefer explicit role claim when present; otherwise infer from email
      const roleClaim = payload.role || payload["custom:role"] || null;
      const role = roleClaim
        ? roleClaim.toString().toLowerCase()
        : inferRoleFromEmail(email);
      req.user = {
        email,
        role,
        sub: payload.sub,
      };
      console.info("[auth] authenticated (cognito)", {
        email: req.user.email,
        role: req.user.role,
      });
      return next();
    }

    // Fallback: verify with internal JWT secret
    const payload = verifyToken(token);
    const email = payload.email || "";
    // Prefer role from token payload if present (generated at login), otherwise infer
    const roleClaim = payload.role || payload["custom:role"] || null;
    const role = roleClaim
      ? roleClaim.toString().toLowerCase()
      : inferRoleFromEmail(email);
    req.user = {
      email,
      role,
      sub: payload.id || payload.sub,
    };
    console.info("[auth] authenticated (internal)", {
      email: req.user.email,
      role: req.user.role,
    });
    return next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = authMiddleware;
