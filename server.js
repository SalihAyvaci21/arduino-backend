const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1. Kart Haritası: Frontend'den gelen isimleri teknik isimlere (FQBN) çevirir
const BOARD_MAP = {
    'uno': 'arduino:avr:uno',
    'mega': 'arduino:avr:mega',
    'leonardo': 'arduino:avr:leonardo',
    'nano': 'arduino:avr:nano', // Yeni Bootloader (Resmi)
    'nano-old': 'arduino:avr:nano:cpu=atmega328old', // Eski Bootloader (Klonlar için - ÖNEMLİ)
    'micro': 'arduino:avr:micro'
};

const SKETCH_DIR = path.join(__dirname, 'sketch_temp');
const SKETCH_FILE = path.join(SKETCH_DIR, 'sketch_temp.ino');

if (!fs.existsSync(SKETCH_DIR)){
    fs.mkdirSync(SKETCH_DIR);
}

app.post('/compile', (req, res) => {
    const { code, board } = req.body;
    
    // Varsayılan olarak Uno seç
    const fqbn = BOARD_MAP[board] || 'arduino:avr:uno';

    console.log(`Kod alındı. Hedef: ${board} -> ${fqbn}`);
    
    fs.writeFileSync(SKETCH_FILE, code);

    // Kütüphaneler ve Çekirdek ile derle
    const command = `arduino-cli compile --fqbn ${fqbn} "${SKETCH_DIR}" --output-dir "${SKETCH_DIR}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Derleme Hatası: ${stderr}`);
            return res.status(500).json({ error: stderr || error.message });
        }

        // Hex dosyasını bul (Bootloader'lı veya normal)
        const standardHex = path.join(SKETCH_DIR, 'sketch_temp.ino.hex');
        const bootloaderHex = path.join(SKETCH_DIR, 'sketch_temp.ino.with_bootloader.hex');
        
        let targetHex = null;
        if (fs.existsSync(bootloaderHex)) targetHex = bootloaderHex;
        else if (fs.existsSync(standardHex)) targetHex = standardHex;

        if (targetHex) {
            const hexContent = fs.readFileSync(targetHex, 'utf8');
            res.json({ hex: hexContent, message: "Başarılı" });
        } else {
            res.status(500).json({ error: "Hex dosyası oluşturulamadı." });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
