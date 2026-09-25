import React from "react";
import { useLocation, useSearchParams, Navigate, useParams } from "react-router-dom";
import { nativeBridge } from "@/native-bridge/electronBridge";

interface ElectronLockdownGuardProps {
  children: React.ReactNode;
}

/**
 * ElectronLockdownGuard enforces the strict platform boundary (HLD §5, §9, §13 & LLD §14):
 * Exam security gates (/exam/:id/gates) and live attempts (/exam/:id/live) MUST ONLY execute
 * within the signed Electron lockdown client.
 *
 * Direct attempts to access protected assessment routes in a standard web browser are blocked
 * and redirected to the desktop launcher landing screen (/exam/:id/launch).
 */
export const ElectronLockdownGuard: React.FC<ElectronLockdownGuardProps> = ({ children }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { examId } = useParams<{ examId: string }>();

  // In development, allow explicit ?devBypass=true query parameter for previewing screens
  const isDev = import.meta.env.DEV;
  const hasDevBypass = isDev && searchParams.get("devBypass") === "true";

  const isAllowed = nativeBridge.isElectron || hasDevBypass;

  if (!isAllowed) {
    const isExamRoute = location.pathname.startsWith("/exam/");
    const targetExamId = isExamRoute ? (examId || location.pathname.split("/")[2] || "") : "";

    if (targetExamId && !location.pathname.endsWith("/launch")) {
      return (
        <Navigate
          to={`/exam/${targetExamId}/launch`}
          replace
          state={{
            requiresDesktopApp: true,
            attemptedPath: location.pathname,
          }}
        />
      );
    }

    if (location.pathname.startsWith("/devices")) {
      return <Navigate to="/devices" replace state={{ requiresDesktopApp: true }} />;
    }

    return <Navigate to="/student-dashboard" replace state={{ requiresDesktopApp: true }} />;
  }

  return <>{children}</>;
};
