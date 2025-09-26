// نظام إدارة الأرشيف والأنشطة القادمة
class ArchiveManager {
    constructor() {
        this.currentUser = authSystem.getCurrentUser();
        this.filters = {
            unit: '',
            date: '',
            search: ''
        };
        this.init();
    }

    init() {
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        if (!authSystem.isSupervisor()) {
            alert('ليست لديك صلاحية الوصول إلى هذه الصفحة.');
            window.location.href = 'dashboard.html';
            return;
        }

        this.setupFilters();
        this.loadData();
        this.bindEvents();
    }

    setupFilters() {
        // تعبئة فلتر الجهات
        const activities = storageManager.getActivities();
        const units = [...new Set(activities.map(a => a.assigned_unit))];
        const unitFilter = document.getElementById('unitFilter');
        
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            unitFilter.appendChild(option);
        });
    }

    loadData() {
        const activities = storageManager.getActivities();
        
        // الأنشطة القادمة (تاريخها في المستقبل)
        const upcoming = activities.filter(activity => {
            const activityDate = new Date(activity.scheduled_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            return activityDate > today && activity.status !== 'مؤرشف';
        });

        // الأنشطة المؤرشفة
        const archived = activities.filter(activity => 
            activity.status === 'مؤرشف' || activity.status === 'ملغى'
        );

        this.displayUpcomingActivities(upcoming);
        this.displayArchivedActivities(archived);

        document.getElementById('upcomingCount').textContent = upcoming.length;
        document.getElementById('archiveCount').textContent = archived.length;
    }

    displayUpcomingActivities(activities) {
        const container = document.getElementById('upcomingActivities');
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>لا توجد أنشطة قادمة</p>
                </div>
            `;
            return;
        }

        // ترتيب الأنشطة حسب التاريخ
        activities.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

        container.innerHTML = '';
        activities.forEach(activity => {
            const item = this.createUpcomingItem(activity);
            container.appendChild(item);
        });
    }

    displayArchivedActivities(activities) {
        const container = document.getElementById('archiveActivities');
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>لا توجد أنشطة مؤرشفة</p>
                </div>
            `;
            return;
        }

        // ترتيب الأنشطة حسب تاريخ الأرشفة
        activities.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

        container.innerHTML = '';
        activities.forEach(activity => {
            const item = this.createArchiveItem(activity);
            container.appendChild(item);
        });
    }

    createUpcomingItem(activity) {
        const div = document.createElement('div');
        div.className = 'upcoming-item';
        div.style.borderRightColor = this.getImportanceColor(activity.importance);
        
        const daysUntil = this.calculateDaysUntil(activity.scheduled_date);
        
        div.innerHTML = `
            <div class="item-header">
                <span class="item-title">${activity.title}</span>
                <span class="importance-badge ${this.getImportanceClass(activity.importance)}">
                    ${activity.importance}
                </span>
            </div>
            <div class="item-details">
                <span>${activity.assigned_unit} - ${activity.assigned_user}</span>
                <span>${this.formatDate(activity.scheduled_date)}</span>
            </div>
            <div class="item-details">
                <span>${activity.scheduled_time || 'طوال اليوم'}</span>
                <span>${daysUntil > 0 ? `بعد ${daysUntil} يوم` : 'غداً'}</span>
            </div>
            <div class="item-actions" style="margin-top: 10px; text-align: left;">
                <button onclick="archiveManager.editActivity('${activity.id}')" class="btn-small">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button onclick="archiveManager.cancelActivity('${activity.id}')" class="btn-small btn-danger">
                    <i class="fas fa-times"></i> إلغاء
                </button>
            </div>
        `;

        return div;
    }

    createArchiveItem(activity) {
        const div = document.createElement('div');
        div.className = 'archive-item';
        div.style.borderRightColor = activity.status === 'ملغى' ? '#ff4757' : '#6c757d';
        
        div.innerHTML = `
            <div class="item-header">
                <span class="item-title">${activity.title}</span>
                <span class="importance-badge ${this.getImportanceClass(activity.importance)}">
                    ${activity.status === 'ملغى' ? 'ملغى' : 'مؤرشف'}
                </span>
            </div>
            <div class="item-details">
                <span>${activity.assigned_unit} - ${activity.assigned_user}</span>
                <span>${this.formatDate(activity.scheduled_date)}</span>
            </div>
            <div class="item-details">
                <span>تم ${activity.status === 'ملغى' ? 'الإلغاء' : 'الأرشفة'} في ${this.formatDate(activity.updated_at)}</span>
            </div>
            ${activity.notes ? `<div style="margin-top: 8px; font-size: 0.9rem; color: #666;">${activity.notes}</div>` : ''}
        `;

        return div;
    }

    getImportanceColor(importance) {
        const colors = {
            'عاجل': '#ff4757',
            'متوسط': '#ffa502',
            'عادي': '#2ed573'
        };
        return colors[importance] || '#6c757d';
    }

    getImportanceClass(importance) {
        const classes = {
            'عاجل': 'badge-red',
            'متوسط': 'badge-orange',
            'عادي': 'badge-green'
        };
        return classes[importance] || '';
    }

    calculateDaysUntil(dateStr) {
        const targetDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);
        
        const diffTime = targetDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    editActivity(activityId) {
        // الانتقال إلى صفحة التعديل (يمكن تطويرها لاحقاً)
        alert(`سيتم تطوير صفحة تعديل النشاط ${activityId}`);
    }

    cancelActivity(activityId) {
        if (confirm('هل أنت متأكد من إلغاء هذا النشاط؟')) {
            if (storageManager.updateActivityStatus(activityId, 'ملغى')) {
                this.loadData();
                this.showNotification('تم إلغاء النشاط بنجاح', 'success');
            }
        }
    }

    bindEvents() {
        // أحداث الفلترة
        document.getElementById('unitFilter').addEventListener('change', (e) => {
            this.filters.unit = e.target.value;
            this.applyFilters();
        });

        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.filters.date = e.target.value;
            this.applyFilters();
        });

        document.getElementById('searchFilter').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.applyFilters();
        });
    }

    applyFilters() {
        // تطبيق الفلاتر (يمكن تطويرها لاحقاً)
        this.loadData();
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#06d6a0' : '#ff4757'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// أنماط إضافية للأزرار الصغيرة
const style = document.createElement('style');
style.textContent = `
    .btn-small {
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        background: #4361ee;
        color: white;
        cursor: pointer;
        font-size: 0.8rem;
        margin: 2px;
    }
    
    .btn-danger {
        background: #ff4757;
    }
    
    .btn-small:hover {
        opacity: 0.8;
    }
    
    .badge {
        background: #4361ee;
        color: white;
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 0.8rem;
    }
`;
document.head.appendChild(style);

// تهيئة المدير
let archiveManager;
document.addEventListener('DOMContentLoaded', () => {
    archiveManager = new ArchiveManager();
});