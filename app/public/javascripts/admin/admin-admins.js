// ==========================================
// ADMIN USERS MANAGEMENT
// ==========================================

class AdminAdmins {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
    }

    setupEventListeners() {
        // Form submission
        const adminForm = document.getElementById('adminForm');
        if (adminForm) {
            adminForm.addEventListener('submit', (e) => this.handleAdminSubmit(e));
        }

        // Search form
        const searchForm = document.querySelector('form[method="GET"]');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Clear modal when closed
        const adminModal = document.getElementById('adminModal');
        if (adminModal) {
            adminModal.addEventListener('hidden.bs.modal', () => this.clearAdminForm());
        }

        // Event delegation for action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-admin-btn')) {
                const adminId = e.target.closest('.edit-admin-btn').dataset.adminId;
                this.editAdmin(adminId);
            } else if (e.target.closest('.delete-admin-btn')) {
                const adminId = e.target.closest('.delete-admin-btn').dataset.adminId;
                this.deleteAdmin(adminId);
            }
        });
    }

    setupFormValidation() {
        // Password confirmation validation
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => {
                if (password.value !== confirmPassword.value) {
                    confirmPassword.setCustomValidity('Passwords do not match');
                } else {
                    confirmPassword.setCustomValidity('');
                }
            });
        }
    }

    async handleAdminSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const adminData = Object.fromEntries(formData.entries());
        const adminId = adminData.id;
        
        // Validate passwords match for new admins
        if (!adminId && adminData.password !== adminData.confirm_password) {
            this.showError('Passwords do not match');
            return;
        }
        
        try {
            const url = adminId ? `/admin/admins/${adminId}` : '/admin/admins';
            const method = adminId ? 'PUT' : 'POST';
            
            // Remove confirm_password from data
            delete adminData.confirm_password;
            delete adminData.id;
            
            // Don't send password for updates unless it's provided
            if (adminId && !adminData.password) {
                delete adminData.password;
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adminData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                this.closeAdminModal();
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showError(result.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error submitting admin form:', error);
            this.showError('Failed to save admin');
        }
    }

    async editAdmin(adminId) {
        try {
            const response = await fetch(`/admin/admins/${adminId}`);
            const result = await response.json();
            
            if (result.success) {
                const admin = result.admin;
                
                // Fill form with admin data
                document.getElementById('adminId').value = admin.id;
                document.getElementById('firstName').value = admin.first_name;
                document.getElementById('lastName').value = admin.last_name;
                document.getElementById('username').value = admin.username;
                document.getElementById('email').value = admin.email;
                document.getElementById('phoneNumber').value = admin.phone_number || '';
                document.getElementById('adminStatus').value = admin.status;
                
                // Hide password fields for edit
                const passwordSection = document.getElementById('passwordSection');
                if (passwordSection) {
                    passwordSection.style.display = 'none';
                    document.getElementById('password').required = false;
                    document.getElementById('confirmPassword').required = false;
                }
                
                // Update modal title
                document.getElementById('adminModalTitle').textContent = 'Edit Admin';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('adminModal'));
                modal.show();
            } else {
                this.showError(result.error || 'Failed to load admin');
            }
        } catch (error) {
            console.error('Error loading admin:', error);
            this.showError('Failed to load admin details');
        }
    }

    async deleteAdmin(adminId) {
        if (!confirm('Are you sure you want to delete this admin user? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/admins/${adminId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                
                // Remove the row from table
                const row = document.querySelector(`tr[data-admin-id="${adminId}"]`);
                if (row) {
                    row.remove();
                }
            } else {
                this.showError(result.error || 'Failed to delete admin');
            }
        } catch (error) {
            console.error('Error deleting admin:', error);
            this.showError('Failed to delete admin');
        }
    }

    clearAdminForm() {
        const form = document.getElementById('adminForm');
        if (form) {
            form.reset();
            
            // Reset modal title
            document.getElementById('adminModalTitle').textContent = 'Add New Admin';
            
            // Show password fields
            const passwordSection = document.getElementById('passwordSection');
            if (passwordSection) {
                passwordSection.style.display = 'block';
                document.getElementById('password').required = true;
                document.getElementById('confirmPassword').required = true;
            }
            
            // Clear hidden ID field
            document.getElementById('adminId').value = '';
        }
    }

    closeAdminModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
        if (modal) {
            modal.hide();
        }
    }

    handleSearch(e) {
        // Let the form submit naturally for now
        // Could be enhanced with AJAX search later
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('adminForm')) {
        window.adminAdmins = new AdminAdmins();
    }
});