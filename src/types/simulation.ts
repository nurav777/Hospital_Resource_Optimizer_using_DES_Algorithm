export interface SimulationFormData {
  name: string;
  // Clinic fields
  doctors: string;
  clinicPatientsPerHour: string;
  avgServiceMinutes: string;
  avgTreatmentMinutesClinic: string;
  // OR fields
  operatingRooms: string;
  surgeriesPerHour: string;
  avgSurgeryMinutes: string;
  recoveryBeds: string;
  surgeons: string;
  avgRecoveryMinutes: string;
  // Bed fields
  beds: string;
  emergencyPatientsPerHour: string;
  avgTreatmentMinutesEmergency: string;
  emergencyPercent: string;
  // Common fields
  durationHours: string;
  notes: string;
}

export interface SimulationPayload {
  name: string;
  type: "clinic" | "or" | "bed";
  parameters: {
    [key: string]: number | string;
  };
}

export type ValidationError = {
  message: string;
  statusText?: string;
  status?: number;
};
