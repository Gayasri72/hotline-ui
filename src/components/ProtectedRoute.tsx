import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean;
  fallback?: string;
}
export default function ProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
  fallback = "/login",
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 mt-3 text-sm">Checking authentication...</p>
        </div>
      </div>
    );
  }
  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallback} replace />;
  }
  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-4">You don't have permission to access this page.</p>
          <p className="text-xs text-slate-600">Required: {requiredPermission}</p>
        </div>
      </div>
    );
  }
  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);
    if (!hasAccess) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-slate-400">You don't have the required permissions.</p>
          </div>
        </div>
      );
    }
  }
  return <>{children}</>;
}