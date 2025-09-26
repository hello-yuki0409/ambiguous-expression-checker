import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "@/contexts/AuthProvider";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
