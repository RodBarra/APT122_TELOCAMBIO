import { FormEvent, useState } from "react";
import { AlertErr, AlertOk } from "../components/Alert";
import { AuthApi } from "../services/auth";
import type { VerifyAccessResponse } from "../types";

export default function VerifyAccess() {
  const [codigo, setCodigo] = useState("");
  const [correo, setCorreo] = useState("");
  const [res, setRes] = useState<VerifyAccessResponse | null>(null);
  const [err, setErr] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(""); setRes(null);
    try {
      const r = await AuthApi.verifyAccess(codigo, correo);
      setRes(r);
    } catch (e: any) {
      setErr(e?.detail || "No se pudo verificar");
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6">
        <h2 className="text-xl font-semibold">Verificar acceso</h2>
        <p className="mt-1 text-sm text-slate-600">Ingresa el código de tu comunidad y tu correo.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {err && <AlertErr>{err}</AlertErr>}
          {res?.ok && <AlertOk>Autorizado ✔ — Tipo: {res.tipo_id === 1 ? "Departamento" : "Condominio"}</AlertOk>}
          {!res?.ok && res && <AlertErr>Sin autorización ({res.reason})</AlertErr>}

          <div>
            <label className="label">Código comunidad</label>
            <input className="input" value={codigo} onChange={e=>setCodigo(e.target.value)} required />
          </div>
          <div>
            <label className="label">Correo</label>
            <input className="input" type="email" value={correo} onChange={e=>setCorreo(e.target.value)} required />
          </div>
          <button className="btn btn-primary w-full">Verificar</button>
        </form>

        {res?.ok && (
          <a href={`/register?codigo=${encodeURIComponent(codigo)}&correo=${encodeURIComponent(correo)}&tipo=${res.tipo_id}`} className="btn btn-outline mt-4 w-full text-center">Continuar con registro</a>
        )}
      </div>
    </div>
  );
}
