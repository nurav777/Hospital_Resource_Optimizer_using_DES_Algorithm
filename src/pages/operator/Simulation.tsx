import { useEffect, useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Clock,
  Users,
  RefreshCw,
  Settings,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  SimulationRequest,
  SimulationEngine,
  SimulationResult,
  APIError,
} from "@/types/simulation-request";

const API_BASE = "http://localhost:5000";

export default function Simulation() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const [requests, setRequests] = useState<SimulationRequest[]>([]);
  const [selected, setSelected] = useState<SimulationRequest | null>(null);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [engines, setEngines] = useState<SimulationEngine[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      // request both pending and processing so operator sees in-progress items
      const res = await fetch(
        `${API_BASE}/simulations/requests?status=pending,processing`,
        {
          headers: { Authorization: `Bearer ${token || ""}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      // Sort by timestamp descending and take last 5
      const sorted = (data || []).sort(
        (a: SimulationRequest, b: SimulationRequest) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        }
      );
      setRequests(sorted.slice(0, 5));
    } catch (error) {
      const e = error as APIError;
      toast({
        title: "Load failed",
        description: e.message,
        variant: "destructive",
      });
    }
  }, [toast, setRequests]);
  const processRequest = async (reqItem: SimulationRequest) => {
    setIsRunning(true);
    setProgress(0);
    const token = localStorage.getItem("token");
    const interval = setInterval(
      () => setProgress((p) => (p >= 95 ? 95 : p + 5)),
      400
    );
    try {
      const requestId = (reqItem.PK || "").replace("SIMREQ#", "") || reqItem.id;
      const body = selectedEngine ? { engine: selectedEngine } : {};
      const res = await fetch(`${API_BASE}/simulations/process/${requestId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (res.status === 202) {
        // background processing started — poll for results
        toast({
          title: "Processing started",
          description: "Running engine(s) in background",
        });
        setSelected(reqItem);
        // poll for results
        const start = Date.now();
        const timeout = 120000; // 2 minutes
        let polled = false;
        while (Date.now() - start < timeout) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const rid = requestId;
            const rres = await fetch(`${API_BASE}/simulations/results/${rid}`, {
              headers: { Authorization: `Bearer ${token || ""}` },
            });
            const rdata = await rres.json();
            if (rres.ok && Array.isArray(rdata) && rdata.length) {
              setResults(rdata);
              polled = true;
              toast({
                title: "Processing complete",
                description: "Results are available",
              });
              break;
            }
          } catch (pollErr) {
            // ignore and continue polling
          }
        }
        if (!polled) {
          toast({
            title: "Timeout",
            description: "Processing did not finish in time",
            variant: "destructive",
          });
        }
        await loadRequests();
      } else {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Process failed");
        toast({
          title: "Processed",
          description: `Best engine: ${data.bestEngine}`,
        });
        setSelected(reqItem);
        await loadResultsForRequest(requestId);
        await loadRequests();
      }
    } catch (error) {
      const e = error as APIError;
      toast({
        title: "Process failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setIsRunning(false);
        setProgress(0);
      }, 600);
    }
  };

  const loadResultsForRequest = useCallback(
    async (requestId: string) => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE}/simulations/results/${requestId}`,
          {
            headers: { Authorization: `Bearer ${token || ""}` },
          }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load results");
        // Sort by timestamp descending and take last 5
        const sorted = (data || []).sort(
          (a: SimulationResult, b: SimulationResult) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          }
        );
        setResults(sorted.slice(0, 5));
      } catch (error) {
        const e = error as APIError;
        toast({
          title: "Failed to load results",
          description: e.message,
          variant: "destructive",
        });
      }
    },
    [toast, setResults]
  );

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    // fetch available engines for operator to choose
    const loadEngines = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/simulations/engines`, {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const data = await res.json();
        if (res.ok) setEngines(data);
      } catch (err) {
        // ignore
      }
    };
    loadEngines();
  }, []);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-bold tracking-tight">
            Simulation Management
          </h3>
          <p className="text-muted-foreground">
            Configure and run hospital resource optimization simulations
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending Simulation Requests</CardTitle>
            <CardDescription>Submitted by clinical users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between mb-2">
              <Button variant="secondary" onClick={loadRequests}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              {isRunning && (
                <div className="flex items-center text-sm">
                  <Clock className="mr-2 h-4 w-4 animate-spin" /> {progress}%
                </div>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.PK}>
                      <TableCell className="font-mono">{r.PK}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="font-mono">
                        {r.type || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge>{r.status}</Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="sm"
                          onClick={async () => {
                            setSelected(r);
                            const requestId =
                              (r.PK || "").replace("SIMREQ#", "") || r.id;
                            await loadResultsForRequest(requestId);
                          }}
                        >
                          <Settings className="mr-2 h-4 w-4" /> View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => processRequest(r)}
                          disabled={isRunning}
                        >
                          <Play className="mr-2 h-4 w-4" /> Process
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!requests.length && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No pending requests
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Selected Request
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {selected ? (
                <div className="text-sm space-y-2">
                  <div className="font-medium">{selected.name}</div>
                  <div className="text-muted-foreground">{selected.PK}</div>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(selected.parameters, null, 2)}
                  </pre>
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      Choose engine to run:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={
                          selectedEngine === null ? "default" : "outline"
                        }
                        onClick={() => setSelectedEngine(null)}
                      >
                        All Engines
                      </Button>
                      {engines.map((e) => (
                        <Button
                          key={e.key}
                          size="sm"
                          variant={
                            selectedEngine === e.key ? "default" : "outline"
                          }
                          onClick={() => setSelectedEngine(e.key)}
                        >
                          {e.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Pick a request to view parameters
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results for Selected Request</CardTitle>
          <CardDescription>All engine outputs</CardDescription>
        </CardHeader>
        <CardContent>
          {selected ? (
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
                  {results.map((r, idx) => (
                    <TableRow key={r.SK || `result-${idx}`}>
                      <TableCell className="font-mono">
                        <TableCell className="font-mono">
                          {r.engineId || r.summary?.engine || "-"}
                        </TableCell>
                      </TableCell>
                      <TableCell>
                        {r.summary?.avgWaitMinutes !== undefined &&
                        r.summary?.avgWaitMinutes !== null
                          ? Number(r.summary.avgWaitMinutes).toFixed(2)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {r.summary?.overallUtilizationPct !== undefined &&
                        r.summary?.overallUtilizationPct !== null
                          ? Number(r.summary.overallUtilizationPct).toFixed(2)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {r.summary?.patientsServed !== undefined &&
                        r.summary?.patientsServed !== null
                          ? Number(r.summary.patientsServed)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.timestamp
                          ? new Date(r.timestamp).toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!results.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground"
                      >
                        No results yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Select and process a request to see results.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
