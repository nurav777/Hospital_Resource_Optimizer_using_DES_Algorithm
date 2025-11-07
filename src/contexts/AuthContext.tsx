import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { User, AuthContextType, UserRole } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = "http://localhost:5000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored token on app load
    const token = localStorage.getItem("token");
    if (token) {
      setToken(token);
      // TODO: Validate token with backend
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const { token, user: userData } = data;
        // Map backend role (case-insensitive) to frontend role
        const roleMapLower: Record<string, UserRole> = {
          admin: "admin",
          operator: "operator",
          clinical: "clinical",
          clinicaluser: "clinical",
          pharmacist: "pharmacist",
        };

        const backendRole = (userData.role || "").toString().toLowerCase();

        const mappedUser: User = {
          id: userData.id,
          email: userData.email,
          name: userData.email.split("@")[0], // Simple name from email
          // default to 'clinical' if unknown
          role: roleMapLower[backendRole] || "clinical",
        };

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(mappedUser));
        setUser(mappedUser);
        setToken(token);

        toast({
          title: "Login successful",
          description: `Welcome back!`,
        });

        return { user: mappedUser, token };
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid email or password",
          variant: "destructive",
        });
        throw new Error(data.message || "Invalid credentials");
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Network error or invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
