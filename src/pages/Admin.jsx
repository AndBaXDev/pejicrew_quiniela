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

function toDatetimeLocalValue(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Admin() {
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resultados"); // 'resultados' | 'nuevo' | 'pagos'
  const [nuevoPartido, setNuevoPartido] = useState(PARTIDO_VACIO);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [marcadores, setMarcadores] = useState({});
  const [guardandoRes, setGuardandoRes] = useState({});
  const [eliminando, setEliminando] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // partido id a confirmar
  const [perfiles, setPerfiles] = useState([]);
  const [loadingPerfiles, setLoadingPerfiles] = useState(true);
  const [pagosEdicion, setPagosEdicion] = useState({});
  const [guardandoPago, setGuardandoPago] = useState({});
  const [errorPagos, setErrorPagos] = useState("");

  // --- Bonus ---
  const [preguntasBonus, setPreguntasBonus] = useState([]);
  const [loadingBonus, setLoadingBonus] = useState(true);
  const [nuevaPreguntaBonus, setNuevaPreguntaBonus] = useState("");
  const [nuevaFechaLimiteBonus, setNuevaFechaLimiteBonus] = useState("");
  const [creandoBonus, setCreandoBonus] = useState(false);
  const [errorBonus, setErrorBonus] = useState("");
  const [respCorrectaEdicion, setRespCorrectaEdicion] = useState({});
  const [fechaLimiteEdicion, setFechaLimiteEdicion] = useState({});
  const [guardandoRespCorrecta, setGuardandoRespCorrecta] = useState({});
  const [eliminandoBonus, setEliminandoBonus] = useState({});

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

  const cargarPerfiles = useCallback(async () => {
    setLoadingPerfiles(true);
    setErrorPagos("");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, is_admin, is_paid, paid_at, created_at")
      .order("username");

    if (error) {
      setErrorPagos("Error al cargar usuarios: " + error.message);
      setLoadingPerfiles(false);
      return;
    }

    setPerfiles(data || []);
    const mapa = {};
    for (const perfil of data || []) {
      mapa[perfil.id] = {
        confirmado: !!perfil.is_paid,
        fecha: toDatetimeLocalValue(perfil.paid_at),
      };
    }
    setPagosEdicion(mapa);
    setLoadingPerfiles(false);
  }, []);

  const cargarBonus = useCallback(async () => {
    setLoadingBonus(true);
    const { data } = await supabase
      .from("preguntas_bonus")
      .select("*")
      .order("created_at");
    const preguntas = data || [];
    setPreguntasBonus(preguntas);
    const mapaResp = {};
    const mapaFecha = {};
    for (const p of preguntas) {
      mapaResp[p.id] = p.respuesta_correcta ?? "";
      mapaFecha[p.id] = toDatetimeLocalValue(p.fecha_limite);
    }
    setRespCorrectaEdicion(mapaResp);
    setFechaLimiteEdicion(mapaFecha);
    setLoadingBonus(false);
  }, []);

  useEffect(() => {
    cargarPartidos();
    cargarPerfiles();
    cargarBonus();
  }, [cargarPartidos, cargarPerfiles, cargarBonus]);

  async function crearPreguntaBonus(e) {
    e.preventDefault();
    setErrorBonus("");
    if (!nuevaPreguntaBonus.trim()) {
      setErrorBonus("Escribe el texto de la pregunta.");
      return;
    }
    setCreandoBonus(true);
    const { error } = await supabase.from("preguntas_bonus").insert({
      pregunta: nuevaPreguntaBonus.trim(),
      fecha_limite: nuevaFechaLimiteBonus
        ? new Date(nuevaFechaLimiteBonus).toISOString()
        : null,
    });
    setCreandoBonus(false);
    if (error) {
      setErrorBonus("Error al crear pregunta: " + error.message);
    } else {
      setNuevaPreguntaBonus("");
      setNuevaFechaLimiteBonus("");
      cargarBonus();
    }
  }

  async function guardarRespCorrectaBonus(preguntaId) {
    const val = respCorrectaEdicion[preguntaId] ?? "";
    const fechaVal = fechaLimiteEdicion[preguntaId] ?? "";
    setGuardandoRespCorrecta((prev) => ({ ...prev, [preguntaId]: true }));
    await supabase
      .from("preguntas_bonus")
      .update({
        respuesta_correcta: val.trim() || null,
        fecha_limite: fechaVal ? new Date(fechaVal).toISOString() : null,
      })
      .eq("id", preguntaId);
    setGuardandoRespCorrecta((prev) => ({ ...prev, [preguntaId]: false }));
    cargarBonus();
  }

  async function eliminarPreguntaBonus(preguntaId) {
    setEliminandoBonus((prev) => ({ ...prev, [preguntaId]: true }));
    await supabase.from("preguntas_bonus").delete().eq("id", preguntaId);
    setEliminandoBonus((prev) => ({ ...prev, [preguntaId]: false }));
    cargarBonus();
  }

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

  function onTogglePago(perfilId, confirmado) {
    setPagosEdicion((prev) => {
      const actual = prev[perfilId] || { confirmado: false, fecha: "" };
      return {
        ...prev,
        [perfilId]: {
          confirmado,
          fecha: confirmado
            ? actual.fecha || toDatetimeLocalValue(new Date().toISOString())
            : "",
        },
      };
    });
  }

  function onChangeFechaPago(perfilId, fecha) {
    setPagosEdicion((prev) => ({
      ...prev,
      [perfilId]: {
        ...(prev[perfilId] || { confirmado: true, fecha: "" }),
        fecha,
      },
    }));
  }

  async function guardarPago(perfilId) {
    const edicion = pagosEdicion[perfilId];
    if (!edicion) return;

    const payload = edicion.confirmado
      ? {
          is_paid: true,
          paid_at: edicion.fecha
            ? new Date(edicion.fecha).toISOString()
            : new Date().toISOString(),
        }
      : {
          is_paid: false,
          paid_at: null,
        };

    setGuardandoPago((prev) => ({ ...prev, [perfilId]: true }));
    setErrorPagos("");

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", perfilId);

    setGuardandoPago((prev) => ({ ...prev, [perfilId]: false }));

    if (error) {
      setErrorPagos("Error al guardar pago: " + error.message);
      return;
    }

    await cargarPerfiles();
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
          <button
            onClick={() => setTab("pagos")}
            className={tab === "pagos" ? tabActive : tabInactive}
          >
            Pagos
          </button>
          <button
            onClick={() => setTab("bonus")}
            className={tab === "bonus" ? tabActive : tabInactive}
          >
            ⭐ Bonus
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

        {tab === "pagos" && (
          <div className="bg-metal-900 rounded-xl border border-metal-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-metal-200 tracking-widest uppercase text-sm">
                Estado de Pagos
              </h2>
              <button
                onClick={cargarPerfiles}
                className="text-xs bg-metal-800 border border-metal-600 hover:border-blood-700 text-metal-200 px-3 py-1.5 rounded transition-colors font-display font-semibold tracking-wider uppercase"
              >
                Recargar
              </button>
            </div>

            {errorPagos && (
              <p className="text-blood-400 text-sm font-display mb-4">
                {errorPagos}
              </p>
            )}

            {loadingPerfiles ? (
              <div className="flex justify-center h-32 items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-blood-600 border-t-transparent" />
              </div>
            ) : perfiles.length === 0 ? (
              <p className="text-center text-metal-600 text-sm py-8 font-display italic">
                No hay usuarios registrados.
              </p>
            ) : (
              <div className="space-y-3">
                {perfiles.map((perfil) => {
                  const edicion = pagosEdicion[perfil.id] || {
                    confirmado: false,
                    fecha: "",
                  };
                  const pagado = !!edicion.confirmado;
                  const guardando = !!guardandoPago[perfil.id];

                  return (
                    <div
                      key={perfil.id}
                      className="bg-metal-950 border border-metal-800 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                        <div>
                          <p className="text-metal-100 font-display font-semibold tracking-wide">
                            {perfil.username}
                            {perfil.is_admin && (
                              <span className="ml-2 bg-blood-700 text-white text-[10px] px-2 py-0.5 rounded font-display font-bold tracking-widest uppercase">
                                ADMIN
                              </span>
                            )}
                          </p>
                          <p className="text-metal-500 text-xs font-mono">
                            Registrado:{" "}
                            {format(new Date(perfil.created_at), "d MMM yyyy", {
                              locale: es,
                            })}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border font-display font-semibold tracking-wider uppercase ${
                            pagado
                              ? "bg-green-900/40 text-green-400 border-green-800"
                              : "bg-metal-800 text-metal-400 border-metal-700"
                          }`}
                        >
                          {pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 text-sm text-metal-300 font-display">
                          <input
                            type="checkbox"
                            checked={pagado}
                            onChange={(e) =>
                              onTogglePago(perfil.id, e.target.checked)
                            }
                            className="h-4 w-4 accent-blood-600"
                          />
                          Pago confirmado
                        </label>

                        <div className="flex gap-2 items-center">
                          <input
                            type="datetime-local"
                            value={edicion.fecha}
                            onChange={(e) =>
                              onChangeFechaPago(perfil.id, e.target.value)
                            }
                            disabled={!pagado}
                            className={`min-w-0 flex-1 bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600 ${
                              !pagado ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          />

                          <button
                            onClick={() => guardarPago(perfil.id)}
                            disabled={guardando}
                            className="flex-shrink-0 bg-blood-700 hover:bg-blood-600 disabled:opacity-50 text-white font-display font-semibold py-2 px-4 rounded tracking-widest uppercase text-xs transition-colors"
                          >
                            {guardando ? "..." : "Guardar"}
                          </button>
                        </div>
                      </div>

                      {perfil.paid_at && (
                        <p className="text-metal-500 text-xs mt-2 font-mono">
                          Fecha guardada:{" "}
                          {format(
                            new Date(perfil.paid_at),
                            "d MMM yyyy HH:mm",
                            { locale: es },
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "bonus" && (
          <div className="space-y-6">
            {/* Crear nueva pregunta */}
            <div className="bg-metal-900 rounded-xl border border-metal-700 p-6">
              <h2 className="font-display font-bold text-metal-200 mb-4 tracking-widest uppercase text-sm">
                Nueva Pregunta Bonus
              </h2>
              <form onSubmit={crearPreguntaBonus} className="space-y-3">
                <textarea
                  value={nuevaPreguntaBonus}
                  onChange={(e) => setNuevaPreguntaBonus(e.target.value)}
                  rows={2}
                  className={inputClass + " resize-none"}
                  placeholder="Ej: ¿Qué equipo ganará la Copa Mundial 2026?"
                />
                <div>
                  <label className="block text-xs font-display font-semibold text-metal-400 mb-1 tracking-wider uppercase">
                    Fecha límite para responder
                  </label>
                  <input
                    type="datetime-local"
                    value={nuevaFechaLimiteBonus}
                    onChange={(e) => setNuevaFechaLimiteBonus(e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-metal-600 text-xs mt-1 font-display">
                    Dejar vacío = sin límite
                  </p>
                </div>
                {errorBonus && (
                  <p className="text-blood-400 text-sm font-display">
                    {errorBonus}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={creandoBonus}
                  className="bg-blood-700 hover:bg-blood-600 disabled:opacity-50 text-white font-display font-semibold py-2 px-6 rounded tracking-widest uppercase text-sm transition-colors"
                >
                  {creandoBonus ? "Guardando..." : "Crear Pregunta"}
                </button>
              </form>
            </div>

            {/* Lista de preguntas */}
            <div className="bg-metal-900 rounded-xl border border-metal-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-metal-200 tracking-widest uppercase text-sm">
                  Preguntas Existentes
                </h2>
                <button
                  onClick={cargarBonus}
                  className="text-xs bg-metal-800 border border-metal-600 hover:border-blood-700 text-metal-200 px-3 py-1.5 rounded transition-colors font-display font-semibold tracking-wider uppercase"
                >
                  Recargar
                </button>
              </div>

              {loadingBonus ? (
                <div className="flex justify-center h-24 items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blood-600 border-t-transparent" />
                </div>
              ) : preguntasBonus.length === 0 ? (
                <p className="text-center text-metal-600 text-sm py-8 font-display italic">
                  No hay preguntas bonus. Crea una arriba.
                </p>
              ) : (
                <div className="space-y-4">
                  {preguntasBonus.map((pq) => (
                    <div
                      key={pq.id}
                      className="bg-metal-950 border border-metal-800 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-metal-100 font-display font-semibold text-sm leading-snug flex-1">
                          ⭐ {pq.pregunta}
                          <span className="ml-2 text-[10px] text-metal-500 font-mono font-normal">
                            +{pq.puntos} pts
                          </span>
                        </p>
                        <button
                          onClick={() => eliminarPreguntaBonus(pq.id)}
                          disabled={!!eliminandoBonus[pq.id]}
                          className="text-metal-600 hover:text-blood-400 text-xs px-2 py-1 rounded transition-colors border border-transparent hover:border-blood-800 font-display tracking-wider uppercase flex-shrink-0"
                        >
                          🗑
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={respCorrectaEdicion[pq.id] ?? ""}
                            onChange={(e) =>
                              setRespCorrectaEdicion((prev) => ({
                                ...prev,
                                [pq.id]: e.target.value,
                              }))
                            }
                            className="flex-1 bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600 placeholder-metal-500"
                            placeholder="Respuesta correcta (vacío = sin revelar)"
                          />
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <label className="block text-[10px] font-display font-semibold text-metal-500 mb-1 tracking-wider uppercase">
                              Fecha límite
                            </label>
                            <input
                              type="datetime-local"
                              value={fechaLimiteEdicion[pq.id] ?? ""}
                              onChange={(e) =>
                                setFechaLimiteEdicion((prev) => ({
                                  ...prev,
                                  [pq.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-metal-800 border border-metal-600 rounded px-3 py-2 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-blood-600 focus:border-blood-600"
                            />
                          </div>
                          <button
                            onClick={() => guardarRespCorrectaBonus(pq.id)}
                            disabled={!!guardandoRespCorrecta[pq.id]}
                            className="self-end flex-shrink-0 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white font-display font-semibold py-2 px-4 rounded tracking-widest uppercase text-xs transition-colors"
                          >
                            {guardandoRespCorrecta[pq.id] ? "..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                      {pq.respuesta_correcta && (
                        <p className="mt-2 text-xs text-green-400 font-display">
                          ✅ Respuesta revelada:{" "}
                          <strong>{pq.respuesta_correcta}</strong>
                        </p>
                      )}
                      {pq.fecha_limite && (
                        <p className="mt-1 text-xs text-metal-500 font-mono">
                          ⏰ Límite:{" "}
                          {format(
                            new Date(pq.fecha_limite),
                            "d MMM yyyy HH:mm",
                            {
                              locale: es,
                            },
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
