import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    } else {
      navigate("/");
    }
  }

  return (
    <div
      className="min-h-screen bg-metal-950 flex items-center justify-center px-4"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, #2a0000 0%, #080808 65%)",
      }}
    >
      <div className="bg-metal-900 border border-metal-700 rounded-xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="PejiCrew"
            className="h-20 w-20 object-contain mx-auto mb-4"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <h1 className="font-metal text-4xl text-white tracking-widest">
            PEJICREW
          </h1>
          <p className="font-display text-sm text-blood-400 tracking-widest uppercase mt-1">
            La Quiniela
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-display font-semibold text-metal-300 mb-1 tracking-widest uppercase">
              Correo electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600 placeholder-metal-500"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-display font-semibold text-metal-300 mb-1 tracking-widest uppercase">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600 placeholder-metal-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-blood-900/40 border border-blood-700 text-blood-300 text-sm rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blood-700 hover:bg-blood-600 disabled:opacity-50 text-white font-display font-semibold py-2.5 rounded tracking-widest uppercase transition-colors text-sm mt-2"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <div className="text-center pt-1">
            <Link
              to="/forgot-password"
              className="text-sm text-metal-400 hover:text-blood-400 transition-colors font-display tracking-wide"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
