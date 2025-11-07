const UserService = require("./UserService");
const { generateToken } = require("../utils/jwt");
const { log } = require("../utils/logger");

class AuthService {
  async register(email, password, role) {
    try {
      const user = await UserService.createUser({ email, password, role });
      log(`User registered: ${email}`);
      return user;
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const result = await UserService.authenticateUser(email, password);

      // Generate JWT token for session management
      const normalizedRole = (result.user.role || "").toString().toLowerCase();
      const token = generateToken({
        id: result.user._id,
        email: result.user.email,
        role: normalizedRole,
      });

      log(`User logged in: ${email}`);
      return {
        token,
        user: {
          id: result.user._id,
          email: result.user.email,
          role: normalizedRole,
        },
        cognitoTokens: {
          accessToken: result.accessToken,
          idToken: result.idToken,
          refreshToken: result.refreshToken,
        },
      };
    } catch (error) {
      console.error(
        "Error logging in user:",
        error && error.message ? error.message : error
      );
      throw new Error(
        error && error.message ? error.message : "Unknown error during login."
      );
    }
  }
}

module.exports = new AuthService();
