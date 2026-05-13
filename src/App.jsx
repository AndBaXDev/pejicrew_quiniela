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
        <footer className="w-full text-center py-3 text-sm text-gray-500 border-t border-gray-200 mt-auto">
          © {new Date().getFullYear()} Todos los derechos reservados. Creado por{" "}
          <span className="font-semibold text-gray-700">WebClouds</span>
          <br />
          Contacto para desarrollos:{" "}
          <a
            href="mailto:asolano.sp@outlook.com"
            className="underline hover:text-gray-700"
          >
            asolano.sp@outlook.com
          </a>{" "}
          · 8747-1560
        </footer>
      </HashRouter>
    </AuthProvider>
  );
}
