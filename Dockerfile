# Node.js tabanlı bir Linux imajı kullan
FROM node:18-bullseye

# Gerekli sistem araçlarını yükle
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Arduino CLI Kurulumu
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Arduino AVR Çekirdeğini İndir (Uno, Mega, Nano vb. için)
RUN arduino-cli core update-index
RUN arduino-cli core install arduino:avr

# --- KRİTİK: BAŞLANGIÇ KİTİ KÜTÜPHANELERİNİ YÜKLE ---
# Blok kodlamada kullanılan sensörler için gerekli
RUN arduino-cli lib install Servo
RUN arduino-cli lib install "LiquidCrystal I2C"
RUN arduino-cli lib install "DHT sensor library"
RUN arduino-cli lib install "Adafruit Unified Sensor"
RUN arduino-cli lib install NewPing
RUN arduino-cli lib install Keypad
RUN arduino-cli lib install Stepper
# ----------------------------------------------------

# Çalışma klasörünü ayarla
WORKDIR /app

# Paket listesini kopyala ve yükle
COPY package.json ./
RUN npm install

# Sunucu dosyasını kopyala
COPY server.js ./

# Geçici derleme klasörü oluştur
RUN mkdir sketch_temp

# Sunucuyu başlat
CMD ["node", "server.js"]
