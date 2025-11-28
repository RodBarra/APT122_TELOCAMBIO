// src/utils/phone.ts

/**
 * Normaliza un número chileno a formato E.164: +569XXXXXXXX
 * Acepta:
 *  - 912345678
 *  - 09 1234 5678
 *  - +56912345678
 *  - 56912345678
 */
export function normalizePhoneCL(raw: string): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, ""); // deja solo números

  let rest = "";

  // +56 9XXXXXXXX / 56 9XXXXXXXX
  if (digits.startsWith("56") && digits.length >= 11) {
    rest = digits.slice(2); // después de 56
  } else if (digits.length === 10 && digits.startsWith("09")) {
    // 09XXXXXXXX -> 9XXXXXXXX
    rest = digits.slice(1);
  } else if (digits.length === 9 && digits.startsWith("9")) {
    // 9XXXXXXXX
    rest = digits;
  } else {
    return null;
  }

  if (rest.length !== 9 || !rest.startsWith("9")) return null;

  // Resultado: +569XXXXXXXX
  return `+56${rest}`;
}

/** Link tel: listo para usar en <a href> */
export function buildTelHref(raw?: string | null): string | null {
  const norm = normalizePhoneCL(raw || "");
  return norm ? `tel:${norm}` : null;
}

/** Link WhatsApp Web / app: https://wa.me/569XXXXXXXX */
export function buildWhatsappHref(raw?: string | null): string | null {
  const norm = normalizePhoneCL(raw || "");
  if (!norm) return null;
  const digits = norm.replace(/\D/g, ""); // 569XXXXXXXX
  return `https://wa.me/${digits}`;
}
