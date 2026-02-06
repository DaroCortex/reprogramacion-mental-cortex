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

## Configuración de estudiantes y audio
Edita `public/students-source.json` y luego genera `public/students.json`.
Los slugs se generan automáticamente desde el nombre (puedes fijar `slug` manualmente si lo deseas).
Cada estudiante lleva `audioKey` y un `token` privado.

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

Luego ejecuta:

```
npm run students:generate
```

Esto genera `public/students.json` con `slug` y `token`.
También genera `public/students-links.csv` con los links completos.

Opcional: define `BASE_URL` para el dominio real:

```
BASE_URL=https://tu-dominio.vercel.app npm run students:generate
```

## Audio seguro con Cloudflare R2 (URLs firmadas)
La app genera URLs firmadas en el servidor para que el link real del audio no se exponga.
Configura estas variables en Vercel:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

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
