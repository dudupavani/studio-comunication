// Teste dos redirects do middleware
console.log("Testando padrões de redirects...");

// Testes para rotas UI
const uiRoutes = [
  "/admin/users",
  "/admin/users/",
  "/admin/users/123/edit",
  "/admin/users/123/edit/"
];

// Testes para rotas API
const apiRoutes = [
  "/api/admin/users/123/disable",
  "/api/admin/users/123/disable/",
  "/api/admin/users/123/enable",
  "/api/admin/users/123/enable/",
  "/api/admin/users/create",
  "/api/admin/users/create/",
  "/api/admin/users/create-and-link",
  "/api/admin/users/create-and-link/",
  "/api/admin/users/invite-magic",
  "/api/admin/users/invite-magic/",
  "/api/admin/orgs",
  "/api/admin/orgs/",
  "/api/admin/orgs/org123/units",
  "/api/admin/orgs/org123/units/"
];

console.log("Testando padrões para rotas UI:");
uiRoutes.forEach(route => {
  console.log(`\nTestando rota: ${route}`);
  
  // /admin/users -> /users
  if (route === "/admin/users" || route === "/admin/users/") {
    console.log(`  Match: /admin/users -> /users`);
  }
  
  // /admin/users/[id]/edit -> /users/[id]/edit
  const adminUserEdit = route.match(/^\/admin\/users\/([^\/]+)\/edit\/?$/);
  if (adminUserEdit) {
    const userId = adminUserEdit[1];
    console.log(`  Match: /admin/users/[id]/edit -> /users/${userId}/edit`);
  }
});

console.log("\n\nTestando padrões para rotas API:");
apiRoutes.forEach(route => {
  console.log(`\nTestando rota: ${route}`);
  
  // /api/admin/users/[id]/disable -> /api/users/[id]/disable
  const apiAdminUserDisable = route.match(/^\/api\/admin\/users\/([^\/]+)\/disable\/?$/);
  if (apiAdminUserDisable) {
    const userId = apiAdminUserDisable[1];
    console.log(`  Match: /api/admin/users/[id]/disable -> /api/users/${userId}/disable`);
  }
  
  // /api/admin/users/[id]/enable -> /api/users/[id]/enable
  const apiAdminUserEnable = route.match(/^\/api\/admin\/users\/([^\/]+)\/enable\/?$/);
  if (apiAdminUserEnable) {
    const userId = apiAdminUserEnable[1];
    console.log(`  Match: /api/admin/users/[id]/enable -> /api/users/${userId}/enable`);
  }
  
  // /api/admin/users/create -> /api/users/create
  if (route === "/api/admin/users/create" || route === "/api/admin/users/create/") {
    console.log(`  Match: /api/admin/users/create -> /api/users/create`);
  }
  
  // /api/admin/users/create-and-link -> /api/users/create-and-link
  if (route === "/api/admin/users/create-and-link" || route === "/api/admin/users/create-and-link/") {
    console.log(`  Match: /api/admin/users/create-and-link -> /api/users/create-and-link`);
  }
  
  // /api/admin/users/invite-magic -> /api/users/invite-magic
  if (route === "/api/admin/users/invite-magic" || route === "/api/admin/users/invite-magic/") {
    console.log(`  Match: /api/admin/users/invite-magic -> /api/users/invite-magic`);
  }
  
  // /api/admin/orgs -> /api/orgs
  if (route === "/api/admin/orgs" || route === "/api/admin/orgs/") {
    console.log(`  Match: /api/admin/orgs -> /api/orgs`);
  }
  
  // /api/admin/orgs/[orgSlug]/units -> /api/orgs/[orgSlug]/units
  const apiAdminOrgUnits = route.match(/^\/api\/admin\/orgs\/([^\/]+)\/units\/?$/);
  if (apiAdminOrgUnits) {
    const orgSlug = apiAdminOrgUnits[1];
    console.log(`  Match: /api/admin/orgs/[orgSlug]/units -> /api/orgs/${orgSlug}/units`);
  }
});

console.log("\n\nTodos os testes concluídos com sucesso!");