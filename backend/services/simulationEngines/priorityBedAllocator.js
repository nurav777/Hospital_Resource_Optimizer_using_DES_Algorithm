// Engine B: Priority Bed Allocator (analytical approximation)
// This engine approximates wait and throughput for mixed-priority arrivals
function simulate(parameters) {
  const durationHours = Number(parameters.durationHours) || 8;

  // Handle both naming conventions for arrivals
  const emergencyPatientsPerHour =
    Number(
      parameters.emergencyPatientsPerHour || parameters.emergencyArrivalsPerHour
    ) || 0;
  const clinicPatientsPerHour =
    Number(
      parameters.clinicPatientsPerHour || parameters.clinicArrivalsPerHour
    ) || 0;

  console.log("[DEBUG] Priority Bed Allocator Inputs:");
  console.log("  emergencyPatientsPerHour:", emergencyPatientsPerHour);
  console.log("  clinicPatientsPerHour:", clinicPatientsPerHour);

  // Handle bed parameters - use totalBeds if available, otherwise beds
  const totalBeds = Number(parameters.totalBeds || parameters.beds) || 15;
  const emergencyBeds =
    Number(parameters.emergencyBeds) || Math.ceil(totalBeds * 0.3);
  const beds = totalBeds;

  const surgeons = Math.max(0, Math.floor(Number(parameters.surgeons) || 0));
  const operatingRooms = Math.max(
    0,
    Math.floor(Number(parameters.operatingRooms) || 0)
  );
  const nurses = Math.max(
    1,
    Math.floor(Number(parameters.nurses) || Math.ceil(beds * 0.5))
  );
  const doctors = Math.max(
    1,
    Math.floor(Number(parameters.doctors) || Math.ceil(beds * 0.2))
  );
  const emergencyPriorityBoost = Number(parameters.emergencyPriorityBoost) || 2;

  // Handle service time parameters - convert days to minutes if needed
  let avgTreatmentMinutesEmergency = Math.max(
    1,
    Number(
      parameters.avgTreatmentMinutesEmergency ||
        parameters.avgEmergencyServiceMinutes
    ) || 15
  );

  // If the value is very small (likely days), convert to minutes
  if (avgTreatmentMinutesEmergency <= 10) {
    console.log(
      "  Converting emergency treatment time from days to minutes:",
      avgTreatmentMinutesEmergency,
      "days =",
      avgTreatmentMinutesEmergency * 24 * 60,
      "minutes"
    );
    avgTreatmentMinutesEmergency = avgTreatmentMinutesEmergency * 24 * 60; // Convert days to minutes
  }

  let avgTreatmentMinutesClinic = Math.max(
    1,
    Number(
      parameters.avgTreatmentMinutesClinic || parameters.avgClinicServiceMinutes
    ) || 25
  );

  // If the value is very small (likely days), convert to minutes
  if (avgTreatmentMinutesClinic <= 10) {
    console.log(
      "  Converting clinic treatment time from days to minutes:",
      avgTreatmentMinutesClinic,
      "days =",
      avgTreatmentMinutesClinic * 24 * 60,
      "minutes"
    );
    avgTreatmentMinutesClinic = avgTreatmentMinutesClinic * 24 * 60; // Convert days to minutes
  }

  console.log("[DEBUG] Priority Bed Allocator Inputs:");
  console.log("  emergencyPatientsPerHour:", emergencyPatientsPerHour);
  console.log("  clinicPatientsPerHour:", clinicPatientsPerHour);
  console.log("  totalBeds:", totalBeds);
  console.log("  emergencyBeds:", emergencyBeds);
  console.log("  doctors:", doctors);
  console.log("  nurses:", nurses);
  console.log("  avgTreatmentMinutesEmergency:", avgTreatmentMinutesEmergency);
  console.log("  avgTreatmentMinutesClinic:", avgTreatmentMinutesClinic);
  console.log("  durationHours:", durationHours);

  // Combined arrival rates
  const lambdaEmergency = emergencyPatientsPerHour / 60; // per minute
  const lambdaClinic = clinicPatientsPerHour / 60; // per minute
  const totalLambda = lambdaEmergency + lambdaClinic;

  const totalMinutes = durationHours * 60;
  const expectedEmergencyArrivals = Math.round(lambdaEmergency * totalMinutes);
  const expectedClinicArrivals = Math.round(lambdaClinic * totalMinutes);
  const expectedArrivals = expectedEmergencyArrivals + expectedClinicArrivals;

  console.log("[DEBUG] Priority Bed Allocator Calculations:");
  console.log("  expectedEmergencyArrivals:", expectedEmergencyArrivals);
  console.log("  expectedClinicArrivals:", expectedClinicArrivals);
  console.log("  expectedArrivals:", expectedArrivals);

  // Approximate service capacity (patients per duration)
  // Use doctors as bottleneck: each doctor can serve ~ (durationMinutes / avgServiceMinutes)
  const avgTreatmentMinutesWeighted =
    expectedArrivals > 0
      ? (avgTreatmentMinutesEmergency * expectedEmergencyArrivals +
          avgTreatmentMinutesClinic * expectedClinicArrivals) /
        expectedArrivals
      : (avgTreatmentMinutesEmergency + avgTreatmentMinutesClinic) / 2;

  const capacityByDoctors = Math.floor(
    (doctors * totalMinutes) / avgTreatmentMinutesWeighted
  );
  const capacityByBeds = Math.floor(
    (beds * totalMinutes) / avgTreatmentMinutesWeighted
  );

  console.log("  avgTreatmentMinutesWeighted:", avgTreatmentMinutesWeighted);
  console.log("  capacityByDoctors:", capacityByDoctors);
  console.log("  capacityByBeds:", capacityByBeds);

  const throughput = Math.min(
    expectedArrivals,
    capacityByDoctors,
    capacityByBeds
  );

  console.log("  throughput (patients served):", throughput);

  // Approximate average wait: proportional to load and priority mix
  const loadFactor =
    expectedArrivals > 0
      ? expectedArrivals /
        Math.max(1, Math.max(capacityByDoctors, capacityByBeds))
      : 0;

  console.log("  loadFactor:", loadFactor);

  // baseline wait proportional to avg treatment time and load
  const baselineWait =
    loadFactor > 1
      ? avgTreatmentMinutesWeighted * Math.max(0, (loadFactor - 1) * 0.5)
      : 0;

  // emergencies get a boost (lower wait) due to priority
  const emergencyWait = baselineWait / emergencyPriorityBoost;
  const clinicWait = baselineWait * 1.0;

  console.log("  baselineWait:", baselineWait);
  console.log("  emergencyWait:", emergencyWait);
  console.log("  clinicWait:", clinicWait);

  const avgWaitMinutes =
    expectedArrivals > 0
      ? Math.max(
          0,
          Number(
            (
              (emergencyWait * expectedEmergencyArrivals +
                clinicWait * expectedClinicArrivals) /
              expectedArrivals
            ).toFixed(1)
          )
        )
      : 0;

  // Calculate utilization based on actual capacity used
  const maxCapacity = Math.max(capacityByDoctors, capacityByBeds);
  const overallUtilizationPct =
    maxCapacity > 0
      ? Math.min(100, Math.round((throughput / maxCapacity) * 100))
      : 0;

  console.log("  maxCapacity:", maxCapacity);
  console.log("  final avgWaitMinutes:", avgWaitMinutes);
  console.log("  final overallUtilizationPct:", overallUtilizationPct);

  return {
    summary: {
      engine: "engineB",
      avgWaitMinutes,
      patientsServed: throughput,
      overallUtilizationPct,
      beds,
      doctors,
      nurses,
    },
    details: {
      durationHours,
      expectedArrivals,
      expectedEmergencyArrivals,
      expectedClinicArrivals,
      avgTreatmentMinutesEmergency,
      avgTreatmentMinutesClinic,
      avgTreatmentMinutesWeighted,
      throughput,
      timestamp: new Date().toISOString(),
      parameters,
    },
  };
}

module.exports = { simulate };
