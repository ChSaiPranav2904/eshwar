import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import AdminApplicationDetail from "./pages/AdminApplicationDetail";
import IdentityVerification from "./pages/IdentityVerification";
import LoanForm from "./pages/LoanForm";
import Login from "./pages/LoginPage";
import MyApplications from "./pages/MyApplications";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/:id"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminApplicationDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/verify" element={<ProtectedRoute><IdentityVerification /></ProtectedRoute>} />
          <Route path="/loan" element={<ProtectedRoute><LoanForm /></ProtectedRoute>} />
          <Route path="/my-applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
