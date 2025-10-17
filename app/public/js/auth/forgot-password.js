document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const alertBox = document.getElementById('forgotPasswordAlert');
    alertBox.style.display = 'none';
    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await res.json();
        alertBox.textContent = result.message || (result.success ? 'ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว' : 'เกิดข้อผิดพลาด');
        alertBox.style.display = 'block';
        alertBox.className = 'alert ' + (result.success ? 'alert-success' : 'alert-error');
    } catch (err) {
        alertBox.textContent = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        alertBox.style.display = 'block';
        alertBox.className = 'alert alert-error';
    }
});
