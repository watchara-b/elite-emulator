# 1. ใช้ Image พื้นฐานของ Node.js
FROM node:18-alpine

# 2. กำหนดพื้นที่ทำงานใน Container
WORKDIR /home/wattcha58/elite-emulator

# 3. คัดลอกไฟล์ package.json แล้วติดตั้ง Dependencies
COPY package*.json ./
RUN npm install

# 4. คัดลอกโค้ดทั้งหมดของคุณเข้าไปใน Container
COPY . .

# 5. บอกให้โลกรู้ว่าแอปของคุณทำงานที่ Port ไหน
EXPOSE 3000

# 6. คำสั่งสำหรับรันแอปเมื่อ Container เริ่มทำงาน
CMD [ "node", "server.js" ]