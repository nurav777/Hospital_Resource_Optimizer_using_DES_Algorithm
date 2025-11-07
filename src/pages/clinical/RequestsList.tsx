import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE = "http://localhost:5000";

interface SimulationRequest {
  PK: string;
  id: string;
  name: string;
  type: string;
  status: string;
  timestamp: string;
}

interface SimulationResult {
  SK: string;
  engineId: string;
  summary?: {
    avgWaitMinutes?: number;
    overallUtilizationPct?: number;
    patientsServed?: number;
  };
  timestamp?: string;
}

export default function RequestsList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<SimulationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] =
    useState<SimulationRequest | null>(null);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      console.log("[REQUESTS] Fetching requests...");
      const token = localStorage.getItem("token");
      console.log("[REQUESTS] Token:", token ? "present" : "missing");
      console.log("[REQUESTS] Current user:", user);
      console.log("[REQUESTS] User ID:", user?.id);
      console.log("[REQUESTS] User email:", user?.email);
      const url =
        statusFilter === "all"
          ? `${API_BASE}/simulations/my-requests`
          : `${API_BASE}/simulations/my-requests?status=${statusFilter}`;
      console.log("[REQUESTS] URL:", url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("[REQUESTS] Response status:", res.status);
      const data = await res.json();
      console.log("[REQUESTS] Response data:", data);
      console.log("[REQUESTS] Data type:", typeof data);
      console.log("[REQUESTS] Is array:", Array.isArray(data));
      if (!res.ok) throw new Error(data.message || "Failed to fetch requests");

      // Backend returns array directly, not { requests: [...] }
      const requestsArray = Array.isArray(data)
        ? data
        : data.requests || data || [];
      console.log("[REQUESTS] Raw requests array:", requestsArray);
      console.log("[REQUESTS] Array length:", requestsArray.length);

      // Sort by timestamp descending and take last 5
      const sorted = (requestsArray || []).sort(
        (a: SimulationRequest, b: SimulationRequest) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        }
      );

      const finalRequests = sorted.slice(0, 5);
      console.log("[REQUESTS] Final requests:", finalRequests.length);
      setRequests(finalRequests);

      if (finalRequests.length === 0) {
        toast({
          title: "Info",
          description:
            "No simulation requests found. Try creating a new request first.",
        });
      } else {
        toast({
          title: "Success",
          description: `Found ${finalRequests.length} simulation requests`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Network error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async (requestId: string) => {
    setResultsLoading(true);
    setResults([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/simulations/results/${requestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Raw results data:", data);
        console.log("Number of results:", data?.length);

        // Ensure we have valid results with proper structure
        const validResults = (data || []).filter((r: any) => {
          const hasSummary = r && r.summary;
          const hasEngineId = r && (r.engineId || r.summary?.engine);
          console.log("Result validation:", {
            hasSummary,
            hasEngineId,
            result: r,
          });
          return hasSummary && hasEngineId;
        });

        // Sort by timestamp descending and take last 5
        const sorted = validResults.sort(
          (a: SimulationResult, b: SimulationResult) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          }
        );

        // Ensure engineId is set from summary.engine if missing
        const processedResults = sorted.slice(0, 5).map((r: any) => ({
          ...r,
          engineId: r.engineId || r.summary?.engine || "unknown",
        }));

        console.log("Processed results:", processedResults);
        setResults(processedResults);
      } else {
        let errorMessage = "Failed to fetch results";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${res.status} ${res.statusText}`;
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Network error",
        variant: "destructive",
      });
    } finally {
      setResultsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const canViewResults = (status: string) => {
    const normalizedStatus = status?.toLowerCase()?.trim();
    // Allow viewing results if status is completed, successfully simulated, or done
    return (
      normalizedStatus === "completed" ||
      normalizedStatus === "successfully simulated" ||
      normalizedStatus === "done"
    );
  };

  // Check if results exist for a request by attempting to fetch them
  const checkResultsExist = async (requestId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/simulations/results/${requestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) && data.length > 0;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      case "pending":
        return "outline";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleViewResults = async (request: SimulationRequest) => {
    try {
      const requestId = (request.PK || "").replace("SIMREQ#", "") || request.id;
      const status = request.status || "";
      console.log("Viewing results for request:", requestId, request);
      console.log("Request status:", status);
      console.log("Status type:", typeof status);
      console.log("Status length:", status.length);
      console.log("Status normalized:", status.toLowerCase().trim());
      console.log("Can view results?", canViewResults(status));

      // Always try to open dialog and fetch results - let the API tell us if there are results
      setSelectedRequest(request);
      setDialogOpen(true);
      console.log("Dialog state set to open");

      // Fetch results
      await fetchResults(requestId);
    } catch (error) {
      console.error("Error in handleViewResults:", error);
      toast({
        title: "Error",
        description: "Failed to open results dialog",
        variant: "destructive",
      });
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case "clinic":
        return "Clinic";
      case "or":
        return "Operating Room";
      case "bed":
        return "Bed Allocation";
      default:
        return type || "-";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Requests List</h2>
          <p className="text-muted-foreground">
            View and track your simulation requests and their results
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={fetchRequests}
            disabled={loading}
            variant="outline"
            size="icon"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>
            {requests.length} request{requests.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading requests...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground py-8"
                      >
                        No requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => {
                      const requestId =
                        (request.PK || "").replace("SIMREQ#", "") || request.id;
                      const date = request.timestamp
                        ? new Date(request.timestamp).toLocaleDateString()
                        : "-";

                      return (
                        <TableRow key={request.PK || request.id}>
                          <TableCell className="font-medium">
                            {request.name || "Unnamed Request"}
                          </TableCell>
                          <TableCell>
                            {getRequestTypeLabel(request.type)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(request.status)}
                            >
                              {request.status || "unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {date}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log(
                                  "Button clicked for request:",
                                  request
                                );
                                console.log(
                                  "Raw status value:",
                                  JSON.stringify(request.status)
                                );
                                // Always allow clicking - we'll check for results in the dialog
                                handleViewResults(request);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Results
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Dialog - outside the table */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          console.log("Dialog onOpenChange called with:", open);
          setDialogOpen(open);
          if (!open) {
            setSelectedRequest(null);
            setResults([]);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Results: {selectedRequest?.name || "Loading..."}
            </DialogTitle>
            <DialogDescription>
              Simulation results for {selectedRequest?.type || "selected"}{" "}
              request
            </DialogDescription>
          </DialogHeader>
          {resultsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading results...
            </div>
          ) : results.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engine</TableHead>
                    <TableHead>Avg Wait (min)</TableHead>
                    <TableHead>Utilization (%)</TableHead>
                    <TableHead>Patients Served</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, idx) => (
                    <TableRow key={result.SK || `result-${idx}`}>
                      <TableCell className="font-mono">
                        {result.engineId ||
                          (result.summary as any)?.engine ||
                          "-"}
                      </TableCell>
                      <TableCell>
                        {result.summary?.avgWaitMinutes !== undefined &&
                        result.summary?.avgWaitMinutes !== null
                          ? Number(result.summary.avgWaitMinutes).toFixed(2)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {result.summary?.overallUtilizationPct !== undefined &&
                        result.summary?.overallUtilizationPct !== null
                          ? Number(
                              result.summary.overallUtilizationPct
                            ).toFixed(2)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {result.summary?.patientsServed !== undefined &&
                        result.summary?.patientsServed !== null
                          ? Number(result.summary.patientsServed)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {result.timestamp
                          ? new Date(result.timestamp).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No results available yet. Results will appear here once the
              simulation is completed.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
