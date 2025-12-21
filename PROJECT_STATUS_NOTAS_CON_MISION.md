# Notas con Misión — Estado del Proyecto

Fecha: 2025-12-19  
Rama: master  
Estado: ✅ Compila / ✅ Funciona en local

---

## ✅ Último logro (commit reciente)
Se estabilizó el **SermonEditor** y se corrigieron problemas que causaban:
- errores de TypeScript (tipos inconsistentes)
- pérdida/mezcla de datos al guardar
- problemas con render/copia de versículos
- persistencia correcta de **términos definidos (diccionario)** al guardar y re-abrir sermones

Resultado: **los términos guardados se ven abajo del botón “Diccionario” y también se mantienen dentro del modal del diccionario al volver a entrar.**

---

## ✅ Funciones confirmadas funcionando
### Biblia / Versículos
- Agregar versículos funciona
- Copiar versículos funciona
- Los textos de versículos se guardan y permanecen al volver a abrir el sermón

### Diccionario
- Buscar palabra y mostrar definición ✅
- Guardar palabra ✅
- Eliminar palabra desde el modal ✅
- Persistencia al guardar sermón y reabrir ✅
- Mostrar “Términos definidos” abajo del botón ✅

---

## 🧩 Cambios técnicos clave
- Se definió `dictionary` dentro del tipo `Sermon` como:
  - `dictionary?: SavedWord[]`
- Se guardan las palabras con `dictionary: savedWords` dentro de `toSave`
- Se inicializa `savedWords` como array y se sincroniza por `editedSermon.id`

---

## ⚠️ Notas / Advertencias
### Build
`npm run build` muestra warning de chunks > 500kb.  
No rompe la app, solo es aviso.

### Git (LF/CRLF)
Salieron warnings tipo:
- “LF will be replaced by CRLF”

(esto es normal en Windows; no es error, pero conviene arreglarlo con .gitattributes más adelante)

---

## ✅ Próximo paso recomendado
1) Crear `.gitattributes` para evitar warnings LF/CRLF  
2) Revisar y limpiar código duplicado en `SermonEditor.tsx` (sin romper diccionario)  
3) Opcional: separar el código del diccionario a un componente/servicio (para mantener SermonEditor más limpio)

---
# 📘 Notas con Misión — Estado del Proyecto

## 🧭 Estado general
- App funcional
- Diccionario integrado y estable
- Guardado de sermones correcto
- Build de producción exitoso

---

## ✅ Funcionalidades confirmadas

### 📖 Versículos
- Búsqueda por referencia (ej. Mateo 6:31)
- Soporte para múltiples versiones bíblicas
- Copiar versículo con referencia
- Mantener lista abierta (opcional)

### 📝 Notas
- Editor de texto libre
- Conteo de palabras
- Limpieza de notas

### 📚 Diccionario (ESTABLE)
- Búsqueda de palabras
- Soporte multilenguaje
- Integración con:
  - DictionaryAPI
  - Wiktionary
  - Gemini (fallback)
- Guardar palabras por sermón
- Eliminar palabras guardadas
- Persistencia correcta al guardar sermón

---

## 🏗️ Build

- `npm run build` ejecutado correctamente
- Warning por chunks > 500kb (NO crítico)
- App no se rompe en producción

---

## 🧬 Git / Control de versiones

- Commits limpios
- `git stash` usado correctamente
- Sin conflictos activos
- Advertencias LF/CRLF normales en Windows

---

## 🔜 Próximos pasos (prioridad)

1. ✨ Markdown enriquecido en notas (bold, italic, listas)
2. 🧹 Limpieza interna de `SermonEditor.tsx` (sin tocar lógica)
3. 📦 Separar lógica del diccionario (opcional, futuro)
4. 🧾 Documentar estructura del proyecto

---

## 🛑 Regla de oro
> **No tocar lo que ya funciona.**


Perfecto amigo 👍
Aquí tienes un resumen claro, ordenado y listo para que mañana podamos retomar sin confusión en un chat nuevo.

📘 Notas con Misión — Resumen de Avance (Hoy)
🧭 Contexto general

Hoy se trabajó exclusivamente en el editor de notas dentro de SermonEditor.tsx, con el objetivo de mejorar la experiencia de escritura sin romper la app, evitando librerías incompatibles como ReactQuill.

Decisión clave:
👉 Mantener un editor Markdown simple, estable y bajo control propio.

✅ Logros principales
✍️ Editor de notas

Se mantuvo el <textarea> como base (decisión consciente por estabilidad).

Se descartó definitivamente el sistema de preview, por no aportar valor real al flujo.

El editor ahora funciona solo en modo edición, sin vistas duplicadas.

🧰 Barra de herramientas Markdown (custom)

Se implementó una barra superior sencilla, con botones que inyectan sintaxis Markdown directamente en el texto, respetando selección y cursor.

Botones actuales:

* → Negrita (**texto**)

/ → Inserta barra inclinada / (acción personalizada, no itálica)

# → Título (# texto)

- → Lista (- texto)

" → Cita (> texto)

🖍 (highlight) → Resaltado (==texto==)

📌 Todo esto se hace sin librerías externas y sin romper traducciones ni estado.

⚙️ Lógica técnica implementada

Función central applyFormat(type) ampliada con nuevos tipos (slash, highlight, etc.).

Uso correcto de:

selectionStart / selectionEnd

Reposicionamiento del cursor con requestAnimationFrame

Soporte para:

Texto seleccionado

Cursor sin selección

Líneas completas (en prefijos como #, -, >)

🌍 Internacionalización

Se respetó el sistema existente de traducciones t("key").

No se rompieron keys ni flujo de idiomas (ES / EN / PT).

🧹 Limpieza y estabilidad

Se eliminó código muerto relacionado con preview.

Se corrigió un warning en package.json:

Se quitó la tilde del campo "name" (requerimiento de npm).

La app sigue compilando y funcionando (aunque Vite muestre warnings de hot reload).

🧠 Decisiones importantes tomadas hoy

❌ No usar ReactQuill (incompatibilidad con React 18/19).

❌ No forzar WYSIWYG falso.

✅ Priorizar estabilidad + control sobre apariencia.

✅ Aceptar un editor simple pero profesional y confiable.

🔜 Próximos pasos sugeridos (NO hechos aún)

Atajos de teclado (Ctrl+B, Ctrl+/, etc.)

Mejorar solo el look visual de la barra (Tailwind).

Exportar notas (texto limpio / PDF).

Documentar el editor en PROJECT_STATUS_NOTAS_CON_MISION.md.

🟢 Estado actual

✔ Código estable
✔ Funcionalidad completa
✔ Listo para commit
✔ Buen punto para pausar y retomar mañana

---

## 🧾 Convenciones oficiales del proyecto (IMPORTANTE)

### ✅ REGLA 1 — Fechas (sin desfase por zona horaria)
**Objetivo:** evitar que la fecha cambie sola por la noche (Louisiana) y que “Nuevo sermón”, “Mis sermones”, exportación y PDF siempre coincidan.

**Regla de oro:**
- ✅ Todas las fechas de UI se manejan como **string local** `YYYY-MM-DD`
- ❌ Nunca usar UTC para fechas visibles

**Fuente única de verdad (services/dateUtils.ts):**
- `getLocalYMD()` → devuelve “hoy” en formato `YYYY-MM-DD` local
- `normalizeToLocalYMD(x)` → normaliza (ISO/Date/string) a `YYYY-MM-DD` local
- `formatYMDForUI(ymd, locale)` → solo para mostrar bonito sin desfase

**Permitido ✅**
- `date: getLocalYMD()`
- `date: normalizeToLocalYMD(savedDate)`
- `formatYMDForUI(note.date, "es-US")`

**Prohibido 🚫 (causa el bug del desfase)**
- `new Date().toISOString()`
- `toISOString().slice(0, 10)`
- `new Date("YYYY-MM-DD")` para mostrar (puede interpretarse mal)

**Inputs `<input type="date">`**
- `value` debe ser siempre `YYYY-MM-DD`
- `onChange` debe guardar `e.target.value`

Ejemplo correcto:
```tsx
<input
  type="date"
  value={normalizeToLocalYMD(item.date)}
  onChange={(e) => setItem(prev => ({ ...prev, date: e.target.value }))}
 />
### ✅ REGLA 3 — Traducciones (t como FUNCIÓN, no objeto)

**Objetivo:** evitar textos sin traducir y no buscar palabra por palabra después.

**Regla oficial:**
- ✅ `t` es una FUNCIÓN → `t("clave")`
- ❌ No usar `t.clave`

**Implementación estándar en componentes:**
```ts
const t = (key: string) => getTranslation(language, key);


