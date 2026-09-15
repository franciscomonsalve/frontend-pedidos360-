export const environment = {
  production: true,

  azureAd: {
    clientId: 'faf7a202-e7db-49d8-89f1-0b32d5f1b4d2',
    tenantId: 'f280f365-653c-4282-b1ee-200e91b01736',
    authority: 'https://login.microsoftonline.com/f280f365-653c-4282-b1ee-200e91b01736',
    redirectUri: 'https://IP_DEL_EC2/auth/callback',
    postLogoutRedirectUri: 'https://IP_DEL_EC2/login',
  },

  apiScope: 'api://08c770a5-21a6-4434-8d59-28723c7c759d/access_as_user',

  apiBaseUrl: 'https://33kszs7hhl.execute-api.us-east-1.amazonaws.com/api',
};