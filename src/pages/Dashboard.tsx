import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { Medicine } from "@/types/pharmacy";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const utilizationData = [
  { department: "Emergency", utilization: 85, capacity: 100 },
  { department: "ICU", utilization: 92, capacity: 50 },
  { department: "Surgery", utilization: 78, capacity: 25 },
  { department: "General", utilization: 65, capacity: 200 },
];

const waitTimeData = [
  { time: "6AM", emergency: 15, general: 45 },
  { time: "9AM", emergency: 25, general: 60 },
  { time: "12PM", emergency: 35, general: 75 },
  { time: "3PM", emergency: 30, general: 55 },
  { time: "6PM", emergency: 40, general: 80 },
  { time: "9PM", emergency: 20, general: 35 },
];

const statusData = [
  { name: "Available", value: 45, color: "#10b981" },
  { name: "Occupied", value: 35, color: "#f59e0b" },
  { name: "Maintenance", value: 20, color: "#ef4444" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    activePatients: 0,
    bedOccupancy: 0,
    avgWaitTime: 0,
    systemStatus: "Loading...",
    recentSimulations: [],
    pendingReorders: 0,
    auditLogs: [],
    myRequests: [],
  });
  const [loading, setLoading] = useState(true);

  const API_BASE = "http://localhost:5000";

  const loadMedicines = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/pharmacy/medicines`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || data.message || "Failed to load medicines"
        );
      type RawMed = {
        name?: string;
        stock?: number;
        quantity?: number;
        id?: string;
        PK?: string;
        updatedAt?: string;
        timestamp?: string;
        threshold?: number;
        lastReorderDate?: string;
      };
      const raw = data.medicines || ([] as RawMed[]);
      const mapped: Medicine[] = (raw || []).map((i: RawMed) => {
        const qty = Number(i.stock ?? i.quantity ?? 0);
        return {
          id: i.id || i.PK || i.name,
          name: i.name || "",
          quantity: qty,
          threshold: i.threshold ?? 40,
          needsReplenishment: qty < 20,
          lastReorderDate: i.updatedAt || i.timestamp || i.lastReorderDate,
        };
      });
      setMedicines(mapped || []);
    } catch (err) {
      // silently ignore here; component is informational
      console.error("Failed to load medicines", err);
    }
  };

  const loadRoleSpecificData = useCallback(async () => {
    if (!user?.role) return;

    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token || ""}` };

    try {
      switch (user.role) {
        case "admin":
          await loadAdminData(headers);
          break;
        case "operator":
          await loadOperatorData(headers);
          break;
        case "clinical":
          await loadClinicalData(headers);
          break;
        case "pharmacist":
          await loadPharmacistData(headers);
          break;
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  const loadAdminData = async (headers: any) => {
    const [auditRes, medicinesRes] = await Promise.all([
      fetch(`${API_BASE}/reports/audit/logs`, { headers }),
      fetch(`${API_BASE}/pharmacy/medicines`, { headers }),
    ]);

    const auditData = auditRes.ok ? await auditRes.json() : { logs: [] };
    const medicinesData = medicinesRes.ok
      ? await medicinesRes.json()
      : { medicines: [] };

    setDashboardStats((prev) => ({
      ...prev,
      auditLogs: auditData.logs?.slice(0, 5) || [],
      systemStatus: "Operational",
    }));

    if (medicinesData.medicines) {
      const mapped = medicinesData.medicines.map((i: any) => ({
        id: i.id || i.PK || i.name,
        name: i.name || "",
        quantity: Number(i.stock ?? i.quantity ?? 0),
        threshold: i.threshold ?? 40,
        needsReplenishment: Number(i.stock ?? i.quantity ?? 0) < 20,
        lastReorderDate: i.updatedAt || i.timestamp || i.lastReorderDate,
      }));
      setMedicines(mapped);
    }
  };

  const loadOperatorData = async (headers: any) => {
    const [requestsRes, reordersRes] = await Promise.all([
      fetch(`${API_BASE}/simulations/requests`, { headers }),
      fetch(`${API_BASE}/pharmacy/reorders?status=pending`, { headers }),
    ]);

    const requestsData = requestsRes.ok
      ? await requestsRes.json()
      : { requests: [] };
    const reordersData = reordersRes.ok
      ? await reordersRes.json()
      : { reorders: [] };

    setDashboardStats((prev) => ({
      ...prev,
      recentSimulations: requestsData.requests?.slice(0, 5) || [],
      pendingReorders: reordersData.reorders?.length || 0,
      systemStatus: "Operational",
    }));
  };

  const loadClinicalData = async (headers: any) => {
    const [requestsRes, patientsRes] = await Promise.all([
      fetch(`${API_BASE}/simulations/my-requests`, { headers }),
      fetch(`${API_BASE}/clinical/patients`, { headers }),
    ]);

    const requestsData = requestsRes.ok
      ? await requestsRes.json()
      : { requests: [] };
    const patientsData = patientsRes.ok
      ? await patientsRes.json()
      : { patients: [] };

    setDashboardStats((prev) => ({
      ...prev,
      myRequests: requestsData.requests?.slice(0, 5) || [],
      activePatients: patientsData.patients?.length || 0,
      systemStatus: "Ready",
    }));
  };

  const loadPharmacistData = async (headers: any) => {
    const [medicinesRes, reordersRes] = await Promise.all([
      fetch(`${API_BASE}/pharmacy/medicines`, { headers }),
      fetch(`${API_BASE}/pharmacy/reorders?status=pending`, { headers }),
    ]);

    const medicinesData = medicinesRes.ok
      ? await medicinesRes.json()
      : { medicines: [] };
    const reordersData = reordersRes.ok
      ? await reordersRes.json()
      : { reorders: [] };

    if (medicinesData.medicines) {
      const mapped = medicinesData.medicines.map((i: any) => ({
        id: i.id || i.PK || i.name,
        name: i.name || "",
        quantity: Number(i.stock ?? i.quantity ?? 0),
        threshold: i.threshold ?? 40,
        needsReplenishment: Number(i.stock ?? i.quantity ?? 0) < 20,
        lastReorderDate: i.updatedAt || i.timestamp || i.lastReorderDate,
      }));
      setMedicines(mapped);
    }

    setDashboardStats((prev) => ({
      ...prev,
      pendingReorders: reordersData.reorders?.length || 0,
      systemStatus: "Inventory Ready",
    }));
  };

  useEffect(() => {
    void loadRoleSpecificData();
  }, [loadRoleSpecificData]);

  const getWelcomeMessage = () => {
    switch (user?.role) {
      case "admin":
        return "Monitor system performance and manage users";
      case "operator":
        return "Run simulations and analyze resource optimization";
      case "clinical":
        return "View assigned patients and submit feedback";
      case "pharmacist":
        return "Manage medicine inventory and reorder requests";
      default:
        return "Welcome to the Hospital Resource System";
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Medicine alerts - only for pharmacist and admin */}
      {medicines.length > 0 && user?.role === "pharmacist" && (
        <div className="space-y-2">
          {medicines.some((m) => Number(m.quantity) < 20) && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-red-600" />
                <div>
                  <div className="font-medium text-red-700">
                    Medicine stock alert
                  </div>
                  <div className="text-sm text-red-600">
                    One or more medicines are critically low (less than 20
                    units). Please request replenishment.
                  </div>
                </div>
              </div>
            </div>
          )}

          {medicines.some(
            (m) => Number(m.quantity) >= 20 && Number(m.quantity) < 40
          ) && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="text-yellow-600" />
                <div>
                  <div className="font-medium text-yellow-700">
                    Medicine stock warning
                  </div>
                  <div className="text-sm text-yellow-600">
                    One or more medicines are running low (below 40 units).
                    Consider requesting replenishment soon.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* brief list */}
          <div className="grid grid-cols-3 gap-2">
            {medicines.map((m) => (
              <div key={m.name} className="rounded-md border p-2 text-sm">
                <div className="font-medium">{m.name}</div>
                <div>Stock: {m.quantity}</div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {m.lastReorderDate || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name}
          </h2>
          <p className="text-muted-foreground">{getWelcomeMessage()}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="capitalize">
            {user?.role}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Patients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bed Occupancy</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.2%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32 min</div>
            <p className="text-xs text-success">-8 min from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">Optimal</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>
              {user?.role === "admin"
                ? "Recent Audit Logs"
                : user?.role === "operator"
                ? "Recent Simulation Requests"
                : user?.role === "clinical"
                ? "My Recent Requests"
                : user?.role === "pharmacist"
                ? "Medicine Inventory Status"
                : "System Overview"}
            </CardTitle>
            <CardDescription>
              {user?.role === "admin"
                ? "Latest system activities and user actions"
                : user?.role === "operator"
                ? "Pending and recent simulation requests"
                : user?.role === "clinical"
                ? "Your submitted simulation requests"
                : user?.role === "pharmacist"
                ? "Current stock levels and alerts"
                : "Real-time system data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <div className="space-y-4 h-[300px] overflow-y-auto">
                {user?.role === "admin" &&
                  dashboardStats.auditLogs.map((log: any, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">{log.action}</div>
                        <div className="text-sm text-muted-foreground">
                          User: {log.user}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}

                {user?.role === "operator" &&
                  dashboardStats.recentSimulations.map((req: any, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {req.name || "Simulation Request"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Type: {req.type}
                        </div>
                      </div>
                      <Badge
                        variant={
                          req.status === "pending" ? "destructive" : "default"
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                  ))}

                {user?.role === "clinical" &&
                  dashboardStats.myRequests.map((req: any, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">
                          {req.name || "My Request"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Type: {req.type}
                        </div>
                      </div>
                      <Badge
                        variant={
                          req.status === "completed" ? "default" : "secondary"
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                  ))}

                {user?.role === "pharmacist" &&
                  medicines.map((med, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <div className="font-medium">{med.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Stock: {med.quantity} units
                        </div>
                      </div>
                      <Badge
                        variant={
                          med.needsReplenishment ? "destructive" : "default"
                        }
                      >
                        {med.needsReplenishment ? "Low Stock" : "OK"}
                      </Badge>
                    </div>
                  ))}

                {((user?.role === "admin" &&
                  dashboardStats.auditLogs.length === 0) ||
                  (user?.role === "operator" &&
                    dashboardStats.recentSimulations.length === 0) ||
                  (user?.role === "clinical" &&
                    dashboardStats.myRequests.length === 0) ||
                  (user?.role === "pharmacist" && medicines.length === 0)) && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {user?.role === "pharmacist" ? "Stock Alerts" : "Quick Actions"}
            </CardTitle>
            <CardDescription>
              {user?.role === "pharmacist"
                ? "Medicine inventory alerts"
                : "Common tasks for your role"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.role === "pharmacist" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Critical Stock</span>
                  <Badge variant="destructive">
                    {medicines.filter((m) => m.quantity < 10).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Low Stock</span>
                  <Badge variant="secondary">
                    {
                      medicines.filter(
                        (m) => m.quantity >= 10 && m.quantity < 20
                      ).length
                    }
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Normal Stock</span>
                  <Badge variant="default">
                    {medicines.filter((m) => m.quantity >= 20).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Reorders</span>
                  <Badge variant="outline">
                    {dashboardStats.pendingReorders}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 border rounded cursor-pointer hover:bg-muted">
                  <div className="font-medium text-sm">
                    {user?.role === "admin"
                      ? "View All Users"
                      : user?.role === "operator"
                      ? "Process Requests"
                      : user?.role === "clinical"
                      ? "Submit New Request"
                      : "Dashboard Overview"}
                  </div>
                </div>
                <div className="p-3 border rounded cursor-pointer hover:bg-muted">
                  <div className="font-medium text-sm">
                    {user?.role === "admin"
                      ? "System Reports"
                      : user?.role === "operator"
                      ? "View Results"
                      : user?.role === "clinical"
                      ? "View My Requests"
                      : "Settings"}
                  </div>
                </div>
                <div className="p-3 border rounded cursor-pointer hover:bg-muted">
                  <div className="font-medium text-sm">
                    {user?.role === "admin"
                      ? "Audit Logs"
                      : user?.role === "operator"
                      ? "Pharmacy Requests"
                      : user?.role === "clinical"
                      ? "Patient Feedback"
                      : "Help"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>
              {user?.role === "admin"
                ? "System Overview"
                : user?.role === "operator"
                ? "Simulation Engine Status"
                : user?.role === "clinical"
                ? "My Activity Summary"
                : user?.role === "pharmacist"
                ? "Inventory Overview"
                : "Dashboard Summary"}
            </CardTitle>
            <CardDescription>
              {user?.role === "admin"
                ? "Complete system health and activity overview"
                : user?.role === "operator"
                ? "Current simulation processing status"
                : user?.role === "clinical"
                ? "Your recent activity and request status"
                : user?.role === "pharmacist"
                ? "Complete medicine inventory status"
                : "Role-specific information"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[200px]">
                <div className="text-muted-foreground">Loading overview...</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {user?.role === "admin"
                      ? dashboardStats.auditLogs.length
                      : user?.role === "operator"
                      ? dashboardStats.recentSimulations.length
                      : user?.role === "clinical"
                      ? dashboardStats.myRequests.length
                      : medicines.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user?.role === "admin"
                      ? "Recent Actions"
                      : user?.role === "operator"
                      ? "Active Requests"
                      : user?.role === "clinical"
                      ? "My Requests"
                      : "Total Medicines"}
                  </div>
                </div>

                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {user?.role === "pharmacist"
                      ? medicines.filter((m) => !m.needsReplenishment).length
                      : "98%"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user?.role === "pharmacist"
                      ? "Normal Stock"
                      : "System Health"}
                  </div>
                </div>

                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-yellow-600">
                    {user?.role === "pharmacist"
                      ? medicines.filter(
                          (m) => m.quantity >= 10 && m.quantity < 20
                        ).length
                      : user?.role === "operator"
                      ? dashboardStats.pendingReorders
                      : "5"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user?.role === "pharmacist"
                      ? "Low Stock"
                      : user?.role === "operator"
                      ? "Pending Orders"
                      : "Warnings"}
                  </div>
                </div>

                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-red-600">
                    {user?.role === "pharmacist"
                      ? medicines.filter((m) => m.quantity < 10).length
                      : "0"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {user?.role === "pharmacist" ? "Critical Stock" : "Errors"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
