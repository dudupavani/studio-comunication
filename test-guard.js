// Teste do novo guard de permissões
console.log("Iniciando teste do novo guard de permissões...");

// Simulando um contexto de autenticação de org_admin
const orgAdminAuth = {
  userId: "test-user",
  platformRole: null,
  orgRole: "org_admin",
  orgId: "test-org",
  unitIds: []
};

// Simulando um contexto de autenticação de platform_admin
const platformAdminAuth = {
  userId: "test-user",
  platformRole: "platform_admin",
  orgRole: null,
  orgId: "test-org",
  unitIds: []
};

// Simulando um contexto de autenticação de usuário comum
const userAuth = {
  userId: "test-user",
  platformRole: null,
  orgRole: "org_master", // diferente de org_admin
  orgId: "test-org",
  unitIds: []
};

// Função de verificação (reimplementada localmente para teste)
const isPlatformAdmin = (ctx) => !!ctx && ctx.platformRole === "platform_admin";

const isOrgAdmin = (auth) => 
  auth?.orgRole === "org_admin" || auth?.orgRoleEffective === "org_admin";

// Novo guard unificado
const canManageUsers = (auth) => {
  if (!auth) return false;
  return isPlatformAdmin(auth) || isOrgAdmin(auth);
};

console.log("Org Admin tests:");
console.log("isPlatformAdmin(orgAdminAuth):", isPlatformAdmin(orgAdminAuth));
console.log("isOrgAdmin(orgAdminAuth):", isOrgAdmin(orgAdminAuth));
console.log("canManageUsers(orgAdminAuth):", canManageUsers(orgAdminAuth));

console.log("\nPlatform Admin tests:");
console.log("isPlatformAdmin(platformAdminAuth):", isPlatformAdmin(platformAdminAuth));
console.log("isOrgAdmin(platformAdminAuth):", isOrgAdmin(platformAdminAuth));
console.log("canManageUsers(platformAdminAuth):", canManageUsers(platformAdminAuth));

console.log("\nUser tests:");
console.log("isPlatformAdmin(userAuth):", isPlatformAdmin(userAuth));
console.log("isOrgAdmin(userAuth):", isOrgAdmin(userAuth));
console.log("canManageUsers(userAuth):", canManageUsers(userAuth));

console.log("\nNull auth test:");
console.log("canManageUsers(null):", canManageUsers(null));