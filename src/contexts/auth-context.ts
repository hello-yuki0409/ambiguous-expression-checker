import { createContext } from "react";
import type { User } from "firebase/auth";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
