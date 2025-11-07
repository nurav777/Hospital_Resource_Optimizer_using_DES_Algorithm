const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    // Simple log for authorization checks
    try {
      const info = {
        route: req.originalUrl,
        method: req.method,
        userEmail: user?.email,
        userRole: user?.role,
        allowedRoles,
      };
      console.info("[auth] role check", info);
    } catch (e) {
      console.info("[auth] role check - unable to collect context");
    }

    const userRole = req.user?.role
      ? req.user.role.toString().toLowerCase()
      : null;
    const allowedLower = Array.isArray(allowedRoles)
      ? allowedRoles.map((r) => r.toString().toLowerCase())
      : [];

    if (!req.user || !userRole || !allowedLower.includes(userRole)) {
      // More detailed warning to help debug permission mismatches
      console.warn("[auth] access denied", {
        user: req.user,
        allowedRoles,
        route: req.originalUrl,
        method: req.method,
      });
      return res
        .status(403)
        .json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};

module.exports = roleMiddleware;
