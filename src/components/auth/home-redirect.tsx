import { Navigate } from "react-router-dom";
import { useDb } from "@/lib/db";
import Dashboard from "@/pages/Dashboard";

/** Página inicial: sócios veem o Dashboard; funcionária cai no Estoque. */
export function HomeRedirect() {
  const db = useDb();
  if (db.session?.role === "owner") return <Dashboard />;
  return <Navigate to="/estoque" replace />;
}
