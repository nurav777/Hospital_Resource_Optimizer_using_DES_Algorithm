const bcrypt = require('bcryptjs');

// Demo users
const users = [
  {
    _id: '1',
    email: 'admin@hospital.com',
    passwordHash: '$2b$10$zZWJr2ObEt7ucdPnFaDpMu2BxTZed0MTm6h5RFC.hW5b23Bz.zzCO', // password: admin123
    role: 'Admin'
  },
  {
    _id: '2',
    email: 'operator@hospital.com',
    passwordHash: '$2b$10$zZWJr2ObEt7ucdPnFaDpMu2BxTZed0MTm6h5RFC.hW5b23Bz.zzCO', // password: operator123
    role: 'Operator'
  },
  {
    _id: '3',
    email: 'clinical@hospital.com',
    passwordHash: '$2b$10$zZWJr2ObEt7ucdPnFaDpMu2BxTZed0MTm6h5RFC.hW5b23Bz.zzCO', // password: clinical123
    role: 'ClinicalUser'
  }
];

class User {
  constructor(data) {
    this._id = data._id;
    this.email = data.email;
    this.passwordHash = data.passwordHash;
    this.role = data.role;
  }

  static async findOne(query) {
    const user = users.find(u => u.email === query.email);
    return user ? new User(user) : null;
  }

  static async findWithSelect(fields) {
    let result = users.map(u => new User(u));
    if (fields === '-passwordHash') {
      result = result.map(u => {
        const { passwordHash, ...rest } = u;
        return rest;
      });
    }
    return result;
  }

  static async find(query) {
    if (query) {
      // Simple filtering, e.g., by email
      const filtered = users.filter(u => {
        for (const key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      });
      return filtered.map(u => new User(u));
    }
    return users.map(u => new User(u));
  }

  static async findById(id) {
    const user = users.find(u => u._id === id);
    return user ? new User(user) : null;
  }

  static async findByIdAndDelete(id) {
    const index = users.findIndex(u => u._id === id);
    if (index > -1) {
      users.splice(index, 1);
      return true;
    }
    return false;
  }

  async save() {
    // For demo, just add to array if new
    if (!this._id) {
      // Generate new ID if not provided
      this._id = (users.length + 1).toString();
    }
    
    if (!users.find(u => u._id === this._id)) {
      users.push(this);
    }
    return this;
  }

  static async countDocuments() {
    return users.length;
  }

  static async aggregate(pipeline) {
    // Simple implementation for group by role
    if (pipeline.length === 1 && pipeline[0].$group) {
      const group = pipeline[0].$group;
      const counts = {};
      users.forEach(user => {
        const key = user[group._id];
        counts[key] = (counts[key] || 0) + 1;
      });
      return Object.keys(counts).map(key => ({ _id: key, count: counts[key] }));
    }
    return [];
  }
}

module.exports = User;
