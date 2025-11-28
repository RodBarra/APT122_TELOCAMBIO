import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PadronApi } from "../services/padron";
import { PadronItem } from "../types";
import { AlertErr, AlertOk } from "../components/Alert";

export default function PadronList() {
  const { user } = useAuth();
  const [items, setItems] = useState<PadronItem[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [correo, setCorreo] = useState("");

  const load = async () => {
    if (!user?.comunidad_id) return;
    setErr(""); setMsg("");
    try {
      const data = await PadronApi.list(user.comunidad_id, { q });
      setItems(data.items);
    } catch (e: any) {
      setErr(e?.detail || "No se pudo cargar el padrón");
    }
  };

  useEffect(() => { load();   }, [user?.comunidad_id]);

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.comunidad_id) return;
    setErr(""); setMsg("");
    try {
      await PadronApi.add(user.comunidad_id, { correo });
      setMsg("Correo agregado al padrón");
      setCorreo("");
      load();
    } catch (e: any) {
      setErr(e?.detail || "No se pudo agregar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Padrón autorizado</h2>
          <p className="text-sm text-slate-600">Comunidad ID: {user?.comunidad_id ?? "-"}</p>
        </div>
        <form onSubmit={onAdd} className="card p-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input className="input" type="email" placeholder="correo@ejemplo.cl" value={correo} onChange={e=>setCorreo(e.target.value)} required />
          <button className="btn btn-primary sm:w-40">Agregar</button>
        </form>
      </div>

      {msg && <AlertOk>{msg}</AlertOk>}
      {err && <AlertErr>{err}</AlertErr>}

      <div className="flex items-center gap-2">
        <input className="input max-w-xs" placeholder="Buscar correo..." value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={load} className="btn btn-outline">Buscar</button>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 text-left">Correo</th>
              <th className="px-4 py-2">Habilitado</th>
              <th className="px-4 py-2">Usado</th>
              <th className="px-4 py-2 text-left">Residencia</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} className="border-t">
                <td className="px-4 py-2">{it.correo}</td>
                <td className="px-4 py-2 text-center">{it.habilitado ? "Sí" : "No"}</td>
                <td className="px-4 py-2 text-center">{it.usado ? "Sí" : "No"}</td>
                <td className="px-4 py-2">
                  {it.torre ? `Torre ${it.torre}, N° ${it.numero}` :
                   it.direccion_texto ? `${it.direccion_texto}, N° ${it.numero}` : "-"}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={4}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
