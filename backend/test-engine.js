const queueingEngine = require("./services/simulationEngines/queueingEngine");
const priorityBedAllocator = require("./services/simulationEngines/priorityBedAllocator");
const orSchedulingEngine = require("./services/simulationEngines/orSchedulingEngine");

console.log("\n=== SIMULATION ENGINES TEST SUITE ===\n");

// Test scenarios
const testScenarios = {
  realistic: {
    name: "REALISTIC HOSPITAL SCENARIO",
    queueing: {
      emergencyPatientsPerHour: 5,
      clinicPatientsPerHour: 15,
      avgServiceMinutes: 20,
      doctors: 3,
      beds: 10,
      durationHours: 8,
    },
    priority: {
      emergencyArrivalsPerHour: 8,
      clinicArrivalsPerHour: 12,
      avgEmergencyServiceMinutes: 15,
      avgClinicServiceMinutes: 25,
      totalBeds: 15,
      emergencyBeds: 5,
      durationHours: 8,
    },
    or: {
      scheduledSurgeriesPerDay: 6,
      avgSurgeryMinutes: 90,
      operatingRooms: 2,
      recoveryBeds: 4,
      durationHours: 10,
    },
  },
  moderate: {
    name: "MODERATE LOAD SCENARIO",
    queueing: {
      emergencyPatientsPerHour: 12,
      clinicPatientsPerHour: 30,
      avgServiceMinutes: 15,
      doctors: 4,
      beds: 8,
      durationHours: 12,
    },
    priority: {
      emergencyArrivalsPerHour: 15,
      clinicArrivalsPerHour: 25,
      avgEmergencyServiceMinutes: 12,
      avgClinicServiceMinutes: 20,
      totalBeds: 12,
      emergencyBeds: 4,
      durationHours: 12,
    },
    or: {
      scheduledSurgeriesPerDay: 10,
      avgSurgeryMinutes: 120,
      operatingRooms: 3,
      recoveryBeds: 6,
      durationHours: 12,
    },
  },
  unrealistic: {
    name: "UNREALISTIC/STRESS TEST SCENARIO",
    queueing: {
      emergencyPatientsPerHour: 50,
      clinicPatientsPerHour: 100,
      avgServiceMinutes: 5,
      doctors: 2,
      beds: 5,
      durationHours: 24,
    },
    priority: {
      emergencyArrivalsPerHour: 40,
      clinicArrivalsPerHour: 60,
      avgEmergencyServiceMinutes: 8,
      avgClinicServiceMinutes: 10,
      totalBeds: 8,
      emergencyBeds: 2,
      durationHours: 24,
    },
    or: {
      scheduledSurgeriesPerDay: 20,
      avgSurgeryMinutes: 180,
      operatingRooms: 1,
      recoveryBeds: 2,
      durationHours: 24,
    },
  },
};

function analyzeResults(engineName, scenario, params, result) {
  console.log(
    `\n--- ${engineName.toUpperCase()} - ${scenario.toUpperCase()} ---`
  );
  console.log("Input Parameters:", JSON.stringify(params, null, 2));
  console.log("Results:", JSON.stringify(result, null, 2));

  const summary = result.summary || {};
  const avgWait = summary.avgWaitMinutes || 0;
  const utilization = summary.overallUtilizationPct || 0;
  const patientsServed = summary.patientsServed || 0;

  console.log("\n📊 ANALYSIS:");

  // Wait time analysis
  if (avgWait < 0) {
    console.log("❌ ISSUE: Negative wait time!");
  } else if (avgWait > 480) {
    // 8 hours
    console.log(
      `❌ ISSUE: Unrealistic wait time: ${avgWait} minutes (${(
        avgWait / 60
      ).toFixed(1)} hours)`
    );
  } else if (avgWait > 120) {
    // 2 hours
    console.log(
      `⚠️  WARNING: High wait time: ${avgWait} minutes (${(
        avgWait / 60
      ).toFixed(1)} hours)`
    );
  } else {
    console.log(`✅ Wait time reasonable: ${avgWait} minutes`);
  }

  // Utilization analysis
  if (utilization < 0 || utilization > 100) {
    console.log(`❌ ISSUE: Invalid utilization: ${utilization}%`);
  } else if (utilization > 95) {
    console.log(`⚠️  WARNING: Very high utilization: ${utilization}%`);
  } else if (utilization < 10) {
    console.log(`⚠️  WARNING: Very low utilization: ${utilization}%`);
  } else {
    console.log(`✅ Utilization reasonable: ${utilization}%`);
  }

  // Patients served analysis
  if (patientsServed < 0) {
    console.log("❌ ISSUE: Negative patients served!");
  } else if (patientsServed === 0) {
    console.log("⚠️  WARNING: No patients served!");
  } else {
    console.log(`✅ Patients served: ${patientsServed}`);
  }

  // Overall assessment
  const issues = [];
  if (avgWait < 0 || avgWait > 480) issues.push("wait time");
  if (utilization < 0 || utilization > 100) issues.push("utilization");
  if (patientsServed < 0) issues.push("patients served");

  if (issues.length === 0) {
    console.log("🎉 OVERALL: Results look reasonable!");
  } else {
    console.log(`🚨 OVERALL: Issues found in: ${issues.join(", ")}`);
  }

  return issues.length === 0;
}

async function runTests() {
  const results = {
    queueing: {},
    priority: {},
    or: {},
  };

  for (const [scenarioName, scenario] of Object.entries(testScenarios)) {
    console.log(`\n\n🧪 TESTING ${scenario.name}`);
    console.log("=".repeat(50));

    // Test Queueing Engine
    try {
      const qResult = queueingEngine.simulate(scenario.queueing);
      results.queueing[scenarioName] = analyzeResults(
        "queueing",
        scenarioName,
        scenario.queueing,
        qResult
      );
    } catch (error) {
      console.log(`❌ QUEUEING ENGINE ERROR: ${error.message}`);
      results.queueing[scenarioName] = false;
    }

    // Test Priority Bed Allocator
    try {
      const pResult = priorityBedAllocator.simulate(scenario.priority);
      results.priority[scenarioName] = analyzeResults(
        "priority bed",
        scenarioName,
        scenario.priority,
        pResult
      );
    } catch (error) {
      console.log(`❌ PRIORITY BED ENGINE ERROR: ${error.message}`);
      results.priority[scenarioName] = false;
    }

    // Test OR Scheduling Engine
    try {
      const orResult = orSchedulingEngine.simulate(scenario.or);
      results.or[scenarioName] = analyzeResults(
        "or scheduling",
        scenarioName,
        scenario.or,
        orResult
      );
    } catch (error) {
      console.log(`❌ OR SCHEDULING ENGINE ERROR: ${error.message}`);
      results.or[scenarioName] = false;
    }
  }

  // Summary
  console.log("\n\n📋 TEST SUMMARY");
  console.log("=".repeat(50));

  const engines = ["queueing", "priority", "or"];
  const scenarios = ["realistic", "moderate", "unrealistic"];

  for (const engine of engines) {
    console.log(`\n${engine.toUpperCase()} ENGINE:`);
    for (const scenario of scenarios) {
      const status = results[engine][scenario] ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${scenario}: ${status}`);
    }
  }

  // Overall results
  const totalTests = engines.length * scenarios.length;
  const passedTests = engines.reduce((sum, engine) => {
    return (
      sum +
      scenarios.reduce((engineSum, scenario) => {
        return engineSum + (results[engine][scenario] ? 1 : 0);
      }, 0)
    );
  }, 0);

  console.log(`\n🎯 OVERALL: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All engines are working correctly!");
  } else {
    console.log("🔧 Some engines need fixes. Check the issues above.");
  }
}

// Run the tests
runTests().catch(console.error);
