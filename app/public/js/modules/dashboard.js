// dashboard.js - Dashboard Page JavaScript
(function() {
    'use strict';
    
    let dashboardManager;
    
    class DashboardManager {
        constructor() {
            this.stats = null;
            this.init();
        }
        
        init() {
            this.loadStats();
            this.setupEventListeners();
            this.startAutoRefresh();
        }
        
        setupEventListeners() {
            // Quick action buttons
            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    this.handleQuickAction(action);
                });
            });
            
            // Refresh button
            const refreshBtn = document.getElementById('refresh-stats');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    this.loadStats();
                });
            }
        }
        
        async loadStats() {
            try {
                const response = await fetch('/api/dashboard/stats', {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                
                if (response.ok) {
                    this.stats = await response.json();
                    this.updateStatsDisplay();
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }
        
        updateStatsDisplay() {
            if (!this.stats) return;
            
            // Update stat cards
            const statCards = document.querySelectorAll('.stat-card');
            statCards.forEach(card => {
                const statType = card.dataset.stat;
                const numberElement = card.querySelector('.stat-number');
                if (numberElement && this.stats[statType] !== undefined) {
                    this.animateNumber(numberElement, this.stats[statType]);
                }
            });
        }
        
        animateNumber(element, targetValue) {
            const startValue = parseInt(element.textContent) || 0;
            const increment = Math.ceil((targetValue - startValue) / 30);
            let currentValue = startValue;
            
            const timer = setInterval(() => {
                currentValue += increment;
                if (currentValue >= targetValue) {
                    currentValue = targetValue;
                    clearInterval(timer);
                }
                element.textContent = currentValue;
            }, 50);
        }
        
        handleQuickAction(action) {
            switch (action) {
                case 'new-booking':
                    window.location.href = '/rooms';
                    break;
                case 'view-bookings':
                    window.location.href = '/bookings';
                    break;
                case 'view-rooms':
                    window.location.href = '/rooms';
                    break;
                case 'contact-support':
                    window.location.href = '/contact';
                    break;
                default:
                    console.log('Unknown action:', action);
            }
        }
        
        startAutoRefresh() {
            // Refresh stats every 5 minutes
            setInterval(() => {
                this.loadStats();
            }, 5 * 60 * 1000);
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            dashboardManager = new DashboardManager();
        });
    } else {
        dashboardManager = new DashboardManager();
    }
    
    // Export for global access
    window.DashboardManager = DashboardManager;
})();