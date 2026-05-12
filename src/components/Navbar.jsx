import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}logo.png`;

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const linkClass = (path) =>
    `px-3 py-1.5 rounded text-sm font-display font-semibold tracking-wider uppercase transition-colors ${
      location.pathname === path
        ? "bg-blood-700 text-white"
        : "text-metal-300 hover:bg-metal-700 hover:text-white"
    }`;

  return (
    <nav className="bg-metal-900 border-b border-blood-800 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 mr-4">
              <img
                src={logoSrc}
                alt="PejiCrew"
                className="h-10 w-10 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <span className="font-metal text-xl text-white tracking-widest hidden sm:block">
                PEJICREW <span className="text-blood-400">— LA QUINIELA</span>
              </span>
            </Link>
            <Link to="/" className={linkClass("/")}>
              Partidos
            </Link>
            <Link to="/tabla" className={linkClass("/tabla")}>
              Tabla
            </Link>
            {profile?.is_admin && (
              <Link to="/admin" className={linkClass("/admin")}>
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-metal-400 text-sm hidden sm:block">
              {profile?.username || ""}
              {profile?.is_admin && (
                <span className="ml-2 bg-blood-700 text-white text-xs px-2 py-0.5 rounded font-display font-bold tracking-widest uppercase">
                  ADMIN
                </span>
              )}
            </span>
            <Link
              to="/change-password"
              className="text-metal-400 hover:text-white text-sm border border-metal-600 hover:border-blood-600 px-3 py-1 rounded transition-colors hidden sm:block font-display tracking-wide"
            >
              Contraseña
            </Link>
            <button
              onClick={handleSignOut}
              className="text-metal-400 hover:text-white text-sm border border-metal-600 hover:border-blood-600 px-3 py-1 rounded transition-colors font-display tracking-wide"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
