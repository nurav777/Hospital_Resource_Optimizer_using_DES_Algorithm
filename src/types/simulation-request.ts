export interface SimulationRequest {
  id: string;
  PK?: string; // DynamoDB primary key
  SK?: string; // DynamoDB sort key
  name: string;
  type: "clinic" | "or" | "bed";
  parameters: Record<string, number | string>;
  status: "pending" | "processing" | "completed";
  requestedBy: string;
  requestedAt: string;
  results?: SimulationResult[];
  summary?: SimulationSummary;
  engineId?: string;
  timestamp?: string;
}

export interface SimulationResult {
  id?: string;
  SK?: string;
  engineId?: string;
  timestamp?: string;
  data: {
    waitTimes?: number[];
    utilization?: number[];
    throughput?: number;
  };
  summary?: {
    engine?: string;
    avgWaitMinutes?: number;
    overallUtilizationPct?: number;
    patientsServed?: number;
  };
}

export interface SimulationSummary {
  engine: string;
  avgWaitMinutes?: number;
  maxWaitTime?: number;
  overallUtilizationPct?: number;
  patientsServed?: number;
}

export interface SimulationEngine {
  id: string;
  key: string;
  name: string;
  description: string;
  type: "clinic" | "or" | "bed";
  version: string;
}

export interface APIError {
  message: string;
  statusText?: string;
  status?: number;
}
