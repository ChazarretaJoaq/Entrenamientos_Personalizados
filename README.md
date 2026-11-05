# ⚽ Entrenamientos de Fútbol

App web para planificar y registrar entrenamientos: calendario (martes y jueves, 1:30 h), biblioteca de ejercicios, asistencia, esfuerzo (RPE) y valoración por jugador, y estadísticas individuales y del grupo.

- **Frontend:** `index.html` + `config.js`, publicado gratis en GitHub Pages.
- **Base de datos:** una Google Sheet con un script de Apps Script (`Code.gs`) que funciona como API.
- **Acceso:** cualquiera con el link ve la app sin cuenta. Para cargar o editar hace falta el **PIN de entrenador**.

---

## 1. Conectar la Google Sheet (≈5 min)

La planilla **"Entrenamientos Fútbol - Base de datos"** ya está creada en tu Drive.

1. Abrila y andá a **Extensiones → Apps Script**.
2. Borrá lo que haya en `Código.gs` y pegá el contenido de `Code.gs`.
3. En la línea `const PIN = "1234";` poné tu PIN de entrenador. Guardá (💾).
4. En la barra de arriba elegí la función **`setup`** y tocá **Ejecutar**.
   - Google pide permisos: **Revisar permisos → tu cuenta → Configuración avanzada → Ir a … (no seguro) → Permitir**. Aparece así porque el script es tuyo y no está "verificado"; es normal.
   - Al terminar, la planilla tiene las pestañas *Config, Jugadores, Ejercicios, Sesiones, Plan y Registros*.
5. **Implementar → Nueva implementación** → engranaje ⚙️ → **Aplicación web**:
   - *Ejecutar como:* **Yo**
   - *Quién tiene acceso:* **Cualquier usuario**
   - **Implementar** y copiá la **URL de la aplicación web** (termina en `/exec`).

> Si después cambiás el script: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. Así la URL no cambia.

## 2. Publicar en GitHub Pages (≈3 min)

1. En GitHub: **New repository** → nombre, por ejemplo `entrenamientos-futbol` → **Public** → Create.
2. Abrí `config.js` y pegá la URL del paso 1.5:
   ```js
   window.API_URL = "https://script.google.com/macros/s/XXXX/exec";
   ```
3. En el repo: **Add file → Upload files** → arrastrá `index.html`, `config.js`, `README.md` y `Code.gs` → **Commit changes**.
4. **Settings → Pages** → *Source:* **Deploy from a branch** → *Branch:* `main` / `(root)` → **Save**.
5. Al minuto queda en `https://TU-USUARIO.github.io/entrenamientos-futbol/`. Ese es el link para compartir.

## 3. Uso

- Al abrir el link por primera vez, tocá 🔒 e ingresá el PIN. La app carga sola la biblioteca de 15 ejercicios en la planilla.
- **Jugadores → +** para cargar el plantel.
- **Calendario → "Planificar N entrenamientos"** arma todos los martes y jueves del mes con un plan de 90′ (martes: técnica y físico; jueves: táctica y definición). Después podés editar cada uno.
- Después de cada práctica: abrí la sesión → **Registrar entrenamiento** → presente/ausente, RPE (1-10), estrellas y nota.
- ⚙️ cambia los días, la duración y la hora.
- El PIN queda recordado en ese dispositivo; con 🔓 salís.

La planilla también se puede editar a mano (por ejemplo, agregar ejercicios en la pestaña *Ejercicios* dejando el `id` vacío). Los cambios aparecen al recargar la app.

## Notas

- Los datos (nombres, asistencia, notas) los puede **leer** cualquiera que tenga el link de la app. No cargues información sensible.
- Si dos entrenadores guardan a la vez, gana el primero y al otro se le recarga la última versión con un aviso.
- Sin `API_URL` configurada, la app funciona en **modo demo** y guarda solo en el navegador.
