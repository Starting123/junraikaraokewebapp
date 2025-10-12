// rooms.js - Room Listings Page JavaScript
(function() {
    'use strict';
    
    let roomsManager;
    
    class RoomsManager {
        constructor() {
            this.rooms = [];
            this.filteredRooms = [];
            this.currentFilters = {
                type: 'all',
                capacity: 'all',
                priceRange: [0, 5000],
                availability: 'all'
            };
            this.init();
        }
        
        init() {
            this.loadRooms();
            this.setupFilterControls();
            this.setupPriceSlider();
            this.setupEventListeners();
        }
        
        setupEventListeners() {
            // Filter form submission
            const filterForm = document.getElementById('room-filters');
            if (filterForm) {
                filterForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.applyFilters();
                });
            }
            
            // Clear filters button
            const clearBtn = document.getElementById('clear-filters');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.clearFilters();
                });
            }
            
            // Room booking buttons
            document.addEventListener('click', (e) => {
                if (e.target.matches('.btn-book')) {
                    e.preventDefault();
                    const roomId = e.target.dataset.roomId;
                    this.handleBooking(roomId);
                }
            });
        }
        
        setupFilterControls() {
            // Type filter
            const typeSelect = document.getElementById('room-type');
            if (typeSelect) {
                typeSelect.addEventListener('change', (e) => {
                    this.currentFilters.type = e.target.value;
                    this.applyFilters();
                });
            }
            
            // Capacity filter
            const capacitySelect = document.getElementById('room-capacity');
            if (capacitySelect) {
                capacitySelect.addEventListener('change', (e) => {
                    this.currentFilters.capacity = e.target.value;
                    this.applyFilters();
                });
            }
            
            // Availability filter
            const availabilitySelect = document.getElementById('room-availability');
            if (availabilitySelect) {
                availabilitySelect.addEventListener('change', (e) => {
                    this.currentFilters.availability = e.target.value;
                    this.applyFilters();
                });
            }
        }
        
        setupPriceSlider() {
            const priceSlider = document.getElementById('price-range');
            const priceDisplay = document.getElementById('price-display');
            
            if (priceSlider && priceDisplay) {
                priceSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this.currentFilters.priceRange[1] = value;
                    priceDisplay.textContent = `฿${value}`;
                    
                    // Debounce filter application
                    clearTimeout(this.priceFilterTimeout);
                    this.priceFilterTimeout = setTimeout(() => {
                        this.applyFilters();
                    }, 300);
                });
            }
        }
        
        async loadRooms() {
            try {
                const response = await fetch('/api/rooms');
                if (response.ok) {
                    this.rooms = await response.json();
                    this.filteredRooms = [...this.rooms];
                    this.renderRooms();
                }
            } catch (error) {
                console.error('Failed to load rooms:', error);
                this.showError('ไม่สามารถโหลดข้อมูลห้องได้');
            }
        }
        
        applyFilters() {
            this.filteredRooms = this.rooms.filter(room => {
                // Type filter
                if (this.currentFilters.type !== 'all' && room.type !== this.currentFilters.type) {
                    return false;
                }
                
                // Capacity filter
                if (this.currentFilters.capacity !== 'all') {
                    const capacity = parseInt(this.currentFilters.capacity);
                    if (room.capacity < capacity) {
                        return false;
                    }
                }
                
                // Price range filter
                const price = parseFloat(room.price_per_hour);
                if (price < this.currentFilters.priceRange[0] || price > this.currentFilters.priceRange[1]) {
                    return false;
                }
                
                // Availability filter
                if (this.currentFilters.availability !== 'all' && room.status !== this.currentFilters.availability) {
                    return false;
                }
                
                return true;
            });
            
            this.renderRooms();
        }
        
        clearFilters() {
            // Reset filter values
            this.currentFilters = {
                type: 'all',
                capacity: 'all',
                priceRange: [0, 5000],
                availability: 'all'
            };
            
            // Reset form controls
            const typeSelect = document.getElementById('room-type');
            const capacitySelect = document.getElementById('room-capacity');
            const availabilitySelect = document.getElementById('room-availability');
            const priceSlider = document.getElementById('price-range');
            const priceDisplay = document.getElementById('price-display');
            
            if (typeSelect) typeSelect.value = 'all';
            if (capacitySelect) capacitySelect.value = 'all';
            if (availabilitySelect) availabilitySelect.value = 'all';
            if (priceSlider) priceSlider.value = '5000';
            if (priceDisplay) priceDisplay.textContent = '฿5000';
            
            // Apply filters
            this.applyFilters();
        }
        
        renderRooms() {
            const roomsGrid = document.getElementById('rooms-grid');
            if (!roomsGrid) return;
            
            if (this.filteredRooms.length === 0) {
                roomsGrid.innerHTML = this.getEmptyStateHTML();
                return;
            }
            
            const roomsHTML = this.filteredRooms.map(room => this.getRoomCardHTML(room)).join('');
            roomsGrid.innerHTML = roomsHTML;
        }
        
        getRoomCardHTML(room) {
            const statusClass = `status-${room.status}`;
            const statusText = {
                'available': 'ว่าง',
                'occupied': 'ไม่ว่าง',
                'maintenance': 'ปรับปรุง'
            }[room.status] || room.status;
            
            return `
                <div class="room-card">
                    <div class="room-image">
                        <img src="${room.image_url || '/images/default-room.jpg'}" alt="${room.name}">
                        <div class="room-status ${statusClass}">${statusText}</div>
                        <div class="room-badge">${room.type_name || 'Standard'}</div>
                    </div>
                    <div class="room-content">
                        <div class="room-header">
                            <h3 class="room-title">${room.name}</h3>
                            <div class="room-price">
                                <span class="price-amount">฿${room.price_per_hour}</span>
                                <span class="price-unit">/ชั่วโมง</span>
                            </div>
                        </div>
                        
                        <div class="room-features">
                            <div class="feature-item">
                                <i class="fas fa-users"></i>
                                <span>${room.capacity || 0} คน</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-tv"></i>
                                <span>TV ${room.tv_size || 'มาตรฐาน'}"</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-volume-up"></i>
                                <span>เสียงคุณภาพสูง</span>
                            </div>
                            <div class="feature-item">
                                <i class="fas fa-wifi"></i>
                                <span>WiFi ฟรี</span>
                            </div>
                        </div>
                        
                        <p class="room-description">${room.description || 'ห้องคาราโอเกะที่ตกแต่งสวยงาม พร้อมระบบเสียงคุณภาพสูง'}</p>
                        
                        <div class="room-actions">
                            <button class="btn-book" data-room-id="${room.room_id}" ${room.status !== 'available' ? 'disabled' : ''}>
                                <i class="fas fa-calendar-plus"></i>
                                จองห้อง
                            </button>
                            <a href="/rooms/${room.room_id}" class="btn-details">
                                <i class="fas fa-info-circle"></i>
                                รายละเอียด
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        getEmptyStateHTML() {
            return `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>ไม่พบห้องที่ตรงกับเงื่อนไขการค้นหา</h3>
                    <p>ลองปรับเปลี่ยนตัวกรองหรือล้างการกรองทั้งหมด</p>
                    <button class="btn btn-primary" onclick="roomsManager.clearFilters()">
                        ล้างตัวกรอง
                    </button>
                </div>
            `;
        }
        
        handleBooking(roomId) {
            // Check if user is logged in
            if (!window.serverData?.user) {
                window.location.href = `/auth?redirect=${encodeURIComponent('/rooms')}`;
                return;
            }
            
            // Redirect to booking page with room pre-selected
            window.location.href = `/bookings/new?room_id=${roomId}`;
        }
        
        showError(message) {
            // Use the toast notification system
            if (window.showToast) {
                window.showToast(message, 'error');
            } else {
                alert(message);
            }
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            roomsManager = new RoomsManager();
        });
    } else {
        roomsManager = new RoomsManager();
    }
    
    // Export for global access
    window.RoomsManager = RoomsManager;
})();