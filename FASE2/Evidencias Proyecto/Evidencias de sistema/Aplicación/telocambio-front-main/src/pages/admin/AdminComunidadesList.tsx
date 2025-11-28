import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ComunidadesApi,
  type Comunidad,
  type ComunidadListParams,
} from "../../services/comunidades";

type Sort = { key: string; dir: "asc" | "desc" };

function Badge({ children }: { children: any }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-700 bg-slate-50 whitespace-nowrap">
      {children}
    </span>
  );
}

function EstadoSelect({
  value,
  onChange,
  disabled,
}: {
  value?: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className="input h-9 min-w-[8rem] text-center"
      value={value ?? ""}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
    >
      <option value="">—</option>
      <option value={1}>Activa</option>
      <option value={2}>Suspendida</option>
    </select>
  );
}

// —— Estética por estado (rail sólido) ——
const rowAccent = (estadoId?: number | null) => {
  if (estadoId === 2) return { rail: "bg-rose-500" }; // suspendida
  if (estadoId === 1) return { rail: "bg-emerald-500" }; // activa
  return { rail: "bg-slate-400" }; // desconocido
};

export default function AdminComunidadesList() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<Comunidad[]>([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<"" | 1 | 2>("");
  const [estado, setEstado] = useState<"" | number>("");
  const [sort, setSort] = useState<Sort>({ key: "creado_en", dir: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  type EditBuffer = Record<
    number,
    { nombre?: string; estado_comunidad_id?: number | null }
  >;
  const [edit, setEdit] = useState<EditBuffer>({});

  const params: ComunidadListParams = useMemo(() => {
    const ordering = `${sort.dir === "desc" ? "-" : ""}${sort.key}`;
    return {
      q: q || undefined,
      tipo_id: (tipo as any) || undefined,
      estado: (estado as any) || undefined,
      ordering,
      page,
      page_size: pageSize,
    };
  }, [q, tipo, estado, sort, page, pageSize]);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await ComunidadesApi.list(params);
      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "No se pudo obtener comunidades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const onSort = (key: string) => {
    if (key === "acciones" || key === "moderador_correo") return;
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setEditField = (id: number, patch: Partial<Comunidad>) => {
    setEdit((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  };

  const hasChanges = (r: Comunidad) => {
    const e = edit[r.id];
    if (!e) return false;
    const nameChanged = e.nombre !== undefined && e.nombre !== r.nombre;
    const estChanged =
      e.estado_comunidad_id !== undefined &&
      e.estado_comunidad_id !== r.estado_comunidad_id;
    return nameChanged || estChanged;
  };

  const save = async (r: Comunidad) => {
    const e = edit[r.id];
    if (!e) return;
    const patch: { nombre?: string; estado_comunidad_id?: number } = {};
    if (e.nombre !== undefined && e.nombre !== r.nombre) patch.nombre = e.nombre!;
    if (
      e.estado_comunidad_id !== undefined &&
      e.estado_comunidad_id !== r.estado_comunidad_id
    )
      patch.estado_comunidad_id = e.estado_comunidad_id ?? undefined;

    if (Object.keys(patch).length === 0) return;

    await ComunidadesApi.update(r.id, patch);
    setEdit((buf) => {
      const { [r.id]: _, ...rest } = buf;
      return rest;
    });
    await load();
  };

  const resetFilters = () => {
    setQ("");
    setTipo("");
    setEstado("");
    setSort({ key: "creado_en", dir: "desc" });
    setPage(1);
  };

  const headers = [
    { key: "id", label: "ID", cls: "min-w-[3.5rem]" },
    { key: "nombre", label: "Nombre", cls: "min-w-[260px] max-w-[420px]" },
    { key: "tipo_id", label: "Tipo", cls: "min-w-[130px]" },
    { key: "codigo", label: "Código", cls: "min-w-[140px]" },
    {
      key: "moderador_correo",
      label: "Moderador",
      cls: "min-w-[260px] hidden lg:table-cell",
    },
    { key: "estado_comunidad_id", label: "Estado", cls: "min-w-[140px]" },
    {
      key: "creado_en",
      label: "Creada",
      cls: "min-w-[180px] hidden md:table-cell",
    },
    { key: "acciones", label: "Acciones", cls: "min-w-[170px]" },
  ] as const;

  return (
    <div
      className="min-h-screen bg-cover bg-center px-4 py-8"
      style={{ backgroundImage: "url('/condominio.png')" }}
    >
      {/* ancho casi completo de pantalla grande */}
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* HEADER */}
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 px-6 py-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Panel de administración
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Comunidades 🏢
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Gestión centralizada de comunidades, códigos y estado operativo.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link
              to="/admin/moderador/nuevo"
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white border border-blue-600 transition-all duration-200  hover:bg-white hover:text-blue-600 hover:border-blue-600 active:bg-blue-600 active:text-white active:border-blue-600"
              title="Crear moderador"
            >
              Crear moderador
            </Link>
            <button
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white border border-blue-600 transition-all duration-200  hover:bg-white hover:text-blue-600 hover:border-blue-600 active:bg-blue-600 active:text-white active:border-blue-600"
              onClick={() => navigate("/admin/comunidades/nueva")}
              title="Crear una nueva comunidad"
            >
              Crear comunidad
            </button>
          </div>
        </div>

        {/* FILTROS */}
        <div className="rounded-2xl border border-slate-800/50 shadow-sm bg-[linear-gradient(135deg,#273a9b,#111a34)] text-white">
          <div className="grid gap-4 p-4 md:grid-cols-[2fr,1fr,1fr,1fr] items-end">
            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Nombre o código
              <div className="mt-1 flex gap-2">
                <input
                  className="input w-full bg-white text-slate-900 placeholder-slate-400 text-sm"
                  placeholder="Ej: Los Robles…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </label>

            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Tipo
              <select
                className="input mt-1 bg-white text-slate-900 text-sm"
                value={tipo as any}
                onChange={(e) => {
                  setTipo((e.target.value ? Number(e.target.value) : "") as any);
                  setPage(1);
                }}
              >
                <option value="">Todos</option>
                <option value={1}>Departamento</option>
                <option value={2}>Condominio</option>
              </select>
            </label>

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
                <option value="">Todos</option>
                <option value={1}>Activa</option>
                <option value={2}>Suspendida</option>
              </select>
            </label>

            <label className="text-[11px] uppercase tracking-[0.15em] text-white/80">
              Orden
              <select
                className="input mt-1 bg-white text-slate-900 text-sm"
                value={`${sort.dir === "desc" ? "-" : ""}${sort.key}`}
                onChange={(e) => {
                  const val = e.target.value;
                  setSort({
                    key: val.replace("-", ""),
                    dir: val.startsWith("-") ? "desc" : "asc",
                  });
                  setPage(1);
                }}
              >
                <option value="-creado_en">Recientes primero</option>
                <option value="creado_en">Antiguas primero</option>
                <option value="nombre">Nombre (A–Z)</option>
                <option value="-nombre">Nombre (Z–A)</option>
                <option value="tipo_id">Tipo (asc)</option>
                <option value="-tipo_id">Tipo (desc)</option>
                <option value="estado_comunidad_id">Estado (asc)</option>
                <option value="-estado_comunidad_id">Estado (desc)</option>
              </select>
            </label>
          </div>

          {/* Botón limpiar filtros */}
          <div className="flex justify-end px-4 pb-4">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white border border-blue-600 transition-all duration-200  hover:bg-white hover:text-blue-600 hover:border-blue-600 active:bg-blue-600 active:text-white active:border-blue-600"
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

        {/* TABLA */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full table-auto text-sm">
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
                    {h.key !== "acciones" && h.key !== "moderador_correo" ? (
                      <button
                        className="inline-flex items-center gap-1 justify-center w-full"
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
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-6 text-slate-500"
                  >
                    Sin resultados
                  </td>
                </tr>
              )}

              {rows.map((r) => {
                const buffer = edit[r.id] || {};
                const nombre = buffer.nombre ?? r.nombre;
                const estadoVal =
                  buffer.estado_comunidad_id ?? r.estado_comunidad_id ?? undefined;
                const changed = hasChanges(r);
                const hasMod = !!r.moderador_correo;
                const accent = rowAccent(estadoVal);

                return (
                  <tr
                    key={r.id}
                    className="odd:bg-white even:bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    {/* ID con rail de color */}
                    <td
                      className={`px-3 py-3 font-semibold text-white whitespace-nowrap ${accent.rail}`}
                    >
                      {r.id}
                    </td>

                    {/* nombre editable */}
                    <td className="px-3 py-3">
                      <div className="flex justify-center">
                        <input
                          className="input h-9 w-full max-w-[420px] text-center"
                          value={nombre}
                          title={nombre}
                          onChange={(e) =>
                            setEditField(r.id, { nombre: e.target.value })
                          }
                        />
                      </div>
                    </td>

                    {/* tipo */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge>
                        {r.tipo_id === 1 ? "Departamento" : "Condominio"}
                      </Badge>
                    </td>

                    {/* código */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono">
                        {r.codigo}
                      </code>
                    </td>

                    {/* moderador */}
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {hasMod ? (
                        <span
                          className="block truncate"
                          title={r.moderador_correo || ""}
                        >
                          {r.moderador_correo}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* estado */}
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex justify-center">
                        <EstadoSelect
                          value={estadoVal as number | null | undefined}
                          onChange={(v) =>
                            setEditField(r.id, { estado_comunidad_id: v })
                          }
                        />
                      </div>
                    </td>

                    {/* creada */}
                    <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap text-[13px]">
                      {r.creado_en
                        ? new Date(r.creado_en).toLocaleString()
                        : "—"}
                    </td>

                    {/* acciones */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            changed
                              ? "bg-white text-blue-600 border border-blue-500 hover:bg-blue-600 hover:text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                          }`}
                          disabled={!changed}
                          onClick={() => save(r)}
                          title={changed ? "Guardar cambios" : "Sin cambios"}
                        >
                          Guardar
                        </button>

                        {!hasMod && (
                          <Link
                            to={`/admin/moderador/nuevo?comunidad_id=${r.id}`}
                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap bg-white text-blue-600 border border-blue-500 hover:bg-blue-600 hover:text-white transition-colors"
                            title="Asignar moderador"
                          >
                            Asignar
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {loading && (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-4 py-6 text-slate-500"
                  >
                    Cargando…
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Paginación */}
          <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm md:flex-row rounded-b-2xl">
            <div className="text-slate-700">
              Mostrando {rows.length ? (page - 1) * pageSize + 1 : 0}–
              {(page - 1) * pageSize + rows.length} de {total}
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
      </div>
    </div>
  );
}
