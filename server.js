const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));  // Servir archivos estáticos desde la carpeta actual

// Endpoint para guardar agenda.xml
app.post('/save', async (req, res) => {
    try {
        const xml = req.body.xml;
        if (!xml) {
            return res.status(400).json({ error: 'No XML data provided' });
        }
        await fs.writeFile('agenda.xml', xml, 'utf8');
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving file:', err);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// Endpoint para cargar agenda.xml
app.get('/load', async (req, res) => {
    try {
        const xml = await fs.readFile('agenda.xml', 'utf8');
        res.type('application/xml').send(xml);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // Si el archivo no existe, devolver XML vacío
            const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<agenda>
  <dia fecha="${new Date().toISOString().slice(0, 10)}" dia_semana="${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()]}" />
  <mit></mit>
  <metodo_1_3_5>
    <medianas></medianas>
    <pequenas></pequenas>
  </metodo_1_3_5>
  <notas></notas>
</agenda>`;
            res.type('application/xml').send(emptyXml);
        } else {
            console.error('Error loading file:', err);
            res.status(500).json({ error: 'Failed to load file' });
        }
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor agenda corriendo en http://localhost:${PORT}`);
    console.log(`- En PC local: http://localhost:${PORT}/agenda_mobile.html`);
    console.log('- En dispositivos Android: http://TU_IP:3000/agenda_mobile.html');
    console.log('- Los cambios se guardarán automáticamente en agenda.xml');
});