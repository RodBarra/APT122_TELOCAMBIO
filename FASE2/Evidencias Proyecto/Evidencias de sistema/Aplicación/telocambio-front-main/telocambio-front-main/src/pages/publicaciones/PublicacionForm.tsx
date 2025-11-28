import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Spinner from "../../components/Spinner";
import { AlertErr } from "../../components/Alert";
import ImageGalleryEditor from "../../components/ImageGalleryEditor";
import {
  getCategorias,
  createPublicacion,
  getPublicacion,
  setImagenes,
  updatePublicacion,
  uploadImagenesArchivo,
} from "../../services/publicaciones";
import { useAuth } from "../../context/AuthContext";
import type { Categoria, Publicacion } from "../../types";

const ESTADO = { ACTIVA: 1, OCULTA: 2, REALIZADA: 3 } as const;

type GalleryItem = {
  id?: number;
  url?: string;
  file?: File;
  preview?: string;
  posicion?: number;
};

type FieldErrors = Partial<Record<"titulo" | "categoria_id", string>>;

export default function PublicacionForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cats, setCats] = useState<Categoria[]>([]);
  const [estadoActual, setEstadoActual] = useState<number | null>(null);

  const [form, setForm] = useState({
    categoria_id: 0,
    tipo_publicacion_id: 2,
    titulo: "",
    descripcion: "",
    condicion_publicacion_id: 1,
  });

  const [fErr, setFErr] = useState<FieldErrors>({});
  const [images, setImages] = useState<GalleryItem[]>([]);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    // validación inmediata de campos clave
    if (k === "titulo") {
      const t = String(v).trim();
      setFErr((prev) => ({
        ...prev,
        titulo: !t
          ? "El título es obligatorio."
          : t.length < 3
          ? "Mínimo 3 caracteres."
          : undefined,
      }));
    }
    if (k === "categoria_id") {
      const n = Number(v);
      setFErr((prev) => ({
        ...prev,
        categoria_id: n ? undefined : "Selecciona una categoría.",
      }));
    }
  }

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      setInfo(null);

      const catsData = await getCategorias();
      setCats(catsData);

      if (editing && id) {
        const pub = await getPublicacion(Number(id));

        // Guardia de permisos (cliente)
        const esOwner = !!user && pub.propietario_usuario_id === user.id;
        const esMod =
          !!user && (user.rol_usuario_id === 1 || user.rol_usuario_id === 2);
        if (!esOwner && !esMod) {
          setErr("No estás autorizado para editar esta publicación.");
          nav("/publicaciones", { replace: true });
          return;
        }

        setForm({
          categoria_id: pub.categoria_id,
          tipo_publicacion_id: pub.tipo_publicacion_id,
          titulo: pub.titulo,
          descripcion: pub.descripcion ?? "",
          condicion_publicacion_id: pub.condicion_publicacion_id,
        });
        setEstadoActual(pub.estado_publicacion_id);

        const imgs = (pub.imagenes ?? []).map((x) => ({
          id: x.id,
          url: x.url,
          posicion: x.posicion,
        }));
        imgs.sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0));
        setImages(imgs);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        (Array.isArray(e?.response?.data) ? e.response.data[0] : null) ??
        e?.message ??
        "Error al cargar formulario.";
      setErr(String(msg));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function persistImages(pubId: number) {
    const current = images.slice(0, 4);
    const fileIndices: number[] = [];
    const filesToUpload: File[] = [];

    current.forEach((it, idx) => {
      if (it.file) {
        fileIndices.push(idx);
        filesToUpload.push(it.file);
      }
    });

    const uploadedUrlsByIndex: Record<number, string> = {};
    if (filesToUpload.length > 0) {
      const res = await uploadImagenesArchivo(pubId, filesToUpload);
      if (res?.info) setInfo(String(res.info));
      const uploaded = Array.isArray(res?.data) ? res.data : [];
      uploaded.forEach((u: any, i: number) => {
        const idxEnImages = fileIndices[i];
        uploadedUrlsByIndex[idxEnImages] = u.url;
      });
    }

    const finalOrdered: { url: string; posicion: number }[] = current
      .map((it, idx) => {
        const url = it.file ? uploadedUrlsByIndex[idx] : it.url || "";
        return { url, posicion: idx };
      })
      .filter((x) => !!x.url);

    await setImagenes(pubId, finalOrdered);
  }

  function validateAll(): boolean {
    const e: FieldErrors = {};
    const t = form.titulo.trim();
    if (!t) e.titulo = "El título es obligatorio.";
    else if (t.length < 3) e.titulo = "Mínimo 3 caracteres.";
    if (!form.categoria_id) e.categoria_id = "Selecciona una categoría.";
    setFErr(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setErr(null);
      setInfo(null);

      if (!validateAll()) return;

      let pub: Publicacion;
      if (!editing) {
        const res = await createPublicacion(form);
        pub = res.data;
      } else {
        const res = await updatePublicacion(Number(id), form);
        pub = res.data;
      }

      await persistImages(pub.id);
      nav("/publicaciones");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        (Array.isArray(e?.response?.data) ? e.response.data[0] : null) ??
        e?.message ??
        "Error al guardar.";
      setErr(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    const bgUrl = "/bg-publicaciones.png";
    return (
      <div className="relative min-h-screen antialiased">
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-slate-900/55" />
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      </div>
    );
  }

  const bgUrl = "/bg-publicaciones.png";

  return (
    <div className="relative min-h-screen antialiased">
      {/* Fondo igual que PublicacionesList */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/45 via-slate-900/10 to-slate-900/55" />

      {/* Contenedor principal */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 2xl:px-0 py-10 w-full max-w-[1600px]">
        {/* 👉 Card ahora con ancho limitado y centrado */}
        <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white/95 shadow-2xl ring-1 ring-black/5 p-6 md:p-8">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                {editing ? "EDICIÓN DE PUBLICACIÓN" : "NUEVA PUBLICACIÓN"}
              </p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                {editing ? "Editar publicación ✏️" : "Crear nueva publicación ✨"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Completa los datos de tu producto o servicio.{" "}
                <span className="font-medium text-slate-800">
                  Un buen título, descripción clara e imágenes de calidad
                </span>{" "}
                aumentan las probabilidades de concretar un trueque.
              </p>
            </div>

            {/* 👉 Botón azul con el mismo efecto que los otros */}
            <button
              type="button"
              onClick={() => nav("/publicaciones")}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold
                        bg-blue-600 text-white border border-blue-600
                        transition-all duration-200
                        hover:bg-white hover:text-blue-600 hover:border-blue-600
                        whitespace-nowrap min-w-[180px]"
            >
              ← Ver publicaciones
            </button>
          </div>

          {editing && estadoActual != null && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-700">
              <span>📌</span>
              <span className="font-medium">Estado actual:</span>
              <span className="font-semibold">
                {estadoActual === ESTADO.ACTIVA
                  ? "Activa"
                  : estadoActual === ESTADO.OCULTA
                  ? "Oculta"
                  : "Realizada"}
              </span>
            </div>
          )}

          {err && <AlertErr>{err}</AlertErr>}

          {info && (
            <div className="mt-3 mb-4 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              {info}
            </div>
          )}

          {/* FORMULARIO */}
          <form onSubmit={onSubmit} className="space-y-6 mt-4">
            {/* Campos básicos */}
            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                🧾 Datos de la publicación
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título de la publicación *
                  </label>
                  <input
                    value={form.titulo}
                    onChange={(e) => setField("titulo", e.target.value)}
                    onBlur={() => setField("titulo", form.titulo)}
                    className={`w-full rounded-lg bg-white border text-sm px-3 py-2 
                      ${
                        fErr.titulo
                          ? "border-red-300 focus:ring-2 focus:ring-red-300"
                          : "border-slate-300 focus:ring-2 focus:ring-blue-400"
                      } focus:outline-none`}
                    maxLength={120}
                    disabled={saving}
                    placeholder="Ej: Bicicleta de montaña, clases de inglés, servicio de peluquería…"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Entre 3 y 120 caracteres.
                    </p>
                    {fErr.titulo && (
                      <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        {fErr.titulo}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    value={form.categoria_id}
                    onChange={(e) =>
                      setField("categoria_id", Number(e.target.value))
                    }
                    onBlur={() => setField("categoria_id", form.categoria_id)}
                    className={`w-full rounded-lg bg-white border text-sm px-3 py-2 
                      ${
                        fErr.categoria_id
                          ? "border-red-300 focus:ring-2 focus:ring-red-300"
                          : "border-slate-300 focus:ring-2 focus:ring-blue-400"
                      } focus:outline-none`}
                    disabled={saving}
                  >
                    <option value={0}>Selecciona una categoría…</option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  {fErr.categoria_id && (
                    <div className="mt-1 flex justify-end">
                      <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                        {fErr.categoria_id}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de publicación
                  </label>
                  <select
                    value={form.tipo_publicacion_id}
                    onChange={(e) =>
                      setField(
                        "tipo_publicacion_id",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-lg bg-white border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={saving}
                  >
                    <option value={1}>Servicio</option>
                    <option value={2}>Producto</option>
                    <option value={3}>Regalo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condición del producto/servicio
                  </label>
                  <select
                    value={form.condicion_publicacion_id}
                    onChange={(e) =>
                      setField(
                        "condicion_publicacion_id",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-lg bg-white border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={saving}
                  >
                    <option value={1}>Nuevo</option>
                    <option value={2}>Usado</option>
                    <option value={3}>Malo</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Descripción */}
            <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                ✍️ Descripción
              </h2>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detalles de la publicación
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setField("descripcion", e.target.value)}
                rows={5}
                maxLength={2000}
                className="w-full rounded-lg bg-white border border-slate-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={saving}
                placeholder="Cuenta brevemente en qué consiste, estado real, condiciones del trueque, si tiene accesorios incluidos, etc."
              />
              <p className="text-xs text-slate-400 mt-1">
                Campo opcional. Máximo 2000 caracteres.
              </p>
            </section>

            {/* Imágenes */}
            <section
              id="gallery-card"
              className="relative overflow-hidden rounded-2xl bg-blue-50 p-4 sm:p-5 border border-blue-100"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  📸 Imágenes de la publicación
                  <span className="text-xs font-normal text-slate-500">
                    (máx. 4)
                  </span>
                </h2>
                {saving && (
                  <span className="text-xs text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    Guardando…
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mb-3">
                Sube entre <span className="font-semibold">1 y 4 fotos</span>.
                Arrástralas para ordenar; la primera será la portada que verá la
                comunidad.
              </p>

              <ImageGalleryEditor images={images} onChange={setImages} />

              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mt-3">
                Consejo: arrastra para cambiar el orden; la imagen #1 será la
                portada.
              </p>
            </section>

            {/* BOTONES */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => nav(-1)}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold 
                           bg-blue-600 text-white border border-blue-600 
                           transition-all duration-200 
                           hover:bg-white hover:text-blue-600 hover:border-blue-600
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                ⬅️ Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold 
                           bg-blue-600 text-white border border-blue-600 
                           transition-all duration-200 
                           hover:bg-white hover:text-blue-600 hover:border-blue-600
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editing ? "💾 Guardar cambios" : "✅ Crear publicación"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
