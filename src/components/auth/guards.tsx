import { Navigate, useLocation } from "react-router-dom";
import { useDb } from "@/lib/db";
import type { Role } from "@/lib/types";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const location = useLocation();
  if (!db.session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const db = useDb();
  if (!db.session) return <Navigate to="/login" replace />;
  if (db.session.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
