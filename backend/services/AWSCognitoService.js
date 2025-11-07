const AWS = require("aws-sdk");
const crypto = require("crypto");
const { error, info } = require("../utils/logger");
const inferRoleFromEmail = (email) => {
  const mail = (email || "").toLowerCase();
  if (mail.includes("admin")) return "admin";
  if (mail.includes("operator")) return "operator";
  if (mail.includes("pharmacist")) return "pharmacist";
  if (mail.includes("clinical")) return "clinical";
  return "clinical"; // default
};

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const cognito = new AWS.CognitoIdentityServiceProvider();

class AWSCognitoService {
  constructor() {
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    this.clientId = process.env.COGNITO_CLIENT_ID;
    this.clientSecret = process.env.COGNITO_CLIENT_SECRET; // Optional
  }

  // Calculate SECRET_HASH for clients with client secret
  calculateSecretHash(username) {
    if (!this.clientSecret) {
      return null;
    }
    return crypto
      .createHmac("sha256", this.clientSecret)
      .update(username + this.clientId)
      .digest("base64");
  }

  async createUser(email, password) {
    try {
      const params = {
        UserPoolId: this.userPoolId,
        Username: email,
        UserAttributes: [
          {
            Name: "email",
            Value: email,
          },
          {
            Name: "email_verified",
            Value: "true",
          },
        ],
        TemporaryPassword: password,
        MessageAction: "SUPPRESS",
      };
      const result = await cognito.adminCreateUser(params).promise();
      await this.setUserPassword(email, password);
      return {
        _id: result.User.Username,
        email: email,
        role: inferRoleFromEmail(email), // <--- infer here
        status: result.User.UserStatus,
      };
    } catch (err) {
      error("Error creating user in Cognito", err);
      throw new Error(`Failed to create user: ${err.message}`);
    }
  }

  async setUserPassword(email, password) {
    try {
      const params = {
        UserPoolId: this.userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      };

      await cognito.adminSetUserPassword(params).promise();
    } catch (err) {
      error("Error setting user password", err);
      throw new Error(`Failed to set password: ${err.message}`);
    }
  }

  async listUsers() {
    try {
      const params = {
        UserPoolId: this.userPoolId,
        Limit: 60,
      };
      const result = await cognito.listUsers(params).promise();
      return result.Users.map((user) => {
        const emailAttr = user.Attributes.find((attr) => attr.Name === "email");
        return {
          _id: user.Username,
          email: emailAttr ? emailAttr.Value : user.Username,
          role: inferRoleFromEmail(emailAttr ? emailAttr.Value : user.Username), // always infer
          status: user.UserStatus,
        };
      });
    } catch (err) {
      error("Error listing users from Cognito", err);
      throw new Error(`Failed to list users: ${err.message}`);
    }
  }

  async deleteUser(email) {
    try {
      const params = {
        UserPoolId: this.userPoolId,
        Username: email,
      };

      await cognito.adminDeleteUser(params).promise();
      return true;
    } catch (err) {
      error("Error deleting user from Cognito", err);
      throw new Error(`Failed to delete user: ${err.message}`);
    }
  }

  async authenticateUser(email, password) {
    try {
      const secretHash = this.calculateSecretHash(email);
      const authParameters = {
        USERNAME: email,
        PASSWORD: password,
      };

      // Add SECRET_HASH if client secret is configured
      if (secretHash) {
        authParameters.SECRET_HASH = secretHash;
      }

      const params = {
        AuthFlow: "ADMIN_NO_SRP_AUTH",
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthParameters: authParameters,
      };

      const result = await cognito.adminInitiateAuth(params).promise();

      if (result.AuthenticationResult) {
        return {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
        };
      }

      throw new Error("Authentication failed");
    } catch (err) {
      error("Error authenticating user", err);
      throw new Error(`Authentication failed: ${err.message}`);
    }
  }

  async getUserByEmail(email) {
    try {
      const params = {
        UserPoolId: this.userPoolId,
        Username: email,
      };
      const result = await cognito.adminGetUser(params).promise();
      return {
        _id: result.Username,
        email: email,
        role: inferRoleFromEmail(email), // always infer
        status: result.UserStatus,
      };
    } catch (err) {
      if (err.code === "UserNotFoundException") {
        return null;
      }
      error("Error getting user from Cognito", err);
      throw new Error(`Failed to get user: ${err.message}`);
    }
  }
}

module.exports = new AWSCognitoService();
