import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ChangePassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      setError("No se pudo actualizar la contraseña. Intenta de nuevo.");
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
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
          <div className="text-5xl mb-3">🔑</div>
          <h1 className="font-metal text-3xl text-white tracking-widest">
            Cambiar contraseña
          </h1>
          <p className="font-display text-sm text-blood-400 tracking-widest uppercase mt-1">
            Actualiza tu contraseña de acceso
          </p>
        </div>

        {success ? (
          <div className="bg-metal-800 border border-blood-800 text-blood-300 text-sm rounded-lg px-4 py-3 text-center font-display tracking-wide">
            ✅ Contraseña actualizada correctamente. Redirigiendo...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-display font-semibold text-metal-300 mb-1 tracking-widest uppercase">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600 placeholder-metal-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-display font-semibold text-metal-300 mb-1 tracking-widest uppercase">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600 placeholder-metal-500"
                placeholder="Repite la contraseña"
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
              className="w-full bg-blood-700 hover:bg-blood-600 disabled:opacity-50 text-white font-display font-semibold tracking-widest uppercase py-2.5 rounded transition-colors text-sm"
            >
              {loading ? "Guardando..." : "Actualizar contraseña"}
            </button>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full text-sm text-metal-400 hover:text-blood-400 py-1 transition-colors font-display tracking-wide"
            >
              ← Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
