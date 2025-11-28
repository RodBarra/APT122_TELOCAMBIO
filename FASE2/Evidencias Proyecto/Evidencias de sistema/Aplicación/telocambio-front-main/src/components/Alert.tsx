// src/components/Alert.tsx
export function AlertOk({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm">
      {children}
    </div>
  );
}

export function AlertErr({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 text-sm">
      {children}
    </div>
  );
}

// Extras opcionales por si quieres info/warn con el mismo estilo
export function AlertInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-3 text-blue-800 text-sm">
      {children}
    </div>
  );
}
export function AlertWarn({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 text-sm">
      {children}
    </div>
  );
}
