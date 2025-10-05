// ==========================================
// ADVANCED MODAL & FORM MANAGEMENT SYSTEM
// ==========================================

class AdminModals {
    constructor() {
        this.activeModal = null;
        this.initializeModalSystem();
    }

    initializeModalSystem() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modal-container')) {
            const container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }

        // Handle escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal();
            }
        });
    }

    // === GENERIC MODAL CREATOR ===
    createModal(options = {}) {
        const {
            size = 'md',
            title = 'Modal',
            icon = 'fas fa-window-maximize',
            body = '',
            footer = true,
            closeButton = true,
            backdrop = true,
            keyboard = true,
            className = ''
        } = options;

        const modalHtml = `
            <div class="modal-backdrop ${backdrop ? 'backdrop-enabled' : ''}" id="current-modal">
                <div class="modal modal-${size} ${className}">
                    <div class="modal-header">
                        <h3 class="modal-title">
                            <i class="${icon}"></i>
                            ${title}
                        </h3>
                        ${closeButton ? '<button class="modal-close" onclick="window.AdminModals.closeModal()"><i class="fas fa-times"></i></button>' : ''}
                    </div>
                    <div class="modal-body">
                        ${body}
                    </div>
                    ${footer ? '<div class="modal-footer" id="modal-footer"></div>' : ''}
                </div>
            </div>
        `;

        const container = document.getElementById('modal-container');
        container.innerHTML = modalHtml;

        // Show modal with animation
        setTimeout(() => {
            const modal = document.getElementById('current-modal');
            if (modal) {
                modal.classList.add('show');
                this.activeModal = modal;
            }
        }, 10);

        // Handle backdrop click
        if (backdrop) {
            const backdropEl = document.getElementById('current-modal');
            backdropEl.addEventListener('click', (e) => {
                if (e.target === backdropEl) {
                    this.closeModal();
                }
            });
        }

        return container;
    }

    closeModal() {
        if (this.activeModal) {
            this.activeModal.classList.remove('show');
            setTimeout(() => {
                const container = document.getElementById('modal-container');
                if (container) {
                    container.innerHTML = '';
                }
                this.activeModal = null;
            }, 300);
        }
    }

    // === USER MANAGEMENT MODALS ===
    async showCreateUserModal() {
        const modalBody = `
            <form id="createUserForm" class="form-modal">
                <div class="form-group">
                    <label class="form-label required">ชื่อผู้ใช้</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="form-group">
                    <label class="form-label required">อีเมล</label>
                    <input type="email" class="form-control" name="email" required>
                </div>
                <div class="form-group">
                    <label class="form-label required">รหัสผ่าน</label>
                    <input type="password" class="form-control" name="password" minlength="6" required>
                </div>
                <div class="form-group">
                    <label class="form-label required">ยืนยันรหัสผ่าน</label>
                    <input type="password" class="form-control" name="confirmPassword" minlength="6" required>
                </div>
                <div class="form-group">
                    <label class="form-label">สิทธิ์ผู้ใช้</label>
                    <select class="form-control" name="role_id">
                        <option value="3">ผู้ใช้ทั่วไป</option>
                        <option value="1">ผู้ดูแลระบบ</option>
                    </select>
                </div>
            </form>
        `;

        const modal = this.createModal({
            title: 'เพิ่มผู้ใช้ใหม่',
            icon: 'fas fa-user-plus',
            body: modalBody,
            size: 'md'
        });

        this.addModalFooter([
            { text: 'ยกเลิก', class: 'btn-secondary', action: () => this.closeModal() },
            { text: 'เพิ่มผู้ใช้', class: 'btn-primary', action: () => this.submitCreateUser() }
        ]);

        // Focus first input
        setTimeout(() => {
            const firstInput = document.querySelector('#createUserForm input');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    async submitCreateUser() {
        const form = document.getElementById('createUserForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Validation
        if (data.password !== data.confirmPassword) {
            this.showValidationError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        try {
            this.setModalLoading(true);
            
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    role_id: parseInt(data.role_id)
                })
            });

            if (response.ok) {
                this.closeModal();
                window.AdminCRUD.showToast('เพิ่มผู้ใช้สำเร็จ!', 'success');
                window.AdminCRUD.loadUsers();
            } else {
                const error = await response.json();
                this.showValidationError(error.error || 'เกิดข้อผิดพลาดในการเพิ่มผู้ใช้');
            }
        } catch (error) {
            this.showValidationError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            this.setModalLoading(false);
        }
    }

    // === ROOM MANAGEMENT MODALS ===
    async showCreateRoomModal() {
        // Get room types first
        let roomTypes = [];
        try {
            const response = await fetch('/api/admin/room-types', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                roomTypes = data.room_types || [];
            }
        } catch (error) {
            console.error('Error loading room types:', error);
        }

        const roomTypeOptions = roomTypes.length > 0 
            ? roomTypes.map(type => `<option value="${type.type_id}">${type.type_name}</option>`).join('')
            : '<option value="1">ห้องขนาดเล็ก</option><option value="2">ห้องขนาดกลาง</option><option value="3">ห้องขนาดใหญ่</option>';

        const modalBody = `
            <form id="createRoomForm" class="form-modal">
                <div class="form-group">
                    <label class="form-label required">ชื่อห้อง</label>
                    <input type="text" class="form-control" name="name" placeholder="เช่น: ห้อง A1" required>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label">ประเภทห้อง</label>
                        <select class="form-control" name="type_id">
                            ${roomTypeOptions}
                        </select>
                    </div>
                    <div class="form-col">
                        <label class="form-label">ความจุ (คน)</label>
                        <input type="number" class="form-control" name="capacity" min="1" max="20" value="4">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label">ราคาต่อชั่วโมง (฿)</label>
                        <input type="number" class="form-control" name="hourly_rate" min="0" step="0.01" placeholder="200">
                    </div>
                    <div class="form-col">
                        <label class="form-label">สถานะ</label>
                        <select class="form-control" name="status">
                            <option value="available">ว่าง</option>
                            <option value="occupied">ไม่ว่าง</option>
                            <option value="maintenance">ซ่อมบำรุง</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">รายละเอียดห้อง</label>
                    <textarea class="form-control" name="description" placeholder="อุปกรณ์, สิ่งอำนวยความสะดวก..."></textarea>
                </div>
            </form>
        `;

        this.createModal({
            title: 'เพิ่มห้องใหม่',
            icon: 'fas fa-door-open',
            body: modalBody,
            size: 'lg'
        });

        this.addModalFooter([
            { text: 'ยกเลิก', class: 'btn-secondary', action: () => this.closeModal() },
            { text: 'เพิ่มห้อง', class: 'btn-primary', action: () => this.submitCreateRoom() }
        ]);
    }

    async submitCreateRoom() {
        const form = document.getElementById('createRoomForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            this.setModalLoading(true);
            
            const response = await fetch('/api/admin/rooms', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    type_id: parseInt(data.type_id),
                    capacity: parseInt(data.capacity),
                    hourly_rate: parseFloat(data.hourly_rate) || 0,
                    status: data.status,
                    description: data.description
                })
            });

            if (response.ok) {
                this.closeModal();
                window.AdminCRUD.showToast('เพิ่มห้องสำเร็จ!', 'success');
                window.AdminCRUD.loadRooms();
            } else {
                const error = await response.json();
                this.showValidationError(error.error || 'เกิดข้อผิดพลาดในการเพิ่มห้อง');
            }
        } catch (error) {
            this.showValidationError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            this.setModalLoading(false);
        }
    }

    // === MENU MANAGEMENT MODALS ===
    async showCreateMenuModal() {
        // Get menu categories first
        let categories = [];
        try {
            const response = await fetch('/api/admin/menu-categories', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                categories = data.categories || [];
            }
        } catch (error) {
            console.error('Error loading menu categories:', error);
        }

        const categoryOptions = categories.length > 0 
            ? categories.map(cat => `<option value="${cat.category_id}">${cat.category_name}</option>`).join('')
            : '<option value="1">เครื่องดื่ม</option><option value="2">อาหารว่าง</option>';

        const modalBody = `
            <form id="createMenuForm" class="form-modal">
                <div class="form-group">
                    <label class="form-label required">ชื่อเมนู</label>
                    <input type="text" class="form-control" name="name" placeholder="เช่น: น้ำอัดลม" required>
                </div>
                <div class="form-row">
                    <div class="form-col">
                        <label class="form-label">หมวดหมู่</label>
                        <select class="form-control" name="category_id">
                            ${categoryOptions}
                        </select>
                    </div>
                    <div class="form-col">
                        <label class="form-label required">ราคา (฿)</label>
                        <input type="number" class="form-control" name="price" min="0" step="0.01" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">รายละเอียด</label>
                    <textarea class="form-control" name="description" placeholder="รายละเอียดสินค้า, ส่วนผสม..."></textarea>
                </div>
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" name="available" id="menuAvailable" checked>
                    <label class="form-check-label" for="menuAvailable">พร้อมจำหน่าย</label>
                </div>
            </form>
        `;

        this.createModal({
            title: 'เพิ่มเมนูใหม่',
            icon: 'fas fa-utensils',
            body: modalBody,
            size: 'md'
        });

        this.addModalFooter([
            { text: 'ยกเลิก', class: 'btn-secondary', action: () => this.closeModal() },
            { text: 'เพิ่มเมนู', class: 'btn-primary', action: () => this.submitCreateMenu() }
        ]);
    }

    async submitCreateMenu() {
        const form = document.getElementById('createMenuForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            this.setModalLoading(true);
            
            const response = await fetch('/api/admin/menu', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    category_id: parseInt(data.category_id),
                    price: parseFloat(data.price),
                    description: data.description,
                    available: data.available === 'on'
                })
            });

            if (response.ok) {
                this.closeModal();
                window.AdminCRUD.showToast('เพิ่มเมนูสำเร็จ!', 'success');
                window.AdminCRUD.loadMenu();
            } else {
                const error = await response.json();
                this.showValidationError(error.error || 'เกิดข้อผิดพลาดในการเพิ่มเมนู');
            }
        } catch (error) {
            this.showValidationError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            this.setModalLoading(false);
        }
    }

    // === CONFIRMATION MODALS ===
    showConfirmModal(options = {}) {
        const {
            title = 'ยืนยันการดำเนินการ',
            message = 'คุณแน่ใจหรือไม่?',
            icon = 'fas fa-question-circle',
            type = 'warning', // warning, danger, info
            confirmText = 'ยืนยัน',
            cancelText = 'ยกเลิก',
            onConfirm = () => {},
            onCancel = () => {}
        } = options;

        const modalBody = `
            <div class="confirm-modal">
                <div class="confirm-icon ${type}">
                    <i class="${icon}"></i>
                </div>
                <div class="confirm-message">${message}</div>
                ${options.details ? `<div class="confirm-details">${options.details}</div>` : ''}
            </div>
        `;

        this.createModal({
            title,
            body: modalBody,
            size: 'sm',
            footer: false,
            className: 'confirm-modal'
        });

        this.addModalFooter([
            { 
                text: cancelText, 
                class: 'btn-secondary', 
                action: () => {
                    onCancel();
                    this.closeModal();
                }
            },
            { 
                text: confirmText, 
                class: type === 'danger' ? 'btn-danger' : 'btn-primary', 
                action: () => {
                    onConfirm();
                    this.closeModal();
                }
            }
        ]);
    }

    // === UTILITY METHODS ===
    addModalFooter(buttons = []) {
        const footer = document.getElementById('modal-footer');
        if (!footer) return;

        footer.innerHTML = buttons.map(btn => `
            <button class="btn ${btn.class}" onclick="(${btn.action.toString()})()">${btn.text}</button>
        `).join('');
    }

    setModalLoading(loading = true) {
        const submitBtn = document.querySelector('.modal-footer .btn-primary');
        if (submitBtn) {
            if (loading) {
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดำเนินการ...';
            } else {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
                // Restore original text would need to be tracked
            }
        }
    }

    showValidationError(message) {
        // Create or update error display in modal
        let errorEl = document.querySelector('.modal-validation-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'alert alert-error modal-validation-error';
            const modalBody = document.querySelector('.modal-body');
            if (modalBody) {
                modalBody.insertBefore(errorEl, modalBody.firstChild);
            }
        }

        errorEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Initialize Modal System
window.AdminModals = new AdminModals();