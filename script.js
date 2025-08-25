// รอให้หน้าเว็บโหลดเสร็จสมบูรณ์ก่อนที่จะเริ่มทำงาน
document.addEventListener('DOMContentLoaded', function() {

    // ค้นหาปุ่มและข้อความจาก id ที่เราตั้งไว้ใน HTML
    const myButton = document.getElementById('my-button');
    const mainText = document.getElementById('main-text');

    // เพิ่ม Event Listener เพื่อรอการคลิกที่ปุ่ม
    myButton.addEventListener('click', function() {
        // เมื่อปุ่มถูกคลิก ให้แสดงข้อความแจ้งเตือน (Alert)
        alert('คุณได้คลิกปุ่มแล้ว! ยอดเยี่ยม!');

        // และเปลี่ยนข้อความในย่อหน้า
        mainText.textContent = 'คุณได้โต้ตอบกับเว็บไซต์เรียบร้อยแล้ว!';
    });

});