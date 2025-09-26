// نظام إدارة المستخدمين والصلاحيات
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = this.getUsers();
    }

    getUsers() {
        return [
            { id: 1, username: 'admin', password: 'admin123', role: 'supervisor', unit: 'all' },
            { id: 2, username: 'user1', password: 'user123', role: 'employee', unit: 'المالية' },
            { id: 3, username: 'user2', password: 'user123', role: 'employee', unit: 'التقنية' }
        ];
    }

    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('currentUser');
            this.currentUser = stored ? JSON.parse(stored) : null;
        }
        return this.currentUser;
    }

    isSupervisor() {
        return this.getCurrentUser()?.role === 'supervisor';
    }

    canAddActivity() {
        return this.isSupervisor();
    }

    canModifyActivity(activity) {
        if (this.isSupervisor()) return true;
        return activity.assigned_user === this.getCurrentUser()?.username;
    }
}

const authSystem = new AuthSystem();