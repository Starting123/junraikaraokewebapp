// ==========================================
// Admin Page JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
	// Navigation toggle
	const navToggle = document.getElementById('navToggle');
	const navMenu = document.getElementById('navMenu');
	if (navToggle && navMenu) {
		navToggle.addEventListener('click', function() {
			navMenu.classList.toggle('active');
			navToggle.classList.toggle('active');
		});
	}

	// Check admin authentication
	if (typeof checkAdminAuth === 'function') {
		checkAdminAuth();
	}

	// Logout functionality
	const logoutBtn = document.getElementById('logoutBtn');
	if (logoutBtn && typeof logout === 'function') {
		logoutBtn.addEventListener('click', logout);
	}

	// Load admin statistics
	if (typeof loadAdminStats === 'function') {
		loadAdminStats();
	}
});

// Check admin authentication
async function checkAdminAuth() {
	// Prevent infinite redirect loops
	if (window.location.pathname === '/auth') {
		return;
	}
    
	const token = localStorage.getItem('token');
	if (!token) {
		console.log('No auth token found, redirecting to auth page');
		window.location.href = '/auth';
		return;
	}
    
	// Check if we're already checking auth to prevent multiple simultaneous calls
	if (window.checkingAuth) {
		return;
	}
    
	window.checkingAuth = true;
    
	try {
		const response = await fetch('/api/auth/me', {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});
        
		if (response.ok) {
			const data = await response.json();
            
			// Check if user is admin
			if (data.user.role_id !== 1) {
				alert('\u0e04\u0e38\u0e13\u0e44\u0e21\u0e48\u0e21\u0e35\u0e2a\u0e34\u0e17\u0e18\u0e34\u0e4c\u0e40\u0e02\u0e49\u0e32\u0e16\u0e36\u0e07\u0e2b\u0e19\u0e49\u0e32\u0e19\u0e35\u0e49');
				window.location.href = '/dashboard';
				return;
			}
            
			updateUserInfo(data.user);
		} else {
			throw new Error('Authentication failed');
		}
	} catch (error) {
		console.error('Auth check failed:', error);
		localStorage.removeItem('token');
		localStorage.removeItem('user');
        
		// Only redirect if we're not already on auth page
		if (window.location.pathname !== '/auth') {
			window.location.href = '/auth';
		}
	} finally {
		window.checkingAuth = false;
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
async function loadAdminStats() {
	try {
		const token = localStorage.getItem('token');
		if (!token) {
			console.error('No authentication token found');
			return;
		}

		console.log('Loading admin statistics...');

		// Load basic statistics
		const [usersResponse, roomsResponse, bookingsResponse] = await Promise.all([
			fetch('/api/admin/users', {
				headers: { 'Authorization': `Bearer ${token}` }
			}),
			fetch('/api/admin/rooms', {
				headers: { 'Authorization': `Bearer ${token}` }
			}),
			fetch('/api/bookings', {
				headers: { 'Authorization': `Bearer ${token}` }
			})
		]);

		if (usersResponse.ok) {
			const users = await usersResponse.json();
			console.log('Users loaded:', users);
			document.getElementById('totalUsers').textContent = users.length || 0;
			document.getElementById('usersChange').textContent = `+0 ใหม่วันนี้`;
		} else {
			console.error('Failed to load users:', usersResponse.status);
		}

		if (roomsResponse.ok) {
			const rooms = await roomsResponse.json();
			console.log('Rooms loaded:', rooms);
			const totalRooms = rooms.length || 0;
			const availableRooms = rooms.filter(room => room.status === 'available').length || 0;
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
	} catch (error) {
		console.error('Error loading admin statistics:', error);
		if (typeof showToast === 'function') {
			showToast('ไม่สามารถโหลดข้อมูลสถิติได้', 'error');
		}
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
	console.log('Loading rooms table...');
	// TODO: Implement rooms table loading
}

async function loadBookings() {
	console.log('Loading bookings table...');
	// TODO: Implement bookings table loading
}

async function loadUsers() {
	console.log('Loading users table...');
	// TODO: Implement users table loading
}

// Modal functions
function showAddRoomForm() {
	document.getElementById('roomModal').style.display = 'block';
}

function closeRoomModal() {
	document.getElementById('roomModal').style.display = 'none';
}

function showAddUserForm() {
	document.getElementById('userModal').style.display = 'block';
}

function closeUserModal() {
	document.getElementById('userModal').style.display = 'none';
}

function closeBookingModal() {
	document.getElementById('bookingModal').style.display = 'none';
}

function closeConfirmModal() {
	document.getElementById('confirmModal').style.display = 'none';
}

// Logout function
