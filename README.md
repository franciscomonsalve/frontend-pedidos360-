# Pedidos360 — Frontend

SPA en **Angular 18** para el sistema de gestión de pedidos Pedidos360. La autenticación es
**OAuth 2.0 / OpenID Connect contra Entra ID (Azure AD)** con MSAL, y los roles de la aplicación
(`Admin`, `Operator`, `Customer`) deciden qué rutas y qué acciones ve cada usuario.

Asignatura DSY1107 (Desarrollo Cloud Native I), Duoc UC.

El backend está en un repositorio aparte: `ms-pedidos360-backend`.

---

## Módulos

```
src/app/
  app.config.ts               Providers: MSAL, router, HttpClient con interceptor
  app.routes.ts               Rutas con lazy loading y guards
  auth/msal.config.ts         Instancia MSAL, guard config e interceptor config
  auth/roles.util.ts          Lee los App Roles del ACCESS token (ver nota abajo)
  guards/role.guard.ts        Guard propio por rol, con redirección configurable
  pages/login/                Inicio de sesión por redirect
  pages/register/             Alta de cuenta en Entra ID (pública)
  pages/dashboard/            Portada tras el login; muestra los roles del usuario
  pages/orders/               Listado de pedidos y cambio de estado
  pages/auditoria/            Registro de auditoría, solo Admin
  pages/unauthorized/         Pantalla de acceso denegado
src/environments/             Configuración por entorno (ver más abajo)
```

### Rutas y quién entra

| Ruta | Guards | Roles |
|---|---|---|
| `/login` | — | pública |
| `/register` | — | pública |
| `/auth/callback` | — | retorno del flujo OIDC |
| `/dashboard` | `MsalGuard` | cualquier usuario autenticado |
| `/orders` | `MsalGuard` + `roleGuard` | Admin, Operator, Customer |
| `/auditoria` | `MsalGuard` + `roleGuard` | **solo Admin** |

Todas las páginas se cargan con `loadComponent`, así que cada una es un bundle aparte.

Si un usuario sin rol Admin pega la URL `/auditoria` a mano, `roleGuard` lo manda al
`/dashboard` en lugar de a `/unauthorized`, porque es el comportamiento menos confuso para un
usuario que simplemente no tiene el permiso.

---

## Los roles vienen del access token, no del ID token

Esto no es evidente y es el detalle que más cuesta depurar. Está en
[`src/app/auth/roles.util.ts`](src/app/auth/roles.util.ts).

Los App Roles (`Admin`, `Operator`, `Customer`) están definidos y asignados en el **App
Registration del backend**, no en el del SPA. Por eso viajan en el **access token** cuyo
`aud` es `api://<backend>`, y **no aparecen en el ID token** del frontend.

`getApiRoles()` pide ese token con `acquireTokenSilent` (está en caché, porque el login ya
solicita `environment.apiScope`), decodifica el payload del JWT y lee el claim `roles`.

> Si buscas los roles en `account.idTokenClaims` vas a encontrar el array vacío y a concluir,
> equivocadamente, que Entra ID no los está emitiendo.

MSAL guarda los tokens en **`sessionStorage`**, no en `localStorage`: se pierden al cerrar la
pestaña, que es lo deseable para un token de acceso.

---

## Configuración por entorno

| | `environment.ts` (desarrollo) | `environment.prod.ts` (producción) |
|---|---|---|
| `redirectUri` | `http://localhost:4200/auth/callback` | `https://<IP-del-EC2>/auth/callback` |
| `postLogoutRedirectUri` | `http://localhost:4200/login` | `https://<IP-del-EC2>/login` |
| `apiBaseUrl` | `http://localhost:8080/api` | la URL del **API Gateway** |

Lo demás es igual en los dos: `clientId`, `tenantId`, `authority`, `apiScope` y `signupDomain`.

`signupDomain` es el dominio verificado del tenant y **debe coincidir** con `AZURE_USER_DOMAIN`
del BFF (propiedad `pedidos360.graph.user-domain`), o el alta de usuarios falla.

### ⚠ La IP queda compilada dentro del bundle

`redirectUri` y `apiBaseUrl` se resuelven **en tiempo de compilación**: terminan escritos
dentro del archivo `main-*.js` del `dist/`.

**Cambiar `environment.prod.ts` no basta.** Hay que recompilar y, si el contenedor ya está
corriendo, **reconstruir la imagen**:

```bash
docker compose up -d --build --force-recreate --no-deps frontend
```

Omitir el `--build` es el error más repetido de este proyecto: el contenedor sigue sirviendo el
bundle anterior con la IP vieja, y el síntoma es un `AADSTS50011` de Entra ID que parece un
problema de configuración del tenant.

Para comprobar qué IP se está sirviendo de verdad:

```bash
docker exec pedidos360-frontend sh -c 'grep -o "https://[0-9.]*" /usr/share/nginx/html/main-*.js | head -1'
```

Y recuerda que la IP nueva también hay que registrarla como **redirect URI** en el App
Registration de Entra ID, o el login se rechaza antes de empezar.

---

## Desarrollo local

Requiere **Node 20** y el backend corriendo en `localhost:8080`.

```bash
npm ci
npm start          # ng serve en http://localhost:4200
```

Compilar:

```bash
npm run build                                   # usa environment.ts
npm run build -- --configuration production     # usa environment.prod.ts
```

La salida queda en `dist/frontend-pedidos360/browser/` — Angular 18 añade ese subdirectorio
`browser/`, que los dos Dockerfile copian explícitamente.

Para que el login funcione en local, `http://localhost:4200/auth/callback` debe estar
registrado como redirect URI en Entra ID.

---

## Los dos Dockerfile

| Archivo | Compila Angular | Cuándo usarlo |
|---|---|---|
| `Dockerfile` | **sí**, multi-stage con `node:20-alpine` | en local, o en una instancia con RAM suficiente |
| `Dockerfile.prebuilt` | **no**, empaqueta el `dist/` ya generado | en el EC2 |

`Dockerfile.prebuilt` existe porque `npm ci` y `ng build` dentro de una instancia pequeña la
tumban por falta de memoria. En ese caso se compila en la máquina local y solo se empaqueta:

```bash
npm run build -- --configuration production
# después, desde el repo del backend:
docker compose up -d --build --no-deps frontend
```

Cuál se usa lo deciden dos variables del `infra/.env` del backend, y **los valores por defecto
apuntan al servidor**:

```bash
FRONTEND_CONTEXT=../../frontend-pedidos360     # en local
FRONTEND_DOCKERFILE=Dockerfile                 # en local
```

Sin descomentarlas, un `docker compose up` en tu máquina falla buscando una ruta que no existe.

---

## nginx y HTTPS

[`nginx.conf`](nginx.conf) sirve la SPA y hace tres cosas que conviene conocer:

**1 · Redirige todo HTTP a HTTPS.** El puerto 80 responde `301` hacia `https://`. El certificado
es **autofirmado y se genera al construir la imagen**, así que el navegador muestra una
advertencia que hay que aceptar una vez. Es suficiente para la demostración; en un entorno real
iría un certificado de una CA.

**2 · Fallback de SPA.** `try_files $uri $uri/ /index.html`, para que el router de Angular
maneje las rutas y recargar `/orders` no dé 404.

**3 · Proxy de `/api/` hacia `http://bff:8080/api/`.** En producción la aplicación llama al
**API Gateway** por `apiBaseUrl`, así que este proxy queda como camino alternativo. Tiene dos
ajustes que no son cosméticos:

- `proxy_set_header Origin ""` — sin cabecera `Origin`, el BFF no aplica su filtro de CORS y
  no devuelve `403 Invalid CORS request`. Es correcto porque la petición es del mismo origen.
- `proxy_hide_header` sobre `Transfer-Encoding`, `Expires`, `Pragma` y `Cache-Control` — el BFF
  es un gateway manual y emite esas cabeceras duplicadas; sin limpiarlas, nginx responde `502`.

---

## Despliegue

El frontend **no tiene su propio compose**: se levanta como un servicio más del
`infra/docker-compose.yml` del backend, que lo construye desde este repositorio usando
`FRONTEND_CONTEXT`. Publica los puertos **80** y **443**, y depende del servicio `bff`.

```bash
# desde el repo del backend
cd infra
docker compose up -d frontend
```

---

## Si algo falla

| Síntoma | Causa |
|---|---|
| `AADSTS50011` al iniciar sesión | la IP actual no está registrada como redirect URI en Entra ID, **o** la imagen sirve un bundle con la IP vieja |
| Login correcto pero sin menús | los roles llegaron vacíos — revisa que los App Roles estén asignados en el App Registration del **backend** |
| `403 Invalid CORS request` | la petición llegó con `Origin`; revisa el proxy de nginx o `CORS_ALLOWED_ORIGINS` del BFF |
| `502` en las llamadas a `/api/` | cabeceras duplicadas del BFF; revisa los `proxy_hide_header` |
| El frontend carga pero no trae datos | la integración del API Gateway apunta a la instancia **sin el `:8080`**; nginx responde `301` y parece un error de CORS |
| Recargar `/orders` da 404 | falta el `try_files` del bloque SPA |
| Advertencia de certificado | es el autofirmado; acéptala una vez |
