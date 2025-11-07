import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = "http://localhost:5000";

import {
  SimulationFormData,
  SimulationPayload,
  ValidationError,
} from "@/types/simulation";

type RequestType = "clinic" | "or" | "bed" | "";

export default function SimulationRequest() {
  const { toast } = useToast();
  const [requestType, setRequestType] = useState<RequestType>("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<SimulationFormData>({
    name: "",
    // Clinic fields
    doctors: "",
    clinicPatientsPerHour: "",
    avgServiceMinutes: "",
    avgTreatmentMinutesClinic: "",
    // OR fields
    operatingRooms: "",
    surgeriesPerHour: "",
    avgSurgeryMinutes: "",
    recoveryBeds: "",
    surgeons: "",
    avgRecoveryMinutes: "",
    // Bed fields
    beds: "",
    emergencyPatientsPerHour: "",
    avgTreatmentMinutesEmergency: "",
    emergencyPercent: "",
    // Common fields
    durationHours: "",
    notes: "",
  });

  const setField = (field: keyof SimulationFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getRequestTypeLabel = (type: RequestType) => {
    switch (type) {
      case "clinic":
        return "Clinic Request (Queueing Engine)";
      case "or":
        return "Operating Room Request (OR Scheduling Engine)";
      case "bed":
        return "Bed Allocation Request (Bed Allocation Engine)";
      default:
        return "Select Request Type";
    }
  };

  const getRequestTypeDescription = (type: RequestType) => {
    switch (type) {
      case "clinic":
        return "Queueing/clinic simulation inputs";
      case "or":
        return "OR scheduling inputs";
      case "bed":
        return "Inpatient bed inputs";
      default:
        return "Choose a request type to see relevant fields";
    }
  };

  const submit = async () => {
    if (!requestType) {
      toast({
        title: "Error",
        description: "Please select a request type",
        variant: "destructive",
      });
      return;
    }

    if (!form.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload: SimulationPayload = {
        name: form.name,
        type: requestType as "clinic" | "or" | "bed",
        parameters: {},
      };

      // Add type-specific parameters
      if (requestType === "clinic") {
        if (form.doctors) payload.parameters.doctors = Number(form.doctors);
        if (form.clinicPatientsPerHour)
          payload.parameters.clinicPatientsPerHour = Number(
            form.clinicPatientsPerHour
          );
        if (form.avgServiceMinutes)
          payload.parameters.avgServiceMinutes = Number(form.avgServiceMinutes);
        if (form.avgTreatmentMinutesClinic)
          payload.parameters.avgTreatmentMinutesClinic = Number(
            form.avgTreatmentMinutesClinic
          );
        if (form.durationHours)
          payload.parameters.durationHours = Number(form.durationHours);
      } else if (requestType === "or") {
        if (form.operatingRooms)
          payload.parameters.operatingRooms = Number(form.operatingRooms);
        if (form.surgeriesPerHour)
          payload.parameters.surgeriesPerHour = Number(form.surgeriesPerHour);
        if (form.avgSurgeryMinutes)
          payload.parameters.avgSurgeryMinutes = Number(form.avgSurgeryMinutes);
        if (form.recoveryBeds)
          payload.parameters.recoveryBeds = Number(form.recoveryBeds);
        // Engine C requires surgeons - use provided value or default to operatingRooms
        payload.parameters.surgeons = Number(
          form.surgeons || form.operatingRooms || 1
        );
        // Engine C requires avgRecoveryMinutes - default to 60 if not provided
        payload.parameters.avgRecoveryMinutes = Number(
          form.avgRecoveryMinutes || 60
        );
        if (form.durationHours)
          payload.parameters.durationHours = Number(form.durationHours);
      } else if (requestType === "bed") {
        if (form.beds) payload.parameters.beds = Number(form.beds);
        if (form.emergencyPatientsPerHour)
          payload.parameters.emergencyPatientsPerHour = Number(
            form.emergencyPatientsPerHour
          );
        if (form.avgTreatmentMinutesEmergency)
          payload.parameters.avgTreatmentMinutesEmergency = Number(
            form.avgTreatmentMinutesEmergency
          );
        if (form.emergencyPercent)
          payload.parameters.emergencyPercent = Number(form.emergencyPercent);
        if (form.durationHours)
          payload.parameters.durationHours = Number(form.durationHours);
      }

      if (form.notes) payload.parameters.notes = form.notes;

      const res = await fetch(`${API_BASE}/simulations/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast({
          title: "Success",
          description: "Request submitted successfully",
        });
        // Reset form
        setRequestType("");
        setForm({
          name: "",
          doctors: "",
          clinicPatientsPerHour: "",
          avgServiceMinutes: "",
          avgTreatmentMinutesClinic: "",
          operatingRooms: "",
          surgeriesPerHour: "",
          avgSurgeryMinutes: "",
          recoveryBeds: "",
          surgeons: "",
          avgRecoveryMinutes: "",
          beds: "",
          emergencyPatientsPerHour: "",
          avgTreatmentMinutesEmergency: "",
          emergencyPercent: "",
          durationHours: "",
          notes: "",
        });
      } else {
        let errorMessage = "Failed to submit request";
        try {
          const data = await res.json();
          errorMessage = data.message || errorMessage;
        } catch (e) {
          // If response is not JSON (e.g., HTML error page)
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      const err = error as ValidationError;
      toast({
        title: "Error",
        description: err.message || "Network error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Simulation Request
        </h2>
        <p className="text-muted-foreground">
          Submit a new simulation request by selecting a type and filling in the
          required fields
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Type</CardTitle>
          <CardDescription>
            Select the type of simulation request you want to create
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Request Type *</Label>
              <Select
                value={requestType}
                onValueChange={(value) => setRequestType(value as RequestType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">
                    Clinic Request (Queueing Engine)
                  </SelectItem>
                  <SelectItem value="or">
                    Operating Room Request (OR Scheduling Engine)
                  </SelectItem>
                  <SelectItem value="bed">
                    Bed Allocation Request (Bed Allocation Engine)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {requestType && (
        <Card>
          <CardHeader>
            <CardTitle>{getRequestTypeLabel(requestType)}</CardTitle>
            <CardDescription>
              {getRequestTypeDescription(requestType)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder={
                  requestType === "clinic"
                    ? "Clinic morning"
                    : requestType === "or"
                    ? "OR morning"
                    : "Inpatient surge"
                }
              />
            </div>

            {requestType === "clinic" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Doctors</Label>
                    <Input
                      type="number"
                      value={form.doctors}
                      onChange={(e) => setField("doctors", e.target.value)}
                      placeholder="Number of doctors"
                    />
                  </div>
                  <div>
                    <Label>Clinic arrivals / hour</Label>
                    <Input
                      type="number"
                      value={form.clinicPatientsPerHour}
                      onChange={(e) =>
                        setField("clinicPatientsPerHour", e.target.value)
                      }
                      placeholder="Patients per hour"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Avg consult (min)</Label>
                    <Input
                      type="number"
                      value={form.avgServiceMinutes}
                      onChange={(e) =>
                        setField("avgServiceMinutes", e.target.value)
                      }
                      placeholder="Average consultation time"
                    />
                  </div>
                  <div>
                    <Label>Registration (min)</Label>
                    <Input
                      type="number"
                      value={form.avgTreatmentMinutesClinic}
                      onChange={(e) =>
                        setField("avgTreatmentMinutesClinic", e.target.value)
                      }
                      placeholder="Registration time"
                    />
                  </div>
                </div>
              </>
            )}

            {requestType === "or" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Operating rooms</Label>
                    <Input
                      type="number"
                      value={form.operatingRooms}
                      onChange={(e) =>
                        setField("operatingRooms", e.target.value)
                      }
                      placeholder="Number of ORs"
                    />
                  </div>
                  <div>
                    <Label>Surgeries / hour</Label>
                    <Input
                      type="number"
                      value={form.surgeriesPerHour}
                      onChange={(e) =>
                        setField("surgeriesPerHour", e.target.value)
                      }
                      placeholder="Surgeries per hour"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Avg surgery (min)</Label>
                    <Input
                      type="number"
                      value={form.avgSurgeryMinutes}
                      onChange={(e) =>
                        setField("avgSurgeryMinutes", e.target.value)
                      }
                      placeholder="Average surgery duration"
                    />
                  </div>
                  <div>
                    <Label>Recovery beds</Label>
                    <Input
                      type="number"
                      value={form.recoveryBeds}
                      onChange={(e) => setField("recoveryBeds", e.target.value)}
                      placeholder="Number of recovery beds"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Surgeons</Label>
                    <Input
                      type="number"
                      value={form.surgeons}
                      onChange={(e) => setField("surgeons", e.target.value)}
                      placeholder="Number of surgeons (defaults to ORs)"
                    />
                  </div>
                  <div>
                    <Label>Avg recovery (min)</Label>
                    <Input
                      type="number"
                      value={form.avgRecoveryMinutes}
                      onChange={(e) =>
                        setField("avgRecoveryMinutes", e.target.value)
                      }
                      placeholder="Average recovery time (default: 60)"
                    />
                  </div>
                </div>
              </>
            )}

            {requestType === "bed" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Available beds</Label>
                    <Input
                      type="number"
                      value={form.beds}
                      onChange={(e) => setField("beds", e.target.value)}
                      placeholder="Total available beds"
                    />
                  </div>
                  <div>
                    <Label>Arrivals / hour</Label>
                    <Input
                      type="number"
                      value={form.emergencyPatientsPerHour}
                      onChange={(e) =>
                        setField("emergencyPatientsPerHour", e.target.value)
                      }
                      placeholder="Patient arrivals per hour"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Avg LOS (days)</Label>
                    <Input
                      type="number"
                      value={form.avgTreatmentMinutesEmergency}
                      onChange={(e) =>
                        setField("avgTreatmentMinutesEmergency", e.target.value)
                      }
                      placeholder="Average length of stay in days"
                    />
                  </div>
                  <div>
                    <Label>Emergency %</Label>
                    <Input
                      type="number"
                      value={form.emergencyPercent}
                      onChange={(e) =>
                        setField("emergencyPercent", e.target.value)
                      }
                      placeholder="Percentage of emergency patients"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label>Duration (hours)</Label>
              <Input
                type="number"
                value={form.durationHours}
                onChange={(e) => setField("durationHours", e.target.value)}
                placeholder="Simulation duration in hours"
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Additional notes (optional)"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
