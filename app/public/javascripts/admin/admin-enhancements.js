// ==========================================
// REAL-TIME DASHBOARD ENHANCEMENTS
// ==========================================

class AdminEnhancements {
    constructor() {
        this.updateInterval = 30000; // 30 seconds
        this.intervals = new Map();
        this.initializeEnhancements();
    }

    initializeEnhancements() {
        this.setupRealTimeUpdates();
        this.initializeSearchAndFilter();
        this.setupKeyboardShortcuts();
        this.initializeNotificationSystem();
        this.setupDataExport();
        this.initializeBulkActions();
    }

    // === REAL-TIME UPDATES ===
    setupRealTimeUpdates() {
        // Dashboard stats auto-refresh
        this.intervals.set('stats', setInterval(() => {
            if (document.querySelector('#dashboard-content.active')) {
                window.AdminStats?.updateDashboardStats();
            }
        }, this.updateInterval));

        // Room status updates
        this.intervals.set('rooms', setInterval(() => {
            if (document.querySelector('#rooms-content.active')) {
                this.updateRoomStatuses();
            }
        }, 15000)); // More frequent for room status

        // Booking updates
        this.intervals.set('bookings', setInterval(() => {
            if (document.querySelector('#bookings-content.active')) {
                this.updateActiveBookings();
            }
        }, 10000)); // Very frequent for active bookings
    }

    async updateRoomStatuses() {
        try {
            const response = await fetch('/api/admin/rooms/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.refreshRoomStatusIndicators(data.rooms);
            }
        } catch (error) {
            console.error('Error updating room statuses:', error);
        }
    }

    refreshRoomStatusIndicators(rooms) {
        rooms.forEach(room => {
            const statusElement = document.querySelector(`[data-room-id="${room.room_id}"] .status-badge`);
            if (statusElement) {
                statusElement.className = `status-badge status-${room.status}`;
                statusElement.textContent = this.getStatusText(room.status);
            }
        });
    }

    getStatusText(status) {
        const statusMap = {
            'available': 'ว่าง',
            'occupied': 'ไม่ว่าง',
            'maintenance': 'ซ่อมบำรุง',
            'cleaning': 'ทำความสะอาด'
        };
        return statusMap[status] || status;
    }

    // === SEARCH AND FILTER SYSTEM ===
    initializeSearchAndFilter() {
        this.createSearchInterface();
        this.setupFilterHandlers();
    }

    createSearchInterface() {
        const style = document.createElement('style');
        style.textContent = `
            .search-filter-bar {
                background: var(--card-bg);
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                align-items: center;
            }
            
            .search-input {
                flex: 1;
                min-width: 250px;
                position: relative;
            }
            
            .search-input input {
                width: 100%;
                padding: 0.5rem 2.5rem 0.5rem 1rem;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: var(--bg);
                color: var(--text);
            }
            
            .search-input .search-icon {
                position: absolute;
                right: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-muted);
            }
            
            .filter-group {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }
            
            .filter-select {
                padding: 0.5rem;
                border: 1px solid var(--border);
                border-radius: 6px;
                background: var(--bg);
                color: var(--text);
            }
            
            .quick-filters {
                display: flex;
                gap: 0.5rem;
            }
            
            .filter-chip {
                padding: 0.25rem 0.75rem;
                background: var(--secondary);
                border: none;
                border-radius: 20px;
                color: var(--text);
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .filter-chip:hover,
            .filter-chip.active {
                background: var(--primary);
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    addSearchFilterBar(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const {
            searchPlaceholder = 'ค้นหา...',
            filters = [],
            quickFilters = []
        } = options;

        const searchBar = document.createElement('div');
        searchBar.className = 'search-filter-bar';
        searchBar.innerHTML = `
            <div class="search-input">
                <input type="text" placeholder="${searchPlaceholder}" id="${containerId}-search">
                <i class="fas fa-search search-icon"></i>
            </div>
            
            ${filters.length > 0 ? `
                <div class="filter-group">
                    ${filters.map(filter => `
                        <select class="filter-select" data-filter="${filter.key}">
                            <option value="">ทั้งหมด ${filter.label}</option>
                            ${filter.options.map(opt => 
                                `<option value="${opt.value}">${opt.label}</option>`
                            ).join('')}
                        </select>
                    `).join('')}
                </div>
            ` : ''}
            
            ${quickFilters.length > 0 ? `
                <div class="quick-filters">
                    ${quickFilters.map(qf => 
                        `<button class="filter-chip" data-filter="${qf.key}" data-value="${qf.value}">${qf.label}</button>`
                    ).join('')}
                </div>
            ` : ''}
        `;

        container.insertBefore(searchBar, container.firstChild);
        this.setupSearchFilterEvents(containerId);
    }

    setupSearchFilterEvents(containerId) {
        const searchInput = document.getElementById(`${containerId}-search`);
        const filterSelects = document.querySelectorAll(`#${containerId} .filter-select`);
        const quickFilters = document.querySelectorAll(`#${containerId} .filter-chip`);

        // Search functionality
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.performSearch(containerId, searchInput.value);
            }, 300));
        }

        // Filter dropdowns
        filterSelects.forEach(select => {
            select.addEventListener('change', () => {
                this.applyFilters(containerId);
            });
        });

        // Quick filter chips
        quickFilters.forEach(chip => {
            chip.addEventListener('click', (e) => {
                e.target.classList.toggle('active');
                this.applyFilters(containerId);
            });
        });
    }

    performSearch(containerId, searchTerm) {
        const rows = document.querySelectorAll(`#${containerId} table tbody tr`);
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            row.style.display = matches ? '' : 'none';
        });

        this.updateSearchResults(containerId, searchTerm);
    }

    updateSearchResults(containerId, searchTerm) {
        const visibleRows = document.querySelectorAll(`#${containerId} table tbody tr[style=""], #${containerId} table tbody tr:not([style])`);
        
        let resultInfo = document.querySelector(`#${containerId} .search-results`);
        if (!resultInfo) {
            resultInfo = document.createElement('div');
            resultInfo.className = 'search-results';
            const container = document.getElementById(containerId);
            container.insertBefore(resultInfo, container.querySelector('table'));
        }

        if (searchTerm) {
            resultInfo.innerHTML = `
                <small class="text-muted">
                    <i class="fas fa-search"></i> 
                    พบ ${visibleRows.length} รายการจากการค้นหา "${searchTerm}"
                </small>
            `;
        } else {
            resultInfo.innerHTML = '';
        }
    }

    // === KEYBOARD SHORTCUTS ===
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n': // New item
                        e.preventDefault();
                        this.handleNewItemShortcut();
                        break;
                    case 'f': // Search
                        e.preventDefault();
                        this.focusSearch();
                        break;
                    case 's': // Save
                        e.preventDefault();
                        this.handleSaveShortcut();
                        break;
                }
            }

            // Escape key
            if (e.key === 'Escape') {
                // Close modals
                if (window.AdminModals && window.AdminModals.activeModal) {
                    window.AdminModals.closeModal();
                }
                // Clear search
                this.clearAllSearches();
            }

            // Function keys
            switch (e.key) {
                case 'F5':
                    e.preventDefault();
                    this.refreshCurrentSection();
                    break;
            }
        });

        // Show keyboard shortcuts help
        this.createShortcutsHelp();
    }

    createShortcutsHelp() {
        const helpButton = document.createElement('button');
        helpButton.className = 'btn btn-outline-secondary btn-sm';
        helpButton.innerHTML = '<i class="fas fa-keyboard"></i> ?';
        helpButton.title = 'คีย์ลัด (Ctrl+?)';
        helpButton.style.position = 'fixed';
        helpButton.style.bottom = '20px';
        helpButton.style.right = '20px';
        helpButton.style.zIndex = '1000';

        helpButton.addEventListener('click', () => {
            this.showKeyboardShortcuts();
        });

        document.body.appendChild(helpButton);
    }

    showKeyboardShortcuts() {
        const shortcuts = [
            { key: 'Ctrl + N', desc: 'เพิ่มรายการใหม่' },
            { key: 'Ctrl + F', desc: 'ค้นหา' },
            { key: 'Ctrl + S', desc: 'บันทึก' },
            { key: 'F5', desc: 'รีเฟรช' },
            { key: 'Escape', desc: 'ปิด/ยกเลิก' }
        ];

        const shortcutsList = shortcuts.map(s => 
            `<div class="shortcut-item"><kbd>${s.key}</kbd> ${s.desc}</div>`
        ).join('');

        window.AdminModals.createModal({
            title: 'คีย์ลัด',
            icon: 'fas fa-keyboard',
            body: `
                <div class="shortcuts-help">
                    ${shortcutsList}
                </div>
                <style>
                    .shortcuts-help .shortcut-item {
                        display: flex;
                        justify-content: space-between;
                        padding: 0.5rem 0;
                        border-bottom: 1px solid var(--border);
                    }
                    .shortcuts-help kbd {
                        background: var(--secondary);
                        padding: 0.25rem 0.5rem;
                        border-radius: 3px;
                        font-family: monospace;
                    }
                </style>
            `,
            size: 'sm',
            footer: false
        });
    }

    // === EXPORT FUNCTIONALITY ===
    setupDataExport() {
        this.createExportButtons();
    }

    createExportButtons() {
        // Add export buttons to each section
        const sections = ['users', 'rooms', 'bookings', 'menu'];
        
        sections.forEach(section => {
            setTimeout(() => {
                const container = document.getElementById(`${section}-content`);
                if (container && container.querySelector('table')) {
                    this.addExportButton(section, container);
                }
            }, 1000);
        });
    }

    addExportButton(section, container) {
        const header = container.querySelector('.d-flex.justify-content-between');
        if (!header) return;

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-outline-success btn-sm ms-2';
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Excel';
        exportBtn.addEventListener('click', () => this.exportToExcel(section));

        const buttonGroup = header.querySelector('button').parentNode;
        buttonGroup.appendChild(exportBtn);
    }

    exportToExcel(section) {
        const table = document.querySelector(`#${section}-content table`);
        if (!table) return;

        // Convert table to CSV
        const rows = Array.from(table.querySelectorAll('tr'));
        const csv = rows.map(row => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            return cells.map(cell => {
                const text = cell.textContent.trim();
                return text.includes(',') ? `"${text}"` : text;
            }).join(',');
        }).join('\n');

        // Download CSV
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${section}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        window.AdminCRUD.showToast('ส่งออกข้อมูลสำเร็จ!', 'success');
    }

    // === BULK ACTIONS ===
    initializeBulkActions() {
        this.setupBulkSelection();
    }

    setupBulkSelection() {
        // Add bulk selection to tables
        setTimeout(() => {
            const tables = document.querySelectorAll('.table-responsive table');
            tables.forEach(table => this.enhanceTableWithBulkActions(table));
        }, 1500);
    }

    enhanceTableWithBulkActions(table) {
        // Add checkbox column header
        const headerRow = table.querySelector('thead tr');
        if (!headerRow || headerRow.querySelector('.bulk-select-header')) return;

        const checkboxHeader = document.createElement('th');
        checkboxHeader.className = 'bulk-select-header';
        checkboxHeader.innerHTML = '<input type="checkbox" class="select-all">';
        headerRow.insertBefore(checkboxHeader, headerRow.firstChild);

        // Add checkboxes to each row
        const bodyRows = table.querySelectorAll('tbody tr');
        bodyRows.forEach(row => {
            const checkboxCell = document.createElement('td');
            checkboxCell.innerHTML = '<input type="checkbox" class="select-row">';
            row.insertBefore(checkboxCell, row.firstChild);
        });

        // Setup bulk selection events
        this.setupBulkSelectionEvents(table);
    }

    setupBulkSelectionEvents(table) {
        const selectAll = table.querySelector('.select-all');
        const selectRows = table.querySelectorAll('.select-row');

        selectAll.addEventListener('change', (e) => {
            selectRows.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
            this.updateBulkActions(table);
        });

        selectRows.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateBulkActions(table);
            });
        });
    }

    updateBulkActions(table) {
        const selectedRows = table.querySelectorAll('.select-row:checked');
        const count = selectedRows.length;

        // Show/hide bulk action bar
        let bulkBar = table.closest('.table-responsive').querySelector('.bulk-actions-bar');
        
        if (count > 0) {
            if (!bulkBar) {
                bulkBar = this.createBulkActionsBar(table);
            }
            bulkBar.querySelector('.selected-count').textContent = count;
            bulkBar.style.display = 'flex';
        } else if (bulkBar) {
            bulkBar.style.display = 'none';
        }
    }

    createBulkActionsBar(table) {
        const tableContainer = table.closest('.table-responsive');
        const bulkBar = document.createElement('div');
        bulkBar.className = 'bulk-actions-bar';
        bulkBar.innerHTML = `
            <div class="bulk-info">
                เลือก <span class="selected-count">0</span> รายการ
            </div>
            <div class="bulk-buttons">
                <button class="btn btn-sm btn-danger" onclick="this.handleBulkDelete()">
                    <i class="fas fa-trash"></i> ลบ
                </button>
                <button class="btn btn-sm btn-warning" onclick="this.handleBulkEdit()">
                    <i class="fas fa-edit"></i> แก้ไข
                </button>
            </div>
        `;

        // Style the bulk bar
        bulkBar.style.cssText = `
            display: none;
            position: sticky;
            top: 0;
            background: var(--warning);
            padding: 0.5rem 1rem;
            margin: -1rem -1rem 1rem -1rem;
            justify-content: space-between;
            align-items: center;
            z-index: 10;
            border-radius: 6px 6px 0 0;
        `;

        tableContainer.insertBefore(bulkBar, table);
        return bulkBar;
    }

    // === UTILITY METHODS ===
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    handleNewItemShortcut() {
        const activeSection = document.querySelector('.section-content.active');
        if (!activeSection) return;

        const sectionId = activeSection.id;
        if (sectionId.includes('users')) window.AdminModals?.showCreateUserModal();
        else if (sectionId.includes('rooms')) window.AdminModals?.showCreateRoomModal();
        else if (sectionId.includes('menu')) window.AdminModals?.showCreateMenuModal();
    }

    focusSearch() {
        const activeSection = document.querySelector('.section-content.active');
        if (activeSection) {
            const searchInput = activeSection.querySelector('input[type="text"]');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
    }

    clearAllSearches() {
        const searchInputs = document.querySelectorAll('input[id$="-search"]');
        searchInputs.forEach(input => {
            input.value = '';
            input.dispatchEvent(new Event('input'));
        });
    }

    refreshCurrentSection() {
        const activeSection = document.querySelector('.admin-nav-link.active');
        if (activeSection) {
            activeSection.click();
        }
    }

    destroy() {
        // Clean up intervals
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();
    }
}

// Initialize Enhancements
window.AdminEnhancements = new AdminEnhancements();