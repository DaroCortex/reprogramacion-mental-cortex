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

## 2026-07-20 10:58:24 -03 - Unificada la politica de acceso a Advanced y el flujo de credenciales

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Migrar alumnos antiguos y nuevos sin perder audios ni accesos ya habilitados, exigiendo 7 dias de Principiante solo a quienes corresponda

### Touched
- lib/beginner-progress.js; api/students.js; api/audio-file.js; api/admin/create-student.js; api/admin/update-student.js; api/admin/migrate-advanced-access.js; src/App.jsx; src/Admin2Dashboard.jsx; scripts/test-advanced-unlock-policy.mjs; package.json

### Details
Se agregaron las politicas legacy_immediate y after_7_beginner_days. La migracion excluye siete pistas publicas, informa cobertura de email y contrasena, crea backup R2 antes de aplicar y no modifica registros ya migrados. El panel copia link anterior solo sin email, link de alta si falta contrasena y credenciales de soporte validas cuando el acceso ya existe. El contrato mobileAudio solo publica Advanced como ready cuando el audio esta aprobado y la politica lo permite.

### Verification
- npm run test:advanced-policy OK; npm run build OK con Vite 5.4.21; git diff --check OK; dry-run local sobre snapshot productivo: 101 alumnos, 7 assets excluidos, Tomas Boueri clasificado legacy_immediate con audio Advanced listo

### Risks / Follow-Up
La migracion productiva y sus smoke checks se ejecutan despues del deployment. Los 78 alumnos sin email requieren conciliacion administrativa antes de crear contraseña; los links con token se conservan como compatibilidad.

## 2026-07-20 10:59:38 -03 - Alineada la vigencia del audio Advanced entre frontend y backend

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Evitar que una grabacion nueva pendiente de procesamiento reactive en web un Advanced anterior que el backend e iOS ya consideran obsoleto

### Touched
- src/App.jsx

### Details
La interfaz compara fecha de la ultima grabacion con la edicion aprobada y solo considera vigente el audio final si no existe un crudo posterior.

### Verification
- npm run test:advanced-policy OK; npm run build OK; git diff --check OK

### Risks / Follow-Up
Sin migracion adicional. El endpoint de audio sigue siendo la barrera autoritativa y devuelve 404 mientras el nuevo crudo no tenga una edicion aprobada.

## 2026-07-20 11:07:09 -03 - Hecha estrictamente idempotente la migracion de Advanced

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Evitar backups R2 y escrituras redundantes al repetir apply despues de completar la migracion

### Touched
- api/admin/migrate-advanced-access.js

### Details
Si no quedan alumnos sin politica explicita, apply devuelve changed=0 y backupKey vacio sin modificar almacenamiento.

### Verification
- npm run test:advanced-policy OK; npm run build OK; git diff --check OK

### Risks / Follow-Up
Sin efecto sobre la migracion ya aplicada ni sobre los audios.

## 2026-07-20 11:07:09 -03 - Asociado el email verificado de Tomas Boueri en RM

- Kind: `config`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Permitir que cree usuario y contraseña sin duplicar el alumno ni perder su Advanced heredado

### Touched
- Registro productivo tomas-boueri en Cloudflare R2

### Details
Se completo el email desde la ficha de Academia Seguimiento. No se modificaron audio, progreso, token ni politica de desbloqueo.

### Verification
- API autenticada confirma email asociado, advancedUnlockPolicy=legacy_immediate, Advanced enabled/ready/approved y progreso Principiante 6/7

### Risks / Follow-Up
Aun debe crear su contraseña mediante el link de alta; el panel /admin ya copia ese link mientras auth.hasPassword sea false.

## 2026-07-20 11:07:09 -03 - Migrados los accesos Advanced de alumnos productivos

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Aplicar la regla corregida para alumnos de formulario antiguo y nuevo sin perder accesos ya habilitados

### Touched
- Cloudflare R2 students.json; backup R2 previo; https://rm.academiacortex.com.ar/api/admin/migrate-advanced-access

### Details
Se migraron 101 alumnos y se excluyeron 7 audios publicos del sistema. Quedaron 62 con legacy_immediate y 39 con after_7_beginner_days; 27 requieren grabacion. El backup se creo antes de escribir. Tomas Boueri fue clasificado legacy_immediate.

### Verification
- Dry-run HTTP 200; apply HTTP 200 con changed=101 y backup creado; reporte posterior alreadyMigrated=101; Tomas: mobileAudio Advanced approved/ready, endpoint edited 302 y 6/7 dias sin bloqueo

### Risks / Follow-Up
Los 84 alumnos sin contraseña deben completar alta gradualmente. Los alumnos sin email conservan el link anterior hasta conciliar identidad.

## 2026-07-20 11:09:20 -03 - Publicado y validado el acceso Advanced unificado

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Cerrar la migracion en produccion con el mismo contrato para web e iOS

### Touched
- Vercel deployments dpl_7FtsGQ5Ukhoe1caMYcw3tGvckmfs y dpl_79vbUnsj2r1KV2voApUgyzhDxxwK; https://rm.academiacortex.com.ar

### Details
El primer deployment habilito la migracion y el segundo dejo apply estrictamente idempotente. GitHub main quedo en 5ff743e antes de esta entrada documental.

### Verification
- Ambos deployments READY; /admin HTTP 200; apply repetido changed=0 sin backup; 101/101 alumnos migrados; Tomas con email, legacy_immediate, Advanced approved/ready y audio disponible; caso test-2 sin grabacion bloqueado con missing-personal-audio; HEAD y origin/main sincronizados

### Risks / Follow-Up
La conciliacion de email y alta de contrasena sigue siendo gradual para alumnos antiguos. El enlace con token permanece disponible como respaldo transitorio.

## 2026-07-20 12:22:58 -03 - Registrados los Advanced procesados de nueve alumnos F2

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Corregir alumnos F2 que ya tenian Principiante generado pero carecian de la voz Advanced aprobada para el desbloqueo posterior

### Touched
- Cloudflare R2 student records via RM admin API; slugs F2 sincronizados desde Formulario Cortex

### Details
Formulario reutilizo la voz ya limpiada de cada alumno, subio solo edited y ejecuto attach-edited-audio mas approve-edited-audio. Se conservaron las dos pistas Principiante existentes y la politica after_7_beginner_days; no se concedio acceso inmediato.

### Verification
- 9/9 registros RM tienen workflow approved, editorAudioKey presente y advancedUnlockPolicy=after_7_beginner_days. Caso control Hernan quedo 0/7, Advanced feature false y audio preparado para desbloqueo automatico al completar 7 dias.

### Risks / Follow-Up
Los objetos R2 edited fueron agregados de forma intencional. Una reversa completa requiere restaurar los registros RM y limpiar sus keys; no afecta alumnos legacy_immediate.

## 2026-07-20 15:34:31 -03 - Agregada el alta manual de alumnos en el panel moderno

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Permitir crear leads desde /admin y enviarles el enlace de grabacion sin usar el panel clasico

### Touched
- src/Admin2Dashboard.jsx; src/App.jsx; src/admin2.css; api/admin/create-student.js

### Details
Se agrego un modal responsive con nombre, email y solicitud de audio activa por defecto. El backend reutiliza alumnos por email y marca audio solicitado cuando la ficha existente aun no tiene grabacion; la recarga posterior es silenciosa para conservar el enlace en pantalla.

### Verification
- npm run test:advanced-policy OK; npm run build OK; git diff --check OK

### Risks / Follow-Up
Cambio aun no desplegado. No se creo ningun alumno real durante las pruebas; falta smoke autenticado en produccion despues de publicar.

## 2026-07-20 15:36:56 -03 - Publicada el alta manual de alumnos en RM

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Habilitar el alta operativa solicitada en https://rm.academiacortex.com.ar/admin

### Touched
- Vercel deployment dpl_75pV6VvNBSKDTAEWuUQKr2kL9WGt; https://rm.academiacortex.com.ar/admin

### Details
El deployment productivo quedo READY y el dominio sirve el bundle que contiene el modal Nuevo alumno. No se crearon alumnos durante el smoke.

### Verification
- Vercel READY; alias rm.academiacortex.com.ar asignado; GET /admin HTTP 200; bundle productivo contiene Nuevo alumno; POST create-student sin credenciales devuelve 401

### Risks / Follow-Up
El flujo autenticado debe usarse con un alumno real cuando operaciones haga la primera alta; el backend deduplica por email.

## 2026-07-21 10:13:41 -03 - Estabilizado el contrato publico de estudiantes para iOS

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Corregir el error de Principiante de Gabriela Luna sin requerir una nueva version de la app

### Touched
- api/students.js; scripts/test-students-contract.mjs; package.json

### Details
GET /api/students sin slug/token ahora siempre devuelve {students, settings}, aunque haya cookie de sesion. El perfil autenticado sigue disponible en /api/students/me y /api/auth/me. Se agrego una prueba que valida la forma publica y que no expone email ni token.

### Verification
- npm run test:students-contract OK; npm run test:advanced-policy OK; npm run build OK; git diff --check OK

### Risks / Follow-Up
La descarga inicial de las dos pistas Principiante sigue siendo grande en iOS; si una red lenta falla, la web queda como respaldo mientras se evalua descarga diferida en una version futura.

## 2026-07-21 10:16:45 -03 - Publicado el arreglo urgente de audio Principiante para iOS

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Restaurar el acceso de Gabriela Luna al audio ya procesado y mantener disponible la web RM

### Touched
- Vercel deployment dpl_9H4KsrAVinGzqba7VQ8LydJ4LNWD; https://rm.academiacortex.com.ar; api/students.js

### Details
El dominio productivo fue promovido con el contrato publico estable. No se modificaron registros ni objetos de audio de alumnos.

### Verification
- Deployment READY y alias asignado; GET /api/students HTTP 200 con {students,settings}; Gabriela encontrada con audioReady=true; perfil autenticado por slug/token HTTP 200 con 2 pistas Principiante ready; beginner y beginner-alt HTTP 206 audio/mpeg; contraseña configurada y 3 sesiones vigentes; GET web pendiente de smoke final

### Risks / Follow-Up
Gabriela debe cerrar y reabrir la app para repetir la carga. Si la red no tolera las dos pistas grandes, puede usar rm.academiacortex.com.ar mientras se evalua descarga diferida para un build futuro.

## 2026-07-23 11:15:06 -03 - Actualizado el automatico de Advanced web a cinco ciclos

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Alinear RM web con el nuevo modo automatico de 5 vueltas sin alterar configuraciones manuales personalizadas

### Touched
- src/advancedConfig.js; src/App.jsx; scripts/test-advanced-config.mjs; package.json

### Details
El default automatico pasa de 3 a 5 ciclos. Al cargar localStorage solo se migra una configuracion que coincida exactamente con el preset automatico anterior; cualquier manual distinto conserva sus ciclos.

### Verification
- npm run test:advanced-config OK; npm run test:advanced-policy OK; npm run test:students-contract OK; npm run build OK; git diff --check OK.

### Risks / Follow-Up
Pendiente commit, push y verificacion del deployment productivo en rm.academiacortex.com.ar.

## 2026-07-23 11:17:37 -03 - Publicado el automatico de Advanced de cinco ciclos

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Aplicar en RM productivo el nuevo numero de vueltas automaticas solicitado

### Touched
- Vercel deployment dpl_97WaYTA8Kcmkjcv7XTbBMM52aHaT; https://rm.academiacortex.com.ar; GitHub commit 138e1ebe52bd3a927c1a217b6f2173056d32c986

### Details
El deployment fue generado automaticamente desde GitHub main y promovido a los aliases productivos.

### Verification
- Vercel READY y aliasAssigned=true; commit SHA del deployment coincide con 138e1eb; GET del HTML productivo HTTP 200; bundle /assets/index-BgDMPMGR.js HTTP 200 y contiene el preset cycles:5.

### Risks / Follow-Up
Rollback disponible promoviendo el deployment productivo anterior dpl_Cr2ptPuZVKKxfFbegzhK3C7pdcYP. Las configuraciones manuales diferentes al automatico anterior no se migran.

## 2026-07-25 10:41:02 -03 - Reemplacé el Advanced defectuoso de Romina por la voz procesada con Auphonic y fundidos

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El audio Advanced de Romina tenía un golpe de micrófono en la palabra orquestando; la muestra Auphonic fue aprobada por el usuario para reemplazo

### Touched
- Cloudflare R2 student-edited/romina-saaied; registro RM romina-saaied; /Users/forax/Downloads/Romina-Saaied-Auphonic-Crossfade.mp3; /Users/forax/Documents/Claude/backups/rm-romina-audio-20260725-103805; cortex:/root/backups/rm-romina-audio-20260725-103805

### Details
Se aplicó fade-in de 1.2 s y fade-out de 3.5 s a la salida Auphonic cutter ya recortada. Se subió una clave R2 nueva, se adjuntó como editorAudioKey y se promovió como audioKey activo conservando legacy_immediate. El primer intento de promoción leyó el estado previo inmediatamente después del attach; la validación lo detectó y una segunda promoción sobre el editorAudioKey ya persistido dejó el registro consistente. Principiante 1/2 y raw no cambiaron. El audio anterior era editor-legacy/requestSource admin del 2026-07-15, sin sourceExternalId; raw y Advanced eran byte-idénticos, por lo que no provenía del pipeline Auphonic y el optimizador legacy había conservado el original.

### Verification
- API pública: status approved, Advanced habilitado, legacy_immediate y beginnerCompletedDays 5/7. GET admin de kind=edited descargó 1105397 bytes con SHA-256 46d3907869b4bbcd33c849ed06eb3e2d46c985dd19160ab71167f1514ddb3453, idéntico al candidato local. Claves de raw, beginner y beginner-alt presentes y sin cambios.

### Risks / Follow-Up
El MP3 anterior quedó respaldado localmente junto con el registro previo; rollback requiere re-subir ese MP3 porque el endpoint de reemplazo puede limpiar la clave R2 vieja. La web RM recibe el archivo nuevo al recargar; la app iOS mantiene caché temporal por URL estable y puede requerir invalidación de caché en una futura versión si Romina cambia de la web a iOS.

## 2026-07-25 10:51:54 -03 - Regeneré los dos Principiante de Romina con la voz Auphonic y el pipeline vigente

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Completar el reemplazo que antes había actualizado solo Advanced y dejar los tres audios reproducibles con el procesamiento actual

### Touched
- Cloudflare R2 student-beginner/romina-saaied y student-beginner-alt/romina-saaied; registro RM romina-saaied; /Users/forax/Documents/Claude/backups/rm-romina-audio-20260725-103805; cortex:/root/backups/rm-romina-audio-20260725-103805

### Details
Se reutilizó la salida Auphonic cutter ya aprobada, sin consumir otra producción. Se mezcló la voz en Océano y Bosque durante las cinco ventanas de apnea con parámetros productivos base 0.55, voz 1.25, fade-in 2 s y fade-out 9 s, sin doble realce de voz. Se reemplazaron secuencialmente ambas claves, esperando persistencia antes de restaurar el estado approved y legacy_immediate. Se mantuvieron requestSource admin, rawSource editor-legacy y ausencia de sourceExternalId para no inventar un formulario nuevo. Identidad, credenciales, actividad y progreso no se modificaron.

### Verification
- Backups previos SHA-256 4debfa882f206bd4870c89ae272c186d27c9390092826c3fddd5e0fe6c57e6d4 y 1568281219881c04b0c26535b79fdab938beeb03f1f4352bbc775685e90e78b1. Producción: edited 1105397 bytes SHA 46d3907869b4bbcd33c849ed06eb3e2d46c985dd19160ab71167f1514ddb3453; Océano 45362826 bytes SHA 976d894bd8559873ff2ef734d298d3003e074de35505a30ad09201295e2a6704; Bosque 45362826 bytes SHA 8f0ed36a5a7838d54ef5f1fccc0085026490e0590effad16b647b60f05a46c18. Registro approved, Advanced activo, policy legacy_immediate, ambos Principiante habilitados, raw presente y 5 días completados.

### Risks / Follow-Up
La app iOS puede mantener caché temporal por URLs estables; la web recarga los objetos nuevos. Rollback: re-subir los MP3 beginner.before y beginner-alt.before desde los respaldos local/remoto y restaurar sus claves mediante los endpoints admin. Los objetos R2 anteriores fueron limpiados por el reemplazo.

## 2026-07-25 12:20:46 -03 - Agregué un perfil experimental por alumno para voz Advanced continua

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Probar con un único usuario que la voz personalizada permanezca baja en respiración y recuperación y suba durante apnea, sin cambiar al resto

### Touched
- lib/advanced-playback.js; api/students.js; src/App.jsx; scripts/test-advanced-playback.mjs; scripts/test-students-contract.mjs; package.json

### Details
El contrato advancedPlayback normaliza dos perfiles: apnea_only por defecto y continuous_voice_v1. El perfil continuo usa multiplicadores fijos 0.4/0.4/1.0 y transición de 0.8 s. La web conserva la posición del audio entre fases únicamente para el perfil experimental; cualquier alumno sin flag mantiene el flujo anterior.

### Verification
- npm run test:advanced-playback OK; npm run test:students-contract OK; npm run test:advanced-config OK; npm run test:advanced-policy OK; npm run build OK; git diff --check OK

### Risks / Follow-Up
Todavía no se desplegó ni se activó un usuario. Rollback de datos: quitar features.advancedPlaybackProfile del único usuario de prueba. Rollback de código: revertir este lote.

## 2026-07-25 12:28:19 -03 - Conecté Metas Diarias con los checks reales del informe y añadí AASA

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Las tareas del alumno deben salir del plan_alumno del informe y los links /s deben abrir la app iOS

### Touched
- api/integrations/report-plan.js; lib/report-plan.js; api/daily/data.js; src/modules/daily/DailyGoalsModuleCore.jsx; public/.well-known/apple-app-site-association; vercel.json; scripts/test-report-plan.mjs

### Details
Endpoint Bearer privado, validación estricta 12/5, IDs estables, sincronización idempotente, preservación de historial y protección contra guardados obsoletos. Se eliminaron las metas ficticias.

### Verification
- npm run test:report-plan OK; test:advanced-playback OK; test:students-contract OK; npm run build OK; git diff --check OK

### Risks / Follow-Up
Pendiente configurar el secreto compartido, desplegar y ejecutar el backfill desde Formulario. Rollback mediante deployment previo de Vercel.

## 2026-07-25 12:37:00 -03 - Desplegué y validé la voz Advanced continua sólo en Apple Review

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Validar en producción el comportamiento de voz personalizada continua con una cuenta técnica antes de considerar cualquier ampliación

### Touched
- GitHub commit e8d08fa427b34d375aae68c357f19c2d3d9e8031; Vercel deployment dpl_GJtnjX97i6rkCPtWjT41KZFRsFFp; deployment productivo vigente dpl_4CAeYNBgzuVxn49pt5w3DUVxx2H2; registro apple-review

### Details
Se activó `features.advancedPlaybackProfile=continuous_voice_v1` únicamente en `apple-review`. La cuenta reproduce la voz al 40 por ciento durante respiración y recuperación y al 100 por ciento durante apnea, conserva la posición entre fases y aplica rampas de 0.8 segundos. No se cambiaron audios, progreso ni habilitaciones. `test-2` se usó como control y permaneció en `apnea_only`.

### Verification
- El deployment de la funcionalidad quedó READY y correspondió al SHA e8d08fa. El deployment productivo posterior 0663183, que incluye ese commit como ancestro, quedó READY y con alias rm.academiacortex.com.ar. El bundle productivo `/assets/index-C2CUegVu.js` contiene `continuous_voice_v1`.
- Contrato autenticado de apple-review: Advanced edited ready, perfil continuo activo, multiplicadores 0.4/1.0/0.4 y transición 0.8 s.
- API pública después de la activación: exactamente un perfil continuo (`apple-review`); `test-2` y el resto permanecen en `apnea_only`.
- Playwright con la cuenta técnica y una configuración temporal de un ciclo: la voz inició en 0.32, llegó a apnea en posición 2.11 s sin reinicio, subió a 0.8 en 0.8 s, llegó a recuperación en posición 66.77 s sin reinicio y bajó a 0.32 en 0.8 s. La configuración local de QA se restauró a 30 respiraciones, 5 ciclos y Bosque.

### Risks / Follow-Up
La prueba audible queda habilitada sólo para Apple Review. Rollback inmediato y de bajo impacto: cambiar `features.advancedPlaybackProfile` de apple-review a `apnea_only`. Rollback de código sin perder commits posteriores: revertir e8d08fa y desplegar; promover dpl_3GeL62t7i4TPkifWSNayzVoKa5YG sólo serviría como emergencia porque también quitaría cambios posteriores. iOS tiene el soporte local, pero requiere runtime, tests completos y una nueva build/TestFlight antes de usar este perfil en la app nativa.

## 2026-07-25 12:58:18 -03 - Publiqué la sincronización de metas y el archivo de Universal Links

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Activar en producción las tareas del informe y permitir que los links /s abran la app iOS

### Touched
- GitHub commits ed0663c y 0663183; Vercel dpl_4CAeYNBgzuVxn49pt5w3DUVxx2H2; api/integrations/report-plan.js; public/.well-known/apple-app-site-association; rm.academiacortex.com.ar

### Details
Se configuró FORM_REPORT_SYNC_SECRET como variable cifrada de producción sin exponer su valor. El redeploy tomó la variable y quedó promovido. El endpoint privado conserva historial, reemplaza solamente el plan vigente y rechaza identidad o formato ambiguos.

### Verification
- Deployment READY target production y aliasAssigned=true; SHA 0663183b17dcba2edb71c61d7b1e88ae683cf487; smoke Bearer llegó a 404 Alumno no encontrado en lugar de 401; AASA HTTP 200 application/json con appID 9XAX634M7F.com.darocortex.rmcortex y /s/*.

### Risks / Follow-Up
Rollback promoviendo dpl_JDDgjpojZ3VZae7EbWJJR7DBUKzS. Universal Links requiere una nueva build iOS con el entitlement y puede estar sujeto a caché de Apple.

## 2026-07-25 13:02:32 -03 - Verifiqué el deployment documental final sin cambios ejecutables

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Vercel generó un deployment al versionar ALMA.md aunque el commit usó skip ci

### Touched
- GitHub commit a277bae; Vercel dpl_2XWHgv48waD4Lja7D7qTNVpSBMBM; rm.academiacortex.com.ar

### Details
El commit sólo agregó documentación a ALMA.md y conserva exactamente el código de la integración ya validada.

### Verification
- Deployment READY target production aliasAssigned=true; SHA a277bae620e68d90fe83c6e03258e46bddd9b5c1; smoke Bearer final autorizado con 404 técnico esperado; AASA live conserva appID y /s/*.

### Risks / Follow-Up
No volver a pushear esta entrada durante este trabajo para evitar otro deployment documental. Rollback funcional disponible con dpl_JDDgjpojZ3VZae7EbWJJR7DBUKzS.

## 2026-07-25 17:05:36 -03 - Habilité Advanced como excepción para TEST test-2

- Kind: `config`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario solicitó liberar el acceso del alumno técnico sin exigirle siete días de Principiante

### Touched
- rm.academiacortex.com.ar student test-2; R2 students production record; ALMA.md

### Details
Se mantuvo el progreso real de Principiante en 0/7. Se asignó al alumno la referencia al audio Advanced ya aprobado del fixture Apple Review y se cambió únicamente su política a legacy_immediate con Advanced habilitado. No se copiaron archivos, no se fabricaron eventos de escucha y no se modificó la regla global.

### Verification
- GET /api/students devolvió Advanced habilitado, policy legacy_immediate, blockedReason vacío y Principiante 0/7. La vista real /s/test-2 mostró Reprogramación Mental Advanced como botón habilitado.

### Risks / Follow-Up
La excepción comparte el objeto Advanced aprobado del fixture Apple Review. Rollback: retirar esa referencia de test-2, restablecer advancedReprogrammingEnabled=false y policy after_7_beginner_days; no requiere borrar el objeto compartido.

## 2026-07-25 18:43:12 -03 - Agregué edición segura de identidad en el admin de RM

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Permitir asignar email y, sólo cuando corresponda, corregir el vínculo de Formularios para alumnos legacy como test-2

### Touched
- api/admin/update-student.js; src/App.jsx; src/Admin2Dashboard.jsx; src/admin2.css; GitHub commit e3f6296; Vercel dpl_DpY6kTHzPUjiJApSw5QATSuu6V59; rm.academiacortex.com.ar/admin

### Details
El drawer del alumno ahora muestra su email y abre un modal Editar identidad. El email es obligatorio y único. El ID de Formularios queda en una sección opcional cerrada, valida 24 caracteres hexadecimales y no puede repetirse. Las ediciones de perfil preservan lastAudioAccessAt para no fabricar actividad. No se modificó test-2: sigue sin email y conserva su vínculo histórico hasta que administración ingrese datos confirmados.

### Verification
- npm run build OK; node --check api/admin/update-student.js OK; npm run test:students-contract OK; npm run test:advanced-policy OK; git diff --check OK; deployment READY y dominio sirviendo el bundle nuevo; prueba productiva no mutante devolvió 400 para email inválido y test-2 permaneció sin cambios; QA Chrome desktop 1736x1227 y móvil 390x844 sin overflow horizontal ni solapamientos

### Risks / Follow-Up
El sourceExternalId histórico de test-2 apunta a un formulario no encontrado y no debe reemplazarse sin un ID confirmado. Rollback de código: revertir e3f6296. Rollback de deployment: promover dpl_2XWHgv48waD4Lja7D7qTNVpSBMBM. ALMA.md conserva entradas locales previas y no se pushea en este lote para evitar un deployment sólo documental.

## 2026-07-27 11:08:28 -03 - Conté Principiante al llegar a 25 minutos y recuperé el progreso histórico

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El audio termina las respiraciones antes de la meditación final; el usuario pidió considerar completa cada práctica al reproducir 25 minutos y habilitar Advanced a Mariam

### Touched
- lib/beginner-progress.js; src/App.jsx; api/students.js; scripts/backfill-beginner-25m.mjs; scripts/test-advanced-unlock-policy.mjs; package.json; R2 students.json producción; alumno mariam-rujana; GitHub 75128ba; Vercel dpl_AFKynKcBETZykCY4N1HfS9BSGash

### Details
La regla exige al menos 1500 segundos realmente reproducidos, posición de al menos 1500 segundos y ausencia de seek; conserva el cierre de audios legacy cortos. El backfill sumó días omitidos a 17 alumnos y una segunda pasada dio 0 cambios. Mariam pasó de 0 a 2 días reales. Como no alcanzó 7, se aplicó la excepción solicitada: se vinculó a mariam-rujana el Advanced legacy aprobado del duplicado mariam, confirmado por el mismo source externalId, sin fabricar cinco días.

### Verification
- npm run test:advanced-policy OK; npm run test:students-contract OK; npm run test:advanced-playback OK; npm run build OK; node --check y git diff --check OK; deployment READY y alias rm.academiacortex.com.ar en SHA 75128ba; backfill apply 17 y dry-run posterior 0; contrato autenticado de mariam-rujana: advanced ready=true, status=approved, completedDays=2 y blockedReason vacío

### Risks / Follow-Up
El desbloqueo de Mariam es una excepción legacy_immediate; el resto conserva su política. Rollback de código: revertir 75128ba o promover dpl_DpY6kTHzPUjiJApSw5QATSuu6V59. Rollback de datos: quitar sólo los dayKey agregados listados en el reporte de migración y restaurar los campos de Mariam desde el backup temporal capturado antes del cambio. ALMA.md conserva entradas locales previas y no debe pushearse en este lote sólo documental.

## 2026-07-27 13:16:14 -03 - Habilité Advanced como excepción para Mariana Urdaibay

- Kind: `config`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario solicitó pasar a Mariana a Advanced sin esperar siete días de Principiante

### Touched
- R2 students.json producción; alumno mariana-urdaibay; api/admin/update-student en rm.academiacortex.com.ar; ALMA.md

### Details
Se verificó que el registro tenía Principiante y un archivo Advanced existente y accesible. Se cambió únicamente a policy legacy_immediate, status approved y Advanced habilitado. Se conservaron sus 0 días reales de Principiante y no se reemplazó ni regeneró ningún audio.

### Verification
- Lectura productiva previa confirmó el objeto Advanced disponible; POST autorizado respondió HTTP 200; lectura posterior y GET autenticado /api/students devolvieron advanced ready=true, status=approved, policy=legacy_immediate, blockedReason vacío y completedDays=0

### Risks / Follow-Up
Es una excepción manual. Rollback: restaurar audioKey, audioWorkflow, advancedUnlockPolicy y features desde /tmp/mariana-advanced-backup.json; no requiere borrar archivos de audio.

## 2026-07-27 13:48:38 -03 - Telemetria durable de reproduccion Principiante

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Registrar siempre cuanto reprodujo el alumno incluso ante cierre de app, segundo plano, reintentos o escrituras concurrentes

### Touched
- lib/beginner-progress.js; lib/beginner-telemetry.js; api/students.js; api/auth/me.js; api/auth/login.js; api/auth/set-password.js; api/audio-file.js; src/App.jsx; scripts/test-advanced-unlock-policy.mjs

### Details
Se agregaron sesiones y eventos idempotentes con checkpoints, secuencia y eventId; el progreso se consolida por alumno en R2 y la web reporta cada 15 segundos.

### Verification
- node --check OK; test:advanced-policy OK; test:students-contract OK; test:advanced-playback OK antes del reinicio; npm run build OK; git diff --check OK

### Risks / Follow-Up
El checkpoint nativo requiere distribuir una nueva version iOS para llegar a alumnos; backend y web son retrocompatibles con clientes anteriores.

## 2026-07-27 13:52:45 -03 - Telemetria Principiante desplegada en produccion

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Activar checkpoints web y consolidacion durable sin esperar una nueva build iOS

### Touched
- GitHub commit ed22d3d; Vercel deployment dpl_Bo1e9wtPYrShaSamRHBDnyJVPSmF; rm.academiacortex.com.ar; fixture test-2

### Details
El alias productivo sirve el bundle con checkpoints cada 15 segundos. Un smoke idempotente sobre test-2 creo una sesion tecnica de 16 segundos sin completar ningun dia.

### Verification
- Deployment READY; alias productivo activo; root HTTP 200; bundle incluye checkpoint e intervalo 15s; POST y GET autenticados HTTP 200; sessionFound=true, playedSeconds=16, sequence=1, completed=false, completedDays=0

### Risks / Follow-Up
Los alumnos web quedan cubiertos de inmediato. Los alumnos iOS requieren publicar la nueva build para tener persistencia offline y flush de ciclo de vida.

## 2026-07-27 18:42:21 -03 - Evité pérdidas por escrituras concurrentes y reparé Principiante 2 de Raul Suazo

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El alumno juristashn@hotmail.com podía reproducir Principiante 1 pero Principiante 2 devolvía 404 porque una actualización de sesión revirtió la referencia recién sincronizada

### Touched
- lib/r2.js; scripts/test-students-concurrency.mjs; package.json; GitHub commit 29e8d38; Vercel deployment dpl_CVBAyS5rpwp5oDEL8pJJWjaW26iA; R2 students.json; alumno raul-rolando-suazo-barillas

### Details
students.json ahora usa ETag/If-Match, reintentos y merge profundo por slug para conservar cambios concurrentes de audio, sesión y telemetría. Se reasoció beginnerAltAudioKey al objeto ya generado de 45.362.826 bytes; no se reprocesaron audios ni se modificaron reglas de desbloqueo.

### Verification
- node --check lib/r2.js OK; test:students-concurrency, test:advanced-policy, test:students-contract y test:advanced-playback OK; npm run build OK; pruebas descartables reales en R2 confirmaron 412 para ETag obsoleto y merge de audio+sesión; deployment READY en rm.academiacortex.com.ar; Principiante 1 y 2 devolvieron HTTP 206 audio/mpeg con rango de 1024 bytes

### Risks / Follow-Up
Rollback de código: revertir 29e8d38 o promover dpl_Bo1e9wtPYrShaSamRHBDnyJVPSmF. Rollback de datos: restaurar beginnerAltAudioKey al valor anterior terminado en 1785172559533, aunque ese objeto no existe; el valor reparado termina en 1785176648734. ALMA.md conserva entradas locales previas y no se incluye en el commit de código.

## 2026-07-28 10:37:45 -03 - Actualicé en RM los tres audios corregidos de Jessica Gabazza

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El recorte fijo del procesamiento anterior había eliminado las primeras palabras de la voz personalizada y el usuario aprobó reprocesar el raw original con el pipeline corregido.

### Touched
- RM production student jessica-gabazza; R2 beginnerAudioKey; R2 beginnerAltAudioKey; R2 editorAudioKey; respaldo /root/backups/formulario-auphonic-dynamic-trim-20260728-102517/rm-jessica-before.json

### Details
Formulario reproceso el raw v1 de Jessica con Auphonic y deteccion dinámica del comienzo de voz, luego sincronizo Principiante 1, Principiante 2 y Advanced al slug existente jessica-gabazza. Whisper verifico la frase inicial completa en todas las variantes y en un segundo loop de Principiante 1.

### Verification
- Las tres claves cambiaron; beginner, beginner-alt y edited respondieron HTTP 206 audio/mpeg con Range de 1024 bytes usando acceso admin, sin registrar reproducción del alumno. El workflow RM permanece approved y conserva advancedUnlockPolicy=after_7_beginner_days.

### Risks / Follow-Up
Los registros RM antes/despues están respaldados con permisos restringidos en /root/backups/formulario-auphonic-dynamic-trim-20260728-102517. No hubo cambio de código ni deployment RM en este lote; para rollback de datos deben restaurarse las tres claves del snapshot before.

## 2026-07-28 14:00:24 -03 - Dupliqué el audio legacy de Johanna al usuario canónico con email

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario solicitó conservar el registro viejo y agregar copias independientes al usuario johanna-vera-ducharne vinculado a comunidadyoghika7@gmail.com

### Touched
- RM producción: johanna-vera y johanna-vera-ducharne; R2 raw y edited; /root/backups/rm-johanna-duplicate-20260728-165937

### Details
Se copiaron físicamente raw y Advanced a nuevas claves del usuario canónico. Se conservó sin cambios el registro legacy. El destino mantuvo email, token, contraseña y sesión; quedó approved, Advanced habilitado y policy legacy_immediate.

### Verification
- Ambos slugs devolvieron HTTP 206 para raw y edited; las claves origen/destino son distintas; contrato autenticado del destino devolvió advanced ready=true y status=approved; sourceUnchanged=true.

### Risks / Follow-Up
No se generaron audios Principiante porque el registro legacy sólo tenía el audio de voz/Advanced de 72.202 s. Rollback disponible restaurando el snapshot privado y eliminando únicamente las dos claves nuevas del destino.

## 2026-07-29 10:26:18 -03 - Corregí Metas Diarias por sesión y protegí el progreso Principiante

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Los alumnos con email y contraseña no cargaban sus metas, Viviana perdió un día completado por respuestas concurrentes y se pidió impedir que el alumno adelante el audio

### Touched
- src/modules/daily/DailyGoalsModuleCore.jsx; src/App.jsx; src/styles.css; lib/beginner-progress.js; lib/beginner-telemetry.js; api/students.js; scripts/test-advanced-unlock-policy.mjs

### Details
Metas Diarias ahora autentica con la cookie HttpOnly aunque no exista token legacy y espera la hidratación cloud antes de guardar. El reproductor web usa controles propios sin scrubber, permite pausar, revierte intentos de avance y avisa al alumno. La telemetría se consolida con ETag/If-Match y merges monotónicos para que una escritura o respuesta obsoleta no reduzca días completados.

### Verification
- test:advanced-policy, test:students-concurrency, test:students-contract, test:advanced-playback, test:report-plan y test:advanced-config OK; npm run build OK; node --check y git diff --check OK; Playwright local confirmó GET/POST de Metas sólo con slug/cookie, sin token, y un salto de 20 s volvió a ~1.3 s mostrando el aviso; QA móvil 390x844 sin controles nativos ni solapamientos

### Risks / Follow-Up
El bloqueo visual se activa inmediatamente en web. Clientes nativos anteriores siguen dependiendo de enviar seeked=true para invalidar una sesión; el backend mantiene esa regla. Rollback de código: revertir el commit de este lote y promover el deployment productivo anterior dpl_CVBAyS5rpwp5oDEL8pJJWjaW26iA.

## 2026-07-29 10:30:23 -03 - Desplegué las correcciones de Metas y Principiante en RM

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Activar para los alumnos con email/contraseña la carga de Metas Diarias y evitar pérdidas o adelantamientos en las prácticas de Principiante

### Touched
- GitHub commit 643fcaf; Vercel deployment dpl_AdJEdCLXo8AZ9uRnEGvKuf7ttpUk; https://rm.academiacortex.com.ar; producción R2 leída sin cambios

### Details
El push a main disparó el deployment productivo automático y Vercel promovió el alias principal. No se migraron ni alteraron datos de alumnos durante el despliegue.

### Verification
- Vercel READY/PROMOTED y alias asignado; raíz HTTP 200; bundle productivo contiene el bloqueo de adelantamiento, aviso y acceso /api/daily/data por sesión. Lectura R2 posterior: Viviana conserva 5 días completados (25-29/07) y 12 plantillas de Metas Diarias.

### Risks / Follow-Up
Rollback: promover dpl_CVBAyS5rpwp5oDEL8pJJWjaW26iA y revertir 643fcaf. El frontend web queda protegido ya; clientes iOS anteriores sólo invalidan seek si reportan seeked=true y requieren una futura build para replicar el bloqueo visual nativo.

## 2026-07-29 10:43:21 -03 - Aclaré cuándo cuenta cada día de Principiante

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Eliminar la redundancia sobre adelantar el audio y explicar que el día cuenta al terminar los ciclos de respiración

### Touched
- src/App.jsx; ALMA.md

### Details
El texto principal ahora indica que cada día cuenta al terminar los ciclos de respiración, aproximadamente a los 25 minutos. La regla de pausa y adelanto queda sólo en el aviso inferior. No cambió el umbral técnico de 1500 segundos ni la política de 7 días.

### Verification
- npm run build OK; npm run test:advanced-policy OK

### Risks / Follow-Up
Cambio validado localmente y todavía no desplegado; requiere aprobación explícita para crear un nuevo deployment de Vercel.

## 2026-07-31 09:42:58 -03 - Habilité Advanced como excepción individual para Ana Agostino

- Kind: `config`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario solicitó habilitar Advanced a Ana Agostino sin alterar la regla global ni su progreso real de Principiante

### Touched
- RM producción: alumno ana-agostino; R2 students.json; respaldo privado /tmp/rm-ana-agostino-advanced-before-20260731T124237Z.json

### Details
Se cambió únicamente advancedUnlockPolicy de after_7_beginner_days a legacy_immediate y se habilitó features.advancedReprogrammingEnabled usando el Advanced ya aprobado. Se conservaron sin cambios Principiante 1, Principiante 2, Advanced y los 3/7 días reales.

### Verification
- POST /api/admin/update-student action=unlock-advanced respondió OK; lectura posterior de /api/admin/list y /api/students confirmó policy=legacy_immediate, Advanced habilitado, workflow approved, sin bloqueo, 3/7 preservados y las tres claves de audio sin cambios.

### Risks / Follow-Up
Excepción limitada a ana-agostino. No hubo cambio de código, deployment ni modificación de la regla global. Rollback: restaurar policy, features y audioWorkflow desde el snapshot privado con permisos 600.

## 2026-07-31 18:36:17 -03 - Habilité Advanced en la cuenta canónica de Rafa Pino

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario solicitó dar acceso Advanced a Rafa Pino; el alumno tenía los audios aprobados en un registro legacy sin email y usaba una cuenta nueva vinculada al formulario

### Touched
- RM producción: rafael-pino y rafael-ernesto-pino; R2 raw, Principiante 1, Principiante 2 y Advanced; /tmp/rm-rafa-pino-advanced-before-20260731T213540Z.json

### Details
Se copiaron físicamente los cuatro audios del registro legacy a claves independientes del registro canónico coachrafapino@gmail.com. El destino mantuvo identidad, formulario vinculado, contraseña, sesiones, token, uso y progreso; quedó approved, policy legacy_immediate y Advanced habilitado. El registro legacy y sus referencias no cambiaron.

### Verification
- Las cuatro copias conservaron tamaño y contenido; lectura posterior de R2 confirmó referencias independientes. GET autenticado /api/students devolvió mobileAudio.advanced ready=true/status=approved y dos audios Principiante ready. Se verificó sourcePreserved=true, authPreserved=true y usagePreserved=true.

### Risks / Follow-Up
Excepción limitada a rafael-ernesto-pino; no hubo cambio de código ni deployment. Rollback: restaurar los campos del destino desde el snapshot privado con permisos 600 y eliminar únicamente las cuatro claves nuevas; el registro rafael-pino no requiere restauración.

## 2026-08-01 17:16:58 -03 - Activé voz Advanced continua sólo para Gabriela Luna

- Kind: `config`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Gabriela solicitó escuchar su voz personalizada también durante respiración y recuperación, a menor volumen que durante apnea

### Touched
- RM producción: gabriela-lucero-luna-portilla; R2 students.json; /tmp/rm-gabriela-luna-continuous-voice-before-20260801T201638Z.json

### Details
Se configuró únicamente features.advancedPlaybackProfile=continuous_voice_v1. El contrato resultante usa multiplicadores 0.4 en respiración, 0.4 en recuperación y 1.0 en apnea, con transición de 0.8 segundos. No se regeneró ni reemplazó ningún audio y no se modificó la política Advanced.

### Verification
- GET autenticado /api/students confirmó profile continuous_voice_v1, continuousVoiceEnabled=true, Advanced ready/approved y progreso Principiante 7/7. Se compararon antes/después: audioWorkflow, referencias de audio, usage, auth, identidad, política y lastAudioAccessAt quedaron sin cambios. El archive iOS público 1.0.1 (20) contiene continuous_voice_v1.

### Risks / Follow-Up
Excepción limitada a gabriela-lucero-luna-portilla. No hubo cambio de código ni deployment. Rollback inmediato: configurar advancedPlaybackProfile=apnea_only; el estado previo está documentado en el snapshot privado con permisos 600.

## 2026-08-01 18:17:22 -03 - Mostré todas las rondas y amplié Seguimiento a alumnos activos

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Gabriela Lucero Luna Portilla tenía cinco rondas guardadas pero el drawer mostraba sólo tres y Seguimiento la ocultaba por el filtro de atención

### Touched
- src/Admin2Dashboard.jsx; src/admin2.css; GitHub a73bb9f; Vercel dpl_FXU72ncLi2ep6Y2EGRoWoKfBUEQo; https://rm.academiacortex.com.ar/admin

### Details
El drawer agrupa sesiones recientes, muestra fecha, duración y cada ronda numerada sin recortar valores. Seguimiento ahora abre con todos los alumnos activos ordenados por prioridad; Alertas conserva el filtro de quienes requieren atención. Los datos de Gabriela no se modificaron: producción conserva una sesión de 26:37 con cinco rondas.

### Verification
- npm run build OK; test:students-contract OK; test:advanced-policy OK; git diff --check OK; Playwright con fixture exacto de Gabriela validó escritorio y móvil 390x844 sin overflow y las cinco rondas; deployment READY/PROMOTED; dominio HTTP 200 sirve bundle con Rondas recientes y CSS nuevo

### Risks / Follow-Up
Cambio sólo de presentación y filtro inicial. Rollback: revertir a73bb9f o promover dpl_AdJEdCLXo8AZ9uRnEGvKuf7ttpUk. ALMA.md conserva entradas locales previas y no se incluyó en el commit para no mezclar trabajos.

## 2026-08-01 18:45:56 -03 - Permití que cada alumno edite sus tareas de Metas Diarias

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El alumno debe poder renombrar, agregar y quitar tareas desde RM sin alterar el historial ni los campos definidos por el informe

### Touched
- lib/report-plan.js; scripts/test-report-plan.mjs; src/modules/daily/DailyGoalsModuleCore.jsx; src/modules/daily/daily-goals.css

### Details
Las ediciones afectan el día actual y los siguientes; los días históricos permanecen intactos. Se agregaron tareas personales canónicas, validación de nombres y duplicados, protección studentEditedAt contra informes obsoletos y filtrado de IDs desconocidos. Categoría, puntaje y criticidad del informe no son editables.

### Verification
- test:report-plan y suites advanced-config, advanced-policy, students-contract, students-concurrency y advanced-playback OK; npm run build OK; git diff --check OK; Playwright en 390x844 confirmó modal, guardado, mensaje de éxito y ausencia de overflow.

### Risks / Follow-Up
Cambio validado sólo en local. No hubo commit ni deployment a Vercel; requiere aprobación explícita antes de producción.

## 2026-08-01 19:39:55 -03 - Creé un clon técnico de Gabriela Luna para probar la voz Advanced continua

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Permitir validar que la voz personalizada se escucha durante las respiraciones sin alterar las estadísticas de la alumna real

### Touched
- RM producción: gabriela-lucero-luna-portilla y prueba-gabriela-luna-voz-continua; R2 students.json; snapshots privados /tmp/rm-gabriela-clone-before-20260801T223801Z.json y /tmp/rm-gabriela-clone-after-20260801T223917Z.json

### Details
El clon no copia email, formulario, contraseña, sesiones ni historial. Reutiliza sólo las referencias de Principiante 1, Principiante 2 y Advanced; quedó con policy legacy_immediate y advancedPlaybackProfile=continuous_voice_v1. La voz usa 0.4 durante respiración/recuperación y 1.0 durante apnea.

### Verification
- API autenticada confirmó Advanced ready/approved, dos audios Principiante y perfil continuo activo; Range de 1024 bytes devolvió HTTP 206 audio/mpeg para beginner, beginner-alt y edited; el clon conserva 0 sesiones, 0 rondas y 0 respiraciones; fingerprint completo del registro original permaneció idéntico antes y después.

### Risks / Follow-Up
Las reproducciones del enlace de prueba se registrarán sólo en el clon. Rollback: eliminar únicamente prueba-gabriela-luna-voz-continua desde el endpoint admin; las referencias compartidas permanecen protegidas porque siguen usadas por Gabriela.

## 2026-08-01 19:52:36 -03 - Activé la voz personalizada continua como regla general de Advanced

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: La prueba con el clon de Gabriela fue aprobada y el usuario pidió aplicar el mismo comportamiento a todos los alumnos

### Touched
- lib/advanced-playback.js; scripts/test-advanced-playback.mjs; GitHub f5c7023; Vercel dpl_BCVjUmTEJQF1ZEAKg1gL71JihhhP; https://rm.academiacortex.com.ar

### Details
El perfil predeterminado ahora es continuous_voice_v1: volumen 0.4 durante respiración y recuperación, 1.0 durante apnea y transición de 0.8 s. Se conserva apnea_only como excepción individual explícita. No se migraron datos ni se modificaron audios, progreso o estadísticas.

### Verification
- test:advanced-playback, test:students-contract, test:advanced-policy y test:advanced-config OK; npm run build y git diff --check OK; deployment READY/PROMOTED; raíz HTTP 200; API productiva confirmó 82/82 alumnos con Advanced aprobado usando continuous_voice_v1 y multiplicadores correctos.

### Risks / Follow-Up
Cambio global para todo Advanced actual y futuro. Rollback: revertir f5c7023 o promover dpl_FXU72ncLi2ep6Y2EGRoWoKfBUEQo; para una excepción individual se puede fijar advancedPlaybackProfile=apnea_only.

## 2026-08-01 20:07:56 -03 - Aumenté la voz personalizada a 120% durante la apnea

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario indicó que el contraste con la voz de respiración no se percibía suficientemente

### Touched
- lib/advanced-playback.js; scripts/test-advanced-playback.mjs; scripts/test-students-contract.mjs; GitHub 071f67a; Vercel dpl_Ci88H4kVcdZCQeiLMqGhMJiL2xSZ; https://rm.academiacortex.com.ar

### Details
El multiplicador de apnea pasó de 1.0 a 1.2. Con el volumen estándar 0.8 la voz queda en 0.96 durante apnea, frente a 0.32 durante respiración/recuperación. El cálculo limita el resultado a 1.0 para evitar saturación cuando el alumno configuró volumen máximo.

### Verification
- test:advanced-playback, test:students-contract, test:advanced-policy y test:advanced-config OK; npm run build y git diff --check OK; deployment READY/PROMOTED; API productiva confirmó 82/82 Advanced aprobados con breathing=0.4, recovery=0.4 y apnea=1.2.

### Risks / Follow-Up
Cambio global para Advanced web y clientes que consumen el contrato. Rollback: revertir 071f67a o promover dpl_BCVjUmTEJQF1ZEAKg1gL71JihhhP.

## 2026-08-04 10:18:50 -03 - Restauré Advanced inmediato para Isacc del Castillo

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El audio legado había quedado en estado edited después de un reemplazo y el usuario pidió volver a habilitar Advanced

### Touched
- RM producción: isacc-del-castillo-garcia; R2 students.json; snapshot privado /tmp/rm-isacc-before-unlock-20260804T131832Z.json

### Details
Se aplicó unlock-advanced sobre el archivo editado actual. El workflow quedó approved, la política legacy_immediate y la habilitación Advanced activa; no se reemplazaron archivos ni se alteró el historial.

### Verification
- API autenticada: mobileAudio.advanced.ready=true; audio edited respondió HTTP 206 audio/mpeg; fingerprints de usage y claves de audio permanecieron idénticos

### Risks / Follow-Up
Rollback disponible desde el snapshot privado con permisos 600; no se modificaron email, contraseña, Metas Diarias ni estadísticas.

## 2026-08-04 10:22:31 -03 - Eliminé la duplicación visual de apneas sincronizadas

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Viviana veía dos veces las cinco apneas de días anteriores porque la pantalla anexaba el historial local al mismo historial ya confirmado por el servidor

### Touched
- lib/apnea-history.js; src/App.jsx; scripts/test-apnea-history.mjs; package.json; GitHub 8829a2c; Vercel dpl_8hr41sHASXsAWk9S1TPpQHoR4LMi; https://rm.academiacortex.com.ar

### Details
La pantalla compara fecha, secuencia de apneas y hora de finalización. Descarta únicamente la copia local equivalente a una sesión del servidor y conserva sesiones locales genuinamente pendientes o distintas. Los cambios locales ajenos de Metas Diarias y copy de Principiante quedaron fuera del commit.

### Verification
- test:apnea-history, test:students-contract, npm run build y git diff --check OK; deployment READY/PROMOTED del SHA 8829a2c; dominio HTTP 200 con bundle nuevo; contrato productivo de Isacc sigue ready=true

### Risks / Follow-Up
Una sesión idéntica sólo se deduplica si finalizó dentro de una tolerancia de 30 segundos; dos sesiones reales posteriores con los mismos tiempos permanecen separadas. Rollback: revertir 8829a2c o promover dpl_tD2ot5CtjKPvSwovLeVf8TUTqRk3.

## 2026-08-08 12:33:28 -03 - Protegí el historial ante escrituras concurrentes y reparé la sesión de Romina

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Romina tenía las apneas del 8/8 en apneaByDay, pero recentSessions omitía la sesión y lastSession mezclaba la fecha nueva con las apneas del día anterior

### Touched
- lib/r2.js; scripts/test-students-concurrency.mjs; GitHub 130abe0; Vercel dpl_DjHJUmFVkCXmRJ6o4GjFF85YXopY; R2 romina-saaied; /root/backups/rm-romina-apnea-repair-20260808T152456Z

### Details
La fusión de snapshots ahora compara valores JSON estructuralmente antes de crear un patch, evitando que arrays clonados pero sin cambios sobrescriban historial más nuevo durante un conflicto de ETag. La regresión reproduce la combinación exacta observada en Romina tras serializar baseline, desired y latest. Después de desplegar la protección se reparó con If-Match único sólo lastSession y recentSessions: la sesión 2026-08-08T11:07:34.070Z quedó con apneas 126, 130 y 142; apneaByDay, totales y todos los demás campos permanecieron idénticos.

### Verification
- test:students-concurrency, test:students-contract, test:apnea-history y test:advanced-policy OK; npm run build OK; git diff --check y node --check OK; deployment READY/PROMOTED del SHA 130abe07b5c9d7bfeb21c285635733c235d17730; dominio HTTP 200; API productiva devuelve una sola recentSession del 8/8 con 126/130/142, lastSession igual y apneaByDay igual; contadores preservados en 13 sesiones, 52.05 rondas y 2126 respiraciones; backup 3 archivos, 0 vacíos, permisos 600

### Risks / Follow-Up
Rollback de código: revertir 130abe0 o promover dpl_CtzbrnacuYmdwxy63f5rmRLAqjXD. Rollback de datos: restaurar únicamente romina-saaied desde el snapshot before del backup privado. Dos escrituras que modifiquen legítimamente el mismo array al mismo tiempo todavía requieren resolución de dominio; este fix cubre la sobrescritura observada por escrituras concurrentes no relacionadas. Los cambios locales de Metas Diarias no se incluyeron ni modificaron.

## 2026-08-10 16:11:59 -03 - Habilité Advanced manualmente para Luz Denice Restrepo

- Kind: `migration`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario pidió una excepción manual antes de completar los siete días de Principiante

### Touched
- RM producción: luz-denice-restrepo; /root/backups/rm-luz-advanced-20260810T191105Z

### Details
Se aplicó unlock-advanced únicamente al registro canónico luzrpo70@gmail.com. La política quedó legacy_immediate y el workflow siguió approved; no se reemplazaron audios ni se alteró el progreso.

### Verification
- Panel productivo mostró Advanced Habilitado; Advanced enabled=true; policy legacy_immediate; timestamp presente; fingerprints de usage y auth idénticos; identidad y cuatro claves de audio preservadas; progreso 2/7.

### Risks / Follow-Up
Rollback disponible desde el backup privado con permisos restrictivos. La operación sólo modificó la habilitación y política Advanced de Luz.

## 2026-08-10 16:11:59 -03 - Preparé la acción manual Pasar a Advanced en Seguimiento

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: Reemplazar el botón de generación/copia de contraseña por una acción operativa para excepciones manuales

### Touched
- src/Admin2Dashboard.jsx; src/App.jsx; commit aislado 1bac565

### Details
El drawer moderno muestra Pasar a Advanced sólo cuando existe un audio Advanced aprobado; pide confirmación y refleja estados Habilitando, Advanced habilitado y Advanced no disponible. El commit está listo pero no se publicó ni desplegó porque falta autorización explícita para modificar main.

### Verification
- npm run build OK; test:advanced-policy, test:students-contract y test:students-concurrency OK; git diff --check OK; QA visual con fixture en escritorio y 390x844 sin desborde; estados ya habilitado y sin audio quedaron desactivados.

### Risks / Follow-Up
Pendiente de push y despliegue productivo. Rollback antes de publicar: descartar el commit aislado 1bac565; no afecta la habilitación de Luz ya aplicada por API.

## 2026-08-10 16:19:34 -03 - Desplegué Pasar a Advanced en Seguimiento

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/reprogramacion-mental-cortex`
- Reason: El usuario autorizó publicar el botón manual para excepciones Advanced

### Touched
- src/Admin2Dashboard.jsx; src/App.jsx; GitHub 1bac565; Vercel dpl_FrxjVFwRqrAHRYofcYuuABLKgMXc; https://rm.academiacortex.com.ar/admin

### Details
El drawer moderno reemplaza Crear contraseña/Copiar credenciales por Pasar a Advanced. La acción exige un audio Advanced aprobado, pide confirmación, conserva el progreso y muestra estados no repetibles para ya habilitado o sin audio. Luz Denice Restrepo ya estaba habilitada y ahora aparece como Advanced habilitado.

### Verification
- Vercel READY/PROMOTED y alias asignado al SHA 1bac56587a8db8428036df9f4121d054979b9fef; dominio HTTP 200 sirve /assets/index-D7icEvPj.js con los tres estados nuevos; panel productivo autenticado mostró Advanced habilitado desactivado para Luz y eliminó Copiar credenciales; build, advanced-policy, students-contract, students-concurrency, diff-check y QA 390x844/escritorio OK.

### Risks / Follow-Up
Rollback de código: revertir 1bac565 o promover dpl_DjHJUmFVkCXmRJ6o4GjFF85YXopY. El cambio sólo afecta el drawer moderno; el endpoint unlock-advanced conserva sus validaciones existentes.

## 2026-08-11 10:20:44 -03 - Integré Metas editables y reproducción Principiante resistente al segundo plano

- Kind: `edit`
- Project root: `/Users/forax/Documents/Claude/formulario-cortex/rm-web-background-audio-fix`
- Reason: Publicar la paridad funcional con iOS y corregir el audio web que se pausaba o no podía reanudarse al apagar la pantalla

### Touched
- lib/report-plan.js; src/modules/daily/DailyGoalsModuleCore.jsx; src/modules/daily/daily-goals.css; src/App.jsx; src/beginner-media-session.js; src/daily-precheck.js; scripts/test-report-plan.mjs; scripts/test-beginner-media-session.mjs; scripts/test-daily-precheck.mjs; package.json; ALMA.md

### Details
Los alumnos pueden renombrar, agregar y quitar tareas sin alterar días históricos ni campos protegidos del informe. Advanced omite el precheck sólo cuando el servidor confirma que no hay metas activas. Principiante registra Media Session, bloquea adelantos desde controles del sistema, precarga el stream y reintenta el endpoint protegido desde el último segundo válido después de suspensión, error o regreso desde segundo plano.

### Verification
- npm run build OK; 10 suites npm OK; git diff --check OK

### Risks / Follow-Up
Pendiente commit, push y deployment productivo. El comportamiento real con pantalla apagada debe verificarse además en un Android físico; el fallback limita la recuperación automática a tres intentos por ventana de 30 segundos.

## 2026-08-11 10:24:45 -03 - Desplegué Metas editables y audio web resistente al segundo plano

- Kind: `deploy`
- Project root: `/Users/forax/Documents/Claude/formulario-cortex/rm-web-background-audio-fix`
- Reason: Publicar el lote aprobado en RM web sin perder las correcciones productivas recientes

### Touched
- GitHub main 8784882c99ca452c5234acc529f5f3ebced50a14; Vercel dpl_7uCDdzGdqCdj2p8AUk4ZfyLDKNYB; https://rm.academiacortex.com.ar; ALMA.md

### Details
El deployment fue generado desde GitHub main y conserva como ancestros el acceso directo de Borja, la fusión segura de historial y la acción manual de Advanced. No se migraron ni modificaron datos de alumnos durante el despliegue.

### Verification
- Vercel READY/PROMOTED y aliasAssigned; dominio HTTP 200; bundle /assets/index-iqKcjdka.js contiene Agregar tarea, Pasar a Advanced, mediaSession, setPositionState y recuperación desde segundo plano

### Risks / Follow-Up
Rollback funcional promoviendo dpl_FrxjVFwRqrAHRYofcYuuABLKgMXc o revirtiendo 8784882. Falta validación física del audio con pantalla apagada en Android; los tests cubren handlers, bloqueo de seek y fallback, pero no la política energética del dispositivo.

## 2026-08-11 10:33:34 -03 - Creé una propuesta navegable de RM web basada en la UX de iOS

- Kind: `create`
- Project root: `/Users/forax/Documents/Claude/formulario-cortex/rm-web-ios-ux-preview`
- Reason: Mostrar cómo quedaría la web app con la navegación, jerarquía y sesión Advanced de iOS antes de decidir su integración productiva

### Touched
- src/ios-ux-preview/IosUxWebPreview.jsx; src/ios-ux-preview/ios-ux-preview.css; src/main.jsx; public/preview-advanced-orb.png; public/preview-tutorial.png; ALMA.md

### Details
La ruta aislada /ux-ios-preview usa datos ficticios y no llama APIs ni modifica alumnos. En escritorio usa navegación lateral y en móvil la barra inferior de cuatro tabs. Reutiliza el arte Advanced y la miniatura de tutorial aprobados en iOS.

### Verification
- npm run build OK; git diff --check OK; QA en navegador a 390x844 y escritorio; Inicio, Práctica, Metas, Advanced, Progreso y Ayuda navegables; scrollWidth sin desborde horizontal

### Risks / Follow-Up
Propuesta sólo local en la rama preview/ios-ux-web; no se subió ni desplegó. Antes de llevarla a producción hay que conectar los componentes a los datos reales y revisar el impacto sobre el monolito App.jsx.
