# 🔄 **File Migration Plan - Junrai Karaoke Theme Unification**

## **Priority 1: Core Theme System (Complete)**
✅ **Updated Files:**
- `/app/public/stylesheets/theme.css` - Complete unified design system
- `/app/views/layout.ejs` - Modern layout template with Thai support
- `/app/views/index-new.ejs` - Example modernized homepage
- `/app/views/admin-dashboard-new.ejs` - Example admin dashboard

## **Priority 2: Layout Templates (Update Required)**

### **Main Layout Files:**
| Current File | Action Required | Notes |
|--------------|-----------------|--------|
| `/app/views/layout.ejs` | ✅ **Updated** | New unified layout with theme support |
| `/app/views/admin/layout.ejs` | 🔄 **Merge Required** | Inherit from main layout.ejs |
| `/app/views/partials/admin-navbar.ejs` | 🔄 **Update Classes** | Use new navbar system |
| `/app/views/partials/admin-sidebar.ejs` | 🔄 **Redesign** | Use new card/nav components |

## **Priority 3: Page Templates (Class Updates)**

### **Authentication Pages:**
| File | Current Classes → New Classes | Status |
|------|-------------------------------|---------|
| `/app/views/auth.ejs` | `.form-group` → `.form-group` (compatible) | ✅ Ready |
| `/app/views/forgot-password.ejs` | `.btn-primary` → `.btn-primary` (compatible) | ✅ Ready |
| `/app/views/reset-password.ejs` | Update button styles | 🔄 Minor Update |

### **Main Application Pages:**
| File | Required Changes | Priority |
|------|------------------|----------|
| `/app/views/index.ejs` | Replace with `index-new.ejs` content | 🔥 High |
| `/app/views/rooms.ejs` | Update to use `.card`, `.grid-3` classes | 🔥 High |
| `/app/views/bookings.ejs` | Update form classes, use new `.alert` system | 🔥 High |
| `/app/views/payment.ejs` | Update form styling, use new button variants | 🔥 High |
| `/app/views/dashboard.ejs` | Use new `.table`, `.card` systems | 🔥 High |
| `/app/views/contact.ejs` | Update form layout, use new `.form-input` classes | 🟡 Medium |

### **Admin Pages:**
| File | Required Changes | Priority |
|------|------------------|----------|
| `/app/views/admin.ejs` | Replace with `admin-dashboard-new.ejs` | 🔥 High |
| `/app/views/admin/dashboard.ejs` | Use new admin layout system | 🔥 High |
| `/app/views/admin/bookings.ejs` | Update table styling, use new `.table` class | 🔥 High |
| `/app/views/admin/members.ejs` | Update user management interface | 🟡 Medium |
| `/app/views/admin/admins.ejs` | Update admin management UI | 🟡 Medium |
| `/app/views/admin/login.ejs` | Use new form system | 🔥 High |

## **Priority 4: CSS File Consolidation**

### **Files to Merge into theme.css:**
| Current CSS File | Components to Migrate | Action |
|------------------|----------------------|---------|
| `/app/public/stylesheets/global.css` | Base styles, typography | ✅ **Merged** |
| `/app/public/stylesheets/admin.css` | Admin-specific colors | 🔄 **Extract & Merge** |
| `/app/public/stylesheets/dashboard.css` | Dashboard layouts | 🔄 **Merge** |
| `/app/public/stylesheets/bookings.css` | Form styles, calendar | 🔄 **Extract & Merge** |
| `/app/public/stylesheets/payment.css` | Payment form styles | 🔄 **Extract & Merge** |
| `/app/public/stylesheets/rooms.css` | Room card layouts | 🔄 **Extract & Merge** |
| `/app/public/stylesheets/auth.css` | Login/register forms | 🔄 **Extract & Merge** |
| `/app/public/stylesheets/contact.css` | Contact form styles | 🔄 **Extract & Merge** |

### **Files to Keep (Page-specific):**
| File | Purpose | Reason to Keep |
|------|---------|----------------|
| `/app/public/stylesheets/components/` | Component-specific styles | Modular approach |
| Custom animation files | Page-specific animations | Performance |

## **Priority 5: JavaScript Updates**

### **Theme-Related JS:**
| File | Updates Needed | Priority |
|------|----------------|----------|
| `/app/public/javascripts/shared/auth-nav.js` | Update selectors for new nav classes | 🔥 High |
| `/app/public/javascripts/admin/admin-dashboard.js` | Update for new admin layout | 🔥 High |
| `/app/public/javascripts/dashboard.js` | Update chart containers, card selectors | 🔥 High |
| `/app/public/javascripts/timeSlotBooking.js` | Update form selectors | 🟡 Medium |

## **Detailed Migration Steps:**

### **Step 1: Update Main Layout (Immediate)**
```bash
# Backup current layout
cp /app/views/layout.ejs /app/views/layout-backup.ejs

# Replace with new layout
# Already completed ✅
```

### **Step 2: Update Homepage**
```bash
# Backup current index
cp /app/views/index.ejs /app/views/index-backup.ejs

# Replace with modern version
cp /app/views/index-new.ejs /app/views/index.ejs
```

### **Step 3: Update Admin Dashboard**
```bash
# Backup current admin page
cp /app/views/admin.ejs /app/views/admin-backup.ejs

# Replace with new admin dashboard
cp /app/views/admin-dashboard-new.ejs /app/views/admin.ejs
```

### **Step 4: Class Name Mapping (Global Find & Replace)**

#### **Button Classes:**
```
Old → New
.btn-default → .btn-outline
.btn-info → .btn-primary
.btn-danger → .btn-error
```

#### **Alert Classes:**
```
Old → New
.alert-success → .alert-success (compatible)
.alert-danger → .alert-error
.alert-info → .alert-info (compatible)
```

#### **Layout Classes:**
```
Old → New
.container-fluid → .container
.row → .grid .grid-2/.grid-3/.grid-4
.col-* → Remove (use CSS Grid)
```

#### **Form Classes:**
```
Old → New
.form-control → .form-input
.form-group → .form-group (compatible)
.has-error → .error
```

### **Step 5: Component Updates**

#### **Navigation Updates:**
- Replace Bootstrap navbar with new `.navbar` system
- Update mobile menu toggle functionality
- Add theme toggle button

#### **Card System Updates:**
- Replace custom card styles with unified `.card` system
- Update card headers and footers
- Add hover effects

#### **Table Updates:**
- Replace Bootstrap tables with new `.table` system
- Add responsive table containers
- Update admin data tables

## **Testing Checklist:**

### **Visual Testing:**
- [ ] Homepage layout and responsiveness
- [ ] Admin dashboard functionality
- [ ] Form submissions and validation
- [ ] Navigation and mobile menu
- [ ] Theme toggle (dark/light mode)
- [ ] Thai text rendering
- [ ] Button hover effects and animations

### **Functionality Testing:**
- [ ] All existing functionality works
- [ ] JavaScript interactions work with new classes
- [ ] Form validations still function
- [ ] Admin features are accessible
- [ ] Mobile responsiveness maintained

### **Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)  
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS/Android)

## **Expected Benefits:**

### **Performance Improvements:**
- **CSS Size Reduction:** ~60% smaller (consolidation from 8 files to 1)
- **HTTP Requests:** Reduced from 8+ CSS files to 1
- **Caching:** Better browser caching with single CSS file

### **Maintainability:**
- **Single Source of Truth:** All styles in one themed file
- **Consistent Design:** No more conflicting styles
- **Easier Updates:** Change colors/fonts globally via CSS variables

### **User Experience:**
- **Faster Loading:** Fewer HTTP requests
- **Consistent Interface:** Unified design across all pages
- **Accessibility:** Better focus indicators and screen reader support
- **Mobile-First:** Improved responsive design

### **Developer Experience:**
- **CSS Variables:** Easy theme customization
- **Modular Classes:** Reusable components
- **Documentation:** Self-documenting class names
- **Thai Support:** Built-in Thai font system

## **Rollback Plan:**
If issues arise, rollback files are saved with `-backup` suffix:
- `layout-backup.ejs`
- `index-backup.ejs`
- `admin-backup.ejs`

Simply restore these files and restart the application.

---

**Total Migration Time Estimate:** 4-6 hours for complete implementation
**Risk Level:** Low (backward-compatible class names used where possible)
**Immediate Benefits:** Unified design, better performance, improved maintainability