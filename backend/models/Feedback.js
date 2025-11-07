// In-memory feedback model with demo data
const feedbacks = [
  {
    _id: 'FB001',
    clinicalUserId: '3',
    category: 'resource-shortage',
    priority: 'high',
    title: 'ICU beds are frequently at capacity during peak hours',
    description: 'ICU beds are frequently at capacity during peak hours',
    status: 'reviewed',
    submittedAt: '2024-01-14 16:30',
    response: 'Additional beds being evaluated for ICU expansion'
  },
  {
    _id: 'FB002',
    clinicalUserId: '3',
    category: 'process-improvement',
    priority: 'medium',
    title: 'Patient discharge process could be streamlined',
    description: 'Patient discharge process could be streamlined',
    status: 'pending',
    submittedAt: '2024-01-13 10:15',
    response: null
  },
  {
    _id: 'FB003',
    clinicalUserId: '3',
    category: 'equipment-issue',
    priority: 'low',
    title: 'Outdated monitoring equipment in room B-204',
    description: 'Outdated monitoring equipment in room B-204',
    status: 'resolved',
    submittedAt: '2024-01-12 14:20',
    response: 'Equipment replaced and fully functional'
  },
  {
    _id: 'FB004',
    clinicalUserId: '3',
    category: 'safety-concern',
    priority: 'high',
    title: 'Safety concern in ward A',
    description: 'Safety concern in ward A',
    status: 'pending',
    submittedAt: '2024-01-11 09:00',
    response: null
  }
];

class Feedback {
  constructor(data) {
    this._id = data._id || 'FB' + Date.now().toString().slice(-3);
    this.clinicalUserId = data.clinicalUserId;
    this.category = data.category;
    this.priority = data.priority;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status || 'pending';
    this.submittedAt = data.submittedAt || new Date().toISOString().slice(0, 16).replace('T', ' ');
    this.response = data.response || null;
  }

  static async find(query) {
    let results = feedbacks.slice(); // Copy array
    if (query && query.clinicalUserId) {
      results = results.filter(f => f.clinicalUserId === query.clinicalUserId);
    }
    // Sort by submittedAt descending
    results.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return results.slice(0, 3); // Last 3
  }

  static async findWithPopulate() {
    const results = await this.find();
    // Simulate populate
    const users = require('./User');
    return results.map(f => {
      const user = users.find(u => u._id === f.clinicalUserId);
      return {
        ...f,
        clinicalUserId: user ? { _id: user._id, email: user.email } : f.clinicalUserId
      };
    });
  }

  static async countDocuments() {
    return feedbacks.length;
  }

  async save() {
    if (!feedbacks.find(f => f._id === this._id)) {
      feedbacks.push(this);
    }
    return this;
  }
}

module.exports = Feedback;
