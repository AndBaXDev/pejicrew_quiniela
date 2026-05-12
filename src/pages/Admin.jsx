import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const FASES = [
  "grupos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_lugar",
  "final",
];

dfdfsfdf;

const FASES_LABELS = {
  grupos: "Fase de Grupos",
  octavos: "Octavos de Final",
  cuartos: "Cuartos de Final",
  semifinal: "Semifinal",
  tercer_lugar: "Tercer y Cuarto Puesto",
  final: "Final",
};

const PARTIDO_VACIO = {
  equipo_local: "",
  equipo_visitante: "",
  fecha: "",
  fase: "grupos",
};

export default function Admin() {
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resultados"); // 'resultados' | 'nuevo'
  const [nuevoPartido, setNuevoPartido] = useState(PARTIDO_VACIO);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [marcadores, setMarcadores] = useState({});
  const [guardandoRes, setGuardandoRes] = useState({});
  const [eliminando, setEliminando] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // partido id a confirmar

  const cargarPartidos = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("partidos").select("*").order("fecha");
    setPartidos(data || []);
    const mapa = {};
    for (const p of data || []) {
      mapa[p.id] = {
        local: p.goles_local_real ?? "",
        visitante: p.goles_visitante_real ?? "",
      };
    }
    setMarcadores(mapa);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarPartidos();
  }, [cargarPartidos]);

  async function crearPartido(e) {
    e.preventDefault();
    setErrorCrear("");
    if (
      !nuevoPartido.equipo_local.trim() ||
      !nuevoPartido.equipo_visitante.trim()
    ) {
      setErrorCrear("Completa los nombres de los equipos.");
      return;
    }
    setCreando(true);
    const { error } = await supabase.from("partidos").insert({
      equipo_local: nuevoPartido.equipo_local.trim(),
      equipo_visitante: nuevoPartido.equipo_visitante.trim(),
      fecha: nuevoPartido.fecha
        ? new Date(nuevoPartido.fecha).toISOString()
        : null,
      fase: nuevoPartido.fase,
    });
    setCreando(false);
    if (error) {
      setErrorCrear("Error al crear partido: " + error.message);
    } else {
      setNuevoPartido(PARTIDO_VACIO);
      cargarPartidos();
    }
  }

  async function guardarResultado(partidoId) {
    const vals = marcadores[partidoId];
    if (vals.local === "" || vals.visitante === "") return;
    const gl = parseInt(vals.local);
    const gv = parseInt(vals.visitante);
    if (isNaN(gl) || isNaN(gv) || gl < 0 || gv < 0) return;

    setGuardandoRes((prev) => ({ ...prev, [partidoId]: true }));
    await supabase
      .from("partidos")
      .update({ goles_local_real: gl, goles_visitante_real: gv })
      .eq("id", partidoId);
    setGuardandoRes((prev) => ({ ...prev, [partidoId]: false }));
    cargarPartidos();
  }

  async function eliminarResultado(partidoId) {
    await supabase
      .from("partidos")
      .update({ goles_local_real: null, goles_visitante_real: null })
      .eq("id", partidoId);
    cargarPartidos();
  }

  async function eliminarPartido(partidoId) {
    setEliminando((prev) => ({ ...prev, [partidoId]: true }));
    await supabase.from("partidos").delete().eq("id", partidoId);
    setEliminando((prev) => ({ ...prev, [partidoId]: false }));
    setConfirmDelete(null);
    cargarPartidos();
  }

  const inputClass =
    "w-full bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600 placeholder-metal-500";
  const tabActive =
    "bg-blood-700 text-white font-display font-semibold tracking-widest uppercase px-4 py-2 rounded text-sm transition-colors";
  const tabInactive =
    "bg-metal-800 border border-metal-600 text-metal-300 hover:bg-metal-700 font-display font-semibold tracking-widest uppercase px-4 py-2 rounded text-sm transition-colors";

  return (
    <div className="min-h-screen bg-metal-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="font-metal text-2xl text-white tracking-widest mb-6 uppercase">
          ⚙️ Panel de Administración
        </h1>

        {/* Modal confirmar eliminación */}
        {confirmDelete !== null && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-metal-900 border border-blood-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-metal text-lg text-white tracking-widest mb-2">
                ¿ELIMINAR PARTIDO?
              </h3>
              <p className="text-metal-300 text-sm mb-6 font-display">
                Esta acción eliminará el partido y{" "}
                <span className="text-blood-400 font-semibold">
                  todas las predicciones
                </span>{" "}
                asociadas. No se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => eliminarPartido(confirmDelete)}
                  disabled={!!eliminando[confirmDelete]}
                  className="flex-1 bg-blood-700 hover:bg-blood-600 disabled:opacity-50 text-white font-display font-semibold py-2 rounded tracking-widest uppercase text-sm transition-colors"
                >
                  {eliminando[confirmDelete] ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 bg-metal-700 hover:bg-metal-600 text-metal-200 font-display font-semibold py-2 rounded tracking-widest uppercase text-sm transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("resultados")}
            className={tab === "resultados" ? tabActive : tabInactive}
          >
            Resultados
          </button>
          <button
            onClick={() => setTab("nuevo")}
            className={tab === "nuevo" ? tabActive : tabInactive}
          >
            + Nuevo
          </button>
        </div>

        {tab === "nuevo" && (
          <div className="bg-metal-900 rounded-xl border border-metal-700 p-6 mb-6">
            <h2 className="font-display font-bold text-metal-200 mb-4 tracking-widest uppercase text-sm">
              Agregar Partido
            </h2>
            <form onSubmit={crearPartido} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-semibold text-metal-400 mb-1 tracking-wider uppercase">
                    Equipo Local
                  </label>
                  <input
                    type="text"
                    value={nuevoPartido.equipo_local}
                    onChange={(e) =>
                      setNuevoPartido((p) => ({
                        ...p,
                        equipo_local: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Ej: Colombia"
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-semibold text-metal-400 mb-1 tracking-wider uppercase">
                    Equipo Visitante
                  </label>
                  <input
                    type="text"
                    value={nuevoPartido.equipo_visitante}
                    onChange={(e) =>
                      setNuevoPartido((p) => ({
                        ...p,
                        equipo_visitante: e.target.value,
                      }))
                    }
                    className={inputClass}
                    placeholder="Ej: Brasil"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-display font-semibold text-metal-400 mb-1 tracking-wider uppercase">
                    Fecha y Hora
                  </label>
                  <input
                    type="datetime-local"
                    value={nuevoPartido.fecha}
                    onChange={(e) =>
                      setNuevoPartido((p) => ({ ...p, fecha: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-display font-semibold text-metal-400 mb-1 tracking-wider uppercase">
                    Fase
                  </label>
                  <select
                    value={nuevoPartido.fase}
                    onChange={(e) =>
                      setNuevoPartido((p) => ({ ...p, fase: e.target.value }))
                    }
                    className={inputClass}
                  >
                    {FASES.map((f) => (
                      <option key={f} value={f}>
                        {FASES_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {errorCrear && (
                <p className="text-blood-400 text-sm font-display">
                  {errorCrear}
                </p>
              )}
              <button
                type="submit"
                disabled={creando}
                className="bg-blood-700 hover:bg-blood-600 disabled:opacity-50 text-white font-display font-semibold py-2 px-6 rounded tracking-widest uppercase text-sm transition-colors"
              >
                {creando ? "Guardando..." : "Crear Partido"}
              </button>
            </form>
          </div>
        )}

        {tab === "resultados" && (
          <>
            {loading ? (
              <div className="flex justify-center h-40 items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blood-600 border-t-transparent" />
              </div>
            ) : partidos.length === 0 ? (
              <p className="text-center text-metal-600 text-sm mt-10 font-display italic">
                No hay partidos. Agrega uno primero.
              </p>
            ) : (
              <div className="space-y-3">
                {partidos.map((partido) => {
                  const terminado =
                    partido.goles_local_real !== null &&
                    partido.goles_visitante_real !== null;
                  return (
                    <div
                      key={partido.id}
                      className="bg-metal-900 rounded-lg border border-metal-700 p-4"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                        <span className="text-xs text-metal-500 font-mono">
                          {partido.fecha
                            ? format(
                                new Date(partido.fecha),
                                "d MMM yyyy HH:mm",
                                { locale: es },
                              )
                            : "—"}{" "}
                          ·{" "}
                          <span className="text-metal-400">
                            {FASES_LABELS[partido.fase] || partido.fase}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          {terminado && (
                            <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded font-display font-semibold tracking-wider uppercase">
                              Finalizado
                            </span>
                          )}
                          <button
                            onClick={() => setConfirmDelete(partido.id)}
                            className="text-metal-600 hover:text-blood-400 text-xs px-2 py-1 rounded transition-colors border border-transparent hover:border-blood-800 font-display tracking-wider uppercase"
                            title="Eliminar partido"
                          >
                            🗑 Eliminar
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-4 my-3">
                        <span className="font-display font-semibold text-metal-100 text-sm text-right w-28">
                          {partido.equipo_local}
                        </span>
                        <span className="text-metal-600 font-bold">vs</span>
                        <span className="font-display font-semibold text-metal-100 text-sm text-left w-28">
                          {partido.equipo_visitante}
                        </span>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={marcadores[partido.id]?.local ?? ""}
                          onChange={(e) =>
                            setMarcadores((prev) => ({
                              ...prev,
                              [partido.id]: {
                                ...prev[partido.id],
                                local: e.target.value,
                              },
                            }))
                          }
                          className="w-14 bg-metal-800 border border-metal-600 rounded text-center text-lg font-bold py-1 text-white focus:outline-none focus:ring-2 focus:ring-blood-600"
                          placeholder="0"
                        />
                        <span className="text-metal-500 font-bold">–</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={marcadores[partido.id]?.visitante ?? ""}
                          onChange={(e) =>
                            setMarcadores((prev) => ({
                              ...prev,
                              [partido.id]: {
                                ...prev[partido.id],
                                visitante: e.target.value,
                              },
                            }))
                          }
                          className="w-14 bg-metal-800 border border-metal-600 rounded text-center text-lg font-bold py-1 text-white focus:outline-none focus:ring-2 focus:ring-blood-600"
                          placeholder="0"
                        />
                        <button
                          onClick={() => guardarResultado(partido.id)}
                          disabled={!!guardandoRes[partido.id]}
                          className="bg-green-800 hover:bg-green-700 disabled:opacity-60 text-white text-xs px-4 py-2 rounded transition-colors font-display font-semibold tracking-wider uppercase ml-1"
                        >
                          {guardandoRes[partido.id]
                            ? "..."
                            : terminado
                              ? "Actualizar"
                              : "Registrar"}
                        </button>
                        {terminado && (
                          <button
                            onClick={() => eliminarResultado(partido.id)}
                            className="text-metal-600 hover:text-blood-400 text-xs px-2 py-2 transition-colors"
                            title="Borrar resultado"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
