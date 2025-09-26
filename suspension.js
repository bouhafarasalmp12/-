// نظام إدارة الأنشطة المعلقة والبروتوكول
class SuspensionSystem {
    constructor() {
        this.pendingThreshold = 3; // 3 أيام مهلة
        this.checkInterval = 5 * 60 * 1000; // التحقق كل 5 دقائق
        this.init();
    }

    init() {
        this.checkOverdueActivities();
        this.startMonitoring();
    }

    // التحقق من الأنشطة المتأخرة
    checkOverdueActivities() {
        const activities = storageManager.getActivities();
        const now = new Date();
        let updated = false;

        activities.forEach(activity => {
            if (activity.status === 'قيد التنفيذ') {
                const isOverdue = this.isActivityOverdue(activity, now);
                
                if (isOverdue && activity.status !== 'معلق') {
                    activity.status = 'معلق';
                    activity.pending_since = now.toISOString();
                    updated = true;
                    this.logSuspension(activity);
                }
            }
        });

        if (updated) {
            storageManager.saveActivities(activities);
            this.checkSupervisorRestrictions();
        }
    }

    // التحقق إذا تجاوز النشاط وقته
    isActivityOverdue(activity, now) {
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

    // التحقق من قيود المشرف
    checkSupervisorRestrictions() {
        const pendingActivities = this.getPendingActivities();
        const hasExceededThreshold = this.hasExceededThreshold(pendingActivities);

        if (hasExceededThreshold) {
            this.applySupervisorRestrictions();
        }
    }

    // الحصول على الأنشطة المعلقة التي تجاوزت المهلة
    getPendingActivities() {
        const activities = storageManager.getActivities();
        const now = new Date();
        
        return activities.filter(activity => {
            if (activity.status !== 'معلق' || !activity.pending_since) return false;
            
            const pendingSince = new Date(activity.pending_since);
            const daysPending = Math.floor((now - pendingSince) / (1000 * 60 * 60 * 24));
            
            return daysPending >= this.pendingThreshold;
        });
    }

    // التحقق إذا تجاوزت الأنشطة العتبة المسموحة
    hasExceededThreshold(pendingActivities) {
        return pendingActivities.length > 0;
    }

    // تطبيق القيود على المشرف
    applySupervisorRestrictions() {
        // يمكن تطبيق قيود مثل إخفاء زر الإضافة أو إظهار تنبيه
        this.showSupervisorAlert();
    }

    // إظهار تنبيه للمشرف
    showSupervisorAlert() {
        const pendingActivities = this.getPendingActivities();
        
        if (pendingActivities.length > 0 && authSystem.isSupervisor()) {
            const alertMessage = `
                ⚠️ تنبيه مهم!
                
                لديك ${pendingActivities.length} نشاط معلق تجاوز المهلة المحددة.
                
                يرجى معالجة هذه الأنشطة قبل إضافة أي نشاط جديد:
                ${pendingActivities.map(a => `- ${a.title}`).join('\n')}
                
                لن تتمكن من إضافة أنشطة جديدة حتى معالجة هذه الأنشطة.
            `;

            // إظهار التنبيه في الواجهة
            this.displayRestrictionAlert(alertMessage);
        }
    }

    // عرض تنبيه القيود في الواجهة
    displayRestrictionAlert(message) {
        // إزالة التنبيه القديم إذا exists
        const oldAlert = document.getElementById('suspension-alert');
        if (oldAlert) oldAlert.remove();

        const alertDiv = document.createElement('div');
        alertDiv.id = 'suspension-alert';
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 500px;
            text-align: center;
        `;

        alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-exclamation-triangle" style="color: #ff9500;"></i>
                <strong>أنشطة معلقة تتطلب التدخل</strong>
            </div>
            <div style="font-size: 0.9rem; margin-bottom: 10px;">
                ${message.split('\n')[0]}
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: #ff9500;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
            ">
                فهمت
            </button>
        `;

        document.body.appendChild(alertDiv);

        // إخفاء الزر بعد 10 ثواني
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 10000);
    }

    // بدء المراقبة المستمرة
    startMonitoring() {
        setInterval(() => {
            this.checkOverdueActivities();
        }, this.checkInterval);
    }

    // تسجيل تعليق النشاط
    logSuspension(activity) {
        console.log(`تم تعليق النشاط: ${activity.title}`, {
            activityId: activity.id,
            suspendedAt: new Date().toISOString(),
            reason: 'تجاوز الوقت المحدد'
        });
    }

    // إلغاء تعليق النشاط (عند معالجته)
    resolveSuspension(activityId) {
        const activities = storageManager.getActivities();
        const activity = activities.find(a => a.id === activityId);
        
        if (activity && activity.status === 'معلق') {
            activity.status = 'معالج';
            activity.resolved_at = new Date().toISOString();
            storageManager.saveActivities(activities);
            
            this.checkSupervisorRestrictions(); // إعادة التحقق من القيود
            return true;
        }
        
        return false;
    }

    // الحصول على إحصائيات التعليق
    getSuspensionStats() {
        const activities = storageManager.getActivities();
        const pending = activities.filter(a => a.status === 'معلق');
        const resolved = activities.filter(a => a.status === 'معالج');
        const exceeded = this.getPendingActivities();

        return {
            totalPending: pending.length,
            totalResolved: resolved.length,
            exceededThreshold: exceeded.length,
            pendingActivities: pending
        };
    }
}

// دالة مساعدة للتحقق من الصلاحيات
function canAddActivity() {
    if (!authSystem.isSupervisor()) return false;
    
    const suspensionSystem = new SuspensionSystem();
    const stats = suspensionSystem.getSuspensionStats();
    
    return stats.exceededThreshold === 0;
}

// تهيئة النظام
const suspensionSystem = new SuspensionSystem();