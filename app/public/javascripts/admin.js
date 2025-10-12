// ==========================================
// Admin Page JavaScript
// ==========================================

// Only initialize if we're on the admin page
if (window.location.pathname === '/admin') {
	
	// Note: Redirect protection handled by shared/anti-redirect-loop.js
	// Removed duplicate location override to prevent "Cannot redefine property" error
	console.log('🛡️ Admin page loaded - anti-redirect protection active');
	
	document.addEventListener('DOMContentLoaded', function() {
		console.log('🔧 Admin DOMContentLoaded event fired');
		
		// Prevent multiple initializations
		if (window.adminPageInitialized) {
			console.log('❌ Admin page already initialized, skipping...');
			return;
		}
		window.adminPageInitialized = true;
		console.log('✅ Initializing admin page...');

	// Navigation toggle
	const navToggle = document.getElementById('navToggle');
	const navMenu = document.getElementById('navMenu');
	if (navToggle && navMenu) {
		navToggle.addEventListener('click', function() {
			navMenu.classList.toggle('active');
			navToggle.classList.toggle('active');
		});
	}

	// Initialize AdminRequestManager if available
	if (typeof AdminRequestManager === 'function' && !window.adminRequestManager) {
		window.adminRequestManager = new AdminRequestManager();
		console.log('✅ AdminRequestManager initialized');
	}

	// Check admin authentication ONLY if on admin page
	// Don't run auth check automatically - the server already verified this
	if (window.location.pathname === '/admin') {
		console.log('✅ Admin page loaded - server already authenticated');
		// Load stats directly since server middleware already verified admin access
		if (typeof loadAdminStats === 'function' && !window.statsLoaded) {
			window.statsLoaded = true;
			setTimeout(() => {
				loadAdminStats();
			}, 500);
		}
	}

	// Logout functionality
	const logoutBtn = document.getElementById('logoutBtn');
	if (logoutBtn && typeof logout === 'function') {
		logoutBtn.addEventListener('click', logout);
	}

	// Load admin statistics only once after auth check
	// Only load if we're actually on the admin page and auth passes
	if (typeof loadAdminStats === 'function' && window.location.pathname === '/admin') {
		// Don't use automatic loading - let checkAdminAuth handle it
		console.log('📊 Stats loading deferred to auth check completion');
	}
	});
}

// Check admin authentication (DISABLED to prevent loops)
async function checkAdminAuth() {
	console.log('🔐 checkAdminAuth() called, current path:', window.location.pathname);
	console.log('⚠️ Client-side auth check DISABLED - server middleware handles authentication');
	
	// Server middleware already verified admin access
	// Don't do client-side verification to prevent redirect loops
	return Promise.resolve({
		user: { role_id: 1 }, // Assume admin if we reached this page
		message: 'Server already verified admin access'
	});
}

// Basic authentication check function
async function basicAuthCheck() {
	const token = localStorage.getItem('token');
	if (!token) {
		console.log('❌ No auth token found');
		throw new Error('No token found');
	}

	// Validate token format
	try {
		const payload = JSON.parse(atob(token.split('.')[1]));
		const now = Date.now() / 1000;
		if (payload.exp <= now) {
			console.log('🕒 Token expired');
			throw new Error('Token expired');
		}
	} catch (e) {
		console.log('🚫 Invalid token format');
		throw new Error('Invalid token format');
	}

	console.log('📡 Verifying token with server...');
	const response = await fetch('/api/auth/me', {
		headers: {
			'Authorization': `Bearer ${token}`
		}
	});
    
	if (!response.ok) {
		console.log('❌ Server auth failed:', response.status);
		throw new Error(`Authentication failed: ${response.status}`);
	}

	const data = await response.json();
	console.log('✅ Auth successful, user role:', data.user.role_id);
    
	// Check if user is admin
	if (data.user.role_id !== 1) {
		console.log('🚫 User is not admin');
		alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
		window.location.replace('/dashboard');
		return;
	}
    
	updateUserInfo(data.user);
	console.log('🎉 Admin auth successful');
	
	// Load stats only once after successful auth
	if (!window.statsLoaded && typeof loadAdminStats === 'function') {
		window.statsLoaded = true;
		loadAdminStats();
	}
	
	return data.user;
}

// Handle authentication failure (DISABLED to prevent loops)
function handleAuthFailure() {
	console.log('🧹 Auth failure detected but NOT redirecting to prevent loops');
	console.log('🛡️ Server middleware should handle authentication - client stays put');
	
	// Don't clear localStorage or redirect - let server handle it
	// This prevents infinite loops between /admin and /auth
	
	// If we're on admin page, server already verified access
	if (window.location.pathname === '/admin') {
		console.log('✅ On admin page - server already verified admin access');
		return;
	}
}

// Update user information
function updateUserInfo(user) {
	if (!user) return;
	const userName = document.getElementById('userName');
	const welcomeMessage = document.getElementById('welcomeMessage');
	if (userName) {
		userName.textContent = user.name || '';
	}
	if (welcomeMessage) {
		welcomeMessage.textContent = `ยินดีต้อนรับผู้ดูแลระบบ ${user.name || ''}`;
	}
}

// Load admin statistics
async function loadAdminStats(forceReload = false) {
	console.log('📊 loadAdminStats() called, forceReload:', forceReload);
	
	// Check if required elements exist
	const requiredElements = ['totalUsers', 'totalRooms', 'totalBookings', 'totalRevenue'];
	const missingElements = requiredElements.filter(id => !document.getElementById(id));
	if (missingElements.length > 0) {
		console.warn('❌ Missing required elements:', missingElements);
		return;
	}

	// Use request manager if available, otherwise fallback to basic loading
	try {
		if (window.adminRequestManager) {
			console.log('📊 Using AdminRequestManager for stats');
			await window.adminRequestManager.makeRequest('loadStats', async () => {
				return loadStatsData();
			}, { 
				useCache: !forceReload,
				timeout: 15000
			});
		} else {
			console.log('📊 Using basic loading for stats');
			await loadStatsData();
		}
		console.log('✅ Admin stats loaded successfully');
	} catch (error) {
		console.error('💥 Failed to load stats:', error);
		
		// Show error in UI elements
		const errorElements = ['totalUsers', 'totalRooms', 'totalBookings', 'totalRevenue'];
		errorElements.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				element.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>';
			}
		});
		
		const changeElements = ['usersChange', 'roomsAvailable', 'bookingsChange', 'revenueChange'];
		changeElements.forEach(id => {
			const element = document.getElementById(id);
			if (element) {
				element.textContent = 'เกิดข้อผิดพลาด';
			}
		});
		
		if (typeof showToast === 'function') {
			showToast('ไม่สามารถโหลดข้อมูลสถิติได้: ' + error.message, 'error');
		}
	}
}

// Load statistics data
async function loadStatsData() {
	const token = localStorage.getItem('token');
	if (!token) {
		console.warn('⚠️ No token found, stats may fail to load');
		// Don't throw error, let server handle authentication
	}

	console.log('📈 Loading admin statistics...');

	// Load basic statistics with error handling
	let usersResponse, roomsResponse, bookingsResponse;
	
	try {
		const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
		
		[usersResponse, roomsResponse, bookingsResponse] = await Promise.all([
			fetch('/api/admin/users', { headers }),
			fetch('/api/admin/rooms', { headers }),
			fetch('/api/bookings', { headers })
		]);
	} catch (error) {
		console.error('🚫 Network error loading stats:', error);
		throw new Error('Network error: ' + error.message);
	}

	if (usersResponse.ok) {
		const response = await usersResponse.json();
		console.log('Users loaded:', response);
		
		// API returns { users: [...] }
		const usersArray = Array.isArray(response.users) ? response.users : [];
		document.getElementById('totalUsers').textContent = usersArray.length || 0;
		document.getElementById('usersChange').textContent = `+0 ใหม่วันนี้`;
	} else {
		console.error('Failed to load users:', usersResponse.status);
	}

	if (roomsResponse.ok) {
		const response = await roomsResponse.json();
		console.log('Rooms loaded:', response);
		
		// API returns { rooms: [...] }
		const roomsArray = Array.isArray(response.rooms) ? response.rooms : [];
		const totalRooms = roomsArray.length || 0;
		const availableRooms = roomsArray.filter(room => room.status === 'available').length || 0;
		
		document.getElementById('totalRooms').textContent = totalRooms;
		document.getElementById('roomsAvailable').textContent = `${availableRooms} ห้องว่าง`;
	} else {
		console.error('Failed to load rooms:', roomsResponse.status);
	}

	if (bookingsResponse.ok) {
		const bookings = await bookingsResponse.json();
		console.log('Bookings loaded:', bookings);
		const todayBookings = Array.isArray(bookings) ? bookings.filter(booking => {
			const bookingDate = new Date(booking.created_at || booking.start_time);
			const today = new Date();
			return bookingDate.toDateString() === today.toDateString();
		}).length : 0;
		
		const totalRevenue = Array.isArray(bookings) ? bookings
			.filter(booking => booking.payment_status === 'paid')
			.reduce((sum, booking) => sum + parseFloat(booking.total_price || 0), 0) : 0;

		document.getElementById('totalBookings').textContent = todayBookings;
		document.getElementById('bookingsChange').textContent = `+${todayBookings} ใหม่วันนี้`;
		document.getElementById('totalRevenue').textContent = `฿${totalRevenue.toLocaleString()}`;
		document.getElementById('revenueChange').textContent = `฿${totalRevenue.toLocaleString()} เพิ่มขึ้น`;
	} else {
		console.error('Failed to load bookings:', bookingsResponse.status);
	}
	
	console.log('✅ Statistics loaded successfully');
	return { success: true };
}

// Refresh statistics manually
async function refreshStats() {
	const refreshBtn = document.getElementById('refreshBtn');
	if (!refreshBtn) return;
	
	const originalHTML = refreshBtn.innerHTML;
	
	// Show loading state
	refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> รีเฟรช...';
	refreshBtn.disabled = true;
	
	try {
		// Reset stats loaded flag to allow reload
		window.statsLoaded = false;
		await loadAdminStats(true); // Force reload
		if (typeof showToast === 'function') {
			showToast('อัปเดตข้อมูลเรียบร้อยแล้ว', 'success');
		}
	} catch (error) {
		console.error('Refresh failed:', error);
		if (typeof showToast === 'function') {
			showToast('ไม่สามารถรีเฟรชข้อมูลได้', 'error');
		}
	} finally {
		// Restore button state
		setTimeout(() => {
			refreshBtn.innerHTML = originalHTML;
			refreshBtn.disabled = false;
		}, 1000);
	}
}

// Show management sections
function showManageRooms() {
	hideAllSections();
	document.getElementById('manageRooms').style.display = 'block';
	loadRooms();
}

function showManageBookings() {
	hideAllSections();
	document.getElementById('manageBookings').style.display = 'block';
	loadBookings();
}

function showManageUsers() {
	hideAllSections();
	document.getElementById('manageUsers').style.display = 'block';
	loadUsers();
}

function showReports() {
	hideAllSections();
	document.getElementById('reports').style.display = 'block';
}

function hideAllSections() {
	const sections = document.querySelectorAll('.management-section');
	sections.forEach(section => {
		section.style.display = 'none';
	});
}

// Load functions for management sections
async function loadRooms() {
	console.log('📋 Loading rooms table...');
	const tableBody = document.getElementById('roomsTableBody');
	if (!tableBody) {
		console.warn('❌ Rooms table body not found');
		return;
	}

	try {
		// Show loading state
		tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> กำลังโหลด...</td></tr>';
		
		const token = localStorage.getItem('token');
		const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
		
		const response = await fetch('/api/admin/rooms', { headers });
		
		if (response.ok) {
			const data = await response.json();
			console.log('✅ Rooms data loaded:', data);
			
			const rooms = Array.isArray(data.rooms) ? data.rooms : [];
			
			if (rooms.length === 0) {
				tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่มีข้อมูลห้อง</td></tr>';
				return;
			}

			tableBody.innerHTML = rooms.map(room => `
				<tr>
					<td>${room.room_id || ''}</td>
					<td>${room.name || 'ไม่ระบุ'}</td>
					<td>${room.capacity || 'ไม่ระบุ'}</td>
					<td>฿${room.price_per_hour || 0}</td>
					<td><span class="status ${room.status || 'unknown'}">${getStatusText(room.status)}</span></td>
					<td>
						<button class="btn btn-sm btn-primary" onclick="editRoom(${room.room_id})">
							<i class="fas fa-edit"></i>
						</button>
						<button class="btn btn-sm btn-danger" onclick="deleteRoom(${room.room_id}, '${(room.name || '').replace(/'/g, '\\\'')}')" title="ลบห้อง">
							<i class="fas fa-trash"></i>
						</button>
					</td>
				</tr>
			`).join('');
		} else {
			console.error('❌ Failed to load rooms:', response.status);
			tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-error">ไม่สามารถโหลดข้อมูลได้</td></tr>';
		}
	} catch (error) {
		console.error('💥 Error loading rooms:', error);
		tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-error">เกิดข้อผิดพลาด: ' + error.message + '</td></tr>';
	}
}

async function loadBookings() {
	console.log('📋 Loading bookings table...');
	const tableBody = document.getElementById('bookingsTableBody');
	if (!tableBody) {
		console.warn('❌ Bookings table body not found');
		return;
	}

	try {
		// Show loading state
		tableBody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin"></i> กำลังโหลด...</td></tr>';
		
		const token = localStorage.getItem('token');
		const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
		
		const response = await fetch('/api/bookings', { headers });
		
		if (response.ok) {
			const bookings = await response.json();
			console.log('✅ Bookings data loaded:', bookings);
			
			const bookingsArray = Array.isArray(bookings) ? bookings : [];
			
			if (bookingsArray.length === 0) {
				tableBody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่มีข้อมูลการจอง</td></tr>';
				return;
			}

			tableBody.innerHTML = bookingsArray.map(booking => `
				<tr>
					<td>${booking.booking_id || ''}</td>
					<td>${booking.room_name || 'ไม่ระบุ'}</td>
					<td>${booking.user_name || 'ไม่ระบุ'}</td>
					<td>${formatDate(booking.start_time)}</td>
					<td>฿${booking.total_price || 0}</td>
					<td><span class="status ${booking.status || 'unknown'}">${getBookingStatusText(booking.status)}</span></td>
					<td>
						<button class="btn btn-sm btn-primary" onclick="viewBooking(${booking.booking_id})">
							<i class="fas fa-eye"></i>
						</button>
						<button class="btn btn-sm btn-warning" onclick="editBooking(${booking.booking_id})">
							<i class="fas fa-edit"></i>
						</button>
					</td>
				</tr>
			`).join('');
		} else {
			console.error('❌ Failed to load bookings:', response.status);
			tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-error">ไม่สามารถโหลดข้อมูลได้</td></tr>';
		}
	} catch (error) {
		console.error('💥 Error loading bookings:', error);
		tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-error">เกิดข้อผิดพลาด: ' + error.message + '</td></tr>';
	}
}

async function loadUsers() {
	console.log('📋 Loading users table...');
	const tableBody = document.getElementById('usersTableBody');
	if (!tableBody) {
		console.warn('❌ Users table body not found');
		return;
	}

	try {
		// Show loading state
		tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> กำลังโหลด...</td></tr>';
		
		const token = localStorage.getItem('token');
		const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
		
		const response = await fetch('/api/admin/users', { headers });
		
		if (response.ok) {
			const data = await response.json();
			console.log('✅ Users data loaded:', data);
			
			const users = Array.isArray(data.users) ? data.users : [];
			
			if (users.length === 0) {
				tableBody.innerHTML = '<tr><td colspan="6" class="text-center">ไม่มีข้อมูลผู้ใช้</td></tr>';
				return;
			}

			tableBody.innerHTML = users.map(user => `
				<tr>
					<td>${user.user_id || ''}</td>
					<td>${user.name || 'ไม่ระบุ'}</td>
					<td>${user.email || 'ไม่ระบุ'}</td>
					<td><span class="status-badge ${getRoleClass(user.role_id)}">${getRoleText(user.role_id)}</span></td>
					<td><span class="status-badge ${user.status || 'unknown'}">${getStatusText(user.status)}</span></td>
					<td class="actions">
						<button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})" title="แก้ไข">
							<i class="fas fa-edit"></i>
						</button>
						<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id}, '${(user.name || '').replace(/'/g, '\\\'')}')" title="ลบ">
							<i class="fas fa-trash"></i>
						</button>
					</td>
				</tr>
			`).join('');
		} else {
			console.error('❌ Failed to load users:', response.status);
			tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-error">ไม่สามารถโหลดข้อมูลได้</td></tr>';
		}
	} catch (error) {
		console.error('💥 Error loading users:', error);
		tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-error">เกิดข้อผิดพลาด: ' + error.message + '</td></tr>';
	}
}

// Helper functions for displaying data
function getStatusText(status) {
	const statusMap = {
		// Room status
		'available': 'ว่าง',
		'occupied': 'ไม่ว่าง',
		'maintenance': 'ซ่อมบำรุง',
		'inactive': 'ปิดใช้งาน',
		// User status
		'active': 'ใช้งาน',
		'inactive': 'ไม่ใช้งาน',
		'suspended': 'ระงับ'
	};
	return statusMap[status] || status || 'ไม่ระบุ';
}

function getRoleText(roleId) {
	const roleMap = {
		1: 'ผู้ดูแลระบบ',
		2: 'ลูกค้า'
	};
	return roleMap[roleId] || 'ไม่ระบุ';
}

function getRoleClass(roleId) {
	const roleClassMap = {
		1: 'admin',
		2: 'customer'
	};
	return roleClassMap[roleId] || 'unknown';
}

function getBookingStatusText(status) {
	const statusMap = {
		'pending': 'รอดำเนินการ',
		'confirmed': 'ยืนยันแล้ว',
		'completed': 'เสร็จสิ้น',
		'cancelled': 'ยกเลิก'
	};
	return statusMap[status] || status || 'ไม่ระบุ';
}

function getRoleText(roleId) {
	const roleMap = {
		1: 'ผู้ดูแลระบบ',
		2: 'ผู้ใช้ทั่วไป'
	};
	return roleMap[roleId] || 'ไม่ระบุ';
}

function formatDate(dateString) {
	if (!dateString) return 'ไม่ระบุ';
	const date = new Date(dateString);
	return date.toLocaleDateString('th-TH', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

// Management action functions (Real implementations)
async function editRoom(roomId) {
	console.log('📝 Edit room:', roomId);
	try {
		const token = localStorage.getItem('token');
		const response = await fetch(`/api/admin/rooms/${roomId}`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (!response.ok) throw new Error('Failed to load room details');

		const data = await response.json();
		const room = data.room;

		// Populate form
		document.getElementById('roomId').value = room.room_id;
		document.getElementById('roomName').value = room.name;
		document.getElementById('roomType').value = room.type_id;
		document.getElementById('roomCapacity').value = room.capacity || 1;
		document.getElementById('roomStatus').value = room.status;
		if (room.description) document.getElementById('roomDescription').value = room.description;

		// Update modal title
		document.getElementById('roomModalTitle').textContent = 'แก้ไขห้อง';

		// Show modal
		const modal = document.getElementById('roomModal');
		modal.style.display = 'flex';
		modal.classList.add('show');
		document.getElementById('roomName').focus();

	} catch (error) {
		console.error('💥 Failed to load room for editing:', error);
		if (typeof showToast === 'function') {
			showToast('ไม่สามารถโหลดข้อมูลห้องได้: ' + error.message, 'error');
		}
	}
}

function deleteRoom(roomId, roomName) {
	console.log('🗑️ Delete room:', roomId);
	
	// Set data for delete modal
	document.getElementById('deleteRoomName').textContent = roomName || `ID: ${roomId}`;
	window.currentDeleteRoomId = roomId;
	
	// Show delete confirmation modal
	const deleteModal = document.getElementById('deleteRoomModal');
	deleteModal.style.display = 'flex';
	deleteModal.classList.add('show');
}

function viewBooking(bookingId) {
	console.log('View booking:', bookingId);
	if (typeof showToast === 'function') {
		showToast('ฟีเจอร์ดูรายละเอียดการจองจะเพิ่มเติมในเร็วๆ นี้', 'info');
	}
}

function editBooking(bookingId) {
	console.log('Edit booking:', bookingId);
	if (typeof showToast === 'function') {
		showToast('ฟีเจอร์แก้ไขการจองจะเพิ่มเติมในเร็วๆ นี้', 'info');
	}
}

function editUser(userId) {
	console.log('Edit user:', userId);
	if (typeof showToast === 'function') {
		showToast('ฟีเจอร์แก้ไขผู้ใช้จะเพิ่มเติมในเร็วๆ นี้', 'info');
	}
}

function deleteUser(userId) {
	console.log('Delete user:', userId);
	if (confirm('คุณต้องการลบผู้ใช้นี้หรือไม่?')) {
		if (typeof showToast === 'function') {
			showToast('ฟีเจอร์ลบผู้ใช้จะเพิ่มเติมในเร็วๆ นี้', 'info');
		}
	}
}

// Add Room Modal
function showAddRoomForm() {
	console.log('➕ Show add room form');
	
	// Reset form
	document.getElementById('roomForm').reset();
	document.getElementById('roomId').value = '';
	
	// Update modal title
	document.getElementById('roomModalTitle').textContent = 'เพิ่มห้องใหม่';
	
	// Show modal
	const modal = document.getElementById('roomModal');
	modal.style.display = 'flex';
	modal.classList.add('show');
	document.getElementById('roomName').focus();
}

// Close Room Modal
function closeRoomModal() {
	const modal = document.getElementById('roomModal');
	modal.style.display = 'none';
	modal.classList.remove('show');
	document.getElementById('roomForm').reset();
}

// Close Delete Room Modal
function closeDeleteRoomModal() {
	const deleteModal = document.getElementById('deleteRoomModal');
	deleteModal.style.display = 'none';
	deleteModal.classList.remove('show');
	window.currentDeleteRoomId = null;
}

// Confirm Delete Room
async function confirmDeleteRoom() {
	const roomId = window.currentDeleteRoomId;
	if (!roomId) {
		console.warn('⚠️ No room ID to delete');
		return;
	}

	try {
		console.log('🗑️ Confirming delete room:', roomId);
		
		const token = localStorage.getItem('token');
		const response = await fetch(`/api/admin/rooms/${roomId}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (response.ok) {
			console.log('✅ Room deleted successfully');
			closeDeleteRoomModal();
			if (typeof showToast === 'function') {
				showToast('ลบห้องเรียบร้อยแล้ว', 'success');
			}
			// Reload rooms table
			loadRooms();
		} else {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to delete room');
		}
	} catch (error) {
		console.error('💥 Failed to delete room:', error);
		if (typeof showToast === 'function') {
			showToast('ไม่สามารถลบห้องได้: ' + error.message, 'error');
		}
	}
}

// Submit Room Form (Add/Edit)
async function submitRoomForm(event) {
	event.preventDefault();
	
	const formData = new FormData(event.target);
	const roomId = document.getElementById('roomId').value;
	const isEdit = !!roomId;
	
	const roomData = {
		name: formData.get('name').trim(),
		type_id: parseInt(formData.get('type_id')),
		capacity: parseInt(formData.get('capacity')) || 1,
		status: formData.get('status'),
		description: formData.get('description') || ''
	};

	// Client-side validation
	if (!roomData.name) {
		if (typeof showToast === 'function') {
			showToast('กรุณากรอกชื่อห้อง', 'error');
		}
		return;
	}
	if (!roomData.type_id) {
		if (typeof showToast === 'function') {
			showToast('กรุณาเลือกประเภทห้อง', 'error');
		}
		return;
	}

	try {
		console.log(`💾 ${isEdit ? 'Updating' : 'Creating'} room:`, roomData);
		
		const token = localStorage.getItem('token');
		const url = isEdit ? `/api/admin/rooms/${roomId}` : '/api/admin/rooms';
		const method = isEdit ? 'PUT' : 'POST';
		
		const response = await fetch(url, {
			method: method,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify(roomData)
		});

		if (response.ok) {
			const result = await response.json();
			console.log('✅ Room saved successfully:', result);
			
			closeRoomModal();
			if (typeof showToast === 'function') {
				showToast(isEdit ? 'แก้ไขห้องเรียบร้อยแล้ว' : 'เพิ่มห้องเรียบร้อยแล้ว', 'success');
			}
			
			// Reload rooms table
			loadRooms();
		} else {
			const errorData = await response.json();
			throw new Error(errorData.error || `Failed to ${isEdit ? 'update' : 'create'} room`);
		}
	} catch (error) {
		console.error('💥 Failed to save room:', error);
		if (typeof showToast === 'function') {
			showToast(`ไม่สามารถ${isEdit ? 'แก้ไข' : 'เพิ่ม'}ห้องได้: ` + error.message, 'error');
		}
	}
}

// Toast Notification Function
function showToast(message, type = 'info', duration = 3000) {
	// Remove existing toast if any
	const existingToast = document.querySelector('.toast');
	if (existingToast) {
		existingToast.remove();
	}

	// Create toast element
	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	
	// Style the toast
	toast.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		padding: 12px 24px;
		background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
		color: white;
		border-radius: 4px;
		box-shadow: 0 2px 5px rgba(0,0,0,0.2);
		z-index: 10000;
		font-size: 14px;
		opacity: 0;
		transform: translateX(100%);
		transition: all 0.3s ease;
	`;

	// Add to document
	document.body.appendChild(toast);
	
	// Animate in
	setTimeout(() => {
		toast.style.opacity = '1';
		toast.style.transform = 'translateX(0)';
	}, 100);
	
	// Animate out and remove
	setTimeout(() => {
		toast.style.opacity = '0';
		toast.style.transform = 'translateX(100%)';
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

// Additional Modal Functions for Other Management Sections

// === USER MANAGEMENT FUNCTIONS ===

// Add User Modal
function showAddUserForm() {
	console.log('➕ Show add user form');
	
	// Reset form
	document.getElementById('userForm').reset();
	document.getElementById('userId').value = '';
	
	// Update modal title and password field
	document.getElementById('userModalTitle').textContent = 'เพิ่มผู้ใช้ใหม่';
	document.getElementById('passwordLabel').textContent = 'รหัสผ่าน *';
	document.getElementById('userPassword').required = true;
	document.getElementById('passwordHint').textContent = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
	
	// Show modal
	const modal = document.getElementById('userModal');
	modal.style.display = 'flex';
	modal.classList.add('show');
	document.getElementById('userName').focus();
}

// Edit User
async function editUser(userId) {
	console.log('✏️ Edit user:', userId);
	
	try {
		const token = localStorage.getItem('token');
		const response = await fetch(`/api/admin/users/${userId}`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});
		
		if (response.ok) {
			const data = await response.json();
			const user = data.user;
			
			// Fill form with user data
			document.getElementById('userId').value = user.user_id;
			document.getElementById('userName').value = user.name || '';
			document.getElementById('userEmail').value = user.email || '';
			document.getElementById('userRole').value = user.role_id || '';
			document.getElementById('userStatus').value = user.status || 'active';
			
			// Clear password field for editing and make it optional
			document.getElementById('userPassword').value = '';
			document.getElementById('userPassword').required = false;
			document.getElementById('passwordLabel').textContent = 'รหัสผ่านใหม่ (ไม่บังคับ)';
			document.getElementById('passwordHint').textContent = 'ไม่ต้องกรอกหากไม่ต้องการเปลี่ยนรหัสผ่าน';
			
			// Update modal title
			document.getElementById('userModalTitle').textContent = 'แก้ไขข้อมูลผู้ใช้';

			// Show modal
			const modal = document.getElementById('userModal');
			modal.style.display = 'flex';
			modal.classList.add('show');
			document.getElementById('userName').focus();

		} else {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to load user');
		}
	} catch (error) {
		console.error('💥 Failed to load user for editing:', error);
		if (typeof showToast === 'function') {
			showToast('ไม่สามารถโหลดข้อมูลผู้ใช้ได้: ' + error.message, 'error');
		}
	}
}

// Delete User
function deleteUser(userId, userName) {
	console.log('🗑️ Delete user:', userId, userName);
	
	// Create delete confirmation modal if doesn't exist
	if (!document.getElementById('deleteUserModal')) {
		const deleteModal = document.createElement('div');
		deleteModal.id = 'deleteUserModal';
		deleteModal.className = 'modal';
		deleteModal.onclick = function(event) { if(event.target === this) closeDeleteUserModal(); };
		deleteModal.innerHTML = `
			<div class="modal-content small">
				<div class="modal-header">
					<h2>ยืนยันการลบผู้ใช้</h2>
					<span class="close" onclick="closeDeleteUserModal()">&times;</span>
				</div>
				<div class="modal-body">
					<p>คุณต้องการลบผู้ใช้ <strong id="deleteUserName"></strong> หรือไม่?</p>
					<p class="text-warning">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
				</div>
				<div class="modal-actions">
					<button type="button" class="btn btn-outline" onclick="closeDeleteUserModal()">ยกเลิก</button>
					<button type="button" class="btn btn-danger" onclick="confirmDeleteUser()">
						<i class="fas fa-trash"></i>
						ลบผู้ใช้
					</button>
				</div>
			</div>
		`;
		document.body.appendChild(deleteModal);
	}
	
	// Set data for delete modal
	document.getElementById('deleteUserName').textContent = userName || `ID: ${userId}`;
	window.currentDeleteUserId = userId;
	
	// Show delete confirmation modal
	const deleteModal = document.getElementById('deleteUserModal');
	deleteModal.style.display = 'flex';
	deleteModal.classList.add('show');
}

// Close User Modal
function closeUserModal() {
	const modal = document.getElementById('userModal');
	modal.style.display = 'none';
	modal.classList.remove('show');
	document.getElementById('userForm').reset();
}

// Close Delete User Modal
function closeDeleteUserModal() {
	const deleteModal = document.getElementById('deleteUserModal');
	if (deleteModal) {
		deleteModal.style.display = 'none';
		deleteModal.classList.remove('show');
	}
	window.currentDeleteUserId = null;
}

// Confirm Delete User
async function confirmDeleteUser() {
	const userId = window.currentDeleteUserId;
	if (!userId) {
		console.warn('⚠️ No user ID to delete');
		return;
	}

	try {
		console.log('🗑️ Confirming delete user:', userId);
		
		const token = localStorage.getItem('token');
		const response = await fetch(`/api/admin/users/${userId}`, {
			method: 'DELETE',
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (response.ok) {
			console.log('✅ User deleted successfully');
			closeDeleteUserModal();
			if (typeof showToast === 'function') {
				showToast('ลบผู้ใช้เรียบร้อยแล้ว', 'success');
			}
			// Reload users table
			loadUsers();
		} else {
			const errorData = await response.json();
			throw new Error(errorData.error || 'Failed to delete user');
		}
	} catch (error) {
		console.error('💥 Failed to delete user:', error);
		if (typeof showToast === 'function') {
			showToast('ไม่สามารถลบผู้ใช้ได้: ' + error.message, 'error');
		}
	}
}

// Submit User Form (Add/Edit)
async function submitUserForm(event) {
	event.preventDefault();
	
	const formData = new FormData(event.target);
	const userId = document.getElementById('userId').value;
	const isEdit = !!userId;
	
	const userData = {
		name: formData.get('name').trim(),
		email: formData.get('email').trim(),
		role_id: parseInt(formData.get('role_id')),
		status: formData.get('status')
	};

	// Add password only if provided (required for new users, optional for edits)
	const password = formData.get('password');
	if (password) {
		userData.password = password;
	} else if (!isEdit) {
		// Password required for new users
		if (typeof showToast === 'function') {
			showToast('กรุณากรอกรหัสผ่าน', 'error');
		}
		return;
	}

	// Client-side validation
	if (!userData.name) {
		if (typeof showToast === 'function') {
			showToast('กรุณากรอกชื่อ-นามสกุล', 'error');
		}
		return;
	}
	if (!userData.email) {
		if (typeof showToast === 'function') {
			showToast('กรุณากรอกอีเมล', 'error');
		}
		return;
	}
	if (!userData.role_id) {
		if (typeof showToast === 'function') {
			showToast('กรุณาเลือกบทบาท', 'error');
		}
		return;
	}

	try {
		console.log(`💾 ${isEdit ? 'Updating' : 'Creating'} user:`, userData);
		
		const token = localStorage.getItem('token');
		const url = isEdit ? `/api/admin/users/${userId}` : '/api/admin/users';
		const method = isEdit ? 'PUT' : 'POST';
		
		const response = await fetch(url, {
			method: method,
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify(userData)
		});

		if (response.ok) {
			const result = await response.json();
			console.log('✅ User saved successfully:', result);
			
			closeUserModal();
			if (typeof showToast === 'function') {
				showToast(isEdit ? 'แก้ไขผู้ใช้เรียบร้อยแล้ว' : 'เพิ่มผู้ใช้เรียบร้อยแล้ว', 'success');
			}
			
			// Reload users table
			loadUsers();
		} else {
			const errorData = await response.json();
			throw new Error(errorData.error || `Failed to ${isEdit ? 'update' : 'create'} user`);
		}
	} catch (error) {
		console.error('💥 Failed to save user:', error);
		if (typeof showToast === 'function') {
			showToast(`ไม่สามารถ${isEdit ? 'แก้ไข' : 'เพิ่ม'}ผู้ใช้ได้: ` + error.message, 'error');
		}
	}
}

function closeBookingModal() {
	const modal = document.getElementById('bookingModal');
	modal.style.display = 'none';
	modal.classList.remove('show');
}

function closeConfirmModal() {
	document.getElementById('confirmModal').style.display = 'none';
}

// Logout function
function logout() {
	console.log('🔓 Logging out...');
	
	// Clear all stored data
	localStorage.clear();
	sessionStorage.clear();
	
	// Notify user
	if (typeof showToast === 'function') {
		showToast('ออกจากระบบเรียบร้อยแล้ว', 'success');
	}
	
	// Redirect to login page
	setTimeout(() => {
		window.location.replace('/auth');
	}, 500);
}

// Toast notification function (if not already defined)
function showToast(message, type = 'info') {
	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.textContent = message;
	toast.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		padding: 12px 24px;
		background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
		color: white;
		border-radius: 4px;
		box-shadow: 0 4px 8px rgba(0,0,0,0.2);
		z-index: 10000;
		font-size: 14px;
		font-weight: 500;
		opacity: 0;
		transform: translateX(100%);
		transition: all 0.3s ease;
	`;
	
	document.body.appendChild(toast);
	
	// Animate in
	setTimeout(() => {
		toast.style.opacity = '1';
		toast.style.transform = 'translateX(0)';
	}, 10);
	
	// Remove after delay
	setTimeout(() => {
		toast.style.opacity = '0';
		toast.style.transform = 'translateX(100%)';
		setTimeout(() => {
			if (toast.parentNode) {
				toast.parentNode.removeChild(toast);
			}
		}, 300);
	}, 3000);
}
