import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  UsuariosApi,
  type UsuarioLite,
  type UsuarioListParams,
} from "../../services/usuarios";
import { ComunidadesApi } from "../../services/comunidades";
import type { Comunidad } from "../../services/comunidades";
import ConfirmModal from "../../components/ConfirmModal";

type Sort = { key: string; dir: "asc" | "desc" };

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function ModUsuarios() {
  const { user } = useAuth();
  const isAdmin = user?.rol_usuario_id === 1;
  const isMod = user?.rol_usuario_id === 2;

  // datos
  const [rows, setRows] = useState<UsuarioLite[]>([]);
  const [total, setTotal] = useState(0);

  // filtros / estado UI
  const [q, setQ] = useState("");
  const [rol, setRol] = useState<"" | 2 | 3>("");
  const [estado, setEstado] = useState<"" | number>("");
  const [comunidadId, setComunidadId] = useState<number | "">("");
  const [sort, setSort] = useState<Sort>({ key: "id", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // comunidades para Admin (filtro)
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);

  // modal eliminar
  const [toDelete, setToDelete] = useState<UsuarioLite | null>(null);
  const openDelete = (u: UsuarioLite) => setToDelete(u);
  const closeDelete = () => setToDelete(null);

  useEffect(() => {
    if (!isAdmin) return;
    ComunidadesApi.list({})
      .then(({ data }) => setComunidades(data.items || []))
      .catch(() => {});
  }, [isAdmin]);

  const params: UsuarioListParams = useMemo(() => {
    const p: UsuarioListParams = {
      q: q || undefined,
      ordering: `${sort.dir === "desc" ? "-" : ""}${sort.key}`,
      page,
      page_size: pageSize,
    };
    if (isAdmin) {
      if (rol) p.rol = rol as 2 | 3;
      if (estado) p.estado = estado as number;
      if (comunidadId) p.comunidad_id = Number(comunidadId);
    } else {
      if (estado) p.estado = estado as number;
    }
    return p;
  }, [q, rol, estado, sort, page, pageSize, comunidadId, isAdmin]);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await UsuariosApi.list(params);
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setErr(
        e?.response?.data?.detail || "No se pudieron cargar los usuarios."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const onSort = (key: string) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const update = async (id: number, patch: Partial<UsuarioLite>) => {
    await UsuariosApi.update(id, patch);
    await load();
  };

  const remove = (u: UsuarioLite) => {
    const canModEdit =
      isMod &&
      user?.comunidad_id === u.comunidad_id &&
      u.rol_usuario_id !== 1;
    const canAdminEdit = isAdmin;
    const allowed = canAdminEdit || canModEdit;
    if (!allowed) {
      alert("No autorizado para eliminar este usuario.");
      return;
    }
    openDelete(u);
  };

  const resetFilters = () => {
    setQ("");
    setRol("");
    setEstado("");
    setComunidadId("");
    setSort({ key: "id", dir: "desc" });
    setPage(1);
  };

  // columnas
  const headers = [
    { key: "id", label: "ID", cls: "min-w-[3.5rem]" },
    { key: "correo", label: "Usuario", cls: "min-w-[220px]" },
    { key: "nombre", label: "Nombre", cls: "min-w-[160px]" },
    { key: "apellidos", label: "Apellidos", cls: "min-w-[180px]" },
    {
      key: "telefono",
      label: "Teléfono",
      nosort: true,
      cls: "min-w-[140px] hidden lg:table-cell",
    },
    {
      key: "comunidad",
      label: "Comunidad",
      nosort: true,
      cls: "min-w-[220px] hidden md:table-cell",
    },
    {
      key: "registrado_en",
      label: "Registrado",
      cls: "min-w-[180px] hidden xl:table-cell",
    },
    {
      key: "actualizado_en",
      label: "Actualizado",
      cls: "min-w-[180px] hidden xl:table-cell",
    },
    { key: "rol_usuario_id", label: "Rol", cls: "min-w-[150px]" },
    { key: "estado_usuario_id", label: "Estado", cls: "min-w-[160px]" },
    { key: "acciones", label: "Eliminar", cls: "min-w-[90px]" },
  ] as const;

  const roleLabel = (r: 1 | 2 | 3) =>
    r === 1 ? "Admin" : r === 2 ? "Moderador" : "Residente";

  // —— Rail sólido por estado —— (1: activo, 2: suspendido)
  const rowAccent = (estadoId?: number | null) => {
    if (estadoId === 2) return { rail: "bg-rose-500" };
    return { rail: "bg-emerald-500" };
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
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Usuarios 👤
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestión centralizada de usuarios por rol, estado y comunidad.
            </p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="rounded-2xl border border-slate-800/50 shadow-sm bg-[linear-gradient(135deg,#273a9b,#111a34)] text-white">
          <div className="grid gap-4 p-4 md:grid-cols-[2fr,1fr,1fr,2fr] items-end">
            {/* Buscar */}
            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Buscar
              <input
                className="input mt-1 bg-white text-slate-900 placeholder-slate-400 text-sm"
                placeholder="Nombre o correo…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </label>

            {/* Rol */}
            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Rol
              {isAdmin ? (
                <select
                  className="input mt-1 bg-white text-slate-900 text-sm"
                  value={rol as any}
                  onChange={(e) => {
                    setRol(
                      (e.target.value ? Number(e.target.value) : "") as any
                    );
                    setPage(1);
                  }}
                >
                  <option value="">(todos)</option>
                  <option value={3}>Residente</option>
                  <option value={2}>Moderador</option>
                </select>
              ) : (
                <select
                  className="input mt-1 bg-white text-slate-900 text-sm"
                  value={3}
                  disabled
                >
                  <option value={3}>Residente</option>
                </select>
              )}
            </label>

            {/* Estado */}
            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Estado
              <select
                className="input mt-1 bg-white text-slate-900 text-sm"
                value={estado as any}
                onChange={(e) => {
                  setEstado(
                    (e.target.value ? Number(e.target.value) : "") as any
                  );
                  setPage(1);
                }}
              >
                <option value="">(todos)</option>
                <option value={1}>Activo</option>
                <option value={2}>Suspendido</option>
              </select>
            </label>

            {/* Comunidad (solo admin) */}
            {isAdmin && (
              <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
                Comunidad
                <select
                  className="input mt-1 bg-white text-slate-900 text-sm"
                  value={comunidadId as any}
                  onChange={(e) => {
                    setComunidadId(
                      e.target.value ? Number(e.target.value) : ""
                    );
                    setPage(1);
                  }}
                >
                  <option value="">(todas)</option>
                  {comunidades.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} — {c.codigo}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!isAdmin && <div className="hidden md:block" />}
          </div>

          {/* Botón limpiar filtros */}
          <div className="flex justify-end px-4 pb-4">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white border border-blue-600 transition-all duration-200 hover:bg-white hover:text-blue-600 hover:border-blue-600 active:bg-blue-600 active:text-white active:border-blue-600"
              title="Limpiar filtros"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* TABLA + PAGINACIÓN (scroll solo en la tabla) */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Solo la tabla tiene scroll horizontal */}
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full table-auto text-sm">
            <thead>
              <tr className="bg-[linear-gradient(180deg,#273a9b,#1b2554)] text-xs font-semibold uppercase tracking-wide text-white text-center">
                {headers.map((h, i) => (
                  <th
                    key={h.key}
                    className={[
                      "px-3 py-3",
                      i === 0 ? "rounded-tl-2xl" : "",
                      i === headers.length - 1 ? "rounded-tr-2xl" : "",
                      h.cls || "",
                    ].join(" ")}
                  >
                    {"nosort" in h && (h as any).nosort ? (
                      <span>{h.label}</span>
                    ) : h.key !== "acciones" ? (
                      <button
                        className="inline-flex items-center gap-1 w-full justify-center"
                        onClick={() => onSort(h.key)}
                      >
                        <span>{h.label}</span>
                        {sort.key === h.key ? (
                          <span className="text-white">
                            {sort.dir === "asc" ? "▲" : "▼"}
                          </span>
                        ) : (
                          <span className="text-white/40">↕</span>
                        )}
                      </button>
                    ) : (
                      <span>{h.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-center">
              {rows.map((u) => {
                const canModEdit =
                  isMod &&
                  user?.comunidad_id === u.comunidad_id &&
                  u.rol_usuario_id !== 1;
                const canAdminEdit = isAdmin;
                const canEdit = canAdminEdit || canModEdit;

                const accent = rowAccent(u.estado_usuario_id);

                return (
                  <tr
                    key={u.id}
                    className="odd:bg-white even:bg-slate-50 hover:bg-slate-100 transition-colors align-top"
                  >
                    {/* ID con rail de color */}
                    <td
                      className={`px-3 py-3 font-semibold text-white whitespace-nowrap ${accent.rail}`}
                    >
                      {u.id}
                    </td>

                    {/* Usuario */}
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900 truncate lg:whitespace-normal lg:break-words">
                        {u.correo}
                      </div>
                    </td>

                    {/* Nombre */}
                    <td className="px-3 py-3">
                      <span
                        className="block truncate lg:whitespace-normal lg:break-words"
                        title={u.nombre || ""}
                      >
                        {u.nombre || "-"}
                      </span>
                    </td>

                    {/* Apellidos */}
                    <td className="px-3 py-3">
                      <span
                        className="block truncate lg:whitespace-normal lg:break-words"
                        title={u.apellidos || ""}
                      >
                        {u.apellidos || "-"}
                      </span>
                    </td>

                    {/* Teléfono */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {u.telefono || "-"}
                    </td>

                    {/* Comunidad */}
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span
                        className="block truncate lg:whitespace-normal lg:break-words"
                        title={
                          u.comunidad_nombre || String(u.comunidad_id ?? "-")
                        }
                      >
                        {u.comunidad_nombre || (u.comunidad_id ?? "-")}
                      </span>
                    </td>

                    {/* Registrado / Actualizado */}
                    <td className="px-3 py-3 hidden xl:table-cell whitespace-nowrap">
                      {fmtDate(u.registrado_en)}
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell whitespace-nowrap">
                      {fmtDate(u.actualizado_en)}
                    </td>

                    {/* Rol (más espacio) */}
                    <td className="px-3 py-3">
                      {isAdmin ? (
                        <select
                          className="input h-9 min-w-[8.5rem] text-center"
                          value={u.rol_usuario_id}
                          onChange={(e) =>
                            update(u.id, {
                              rol_usuario_id: Number(
                                e.target.value
                              ) as 2 | 3,
                            })
                          }
                        >
                          <option value={3}>Residente</option>
                          <option value={2}>Moderador</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700 bg-slate-50 whitespace-nowrap">
                          {roleLabel(u.rol_usuario_id)}
                        </span>
                      )}
                    </td>

                    {/* Estado (más espacio) */}
                    <td className="px-3 py-3">
                      <select
                        className="input h-9 min-w-[9rem] text-center"
                        value={u.estado_usuario_id}
                        onChange={(e) =>
                          update(u.id, {
                            estado_usuario_id: Number(e.target.value),
                          })
                        }
                        disabled={!canEdit}
                      >
                        <option value={1}>Activo</option>
                        <option value={2}>Suspendido</option>
                      </select>
                    </td>

                    {/* Acciones */}
                    <td className="px-3 py-3">
                      <button
                        className="inline-flex items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-rose-600 text-white border border-rose-600 transition-all duration-200 hover:bg-white hover:text-rose-600 active:bg-rose-600 active:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => remove(u)}
                        disabled={!canEdit}
                        title={!canEdit ? "No autorizado" : "Eliminar usuario"}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Sin usuarios
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Cargando…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación fija, fuera del scroll horizontal */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm md:flex-row rounded-b-2xl">
          <div className="text-slate-700">
            Mostrando {rows.length ? (page - 1) * pageSize + 1 : 0}
            {" – "}
            {(page - 1) * pageSize + rows.length}
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
              Página {page} / {Math.max(1, totalPages)}
            </span>

            <button
              className="btn btn-sm bg-white text-blue-600 border border-blue-500 hover:bg-blue-600 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </button>
          </div>
          </div>
        </div>

        <ConfirmModal
          open={!!toDelete}
          title="Eliminar usuario"
          tone="danger"
          message={
            <>
              <p className="mb-1">
                Esta acción{" "}
                <span className="font-semibold text-rose-600">es definitiva.</span>
              </p>
              <p>
                Se eliminará el usuario:{" "}
                <span className="font-mono text-slate-900">
                  {toDelete?.correo}
                </span>
              </p>
            </>
          }
          confirmText="Eliminar usuario"
          cancelText="Cancelar"
          onCancel={closeDelete}
        />
      </div>
    </div>
  );
}
