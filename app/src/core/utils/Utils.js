/**
 * Utility functions for common operations
 */

class Utils {
    
    /**
     * แปลงวันที่เป็นรูปแบบ string
     */
    static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = new Date(date);
        
        if (format === 'YYYY-MM-DD') {
            return d.toISOString().split('T')[0];
        }
        
        if (format === 'YYYY-MM-DD HH:mm:ss') {
            return d.toISOString().slice(0, 19).replace('T', ' ');
        }
        
        return d.toISOString();
    }

    /**
     * ตรวจสอบว่าเป็นวันที่ถูกต้องหรือไม่
     */
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    /**
     * คำนวณระยะเวลาระหว่าง 2 วันที่ (ในหน่วยชั่วโมง)
     */
    static calculateHoursDiff(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return (end - start) / (1000 * 60 * 60);
    }

    /**
     * แปลงเงินจากบาทเป็นสตางค์
     */
    static bahtToSatang(amount) {
        return Math.round(parseFloat(amount) * 100);
    }

    /**
     * แปลงเงินจากสตางค์เป็นบาท
     */
    static satangToBaht(amount) {
        return parseFloat(amount) / 100;
    }

    /**
     * สร้าง ID แบบสุ่ม
     */
    static generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * ตรวจสอบว่าเป็น email ที่ถูกต้องหรือไม่
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * ตรวจสอบว่าเป็นเบอร์โทรไทยที่ถูกต้องหรือไม่
     */
    static isValidThaiPhone(phone) {
        const phoneRegex = /^(\+66|0)[0-9]{8,9}$/;
        return phoneRegex.test(phone.replace(/[-\s]/g, ''));
    }

    /**
     * Sanitize string (ลบ HTML tags และ special characters)
     */
    static sanitizeString(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/<[^>]*>?/gm, '').trim();
    }

    /**
     * แปลง object เป็น query string
     */
    static objectToQueryString(obj) {
        return Object.keys(obj)
            .filter(key => obj[key] !== undefined && obj[key] !== null)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
            .join('&');
    }

    /**
     * Sleep function (สำหรับ async/await)
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Deep clone object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    /**
     * ตรวจสอบว่า object ว่างหรือไม่
     */
    static isEmpty(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        return Object.keys(obj).length === 0;
    }

    /**
     * Retry function with exponential backoff
     */
    static async retry(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) throw error;
            await this.sleep(delay);
            return this.retry(fn, retries - 1, delay * 2);
        }
    }

    /**
     * Format phone number
     */
    static formatPhoneNumber(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('66')) {
            return `+${cleaned}`;
        }
        if (cleaned.startsWith('0')) {
            return `+66${cleaned.substring(1)}`;
        }
        return `+66${cleaned}`;
    }

    /**
     * Truncate text
     */
    static truncateText(text, maxLength = 100, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }
}

module.exports = Utils;