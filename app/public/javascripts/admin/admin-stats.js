// ==========================================
// ADMIN STATISTICS & DASHBOARD VISUALIZATIONS
// ==========================================

class AdminStats {
    constructor() {
        this.apiBase = '/api/admin';
        this.token = localStorage.getItem('token');
        this.charts = {};
    }

    async loadReports() {
        await Promise.all([
            this.loadDashboardStats(),
            this.loadRecentActivities(),
            this.loadCharts()
        ]);
    }

    async loadDashboardStats() {
        try {
            const response = await fetch(`${this.apiBase}/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const stats = await response.json();
                this.updateStatsCards(stats);
            } else {
                // If no stats endpoint, create mock data
                this.updateStatsCards({
                    totalUsers: 0,
                    totalRooms: 0,
                    totalBookings: 0,
                    totalRevenue: 0,
                    activeBookings: 0,
                    monthlyGrowth: 0
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showMockStats();
        }
    }

    updateStatsCards(stats) {
        // Update main stats cards
        this.updateStatCard('totalUsers', stats.totalUsers || 0, 'คน');
        this.updateStatCard('totalRooms', stats.totalRooms || 0, 'ห้อง');
        this.updateStatCard('totalBookings', stats.totalBookings || 0, 'รายการ');
        this.updateStatCard('totalRevenue', stats.totalRevenue || 0, '฿', true);
        
        // Update additional stats
        this.updateStatCard('activeBookings', stats.activeBookings || 0, 'ห้องที่ใช้งาน');
        this.updateStatCard('monthlyGrowth', stats.monthlyGrowth || 0, '%', false, true);
    }

    updateStatCard(id, value, suffix, isCurrency = false, isPercentage = false) {
        const element = document.getElementById(id);
        if (!element) return;

        let displayValue = value;
        
        if (isCurrency) {
            displayValue = `฿${Number(value).toLocaleString()}`;
        } else if (isPercentage) {
            displayValue = `${value > 0 ? '+' : ''}${value}%`;
        } else {
            displayValue = Number(value).toLocaleString();
        }

        element.textContent = displayValue;

        // Add animation
        element.style.transform = 'scale(1.1)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    async loadRecentActivities() {
        try {
            // Load recent bookings as activities
            const response = await fetch(`${this.apiBase}/bookings?limit=5`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.displayRecentActivities(data.bookings || []);
            }
        } catch (error) {
            console.error('Error loading recent activities:', error);
            this.displayRecentActivities([]);
        }
    }

    displayRecentActivities(activities) {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-inbox fa-2x mb-2 opacity-50"></i>
                    <p>ไม่มีกิจกรรมล่าสุด</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="activity-details">
                    <p class="activity-text">
                        <strong>${activity.user_name || 'ผู้ใช้'}</strong> จองห้อง 
                        <strong>${activity.room_name || activity.room_id}</strong>
                    </p>
                    <p class="activity-time">
                        ${this.formatTimeAgo(activity.created_at || activity.start_time)}
                    </p>
                </div>
                <div class="activity-status">
                    <span class="badge ${this.getStatusClass(activity.status)}">
                        ${this.getStatusText(activity.status)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days} วันที่แล้ว`;
        if (hours > 0) return `${hours} ชั่วโมงที่แล้ว`;
        if (minutes > 0) return `${minutes} นาทีที่แล้ว`;
        return 'เพิ่งเกิดขึ้น';
    }

    getStatusClass(status) {
        const classes = {
            'confirmed': 'bg-success',
            'pending': 'bg-warning',
            'cancelled': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'confirmed': 'ยืนยันแล้ว',
            'pending': 'รอยืนยัน',
            'cancelled': 'ยกเลิก'
        };
        return texts[status] || status;
    }

    async loadCharts() {
        // Simple chart implementation without external libraries
        this.createBookingChart();
        this.createRevenueChart();
    }

    async createBookingChart() {
        const chartContainer = document.getElementById('bookings-chart');
        if (!chartContainer) return;

        try {
            // Get booking data for the last 7 days
            const response = await fetch(`${this.apiBase}/stats/bookings-weekly`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            let chartData;
            if (response.ok) {
                const data = await response.json();
                chartData = data.weekly || this.generateMockBookingData();
            } else {
                chartData = this.generateMockBookingData();
            }

            this.renderSimpleBarChart(chartContainer, chartData, 'การจองรายวัน');
        } catch (error) {
            console.error('Error creating booking chart:', error);
            const chartData = this.generateMockBookingData();
            this.renderSimpleBarChart(chartContainer, chartData, 'การจองรายวัน');
        }
    }

    async createRevenueChart() {
        const chartContainer = document.getElementById('revenue-chart');
        if (!chartContainer) return;

        try {
            const response = await fetch(`${this.apiBase}/stats/revenue-monthly`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            let chartData;
            if (response.ok) {
                const data = await response.json();
                chartData = data.monthly || this.generateMockRevenueData();
            } else {
                chartData = this.generateMockRevenueData();
            }

            this.renderSimpleLineChart(chartContainer, chartData, 'รายได้รายเดือน');
        } catch (error) {
            console.error('Error creating revenue chart:', error);
            const chartData = this.generateMockRevenueData();
            this.renderSimpleLineChart(chartContainer, chartData, 'รายได้รายเดือน');
        }
    }

    generateMockBookingData() {
        const days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
        return days.map((day, index) => ({
            label: day,
            value: Math.floor(Math.random() * 20) + 5
        }));
    }

    generateMockRevenueData() {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'];
        return months.map((month, index) => ({
            label: month,
            value: Math.floor(Math.random() * 50000) + 20000
        }));
    }

    renderSimpleBarChart(container, data, title) {
        const maxValue = Math.max(...data.map(d => d.value));
        
        container.innerHTML = `
            <div class="chart-header">
                <h4>${title}</h4>
            </div>
            <div class="simple-bar-chart">
                ${data.map(item => `
                    <div class="bar-item">
                        <div class="bar" style="height: ${(item.value / maxValue) * 100}%">
                            <div class="bar-value">${item.value}</div>
                        </div>
                        <div class="bar-label">${item.label}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderSimpleLineChart(container, data, title) {
        const maxValue = Math.max(...data.map(d => d.value));
        
        container.innerHTML = `
            <div class="chart-header">
                <h4>${title}</h4>
            </div>
            <div class="simple-line-chart">
                <svg viewBox="0 0 400 200" class="line-chart-svg">
                    <polyline
                        points="${data.map((item, index) => 
                            `${(index / (data.length - 1)) * 380 + 10},${190 - (item.value / maxValue) * 160}`
                        ).join(' ')}"
                        fill="none"
                        stroke="var(--karaoke-primary)"
                        stroke-width="3"
                        stroke-linecap="round"
                    />
                    ${data.map((item, index) => `
                        <circle 
                            cx="${(index / (data.length - 1)) * 380 + 10}" 
                            cy="${190 - (item.value / maxValue) * 160}"
                            r="4" 
                            fill="var(--karaoke-primary)"
                        />
                    `).join('')}
                </svg>
                <div class="line-chart-labels">
                    ${data.map(item => `<span>${item.label}</span>`).join('')}
                </div>
                <div class="line-chart-values">
                    ${data.map(item => `<span>฿${item.value.toLocaleString()}</span>`).join('')}
                </div>
            </div>
        `;
    }

    showMockStats() {
        this.updateStatsCards({
            totalUsers: 156,
            totalRooms: 12,
            totalBookings: 48,
            totalRevenue: 125000,
            activeBookings: 8,
            monthlyGrowth: 15.5
        });
    }
}

// Initialize Admin Stats
window.AdminStats = new AdminStats();