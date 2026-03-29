import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { USER_ROLES } from "../../api/auth";
import LoginForm from "./LoginForm";
import LoadingSpinner from "../common/LoadingSpinner";

const ProtectedRoute = ({
  children,
  requiredRole = USER_ROLES.VIEWER,
  fallback = null,
}) => {
  const { user, userData, loading, hasPermission } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginForm />;
  }

  if (!hasPermission(requiredRole)) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-danger-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-danger-600 font-bold text-xl">!</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required role: {requiredRole} | Your role:{" "}
              {userData?.role || "Unknown"}
            </p>
          </div>
        </div>
      )
    );
  }

  return children;
};

export default ProtectedRoute;
