import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { Navbar } from "@/components/layout/Navbar";

// Pages
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

// Admin pages
import UserManagement from "./pages/admin/UserManagement";
import AuditLogs from "./pages/admin/AuditLogs";

// Operator pages
import Simulation from "./pages/operator/Simulation";
import PharmacyRequests from "./pages/operator/PharmacyRequests";

// Clinical pages
import SimulationRequest from "./pages/clinical/SimulationRequest";
import RequestsList from "./pages/clinical/RequestsList";
import PharmacistPage from "./pages/pharmacist/Pharmacy";

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {user && <Navbar />}
      <main className={user ? "flex" : ""}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes - Dashboard removed */}

          {/* Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <UserManagement />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <AuditLogs />
              </RoleGuard>
            }
          />

          {/* Operator Routes */}
          <Route
            path="/operator/simulation"
            element={
              <RoleGuard allowedRoles={["operator"]}>
                <Simulation />
              </RoleGuard>
            }
          />
          <Route
            path="/operator/pharmacy"
            element={
              <RoleGuard allowedRoles={["operator"]}>
                <PharmacyRequests />
              </RoleGuard>
            }
          />

          {/* Clinical Routes */}
          <Route
            path="/clinical/simulation-request"
            element={
              <RoleGuard allowedRoles={["clinical"]}>
                <SimulationRequest />
              </RoleGuard>
            }
          />
          <Route
            path="/clinical/requests-list"
            element={
              <RoleGuard allowedRoles={["clinical"]}>
                <RequestsList />
              </RoleGuard>
            }
          />

          <Route
            path="/pharmacist/pharmacy"
            element={
              <RoleGuard allowedRoles={["pharmacist"]}>
                <PharmacistPage />
              </RoleGuard>
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={`/${
                    user.role === "admin"
                      ? "admin/users"
                      : user.role === "operator"
                      ? "operator/simulation"
                      : user.role === "clinical"
                      ? "clinical/simulation-request"
                      : "pharmacist/pharmacy"
                  }`}
                  replace
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
