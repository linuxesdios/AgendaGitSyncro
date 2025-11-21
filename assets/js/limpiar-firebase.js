// SCRIPT PARA LIMPIAR FIREBASE
// Elimina las listas personalizadas confusas y deja solo las tareas nativas

async function limpiarListasPersonalizadasFirebase() {
    console.log('🧹 LIMPIANDO LISTAS PERSONALIZADAS DE FIREBASE...');

    if (!window.db) {
        console.error('❌ Firebase no inicializado');
        return;
    }

    try {
        // Obtener configuración actual
        const configDoc = await db.collection('config').doc('settings').get();

        if (!configDoc.exists) {
            console.log('⚠️ No hay configuración en Firebase');
            return;
        }

        const configData = configDoc.data();
        console.log('📊 Configuración actual:', configData);

        // Eliminar TODAS las listas personalizadas
        const nuevaConfig = {
            ...configData,
            visual: {
                ...(configData.visual || {}),
                listasPersonalizadas: []  // VACIAR listas personalizadas
            }
        };

        // Guardar configuración limpia
        await db.collection('config').doc('settings').set(nuevaConfig, { merge: true });

        console.log('✅ LISTAS PERSONALIZADAS ELIMINADAS DE FIREBASE');
        console.log('🔄 Actualizando configuración local...');

        // Actualizar configuración local
        window.configVisual = {
            ...(window.configVisual || {}),
            listasPersonalizadas: []
        };

        console.log('✅ LIMPIEZA COMPLETADA');
        alert('✅ Listas personalizadas eliminadas de Firebase.\n\nAhora recarga la página (F5) y luego ejecuta:\nrestaurarTareasDesdeJSON()');

    } catch (error) {
        console.error('❌ Error limpiando Firebase:', error);
    }
}

// Exportar función
window.limpiarListasPersonalizadasFirebase = limpiarListasPersonalizadasFirebase;

console.log('✅ Script de limpieza cargado.');
console.log('📝 Para limpiar Firebase, ejecuta:');
console.log('   limpiarListasPersonalizadasFirebase()');
