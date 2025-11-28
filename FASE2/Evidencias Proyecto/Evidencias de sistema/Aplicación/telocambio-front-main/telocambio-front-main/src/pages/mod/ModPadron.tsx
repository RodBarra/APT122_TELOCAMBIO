import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { PadronApi, type PadronItem } from "../../services/padron";
import { AlertErr, AlertOk } from "../../components/Alert";
import ConfirmModal from "../../components/ConfirmModal";

type EstadoFiltro = "" | "Libre" | "Usado";

// Hook simple para "retrasar" la actualización de un valor
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function ModPadron() {
  const { user } = useAuth();

  const [items, setItems] = useState<PadronItem[]>([]);

  // búsqueda con debounce
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 500);

  const [estado, setEstado] = useState<EstadoFiltro>("");
  const [habilitado, setHabilitado] = useState<"" | "1" | "0">("");

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [form, setForm] = useState({ correo: "" });
  const [loadingAdd, setLoadingAdd] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCorreo, setEditingCorreo] = useState<string>("");

  // modal eliminar
  const [toDelete, setToDelete] = useState<PadronItem | null>(null);
  const openDelete = (row: PadronItem) => setToDelete(row);
  const closeDelete = () => setToDelete(null);

  // paginación local
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const load = async () => {
    setErr(null);
    try {
      if (!user?.comunidad_id) return;
      const params: any = {};
      if (debouncedQ) params.q = debouncedQ;
      if (estado) params.estado = estado;
      if (habilitado !== "") params.habilitado = habilitado === "1";
      const { data } = await PadronApi.list(user.comunidad_id, params);
      setItems(data.items || []);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "No se pudo cargar el padrón.");
    }
  };

  useEffect(() => {
    setPage(1); // resetea página al cambiar filtros
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.comunidad_id, debouncedQ, estado, habilitado]);

  // total y elementos de la página actual
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    // si se reduce el total, ajusta página para no quedar fuera de rango
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const onClearSearch = () => {
    setQ("");
    setEstado("");
    setHabilitado("");
  };

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    setOk(null);
    setErr(null);
    if (!user?.comunidad_id) return;
    if (!form.correo.trim()) return;
    setLoadingAdd(true);
    try {
      await PadronApi.add(user.comunidad_id, { correo: form.correo.trim() });
      setForm({ correo: "" });
      setOk("Correo agregado al padrón.");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "No se pudo agregar el correo.");
    } finally {
      setLoadingAdd(false);
    }
  };

  const startEdit = (row: PadronItem) => {
    setEditingId(row.id);
    setEditingCorreo(row.correo);
  };

  const saveEdit = async (row: PadronItem) => {
    if (!user?.comunidad_id || editingId !== row.id) return;
    try {
      await PadronApi.updateCorreo(
        user.comunidad_id,
        row.id,
        editingCorreo.trim()
      );
      setEditingId(null);
      setEditingCorreo("");
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "No se pudo actualizar el correo.");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingCorreo("");
  };

  const remove = (row: PadronItem) => {
    if (!user?.comunidad_id) return;
    openDelete(row);
  };

  const confirmDelete = async () => {
    if (!user?.comunidad_id || !toDelete) return;
    try {
      await PadronApi.remove(user.comunidad_id, toDelete.id);
      closeDelete();
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "No se pudo eliminar del padrón.");
      closeDelete();
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: "url('/condominio.png')" }}
    >
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Panel de administración
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              Padrón de Correos📧
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Correos habilitados para registrarse en esta comunidad.
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="rounded-2xl border border-slate-800/50 shadow-sm bg-[linear-gradient(135deg,#273a9b,#111a34)] text-white">
          <div className="grid gap-4 p-4 md:grid-cols-[2fr,1fr,1fr,auto] items-end">
            {/* Buscar */}
            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Buscar
              <input
                className="input mt-1 bg-white text-slate-900 placeholder-slate-400 text-sm"
                placeholder="Buscar correo…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>

            {/* Estado */}
            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Estado
              <select
                className="input mt-1 bg-white text-slate-900 text-sm"
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoFiltro)}
              >
                <option value="">(todos)</option>
                <option value="Libre">Libre</option>
                <option value="Usado">Usado</option>
              </select>
            </label>

            {/* Habilitado */}
            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Habilitado
              <select
                className="input mt-1 bg-white text-slate-900 text-sm"
                value={habilitado}
                onChange={(e) =>
                  setHabilitado(e.target.value as "" | "1" | "0")
                }
              >
                <option value="">(todos)</option>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </label>

            {/* Botón limpiar filtros */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClearSearch}
                className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white border border-blue-600 transition-all duration-200 hover:bg-white hover:text-blue-600 hover:border-blue-600 active:bg-blue-600 active:text-white active:border-blue-600"
                title="Limpiar filtros"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* ALERTAS */}
        {ok && <AlertOk>{ok}</AlertOk>}
        {err && <AlertErr>{err}</AlertErr>}

        {/* FORM AGREGAR CORREO */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-6 py-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">
            Agregar correo al padrón
          </h2>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,3fr),auto]"
            onSubmit={onAdd}
          >
            <input
              className="input text-sm"
              placeholder="correo@ejemplo.cl"
              value={form.correo}
              onChange={(e) => setForm({ correo: e.target.value })}
              required
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white border border-blue-600 transition-all duration-200 hover:bg-white hover:text-blue-600 hover:border-blue-600 active:bg-blue-600 active:text-white active:border-blue-600"
              disabled={loadingAdd}
            >
              {loadingAdd ? "Agregando…" : "Agregar correo"}
            </button>
          </form>
        </div>

        {/* TABLA + PAGINACIÓN (scroll solo en tabla) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Solo tabla con scroll horizontal */}
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full table-auto text-sm">
              <thead>
                <tr className="bg-[linear-gradient(180deg,#273a9b,#1b2554)] text-xs font-semibold uppercase tracking-wide text-white text-center">
                  <th className="px-3 py-3 rounded-tl-2xl">Correo</th>
                  <th className="px-3 py-3">Habilitado</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Cargado en</th>
                  <th className="px-3 py-3 rounded-tr-2xl w-[120px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-center">
                {pageItems.map((row) => {
                  const libre = row.estado === "Libre";
                  return (
                    <tr
                      key={row.id}
                      className="odd:bg-white even:bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      {/* Correo (editable si está Libre) */}
                      <td className="px-3 py-3 text-center">
                        {editingId === row.id ? (
                          <div className="inline-block w-full max-w-[320px]">
                            <input
                              className="input h-8 w-full text-[15px] text-center"
                              value={editingCorreo}
                              onChange={(e) => setEditingCorreo(e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="block truncate lg:whitespace-normal lg:break-words text-[15px]">
                            {row.correo}
                          </span>
                        )}
                      </td>

                      {/* Habilitado */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                            row.habilitado
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {row.habilitado ? "Sí" : "No"}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            libre
                              ? "bg-emerald-600 text-white"
                              : "bg-rose-600 text-white"
                          }`}
                        >
                          {row.estado}
                        </span>
                      </td>

                      {/* Cargado en */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {row.cargado_en
                          ? new Date(row.cargado_en).toLocaleString()
                          : "-"}
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-3 w-[120px]">
                        {editingId === row.id ? (
                          // MODO EDICIÓN: iconos 💾 y ✖️ con mismo tamaño que los otros
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-blue-600 text-white border border-blue-500 transition-colors hover:bg-white hover:text-blue-600"
                              onClick={() => saveEdit(row)}
                              title="Guardar cambios"
                              aria-label="Guardar cambios"
                            >
                              💾
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-300 transition-colors hover:bg-slate-50"
                              onClick={cancelEdit}
                              title="Cancelar edición"
                              aria-label="Cancelar edición"
                            >
                              ✖️
                            </button>
                          </div>
                        ) : (
                          // MODO NORMAL: ✏️ y 🗑️ (igual que antes)
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-blue-600 border border-blue-500 transition-colors hover:bg-blue-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                              title={
                                libre ? "Editar correo" : "No editable si está usado"
                              }
                              onClick={() => libre && startEdit(row)}
                              disabled={!libre}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-rose-600 text-white border border-rose-600 transition-colors hover:bg-white hover:text-rose-600 active:bg-rose-600 active:text-white"
                              title="Eliminar del padrón"
                              onClick={() => remove(row)}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}

                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Sin correos cargados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación fija, fuera del scroll horizontal */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm md:flex-row rounded-b-2xl">
            <div className="text-slate-700">
              Mostrando {total === 0 ? 0 : (page - 1) * pageSize + 1}
              {" – "}
              {total === 0
                ? 0
                : Math.min(page * pageSize, total)}
              {" de un total de "}
              {total}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm bg-white text-blue-600 border border-blue-500 hover:bg-blue-600 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>

              <span className="text-slate-700">
                Página {total === 0 ? 0 : page} /{" "}
                {total === 0 ? 0 : totalPages}
              </span>

              <button
                className="btn btn-sm bg-white text-blue-600 border border-blue-500 hover:bg-blue-600 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page >= totalPages || total === 0}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>

        {/* MODAL eliminar padrón */}
        <ConfirmModal
          open={!!toDelete}
          title="Eliminar del padrón"
          tone="danger"
          message={
            <div className="text-center">
              <p className="mb-1">
                Esta acción{" "}
                <span className="font-semibold text-rose-600">
                  no se puede deshacer.
                </span>
              </p>
              <p>
                Se eliminará del padrón el correo:{" "}
                <span className="font-mono text-slate-900">
                  {toDelete?.correo}
                </span>
              </p>
            </div>
          }
          confirmText="Eliminar del padrón"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onCancel={closeDelete}
        />
      </div>
    </div>
  );
}
