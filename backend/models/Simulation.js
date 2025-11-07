// In-memory simulation model with demo data
const simulations = [
  {
    _id: 'SIM001',
    name: 'Emergency Department Peak Hours',
    duration: '4 hours',
    status: 'completed',
    parameters: {
      patientArrivalRate: 10,
      beds: 20,
      doctors: 5,
      nurses: 10,
      avgTreatmentTime: 30
    },
    results: {
      avgWaitTime: '18 min',
      utilization: '87%'
    },
    createdBy: '2',
    createdAt: '2024-01-15 10:30'
  },
  {
    _id: 'SIM002',
    name: 'ICU Capacity Optimization',
    duration: '6 hours',
    status: 'completed',
    parameters: {
      patientArrivalRate: 15,
      beds: 25,
      doctors: 7,
      nurses: 12,
      avgTreatmentTime: 25
    },
    results: {
      avgWaitTime: '45 min',
      utilization: '93%'
    },
    createdBy: '2',
    createdAt: '2024-01-14 14:20'
  },
  {
    _id: 'SIM003',
    name: 'Surgery Schedule Analysis',
    duration: '8 hours',
    status: 'running',
    parameters: {
      patientArrivalRate: 20,
      beds: 30,
      doctors: 10,
      nurses: 15,
      avgTreatmentTime: 40
    },
    results: {
      avgWaitTime: 'In progress',
      utilization: 'In progress'
    },
    createdBy: '2',
    createdAt: '2024-01-15 09:15'
  }
];

class Simulation {
  constructor(data) {
    this._id = data._id || 'SIM' + Date.now().toString().slice(-3);
    this.name = data.name;
    this.duration = data.duration;
    this.status = data.status || 'running';
    this.parameters = data.parameters;
    this.results = data.results;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date().toISOString().slice(0, 16).replace('T', ' ');
  }

  static async find() {
    return simulations.map(s => new Simulation(s));
  }

  static async findById(id) {
    const sim = simulations.find(s => s._id === id);
    return sim ? new Simulation(sim) : null;
  }

  async save() {
    if (!simulations.find(s => s._id === this._id)) {
      simulations.push(this);
    }
    return this;
  }
}

module.exports = Simulation;
