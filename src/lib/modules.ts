export const MODULE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/settings": "Configurações",
  "/profile": "Perfil do Usuário",
  "/units": "Unidades",
  "/users": "Usuários",
  // adicione outros módulos aqui
};

export function getModuleTitle(pathname: string): string {
  // tenta casar com uma rota exata
  if (MODULE_TITLES[pathname]) return MODULE_TITLES[pathname];

  // tenta achar rota "prefixo" (útil para rotas dinâmicas)
  const match = Object.keys(MODULE_TITLES).find((path) =>
    pathname.startsWith(path)
  );
  return match ? MODULE_TITLES[match] : "Módulo";
}
