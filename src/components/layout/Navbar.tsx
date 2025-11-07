import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity,
  Settings,
  Stethoscope,
  Users,
  BarChart3,
  LogOut,
  Menu,
  List,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleLinks = () => {
    if (!user) return [];

    switch (user.role) {
      case "admin":
        return [
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/audit-logs", label: "Audit Logs", icon: Settings },
        ];
      case "operator":
        return [
          { to: "/operator/simulation", label: "Simulation", icon: Activity },
          { to: "/operator/pharmacy", label: "Pharmacy", icon: List },
        ];
      case "pharmacist":
        return [
          { to: "/pharmacist/pharmacy", label: "Pharmacy", icon: Activity },
        ];
      case "clinical":
        return [
          {
            to: "/clinical/simulation-request",
            label: "New Request",
            icon: Activity,
          },
          {
            to: "/clinical/requests-list",
            label: "Requests List",
            icon: List,
          },
        ];
      default:
        return [];
    }
  };

  const roleLinks = getRoleLinks();

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold text-foreground">
                Hospital Resource System
              </span>
            </Link>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-4">
                {roleLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-semibold">
                      {user.name.charAt(0)}
                    </div>
                    <span className="hidden sm:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-muted-foreground">{user.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {user.role}
                    </div>
                  </div>
                  <DropdownMenuSeparator />

                  {/* Mobile Navigation */}
                  <div className="md:hidden">
                    {roleLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <DropdownMenuItem key={link.to} asChild>
                          <Link
                            to={link.to}
                            className="flex items-center space-x-2"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{link.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
