// ==========================================
// Admin Rooms Management JavaScript
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initializeRoomsPage();
});

// Global variables
let currentPage = 1;
let totalPages = 1;
let roomToDelete = null;
const itemsPerPage = 20;

// Initialize the rooms management page
async function initializeRoomsPage() {
    try {
        await checkAuthAndRedirect();
        await loadRoomTypes();
        await loadRooms();
        setupEventListeners();
    } catch (error) {
        console.error('Failed to initialize rooms page:', error);
        showToast('Failed to load rooms data', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');

    // Debounced search
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadRooms();
        }, 500);
    });

    // Filter changes
    statusFilter.addEventListener('change', () => {
        currentPage = 1;
        loadRooms();
    });
    
    typeFilter.addEventListener('change', () => {
        currentPage = 1;
        loadRooms();
    });

    // Modal close on outside click
    window.addEventListener('click', function(event) {
        const roomModal = document.getElementById('roomModal');
        const deleteModal = document.getElementById('deleteModal');
        
        if (event.target === roomModal) {
            closeRoomModal();
        }
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

// Check authentication and redirect if needed
async function checkAuthAndRedirect() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/auth';
        throw new Error('No authentication token');
    }

    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/auth';
            throw new Error('Invalid token');
        }

        const data = await response.json();
        if (data.user.role_id !== 1) {
            window.location.href = '/dashboard';
            throw new Error('Insufficient permissions');
        }
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '/auth';
        throw error;
    }
}

// Load room types for filters and form
async function loadRoomTypes() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/room-types', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load room types');

        const data = await response.json();
        populateRoomTypeSelects(data.roomTypes || []);
    } catch (error) {
        console.error('Failed to load room types:', error);
        showToast('Failed to load room types', 'error');
    }
}

// Populate room type select elements
function populateRoomTypeSelects(roomTypes) {
    const typeFilter = document.getElementById('typeFilter');
    const roomTypeId = document.getElementById('roomTypeId');

    // Clear existing options
    typeFilter.innerHTML = '<option value="">All Types</option>';
    roomTypeId.innerHTML = '<option value="">Select Room Type</option>';

    roomTypes.forEach(type => {
        const filterOption = new Option(type.type_name, type.type_id);
        const formOption = new Option(`${type.type_name} (฿${type.price_per_hour}/hr)`, type.type_id);
        
        typeFilter.add(filterOption);
        roomTypeId.add(formOption);
    });
}

// Load rooms with pagination and filters
async function loadRooms() {
    try {
        const token = localStorage.getItem('token');
        const searchQuery = document.getElementById('searchInput').value.trim();
        const statusFilter = document.getElementById('statusFilter').value;
        const typeFilter = document.getElementById('typeFilter').value;

        const params = new URLSearchParams({
            page: currentPage,
            limit: itemsPerPage
        });

        if (searchQuery) params.append('q', searchQuery);
        if (statusFilter) params.append('status', statusFilter);
        if (typeFilter) params.append('type_id', typeFilter);

        showTableLoading(true);

        const response = await fetch(`/api/admin/rooms?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load rooms');

        const data = await response.json();
        displayRooms(data.rooms || []);
        updatePagination(data.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
        
    } catch (error) {
        console.error('Failed to load rooms:', error);
        showToast('Failed to load rooms', 'error');
        displayRooms([]);
    } finally {
        showTableLoading(false);
    }
}

// Display rooms in table
function displayRooms(rooms) {
    const tableBody = document.getElementById('roomsTableBody');
    const emptyState = document.getElementById('emptyState');

    if (rooms.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    tableBody.innerHTML = rooms.map(room => `
        <tr data-room-id="${room.room_id}">
            <td>#${room.room_id}</td>
            <td>
                <strong>${escapeHtml(room.name)}</strong>
            </td>
            <td>
                <span class="badge badge-info">${escapeHtml(room.type_name || 'Unknown')}</span>
            </td>
            <td>
                <i class="fas fa-users"></i> ${room.capacity || 1}
            </td>
            <td>
                <strong>฿${(room.price_per_hour || 0).toLocaleString()}</strong>
            </td>
            <td>
                <span class="badge badge-${getStatusBadgeClass(room.status)}">
                    ${getStatusDisplayText(room.status)}
                </span>
            </td>
            <td class="actions">
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="editRoom(${room.room_id})" 
                            title="Edit Room">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline text-danger" 
                            onclick="showDeleteModal(${room.room_id}, '${escapeHtml(room.name)}')" 
                            title="Delete Room">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get status badge CSS class
function getStatusBadgeClass(status) {
    switch (status) {
        case 'available': return 'success';
        case 'occupied': return 'warning';
        case 'maintenance': return 'danger';
        default: return 'secondary';
    }
}

// Get status display text
function getStatusDisplayText(status) {
    switch (status) {
        case 'available': return 'Available';
        case 'occupied': return 'Occupied';
        case 'maintenance': return 'Maintenance';
        default: return 'Unknown';
    }
}

// Show/hide table loading state
function showTableLoading(isLoading) {
    const tableBody = document.getElementById('roomsTableBody');
    
    if (isLoading) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-spinner fa-spin"></i> Loading rooms...
                </td>
            </tr>
        `;
    }
}

// Update pagination controls
function updatePagination(pagination) {
    currentPage = pagination.currentPage || 1;
    totalPages = pagination.totalPages || 1;
    
    const paginationInfo = document.getElementById('paginationInfo');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    // Update info text
    const start = ((currentPage - 1) * itemsPerPage) + 1;
    const end = Math.min(currentPage * itemsPerPage, pagination.totalItems || 0);
    paginationInfo.textContent = `Showing ${start}-${end} of ${pagination.totalItems || 0} rooms`;

    // Update page numbers
    pageNumbers.innerHTML = generatePageNumbers();

    // Update button states
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
}

// Generate page number buttons
function generatePageNumbers() {
    if (totalPages <= 1) return '';

    let html = '';
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
        html += `
            <button class="btn btn-outline ${i === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    return html;
}

// Navigate to specific page
function goToPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        loadRooms();
    }
}

// Change page by offset
function changePage(offset) {
    goToPage(currentPage + offset);
}

// Show add room modal
function showAddRoomModal() {
    document.getElementById('modalTitle').textContent = 'Add New Room';
    document.getElementById('submitBtnText').textContent = 'Add Room';
    document.getElementById('roomForm').reset();
    document.getElementById('roomId').value = '';
    document.getElementById('roomModal').style.display = 'block';
    document.getElementById('roomName').focus();
}

// Edit existing room
async function editRoom(roomId) {
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
        document.getElementById('roomTypeId').value = room.type_id;
        document.getElementById('roomCapacity').value = room.capacity || 1;
        document.getElementById('roomStatus').value = room.status;

        // Update modal title
        document.getElementById('modalTitle').textContent = 'Edit Room';
        document.getElementById('submitBtnText').textContent = 'Update Room';

        // Show modal
        document.getElementById('roomModal').style.display = 'block';
        document.getElementById('roomName').focus();

    } catch (error) {
        console.error('Failed to load room for editing:', error);
        showToast('Failed to load room details', 'error');
    }
}

// Submit room form (add/edit)
async function submitRoomForm(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const roomId = formData.get('roomId') || document.getElementById('roomId').value;
    const isEdit = !!roomId;

    const roomData = {
        name: formData.get('name').trim(),
        type_id: parseInt(formData.get('type_id')),
        capacity: parseInt(formData.get('capacity')) || 1,
        status: formData.get('status')
    };

    // Client-side validation
    if (!roomData.name) {
        showToast('Room name is required', 'error');
        return;
    }
    if (!roomData.type_id) {
        showToast('Room type is required', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const url = isEdit ? `/api/admin/rooms/${roomId}` : '/api/admin/rooms';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'CSRF-Token': formData.get('_csrf') || ''
            },
            body: JSON.stringify(roomData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || 'Operation failed');
        }

        const result = await response.json();
        
        showToast(
            isEdit ? 'Room updated successfully' : 'Room added successfully', 
            'success'
        );
        
        closeRoomModal();
        loadRooms();

    } catch (error) {
        console.error('Failed to save room:', error);
        showToast(error.message || 'Failed to save room', 'error');
    }
}

// Show delete confirmation modal
function showDeleteModal(roomId, roomName) {
    roomToDelete = roomId;
    document.getElementById('deleteRoomName').textContent = roomName;
    document.getElementById('deleteModal').style.display = 'block';
}

// Confirm room deletion
async function confirmDeleteRoom() {
    if (!roomToDelete) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/rooms/${roomToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'CSRF-Token': document.querySelector('input[name="_csrf"]')?.value || ''
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || 'Delete failed');
        }

        showToast('Room deleted successfully', 'success');
        closeDeleteModal();
        loadRooms();

    } catch (error) {
        console.error('Failed to delete room:', error);
        showToast(error.message || 'Failed to delete room', 'error');
    }
}

// Close room modal
function closeRoomModal() {
    document.getElementById('roomModal').style.display = 'none';
    document.getElementById('roomForm').reset();
    roomToDelete = null;
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    roomToDelete = null;
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// Get toast icon based on type
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}