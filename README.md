# 🧠 Agenda de Pablo - Sistema de Productividad Personal

Una aplicación web completa y avanzada para gestión personal y productividad, diseñada específicamente para personas con TDAH y cualquiera que busque un sistema robusto de organización.

![Version](https://img.shields.io/badge/version-2.0-brightgreen)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![CSS](https://img.shields.io/badge/CSS-3-blue)
![Firebase](https://img.shields.io/badge/Firebase-Sincronización-orange)
![PWA](https://img.shields.io/badge/PWA-Compatible-purple)
![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)

## ✨ Características Principales

### 🚨 Sistema de Tareas Inteligente
- **Tareas Críticas**: Sistema priorizado con estados avanzados (pendiente → migrada → programada → completada)
- **Tareas Normales**: Método de productividad con seguimiento de estados
- **Listas Personalizadas**: Crea y gestiona listas ilimitadas con emojis y colores
- **Filtros Avanzados**: Filtra por estado, fecha, persona, etiquetas
- **Drag & Drop**: Reorganiza tareas intuitivamente

### 📅 Calendario y Citas Completo
- **Calendario Integrado**: Vista mensual con navegación fluida
- **Filtros Dinámicos**: Ver citas, tareas o ambos en los próximos 30 días
- **Citas Flexibles**: Soporte para citas de un solo día o múltiples días
- **Citas Relativas**: Programa múltiples citas basadas en fechas relativas
- **Notificaciones**: Alertas automáticas 30 minutos antes de cada cita
- **Vista de Dos Modos**: Calendario integrado o botón popup

### 🔐 Gestor de Contraseñas Seguro
- **Encriptación Local**: Todas las contraseñas se cifran con AES antes de guardarse
- **Contraseña Maestra**: Sistema de autenticación seguro
- **Gestión Completa**: Agregar, editar, eliminar contraseñas
- **Usuarios Visibles**: Muestra usuarios pero mantiene contraseñas ocultas
- **Copiado Rápido**: Copia usuarios y contraseñas al portapapeles

### 🍅 Pomodoro TDAH Especializado
- **Diseñado para TDAH**: Intervalos optimizados para mejor concentración
- **Control Completo**: Empezar, pausar, terminar, cancelar
- **Seguimiento Visual**: Barra de progreso y tiempo restante
- **Estados Intuitivos**: Interfaz que cambia según el estado actual

### 📊 Dashboard de Progreso
- **Métricas Personales**: Seguimiento de productividad y logros
- **Visualización Clara**: Gráficos y estadísticas fáciles de entender
- **Historial Completo**: Revisa tu progreso a través del tiempo

### 🌅 Resumen Diario Automático
- **Generación Automática**: Resumen inteligente de tu día
- **Vista Manual**: Accede cuando necesites revisar tu progreso
- **Análisis de Productividad**: Insights sobre tus patrones de trabajo

## 🎨 Características de Interfaz

### 🌓 Temas Personalizables
- **Modo Oscuro/Claro**: Cambia entre temas según tu preferencia
- **Modo Automático**: Cambia automáticamente según la hora del día (configurable)
- **Colores Vibrantes**: Diseño atractivo y funcional

### 📱 Diseño Responsivo
- **Mobile-First**: Optimizado para tablets y móviles
- **Adaptativo**: Se ajusta perfectamente a cualquier tamaño de pantalla
- **PWA Compatible**: Instálala como aplicación nativa

### ⚡ Rendimiento Optimizado
- **Carga Rápida**: Optimizaciones para dispositivos de gama baja
- **Auto-guardado**: Sincronización automática cada 2 segundos
- **Gestión de Memoria**: Limpieza automática para mejor rendimiento

## ⚙️ Configuración Completa

La aplicación incluye un sistema de configuración avanzado dividido en 8 pestañas principales:

### 🔥 Firebase
**Configuración de sincronización en la nube**
- **API Key**: Clave de API de tu proyecto Firebase
- **Auth Domain**: Dominio de autenticación
- **Project ID**: Identificador único del proyecto
- **Storage Bucket**: Bucket de almacenamiento
- **Messaging Sender ID**: ID para notificaciones push
- **App ID**: Identificador de la aplicación

**Funciones:**
- ✅ Conectar Firebase: Establece conexión con Firestore
- 🧪 Probar Conexión: Verifica que la configuración sea correcta
- 🔄 Sincronizar Datos: Fuerza la sincronización manual
- ⚡ Auto-sincronización: Sincronización automática cada 2 segundos

### 🎨 Visual
**Personalización de apariencia e interfaz**

#### Temas
- **Verde** (por defecto): Tema vibrante y energético
- **Azul**: Tema profesional y calmante
- **Rosa**: Tema suave y creativo
- **Oscuro**: Tema para uso nocturno o poca luz

#### Modo Oscuro Automático
- **Activar**: Checkbox para habilitar cambio automático
- **Hora inicio**: Hora de activación (por defecto 20:00)
- **Hora fin**: Hora de desactivación (por defecto 07:00)

#### Configuración de Columnas
- **1 Columna**: Diseño móvil optimizado
- **2 Columnas**: Diseño estándar para escritorio
- **3+ Columnas**: Para pantallas ultra-anchas

#### Personalización Avanzada
- **Título personalizado**: Cambia el título principal de la agenda
- **Frases motivacionales**: Lista personalizable de frases inspiradoras
- **Listas personalizadas**: Crea listas de tareas ilimitadas con emojis

### ⚙️ Funcional
**Configuraciones de comportamiento y funcionalidad**

#### Notificaciones y Alertas
- **📅 Notificaciones de citas**: Alertas 30 minutos antes
- **✅ Popup de celebración**: Animación al completar tareas
- **🌅 Resumen diario automático**: Configurar frecuencia
- **🔔 Sonidos de notificación**: Activar/desactivar efectos de sonido

#### Validaciones y Controles
- **📅 Fecha obligatoria en tareas**: Forzar fecha límite
- **🔐 Validación de contraseñas**: Requisitos mínimos de seguridad
- **📝 Auto-capitalización**: Mejora automática de texto
- **🎯 Validaciones estrictas**: Controles adicionales de datos

#### Configuraciones de Productividad
- **🍅 Duración Pomodoro**: Tiempo personalizable (5-60 minutos)
- **⏱️ Descanso corto**: Tiempo entre sesiones (1-15 minutos)
- **🛌 Descanso largo**: Cada cuántas sesiones (2-8 ciclos)
- **🔄 Auto-inicio**: Iniciar automáticamente siguiente sesión

#### Visibilidad de Secciones
- **📝 Mostrar Brain Dump**: Área de notas rápidas
- **😊 Mostrar Sentimientos**: Seguimiento de estado de ánimo
- **🔐 Mostrar Contraseñas**: Gestor de contraseñas
- **🍅 Mostrar Pomodoro**: Timer de productividad
- **📊 Mostrar Progreso**: Dashboard de métricas
- **🌅 Mostrar Resumen**: Análisis diario
- **➕ Mostrar Tarea Universal**: Botón de creación rápida

### 🏷️ Etiquetas
**Sistema de organización por categorías**

#### Gestión de Etiquetas
- **➕ Crear etiqueta**: Nombre personalizado + emoji + color
- **📝 Editar etiquetas**: Modificar nombre, emoji o color
- **🗑️ Eliminar etiquetas**: Remover etiquetas no utilizadas
- **🎨 Colores disponibles**: Paleta de 12 colores predefinidos

#### Características
- **🔍 Filtrado**: Filtra tareas y citas por etiquetas
- **📊 Estadísticas**: Ve cuántas tareas tiene cada etiqueta
- **🎯 Asignación masiva**: Aplica etiquetas a múltiples elementos
- **📱 Responsive**: Funciona perfectamente en móvil

### 👥 Personas
**Gestión de contactos y colaboradores**

#### Administración de Personas
- **➕ Agregar persona**: Nombre + emoji representativo
- **📝 Editar personas**: Modificar información existente
- **🗑️ Eliminar personas**: Remover contactos no utilizados
- **🔗 Asignar tareas**: Vincular tareas específicas a personas

#### Funcionalidades
- **📋 Vista de tareas**: Ve todas las tareas asignadas a cada persona
- **📊 Análisis colaborativo**: Estadísticas de colaboración
- **🎯 Filtros por persona**: Encuentra rápidamente tareas específicas
- **📱 Sincronización**: Los contactos se sincronizan entre dispositivos

### 💾 Backups
**Sistema de respaldo y recuperación de datos**

#### Creación de Respaldos
- **📥 Backup completo**: Descarga todos los datos en formato JSON
- **⏰ Backup automático**: Programación automática de respaldos
- **🔒 Backup encriptado**: Opción de cifrado para datos sensibles
- **☁️ Backup en la nube**: Respaldo automático en Firebase

#### Restauración
- **📤 Restaurar desde archivo**: Carga respaldo desde archivo local
- **🔄 Restaurar desde nube**: Recupera datos de Firebase
- **⚡ Restauración selectiva**: Elige qué datos restaurar
- **🛡️ Validación de datos**: Verifica integridad antes de restaurar

#### Configuraciones Avanzadas
- **🗓️ Retención**: Tiempo de guardado de respaldos
- **📊 Compresión**: Reduce tamaño de archivos de respaldo
- **🔐 Cifrado automático**: Protege respaldos sensibles
- **📧 Notificaciones**: Alertas de éxito/fallo en respaldos

### 📋 Log
**Sistema de registro y auditoría**

#### Visualización de Logs
- **📊 Log de acciones**: Historial completo de actividades
- **🕐 Timestamps**: Fecha y hora exacta de cada acción
- **👤 Usuario**: Quién realizó cada acción (si aplica)
- **📝 Detalles**: Información específica de cada operación

#### Tipos de Log
- **✅ Tareas**: Creación, edición, completado, eliminación
- **📅 Citas**: Programación, modificación, notificaciones
- **🔐 Seguridad**: Accesos, cambios de contraseña, encriptación
- **🔄 Sincronización**: Firebase, respaldos, errores de conexión
- **⚙️ Configuración**: Cambios en preferencias y ajustes

#### Herramientas de Análisis
- **🔍 Búsqueda**: Encuentra acciones específicas
- **📅 Filtros por fecha**: Ve actividad de períodos específicos
- **📊 Estadísticas**: Análisis de uso y productividad
- **📤 Exportar logs**: Descarga historial para análisis externo

### 📊 Acciones
**Dashboard de productividad y análisis**

#### Métricas de Productividad
- **✅ Tareas completadas**: Contador diario, semanal, mensual
- **🎯 Porcentaje de cumplimiento**: Ratio de tareas completadas vs creadas
- **⏰ Tiempo promedio**: Duración promedio para completar tareas
- **🏆 Racha de productividad**: Días consecutivos cumpliendo metas

#### Análisis Temporal
- **📈 Gráficas de progreso**: Visualización de tendencias
- **📊 Distribución semanal**: Qué días eres más productivo
- **🕐 Análisis horario**: Mejores horas para diferentes tipos de tareas
- **📅 Patrones mensuales**: Identificación de ciclos de productividad

#### Insights Inteligentes
- **🧠 Recomendaciones**: Sugerencias basadas en patrones
- **⚠️ Alertas de procrastinación**: Detecta tareas postergadas
- **🎯 Metas sugeridas**: Objetivos realistas basados en historial
- **📈 Predicciones**: Estimaciones de productividad futura

## 🔥 Funciones Avanzadas

### ☁️ Sincronización en la Nube
- **Firebase Integration**: Sincronización automática en tiempo real
- **Backup Automático**: Tus datos siempre están seguros
- **Multi-dispositivo**: Accede desde cualquier lugar
- **Offline Support**: Funciona completamente sin conexión

### 🏷️ Sistema de Etiquetas Avanzado
- **Organización Flexible**: Etiqueta tareas y citas para mejor organización
- **Colores Personalizados**: Asigna colores a cada etiqueta
- **Filtrado por Etiquetas**: Encuentra rápidamente lo que buscas
- **Estadísticas**: Analiza uso de etiquetas

### 📝 Brain Dump y Notas
- **Captura Rápida**: Anota ideas y pensamientos sin perder el foco
- **Auto-expansión**: El área de texto crece automáticamente
- **Capitalización Automática**: Mejora la legibilidad automáticamente

### 😊 Seguimiento de Estado de Ánimo
- **Registro Diario**: Anota cómo te sientes cada día
- **Análisis de Patrones**: Identifica tendencias en tu bienestar
- **Integración Completa**: Conecta emociones con productividad

## 🚀 Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Firestore, Authentication)
- **Encriptación**: CryptoJS para gestión de contraseñas
- **PWA**: Service Worker, Web App Manifest
- **Responsive**: CSS Grid, Flexbox
- **Performance**: Debouncing, Lazy Loading, Memory Management

## 📦 Instalación y Uso

### Instalación Local
```bash
# Clona el repositorio
git clone https://github.com/tuusuario/agenda-pablo.git

# Navega al directorio
cd agenda-pablo

# Abre agenda.html en tu navegador
open agenda.html
```

### Configuración de Firebase (Opcional)
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Habilita Firestore Database
4. Copia la configuración en la sección de configuración de la app

### Instalación como PWA
1. Abre la aplicación en Chrome/Edge
2. Haz clic en el icono de instalación en la barra de direcciones
3. Confirma la instalación
4. ¡Ya tienes la app instalada como aplicación nativa!

## 🎯 Uso Recomendado

### Para Personas con TDAH
1. **Empieza Simple**: Usa solo tareas críticas al principio
2. **Usa el Pomodoro**: Los intervalos te ayudarán a mantener el foco
3. **Brain Dump**: Anota todo lo que se te ocurra sin filtro
4. **Revisa Diariamente**: Usa el resumen diario para reflexionar
5. **Configura Notificaciones**: Activa recordatorios para mantenerte en track

### Para Productividad General
1. **Organiza por Prioridades**: Usa tareas críticas para lo urgente
2. **Calendario Integrado**: Programa todo en el mismo lugar
3. **Listas Personalizadas**: Organiza por proyectos o áreas
4. **Análisis de Datos**: Revisa tu progreso regularmente
5. **Configura Firebase**: Para sincronización multi-dispositivo

## 🔧 Características Técnicas

### Seguridad
- **Encriptación Local**: Las contraseñas nunca se envían sin cifrar
- **Sin Tracking**: Respetamos completamente tu privacidad
- **Datos Locales**: Todo funciona offline, Firebase es solo sincronización
- **Auditoría Completa**: Sistema de logs para transparencia total

### Performance
- **Optimización TDAH**: Diseñado para minimizar distracciones
- **Carga Rápida**: Menos de 2 segundos en dispositivos móviles
- **Memoria Eficiente**: Limpieza automática cada 5 minutos
- **Auto-guardado Inteligente**: Sincronización cada 2 segundos sin impacto

### Compatibilidad
- **Navegadores**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Dispositivos**: Smartphones, tablets, escritorio
- **Offline**: Funciona completamente sin conexión
- **PWA**: Instalable como app nativa

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Guías de Contribución
- **Código**: Sigue las convenciones existentes
- **Documentación**: Actualiza README si adds nuevas features
- **Testing**: Asegúrate que todo funciona antes del PR
- **Issues**: Reporta bugs con pasos claros para reproducir

## 📝 Roadmap

### Próximas Características
- [ ] **Integración con calendarios externos** (Google Calendar, Outlook)
- [ ] **Modo equipo** para colaboración en tiempo real
- [ ] **Análisis avanzado de productividad** con Machine Learning
- [ ] **Integración con Notion/Obsidian**
- [ ] **App móvil nativa** (React Native)
- [ ] **Widgets de escritorio**
- [ ] **API REST** para integraciones externas

### Mejoras Planificadas
- [ ] **Mejor accesibilidad** (WCAG 2.1 AA compliance)
- [ ] **Más temas visuales** (modo high contrast, daltónicos)
- [ ] **Exportación de datos** (PDF, Excel, CSV)
- [ ] **Importación masiva** desde otras herramientas
- [ ] **Plantillas de tareas** predefinidas
- [ ] **Sistema de gamificación** con logros y puntos

## 🐛 Reportar Bugs

Si encuentras algún problema:
1. Verifica que no esté ya reportado en Issues
2. Incluye pasos para reproducir el bug
3. Adjunta capturas de pantalla si es necesario
4. Especifica tu navegador y sistema operativo
5. Incluye logs de la consola si es posible

## 📄 Licencia

Este proyecto está bajo la **Licencia Creative Commons Attribution-NonCommercial-ShareAlike 4.0 Internacional**.

### ✅ Permitido:
- ✅ **Usar** el software para uso personal
- ✅ **Compartir** el código con otros
- ✅ **Modificar** el código para tus necesidades
- ✅ **Distribuir** modificaciones bajo la misma licencia
- ✅ **Estudiar** cómo funciona el software
- ✅ **Crear obras derivadas** para uso no comercial

### ❌ No Permitido:
- ❌ **Uso comercial** sin autorización explícita
- ❌ **Vender** el software o servicios basados en él
- ❌ **Cambiar la licencia** a una más restrictiva
- ❌ **Eliminar** los créditos del autor original

### 📋 Condiciones:
- **Atribución**: Debes dar crédito apropiado al autor original
- **No Comercial**: No puedes usar el material para fines comerciales
- **Compartir Igual**: Si remezclas o transformas el material, debes distribuir bajo la misma licencia

Para más detalles, ver: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)

## 🙏 Agradecimientos

- **Comunidad TDAH**: Por el feedback invaluable sobre usabilidad
- **Firebase**: Por la excelente plataforma de desarrollo
- **Contributors**: A todos los que han contribuido al proyecto
- **Creative Commons**: Por proporcionar licencias libres y claras
- **Open Source Community**: Por inspirar el desarrollo libre

## 📊 Estadísticas del Proyecto

- **Líneas de código**: ~20,000+
- **Archivos**: 15
- **Funciones**: 300+
- **Tests**: En desarrollo
- **Performance Score**: 95/100
- **Configuraciones**: 50+ opciones personalizables

---

**Hecho con ❤️ para mejorar la productividad personal**

¿Te gusta el proyecto? ⭐ ¡Dale una estrella en GitHub!

## 📞 Contacto

- **Desarrollador**: Pablo
- **Issues**: [GitHub Issues](https://github.com/tuusuario/agenda-pablo/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/tuusuario/agenda-pablo/discussions)

---

*"El éxito es la suma de pequeños esfuerzos repetidos día tras día"*

## 🔐 Política de Privacidad

- **Sin Tracking**: No rastreamos ninguna actividad personal
- **Datos Locales**: Toda la información se almacena localmente
- **Firebase Opcional**: La sincronización en nube es completamente opcional
- **Encriptación**: Las contraseñas se cifran localmente antes de cualquier almacenamiento
- **Sin Anuncios**: Interfaz completamente libre de publicidad
- **Código Abierto**: Todo el código es auditable públicamente