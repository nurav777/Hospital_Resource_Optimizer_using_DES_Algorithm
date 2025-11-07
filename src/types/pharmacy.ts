export interface Medicine {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  needsReplenishment: boolean;
  lastReorderDate?: string;
}

export interface MedicineReorder {
  id: string;
  medName: string;
  requestedBy: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  suggestedAmount: number;
  approvedAmount?: number;
  cost?: number;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PharmacyAPIError {
  message: string;
  statusText?: string;
  status?: number;
}
