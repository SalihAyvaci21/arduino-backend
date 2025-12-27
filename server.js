const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 1. Kart Haritası: Frontend'den gelen kısa isimleri FQBN'e çevirir
const BOARD_MAP = {
    'uno': 'arduino:avr:uno',
    'mega': 'arduino:avr:mega',
    'leonardo': 'arduino:avr:leonardo',
    'nano': 'arduino:avr:nano',
    'micro': 'arduino:avr:micro'
};

// Çalışma Klasörü Ayarları
const SKETCH_DIR = path.join(__dirname, 'sketch_temp');
const SKETCH_FILE = path.join(SKETCH_DIR, 'sketch_temp.ino');

// Başlangıçta klasör yoksa oluştur
if (!fs.existsSync(SKETCH_DIR)){
    fs.mkdirSync(SKETCH_DIR);
}

app.post('/compile', (req, res) => {
    // 2. Frontend'den gelen 'board' parametresini al
    const { code, board } = req.body;

    // 3. Seçilen karta göre FQBN belirle (Varsayılan: Uno)
    const fqbn = BOARD_MAP[board] || 'arduino:avr:uno';

    console.log(`Kod alındı. Hedef: ${board} -> ${fqbn}`);
    
    // Kodu dosyaya yaz
    fs.writeFileSync(SKETCH_FILE, code);

    // 4. Arduino-CLI komutu (Dinamik FQBN ile)
    const command = `arduino-cli compile --fqbn ${fqbn} "${SKETCH_DIR}" --output-dir "${SKETCH_DIR}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Derleme Hatası: ${stderr}`);
            // Hata mesajını frontend'e gönder
            return res.status(500).json({ error: stderr || error.message });
        }

        // 5. Hex Dosyasını Bulma Mantığı (Bazı kartlar bootloader.hex üretir)
        const standardHex = path.join(SKETCH_DIR, 'sketch_temp.ino.hex');
        const bootloaderHex = path.join(SKETCH_DIR, 'sketch_temp.ino.with_bootloader.hex');
        
        let targetHex = null;

        // Önce bootloader'lı versiyon var mı diye bak (Mega/Leonardo için gerekebilir)
        if (fs.existsSync(bootloaderHex)) {
            targetHex = bootloaderHex;
        } else if (fs.existsSync(standardHex)) {
            targetHex = standardHex;
        }

        if (targetHex) {
            const hexContent = fs.readFileSync(targetHex, 'utf8');
            res.json({ hex: hexContent, message: "Başarılı" });
        } else {
            res.status(500).json({ error: "Hex dosyası oluşturulamadı." });
        }
    });
});

// Render.com'un verdiği portu kullan
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
