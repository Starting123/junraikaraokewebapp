// ==========================================
// ADMIN MEMBERS MANAGEMENT
// ==========================================

class AdminMembers {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
    }

    setupEventListeners() {
        // Form submission
        const memberForm = document.getElementById('memberForm');
        if (memberForm) {
            memberForm.addEventListener('submit', (e) => this.handleMemberSubmit(e));
        }

        // Search form
        const searchForm = document.querySelector('form[method="GET"]');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Clear modal when closed
        const memberModal = document.getElementById('memberModal');
        if (memberModal) {
            memberModal.addEventListener('hidden.bs.modal', () => this.clearMemberForm());
        }

        // Event delegation for action buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-member-btn')) {
                const memberId = e.target.closest('.edit-member-btn').dataset.memberId;
                this.editMember(memberId);
            } else if (e.target.closest('.view-member-btn')) {
                const memberId = e.target.closest('.view-member-btn').dataset.memberId;
                this.viewMemberDetails(memberId);
            } else if (e.target.closest('.delete-member-btn')) {
                const memberId = e.target.closest('.delete-member-btn').dataset.memberId;
                this.deleteMember(memberId);
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

    async handleMemberSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const memberData = Object.fromEntries(formData.entries());
        const memberId = memberData.id;
        
        // Validate passwords match for new members
        if (!memberId && memberData.password !== memberData.confirm_password) {
            this.showError('Passwords do not match');
            return;
        }
        
        try {
            const url = memberId ? `/admin/members/${memberId}` : '/admin/members';
            const method = memberId ? 'PUT' : 'POST';
            
            // Remove confirm_password from data
            delete memberData.confirm_password;
            delete memberData.id;
            
            // Don't send password for updates unless it's provided
            if (memberId && !memberData.password) {
                delete memberData.password;
            }
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memberData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                this.closeMemberModal();
                setTimeout(() => window.location.reload(), 1500);
            } else {
                this.showError(result.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error submitting member form:', error);
            this.showError('Failed to save member');
        }
    }

    async editMember(memberId) {
        try {
            const response = await fetch(`/admin/members/${memberId}`);
            const result = await response.json();
            
            if (result.success) {
                const member = result.member;
                
                // Fill form with member data
                document.getElementById('memberId').value = member.id;
                document.getElementById('firstName').value = member.first_name;
                document.getElementById('lastName').value = member.last_name;
                document.getElementById('username').value = member.username;
                document.getElementById('email').value = member.email;
                document.getElementById('phoneNumber').value = member.phone_number || '';
                document.getElementById('memberStatus').value = member.status;
                
                // Hide password fields for edit
                const passwordSection = document.getElementById('passwordSection');
                if (passwordSection) {
                    passwordSection.style.display = 'none';
                    document.getElementById('password').required = false;
                    document.getElementById('confirmPassword').required = false;
                }
                
                // Update modal title
                document.getElementById('memberModalTitle').textContent = 'Edit Member';
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('memberModal'));
                modal.show();
            } else {
                this.showError(result.error || 'Failed to load member');
            }
        } catch (error) {
            console.error('Error loading member:', error);
            this.showError('Failed to load member details');
        }
    }

    async viewMemberDetails(memberId) {
        try {
            const response = await fetch(`/admin/members/${memberId}`);
            const result = await response.json();
            
            if (result.success) {
                const member = result.member;
                
                const detailsHtml = `
                    <div class="row">
                        <div class="col-md-4 text-center">
                            ${member.profile_picture ? 
                                `<img src="/uploads/${member.profile_picture}" alt="Profile" class="img-fluid rounded-circle mb-3" style="max-width: 150px;">` :
                                `<div class="bg-secondary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 150px; height: 150px;">
                                    <i class="fas fa-user fa-3x text-white"></i>
                                </div>`
                            }
                            <h5>${member.first_name} ${member.last_name}</h5>
                            <span class="badge bg-${this.getStatusColor(member.status)}">${member.status.charAt(0).toUpperCase() + member.status.slice(1)}</span>
                        </div>
                        <div class="col-md-8">
                            <table class="table table-borderless">
                                <tr>
                                    <td><strong>ID:</strong></td>
                                    <td>${member.id}</td>
                                </tr>
                                <tr>
                                    <td><strong>Username:</strong></td>
                                    <td>${member.username}</td>
                                </tr>
                                <tr>
                                    <td><strong>Email:</strong></td>
                                    <td>${member.email}</td>
                                </tr>
                                <tr>
                                    <td><strong>Phone:</strong></td>
                                    <td>${member.phone_number || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Joined:</strong></td>
                                    <td>${new Date(member.created_at).toLocaleDateString()}</td>
                                </tr>
                                <tr>
                                    <td><strong>Last Updated:</strong></td>
                                    <td>${new Date(member.updated_at).toLocaleDateString()}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <hr>
                    
                    <h6><i class="fas fa-chart-bar me-2"></i>Activity Statistics</h6>
                    <div class="row">
                        <div class="col-md-4">
                            <div class="text-center p-3 bg-light rounded">
                                <h4 class="text-primary">${member.total_bookings || 0}</h4>
                                <small>Total Bookings</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center p-3 bg-light rounded">
                                <h4 class="text-success">₿${(member.total_spent || 0).toFixed(2)}</h4>
                                <small>Total Spent</small>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="text-center p-3 bg-light rounded">
                                <h4 class="text-info">${member.last_booking ? new Date(member.last_booking).toLocaleDateString() : 'Never'}</h4>
                                <small>Last Booking</small>
                            </div>
                        </div>
                    </div>
                `;
                
                document.getElementById('memberDetailsContent').innerHTML = detailsHtml;
                
                const modal = new bootstrap.Modal(document.getElementById('memberDetailsModal'));
                modal.show();
            } else {
                this.showError(result.error || 'Failed to load member details');
            }
        } catch (error) {
            console.error('Error loading member details:', error);
            this.showError('Failed to load member details');
        }
    }

    async deleteMember(memberId) {
        if (!confirm('Are you sure you want to delete this member? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch(`/admin/members/${memberId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result.message);
                
                // Remove the row from table
                const row = document.querySelector(`tr[data-member-id="${memberId}"]`);
                if (row) {
                    row.remove();
                }
            } else {
                this.showError(result.error || 'Failed to delete member');
            }
        } catch (error) {
            console.error('Error deleting member:', error);
            this.showError('Failed to delete member');
        }
    }

    clearMemberForm() {
        const form = document.getElementById('memberForm');
        if (form) {
            form.reset();
            
            // Reset modal title
            document.getElementById('memberModalTitle').textContent = 'Add New Member';
            
            // Show password fields
            const passwordSection = document.getElementById('passwordSection');
            if (passwordSection) {
                passwordSection.style.display = 'block';
                document.getElementById('password').required = true;
                document.getElementById('confirmPassword').required = true;
            }
            
            // Clear hidden ID field
            document.getElementById('memberId').value = '';
        }
    }

    closeMemberModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('memberModal'));
        if (modal) {
            modal.hide();
        }
    }

    handleSearch(e) {
        // Let the form submit naturally for now
        // Could be enhanced with AJAX search later
    }

    getStatusColor(status) {
        const colorMap = {
            'active': 'success',
            'inactive': 'secondary',
            'suspended': 'danger'
        };
        return colorMap[status] || 'secondary';
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
    if (document.getElementById('memberForm')) {
        window.adminMembers = new AdminMembers();
    }
});