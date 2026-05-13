# ⭐ Funcionalidad de Preguntas Bonus

Este documento describe la nueva funcionalidad de **preguntas bonus** en la quiniela del Mundial 2026.

---

## 🎯 Objetivo

Agregar preguntas especiales de predicción (ejemplo: _"¿Qué equipo ganará el Mundial?"_) que otorguen puntos extra a los participantes.

Cada pregunta bonus puede dar **2 puntos** (o el valor configurado en la pregunta).

---

## 👨‍💼 Gestión por administrador

La gestión se realiza desde la pestaña **⭐ Bonus** en el panel de **Admin**.

El administrador puede:

1. Crear una pregunta bonus.
2. Definir una **fecha límite** para responder (`fecha_limite`).
3. Editar la fecha límite de una pregunta existente.
4. Definir o actualizar la **respuesta correcta** cuando corresponda.
5. Eliminar preguntas bonus.

> Si la fecha límite se deja vacía, la pregunta se considera **sin límite de tiempo**.

---

## 👥 Vista para usuarios

En la pantalla principal de predicciones se agregó una navegación por pestañas:

- **🏟️ Partidos**
- **⭐ Bonus**

Las preguntas bonus se visualizan y responden dentro de la pestaña **⭐ Bonus**, separadas de los partidos.

---

## ⏱ Reglas de fecha límite

Cada pregunta bonus puede tener una fecha máxima para responder.

Comportamiento:

- Si la pregunta está antes del límite, se muestra: **⏰ Cierra: ...**
- Si la fecha límite ya pasó, la pregunta se marca como: **⏱ Cerrado**
- Cuando está cerrada, ya no se puede **Responder** ni **Editar**

---

## 🧮 Puntaje bonus

- Respuesta correcta: **+2 puntos** (o el valor de `puntos` de la pregunta)
- Respuesta incorrecta: **0 puntos**

El cálculo de estos puntos se suma al puntaje total en la sección **Tabla**.

---

## 🗃 Estructura de datos (Supabase)

Tabla principal:

- `preguntas_bonus`
  - `id`
  - `pregunta`
  - `respuesta_correcta`
  - `puntos`
  - `fecha_limite` (`TIMESTAMPTZ`)
  - `created_at`

Tabla de respuestas de usuario:

- `respuestas_bonus`
  - `id`
  - `user_id`
  - `pregunta_id`
  - `respuesta`
  - `created_at`

---

## ✅ Estado funcional esperado

Con esta funcionalidad:

1. El admin crea preguntas bonus y controla el cierre por fecha.
2. El usuario responde desde una pestaña dedicada.
3. El sistema bloquea respuestas fuera de tiempo.
4. La tabla de posiciones incluye los puntos bonus.
