import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Navbar from "../components/Navbar";

function calcularPuntos(pred_local, pred_visit, real_local, real_visit) {
  if (real_local === null || real_visit === null) return 0;
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

const APORTE_POR_USUARIO = 5000;
const DISTRIBUCION_PREMIOS = [0.7, 0.2, 0.1];

function formatearCRC(monto) {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(monto);
}

export default function Tabla() {
  const [tabla, setTabla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalUsuarios, setTotalUsuarios] = useState(0);

  const totalRecaudado = tabla.length * APORTE_POR_USUARIO;
  const premiosTop = DISTRIBUCION_PREMIOS.map((parte) =>
    Math.round(totalRecaudado * parte),
  );

  useEffect(() => {
    async function cargar() {
      setLoading(true);

      const [
        { data: perfiles },
        { data: partidos },
        { data: predicciones },
        { data: preguntasBonus },
        { data: respuestasBonus },
      ] = await Promise.all([
        supabase.from("profiles").select("id, username, is_paid"),
        supabase
          .from("partidos")
          .select("id, goles_local_real, goles_visitante_real"),
        supabase.from("predicciones").select("*"),
        supabase
          .from("preguntas_bonus")
          .select("id, respuesta_correcta, puntos"),
        supabase.from("respuestas_bonus").select("*"),
      ]);

      if (!perfiles || !partidos || !predicciones) {
        setLoading(false);
        return;
      }

      setTotalUsuarios(perfiles.length);
      const perfilesPagados = perfiles.filter((perfil) => perfil.is_paid);

      const partidoMap = {};
      for (const p of partidos) partidoMap[p.id] = p;

      // Mapa bonus: pregunta_id -> respuesta_correcta normalizada
      const bonusMap = {};
      for (const pq of preguntasBonus || []) {
        if (pq.respuesta_correcta) {
          bonusMap[pq.id] = {
            correcta: pq.respuesta_correcta.trim().toLowerCase(),
            puntos: pq.puntos,
          };
        }
      }

      const resultado = perfilesPagados.map((perfil) => {
        const predsPerfil = predicciones.filter(
          (pr) => pr.user_id === perfil.id,
        );
        let puntos = 0;
        let exactos = 0;
        let resultados = 0;
        let jugados = 0;

        for (const pred of predsPerfil) {
          const partido = partidoMap[pred.partido_id];
          if (!partido) continue;
          const pts = calcularPuntos(
            pred.goles_local,
            pred.goles_visitante,
            partido.goles_local_real,
            partido.goles_visitante_real,
          );
          puntos += pts;
          if (partido.goles_local_real !== null) {
            jugados++;
            if (pts === 3) exactos++;
            else if (pts === 1) resultados++;
          }
        }

        // Puntos bonus
        let puntosBonus = 0;
        const respBonus = (respuestasBonus || []).filter(
          (r) => r.user_id === perfil.id,
        );
        for (const r of respBonus) {
          const bonus = bonusMap[r.pregunta_id];
          if (bonus && r.respuesta.trim().toLowerCase() === bonus.correcta) {
            puntosBonus += bonus.puntos;
          }
        }

        return {
          ...perfil,
          puntos: puntos + puntosBonus,
          exactos,
          resultados,
          jugados,
          puntosBonus,
        };
      });

      resultado.sort((a, b) => b.puntos - a.puntos || b.exactos - a.exactos);
      setTabla(resultado);
      setLoading(false);
    }

    cargar();
  }, []);

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
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="font-metal text-2xl text-white tracking-widest mb-6 uppercase">
          🏆 Tabla de Posiciones
        </h1>

        <div className="mb-4 bg-metal-900 rounded-xl border border-blood-800 p-4">
          <p className="text-xs font-display uppercase tracking-widest text-metal-400">
            Recaudación total
          </p>
          <p className="font-metal text-2xl text-blood-400 leading-none mt-1">
            {formatearCRC(totalRecaudado)}
          </p>
          <p className="text-xs text-metal-500 mt-1">
            {tabla.length} usuarios con pago confirmado de {totalUsuarios}{" "}
            registrados x {formatearCRC(APORTE_POR_USUARIO)}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap text-xs font-display tracking-wide">
            <span className="bg-metal-800 border border-metal-700 rounded px-2 py-1 text-metal-300">
              🥇 1ro: {formatearCRC(premiosTop[0] || 0)}
            </span>
            <span className="bg-metal-800 border border-metal-700 rounded px-2 py-1 text-metal-300">
              🥈 2do: {formatearCRC(premiosTop[1] || 0)}
            </span>
            <span className="bg-metal-800 border border-metal-700 rounded px-2 py-1 text-metal-300">
              🥉 3ro: {formatearCRC(premiosTop[2] || 0)}
            </span>
          </div>
        </div>

        <div className="bg-metal-900 rounded-xl border border-metal-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blood-900 text-metal-100">
                <th className="py-3 px-4 text-left font-display font-bold tracking-wider uppercase text-xs">
                  #
                </th>
                <th className="py-3 px-4 text-left font-display font-bold tracking-wider uppercase text-xs">
                  Jugador
                </th>
                <th className="py-3 px-4 text-center font-display font-bold tracking-wider uppercase text-xs">
                  Pts
                </th>
                <th className="py-3 px-4 text-center font-display font-bold tracking-wider uppercase text-xs hidden sm:table-cell">
                  🎯
                </th>
                <th className="py-3 px-4 text-center font-display font-bold tracking-wider uppercase text-xs hidden sm:table-cell">
                  ✅
                </th>
                <th className="py-3 px-4 text-center font-display font-bold tracking-wider uppercase text-xs hidden sm:table-cell">
                  Jugados
                </th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-t border-metal-800 ${
                    i === 0
                      ? "bg-blood-900/30"
                      : i % 2 === 0
                        ? "bg-metal-900"
                        : "bg-metal-800/50"
                  }`}
                >
                  <td className="py-3 px-4 font-display font-bold text-metal-400">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </td>
                  <td className="py-3 px-4 font-display font-semibold text-metal-100 tracking-wide">
                    {row.username}
                    {i < 3 && (
                      <span className="block text-[11px] text-green-400 font-display tracking-wide mt-0.5">
                        Ganando: {formatearCRC(premiosTop[i] || 0)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-metal font-bold text-blood-400 text-lg">
                    {row.puntos}
                  </td>
                  <td className="py-3 px-4 text-center text-metal-300 hidden sm:table-cell font-mono">
                    {row.exactos}
                  </td>
                  <td className="py-3 px-4 text-center text-metal-300 hidden sm:table-cell font-mono">
                    {row.resultados}
                  </td>
                  <td className="py-3 px-4 text-center text-metal-500 hidden sm:table-cell font-mono">
                    {row.jugados}
                  </td>
                </tr>
              ))}
              {tabla.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-metal-600 text-sm font-display italic"
                  >
                    Aún no hay puntos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-metal-600 flex gap-4 flex-wrap font-display tracking-wide">
          <span>🎯 Exactos (3 pts)</span>
          <span>✅ Resultado correcto (1 pt)</span>
          <span>⭐ Bonus (2 pts c/u)</span>
        </div>
      </div>
    </div>
  );
}
