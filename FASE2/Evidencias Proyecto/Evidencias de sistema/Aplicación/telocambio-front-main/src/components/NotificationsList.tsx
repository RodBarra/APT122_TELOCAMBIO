// src/components/NotificationsList.tsx
import { useEffect, useState } from "react";
import {
  listNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
  eliminarNotif,
  type Notification,
} from "../services/notificaciones";
import { useNavigate } from "react-router-dom";

type Props = {
  onSeenChange?: (unreadCount: number) => void;
};

function TipoChip({ tipo }: { tipo: Notification["tipo"] }) {
  const map: Record<Notification["tipo"], string> = {
    OFERTA_RECIBIDA: "Oferta",
    OFERTA_ACEPTADA: "Aceptada",
    INTERCAMBIO_MARCADO_REALIZADO: "Marcado",
    INTERCAMBIO_FINALIZADO_PENDIENTE_VALORACION: "Finalizado",
  };
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-gray-50 text-gray-700 border-gray-200">
      {map[tipo] ?? "—"}
    </span>
  );
}

export default function NotificationsList({ onSeenChange }: Props) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const refresh = async () => {
    setLoading(true);
    try {
      const [all, onlyUnread] = await Promise.all([
        listNotificaciones({ page_size: 30 }),
        listNotificaciones({ soloNoLeidas: true, page_size: 30 }),
      ]);
      setItems(all);
      onSeenChange?.(onlyUnread.length);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const handleGo = async (n: Notification) => {
    try {
      if (!n.leida_en) {
        await marcarLeida(n.id);
      }
    } finally {
      if (n.link_url) {
        nav(n.link_url);
      } else if (n.intercambio_id) {
        nav(`/intercambios/${n.intercambio_id}`);
      }
      refresh();
    }
  };

  const handleMarcarTodas = async () => {
    await marcarTodasLeidas();
    refresh();
  };

  const handleEliminar = async (id: number) => {
    await eliminarNotif(id);
    refresh();
  };

  return (
    <div className="max-h-[70vh] overflow-auto">
      <div className="px-3 py-2 flex items-center justify-between">
        <button
          className="text-xs text-blue-600 hover:underline"
          onClick={handleMarcarTodas}
        >
          Marcar todas como leídas
        </button>
        <button
          className="text-xs text-gray-500 hover:underline"
          onClick={refresh}
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-sm text-gray-500">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="px-4 py-8 text-sm text-gray-500">No tienes notificaciones</div>
      ) : (
        <ul className="divide-y">
          {items.map((n) => (
            <li
              key={n.id}
              className={`px-4 py-3 hover:bg-gray-50 ${!n.leida_en ? "bg-blue-50/40" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {/* icono simple */}
                  <div className="h-8 w-8 rounded-full grid place-items-center border text-gray-600">
                    🔔
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium truncate">{n.titulo}</div>
                    <TipoChip tipo={n.tipo} />
                  </div>
                  <div className="text-sm text-gray-700 mt-0.5">{n.mensaje}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="text-xs text-white bg-blue-600 hover:bg-blue-700 rounded px-2 py-1"
                      onClick={() => handleGo(n)}
                    >
                      Ver
                    </button>
                    {!n.leida_en && (
                      <button
                        className="text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded px-2 py-1"
                        onClick={async () => { await marcarLeida(n.id); refresh(); }}
                      >
                        Marcar leída
                      </button>
                    )}
                    <button
                      className="text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded px-2 py-1"
                      onClick={() => handleEliminar(n.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {new Date(n.creada_en).toLocaleString()}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
