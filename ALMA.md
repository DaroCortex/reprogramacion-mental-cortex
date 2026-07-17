# ALMA

Persistent project memory for changes made by Codex agents.

Entries are append-only and should summarize what changed, why, verification, and risks.

## 2026-06-30 15:48:00 -03 - Grandfathered existing students for Advanced unlock

- Kind: `deploy`
- Project root: `/private/tmp/rm-cortex-merge-work`
- Reason: Existing students such as Daro had Advanced access before the 7-day beginner completion rule and should not be re-locked by the new-user rule.

### Touched
- lib/beginner-progress.js; api/students.js; src/App.jsx; Vercel deployment dpl_6F7j3UchKkkWdSMJtdJ9fW3GJxe5

### Details
Added cutoff-based legacy Advanced access for audioReady/audioKey students created before 2026-06-29T20:16:00Z and without modern Advanced workflow audio. Safe student payload now emits a legacy advancedUnlockAt date and clears advancedBlockedReason for those students.

### Verification
- git diff --check passed; node getAdvancedAccessInfo smoke returned old unlocked and new blocked; npm run build passed; production deploy READY/PROMOTED to rm.academiacortex.com.ar; live /api/students shows daro advancedReprogrammingEnabled=true and post-cutoff test-test-2 advanced=false.

### Risks / Follow-Up
This checkout is temporary; sync or commit these RM source changes to DaroCortex/reprogramacion-mental-cortex before future Git-based deploys.

## 2026-07-10 10:44:07 -03 - Endpoint seguro para consultar acceso del alumno

- Kind: `edit`
- Project root: `/private/tmp/rmc-live-source`
- Reason: Habilitar el boton Copiar acceso en Academia Seguimiento sin exponer hashes, sesiones ni credenciales administrativas en URLs

### Touched
- api/admin/student-access-status.js; ALMA.md

### Details
El endpoint POST valida credenciales admin en el cuerpo y devuelve solo existencia, hasPassword, email y slug. La contraseña original sigue siendo irrecuperable.

### Verification
- node --check OK; npm run build OK; git diff --check OK

### Risks / Follow-Up
Requiere desplegar sobre el proyecto Vercel productivo y luego migrar Formulario al nuevo POST.

## 2026-07-10 10:59:34 -03 - Endpoint de acceso RM desplegado con precedencia por slug

- Kind: `deploy`
- Project root: `/private/tmp/rmc-live-source`
- Reason: Cerrar el flujo Copiar credenciales y garantizar que duplicados de email no desvien el estado ni el enlace a otro alumno

### Touched
- api/admin/student-access-status.js; ALMA.md; Vercel reprogramacion-mental-cortex

### Details
La consulta usa slug como identidad autoritativa cuando existe y email solo como fallback. El endpoint continua devolviendo datos minimos y sin contraseñas.

### Verification
- node --check OK; npm run build OK; endpoint productivo anterior respondio 401 sin autenticacion; despliegue final pendiente de esta entrada

### Risks / Follow-Up
Cambio aditivo. No modifica passwords, sesiones, estudiantes ni audios.

## 2026-07-10 11:02:30 -03 - Recuperacion administrativa con contraseña temporal

- Kind: `edit`
- Project root: `/private/tmp/rmc-live-source`
- Reason: Administracion necesita copiar credenciales completas sin enviar al alumno un enlace de restablecimiento

### Touched
- api/admin/reset-student-password.js; api/admin/student-access-status.js; ALMA.md

### Details
El endpoint admin genera una contraseña Cortex aleatoria, guarda solo su hash scrypt, invalida la contraseña y sesiones anteriores y devuelve el texto una sola vez. Solo funciona si el alumno ya habia creado una contraseña. Slug tiene precedencia sobre email.

### Verification
- node --check de ambos endpoints OK; npm run build OK

### Risks / Follow-Up
Copiar credenciales cambia la contraseña vigente y cierra sesiones previas. La contraseña temporal no se persiste en texto plano y debe copiarse en ese momento.

## 2026-07-11 11:43:59 -03 - Credencial de soporte estable sin cambiar contraseña

- Kind: `config`
- Project root: `/private/tmp/rmc-live-source`
- Reason: Corregir Copiar credenciales para que entregue acceso válido sin reemplazar la contraseña elegida por el alumno ni cerrar sesiones

### Touched
- lib/student-support-credential.js; api/admin/student-credentials.js; api/auth/login.js; api/admin/reset-student-password.js eliminado; Vercel STUDENT_SUPPORT_CREDENTIAL_SECRET; ALMA.md

### Details
Se deriva por HMAC una credencial de soporte por alumno y versión de contraseña. El login acepta la contraseña principal o la credencial de soporte. La credencial se mantiene estable entre copias y rota cuando cambia el hash principal.

### Verification
- smoke local estable=true, verificacion=true, rota al cambiar contraseña=true; node --check OK; npm run build OK; secreto sensible agregado solo a Production

### Risks / Follow-Up
El secreto HMAC debe mantenerse en Vercel. Rotarlo invalida todas las credenciales de soporte, pero no las contraseñas elegidas por alumnos.

## 2026-07-14 10:46:14 -03 - Agregado favicon de Cortex a RM

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario pidio usar el icono provisto para distinguir rm.academiacortex.com.ar en la pestana de Chrome

### Touched
- index.html; public/favicon-16x16.png; public/favicon-32x32.png; public/apple-touch-icon.png; public/favicon.png; Vercel reprogramacion-mental-cortex

### Details
Se reconstruyo primero el snapshot fuente exacto del deployment productivo dpl_7r6WD1TSyhtLRzjwxGzZTgK8Km7S para conservar cambios recientes que aun no estaban completos en GitHub. Se generaron variantes PNG de 16, 32, 180 y 512 px y se agregaron enlaces versionados en el head.

### Verification
- npm ci y npm run build OK; preview dpl_5TU96Ttgw6n4r1MFSTrgpKcw8iJS READY; produccion dpl_2skbUBRJkDM4Tib4cgqe5rHYnUcc READY y alias rm.academiacortex.com.ar; HTML productivo incluye los cuatro iconos; todos responden HTTP 200 image/png y coinciden byte por byte con los archivos locales.

### Risks / Follow-Up
Chrome puede mantener el favicon anterior en cache hasta cerrar/reabrir la pestana o recargar. Rollback funcional disponible al deployment previo dpl_7r6WD1TSyhtLRzjwxGzZTgK8Km7S.

## 2026-07-14 12:10:43 -03 - Prepared Android App Links and public privacy policy

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Android publication requires a verified Digital Asset Links file and a public privacy-policy URL.

### Touched
- public/.well-known/assetlinks.json
- public/privacidad/index.html
- vercel.json

### Details
Added the com.darocortex.rmcortex association for the Android upload certificate, a Spanish privacy policy matching actual app data use, and exact rewrites before the SPA fallback.

### Verification
- npm run build passed; generated dist files match their public sources; SHA-1 comparison confirmed all pre-existing dirty source files match the current production deployment dpl_8wmpsXSTdr1pTeYK6a1mZkrHvPHZ.

### Risks / Follow-Up
The Digital Asset Links file currently contains the upload certificate. Add the Google Play app-signing certificate fingerprint after Play App Signing enrollment if it differs.

## 2026-07-14 12:12:47 -03 - Published Android App Links and privacy policy

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Complete the public web contracts required before the Android Play Store submission.

### Touched
- Vercel deployment dpl_5K18ARsPT3F1Hb31e9fU1P18VDTS
- https://rm.academiacortex.com.ar/.well-known/assetlinks.json
- https://rm.academiacortex.com.ar/privacidad

### Details
Deployed the production-matching RM source plus the new exact static routes. Vercel promoted the deployment and assigned both production aliases.

### Verification
- Both production domains return HTTP 200 application/json for assetlinks and HTTP 200 text/html for privacidad; downloaded bodies match local SHA-1 hashes; root title remains Reprogramacion Mental / Cortex and an empty login request returns the expected 401 contract.

### Risks / Follow-Up
After Google Play App Signing is enabled, add the Play app-signing certificate SHA-256 fingerprint if it differs from the upload certificate.

## 2026-07-14 12:16:31 -03 - Polished public privacy-policy Spanish

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Use publication-quality Spanish in the Android privacy policy.

### Touched
- public/privacidad/index.html

### Details
Corrected accents, terminology and cache wording without changing the declared data practices.

### Verification
- npm run build passed.

### Risks / Follow-Up
Text-only change; policy meaning and public URL remain unchanged.

## 2026-07-14 12:17:58 -03 - Published polished Android privacy policy

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Complete the final editorial pass for the Play Store privacy URL.

### Touched
- Vercel deployment dpl_6RLeS99ope9tqDkyXRE5SnrxQhj1
- https://rm.academiacortex.com.ar/privacidad

### Details
Promoted the text-only privacy update to production; App Links remained unchanged.

### Verification
- The live privacy body matches the local HTML exactly and its title is Politica de privacidad with the expected accent; live assetlinks still matches its local JSON.

### Risks / Follow-Up
No functional contract changed.

## 2026-07-17 11:29:54 -03 - Nueva vista administrativa operativa en /admin2

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Mejorar el seguimiento diario de alumnos sin reemplazar ni alterar el panel productivo /admin

### Touched
- src/Admin2Dashboard.jsx; src/admin2.css; src/App.jsx; package.json; package-lock.json

### Details
Se agrego una vista compacta con indicadores accionables, busqueda, filtros reales, ordenamiento, paginacion de 30 filas, estados visuales de riesgo y audio, navegacion responsive y ficha lateral con progreso, apneas, acceso y acciones existentes. Reutiliza los endpoints y funciones actuales; /admin conserva su render anterior.

### Verification
- npm run build OK; git diff --check OK; validacion autenticada en produccion con datos reales: 30 filas por tanda, filtros y drawer funcionales; escritorio y viewport 390x844 sin overflow horizontal

### Risks / Follow-Up
Ruta beta oculta /admin2. No modifica datos ni backend. /admin queda disponible como rollback inmediato.

## 2026-07-17 11:29:55 -03 - Publicada la vista beta /admin2 en RM

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Permitir que administracion pruebe el nuevo seguimiento con datos reales sin afectar el panel actual

### Touched
- Vercel deployment dpl_9xjTH415T5oZ4AtSjjrgJJJjYRa6; https://rm.academiacortex.com.ar/admin2

### Details
Deployment productivo promovido y aliasado al dominio principal. La nueva vista vive solo en /admin2 y contiene enlace de retorno a Admin clasico.

### Verification
- Deployment READY/PROMOTED; /, /admin y /admin2 responden HTTP 200; assets productivos coinciden con el build local; validacion visual desktop y mobile completada

### Risks / Follow-Up
La beta no se enlazo desde el panel clasico. Para revertir, promover dpl_6RLeS99ope9tqDkyXRE5SnrxQhj1 o continuar usando /admin.

## 2026-07-17 11:31:43 -03 - Sincronizada la fuente productiva actual con GitHub

- Kind: `docs`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Evitar que cambios productivos acumulados y la nueva vista /admin2 queden solo en el deployment o en el workspace local

### Touched
- Git commit 8ca591a; origin/main; repositorio DaroCortex/reprogramacion-mental-cortex

### Details
Se incluyeron los cambios productivos preexistentes que coincidian con el deployment, contratos de acceso y audio, assets publicos, ALMA.md y la nueva beta /admin2. No se revirtieron cambios de otros agentes.

### Verification
- origin/main estaba en 6cabe37 antes del sync; git diff --cached --check OK; npm run build OK; push 6cabe37..8ca591a completado

### Risks / Follow-Up
El push directo a main puede iniciar un deployment automatico de Vercel con el mismo contenido ya promovido por CLI.

## 2026-07-17 11:41:04 -03 - Promovida la vista operativa al path /admin

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Usar el nuevo seguimiento compacto como panel administrativo principal

### Touched
- src/App.jsx
- src/Admin2Dashboard.jsx

### Details
/admin y /admin2 renderizan el panel operativo nuevo; el panel anterior queda disponible en /admin-classic como respaldo inmediato. El enlace interno de Admin clasico apunta ahora a esa ruta.

### Verification
- npm run build OK
- git diff --check OK

### Risks / Follow-Up
Cambio solo de enrutado y rotulos; no modifica endpoints, datos ni autenticacion.

## 2026-07-17 11:45:03 -03 - Publicado el nuevo panel principal en /admin

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Completar la promocion del seguimiento operativo luego de validar la beta /admin2

### Touched
- Vercel deployment dpl_THN52zkQzBcSt1ceAzxMZXXFMLd6
- https://rm.academiacortex.com.ar/admin
- https://rm.academiacortex.com.ar/admin-classic

### Details
El dominio principal sirve el panel compacto en /admin. /admin2 queda como alias compatible y /admin-classic conserva la vista anterior para rollback operativo.

### Verification
- Deployment READY
- Validacion autenticada: /admin .admin2-shell=1, titulo Seguimiento y 30 filas
- Validacion autenticada: /admin-classic .admin-app=1 y .admin-dashboard=1
- HTTP 200 en /admin, /admin2 y /admin-classic

### Risks / Follow-Up
Sin cambios de backend ni datos. El rollback funcional inmediato es /admin-classic.

## 2026-07-17 14:50:43 -03 - Integrado Solutgen Support Hub en Reprogramacion Mental

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Agregar el widget de reporte solicitado en rm.academiacortex.com.ar

### Touched
- src/App.jsx; src/SolutgenSupportWidget.jsx

### Details
El widget se habilita para estudiantes autenticados y para sesiones de admin/editor. Envia rol, usuario y contexto de pantalla sin incluir tokens de acceso. El script externo se carga una sola vez y mantiene el contexto actualizado.

### Verification
- npm run build OK con Vite 5.4.21; git diff --check OK

### Risks / Follow-Up
Requiere VITE_SUPPORT_INGEST_KEY en Vercel y un nuevo build productivo para quedar visible.

## 2026-07-17 15:07:26 -03 - Publicado widget Solutgen Support Hub en RM

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Completar la instalacion solicitada en rm.academiacortex.com.ar

### Touched
- Vercel deployment dpl_XcFjNzjFivnHFFZwgvmGMazL5o5H; VITE_SUPPORT_INGEST_KEY; https://rm.academiacortex.com.ar

### Details
Se configuro la variable sensible de produccion y se promovio un build Vite READY. El panel autenticado carga una sola instancia del widget.

### Verification
- Smoke Chrome en /admin: 1 script y 1 boton Reportar problema; ticket REPROGRAMACION-MEN-260717-2A9ED0 recibido en Support Hub con app_id reprogramacion-mental, rol admin y estado new; sin errores support en consola

### Risks / Follow-Up
El valor de ingesta es publico en el bundle por el contrato del widget, pero no se registro en codigo, ALMA ni logs. Rollback por promocion del deployment anterior en Vercel.

## 2026-07-17 15:10:09 -03 - Sincronizada fuente del widget y validado redeploy automatico

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Dejar GitHub alineado con el widget ya publicado sin perder trazabilidad del deployment iniciado por el push

### Touched
- Git commit 27b6adc; origin/main; Vercel deployment dpl_C7ZhJ6bA2JyTpwQ2tLFdRE9SMRgo; https://rm.academiacortex.com.ar

### Details
El push de la fuente versionada inicio el deployment automatico de Vercel con el mismo contenido funcional y la variable de produccion ya configurada.

### Verification
- Deployment READY; alias productivo HTTP 200; bundle index-CWlcHPQ7.js contiene widget.js y app_id reprogramacion-mental; support health OK; HEAD y origin/main coincidian en 27b6adc antes de esta entrada documental

### Risks / Follow-Up
Sin cambio funcional respecto del deployment CLI anterior. Esta entrada se sincroniza con un commit marcado para omitir CI y evitar otro redeploy innecesario.
