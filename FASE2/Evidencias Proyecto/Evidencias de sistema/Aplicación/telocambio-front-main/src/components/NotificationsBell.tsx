// src/components/NotificationsBell.tsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBadge } from "../services/notificaciones";
import NotificationsList from "./NotificationsList";

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { no_leidas } = await getBadge();
        if (mounted) setCount(no_leidas);
      } catch {
        // silent
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100"
        title="Notificaciones"
        onClick={() => setOpen((v) => !v)}
      >
        {/* campana (heroicons outline) */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M14.243 5.757A6 6 0 006 10v3.586l-.707.707A1 1 0 006.586 16h10.828a1 1 0 00.707-1.707L17.414 13.586V10a6 6 0 00-3.171-5.343M9 20h6" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-semibold">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white border shadow-lg rounded-xl overflow-hidden z-50">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <div className="text-sm font-semibold">Notificaciones</div>
            <Link to="/intercambios" className="text-xs text-blue-600 hover:underline">Ver intercambios</Link>
          </div>
          <NotificationsList onSeenChange={(newCount) => setCount(newCount)} />
        </div>
      )}
    </div>
  );
}
