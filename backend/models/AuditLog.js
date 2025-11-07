// In-memory audit log model with demo data
const auditLogs = [
  {
    _id: '1',
    timestamp: '2024-01-15 14:32:10',
    user: 'sarah.chen@hospital.com',
    action: 'USER_LOGIN',
    resource: 'Authentication System',
    status: 'success',
    ip: '192.168.1.105',
    details: 'Successful login from admin dashboard'
  },
  {
    _id: '2',
    timestamp: '2024-01-15 14:28:45',
    user: 'mike.rodriguez@hospital.com',
    action: 'SIMULATION_RUN',
    resource: 'Simulation Engine',
    status: 'success',
    ip: '192.168.1.87',
    details: 'Emergency department simulation completed'
  },
  {
    _id: '3',
    timestamp: '2024-01-15 14:25:12',
    user: 'emma.wilson@hospital.com',
    action: 'PATIENT_UPDATE',
    resource: 'Patient Management',
    status: 'success',
    ip: '192.168.1.92',
    details: 'Patient record updated - ID: PT001234'
  },
  {
    _id: '4',
    timestamp: '2024-01-15 14:20:33',
    user: 'unknown@external.com',
    action: 'LOGIN_ATTEMPT',
    resource: 'Authentication System',
    status: 'failed',
    ip: '203.0.113.42',
    details: 'Failed login attempt - invalid credentials'
  },
  {
    _id: '5',
    timestamp: '2024-01-15 14:15:22',
    user: 'john.analyst@hospital.com',
    action: 'REPORT_ACCESS',
    resource: 'Reporting System',
    status: 'success',
    ip: '192.168.1.156',
    details: 'Accessed public dashboard report'
  }
];

class AuditLog {
  constructor(data) {
    this._id = data._id || Date.now().toString();
    this.timestamp = data.timestamp || new Date().toISOString().slice(0, 16).replace('T', ' ');
    this.user = data.user;
    this.action = data.action;
    this.resource = data.resource;
    this.status = data.status;
    this.ip = data.ip;
    this.details = data.details;
  }

  static async create(data) {
    const log = new AuditLog(data);
    auditLogs.push(log);
    return log;
  }

  static async find(query) {
    let results = auditLogs.slice(); // Return copy of array
    if (query) {
      // Simple filtering if needed
    }
    return results;
  }
}

module.exports = AuditLog;
