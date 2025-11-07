export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type UserRole = "admin" | "operator" | "clinical" | "pharmacist";

export interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ user: User; token: string }>;
  logout: () => void;
  isLoading: boolean;
  token: string | null;
}
