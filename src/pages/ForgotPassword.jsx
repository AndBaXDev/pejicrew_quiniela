import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

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
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="font-metal text-3xl text-white tracking-widest">
            ¿Olvidaste tu contraseña?
          </h1>
        </div>

        <div className="space-y-4">
          <div className="bg-metal-800 border border-blood-800 text-metal-100 text-sm rounded-lg px-4 py-4 space-y-2">
            <p className="font-display font-semibold tracking-wide uppercase text-blood-300">
              Para restablecer tu contraseña:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-metal-300">
              <li>Contacta al administrador de la quiniela.</li>
              <li>
                El administrador restablecerá tu contraseña desde el panel de
                control.
              </li>
              <li>
                Una vez que tengas la nueva contraseña, ingresa normalmente.
              </li>
            </ol>
          </div>

          <p className="text-xs text-metal-500 text-center">
            Si ya estás dentro, puedes cambiar tu contraseña desde el menú
            superior.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="w-full bg-blood-700 hover:bg-blood-600 text-white font-display font-semibold tracking-widest uppercase py-2.5 rounded transition-colors text-sm"
          >
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
