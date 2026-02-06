# Reprogramación Mental / Cortex

Web app de respiración guiada con apnea personalizada por estudiante. Funciona con links únicos y guarda el progreso localmente en el dispositivo.

## Links únicos por estudiante
Usa el formato:

```
https://tu-dominio.vercel.app/s/slug-del-estudiante
```

También funciona con:

```
https://tu-dominio.vercel.app/?s=slug-del-estudiante
```

## Panel de administrador (modo simple)
Abre `/admin` en tu dominio. Desde ahí puedes:
- Crear estudiantes
- Subir audios
- Obtener links listos con token

Necesitas definir `ADMIN_PASSWORD` en Vercel para proteger el panel.

```json
{
  "students": [
    {
      "name": "Ana Garcia",
      "audioKey": "audios/ana.mp3"
    }
  ]
}
```

Si prefieres cargar estudiantes por script, puedes usar:

```
npm run students:generate
```

## Audio seguro con Cloudflare R2 (URLs firmadas)
La app genera URLs firmadas en el servidor para que el link real del audio no se exponga.
Configura estas variables en Vercel:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `ADMIN_PASSWORD`
- `R2_STUDENTS_KEY` (opcional, default `students.json`)

Luego sube los audios a ese bucket y usa la ruta interna en `audioKey`.

## Links con token (acceso privado)
Los links incluyen un token privado:

```
https://tu-dominio.vercel.app/s/ana-garcia?t=TOKEN
```

Sin token válido, el audio no se entrega.

## Scripts

```
npm install
npm run dev
npm run build
```

## Deploy en Vercel (mínimo esfuerzo)
1. Sube este repo a GitHub.
2. Entra a Vercel y conecta el repo.
3. Build command: `npm run build`
4. Output: `dist`
5. Agrega las variables de entorno de Cloudflare R2.

Vercel se encarga del resto.
