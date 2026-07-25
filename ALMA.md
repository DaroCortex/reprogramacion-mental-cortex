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
