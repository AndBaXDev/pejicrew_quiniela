import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const FASE_LABELS = {
  grupos: "Fase de Grupos",
  octavos: "Octavos de Final",
  cuartos: "Cuartos de Final",
  semifinal: "Semifinal",
  tercer_lugar: "Tercer y Cuarto Puesto",
  final: "Final",
};

const FASE_ORDER = [
  "grupos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_lugar",
  "final",
];

// Extrae la fecha local (yyyy-MM-dd) de un timestamp UTC
function localDateKey(fechaStr) {
  const d = new Date(fechaStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function esBloqueado(partido) {
  if (!partido.fecha) return false;
  return Date.now() >= new Date(partido.fecha).getTime() - 10 * 60 * 1000;
}

function calcularPuntos(pred_local, pred_visit, real_local, real_visit) {
  if (real_local === null || real_visit === null) return null;
  if (pred_local === real_local && pred_visit === real_visit) return 3;
  // si el resultado es un empate, pero el usuario no acertó el marcador exacto, igual se le da 1 punto
  if (real_local === real_visit && pred_local === pred_visit) return 1;
  const predRes =
    pred_local > pred_visit ? "L" : pred_local < pred_visit ? "V" : "E";
  const realRes =
    real_local > real_visit ? "L" : real_local < real_visit ? "V" : "E";
  if (predRes === realRes) return 1;
  return 0;
}

function PuntosBadge({ puntos }) {
  if (puntos === null) return null;
  const style =
    puntos === 3
      ? "bg-green-900/40 text-green-400 border-green-800"
      : puntos === 1
        ? "bg-yellow-900/40 text-yellow-400 border-yellow-800"
        : "bg-blood-900/40 text-blood-300 border-blood-800";
  const label =
    puntos === 3
      ? "🎯 Exacto +3"
      : puntos === 1
        ? "✅ Resultado +1"
        : "❌ 0 pts";
  return (
    <span
      className={`text-xs border px-2 py-0.5 rounded font-display font-semibold tracking-wider ${style}`}
    >
      {label}
    </span>
  );
}

export default function Partidos() {
  const { user, profile } = useAuth();
  const [partidos, setPartidos] = useState([]);
  const [predicciones, setPredicciones] = useState({});
  const [editando, setEditando] = useState({});
  const [guardando, setGuardando] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtroFase, setFiltroFase] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState(null);
  const [notifVisible, setNotifVisible] = useState(true);
  const [tabView, setTabView] = useState("partidos"); // 'partidos' | 'bonus'
  const [preguntasBonus, setPreguntasBonus] = useState([]);
  const [respuestasBonus, setRespuestasBonus] = useState({});
  const [editandoBonus, setEditandoBonus] = useState({});
  const [guardandoBonus, setGuardandoBonus] = useState({});
  const puedePredecir = !!profile?.is_paid;

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    const [
      { data: pData },
      { data: prData },
      { data: pbData },
      { data: rbData },
    ] = await Promise.all([
      supabase.from("partidos").select("*").order("fecha"),
      supabase.from("predicciones").select("*").eq("user_id", user.id),
      supabase.from("preguntas_bonus").select("*").order("created_at"),
      supabase.from("respuestas_bonus").select("*").eq("user_id", user.id),
    ]);
    setPartidos(pData || []);
    const map = {};
    for (const p of prData || []) map[p.partido_id] = p;
    setPredicciones(map);
    setPreguntasBonus(pbData || []);
    const mapBonus = {};
    for (const r of rbData || []) mapBonus[r.pregunta_id] = r;
    setRespuestasBonus(mapBonus);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function iniciarEdicion(partido) {
    const pred = predicciones[partido.id];
    setEditando((prev) => ({
      ...prev,
      [partido.id]: {
        local: pred?.goles_local ?? "",
        visitante: pred?.goles_visitante ?? "",
      },
    }));
  }

  function cancelarEdicion(partidoId) {
    setEditando((prev) => {
      const n = { ...prev };
      delete n[partidoId];
      return n;
    });
  }

  async function guardarRespuestaBonus(preguntaId) {
    if (!puedePredecir) return;
    const texto = (editandoBonus[preguntaId] ?? "").trim();
    if (!texto) return;
    setGuardandoBonus((prev) => ({ ...prev, [preguntaId]: true }));
    const existente = respuestasBonus[preguntaId];
    if (existente) {
      await supabase
        .from("respuestas_bonus")
        .update({ respuesta: texto })
        .eq("id", existente.id);
    } else {
      await supabase.from("respuestas_bonus").insert({
        user_id: user.id,
        pregunta_id: preguntaId,
        respuesta: texto,
      });
    }
    setGuardandoBonus((prev) => ({ ...prev, [preguntaId]: false }));
    setEditandoBonus((prev) => {
      const n = { ...prev };
      delete n[preguntaId];
      return n;
    });
    cargarDatos();
  }

  async function guardarPrediccion(partido) {
    if (!puedePredecir) {
      cancelarEdicion(partido.id);
      return;
    }
    if (esBloqueado(partido)) {
      cancelarEdicion(partido.id);
      return;
    }
    const vals = editando[partido.id];
    if (vals.local === "" || vals.visitante === "") return;
    const gl = parseInt(vals.local);
    const gv = parseInt(vals.visitante);
    if (isNaN(gl) || isNaN(gv) || gl < 0 || gv < 0) return;

    setGuardando((prev) => ({ ...prev, [partido.id]: true }));
    const existente = predicciones[partido.id];
    let error;
    if (existente) {
      ({ error } = await supabase
        .from("predicciones")
        .update({ goles_local: gl, goles_visitante: gv })
        .eq("id", existente.id));
    } else {
      ({ error } = await supabase.from("predicciones").insert({
        user_id: user.id,
        partido_id: partido.id,
        goles_local: gl,
        goles_visitante: gv,
      }));
    }
    setGuardando((prev) => ({ ...prev, [partido.id]: false }));
    if (!error) {
      cancelarEdicion(partido.id);
      cargarDatos();
    }
  }

  // Fecha local de hoy para comparar con fechas de los partidos
  const _now = new Date();
  const _pad = (n) => String(n).padStart(2, "0");
  const todayKey = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-${_pad(_now.getDate())}`;

  // Fechas únicas presentes en los partidos para el selector (hora local)
  const fechasUnicas = [
    ...new Set(
      partidos.filter((p) => p.fecha).map((p) => localDateKey(p.fecha)),
    ),
  ].sort();

  // Partidos próximos (siguientes 6 horas) sin predicción
  const PRONTO_MS = 6 * 60 * 60 * 1000;
  const proximosSinPred = partidos.filter((p) => {
    if (!p.fecha) return false;
    const inicio = new Date(p.fecha).getTime();
    const ahora = Date.now();
    return inicio > ahora && inicio - ahora <= PRONTO_MS && !predicciones[p.id];
  });

  // Partidos filtrados según fase/fecha seleccionada
  const partidosFiltrados = partidos.filter((p) => {
    const faseOk = !filtroFase || p.fase === filtroFase;
    if (!faseOk) return false;
    if (filtroFecha === "hoy")
      return p.fecha ? localDateKey(p.fecha) === todayKey : false;
    if (filtroFecha)
      return p.fecha ? localDateKey(p.fecha) === filtroFecha : false;
    return true;
  });

  // Estructura: fase -> dateKey (yyyy-MM-dd local) -> partidos[]
  const partidosPorFaseFecha = partidosFiltrados.reduce((acc, p) => {
    const fase = p.fase || "grupos";
    if (!acc[fase]) acc[fase] = {};
    const dateKey = p.fecha ? localDateKey(p.fecha) : "sin-fecha";
    if (!acc[fase][dateKey]) acc[fase][dateKey] = [];
    acc[fase][dateKey].push(p);
    return acc;
  }, {});

  // Fases que tienen partidos sin filtro (para los botones de fase)
  const fasesDisponibles = FASE_ORDER.filter((f) =>
    partidos.some((p) => p.fase === f),
  );

  // Puntos totales del usuario (solo partidos con resultado y predicción)
  const puntosTotal = partidos.reduce((sum, p) => {
    const pred = predicciones[p.id];
    if (!pred) return sum;
    const pts = calcularPuntos(
      pred.goles_local,
      pred.goles_visitante,
      p.goles_local_real,
      p.goles_visitante_real,
    );
    return sum + (pts ?? 0);
  }, 0);

  const partidosConResultado = partidos.filter(
    (p) =>
      p.goles_local_real !== null &&
      p.goles_visitante_real !== null &&
      predicciones[p.id],
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-metal-950">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-metal-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="font-metal text-2xl text-white tracking-widest uppercase">
            🏟️ Mis Predicciones
          </h1>
          {partidosConResultado > 0 && (
            <div className="flex items-center gap-2 bg-metal-900 border border-blood-800 rounded-xl px-4 py-2">
              <span className="font-display text-metal-400 text-xs uppercase tracking-widest">
                Total
              </span>
              <span className="font-metal text-blood-400 text-2xl leading-none">
                {puntosTotal}
              </span>
              <span className="font-display text-metal-400 text-xs">pts</span>
            </div>
          )}
        </div>

        {!puedePredecir && (
          <div className="mb-5 bg-blood-900/30 border border-blood-700 rounded-xl px-4 py-3">
            <p className="text-blood-300 font-display font-semibold text-sm tracking-wide">
              Tu pago aún no ha sido confirmado por un administrador. Cuando se
              confirme, podrás crear y editar predicciones.
            </p>
          </div>
        )}

        {/* Tabs de vista */}
        <div className="flex gap-1 mb-5 bg-metal-900 rounded-lg p-1 border border-metal-800">
          <button
            onClick={() => setTabView("partidos")}
            className={`flex-1 py-2 text-xs font-display font-semibold uppercase tracking-widest rounded transition-colors ${
              tabView === "partidos"
                ? "bg-blood-700 text-white"
                : "text-metal-400 hover:text-metal-200"
            }`}
          >
            🏟️ Partidos
          </button>
          <button
            onClick={() => setTabView("bonus")}
            className={`flex-1 py-2 text-xs font-display font-semibold uppercase tracking-widest rounded transition-colors flex items-center justify-center gap-1 ${
              tabView === "bonus"
                ? "bg-yellow-700 text-white"
                : "text-metal-400 hover:text-metal-200"
            }`}
          >
            ⭐ Bonus
            {preguntasBonus.length > 0 && (
              <span className="bg-yellow-900 text-yellow-400 rounded-full px-1.5 text-[10px]">
                {preguntasBonus.length}
              </span>
            )}
          </button>
        </div>

        {/* Banner de notificaciones: partidos próximos sin predicción */}
        {tabView === "partidos" &&
          puedePredecir &&
          notifVisible &&
          proximosSinPred.length > 0 && (
            <div className="mb-5 bg-yellow-900/30 border border-yellow-700 rounded-xl px-4 py-3 flex gap-3 items-start">
              <span className="text-yellow-400 text-lg mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-yellow-300 font-display font-bold text-sm tracking-wide">
                  {proximosSinPred.length === 1
                    ? "Tienes 1 partido próximo sin predicción"
                    : `Tienes ${proximosSinPred.length} partidos próximos sin predicción`}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {proximosSinPred.map((p) => (
                    <li
                      key={p.id}
                      className="text-yellow-500 text-xs font-mono"
                    >
                      {p.equipo_local} vs {p.equipo_visitante}
                      {p.fecha && (
                        <span className="text-yellow-700 ml-1">
                          —{" "}
                          {format(new Date(p.fecha), "HH:mm 'hs' · d MMM", {
                            locale: es,
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setNotifVisible(false)}
                className="text-yellow-700 hover:text-yellow-400 text-lg leading-none flex-shrink-0"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          )}

        {/* Filtros */}
        {tabView === "partidos" && (
          <div className="mb-5 space-y-2">
            {/* Fila 1: Todos + Hoy + por fase */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setFiltroFase(null);
                  setFiltroFecha(null);
                }}
                className={`text-xs px-3 py-1.5 rounded-full font-display font-semibold uppercase tracking-wider transition-colors border ${
                  filtroFase === null && filtroFecha === null
                    ? "bg-blood-700 border-blood-600 text-white"
                    : "bg-metal-800 border-metal-700 text-metal-300 hover:border-blood-800 hover:text-white"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => {
                  setFiltroFase(null);
                  setFiltroFecha(filtroFecha === "hoy" ? null : "hoy");
                }}
                className={`text-xs px-3 py-1.5 rounded-full font-display font-semibold uppercase tracking-wider transition-colors border ${
                  filtroFecha === "hoy"
                    ? "bg-blood-700 border-blood-600 text-white"
                    : "bg-metal-800 border-metal-700 text-metal-300 hover:border-blood-800 hover:text-white"
                }`}
              >
                🗓 Hoy
                {partidos.filter((p) => p.fecha?.slice(0, 10) === todayKey)
                  .length > 0 && (
                  <span className="ml-1 bg-blood-900 text-blood-300 rounded-full px-1.5 text-[10px]">
                    {
                      partidos.filter((p) => p.fecha?.slice(0, 10) === todayKey)
                        .length
                    }
                  </span>
                )}
              </button>
              {fasesDisponibles.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFiltroFase(filtroFase === f ? null : f);
                    setFiltroFecha(null);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-display font-semibold uppercase tracking-wider transition-colors border ${
                    filtroFase === f
                      ? "bg-blood-700 border-blood-600 text-white"
                      : "bg-metal-800 border-metal-700 text-metal-300 hover:border-blood-800 hover:text-white"
                  }`}
                >
                  {FASE_LABELS[f] || f}
                </button>
              ))}
            </div>

            {/* Fila 2: Selector de fecha específica */}
            <div className="flex items-center gap-2">
              <label className="text-metal-500 text-xs font-display uppercase tracking-wider">
                Fecha:
              </label>
              <select
                value={filtroFecha && filtroFecha !== "hoy" ? filtroFecha : ""}
                onChange={(e) => {
                  setFiltroFecha(e.target.value || null);
                  setFiltroFase(null);
                }}
                className="text-xs bg-metal-800 border border-metal-700 rounded px-2 py-1 text-metal-200 font-display focus:outline-none focus:ring-1 focus:ring-blood-600"
              >
                <option value="">Todas las fechas</option>
                {fechasUnicas.map((d) => (
                  <option key={d} value={d}>
                    {format(new Date(d + "T12:00:00"), "EEEE d 'de' MMMM", {
                      locale: es,
                    })}
                  </option>
                ))}
              </select>
              {(filtroFase || filtroFecha) && (
                <button
                  onClick={() => {
                    setFiltroFase(null);
                    setFiltroFecha(null);
                  }}
                  className="text-xs text-metal-500 hover:text-metal-300 font-display underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        )}

        {tabView === "partidos" &&
          FASE_ORDER.filter(
            (f) =>
              partidosPorFaseFecha[f] &&
              Object.keys(partidosPorFaseFecha[f]).length > 0,
          ).map((fase) => (
            <div key={fase} className="mb-10">
              <h2 className="font-display font-bold text-sm uppercase tracking-widest text-blood-400 mb-4 pb-2 border-b border-blood-900">
                {FASE_LABELS[fase] || fase}
              </h2>

              {Object.entries(partidosPorFaseFecha[fase])
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, partsFecha]) => (
                  <div key={dateKey} className="mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="h-px bg-metal-700 flex-1" />
                      <span className="text-xs font-display font-semibold uppercase tracking-widest text-metal-400">
                        {dateKey !== "sin-fecha"
                          ? format(
                              new Date(dateKey + "T12:00:00"),
                              "EEEE d 'de' MMMM",
                              { locale: es },
                            )
                          : "Sin fecha"}
                      </span>
                      <span className="h-px bg-metal-700 flex-1" />
                    </div>

                    <div className="space-y-3">
                      {partsFecha.map((partido) => {
                        const pred = predicciones[partido.id];
                        const puntos = pred
                          ? calcularPuntos(
                              pred.goles_local,
                              pred.goles_visitante,
                              partido.goles_local_real,
                              partido.goles_visitante_real,
                            )
                          : null;
                        const terminado =
                          partido.goles_local_real !== null &&
                          partido.goles_visitante_real !== null;
                        const bloqueado = esBloqueado(partido);
                        const enEdicion = !!editando[partido.id];
                        const esGuardando = !!guardando[partido.id];

                        return (
                          <div
                            key={partido.id}
                            className={`bg-metal-900 rounded-lg border p-4 transition-colors ${
                              terminado
                                ? "border-metal-700"
                                : bloqueado
                                  ? "border-metal-700"
                                  : "border-metal-700 hover:border-blood-800"
                            }`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-metal-500 text-xs font-mono">
                                  {partido.fecha
                                    ? format(
                                        new Date(partido.fecha),
                                        "HH:mm 'hs'",
                                        { locale: es },
                                      )
                                    : ""}
                                </span>
                                {bloqueado && !terminado && (
                                  <span className="text-xs bg-yellow-900/40 text-yellow-500 border border-yellow-800 px-2 py-0.5 rounded font-display font-semibold tracking-wider uppercase">
                                    ⏱ Cerrado
                                  </span>
                                )}
                              </div>
                              <PuntosBadge puntos={puntos} />
                            </div>

                            <div className="flex items-center justify-center gap-4 my-3">
                              <span className="font-display font-semibold text-metal-100 text-sm text-right w-28">
                                {partido.equipo_local}
                              </span>
                              <span className="text-metal-600 font-bold text-lg">
                                vs
                              </span>
                              <span className="font-display font-semibold text-metal-100 text-sm text-left w-28">
                                {partido.equipo_visitante}
                              </span>
                            </div>

                            {terminado && (
                              <div className="text-center text-sm text-metal-400 mb-2">
                                Resultado real:{" "}
                                <span className="font-bold text-blood-400 font-mono text-base">
                                  {partido.goles_local_real} –{" "}
                                  {partido.goles_visitante_real}
                                </span>
                              </div>
                            )}

                            {!enEdicion ? (
                              <div className="flex items-center justify-center gap-3 mt-1">
                                {pred ? (
                                  <span className="text-metal-200 font-mono font-bold text-lg">
                                    {pred.goles_local} – {pred.goles_visitante}
                                  </span>
                                ) : (
                                  <span className="text-metal-600 text-sm italic">
                                    Sin predicción
                                  </span>
                                )}
                                {!terminado && !bloqueado && puedePredecir && (
                                  <button
                                    onClick={() => iniciarEdicion(partido)}
                                    className="ml-2 text-xs bg-blood-800 hover:bg-blood-700 text-white px-3 py-1 rounded transition-colors font-display font-semibold tracking-wider uppercase"
                                  >
                                    {pred ? "Editar" : "Predecir"}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 mt-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={editando[partido.id].local}
                                  onChange={(e) =>
                                    setEditando((prev) => ({
                                      ...prev,
                                      [partido.id]: {
                                        ...prev[partido.id],
                                        local: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-14 bg-metal-800 border border-metal-600 rounded text-center text-lg font-bold py-1 text-white focus:outline-none focus:ring-2 focus:ring-blood-600"
                                />
                                <span className="text-metal-500 font-bold">
                                  –
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  max="20"
                                  value={editando[partido.id].visitante}
                                  onChange={(e) =>
                                    setEditando((prev) => ({
                                      ...prev,
                                      [partido.id]: {
                                        ...prev[partido.id],
                                        visitante: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-14 bg-metal-800 border border-metal-600 rounded text-center text-lg font-bold py-1 text-white focus:outline-none focus:ring-2 focus:ring-blood-600"
                                />
                                <button
                                  onClick={() => guardarPrediccion(partido)}
                                  disabled={esGuardando}
                                  className="bg-green-800 hover:bg-green-700 disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded transition-colors font-display font-semibold tracking-wider uppercase"
                                >
                                  {esGuardando ? "..." : "Guardar"}
                                </button>
                                <button
                                  onClick={() => cancelarEdicion(partido.id)}
                                  className="text-metal-500 hover:text-metal-300 text-xs px-2 py-1.5 font-display"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          ))}

        {tabView === "partidos" &&
          partidosFiltrados.length === 0 &&
          partidos.length > 0 && (
            <p className="text-center text-metal-600 mt-12 text-sm italic font-display">
              No hay partidos que coincidan con los filtros seleccionados.
            </p>
          )}

        {tabView === "partidos" && partidos.length === 0 && (
          <p className="text-center text-metal-600 mt-20 text-sm italic font-display">
            Aún no hay partidos cargados. El administrador los agregará pronto.
          </p>
        )}

        {/* Tab Bonus */}
        {tabView === "bonus" && (
          <div className="mt-4">
            {preguntasBonus.length === 0 ? (
              <p className="text-center text-metal-600 mt-12 text-sm italic font-display">
                Aún no hay preguntas bonus. El administrador las agregará
                pronto.
              </p>
            ) : (
              <>
                <h2 className="font-display font-bold text-sm uppercase tracking-widest text-yellow-500 mb-4 pb-2 border-b border-yellow-900">
                  ⭐ Preguntas Bonus — +2 pts cada una
                </h2>
                <div className="space-y-4">
                  {preguntasBonus.map((pq) => {
                    const respuesta = respuestasBonus[pq.id];
                    const enEdicion = pq.id in editandoBonus;
                    const yaRespondida = !!respuesta;
                    const bonusBloqueado =
                      pq.fecha_limite &&
                      Date.now() >= new Date(pq.fecha_limite).getTime();
                    const correcta =
                      pq.respuesta_correcta &&
                      ((pq.tipo ?? "texto") === "numero"
                        ? parseFloat(respuesta?.respuesta) ===
                          parseFloat(pq.respuesta_correcta)
                        : respuesta?.respuesta?.trim().toLowerCase() ===
                          pq.respuesta_correcta.trim().toLowerCase());
                    const incorrecta =
                      pq.respuesta_correcta && yaRespondida && !correcta;

                    return (
                      <div
                        key={pq.id}
                        className="bg-metal-900 rounded-lg border border-yellow-900/50 p-4"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-display font-semibold text-metal-100 text-sm leading-snug">
                            ⭐ {pq.pregunta}
                          </p>
                          {bonusBloqueado && (
                            <span className="flex-shrink-0 text-xs bg-yellow-900/40 text-yellow-500 border border-yellow-800 px-2 py-0.5 rounded font-display font-semibold tracking-wider uppercase">
                              ⏱ Cerrado
                            </span>
                          )}
                        </div>

                        {pq.fecha_limite && !bonusBloqueado && (
                          <p className="text-metal-500 text-xs font-mono mb-2">
                            ⏰ Cierra:{" "}
                            {format(
                              new Date(pq.fecha_limite),
                              "d MMM · HH:mm 'hs'",
                              { locale: es },
                            )}
                          </p>
                        )}

                        {pq.respuesta_correcta && (
                          <p className="text-xs font-display mb-2">
                            <span className="text-metal-400">
                              Respuesta correcta:{" "}
                            </span>
                            <span className="text-yellow-300 font-semibold">
                              {pq.respuesta_correcta}
                            </span>
                          </p>
                        )}

                        {!enEdicion ? (
                          <div className="flex items-center gap-3 flex-wrap">
                            {yaRespondida ? (
                              <>
                                <span className="font-display font-semibold text-metal-200 text-sm">
                                  Tu respuesta:{" "}
                                  <span className="text-white">
                                    {respuesta.respuesta}
                                  </span>
                                </span>
                                {correcta && (
                                  <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded font-display font-semibold tracking-wider">
                                    🎯 +{pq.puntos} pts
                                  </span>
                                )}
                                {incorrecta && (
                                  <span className="text-xs bg-blood-900/40 text-blood-300 border border-blood-800 px-2 py-0.5 rounded font-display font-semibold tracking-wider">
                                    ❌ 0 pts
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-metal-500 text-xs font-display italic">
                                Sin respuesta
                              </span>
                            )}
                            {puedePredecir &&
                              !pq.respuesta_correcta &&
                              !bonusBloqueado && (
                                <button
                                  onClick={() =>
                                    setEditandoBonus((prev) => ({
                                      ...prev,
                                      [pq.id]: respuesta?.respuesta ?? "",
                                    }))
                                  }
                                  className="text-xs text-yellow-600 hover:text-yellow-400 font-display underline"
                                >
                                  {yaRespondida ? "Editar" : "Responder"}
                                </button>
                              )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type={
                                (pq.tipo ?? "texto") === "numero"
                                  ? "number"
                                  : "text"
                              }
                              inputMode={
                                (pq.tipo ?? "texto") === "numero"
                                  ? "numeric"
                                  : undefined
                              }
                              value={editandoBonus[pq.id]}
                              onChange={(e) =>
                                setEditandoBonus((prev) => ({
                                  ...prev,
                                  [pq.id]: e.target.value,
                                }))
                              }
                              placeholder={
                                (pq.tipo ?? "texto") === "numero"
                                  ? "Ej: 42"
                                  : "Tu respuesta..."
                              }
                              className="flex-1 min-w-[160px] bg-metal-800 border border-yellow-900 rounded px-3 py-1.5 text-sm text-metal-100 focus:outline-none focus:ring-2 focus:ring-yellow-700"
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  guardarRespuestaBonus(pq.id);
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => guardarRespuestaBonus(pq.id)}
                              disabled={!!guardandoBonus[pq.id]}
                              className="bg-yellow-800 hover:bg-yellow-700 disabled:opacity-60 text-white text-xs px-3 py-1.5 rounded font-display font-semibold tracking-wider uppercase transition-colors"
                            >
                              {guardandoBonus[pq.id] ? "..." : "Guardar"}
                            </button>
                            <button
                              onClick={() =>
                                setEditandoBonus((prev) => {
                                  const n = { ...prev };
                                  delete n[pq.id];
                                  return n;
                                })
                              }
                              className="text-metal-500 hover:text-metal-300 text-xs px-2 py-1.5 font-display"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
