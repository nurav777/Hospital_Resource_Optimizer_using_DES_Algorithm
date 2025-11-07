// Engine A: Analytical approximate M/M/c queue for combined arrivals
// Returns deterministic summary using Erlang-C approximations

function factorial(n) {
  if (n <= 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function erlangC(lambda, mu, c) {
  // lambda: arrival rate (per minute), mu: service rate (per minute), c: servers
  if (lambda <= 0 || mu <= 0 || c <= 0) return 0;
  const rho = lambda / (c * mu);
  if (rho >= 1) return 1; // unstable

  let sum = 0;
  for (let n = 0; n < c; n++) {
    sum += Math.pow(lambda / mu, n) / factorial(n);
  }
  const pn = Math.pow(lambda / mu, c) / (factorial(c) * (1 - rho));
  const p0 = 1 / (sum + pn);
  const Pc = pn * p0;
  return Pc;
}

function simulate(parameters) {
  // Coerce numeric inputs and apply sensible defaults
  const durationHours = Number(parameters.durationHours) || 8;
  const emergencyPatientsPerHour =
    Number(parameters.emergencyPatientsPerHour) || 0;
  const clinicPatientsPerHour = Number(parameters.clinicPatientsPerHour) || 0;
  const avgServiceMinutes = Math.max(
    1,
    Number(parameters.avgServiceMinutes) || 30
  );
  const doctors = Math.max(1, Math.floor(Number(parameters.doctors) || 1));
  const beds = Math.max(1, Math.floor(Number(parameters.beds) || 1));

  // Arrival rate per minute
  const lambda = (emergencyPatientsPerHour + clinicPatientsPerHour) / 60;
  // Service rate per minute (customer served per minute by one server)
  const mu = 1 / avgServiceMinutes;
  const servers = Math.max(1, Math.min(doctors, beds));

  console.log("[DEBUG] Queueing Engine Inputs:");
  console.log("  emergencyPatientsPerHour:", emergencyPatientsPerHour);
  console.log("  clinicPatientsPerHour:", clinicPatientsPerHour);
  console.log("  avgServiceMinutes:", avgServiceMinutes);
  console.log("  doctors:", doctors);
  console.log("  beds:", beds);
  console.log("  durationHours:", durationHours);
  console.log("[DEBUG] Calculated values:");
  console.log("  lambda (arrivals/min):", lambda);
  console.log("  mu (service rate/min):", mu);
  console.log("  servers:", servers);
  console.log("  load factor (λ/μ*servers):", lambda / (servers * mu));

  const Pc = erlangC(lambda, mu, servers);
  const rho = Math.min(0.999, lambda / (servers * mu));

  // Calculate load factor first to determine system stability
  const loadFactor = servers > 0 && mu > 0 ? lambda / (servers * mu) : 0;
  console.log("[DEBUG] Wait time calculation:");
  console.log("  Pc (Erlang-C):", Pc);
  console.log("  rho:", rho);
  console.log("  loadFactor:", loadFactor);

  let Wq = 0;

  if (loadFactor >= 1.0) {
    // System is overloaded - use simple approximation
    console.log("  System overloaded (load >= 1.0), using approximation");
    // In overloaded systems, wait time grows exponentially
    // Cap it to reasonable maximum based on service time
    const maxReasonableWait = Math.min(120, avgServiceMinutes * 3); // Max 2 hours or 3x service time
    Wq = maxReasonableWait;
  } else if (loadFactor >= 0.95) {
    // Near capacity - use capped Erlang-C
    console.log("  Near capacity (load >= 0.95), using capped Erlang-C");
    const rawWq = (Pc * (1 / mu)) / (servers * (1 - rho));
    const maxWait = Math.min(60, avgServiceMinutes * 2); // Max 1 hour or 2x service time
    Wq = Math.min(rawWq, maxWait);
  } else {
    // Normal operation - use standard Erlang-C with reasonable caps
    console.log("  Normal operation, using standard Erlang-C");
    const rawWq = (Pc * (1 / mu)) / (servers * (1 - rho));
    console.log("  Raw Wq:", rawWq);

    // Cap wait time to reasonable maximum
    const maxWait = Math.min(30, avgServiceMinutes); // Max 30 minutes or service time
    Wq = Math.min(rawWq, maxWait);
  }

  // Final safety check
  if (!isFinite(Wq) || Wq < 0) {
    console.log("  Wq was invalid, setting to 0");
    Wq = 0;
  }

  console.log("  Final Wq (minutes):", Wq);

  // Expected arrivals and throughput
  const expectedArrivals = lambda * 60 * durationHours;
  console.log("  expectedArrivals:", expectedArrivals);

  // Calculate realistic throughput: each server can handle (60/avgServiceMinutes) patients per hour
  const patientsPerServerPerHour = 60 / avgServiceMinutes;
  const maxThroughput = servers * patientsPerServerPerHour * durationHours;

  console.log("  patientsPerServerPerHour:", patientsPerServerPerHour);
  console.log("  maxThroughput:", maxThroughput);

  // In normal operation, serve all arrivals if capacity allows
  // In overloaded systems, serve at maximum capacity
  const served =
    loadFactor >= 1.0
      ? Math.floor(maxThroughput)
      : Math.min(Math.floor(expectedArrivals), Math.floor(maxThroughput));

  console.log("  served (final):", served);

  const avgWaitMinutes = Number((isFinite(Wq) ? Wq : 0).toFixed(1));
  const overallUtilizationPct = Math.round(
    Math.min(1, expectedArrivals > 0 ? expectedArrivals / maxThroughput : rho) *
      100
  );

  return {
    summary: {
      engine: "engineA",
      avgWaitMinutes,
      patientsServed: served,
      overallUtilizationPct,
      servers,
    },
    details: {
      lambda,
      mu,
      durationHours,
      expectedArrivals,
      maxThroughput,
      rho,
      Wq,
      W: Wq + 1 / mu,
      timestamp: new Date().toISOString(),
      parameters,
    },
  };
}

module.exports = { simulate };
