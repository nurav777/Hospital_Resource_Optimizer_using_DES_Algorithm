// Engine C: OR scheduling approximation
// Analytically estimate number of surgeries, wait, and OR utilization
function simulate(parameters) {
  const durationHours = Number(parameters.durationHours) || 8;

  // Handle both surgeriesPerHour and scheduledSurgeriesPerDay
  let surgeriesPerHour = Number(parameters.surgeriesPerHour) || 0;
  if (!surgeriesPerHour && parameters.scheduledSurgeriesPerDay) {
    // Convert surgeries per day to surgeries per hour (assuming 24-hour day)
    surgeriesPerHour = Number(parameters.scheduledSurgeriesPerDay) / 24;
  }

  const surgeons = Math.max(
    1,
    Math.floor(
      Number(parameters.surgeons) || Math.ceil(parameters.operatingRooms * 1.5)
    )
  );
  const operatingRooms = Math.max(
    1,
    Math.floor(Number(parameters.operatingRooms) || 1)
  );
  const recoveryBeds = Math.max(
    1,
    Math.floor(Number(parameters.recoveryBeds) || operatingRooms * 2)
  );
  const avgSurgeryMinutes = Math.max(
    1,
    Number(parameters.avgSurgeryMinutes) || 90
  );
  const avgRecoveryMinutes = Math.max(
    1,
    Number(parameters.avgRecoveryMinutes) || 60
  );

  console.log("[DEBUG] OR Scheduling Engine Inputs:");
  console.log(
    "  scheduledSurgeriesPerDay:",
    parameters.scheduledSurgeriesPerDay
  );
  console.log("  surgeriesPerHour (calculated):", surgeriesPerHour);
  console.log("  operatingRooms:", operatingRooms);
  console.log("  surgeons:", surgeons);
  console.log("  recoveryBeds:", recoveryBeds);
  console.log("  avgSurgeryMinutes:", avgSurgeryMinutes);
  console.log("  avgRecoveryMinutes:", avgRecoveryMinutes);
  console.log("  durationHours:", durationHours);

  const totalMinutes = durationHours * 60;
  const expectedArrivals = Math.round(surgeriesPerHour * durationHours);

  console.log("[DEBUG] OR Scheduling Calculations:");
  console.log("  expectedArrivals (surgeries):", expectedArrivals);

  // Capacity: how many surgeries can be performed given ORs and surgeons
  const capacityByOR = Math.floor(
    (operatingRooms * totalMinutes) / avgSurgeryMinutes
  );
  const capacityBySurgeons = Math.floor(
    (surgeons * totalMinutes) / avgSurgeryMinutes
  );
  const doable = Math.min(expectedArrivals, capacityByOR, capacityBySurgeons);

  // Recovery throughput (beds * totalMinutes / avgRecoveryMinutes)
  const recoveryCapacity = Math.floor(
    (recoveryBeds * totalMinutes) / avgRecoveryMinutes
  );

  console.log("  capacityByOR:", capacityByOR);
  console.log("  capacityBySurgeons:", capacityBySurgeons);
  console.log("  recoveryCapacity:", recoveryCapacity);
  console.log("  doable (before recovery limit):", doable);

  const patientsServed = Math.max(0, Math.min(doable, recoveryCapacity));

  console.log("  patientsServed (final):", patientsServed);

  // Utilization: proportion of OR time used
  const orUtilization = Math.min(
    1,
    (patientsServed * avgSurgeryMinutes) /
      Math.max(1, operatingRooms * totalMinutes)
  );
  const overallUtilizationPct = Math.round(orUtilization * 100);

  // Average wait approximated by queueing load: when arrivals exceed capacity, wait increases
  const load =
    expectedArrivals > 0 ? expectedArrivals / Math.max(1, capacityByOR) : 0;
  const avgWaitMinutes = Math.max(
    0,
    Number((Math.max(0, load - 1) * avgSurgeryMinutes * 0.5).toFixed(1))
  );

  return {
    summary: {
      engine: "engineC",
      avgWaitMinutes,
      patientsServed,
      overallUtilizationPct,
      operatingRooms,
      surgeons,
      recoveryBeds,
    },
    details: {
      durationHours,
      expectedArrivals,
      capacityByOR,
      capacityBySurgeons,
      recoveryCapacity,
      avgSurgeryMinutes,
      avgRecoveryMinutes,
      timestamp: new Date().toISOString(),
      parameters,
    },
  };
}

module.exports = { simulate };
