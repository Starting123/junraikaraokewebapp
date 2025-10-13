document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const alertBox = document.getElementById('resetPasswordAlert');
    alertBox.style.display = 'none';
    try {
        const res = await fetch(`/auth/reset-password/${window.resetToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password, confirmPassword })
        });
        const result = await res.json();
        alertBox.textContent = result.message || (result.success ? 'รีเซ็ตรหัสผ่านสำเร็จ' : 'เกิดข้อผิดพลาด');
        alertBox.style.display = 'block';
        alertBox.className = 'alert ' + (result.success ? 'alert-success' : 'alert-error');
        if (result.success) {
            setTimeout(() => { window.location.href = '/auth/login'; }, 2000);
        }
    } catch (err) {
        alertBox.textContent = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        alertBox.style.display = 'block';
        alertBox.className = 'alert alert-error';
    }
});
