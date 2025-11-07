const DynamoDBService = require('./DynamoDBService');
const AWSCognitoService = require('./AWSCognitoService');
const { error, info } = require('../utils/logger');

class ReportService {
  async getReports() {
    try {
      info('Generating reports');
      const users = await AWSCognitoService.listUsers();
      const simulations = await DynamoDBService.getSimulations('all'); // Get all simulations
      const feedback = await DynamoDBService.getFeedback();

      const usersByRole = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      info(`Reports generated: ${users.length} users, ${simulations.length} simulations, ${feedback.length} feedbacks`);
      return {
        totalSimulations: simulations.length,
        totalFeedbacks: feedback.length,
        totalUsers: users.length,
        usersByRole: Object.entries(usersByRole).map(([role, count]) => ({ _id: role, count }))
      };
    } catch (err) {
      error('Error getting reports', err);
      throw err;
    }
  }

  async getAuditLogs() {
    try {
      info('Fetching audit logs from DynamoDB');
      const logs = await DynamoDBService.getAuditLogs(10);
      info(`Retrieved ${logs.length} audit logs`);
      return logs;
    } catch (err) {
      error('Error getting audit logs', err);
      throw err;
    }
  }
}

module.exports = new ReportService();
