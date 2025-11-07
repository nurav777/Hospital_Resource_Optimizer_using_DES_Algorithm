// Dynamic loading with cache clearing to ensure fresh modules
function loadEngines() {
  // Clear cache for all engine modules
  delete require.cache[require.resolve("./queueingEngine")];
  delete require.cache[require.resolve("./priorityBedAllocator")];
  delete require.cache[require.resolve("./orSchedulingEngine")];

  // Reload fresh modules
  const engineA = require("./queueingEngine");
  const engineB = require("./priorityBedAllocator");
  const engineC = require("./orSchedulingEngine");

  return {
    engineA: {
      key: "engineA",
      name: "Queueing (M/M/c) Approximation",
      impl: engineA,
    },
    engineB: { key: "engineB", name: "Priority Bed Allocator", impl: engineB },
    engineC: { key: "engineC", name: "OR Scheduling Sim", impl: engineC },
  };
}

module.exports = {
  listEngines() {
    const ENGINES = loadEngines();
    return Object.values(ENGINES).map(({ key, name }) => ({ key, name }));
  },
  getEngine(key) {
    const ENGINES = loadEngines();
    const e = ENGINES[key] || ENGINES.engineA;
    return e.impl;
  },
};
