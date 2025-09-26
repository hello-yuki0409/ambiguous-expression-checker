// router定義
import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Editor from "./pages/Editor";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import RequireAuth from "./components/RequireAuth";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <Editor /> },
      { path: "/history", element: <History /> },
      { path: "/dashboard", element: <Dashboard /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
