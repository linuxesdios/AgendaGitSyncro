# 🗄️ Configuración de Supabase para Agenda

Esta guía te explicará paso a paso cómo configurar Supabase como base de datos para tu aplicación de Agenda.

## 📋 Índice

1. [Crear cuenta en Supabase](#1-crear-cuenta-en-supabase)
2. [Crear un nuevo proyecto](#2-crear-un-nuevo-proyecto)
3. [Obtener credenciales](#3-obtener-credenciales-api)
4. [Crear la tabla en la base de datos](#4-crear-la-tabla-en-la-base-de-datos)
5. [Configurar en la aplicación](#5-configurar-en-la-aplicación)
6. [Verificar conexión](#6-verificar-conexión)

---

## 1. Crear cuenta en Supabase

1. **Visita el sitio web:**
   - Ve a https://supabase.com/
   - Haz clic en **"Start your project"** o **"Sign Up"**

2. **Regístrate:**
   - Puedes registrarte con:
     - ✅ GitHub (Recomendado - más rápido)
     - ✅ Email y contraseña
   - Sigue las instrucciones para confirmar tu email si usas email/contraseña

3. **Confirma tu cuenta:**
   - Revisa tu email y confirma la cuenta si es necesario

---

## 2. Crear un nuevo proyecto

1. **Dashboard de Supabase:**
   - Una vez dentro, verás tu dashboard
   - Haz clic en **"New Project"** o **"+ Nuevo Proyecto"**

2. **Configurar el proyecto:**
   - **Name (Nombre):** Elige un nombre para tu proyecto (ej: `MiAgenda` o `AgendaPersonal`)
   - **Database Password (Contraseña de BD):** 
     - Supabase generará una contraseña automática
     - ⚠️ **IMPORTANTE:** Guarda esta contraseña en un lugar seguro
     - Puedes cambiarla o dejar la generada automáticamente
   - **Region (Región):** Selecciona la región más cercana a ti
     - Para España: `Europe (Frankfurt)` o `Europe (London)`
     - Para Latinoamérica: `South America (São Paulo)` o `US East (N. Virginia)`
   - **Pricing Plan:** Selecciona **"Free"** (es suficiente para uso personal)

3. **Crear proyecto:**
   - Haz clic en **"Create new project"**
   - ⏳ Espera 1-2 minutos mientras Supabase configura tu proyecto

---

## 3. Obtener credenciales (API)

Una vez que tu proyecto esté listo, necesitas obtener dos cosas importantes:

### 3.1 URL del Proyecto (Project URL)

1. En el menú lateral izquierdo, haz clic en **"Settings"** (⚙️ Configuración)
2. Haz clic en **"API"**
3. Busca la sección **"Project URL"**
4. Copia la URL que verás (algo como: `https://abcdefgh.supabase.co`)

### 3.2 Anon Public Key (Clave pública)

1. En la misma página de **Settings > API**
2. Busca la sección **"Project API keys"**
3. Encontrarás dos claves:
   - **`anon` `public`** ← **Esta es la que necesitas**
   - **`service_role` `secret`** ← No uses esta (es para el servidor)

4. **Copia la clave `anon public`**
   - Tiene un formato similar a: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Es una cadena muy larga (varios cientos de caracteres)

> **📝 Nota:** La clave `anon public` es segura para usar en el navegador. No compartas la clave `service_role`.

---

## 4. Crear la tabla en la base de datos

Ahora necesitas crear la estructura de la base de datos donde se guardará toda la información de tu agenda.

### 4.1 Abrir el SQL Editor

1. En el menú lateral izquierdo, haz clic en **"SQL Editor"** (ícono de </>)
2. Haz clic en **"+ New query"** o **"Nueva consulta"**

### 4.2 Ejecutar el Script SQL

Copia y pega exactamente este código SQL en el editor:

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- 📊 SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS - AGENDA PERSONAL
-- ═══════════════════════════════════════════════════════════════════════════
-- Este script crea la estructura de base de datos completa para tu agenda
-- e incluye datos de ejemplo para que veas cómo funciona el sistema.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- PASO 1: Crear la tabla principal
-- ─────────────────────────────────────────────────────────────────────────
-- Esta tabla usará JSONB (JSON binario) para máxima flexibilidad.
-- Todos los datos se guardan en formato JSON dentro de la columna 'data'.

CREATE TABLE agenda_data (
  id text PRIMARY KEY,              -- Identificador único (ej: 'tareas', 'citas', 'personas')
  data jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Datos en formato JSON (flexible)
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL  -- Fecha de última actualización
);

-- ─────────────────────────────────────────────────────────────────────────
-- PASO 2: Optimización de rendimiento
-- ─────────────────────────────────────────────────────────────────────────
-- Creamos un índice para que las búsquedas por fecha sean más rápidas

CREATE INDEX idx_agenda_data_last_updated ON agenda_data(last_updated);

-- ─────────────────────────────────────────────────────────────────────────
-- PASO 3: Configurar seguridad (RLS - Row Level Security)
-- ─────────────────────────────────────────────────────────────────────────
-- Esto permite controlar quién puede leer/escribir datos

ALTER TABLE agenda_data ENABLE ROW LEVEL SECURITY;

-- Política de acceso: Permite lectura y escritura anónima
-- ⚠️ IMPORTANTE: Para uso personal está bien. En producción considera usar autenticación.
CREATE POLICY "Permitir acceso completo anónimo" 
ON agenda_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 4: INSERTAR DATOS DE EJEMPLO
-- ═══════════════════════════════════════════════════════════════════════════
-- Estos datos te ayudarán a entender cómo funciona la agenda.
-- Puedes modificarlos o eliminarlos después desde la aplicación.
-- ═══════════════════════════════════════════════════════════════════════════

-- Crear la tabla principal para almacenar todos los datos de la agenda
CREATE TABLE agenda_data (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Crear índice para búsquedas más rápidas
CREATE INDEX idx_agenda_data_last_updated ON agenda_data(last_updated);

-- Habilitar Row Level Security (seguridad a nivel de fila)
ALTER TABLE agenda_data ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura y escritura anónima
-- IMPORTANTE: Esto permite acceso completo. Para producción, considera usar autenticación.
CREATE POLICY "Permitir acceso completo anónimo" 
ON agenda_data 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insertar datos iniciales
INSERT INTO agenda_data (id, data) VALUES
  ('tareas', '{"tareas_criticas": [], "tareas": [], "listasPersonalizadas": []}'::jsonb),
  ('citas', '{"citas": []}'::jsonb),
  ('config', '{"visual": {}, "funcionales": {}, "opciones": {}}'::jsonb),
  ('notas', '{"notas": ""}'::jsonb),
  ('sentimientos', '{"sentimientos": ""}'::jsonb),
  ('contrasenas', '{"lista": []}'::jsonb),
  ('historial_eliminados', '{"items": []}'::jsonb),
  ('historial_tareas', '{"items": []}'::jsonb),
  ('personas', '{"lista": []}'::jsonb),
  ('etiquetas', '{"tareas": [{"nombre": "trabajo", "simbolo": "💼", "color": "#3498db"}, {"nombre": "ocio", "simbolo": "🎮", "color": "#9b59b6"}, {"nombre": "médicos", "simbolo": "🏥", "color": "#e74c3c"}], "citas": [{"nombre": "trabajo", "simbolo": "💼", "color": "#3498db"}, {"nombre": "ocio", "simbolo": "🎮", "color": "#9b59b6"}, {"nombre": "médicos", "simbolo": "🏥", "color": "#e74c3c"}]}'::jsonb),
  ('log', '{"acciones": []}'::jsonb),
  ('salvados', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ✅ ¡COMPLETADO!
-- ═══════════════════════════════════════════════════════════════════════════
-- Tu base de datos está lista con:
--   ✓ 3 tareas críticas de ejemplo
--   ✓ 2 listas personalizadas (Compras y Proyectos)
--   ✓ 2 citas de ejemplo
--   ✓ 3 contactos de ejemplo
--   ✓ 3 etiquetas predefinidas
--   ✓ Mensaje de bienvenida en notas
--
-- Ahora puedes conectar tu aplicación y empezar a usar la agenda.
-- Los datos de ejemplo te ayudarán a entender cómo funciona todo.
-- ═══════════════════════════════════════════════════════════════════════════
```

### 4.3 Ejecutar el Script

1. Haz clic en el botón **"Run"** (Ejecutar) o presiona `Ctrl + Enter`
2. Deberías ver un mensaje de éxito: **"Success. No rows returned"**
3. Si ves algún error, verifica que copiaste todo el código correctamente

### 4.4 Verificar que la tabla se creó

1. En el menú lateral izquierdo, haz clic en **"Table Editor"** (Editor de tablas)
2. Deberías ver la tabla **`agenda_data`**
3. Haz clic en ella para ver los registros iniciales que se insertaron

---

## 5. Configurar en la aplicación

Ahora que tienes Supabase configurado, vamos a conectar la aplicación:

1. **Abre la aplicación** (agenda.html o agendaphone.html)

2. **Abre el modal de configuración:**
   - Haz clic en el botón de **configuración** (⚙️) en la parte superior

3. **Ve a la pestaña "Sincronización"**

4. **Completa los campos de Supabase:**
   - **URL del Proyecto:** Pega la URL que copiaste en el paso 3.1
     - Ejemplo: `https://abcdefgh.supabase.co`
   - **Anon Key:** Pega la clave `anon public` que copiaste en el paso 3.2
     - Es el texto muy largo que empieza con `eyJhbGci...`
   - **Service Key (Opcional):** Déjalo vacío (no es necesario para uso normal)

5. **Guardar configuración:**
   - Haz clic en **"Guardar Configuración"**
   - Deberías ver un mensaje: ✅ "Configuración guardada correctamente"

---

## 6. Verificar conexión

Es importante verificar que todo funciona correctamente:

1. **Probar conexión:**
   - En la pestaña "Sincronización" del modal de configuración
   - Haz clic en el botón **"🔌 Probar Conexión"**
   - Deberías ver uno de estos mensajes:
     - ✅ "Conexión exitosa - Las tablas ya existen y funcionan"
     - 🆕 "Primera vez detectada - Las tablas no existen todavía"

2. **Si sale "Primera vez detectada":**
   - Haz clic en **"🛠️ Crear Tablas"**
   - O simplemente haz clic "Sí" en el diálogo que aparece
   - ⚠️ **Nota:** Si ya creaste las tablas manualmente en el paso 4, ignora este paso

3. **Sincronizar datos:**
   - Haz clic en **"📤 Guardar en la Nube"** para subir tus datos locales
   - Haz clic en **"📥 Obtener de la Nube"** para descargar datos

4. **Verificar en Supabase:**
   - Vuelve al dashboard de Supabase
   - Ve a **"Table Editor"** > **"agenda_data"**
   - Deberías ver tus datos guardados en la columna `data`

---

## ✅ ¡Listo!

Tu aplicación de Agenda ahora está conectada a Supabase. Los cambios se sincronizarán automáticamente en tiempo real.

### 🔄 Funcionamiento automático

- **Guardado automático:** La aplicación guarda automáticamente cada vez que haces cambios
- **Sincronización en tiempo real:** Si usas la app en varios dispositivos, se actualiza automáticamente
- **Sin límites:** Supabase en el plan gratuito es suficiente para uso personal

---

## 🔒 Seguridad

> **⚠️ Nota de seguridad:** La configuración actual permite acceso anónimo a los datos. Esto es adecuado para uso personal, pero **no compartas tu URL y API Key públicamente**.

### Si quieres más seguridad:

1. **Habilitar autenticación de usuarios:**
   - Supabase soporta autenticación con email, Google, GitHub, etc.
   - Modificar las políticas RLS para requerir autenticación

2. **Usar autenticación (avanzado):**
   - Requerirá modificaciones al código de la aplicación
   - Consulta la documentación de Supabase: https://supabase.com/docs/guides/auth

---

## 🆘 Solución de Problemas

### Error: "No se pudo inicializar Supabase"
- ✅ Verifica que la URL del proyecto sea correcta
- ✅ Verifica que la Anon Key esté completa (es muy larga)
- ✅ Asegúrate de no tener espacios extras al copiar/pegar

### Error: "Las tablas no existen"
- ✅ Ejecuta el script SQL del paso 4 nuevamente
- ✅ Verifica en "Table Editor" que existe la tabla `agenda_data`

### "Error de permisos" o "permission denied"
- ✅ Asegúrate de haber ejecutado las políticas RLS del script SQL
- ✅ Verifica que la política "Permitir acceso completo anónimo" esté creada

### Los datos no se sincronizan
- ✅ Verifica la conexión a internet
- ✅ Abre la consola del navegador (F12) y busca errores
- ✅ Prueba hacer "Pull" y "Push" manualmente desde configuración

---

## 📚 Recursos adicionales

- **Documentación de Supabase:** https://supabase.com/docs
- **Dashboard de tu proyecto:** https://app.supabase.com/
- **Comunidad de Supabase:** https://github.com/supabase/supabase/discussions

---

## 🎯 Resumen rápido

1. Crear cuenta en https://supabase.com/
2. Crear nuevo proyecto
3. Obtener **Project URL** y **Anon Key** desde Settings > API
4. Ejecutar el **script SQL** en SQL Editor
5. Configurar URL y Key en la aplicación (⚙️ Configuración > Sincronización)
6. Probar conexión y ¡listo!

---

¿Tienes problemas? Abre un issue en GitHub o revisa la sección de solución de problemas.
