// إدارة لوحة التحكم الرئيسية
class Dashboard {
    constructor() {
        this.currentUser = authSystem.getCurrentUser();
        this.selectedUnit = null;
        this.init();
    }

    init() {
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.setupUI();
        this.loadDashboard();
        this.bindEvents();
    }

    setupUI() {
        // ترحيب بالمستخدم
        document.getElementById('welcomeMessage').textContent += this.currentUser.username;
        document.getElementById('userRole').textContent = 
            this.currentUser.role === 'supervisor' ? 'مشرف' : 'موظف - ' + this.currentUser.unit;

        // إظهار/إخفاء العناصر حسب الصلاحية
        if (this.currentUser.role === 'supervisor') {
            document.getElementById('addActivityBtn').style.display = 'inline-flex';
            document.getElementById('unitsSection').style.display = 'block';
            this.loadUnits();
        }
    }

    loadUnits() {
        const activities = storageManager.getActivities();
        const units = [...new Set(activities.map(a => a.assigned_unit))];
        
        const container = document.getElementById('unitsContainer');
        container.innerHTML = '';

        units.forEach(unit => {
            const unitActivities = activities.filter(a => a.assigned_unit === unit);
            const card = document.createElement('div');
            card.className = 'unit-card';
            card.onclick = () => this.filterByUnit(unit);
            
            card.innerHTML = `
                <strong>${unit}</strong>
                <div class="unit-stats">
                    <span>${unitActivities.length} نشاط</span>
                    <span>
                        <span class="urgent-indicator urgent-red"></span>
                        ${unitActivities.filter(a => a.importance === 'عاجل').length}
                    </span>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    filterByUnit(unit) {
        this.selectedUnit = unit;
        this.loadActivities();
    }

    loadDashboard() {
        this.updateStats();
        this.loadActivities();
        this.setupAutoRefresh();
    }

    updateStats() {
        const activities = storageManager.getActivities();
        const todayActivities = storageManager.getTodayActivities();
        
        // الإحصائيات العامة
        document.getElementById('totalStats').textContent = activities.length;
        document.getElementById('completedStats').textContent = 
            activities.filter(a => a.status === 'منجز').length;
        document.getElementById('pendingStats').textContent = 
            activities.filter(a => a.status === 'قيد التنفيذ').length;
        document.getElementById('overdueStats').textContent = 
            activities.filter(a => a.status === 'معلق').length;

        // الإحصائيات حسب الأهمية
        document.getElementById('urgentStats').textContent = 
            activities.filter(a => a.importance === 'عاجل').length;
        document.getElementById('mediumStats').textContent = 
            activities.filter(a => a.importance === 'متوسط').length;
        document.getElementById('normalStats').textContent = 
            activities.filter(a => a.importance === 'عادي').length;
    }

    loadActivities() {
        let activities = storageManager.getTodayActivities();
        
        // التصفية حسب الجهة للموظفين
        if (this.currentUser.role === 'employee') {
            activities = activities.filter(a => a.assigned_unit === this.currentUser.unit);
        }
        
        // التصفية حسب الجهة المحددة للمشرف
        if (this.selectedUnit) {
            activities = activities.filter(a => a.assigned_unit === this.selectedUnit);
        }

        this.displayActivities(activities);
    }

    displayActivities(activities) {
        const container = document.getElementById('activitiesContainer');
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="no-activities">
                    <p>لا توجد أنشطة لهذا اليوم</p>
                    <p>${this.currentUser.role === 'supervisor' ? 
                        'انقر على "إضافة نشاط" لبدء التخطيط' : 
                        'لا توجد مهام مسندة إليك لهذا اليوم'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        activities.forEach((activity, index) => {
            const activityElement = this.createActivityCard(activity, index);
            container.appendChild(activityElement);
        });
    }

    createActivityCard(activity, index) {
        const div = document.createElement('div');
        const importanceClass = this.getImportanceClass(activity.importance);
        const statusClass = activity.status === 'معلق' ? 'activity-overdue' : '';
        
        div.className = `activity-button ${importanceClass} ${statusClass}`;
        div.dataset.id = activity.id;
        div.style.animationDelay = `${index * 0.1}s`;

        const timeRemaining = this.calculateTimeRemaining(activity);
        
        div.innerHTML = `
            <div class="activity-content">
                ${this.currentUser.role === 'supervisor' ? 
                    `<button class="action-menu-btn" onclick="dashboard.showActionMenu('${activity.id}', event)">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>` : 
                    `<button class="complete-btn" onclick="dashboard.markAsCompleted('${activity.id}')">
                        <i class="fas fa-check-circle"></i>
                    </button>`
                }
                
                <div class="activity-header">
                    <span class="employee-name">${activity.assigned_user}</span>
                </div>
                
                <h3>${activity.title}</h3>
                
                <div class="activity-details">
                    <span class="activity-importance">
                        ${this.getImportanceIcon(activity.importance)} ${activity.importance}
                    </span>
                    <span class="activity-status ${activity.status === 'منجز' ? 'completed' : ''}">
                        ${this.getStatusIcon(activity.status)} ${activity.status}
                    </span>
                </div>
                
                <div class="activity-footer">
                    <span class="activity-time">
                        <i class="fas fa-clock"></i> ${activity.scheduled_time || 'غير محدد'}
                    </span>
                    <span class="time-remaining">
                        <i class="fas fa-hourglass-half"></i> ${timeRemaining}
                    </span>
                </div>
            </div>
        `;

        return div;
    }

    getImportanceClass(importance) {
        const classes = {
            'عاجل': 'importance-red',
            'متوسط': 'importance-orange',
            'عادي': 'importance-green'
        };
        return classes[importance] || '';
    }

    getImportanceIcon(importance) {
        const icons = {
            'عاجل': '🔴',
            'متوسط': '🟠',
            'عادي': '🟢'
        };
        return icons[importance] || '⚪';
    }

    getStatusIcon(status) {
        const icons = {
            'منجز': '✅',
            'قيد التنفيذ': '⏳',
            'معلق': '⚠️'
        };
        return icons[status] || '📝';
    }

    calculateTimeRemaining(activity) {
        if (!activity.scheduled_time) {
            return 'حتى نهاية الدوام';
        }

        const now = new Date();
        const [hours, minutes] = activity.scheduled_time.split(':');
        const activityTime = new Date();
        activityTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const diffMs = activityTime - now;
        if (diffMs <= 0) return 'انتهى الوقت';

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
            return `متبقي: ${diffHours} ساعة ${diffMinutes} دقيقة`;
        } else {
            return `متبقي: ${diffMinutes} دقيقة`;
        }
    }

    showActionMenu(activityId, event) {
        event.stopPropagation();
        const menu = document.getElementById('actionMenu');
        menu.style.display = 'block';
        menu.style.top = `${event.clientY}px`;
        menu.style.left = `${event.clientX}px`;
        menu.dataset.activityId = activityId;
    }

    markAsCompleted(activityId) {
        if (storageManager.updateActivityStatus(activityId, 'منجز')) {
            this.loadDashboard();
            this.showCompletionEffect(activityId);
        }
    }

    bindEvents() {
        // زر الخروج
        document.getElementById('logoutBtn').addEventListener('click', () => {
            authSystem.logout();
            window.location.href = 'login.html';
        });

        // زر إضافة نشاط
        document.getElementById('addActivityBtn').addEventListener('click', () => {
            window.location.href = 'input.html';
        });

        // إغلاق قائمة الإجراءات عند النقر خارجها
        document.addEventListener('click', () => {
            document.getElementById('actionMenu').style.display = 'none';
        });
    }

    setupAutoRefresh() {
        // تحديث تلقائي كل دقيقة
        setInterval(() => {
            this.updateStats();
        }, 60000);
    }
}

// تهيئة اللوحة عند تحميل الصفحة
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new Dashboard();
});