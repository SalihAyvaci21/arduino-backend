const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs/promises'); // Asenkron fs modülü
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Geçici dosya yolu ve klasörü
const SKETCH_DIR = path.join(__dirname, 'sketch_temp');
const SKETCH_FILE = path.join(SKETCH_DIR, 'sketch_temp.ino');
const HEX_PATH = path.join(SKETCH_DIR, 'sketch_temp.ino.hex'); // Arduino CLI varsayılan isim verir

// Derleme Endpoint'i
app.post('/compile', async (req, res) => {
    const code = req.body.code;
    const board = "arduino:avr:uno"; 

    if (!code) {
        return res.status(400).send({ error: 'Code not provided.' });
    }

    try {
        console.log("Kod alındı ve derleme başlatılıyor...");

        // 1. Sketch dizinini oluştur/temizle
        // Önceki derlemelerden kalan dosyaları siler
        await fs.rm(SKETCH_DIR, { recursive: true, force: true });
        await fs.mkdir(SKETCH_DIR, { recursive: true });
        
        // 2. Kodu sketch dosyasına yaz
        await fs.writeFile(SKETCH_FILE, code);

        // 3. Arduino CLI ile derle
        // --output-dir parametresini SKETCH_DIR olarak ayarladık.
        // Bu, hex dosyasının HEX_PATH'te oluşmasını sağlar.
        const compileCommand = `arduino-cli compile --fqbn ${board} "${SKETCH_DIR}" --output-dir "${SKETCH_DIR}"`;
        
        await new Promise((resolve, reject) => {
            exec(compileCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Derleme Hata Detayı: ${stderr}`);
                    return reject({ type: 'CompilationFailed', details: stderr || error.message });
                }
                console.log("Derleme başarılı.");
                resolve();
            });
        });

        // 4. Derlenen .hex dosyasını oku
        const hexContent = await fs.readFile(HEX_PATH, 'utf8');

        // 5. Başarılı yanıt gönder
        res.json({ hex: hexContent });

    } catch (err) {
        // Hata türüne göre farklı yanıtlar gönderme
        if (err.type === 'CompilationFailed') {
             // 500 hatası ve derleme çıktısı
             return res.status(500).send({ error: 'Compilation failed', details: err.details });
        } else if (err.code === 'ENOENT') {
             // Hex dosyası bulunamadı (Bu da bir derleme hatasıdır aslında)
             return res.status(500).send({ error: 'Hex file not found after compilation.', details: err.message });
        } else {
             // Genel Sunucu Hatası
             console.error('Sunucu İç Hatası:', err);
             return res.status(500).send({ error: 'Internal server error', details: err.message });
        }
    }
});

// Sunucuyu başlat
app.listen(port, () => {
    console.log(`Arduino CLI Compilation Server listening on port ${port}`);
});
