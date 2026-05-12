import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SetPassword from "./pages/SetPassword";
import ChangePassword from "./pages/ChangePassword";
import Partidos from "./pages/Partidos";
import Tabla from "./pages/Tabla";
import Admin from "./pages/Admin";
import { HashRouter } from "react-router-dom";

function AuthRedirector() {
  const { passwordRecovery } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (passwordRecovery) {
      navigate("/set-password", { replace: true });
    }
  }, [passwordRecovery, navigate]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AuthRedirector />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Partidos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tabla"
            element={
              <ProtectedRoute>
                <Tabla />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
