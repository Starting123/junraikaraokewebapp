// ==========================================
// ADMIN DASHBOARD - MAIN CONTROLLER
// ==========================================

class AdminDashboard {
    constructor() {
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadDashboardData();
        this.initializeCharts();
        this.setupEventListeners();
        this.updateLastLogin();
    }

    async loadDashboardData() {
        try {
            const response = await fetch('/admin/api/dashboard-stats');
            const data = await response.json();
            
            if (data.success) {
                this.updateStatisticsCards(data.stats);
                this.updateRecentActivities(data.recent);
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateStatisticsCards(stats) {
        // Update statistics cards
        const totalMembers = document.getElementById('totalMembers');
        const totalRooms = document.getElementById('totalRooms');
        const activeBookings = document.getElementById('activeBookings');
        const totalRevenue = document.getElementById('totalRevenue');

        if (totalMembers) totalMembers.textContent = stats.totalMembers || 0;
        if (totalRooms) totalRooms.textContent = stats.totalRooms || 0;
        if (activeBookings) activeBookings.textContent = stats.activeBookings || 0;
        if (totalRevenue) totalRevenue.textContent = `₿${(stats.totalRevenue || 0).toFixed(2)}`;
    }

    updateRecentActivities(recent) {
        // Update recent bookings
        const recentBookingsTable = document.getElementById('recentBookings');
        if (recentBookingsTable && recent.bookings) {
            recentBookingsTable.innerHTML = recent.bookings.map(booking => `
                <tr>
                    <td>${booking.customer_name}</td>
                    <td>${booking.room_name}</td>
                    <td>${new Date(booking.booking_date).toLocaleDateString()}</td>
                    <td><span class="badge bg-${this.getStatusColor(booking.status)}">${booking.status}</span></td>
                </tr>
            `).join('');
        }

        // Update recent payments
        const recentPaymentsTable = document.getElementById('recentPayments');
        if (recentPaymentsTable && recent.payments) {
            recentPaymentsTable.innerHTML = recent.payments.map(payment => `
                <tr>
                    <td>${payment.customer_name}</td>
                    <td>₿${payment.amount}</td>
                    <td>${payment.payment_method}</td>
                    <td><span class="badge bg-${this.getStatusColor(payment.status)}">${payment.status}</span></td>
                </tr>
            `).join('');
        }
    }

    async initializeCharts() {
        try {
            const response = await fetch('/admin/api/charts-data');
            const data = await response.json();
            
            if (data.success) {
                this.createMonthlyChart(data.monthlyData);
                this.createRoomTypesChart(data.roomTypes);
            }
        } catch (error) {
            console.error('Error loading charts data:', error);
        }
    }

    createMonthlyChart(monthlyData) {
        const ctx = document.getElementById('monthlyChart');
        if (!ctx) return;

        this.charts.monthly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: monthlyData.months || [],
                datasets: [
                    {
                        label: 'Bookings',
                        data: monthlyData.bookings || [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Revenue (฿)',
                        data: monthlyData.revenue || [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Bookings'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Revenue (฿)'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    createRoomTypesChart(roomTypesData) {
        const ctx = document.getElementById('roomTypesChart');
        if (!ctx) return;

        this.charts.roomTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: roomTypesData.labels || [],
                datasets: [{
                    data: roomTypesData.data || [],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Refresh dashboard button
        const refreshBtn = document.querySelector('[onclick="refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.refreshDashboard();
        }
    }

    async refreshDashboard() {
        const refreshBtn = document.querySelector('[onclick="refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
        }

        try {
            await this.loadDashboardData();
            
            // Destroy and recreate charts
            Object.values(this.charts).forEach(chart => chart.destroy());
            this.charts = {};
            await this.initializeCharts();
            
            this.showSuccess('Dashboard refreshed successfully');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showError('Failed to refresh dashboard');
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshBtn.disabled = false;
            }
        }
    }

    updateLastLogin() {
        const lastLoginElement = document.getElementById('lastLogin');
        if (lastLoginElement) {
            const now = new Date();
            lastLoginElement.textContent = now.toLocaleString();
        }

        // Update last backup time
        const lastBackupElement = document.getElementById('lastBackup');
        if (lastBackupElement) {
            const backupTime = new Date();
            backupTime.setHours(backupTime.getHours() - 2); // Simulate 2 hours ago
            lastBackupElement.textContent = backupTime.toLocaleString();
        }
    }

    getStatusColor(status) {
        const colorMap = {
            'active': 'success',
            'confirmed': 'success',
            'verified': 'success',
            'paid': 'success',
            'pending': 'warning',
            'inactive': 'secondary',
            'cancelled': 'danger',
            'rejected': 'danger',
            'suspended': 'danger',
            'completed': 'primary'
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
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Add to document
        document.body.appendChild(alertDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv && alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Utility functions for global use
window.refreshDashboard = function() {
    if (window.adminDashboard) {
        window.adminDashboard.refreshDashboard();
    }
};

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('totalMembers')) {
        window.adminDashboard = new AdminDashboard();
    }
});

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDashboard;
}