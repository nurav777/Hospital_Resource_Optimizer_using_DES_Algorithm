import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

const API_BASE = "http://localhost:5000";

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const { user } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[USER_MGMT] Fetching users...");
      const token = localStorage.getItem("token");
      console.log("[USER_MGMT] Token:", token ? "present" : "missing");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.get(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[USER_MGMT] Response:", response.data);

      const userData = response.data.users || response.data;
      console.log("[USER_MGMT] Users data:", userData);

      if (Array.isArray(userData)) {
        setUsers(userData);
        toast({
          title: "Success",
          description: `Loaded ${userData.length} users`,
        });
      } else {
        console.error("[USER_MGMT] Invalid data format:", userData);
        setUsers([]);
        toast({
          title: "Warning",
          description: "No users found or invalid data format",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching users:", error);
      console.error("Error response:", error.response?.data);
      setUsers([]);
      toast({
        title: "Error",
        description:
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = async () => {
    try {
      if (!newUserEmail || !newUserPassword) {
        toast({
          title: "Error",
          description: "Email and password are required",
          variant: "destructive",
        });
        return;
      }

      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/users`,
        { email: newUserEmail, password: newUserPassword },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setNewUserEmail("");
      setNewUserPassword("");
      setShowCreateUser(false);
      await fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const initializeMedicines = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_BASE}/pharmacy/init`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast({
        title: "Success",
        description: "Medicines initialized successfully",
      });
    } catch (error: any) {
      console.error("Error initializing medicines:", error);
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to initialize medicines",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="space-x-2">
          <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
            <DialogTrigger asChild>
              <Button>Create User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system. They will be able to log in with
                  these credentials.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@hospital.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateUser(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createUser}>Create User</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={initializeMedicines}>
            Initialize Medicines
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
