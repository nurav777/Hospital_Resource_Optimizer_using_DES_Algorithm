import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    const roleRedirect =
      user.role === "admin"
        ? "/admin/users"
        : user.role === "operator"
        ? "/operator/simulation"
        : user.role === "clinical"
        ? "/clinical/simulation-request"
        : "/pharmacist/pharmacy";
    return <Navigate to={roleRedirect} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await login(email, password);
      const roleRedirect =
        result?.user?.role === "admin"
          ? "/admin/users"
          : result?.user?.role === "operator"
          ? "/operator/simulation"
          : result?.user?.role === "clinical"
          ? "/clinical/simulation-request"
          : "/pharmacist/pharmacy";
      navigate(roleRedirect);
    } catch (error) {
      // Error handled in AuthContext
    }
  };

  const demoUsers = [
    {
      email: "admin@hospital.com",
      password: "admin123",
      role: "Administrator",
    },
    {
      email: "operator@hospital.com",
      password: "operator123",
      role: "Operator",
    },
    {
      email: "clinical@hospital.com",
      password: "clinical123",
      role: "Clinical User",
    },
    {
      email: "pharmacist@hospital.com",
      password: "pharmacy123",
      role: "Pharmacist",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Activity className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Hospital Resource System
          </h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the hospital resource
              optimization system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Accounts</CardTitle>
            <CardDescription>
              Click any account below to autofill credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoUsers.map((user) => (
              <Button
                key={user.email}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setEmail(user.email);
                  setPassword(user.password);
                }}
              >
                <div className="text-left">
                  <div className="font-medium">{user.role}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
