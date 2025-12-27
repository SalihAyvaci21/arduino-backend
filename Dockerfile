# Node.js tabanlı Linux imajı
FROM node:18-bullseye

# 1. Gerekli sistem araçlarını yükle
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 2. Arduino CLI Kurulumu
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# 3. Çekirdek ve Kütüphaneleri Yükle (Tek seferde yaparak hatayı önler)
RUN arduino-cli core update-index && \
    arduino-cli core install arduino:avr && \
    arduino-cli lib install Servo && \
    arduino-cli lib install "LiquidCrystal I2C" && \
    arduino-cli lib install "DHT sensor library" && \
    arduino-cli lib install "Adafruit Unified Sensor" && \
    arduino-cli lib install NewPing && \
    arduino-cli lib install Keypad && \
    arduino-cli lib install Stepper

# 4. Çalışma klasörünü ayarla
WORKDIR /app

# 5. Bağımlılıkları yükle (package.json burada devreye giriyor)
COPY package.json ./
RUN npm install

# 6. Sunucu dosyasını kopyala
COPY server.js ./

# 7. Geçici klasör oluştur
RUN mkdir sketch_temp

# 8. Sunucuyu başlat
CMD ["node", "server.js"]
