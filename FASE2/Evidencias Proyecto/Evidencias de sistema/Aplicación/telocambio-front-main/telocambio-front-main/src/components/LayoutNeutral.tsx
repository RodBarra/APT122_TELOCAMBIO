export default function LegalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Sin navbar */}
      <main className="flex-1">{children}</main>
      {/* Footer SIEMPRE se muestra */}
      <footer className="mt-auto">
        {/* Usa el mismo footer */}
      </footer>
    </div>
  );
}
