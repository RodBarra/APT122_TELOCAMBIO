export function getRoleHome(rol: 1 | 2 | 3 | undefined) {
  if (rol === 1) return "/mod/usuarios";     // Admin
  return "/publicaciones";                    // Moderador y Residente
}
