# StudyFlow

Aplicación estática para estudio con:

- Serie completa **50/10 × 3**
- Cada bloque de 50 dividido en:
  - 0–5: recall anterior
  - 5–30: estudio nuevo
  - 30–40: active recall
  - 40–47: corrección
  - 47–50: errores/dificultades
- Historial local de sesiones
- Highlights, preguntas y dificultades por tema
- Repaso espaciado D+1, D+3, D+7, D+14 y D+30
- Autoevaluación: Difícil / Bien / Fácil
- Plan semanal editable
- Exportar/importar backup JSON
- Sin backend, sin base de datos y sin dependencias externas

## Cómo usarlo localmente

Abrí `index.html` con doble clic.

Los datos se guardan en `localStorage` del navegador.

## Publicarlo con GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir estos archivos a la raíz:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
3. En GitHub:
   - `Settings`
   - `Pages`
   - En `Build and deployment`, elegir `Deploy from a branch`
   - Branch: `main`
   - Folder: `/ (root)`
   - Guardar.
4. GitHub te mostrará la URL pública.

No hace falta AWS, Cloud Run, Firebase ni ningún servidor.

## Importante sobre los datos

GitHub Pages solo hospeda los archivos estáticos.

Tus sesiones, repasos y plan viven en `localStorage`, es decir:
- quedan guardados en ese navegador,
- no se sincronizan entre dispositivos,
- si limpiás datos del navegador, podés perderlos.

Por eso existe `Datos > Exportar JSON`.

Si más adelante querés sincronización entre PC/celular, ahí sí conviene agregar una base de datos (por ejemplo Firebase o Supabase), pero no es necesaria para esta versión.
