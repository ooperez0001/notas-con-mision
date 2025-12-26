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

Perfecto amigo 👍 esta captura cierra todo. Ahora sí podemos decir con certeza cómo está tu sistema y dejar la constitución final, sin tocar código todavía, como prometimos.

Voy lento, claro y en orden.

1️⃣ Lo que tu app YA tiene (confirmado por tu código)

Según bibleService.ts:

✅ Versiones por idioma (OFICIALES)

Español (default):

RVR60

NTV

NVI

DHH

LBLA

Inglés (en):

NIV

KJV

Portugués (pt):

ARC

Esto ya está correctamente definido aquí 👇

export const getVersionsByLanguage = (lang: string) => {
  switch (lang) {
    case 'en': return ['NIV', 'KJV'];
    case 'pt': return ['ARC'];
    default: return ['RVR60', 'NTV', 'NVI', 'DHH', 'LBLA'];
  }
};


📌 Importante:
👉 Esta función YA ES la fuente de verdad para idiomas ↔ versiones.

2️⃣ La “Constitución final” de versiones (ya cerrada)

Te la dejo escrita como reglas fijas. Esto no es código, es diseño lógico.

📜 Constitución de Versiones Bíblicas – Notas con Misión

La app soporta versiones bíblicas por idioma, definidas en un solo lugar (getVersionsByLanguage).

Existe una sola versión preferida global:

nombre: preferredVersion

se usa en:

Biblia Inteligente

Nuevo Sermón

Versículo del día

PDF / exportaciones futuras

Al cambiar el idioma:

solo se muestran las versiones de ese idioma

si preferredVersion no existe en ese idioma:

se usa fallback → availableVersions[0]

Al guardar un pasaje en un sermón, SIEMPRE se guarda:

referencia

texto

versión usada

Los sermones ya guardados NO cambian si el usuario cambia luego la versión preferida.

Nunca debe haber lógica de versiones “local” por pantalla.

Biblia y Sermón deben obedecer la misma regla global.

✅ Con esto tu app es coherente, escalable y sin bugs fantasmas.

3️⃣ El único punto débil actual (muy claro ahora)

⚠️ SermonEditor.tsx

Ahí tienes dos cosas mezcladas:

Por un lado:

const VERSIONS_BY_LANG: Record<string, string[]> = { ... }


Por otro lado:

Object.keys(referenceData.versions)


📌 Esto significa:

SermonEditor NO depende 100% de getVersionsByLanguage

Depende del resultado que venga de referenceData

👉 Esto no está “mal”, pero rompe la constitución que acabamos de definir.

4️⃣ Qué NO vamos a hacer todavía (tranquilo)

❌ No vamos a:

reescribir SermonEditor

mover lógica

cambiar UI

tocar IA

tocar premium

Todavía NO.

5️⃣ Próximo paso lógico (solo planificación)

El siguiente paso, cuando tú me digas, será:

👉 Unificar SermonEditor con el sistema global de versiones, para que:

use getVersionsByLanguage(language)

respete preferredVersion

y solo valide contra referenceData como disponibilidad, no como fuente principal

Pero eso ya es fase de implementación, no diseño.

6️⃣ Mi veredicto honesto (como arquitecto)

Amigo, esto es importante que lo escuches:

❌ Tu app NO está desordenada

❌ No estás tarde

❌ No tomaste malas decisiones

Al contrario:

✔️ Ya tenías fallback

✔️ Ya tenías idioma ↔ versiones

✔️ Solo faltaba alinear criterios

Eso es nivel producto serio, no principiante.

7️⃣ Te dejo la pregunta (y paramos ahí)

Para seguir igual de seguro:

👉 ¿Quieres que el siguiente paso sea solo PLANEAR cómo unificar SermonEditor con la constitución (sin código todavía), o ya entramos a implementar paso a paso?

Respóndeme eso y seguimos con bisturí, no con machete 💪

--------------------------------------------------------------------------------------------------------------
## 🧹 Limpieza y consistencia de Pasajes Clave (KeyPassages)

### 🎯 Problema
- En **Mis Sermones** aparecían pasajes duplicados o “fantasma”.
- Algunos pasajes eliminados en el editor reaparecían al volver a la lista.
- `keyPassages` se guardaba de forma inconsistente:
  - a veces como `string`
  - a veces como `object`
- El orden de los pasajes no respetaba el orden visual de la caja verde.

---

### ✅ Solución implementada

#### 1️⃣ La caja verde es la autoridad
- Lo que se muestra en la **caja verde** del editor es exactamente lo que:
  - se guarda en el sermón
  - se muestra en **Mis Sermones**
- Al eliminar un pasaje:
  - se elimina de la UI
  - se elimina de `editedSermon.keyPassages`
  - se elimina de `editedSermon.verses`
- No quedan residuos ni referencias fantasma.

#### 2️⃣ Persistencia limpia de `keyPassages`
- `keyPassages` ahora se guarda **solo como objetos**:
  ```ts
  {
    reference: "Mateo 6:33",
    version: "RVR60",
    text: "Mas buscad primeramente..."
  }

