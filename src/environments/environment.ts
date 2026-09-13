export const environment = {
  production: false,

  // === Datos del App Registration "Pedidos360" en Azure AD ===
  // Reemplazar con los valores reales entregados por el docente / creados en el tenant.
  azureAd: {
    clientId: 'CHANGE_ME-CLIENT-ID-SPA',           // Application (client) ID del registro del FRONTEND
    tenantId: 'CHANGE_ME-TENANT-ID',                // Directory (tenant) ID
    authority: 'https://login.microsoftonline.com/CHANGE_ME-TENANT-ID',
    redirectUri: 'http://localhost:4200/auth/callback',
    postLogoutRedirectUri: 'http://localhost:4200/login',
  },

  // Scope expuesto por la API (Application ID URI del backend + el scope definido, ej. access_as_user)
  apiScope: 'api://CHANGE_ME-API-CLIENT-ID/access_as_user',

  // URL base del BFF (punto unico de entrada al backend)
  apiBaseUrl: 'http://localhost:8080/api',
};
