const ReportService = require('../services/ReportService');

const getReports = async (req, res) => {
  try {
    const reports = await ReportService.getReports();
    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: error.message || error });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const logs = await ReportService.getAuditLogs();
    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: error.message || error });
  }
};

const exportAuditLogs = async (req, res) => {
  try {
    const logs = await ReportService.getAuditLogs();
    const csvHeaders = 'Timestamp,User,Action,Resource,Status,IP,Details\n';
    const csvRows = logs.map(log =>
      `"${log.timestamp}","${log.user}","${log.action}","${log.resource}","${log.status}","${log.ip}","${log.details}"`
    ).join('\n');
    const csvContent = csvHeaders + csvRows;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ message: error.message || error });
  }
};

module.exports = { getReports, getAuditLogs, exportAuditLogs };
