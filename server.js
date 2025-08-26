// 1. Import ไลบรารี่ที่จำเป็น
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // โหลดค่าจากไฟล์ .env

// 2. ตั้งค่า Express App
const app = express();
const PORT = process.env.PORT || 3000; // ใช้ Port จาก .env หรือถ้าไม่มีให้ใช้ 3000

// 3. ใช้งาน Middleware
app.use(cors()); // อนุญาตให้ Frontend จากโดเมนอื่นเรียกใช้ API ได้
app.use(express.json()); // ทำให้ Express อ่านข้อมูลแบบ JSON ที่ส่งมาใน Request Body ได้

// --- ฐานข้อมูลจำลอง (In-Memory "Fake" Database) ---
// ในแอปพลิเคชันจริง เราจะเชื่อมต่อกับฐานข้อมูลจริงๆ เช่น PostgreSQL หรือ MongoDB
// แต่สำหรับตัวอย่างนี้ เราจะใช้ Array ธรรมดาเพื่อเก็บข้อมูล User ชั่วคราว
// **ข้อควรระวัง:** ข้อมูลในนี้จะหายไปทั้งหมดเมื่อเซิร์ฟเวอร์รีสตาร์ท
let users = [];

// --- สร้าง ROUTES (เส้นทาง API) ---

// ## Endpoint สำหรับสมัครสมาชิก ##
app.post('/register', async (req, res) => {
  try {
    // รับอีเมลและรหัสผ่านจาก Request Body
    const { email, password } = req.body;

    // ตรวจสอบว่ามีอีเมลนี้ในระบบแล้วหรือยัง
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ message: "มีผู้ใช้งานอีเมลนี้แล้ว" });
    }

    // เข้ารหัสรหัสผ่านด้วย bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // สร้าง User ใหม่
    const newUser = {
      id: users.length + 1, // สร้าง ID แบบง่ายๆ
      email: email,
      password: hashedPassword
    };

    // บันทึก User ลงในฐานข้อมูลจำลอง
    users.push(newUser);
    console.log('Users in database:', users); // แสดงข้อมูลใน console เพื่อตรวจสอบ

    // ส่ง Response กลับไปว่าสำเร็จ
    res.status(201).json({ message: "สมัครสมาชิกสำเร็จ!" });

  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ## Endpoint สำหรับล็อกอิน ##
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ค้นหา User จากอีเมลในฐานข้อมูลจำลอง
    const user = users.find(user => user.email === email);
    if (!user) {
      // ถ้าไม่เจอ User
      return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // เปรียบเทียบรหัสผ่านที่ส่งมากับรหัสผ่านที่เข้ารหัสไว้ในฐานข้อมูล
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // ถ้ารหัสผ่านไม่ตรงกัน
      return res.status(400).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ถ้ารหัสผ่านถูกต้อง ให้สร้าง JSON Web Token (JWT)
    const payload = { id: user.id, email: user.email };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET, // ใช้ Secret Key จากไฟล์ .env
      { expiresIn: '1h' } // ตั้งให้ Token หมดอายุใน 1 ชั่วโมง
    );

    res.json({
      message: "ล็อกอินสำเร็จ!",
      token: token // ส่ง Token กลับไปให้ Frontend
    });

  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});


// 4. สั่งให้เซิร์ฟเวอร์เริ่มทำงาน
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});