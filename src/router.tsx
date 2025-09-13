// router定義
import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import Editor from "./pages/Editor";
import History from "./pages/History";
import Dashboard from "./pages/Dashboard";

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Editor /> },
      { path: "/history", element: <History /> },
      { path: "/dashboard", element: <Dashboard /> },
    ],
  },
]);
