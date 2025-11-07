const Feedback = require('../models/Feedback');
const AuditLog = require('../models/AuditLog');
const { log } = require('../utils/logger');

class FeedbackService {
  async submitFeedback(clinicalUserId, feedbackData) {
    const feedback = new Feedback({ clinicalUserId, ...feedbackData });
    await feedback.save();
    await AuditLog.create({ userId: clinicalUserId, action: 'Feedback submitted', resource: 'Feedback System' });
    log(`Feedback submitted by user ${clinicalUserId}`);
    return feedback;
  }

  async getFeedbacks(clinicalUserId) {
    const feedbacks = await Feedback.find({ clinicalUserId });
    return feedbacks;
  }
}

module.exports = new FeedbackService();
