import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-green-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¿Olvidaste tu contraseña?
          </h1>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-4 space-y-2">
            <p className="font-semibold">Para restablecer tu contraseña:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
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

          <p className="text-xs text-gray-400 text-center">
            Si ya estás dentro, puedes cambiar tu contraseña desde el menú
            superior.
          </p>

          <button
            onClick={() => navigate("/login")}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            ← Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
