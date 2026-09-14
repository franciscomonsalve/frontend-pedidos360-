export const environment = {
  production: true,

  azureAd: {
    clientId: 'faf7a202-e7db-49d8-89f1-0b32d5f1b4d2',
    tenantId: 'f280f365-653c-4282-b1ee-200e91b01736',
    authority: 'https://login.microsoftonline.com/f280f365-653c-4282-b1ee-200e91b01736',
    redirectUri: 'https://localhost/auth/callback',
    postLogoutRedirectUri: 'https://localhost/login',
  },

  apiScope: 'api://08c770a5-21a6-4434-8d59-28723c7c759d/access_as_user',

  apiBaseUrl: '/api',
};
