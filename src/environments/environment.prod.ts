export const environment = {
  production: true,

  azureAd: {
    clientId: 'CHANGE_ME-CLIENT-ID-SPA',
    tenantId: 'CHANGE_ME-TENANT-ID',
    authority: 'https://login.microsoftonline.com/CHANGE_ME-TENANT-ID',
    redirectUri: 'https://CHANGE_ME.pedidos360.com/auth/callback',
    postLogoutRedirectUri: 'https://CHANGE_ME.pedidos360.com/login',
  },

  apiScope: 'api://CHANGE_ME-API-CLIENT-ID/access_as_user',

  // En produccion esto normalmente apunta al dominio de AWS API Gateway
  apiBaseUrl: 'https://CHANGE_ME.execute-api.us-east-1.amazonaws.com/api',
};
