// Test script to verify queueing engine fixes
delete require.cache[
  require.resolve("./services/simulationEngines/priorityBedAllocator")
];
const priorityBedAllocator = require("./services/simulationEngines/priorityBedAllocator");

console.log("\n=== TESTING PRIORITY BED ALLOCATOR (ENGINE B) ===\n");

const testParams = {
  avgTreatmentMinutesEmergency: 2,
  durationHours: 24,
  emergencyPatientsPerHour: 3,
  beds: 70,
  emergencyPercent: 20,
};

console.log("Input parameters:", testParams);
console.log("\nExpected:");
console.log("- Emergency arrivals: 3 * 24 = 72 patients");
console.log("- Clinic arrivals: 0 patients");
console.log("- Total beds: 70 beds");
console.log("- Treatment time: 2 minutes (very fast)");
console.log("- Should serve: 72 patients");
console.log("- Utilization: ~3-5% (very low due to fast treatment)");

console.log("\n--- ACTUAL RESULTS ---");
const result = priorityBedAllocator.simulate(testParams);

console.log("\nFINAL SUMMARY:");
console.log("- Patients served:", result.summary.patientsServed);
console.log("- Utilization:", result.summary.overallUtilizationPct + "%");
console.log("- Wait time:", result.summary.avgWaitMinutes + " minutes");

if (result.summary.patientsServed >= 70) {
  console.log("\n✅ SUCCESS: Patient count is correct!");
} else {
  console.log(
    "\n❌ ISSUE: Patient count wrong. Expected ~72, got",
    result.summary.patientsServed
  );
}
