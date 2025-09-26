// تطبيق إدارة الأنشطة الإدارية المتكامل - app.js
class ActivityManagementApp {
    constructor() {
        this.currentUser = null;
        this.selectedUnit = null;
        this.currentView = 'dashboard';
        this.init();
    }

    async init() {
        try {
            await this.initializeAuth();
            this.checkAccessPermissions();
            this.initializeUI();
            this.bindGlobalEvents();
            this.loadInitialData();
            this.startBackgroundServices();
            
            console.log('✅ النظام جاهز للعمل', {
                user: this.currentUser,
                view: this.currentView
            });
        } catch (error) {
            console.error('❌ خطأ في تهيئة النظام:', error);
            this.showError('خطأ في تحميل النظام', error.message);
        }
    }

    // 1. نظام المصادقة والصلاحيات
    async initializeAuth() {
        this.currentUser = authSystem.getCurrentUser();
        
        if (!this.currentUser) {
            // إذا لم يكن هناك مستخدم مسجل، التوجيه إلى صفحة الدخول
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
                throw new Error('يجب تسجيل الدخول أولاً');
            }
            return;
        }

        // التحقق من صلاحية الوصول للصفحة الحالية
        this.validatePageAccess();
    }

    validatePageAccess() {
        const currentPage = window.location.pathname.split('/').pop();
        
        // الصفحات المسموح للموظف العادي الوصول إليها
        const employeeAllowedPages = ['dashboard.html', 'index.html', 'login.html'];
        
        if (this.currentUser.role === 'employee' && !employeeAllowedPages.includes(currentPage)) {
            alert('ليست لديك صلاحية الوصول إلى هذه الصفحة.');
            window.location.href = 'dashboard.html';
            return false;
        }

        return true;
    }

    checkAccessPermissions() {
        // تحديث واجهة المستخدم بناءً على الصلاحيات
        this.updateUIBasedOnPermissions();
    }

    // 2. تهيئة واجهة المستخدم
    initializeUI() {
        this.setupNavigation();
        this.setupDateDisplay();
        this.setupRealTimeUpdates();
    }

    setupNavigation() {
        // إعداد التنقل بين الصفحات
        const navLinks = document.querySelectorAll('[data-nav]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-nav');
                this.navigateTo(target);
            });
        });

        // زر العودة
        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => window.history.back());
        }
    }

    setupDateDisplay() {
        // عرض التاريخ والوقت الحالي
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 60000); // تحديث كل دقيقة
    }

    updateDateTime() {
        const now = new Date();
        const dateElements = document.querySelectorAll('.current-date, #currentDate');
        
        dateElements.forEach(element => {
            element.textContent = now.toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        });

        const timeElements = document.querySelectorAll('.current-time');
        timeElements.forEach(element => {
            element.textContent = now.toLocaleTimeString('ar-EG');
        });
    }

    // 3. إدارة البيانات والأنشطة
    async loadInitialData() {
        try {
            await this.loadDashboardData();
            await this.loadUserSpecificData();
            this.setupAutoRefresh();
        } catch (error) {
            console.error('خطأ في تحميل البيانات:', error);
        }
    }

    async loadDashboardData() {
        if (!document.getElementById('activitiesContainer')) return;

        const activities = await this.getTodayActivities();
        this.displayActivities(activities);
        this.updateStatistics(activities);
    }

    async getTodayActivities() {
        let activities = storageManager.getTodayActivities();
        
        // تطبيق الفلترة حسب صلاحية المستخدم
        if (this.currentUser.role === 'employee') {
            activities = activities.filter(activity => 
                activity.assigned_user === this.currentUser.username
            );
        }
        
        // تطبيق فلترة الجهة إذا كانت محددة
        if (this.selectedUnit) {
            activities = activities.filter(activity => 
                activity.assigned_unit === this.selectedUnit
            );
        }

        // التحقق من الأنشطة المتأخرة
        activities = this.checkOverdueActivities(activities);
        
        return activities;
    }

    checkOverdueActivities(activities) {
        const now = new Date();
        
        return activities.map(activity => {
            if (activity.status === 'قيد التنفيذ') {
                const isOverdue = this.isActivityOverdue(activity, now);
                if (isOverdue) {
                    return {
                        ...activity,
                        status: 'معلق',
                        pending_since: activity.pending_since || now.toISOString()
                    };
                }
            }
            return activity;
        });
    }

    isActivityOverdue(activity, now) {
        if (!activity.scheduled_date) return false;

        const activityDate = new Date(activity.scheduled_date);
        
        // إذا كان التاريخ قد مضى
        if (activityDate < new Date(now.toDateString())) {
            return true;
        }

        // إذا كان التاريخ هو اليوم وتحقق الوقت
        if (activityDate.toDateString() === now.toDateString() && activity.scheduled_time) {
            const [hours, minutes] = activity.scheduled_time.split(':');
            const activityTime = new Date(activityDate);
            activityTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            return now > activityTime;
        }

        return false;
    }

    // 4. عرض الأنشطة
    displayActivities(activities) {
        const container = document.getElementById('activitiesContainer');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = '';
        activities.forEach((activity, index) => {
            const activityElement = this.createActivityCard(activity, index);
            container.appendChild(activityElement);
        });

        // إضافة تأثيرات الظهور
        this.animateActivities();
    }

    createActivityCard(activity, index) {
        const card = document.createElement('div');
        card.className = `activity-card ${this.getActivityStatusClass(activity)}`;
        card.dataset.activityId = activity.id;
        card.style.animationDelay = `${index * 0.1}s`;

        card.innerHTML = this.generateActivityCardHTML(activity);
        this.addActivityCardEvents(card, activity);

        return card;
    }

    getActivityStatusClass(activity) {
        const classes = {
            'منجز': 'completed',
            'معلق': 'overdue',
            'قيد التنفيذ': 'pending'
        };
        return classes[activity.status] || 'pending';
    }

    generateActivityCardHTML(activity) {
        const timeRemaining = this.calculateTimeRemaining(activity);
        const canEdit = authSystem.canModifyActivity(activity);
        
        return `
            <div class="activity-card-header">
                <div class="employee-info">
                    <span class="employee-name">${activity.assigned_user}</span>
                    <span class="unit-badge">${activity.assigned_unit}</span>
                </div>
                <div class="activity-actions">
                    ${canEdit ? this.getActionButtonsHTML(activity) : this.getEmployeeActionsHTML(activity)}
                </div>
            </div>
            
            <div class="activity-card-body">
                <h3 class="activity-title">${activity.title}</h3>
                ${activity.notes ? `<p class="activity-notes">${activity.notes}</p>` : ''}
                
                <div class="activity-meta">
                    <span class="importance-badge ${activity.importance}">
                        ${this.getImportanceIcon(activity.importance)} ${activity.importance}
                    </span>
                    <span class="status-badge ${activity.status}">
                        ${this.getStatusIcon(activity.status)} ${activity.status}
                    </span>
                </div>
            </div>
            
            <div class="activity-card-footer">
                <div class="time-info">
                    <span class="scheduled-time">
                        <i class="fas fa-clock"></i>
                        ${activity.scheduled_time || 'غير محدد'}
                    </span>
                    <span class="time-remaining">
                        <i class="fas fa-hourglass-half"></i>
                        ${timeRemaining}
                    </span>
                </div>
                <div class="date-info">
                    ${new Date(activity.scheduled_date).toLocaleDateString('ar-EG')}
                </div>
            </div>
            
            ${activity.status === 'معلق' ? this.getOverdueWarningHTML(activity) : ''}
        `;
    }

    getActionButtonsHTML(activity) {
        return `
            <div class="action-menu">
                <button class="menu-toggle" onclick="app.toggleActionMenu('${activity.id}')">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="menu-content" id="menu-${activity.id}">
                    <button onclick="app.editActivity('${activity.id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button onclick="app.deleteActivity('${activity.id}')" class="danger">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                    ${activity.status === 'منجز' ? `
                    <button onclick="app.archiveActivity('${activity.id}')">
                        <i class="fas fa-archive"></i> أرشفة
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEmployeeActionsHTML(activity) {
        if (activity.status === 'قيد التنفيذ') {
            return `
                <button class="complete-btn" onclick="app.markAsCompleted('${activity.id}')" 
                        title="تأشير كمكتمل">
                    <i class="fas fa-check-circle"></i>
                </button>
            `;
        }
        return '';
    }

    getOverdueWarningHTML(activity) {
        const daysPending = this.calculateDaysPending(activity);
        return `
            <div class="overdue-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <span>معلق منذ ${daysPending} يوم</span>
                ${daysPending >= 3 ? '<span class="critical">يتطلب تدخل عاجل!</span>' : ''}
            </div>
        `;
    }

    // 5. الأحداث والتفاعلات
    addActivityCardEvents(card, activity) {
        // النقر على البطاقة (للتوسيع أو التفاصيل)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.activity-actions')) {
                this.showActivityDetails(activity);
            }
        });

        // السحب والإفلات (للتحديث اللاحق)
        this.makeActivityDraggable(card, activity);
    }

    toggleActionMenu(activityId) {
        const menus = document.querySelectorAll('.menu-content');
        menus.forEach(menu => {
            if (menu.id !== `menu-${activityId}`) {
                menu.style.display = 'none';
            }
        });

        const targetMenu = document.getElementById(`menu-${activityId}`);
        if (targetMenu) {
            targetMenu.style.display = targetMenu.style.display === 'block' ? 'none' : 'block';
        }
    }

    // 6. إجراءات الأنشطة
    async markAsCompleted(activityId) {
        try {
            if (storageManager.updateActivityStatus(activityId, 'منجز')) {
                this.showSuccess('تم تأشير النشاط كمكتمل');
                await this.refreshActivities();
                this.animateCompletion(activityId);
            }
        } catch (error) {
            this.showError('خطأ في تحديث النشاط', error.message);
        }
    }

    async editActivity(activityId) {
        // الانتقال إلى صفحة التعديل
        window.location.href = `edit-activity.html?id=${activityId}`;
    }

    async deleteActivity(activityId) {
        if (confirm('هل أنت متأكد من حذف هذا النشاط؟ لا يمكن التراجع عن هذا الإجراء.')) {
            try {
                if (storageManager.deleteActivity(activityId)) {
                    this.showSuccess('تم حذف النشاط بنجاح');
                    await this.refreshActivities();
                }
            } catch (error) {
                this.showError('خطأ في حذف النشاط', error.message);
            }
        }
    }

    async archiveActivity(activityId) {
        try {
            if (storageManager.archiveActivity(activityId)) {
                this.showSuccess('تم أرشفة النشاط بنجاح');
                await this.refreshActivities();
            }
        } catch (error) {
            this.showError('خطأ في أرشفة النشاط', error.message);
        }
    }

    // 7. النظام الأساسي
    bindGlobalEvents() {
        // تحديث عند تغيير الحجم
        window.addEventListener('resize', () => this.handleResize());
        
        // التحديث التلقائي
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshActivities();
            }
        });

        // منع الإغلاق إذا كان هناك تغييرات غير محفوظة
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'لديك تغييرات غير محفوظة. هل تريد المغادرة دون الحفظ؟';
            }
        });
    }

    startBackgroundServices() {
        // خدمة التحقق من الأنشطة المتأخرة
        setInterval(() => {
            this.checkSuspensionSystem();
        }, 300000); // كل 5 دقائق

        // خدمة التحديث التلقائي للبيانات
        setInterval(() => {
            this.refreshActivities();
        }, 60000); // كل دقيقة
    }

    async checkSuspensionSystem() {
        try {
            const suspensionSystem = new SuspensionSystem();
            suspensionSystem.checkOverdueActivities();
            
            // تحديث الواجهة إذا كانت هناك تغييرات
            if (suspensionSystem.getSuspensionStats().exceededThreshold > 0) {
                await this.refreshActivities();
            }
        } catch (error) {
            console.error('خطأ في نظام التعليق:', error);
        }
    }

    // 8. الأدوات المساعدة
    calculateTimeRemaining(activity) {
        if (!activity.scheduled_date) return 'غير محدد';

        const now = new Date();
        const activityDate = new Date(activity.scheduled_date);
        
        if (activity.scheduled_time) {
            const [hours, minutes] = activity.scheduled_time.split(':');
            activityDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            activityDate.setHours(23, 59, 59, 999); // نهاية اليوم
        }

        const diffMs = activityDate - now;
        
        if (diffMs <= 0) return 'انتهى الوقت';

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffDays > 0) {
            return `بعد ${diffDays} يوم`;
        } else if (diffHours > 0) {
            return `متبقي ${diffHours} ساعة ${diffMinutes} دقيقة`;
        } else {
            return `متبقي ${diffMinutes} دقيقة`;
        }
    }

    calculateDaysPending(activity) {
        if (!activity.pending_since) return 0;
        
        const pendingSince = new Date(activity.pending_since);
        const now = new Date();
        return Math.floor((now - pendingSince) / (1000 * 60 * 60 * 24));
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
            'معلق': '⚠️',
            'مؤرشف': '📁',
            'ملغى': '❌'
        };
        return icons[status] || '📝';
    }

    // 9. التحديثات والرسائل
    async refreshActivities() {
        try {
            const activities = await this.getTodayActivities();
            this.displayActivities(activities);
            this.updateStatistics(activities);
        } catch (error) {
            console.error('خطأ في تحديث الأنشطة:', error);
        }
    }

    updateStatistics(activities) {
        const stats = storageManager.getAdvancedStats();
        
        // تحديث عناصر الإحصائيات إذا كانت موجودة
        const statElements = {
            'totalStats': stats.total,
            'todayStats': stats.today,
            'completedStats': stats.byStatus['منجز'] || 0,
            'pendingStats': stats.byStatus['قيد التنفيذ'] || 0,
            'overdueStats': stats.byStatus['معلق'] || 0
        };

        Object.keys(statElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = statElements[id];
            }
        });
    }

    // 10. الرسائل والتأثيرات
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(title, message) {
        this.showNotification(`${title}: ${message}`, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // إزالة تلقائية بعد 5 ثوان
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    animateCompletion(activityId) {
        const activityCard = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (activityCard) {
            activityCard.classList.add('completion-animation');
            setTimeout(() => {
                activityCard.classList.remove('completion-animation');
            }, 2000);
        }
    }

    animateActivities() {
        const cards = document.querySelectorAll('.activity-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in-up');
        });
    }

    // 11. أدوات التطوير
    async exportData() {
        try {
            const data = storageManager.getData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            this.showError('خطأ في تصدير البيانات', error.message);
        }
    }

    async importData(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            localStorage.setItem('activityManagementSystem', text);
            this.showSuccess('تم استيراد البيانات بنجاح');
            this.refreshActivities();
        } catch (error) {
            this.showError('خطأ في استيراد البيانات', error.message);
        }
    }
}

// التهيئة عند تحميل الصفحة
let app;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        app = new ActivityManagementApp();
        
        // جعل app متاحاً globally للاستدعاء من الأحداث
        window.app = app;
        
        console.log('🚀 تطبيق إدارة الأنشطة يعمل بنجاح');
    } catch (error) {
        console.error('💥 فشل في تهيئة التطبيق:', error);
        
        // عرض رسالة خطأ للمستخدم
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ef476f;
            color: white;
            padding: 20px;
            text-align: center;
            z-index: 10000;
        `;
        errorDiv.innerHTML = `
            <strong>خطأ في تحميل التطبيق</strong>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #ef476f;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 10px;
                cursor: pointer;
            ">إعادة المحاولة</button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// دالات مساعدة global
window.logout = function() {
    authSystem.logout();
    window.location.href = 'login.html';
};

window.navigateTo = function(page) {
    window.location.href = page;
};

// دالة للتحقق من حالة النظام
window.getSystemStatus = function() {
    return {
        user: app?.currentUser,
        activitiesCount: storageManager.getActivities().length,
        lastUpdate: new Date().toISOString(),
        system: 'active'
    };
};