const AWSCognitoService = require('./AWSCognitoService');
const DynamoDBService = require('./DynamoDBService');
const { log, error, info } = require('../utils/logger');

class UserService {
  async listUsers() {
    try {
      info('Listing users from Cognito');
      const users = await AWSCognitoService.listUsers();
      info(`Retrieved ${users.length} users`);
      return users;
    } catch (err) {
      error('Error listing users from Cognito', err);
      throw err;
    }
  }

  async deleteUser(email, adminId) {
    try {
      info(`Deleting user: ${email} by admin ${adminId}`);
      await AWSCognitoService.deleteUser(email);
      await DynamoDBService.createAuditLog({
        userId: adminId,
        action: `Deleted user ${email}`,
        resource: 'User Management',
        status: 'success'
      });
      info(`User deleted successfully: ${email}`);
    } catch (err) {
      error(`Error deleting user: ${email}`, err);
      throw err;
    }
  }

  async createUser(userData) {
    try {
      info(`Creating user: ${userData.email}`);
      // No role needed, inference only
      const existingUser = await AWSCognitoService.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      const newUser = await AWSCognitoService.createUser(
        userData.email,
        userData.password
      );
      await DynamoDBService.createAuditLog({
        userId: newUser._id,
        action: 'User created',
        resource: 'User Management',
        status: 'success'
      });
      info(`User created successfully: ${newUser.email}`);
      return newUser;
    } catch (err) {
      error(`Error creating user: ${userData.email}`, err);
      throw err;
    }
  }

  async authenticateUser(email, password) {
    try {
      info(`Authenticating user: ${email}`);
      const tokens = await AWSCognitoService.authenticateUser(email, password);
      const user = await AWSCognitoService.getUserByEmail(email);
      await DynamoDBService.createAuditLog({
        userId: user._id,
        action: 'User login',
        resource: 'Authentication',
        status: 'success'
      });
      info(`User authenticated successfully: ${email}`);
      return { ...tokens, user };
    } catch (err) {
      error(`Error authenticating user: ${email}`, err);
      throw err;
    }
  }
}

module.exports = new UserService();
