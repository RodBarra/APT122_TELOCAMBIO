// src/pages/publicaciones/PublicacionesList.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertErr } from "../../components/Alert";
import ConfirmModal from "../../components/ConfirmModal";
import PublicationCard from "../../components/PublicationCard";
import {
  getCategorias,
  listPublicaciones,
  toggleEstado,
  deletePublicacion,
} from "../../services/publicaciones";
import type { Categoria, PublicacionListItem } from "../../types";

// ==============================
// CONFIGURACIÓN GLOBAL
// ==============================
const PAGE_SIZE = 10; // ✅ lo que pediste
const CACHE_KEY = "publicaciones_filtros_v1";

type Orden = "recientes" | "alfabetico" | "ofertas_desc";

// ==============================
// HELPERS
// ==============================
function normalizeCats(input: any): Categoria[] {
  if (Array.isArray(input)) return input;
  if (input?.results) return input.results;
  if (input?.items) return input.items;
  if (input?.data) return input.data;
  return [];
}

function normalizeList(input: any): {
  results: PublicacionListItem[];
  total: number;
} {
  if (Array.isArray(input)) return { results: input, total: input.length };

  const results = Array.isArray(input?.results) ? input.results : [];

  // ✅ IMPORTANTE:
  // tu service devuelve { results, meta:{count,page,page_size} }
  // DRF devuelve { count, results }
  const total =
    (typeof input?.meta?.count === "number" && input.meta.count) ||
    (typeof input?.count === "number" && input.count) ||
    (typeof input?.meta?.total === "number" && input.meta.total) ||
    (typeof input?.total === "number" && input.total) ||
    results.length;

  return { results, total };
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-[4/3] md:aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-gray-200 rounded" />
        <div className="h-3 w-1/3 bg-gray-200 rounded" />
        <div className="h-8 w-full bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

// ——— Permisos locales UI (no mutar si realizada o bloqueada)
function canMutate(item: PublicacionListItem): boolean {
  return item.estado_publicacion_id !== 3 && !(item as any).bloqueada;
}

// ==============================
// COMPONENTE PRINCIPAL
// ==============================
export default function PublicacionesList() {
  const nav = useNavigate();

  // --- Estado principal ---
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<PublicacionListItem[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [total, setTotal] = useState(0);

  // --- Filtros persistentes ---
  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState<number | undefined>();
  const [orden, setOrden] = useState<Orden>("recientes");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);

  // --- Modal de confirmación de borrado ---
  const [confirm, setConfirm] = useState<{
    open: boolean;
    ids: number[];
    title: string;
    description: string;
    loading: boolean;
  }>({
    open: false,
    ids: [],
    title: "",
    description: "",
    loading: false,
  });

  const searchRef = useRef<HTMLInputElement | null>(null);

  // requestId para evitar que respuestas viejas pisen el estado nuevo
  const reqIdRef = useRef(0);

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  // ==============================
  // CARGA INICIAL + PERSISTENCIA
  // ==============================
  useEffect(() => {
    const saved = localStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setQ(s.q ?? "");
        setCategoriaId(s.categoriaId ?? undefined);
        setOrden(s.orden ?? "recientes");
        setMine(!!s.mine);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ q, categoriaId, orden, mine })
    );
  }, [q, categoriaId, orden, mine]);

  // ==============================
  // CATEGORÍAS (1 sola vez)
  // ==============================
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const catsRaw = await getCategorias();
        if (mounted) setCategorias(normalizeCats(catsRaw));
      } catch {
        // no rompas el flujo por categorías
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ==============================
  // CARGA DE LISTADO (con stale-guard)
  // ==============================
  const loadList = useCallback(
    async (opts?: { pageOverride?: number }) => {
      const myReqId = ++reqIdRef.current;

      try {
        setLoading(true);
        setErr(null);

        const pageToUse = opts?.pageOverride ?? page;

        const listRaw = await listPublicaciones({
          q,
          categoria_id: categoriaId,
          orden,
          page: pageToUse,
          page_size: PAGE_SIZE,
          mine,
        });

        if (myReqId !== reqIdRef.current) return; // ⛔ respuesta vieja

        const { results, total } = normalizeList(listRaw);

        setItems(results);
        setTotal(total);
      } catch (e: any) {
        if (myReqId !== reqIdRef.current) return;
        setErr(e?.message || "Error al cargar publicaciones.");
      } finally {
        if (myReqId === reqIdRef.current) setLoading(false);
      }
    },
    [q, categoriaId, orden, page, mine]
  );

  // ✅ Carga normal al cambiar página o filtros (excepto q, q va con debounce)
  useEffect(() => {
    loadList();
  }, [categoriaId, orden, page, mine, loadList]);

  // ==============================
  // BÚSQUEDA (DEBOUNCED) ✅ FIX REAL
  // ==============================
  // Antes: dependía de loadList => loadList cambia con page => te volvía a page 1.
  // Ahora: solo se dispara con q/categoria/orden/mine, resetea la página y luego carga.
  const loadListRef = useRef(loadList);
  useEffect(() => {
    loadListRef.current = loadList;
  }, [loadList]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadListRef.current({ pageOverride: 1 });
    }, 450);
    return () => clearTimeout(t);
  }, [q, categoriaId, orden, mine]);

  // ==============================
  // EVENTOS
  // ==============================
  const onEdit = (id: number) => nav(`/publicaciones/${id}/editar`);

  const onToggleVisibility = async (item: PublicacionListItem) => {
    if (!canMutate(item)) {
      setErr(
        item.estado_publicacion_id === 3
          ? "Esta publicación está realizada y no permite cambios."
          : "Esta publicación está bloqueada por un intercambio."
      );
      return;
    }
    await toggleEstado(item);
    await loadList();
  };

  const onDelete = (id: number) => {
    const it = items.find((x) => x.id === id);
    const titulo = it?.titulo?.trim();
    setConfirm({
      open: true,
      ids: [id],
      title: "Eliminar publicación",
      description: `Esta acción es definitiva. Se eliminará la publicación${
        titulo ? `: “${titulo}”` : ` #${id}`
      } y sus imágenes asociadas.`,
      loading: false,
    });
  };

  const confirmDelete = async () => {
    try {
      setConfirm((c) => ({ ...c, loading: true }));
      await Promise.all(confirm.ids.map((id) => deletePublicacion(id)));
      setConfirm({
        open: false,
        ids: [],
        title: "",
        description: "",
        loading: false,
      });
      await loadList();
    } catch (e: any) {
      setErr(e?.message || "No se pudo eliminar.");
      setConfirm((c) => ({ ...c, loading: false }));
    }
  };

  const clearFilters = () => {
    setQ("");
    setCategoriaId(undefined);
    setOrden("recientes");
    setMine(false);
    setPage(1);
    loadList({ pageOverride: 1 });
    searchRef.current?.focus();
  };

  // ==============================
  // CÁLCULOS DERIVADOS
  // ==============================
  const resumenMisPublicaciones = useMemo(() => {
    if (!mine) return null;
    const activas = items.filter((i) => i.estado_publicacion_id === 1).length;
    const ocultas = items.filter((i) => i.estado_publicacion_id === 2).length;
    return { activas, ocultas };
  }, [mine, items]);

  // ==============================
  // RENDER
  // ==============================
  const bgUrl = "/bg-publicaciones.png";

  const tituloPrincipal = mine ? "Mis publicaciones ✨" : "Publicaciones 📦";
  const subtituloPrincipal = mine
    ? "Administra tus publicaciones activas y ocultas. Aquí puedes editar, mostrar, ocultar o eliminar tus publicaciones de forma rápida y segura."
    : "Explora y gestiona las publicaciones activas dentro de tu comunidad.";

  return (
    <div className="relative min-h-screen antialiased">
      {/* Fondo */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-slate-900/55" />

      {/* Contenedor principal */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 2xl:px-0 py-10 w-full max-w-[1600px]">
        <div className="rounded-2xl bg-white/90 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
          {/* HEADER */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                {mine ? "Panel privado" : "Panel principal"}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                {tituloPrincipal}
              </h1>
              <p className="mt-1 text-sm text-slate-600">{subtituloPrincipal}</p>

              {mine && resumenMisPublicaciones && (
                <p className="mt-2 text-xs sm:text-sm">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 font-medium mr-2">
                    ✅ Activas: {resumenMisPublicaciones.activas}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 font-medium">
                    👁️‍🗨️ Ocultas: {resumenMisPublicaciones.ocultas}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              {mine && (
                <button
                  type="button"
                  onClick={() => {
                    setMine(false);
                    setPage(1);
                  }}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold 
                             bg-white text-slate-800 border border-slate-300 
                             hover:bg-slate-50 transition-all duration-200"
                >
                  ← Ver publicaciones de la comunidad
                </button>
              )}

              <Link
                to="/publicaciones/nueva"
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold 
                           bg-blue-600 text-white border border-blue-600 
                           transition-all duration-200 
                           hover:bg-white hover:text-blue-600 hover:border-blue-600"
              >
                Nueva publicación
              </Link>
            </div>
          </div>

          {/* FILTROS */}
          {!mine && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                  🔍
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Busca y filtra publicaciones
                  </p>
                  <p className="text-xs text-slate-500">
                    Usa el buscador, la categoría y el orden para encontrar más
                    rápido lo que necesitas.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12 items-end">
                <div className="xl:col-span-4 md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Buscar por título o descripción
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">
                      🔎
                    </span>
                    <input
                      ref={searchRef}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Ej: Bicicleta, libros, servicios…"
                      className="w-full rounded-xl h-10 border border-slate-300 bg-white text-slate-900 placeholder-slate-400 text-sm 
                                 pl-9 pr-3
                                 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    />
                  </div>
                </div>

                <div className="xl:col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Categoría
                  </label>
                  <select
                    value={categoriaId ?? ""}
                    onChange={(e) =>
                      setCategoriaId(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="w-full rounded-xl h-10 border border-slate-300 bg-white text-slate-900 text-sm 
                               px-3
                               focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  >
                    <option value="">Todas</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="xl:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Orden
                  </label>
                  <select
                    value={orden}
                    onChange={(e) => setOrden(e.target.value as Orden)}
                    className="w-full rounded-xl h-10 border border-slate-300 bg-white text-slate-900 text-sm 
                               px-3
                               focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="alfabetico">Alfabético</option>
                    <option value="ofertas_desc">Más ofertas primero</option>
                  </select>
                </div>

                <div className="xl:col-span-3 flex md:flex-row flex-col gap-2 items-stretch md:items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMine(true);
                      setPage(1);
                    }}
                    className="inline-flex items-center justify-center rounded-xl px-3 text-sm font-semibold h-10 border transition-all duration-200
                               bg-blue-600 text-white border-blue-600 hover:bg-white hover:text-blue-600 hover:border-blue-600"
                    title="Ver solo tus publicaciones"
                  >
                    Mis publicaciones
                  </button>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center justify-center rounded-xl px-3 text-sm font-semibold h-10 
                               bg-blue-600 text-white border border-blue-600 
                               transition-all duration-200 
                               hover:bg-white hover:text-blue-600 hover:border-blue-600"
                    title="Restablecer filtros"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            </div>
          )}

          {err && <AlertErr>{err}</AlertErr>}

          {/* LISTADO */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <span className="text-3xl">{mine ? "📭" : "🕊️"}</span>
              </div>
              <h2 className="text-lg font-semibold mb-1">
                {mine
                  ? "Aún no tienes publicaciones activas u ocultas"
                  : "No se encontraron publicaciones"}
              </h2>
              <p className="text-gray-500 mb-4">
                {mine
                  ? "Crea tu primera publicación para comenzar a intercambiar dentro de tu comunidad."
                  : "Ajusta los filtros o crea una nueva publicación para comenzar."}
              </p>
              <Link
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold 
                           bg-blue-600 text-white border border-blue-600 
                           transition-all duration-200 
                           hover:bg-white hover:text-blue-600 hover:border-blue-600"
                to="/publicaciones/nueva"
              >
                Crear publicación
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {items.map((it) => (
                  <div key={it.id} className="relative transition-all">
                    <PublicationCard
                      item={{
                        ...it,
                        // ✅ cache buster estable
                        primera_imagen: it.primera_imagen
                          ? `${it.primera_imagen}?v=${encodeURIComponent(
                              it.actualizada_en || it.creada_en || ""
                            )}`
                          : null,
                      }}
                      showActions={mine && canMutate(it)}
                      onEdit={onEdit}
                      onToggleVisibility={onToggleVisibility}
                      onDelete={onDelete}
                      highlight={!mine && q.trim() ? q.trim() : undefined}
                    />
                  </div>
                ))}
              </div>

              {/* PAGINACIÓN */}
              {totalPaginas > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                  <button
                    className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ⬅️ Anterior
                  </button>

                  <span className="text-sm text-gray-600">
                    Página <span className="font-semibold">{page}</span> de{" "}
                    {totalPaginas}
                  </span>

                  <button
                    className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                    disabled={page >= totalPaginas}
                    onClick={() =>
                      setPage((p) => Math.min(totalPaginas, p + 1))
                    }
                  >
                    Siguiente ➡️
                  </button>
                </div>
              )}
            </>
          )}

          {/* MODAL ELIMINAR */}
          <ConfirmModal
            open={confirm.open}
            title={confirm.title}
            tone="danger"
            confirmText="Eliminar publicación"
            cancelText="Cancelar"
            disabled={confirm.loading}
            onCancel={() =>
              setConfirm({
                open: false,
                ids: [],
                title: "",
                description: "",
                loading: false,
              })
            }
            onConfirm={confirmDelete}
          >
            <p className="text-sm">{confirm.description}</p>
          </ConfirmModal>
        </div>
      </div>
    </div>
  );
}
 