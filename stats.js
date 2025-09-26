// نظام الإحصائيات والتقارير المتقدمة
class StatisticsManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupCharts();
        this.loadStatistics();
    }

    setupCharts() {
        // يمكن إضافة مكتبات charts هنا لاحقاً (مثل Chart.js)
    }

    loadStatistics() {
        const stats = storageManager.getAdvancedStats();
        this.displayBasicStats(stats);
        this.displayCharts(stats);
    }

    displayBasicStats(stats) {
        // تحديث عناصر الإحصائيات الأساسية في الواجهة
        const elements = {
            'totalActivities': stats.total,
            'todayActivities': stats.today,
            'upcomingActivities': stats.upcoming,
            'archivedActivities': stats.archived
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = elements[id];
        });
    }

    displayCharts(stats) {
        // عرض charts للإحصائيات (تطوير لاحق)
        this.createImportanceChart(stats.byImportance);
        this.createStatusChart(stats.byStatus);
    }

    createImportanceChart(importanceData) {
        // تطوير لاحق: إنشاء chart لأهمية الأنشطة
        console.log('بيانات الأهمية:', importanceData);
    }

    createStatusChart(statusData) {
        // تطوير لاحق: إنشاء chart لحالة الأنشطة
        console.log('بيانات الحالة:', statusData);
    }

    generateReport(type = 'weekly') {
        const activities = storageManager.getActivities();
        const report = {
            period: type,
            generatedAt: new Date().toISOString(),
            summary: this.generateSummary(activities, type),
            activities: this.filterActivitiesByPeriod(activities, type)
        };

        return report;
    }

    generateSummary(activities, period) {
        const filtered = this.filterActivitiesByPeriod(activities, period);
        
        return {
            total: filtered.length,
            completed: filtered.filter(a => a.status === 'منجز').length,
            pending: filtered.filter(a => a.status === 'قيد التنفيذ').length,
            overdue: filtered.filter(a => a.status === 'معلق').length,
            completionRate: Math.round((filtered.filter(a => a.status === 'منجز').length / filtered.length) * 100) || 0
        };
    }

    filterActivitiesByPeriod(activities, period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'daily':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 1);
                break;
            case 'weekly':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'monthly':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
            default:
                startDate = new Date(0); // جميع الأنشطة
        }

        return activities.filter(activity => {
            const activityDate = new Date(activity.created_at);
            return activityDate >= startDate;
        });
    }

    exportToCSV() {
        const activities = storageManager.getActivities();
        const headers = ['العنوان', 'الجهة', 'المكلف', 'التاريخ', 'الوقت', 'الأهمية', 'الحالة'];
        
        let csv = headers.join(',') + '\n';
        
        activities.forEach(activity => {
            const row = [
                activity.title,
                activity.assigned_unit,
                activity.assigned_user,
                activity.scheduled_date,
                activity.scheduled_time || 'غير محدد',
                activity.importance,
                activity.status
            ].map(field => `"${field}"`).join(',');
            
            csv += row + '\n';
        });

        this.downloadCSV(csv, 'تقرير_الأنشطة.csv');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// استخدام النظام
const statsManager = new StatisticsManager();