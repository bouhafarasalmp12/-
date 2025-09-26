// نظام التخزين النهائي مع دعم كامل للمواصفات
class StorageManager {
    constructor() {
        this.storageKey = 'activityManagementSystem';
        this.initSampleData();
    }

    initSampleData() {
        if (!this.getActivities().length) {
            const sampleActivities = [
                {
                    id: '1',
                    title: 'مراجعة التقارير المالية للربع الأول',
                    assigned_unit: 'المالية',
                    assigned_user: 'user1',
                    scheduled_date: new Date().toLocaleDateString('en-CA'),
                    scheduled_time: '10:00',
                    importance: 'عاجل',
                    status: 'قيد التنفيذ',
                    created_by: 'admin',
                    created_at: new Date().toISOString(),
                    notes: 'مراجعة دقيقة للتقرير قبل رفعه للإدارة'
                },
                {
                    id: '2',
                    title: 'صيانة خوادم قاعدة البيانات',
                    assigned_unit: 'التقنية',
                    assigned_user: 'user2',
                    scheduled_date: new Date().toLocaleDateString('en-CA'),
                    scheduled_time: '14:30',
                    importance: 'متوسط',
                    status: 'قيد التنفيذ',
                    created_by: 'admin',
                    created_at: new Date().toISOString()
                },
                {
                    id: '3',
                    title: 'اجتماع تخطيط المشاريع القادمة',
                    assigned_unit: 'الإدارة',
                    assigned_user: 'admin',
                    scheduled_date: new Date(Date.now() + 86400000).toLocaleDateString('en-CA'), // غداً
                    scheduled_time: '11:00',
                    importance: 'عاجل',
                    status: 'قيد التنفيذ',
                    created_by: 'admin',
                    created_at: new Date().toISOString()
                }
            ];
            this.saveData({ activities: sampleActivities, users: [], settings: {} });
        }
    }

    getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : { activities: [], users: [], settings: {} };
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    getActivities() {
        return this.getData().activities;
    }

    saveActivities(activities) {
        const data = this.getData();
        data.activities = activities;
        this.saveData(data);
    }

    addActivity(activity) {
        const activities = this.getActivities();
        
        // التحقق من القيود قبل الإضافة
        if (!this.canAddActivity()) {
            throw new Error('لا يمكن إضافة نشاط جديد بسبب وجود أنشطة معلقة تتطلب التدخل');
        }

        activity.id = Date.now().toString();
        activity.created_at = new Date().toISOString();
        activity.status = 'قيد التنفيذ';
        activities.push(activity);
        this.saveActivities(activities);
        return activity;
    }

    canAddActivity() {
        // التحقق من عدم وجود أنشطة معلقة تجاوزت المهلة
        const suspensionSystem = new SuspensionSystem();
        const stats = suspensionSystem.getSuspensionStats();
        return stats.exceededThreshold === 0;
    }

    updateActivity(activityId, updates) {
        const activities = this.getActivities();
        const index = activities.findIndex(a => a.id === activityId);
        
        if (index !== -1) {
            activities[index] = { ...activities[index], ...updates };
            activities[index].updated_at = new Date().toISOString();
            this.saveActivities(activities);
            return true;
        }
        return false;
    }

    updateActivityStatus(activityId, status) {
        return this.updateActivity(activityId, { status });
    }

    deleteActivity(activityId) {
        let activities = this.getActivities();
        activities = activities.filter(activity => activity.id !== activityId);
        return this.saveActivities(activities);
    }

    archiveActivity(activityId) {
        return this.updateActivityStatus(activityId, 'مؤرشف');
    }

    getTodayActivities() {
        const activities = this.getActivities();
        const today = new Date().toLocaleDateString('en-CA');
        return activities.filter(activity => 
            activity.scheduled_date === today && 
            !['مؤرشف', 'ملغى'].includes(activity.status)
        );
    }

    getUpcomingActivities() {
        const activities = this.getActivities();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return activities.filter(activity => {
            const activityDate = new Date(activity.scheduled_date);
            return activityDate > today && !['مؤرشف', 'ملغى'].includes(activity.status);
        });
    }

    getArchivedActivities() {
        const activities = this.getActivities();
        return activities.filter(activity => 
            ['مؤرشف', 'ملغى'].includes(activity.status)
        );
    }

    getActivitiesByUnit(unit) {
        const activities = this.getActivities();
        return activities.filter(activity => activity.assigned_unit === unit);
    }

    // إحصائيات متقدمة
    getAdvancedStats() {
        const activities = this.getActivities();
        const today = new Date().toLocaleDateString('en-CA');
        
        const todayActivities = activities.filter(a => a.scheduled_date === today);
        const upcomingActivities = this.getUpcomingActivities();
        const archivedActivities = this.getArchivedActivities();
        
        const byImportance = {
            'عاجل': activities.filter(a => a.importance === 'عاجل').length,
            'متوسط': activities.filter(a => a.importance === 'متوسط').length,
            'عادي': activities.filter(a => a.importance === 'عادي').length
        };

        const byStatus = {
            'قيد التنفيذ': activities.filter(a => a.status === 'قيد التنفيذ').length,
            'منجز': activities.filter(a => a.status === 'منجز').length,
            'معلق': activities.filter(a => a.status === 'معلق').length,
            'مؤرشف': archivedActivities.length,
            'ملغى': activities.filter(a => a.status === 'ملغى').length
        };

        return {
            total: activities.length,
            today: todayActivities.length,
            upcoming: upcomingActivities.length,
            archived: archivedActivities.length,
            byImportance,
            byStatus,
            units: [...new Set(activities.map(a => a.assigned_unit))]
        };
    }
}

const storageManager = new StorageManager();