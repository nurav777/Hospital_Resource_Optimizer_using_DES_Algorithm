const Engines = require('./index');

function runScenario(name, params) {
  const results = {};
  const engines = ['engineA', 'engineB', 'engineC'];
  for (const key of engines) {
    const impl = Engines.getEngine(key);
    try {
      const out = impl.simulate(params);
      results[key] = out.summary;
    } catch (e) {
      results[key] = { error: e.message };
    }
  }
  return { name, params, results };
}

function main() {
  const scenarios = [
    {
      name: 'Basic clinic low load',
      params: {
        durationHours: 4,
        emergencyPatientsPerHour: 0,
        clinicPatientsPerHour: 6,
        avgServiceMinutes: 15,
        doctors: 3,
        beds: 10,
        nurses: 4,
      },
    },
    {
      name: 'Moderate ED mixed',
      params: {
        durationHours: 8,
        emergencyPatientsPerHour: 4,
        clinicPatientsPerHour: 8,
        avgServiceMinutes: 20,
        doctors: 4,
        beds: 8,
        nurses: 6,
        emergencyPriorityBoost: 2,
      },
    },
    {
      name: 'High load clinic near capacity',
      params: {
        durationHours: 8,
        emergencyPatientsPerHour: 0,
        clinicPatientsPerHour: 24,
        avgServiceMinutes: 20,
        doctors: 6,
        beds: 6,
        nurses: 6,
      },
    },
    {
      name: 'OR basic schedule',
      params: {
        durationHours: 8,
        surgeriesPerHour: 2,
        surgeons: 3,
        operatingRooms: 2,
        recoveryBeds: 4,
        avgSurgeryMinutes: 90,
        avgRecoveryMinutes: 60,
      },
    },
  ];

  const outputs = scenarios.map(s => runScenario(s.name, s.params));
  console.log(JSON.stringify(outputs, null, 2));
}

if (require.main === module) {
  main();
}


