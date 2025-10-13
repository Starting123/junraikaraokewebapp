// Admin CRUD JS: fetch and display rooms, bookings, users; add/edit/delete actions

document.addEventListener('DOMContentLoaded', function() {
    // loadRooms();
    // loadUsers();
    // loadBookings();

    // Add event listeners for CRUD forms
    document.getElementById('addRoomBtn')?.addEventListener('click', function() { window.showAddRoomModal(); });
    document.getElementById('addUserBtn')?.addEventListener('click', showAddUserModal);
    document.getElementById('addBookingBtn')?.addEventListener('click', showAddBookingModal);
});

// Fetch and display rooms
async function loadRooms() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/rooms', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const { data } = await res.json();
        const rooms = data.rooms || [];
        const tbody = document.getElementById('roomsTableBody');
        tbody.innerHTML = rooms.length ? rooms.map(room => `
            <tr data-id="${room.room_id}" data-type_id="${room.type_id}">
                <td>${room.room_id}</td>
                <td class="room-name">${room.name}</td>
                <td class="room-capacity">${room.capacity}</td>
                <td class="room-type">${room.type_name || '-'}</td>
                <td class="room-status">${room.status}</td>
                <td>
                    <button onclick="editRoom(${room.room_id})">แก้ไข</button>
                    <button onclick="deleteRoom(${room.room_id})">ลบ</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6">ไม่มีข้อมูลห้อง</td></tr>';
    } catch (err) {
        document.getElementById('roomsTableBody').innerHTML = '<tr><td colspan="6">โหลดข้อมูลห้องไม่สำเร็จ</td></tr>';
    }
}

// Fetch and display users
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const { data } = await res.json();
        const users = data.users || [];
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = users.length ? users.map(user => `
            <tr>
                <td>${user.user_id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role_id}</td>
                <td>${user.created_at}</td>
                <td>
                    <button onclick="editUser(${user.user_id})">แก้ไข</button>
                    <button onclick="deleteUser(${user.user_id})">ลบ</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="6">ไม่มีข้อมูลผู้ใช้</td></tr>';
    } catch (err) {
        document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="6">โหลดข้อมูลผู้ใช้ไม่สำเร็จ</td></tr>';
    }
}

// Fetch and display bookings
async function loadBookings() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/bookings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const { data } = await res.json();
        const bookings = data.bookings || [];
        const tbody = document.getElementById('bookingsTableBody');
        tbody.innerHTML = bookings.length ? bookings.map(b => `
            <tr 
                data-id="${b.booking_id}"
                data-user="${b.user_name || b.user_id}"
                data-room="${b.room_name || b.room_id}"
                data-date="${b.start_time?.slice(0,10)}"
                data-time="${b.start_time?.slice(11,16)}-${b.end_time?.slice(11,16)}"
                data-status="${b.status}"
                data-price="${b.price || '-'}"
                data-pdfName="${b.receipt_pdf_name || '-'}"
                data-pdfUrl="${b.receipt_pdf_url || ''}"
            >
                <td>${b.booking_id}</td>
                <td>${b.user_name || b.user_id}</td>
                <td>${b.room_name || b.room_id}</td>
                <td>${b.start_time?.slice(0,10)}</td>
                <td>${b.start_time?.slice(11,16)}-${b.end_time?.slice(11,16)}</td>
                <td>${b.status}</td>
                <td>
                    <button class="btn-booking-details">ดูรายละเอียด</button>
                    <button class="btn-booking-edit">แก้ไข</button>
                    <button onclick="deleteBooking(${b.booking_id})">ลบ</button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="7">ไม่มีข้อมูลการจอง</td></tr>';
        attachBookingTableListeners();
    } catch (err) {
        document.getElementById('bookingsTableBody').innerHTML = '<tr><td colspan="7">โหลดข้อมูลการจองไม่สำเร็จ</td></tr>';
    }
}

// Show add room modal (simple prompt for demo)
window.showAddRoomModal = function() {
    if (typeof window.openRoomModal === 'function') {
        window.openRoomModal('add');
    } else {
        alert('ไม่สามารถเปิดหน้าสร้างห้องใหม่');
    }
}

// Add room
async function addRoom(room) {
    try {
        const token = localStorage.getItem('token');
        await fetch('/api/admin/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(room)
        });
        loadRooms();
    } catch (err) { alert('เพิ่มห้องไม่สำเร็จ'); }
}

// Edit room
window.editRoom = function(id) {
    const row = document.querySelector(`#roomsTableBody tr[data-id='${id}']`);
    if (!row) {
        alert('ไม่พบข้อมูลห้อง');
        return;
    }
    if (typeof window.openRoomModal === 'function') {
        // Get type_id from table row (add a data-type_id attribute if needed)
        const typeId = row.getAttribute('data-type_id') || row.querySelector('.room-type_id')?.textContent || '1';
        window.openRoomModal('edit', {
            room_id: id,
            name: row.querySelector('.room-name').textContent,
            capacity: row.querySelector('.room-capacity').textContent,
            type_id: typeId,
            status: row.querySelector('.room-status').textContent
        });
    } else {
        alert('ไม่สามารถเปิดหน้าฟอร์มแก้ไขห้อง');
    }
}

async function updateRoom(id, room) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/rooms/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(room)
        });
        loadRooms();
    } catch (err) { alert('แก้ไขห้องไม่สำเร็จ'); }
}

// Delete room
async function deleteRoom(id) {
    if (!confirm('ลบห้องนี้?')) return;
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/rooms/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        loadRooms();
    } catch (err) { alert('ลบห้องไม่สำเร็จ'); }
}

// Auto-update price and capacity when room type changes
window.updateRoomPriceByType = function() {
    var typeSelect = document.getElementById('roomType');
    var priceInput = document.getElementById('roomPrice');
    var capacityInput = document.getElementById('roomCapacity');
    var selected = typeSelect.options[typeSelect.selectedIndex];
    priceInput.value = selected.getAttribute('data-price');
    // Auto-set capacity
    if (typeSelect.value === '1') {
        capacityInput.value = 6;
    } else if (typeSelect.value === '2') {
        capacityInput.value = 10;
    }
}

// Update openRoomModal to set type, price, and capacity
function openRoomModal(mode, room = {}) {
    document.getElementById('roomModal').style.display = 'block';
    document.getElementById('roomModalTitle').textContent = mode === 'add' ? 'เพิ่มห้องใหม่' : 'แก้ไขห้อง';
    document.getElementById('roomId').value = room.room_id || '';
    document.getElementById('roomName').value = room.name || '';
    var typeSelect = document.getElementById('roomType');
    if (room.type_id) {
        typeSelect.value = room.type_id;
    } else {
        typeSelect.value = '1';
    }
    window.updateRoomPriceByType();
    window.updateRoomPriceByType();
    // If editing, use room capacity; if adding, auto-set by type
    if (mode === 'edit' && room.capacity) {
        document.getElementById('roomCapacity').value = room.capacity;
    }
    document.getElementById('roomStatus').value = room.status || 'available';
    window.roomModalMode = mode;
    // Show summary for edit mode
    const summary = document.getElementById('roomSummary');
    if (mode === 'edit') {
        summary.style.display = 'block';
        document.getElementById('summaryRoomId').textContent = room.room_id;
        document.getElementById('summaryRoomName').textContent = room.name;
        document.getElementById('summaryRoomCapacity').textContent = room.capacity;
        document.getElementById('summaryRoomPrice').textContent = document.getElementById('roomPrice').value;
        document.getElementById('summaryRoomStatus').textContent = room.status;
    } else {
        summary.style.display = 'none';
    }
    // Attach submit event for room form
    const roomForm = document.getElementById('roomForm');
    roomForm.onsubmit = async function(e) {
        e.preventDefault();
        const roomData = {
            name: document.getElementById('roomName').value,
            type_id: Number(document.getElementById('roomType').value),
            capacity: Number(document.getElementById('roomCapacity').value),
            status: document.getElementById('roomStatus').value
        };
        if (window.roomModalMode === 'add') {
            await addRoom(roomData);
        } else {
            const id = document.getElementById('roomId').value;
            await updateRoom(id, roomData);
        }
        closeRoomModal();
    };
}
window.openRoomModal = openRoomModal;
window.closeRoomModal = function() {
    document.getElementById('roomModal').style.display = 'none';
}

// Similar CRUD for users/bookings (addUser, editUser, deleteUser, addBooking, editBooking, deleteBooking)
// ...
// For brevity, only room CRUD is fully implemented here. You can expand for users/bookings as needed.

// Booking Details Modal Logic
function openBookingModal(booking) {
    const modal = document.getElementById('bookingModal');
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    document.getElementById('modalBookingId').textContent = booking.id;
    document.getElementById('modalBookingUser').textContent = booking.user || '-';
    document.getElementById('modalBookingRoom').textContent = booking.room || '-';
    document.getElementById('modalBookingDate').textContent = booking.date || '-';
    document.getElementById('modalBookingTime').textContent = booking.time || '-';
    document.getElementById('modalBookingStatus').textContent = booking.status || '-';
    document.getElementById('modalBookingPrice').textContent = booking.price || '-';
    document.getElementById('modalBookingPDF').textContent = booking.pdfName || '-';
    document.getElementById('btnViewPDF').dataset.pdfUrl = booking.pdfUrl || '';
    document.getElementById('btnEditBooking').dataset.bookingId = booking.id;
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    modal.style.display = 'none';
    modal.style.visibility = 'hidden';
}

function viewBookingPDF() {
    const pdfUrl = document.getElementById('btnViewPDF').dataset.pdfUrl;
    if (pdfUrl) {
        window.open(pdfUrl, '_blank');
    } else {
        alert('ไม่พบไฟล์ PDF สำหรับการจองนี้');
    }
}

function editBookingModal() {
    const bookingId = document.getElementById('btnEditBooking').dataset.bookingId;
    // Hide details, show edit form
    document.getElementById('bookingDetailsList').style.display = 'none';
    document.getElementById('bookingActions').style.display = 'none';
    const form = document.getElementById('bookingEditForm');
    form.style.display = 'block';
    // Fill form fields from modal
    form.dataset.bookingId = bookingId;
    document.getElementById('editBookingStatus').value = document.getElementById('modalBookingStatus').textContent;
    document.getElementById('editBookingDate').value = document.getElementById('modalBookingDate').textContent;
    const time = document.getElementById('modalBookingTime').textContent.split('-');
    document.getElementById('editBookingStart').value = time[0] || '';
    document.getElementById('editBookingEnd').value = time[1] || '';
}

// Save booking edit
document.getElementById('bookingEditForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const bookingId = e.target.dataset.bookingId;
    const status = document.getElementById('editBookingStatus').value;
    const date = document.getElementById('editBookingDate').value;
    const start = document.getElementById('editBookingStart').value;
    const end = document.getElementById('editBookingEnd').value;
    try {
        await fetch(`/api/admin/bookings/${bookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, date, start, end })
        });
        // Reload bookings table
        loadBookings();
        // Reload modal details (call viewBooking from admin.js)
        if (window.viewBooking) {
            window.viewBooking(bookingId);
        } else {
            closeBookingModal();
        }
    } catch (err) {
        alert('บันทึกการแก้ไขไม่สำเร็จ');
    }
});

// When closing modal, reset edit form and show details
const oldCloseBookingModal = closeBookingModal;
closeBookingModal = function() {
    document.getElementById('bookingEditForm').style.display = 'none';
    document.getElementById('bookingDetailsList').style.display = 'block';
    document.getElementById('bookingActions').style.display = 'flex';
    oldCloseBookingModal();
}


// Attach event listeners to booking table rows (after table is rendered)
function attachBookingTableListeners() {
    const rows = document.querySelectorAll('#bookingsTableBody tr');
    rows.forEach(row => {
        const detailsBtn = row.querySelector('.btn-booking-details');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', function() {
                const booking = {
                    id: row.dataset.id,
                    user: row.dataset.user,
                    room: row.dataset.room,
                    date: row.dataset.date,
                    time: row.dataset.time,
                    status: row.dataset.status,
                    price: row.dataset.price,
                    pdfName: row.dataset.pdfName,
                    pdfUrl: row.dataset.pdfUrl
                };
                openBookingModal(booking);
            });
        }
        const editBtn = row.querySelector('.btn-booking-edit');
        if (editBtn) {
            editBtn.addEventListener('click', function() {
                // TODO: Open edit modal for booking
                alert('ฟังก์ชันแก้ไขการจองยังไม่พร้อมใช้งาน');
            });
        }
    });
}
