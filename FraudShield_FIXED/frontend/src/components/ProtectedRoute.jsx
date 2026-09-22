import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user) {
    const userRole = user.roles || '';
    if (!userRole.includes(requiredRole)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;