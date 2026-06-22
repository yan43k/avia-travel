import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

export function Protected({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const auth = useAuthStore();
  if (!auth.accessToken || !auth.user) {
    return <Navigate to="/login" replace />;
  }
  if (admin && auth.user.role !== "ADMIN") {
    return <Navigate to="/cabinet" replace />;
  }
  return <>{children}</>;
}
