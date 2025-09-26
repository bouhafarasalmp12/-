// نظام التحريك المتقدم والمحسّن - animations.js
class AdvancedAnimationSystem {
    constructor() {
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.observers = new Map();
        this.init();
    }

    init() {
        if (this.isReducedMotion) {
            console.log('🔄 وضع الحركة المخفض مفعل');
            return;
        }

        this.setupIntersectionObserver();
        this.setupScrollAnimations();
        this.setupHoverEffects();
        this.setupClickEffects();
        this.setupPageTransitions();
        
        console.log('🎬 نظام التحريك المتقدم جاهز');
    }

    // 1. ظهور العناصر عند التمرير
    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateOnScroll(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });

        this.observers.set('scroll', observer);
    }

    animateOnScroll(element) {
        element.classList.add('stagger-fade-in');
        
        // تأثيرات إضافية حسب نوع العنصر
        if (element.classList.contains('activity-card')) {
            this.animateActivityCard(element);
        } else if (element.classList.contains('feature-card')) {
            this.animateFeatureCard(element);
        }
    }

    // 2. تأثيرات التمرير المتقدمة
    setupScrollAnimations() {
        let ticking = false;
        
        const updateScrollEffects = () => {
            this.handleParallax();
            this.handleStickyElements();
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScrollEffects);
                ticking = true;
            }
        });
    }

    handleParallax() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.5;
            const yPos = -(scrolled * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    }

    handleStickyElements() {
        const stickyElements = document.querySelectorAll('.sticky-element');
        const scrollTop = window.pageYOffset;
        
        stickyElements.forEach(el => {
            if (scrollTop > 100) {
                el.classList.add('sticky-active');
            } else {
                el.classList.remove('sticky-active');
            }
        });
    }

    // 3. تأثيرات التمرير فوق العناصر
    setupHoverEffects() {
        this.setupCardHoverEffects();
        this.setupButtonHoverEffects();
        this.setupImageHoverEffects();
    }

    setupCardHoverEffects() {
        const cards = document.querySelectorAll('.activity-card, .feature-card, .stat-card');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', (e) => this.handleCardHover(e));
            card.addEventListener('mouseleave', (e) => this.handleCardLeave(e));
            card.addEventListener('mousemove', (e) => this.handleCardTilt(e));
        });
    }

    handleCardHover(e) {
        const card = e.currentTarget;
        card.classList.add('card-hover-3d', 'hover-shadow-lift');
    }

    handleCardLeave(e) {
        const card = e.currentTarget;
        card.classList.remove('card-hover-3d', 'hover-shadow-lift');
        card.style.transform = '';
    }

    handleCardTilt(e) {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateY = (x - centerX) / 25;
        const rotateX = (centerY - y) / 25;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    }

    setupButtonHoverEffects() {
        const buttons = document.querySelectorAll('.btn-3d, .btn-primary, .btn-secondary');
        
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', (e) => this.handleButtonHover(e));
            btn.addEventListener('mouseleave', (e) => this.handleButtonLeave(e));
        });
    }

    handleButtonHover(e) {
        const btn = e.currentTarget;
        btn.classList.add('pulse-glow');
    }

    handleButtonLeave(e) {
        const btn = e.currentTarget;
        btn.classList.remove('pulse-glow');
    }

    // 4. تأثيرات النقر المتقدمة
    setupClickEffects() {
        document.addEventListener('click', (e) => {
            this.createRippleEffect(e);
            this.handleClickAnimation(e);
        });
    }

    createRippleEffect(e) {
        const interactiveElements = e.target.closest('.btn-3d, .activity-card, .menu-toggle, .tap-feedback');
        if (!interactiveElements) return;

        const ripple = document.createElement('span');
        const diameter = Math.max(interactiveElements.clientWidth, interactiveElements.clientHeight);
        const radius = diameter / 2;

        ripple.style.width = ripple.style.height = `${diameter}px`;
        ripple.style.left = `${e.clientX - interactiveElements.getBoundingClientRect().left - radius}px`;
        ripple.style.top = `${e.clientY - interactiveElements.getBoundingClientRect().top - radius}px`;
        ripple.classList.add('ripple-wave');

        const existingRipple = interactiveElements.querySelector('.ripple-wave');
        if (existingRipple) existingRipple.remove();

        interactiveElements.style.position = 'relative';
        interactiveElements.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    handleClickAnimation(e) {
        const element = e.target;
        if (element.classList.contains('advanced-click-effect')) {
            element.classList.add('click-active');
            setTimeout(() => element.classList.remove('click-active'), 300);
        }
    }

    // 5. تأثيرات انتقال الصفحة
    setupPageTransitions() {
        this.setupPageLoader();
        this.setupRouteTransitions();
    }

    setupPageLoader() {
        window.addEventListener('load', () => {
            const loader = document.getElementById('page-loader');
            if (loader) {
                setTimeout(() => {
                    loader.style.opacity = '0';
                    setTimeout(() => loader.remove(), 500);
                }, 800);
            }
        });
    }

    setupRouteTransitions() {
        // يمكن تطوير هذا الجزء ليدعم نظام توجيه أحادي الصفحة (SPA)
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href').startsWith('#')) return;
                
                const href = link.getAttribute('href');
                if (!href.includes('http') && !href.startsWith('mailto:')) {
                    e.preventDefault();
                    this.navigateWithTransition(href);
                }
            });
        });
    }

    navigateWithTransition(url) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--primary-color);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.5s ease;
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.opacity = '1';
            setTimeout(() => {
                window.location.href = url;
            }, 500);
        }, 100);
    }

    // 6. تأثيرات خاصة بالأنشطة
    animateActivityCard(card) {
        if (card.classList.contains('overdue')) {
            card.classList.add('urgent-glow');
        } else if (card.classList.contains('completed')) {
            card.classList.add('activity-pulse');
        }
    }

    animateFeatureCard(card) {
        card.classList.add('floating-card');
    }

    // 7. تأثيرات الإشعارات المتقدمة
    showAdvancedToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast notification-pop toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content glass-morphism">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
                <button class="toast-close">&times;</button>
            </div>
        `;

        document.body.appendChild(toast);

        // إضافة أنماط Toast إذا لم تكن موجودة
        this.addToastStyles();

        setTimeout(() => toast.classList.add('show'), 100);

        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.hideToast(toast);
        });

        setTimeout(() => this.hideToast(toast), duration);
    }

    addToastStyles() {
        if (document.getElementById('toast-styles')) return;

        const styles = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                transform: translateX(100%);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .toast.show {
                transform: translateX(0);
            }
            .toast-content {
                padding: 15px 20px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 300px;
            }
            .toast-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                margin-left: auto;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'toast-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
    }

    hideToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // 8. أدوات مساعدة
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 9. تنظيف الموارد
    destroy() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
    }
}

// التهيئة التلقائية مع التحقق من الأداء
document.addEventListener('DOMContentLoaded', () => {
    // الانتظار حتى يصبح المحتوى جاهزاً
    setTimeout(() => {
        if (typeof AdvancedAnimationSystem !== 'undefined') {
            window.advancedAnimations = new AdvancedAnimationSystem();
            
            // دمج مع النظام الرئيسي إذا كان موجوداً
            if (typeof app !== 'undefined') {
                app.animationSystem = window.advancedAnimations;
            }
        }
    }, 100);
});

// تصدير الدوال للاستخدام العام
window.AnimationSystem = {
    showToast: (message, type, duration) => {
        if (window.advancedAnimations) {
            window.advancedAnimations.showAdvancedToast(message, type, duration);
        }
    },
    animateElement: (element, animationClass) => {
        if (window.advancedAnimations && element) {
            element.classList.add(animationClass);
        }
    }
};