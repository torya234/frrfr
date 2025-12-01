class JobPlatform {
    constructor() {
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupNotificationSystem();
        this.setupPageTransitions();
        this.updateVacancyResumeIds(); // Обновляем существующие ID
    }

    // Обновление существующих ID вакансий и резюме до 4-значных
    updateVacancyResumeIds() {
        try {
            // Обновляем ID вакансий
            const vacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
            let vacanciesUpdated = false;
            const existingIds = new Set();
            
            // Собираем все существующие ID
            vacancies.forEach(v => {
                if (v.id) {
                    const idStr = String(v.id);
                    if (!/^\d{4}$/.test(idStr) || parseInt(idStr) < 1000 || parseInt(idStr) > 9999) {
                        // ID не является 4-значным, нужно обновить
                        let newId;
                        do {
                            newId = Math.floor(1000 + Math.random() * 9000);
                        } while (existingIds.has(String(newId)));
                        existingIds.add(String(newId));
                        v.id = newId;
                        vacanciesUpdated = true;
                    } else {
                        existingIds.add(idStr);
                    }
                }
            });
            
            if (vacanciesUpdated) {
                localStorage.setItem('vacancies', JSON.stringify(vacancies));
                console.log('Обновлены ID вакансий до 4-значных');
            }
            
            // Обновляем ID резюме
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            let resumesUpdated = false;
            
            users.forEach(user => {
                const userId = String(user.id);
                const resumes = JSON.parse(localStorage.getItem('resumes_' + userId) || '[]');
                let userResumesUpdated = false;
                
                resumes.forEach(r => {
                    if (r.id) {
                        const idStr = String(r.id);
                        if (!/^\d{4}$/.test(idStr) || parseInt(idStr) < 1000 || parseInt(idStr) > 9999) {
                            // ID не является 4-значным, нужно обновить
                            let newId;
                            do {
                                newId = Math.floor(1000 + Math.random() * 9000);
                            } while (existingIds.has(String(newId)));
                            existingIds.add(String(newId));
                            r.id = newId;
                            userResumesUpdated = true;
                            resumesUpdated = true;
                        } else {
                            existingIds.add(idStr);
                        }
                    }
                });
                
                if (userResumesUpdated) {
                    localStorage.setItem('resumes_' + userId, JSON.stringify(resumes));
                }
            });
            
            if (resumesUpdated) {
                console.log('Обновлены ID резюме до 4-значных');
            }
        } catch (error) {
            console.error('Ошибка при обновлении ID вакансий и резюме:', error);
        }
    }

    setupNavigation() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');

        if (hamburger && navMenu) {
            hamburger.addEventListener('click', () => {
                hamburger.classList.toggle('active');
                navMenu.classList.toggle('active');
            });

            // Закрытие меню при клике на ссылку
            document.querySelectorAll('.nav-menu a').forEach(link => {
                link.addEventListener('click', () => {
                    hamburger.classList.remove('active');
                    navMenu.classList.remove('active');
                });
            });
        }
    }

    setupNotificationSystem() {
        // Создаем контейнер для уведомлений, если его нет
        if (!document.getElementById('notificationContainer')) {
            const notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(notificationContainer);
        }
    }

    // Получение текущего пользователя
    getCurrentUser() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
            return user;
        } catch (error) {
            console.error('Ошибка при получении пользователя:', error);
            return null;
        }
    }

    // Проверка авторизации
    checkAuth(requiredRole = 'user') {
        const user = this.getCurrentUser();
        
        if (!user) {
            window.location.href = 'auth.html';
            return false;
        }

        // Проверка ролей
        const roleHierarchy = {
            'user': ['user', 'moderator', 'admin'],
            'moderator': ['moderator', 'admin'],
            'admin': ['admin']
        };

        const allowedRoles = roleHierarchy[requiredRole] || ['user'];
        
        if (!allowedRoles.includes(user.status)) {
            jobPlatform.showNotification('Недостаточно прав для доступа к этой странице', 'error');
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 2000);
            return false;
        }

        return true;
    }

    // Показать уведомление
    showNotification(message, type = 'success') {
        const notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: white; cursor: pointer; margin-left: 1rem; font-size: 1.2rem;">
                    &times;
                </button>
            </div>
        `;

        notificationContainer.appendChild(notification);

        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Валидация email
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Валидация телефона
    validatePhone(phone) {
        const phoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
        return phoneRegex.test(phone);
    }

    // Выход из системы
    logout() {
        localStorage.removeItem('currentUser');
        jobPlatform.showNotification('Вы успешно вышли из системы');
        setTimeout(() => {
            window.location.href = 'auth.html';
        }, 1000);
    }

    // Проверка, является ли пользователь администратором
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.status === 'admin';
    }

    // Проверка, является ли пользователь модератором или администратором
    isModerator() {
        const user = this.getCurrentUser();
        return user && (user.status === 'moderator' || user.status === 'admin');
    }

    // Проверка, является ли пользователь соискателем
    isJobSeeker() {
        const user = this.getCurrentUser();
        return user && user.role === 'jobseeker';
    }

    // Проверка, является ли пользователь работодателем
    isEmployer() {
        const user = this.getCurrentUser();
        return user && user.role === 'employer';
    }

    // Получение роли пользователя в текстовом формате
    getUserRole() {
        const user = this.getCurrentUser();
        if (!user) return 'Гость';
        
        const roles = {
            'user': 'Пользователь',
            'moderator': 'Модератор',
            'admin': 'Администратор',
            'jobseeker': 'Соискатель',
            'employer': 'Работодатель'
        };
        
        return roles[user.role] || roles[user.status] || 'Пользователь';
    }

    // Получение текстового представления роли для интерфейса
    getUserRoleText() {
        const user = this.getCurrentUser();
        if (!user) return 'Гость';
        
        const roles = {
            'jobseeker': 'Соискатель',
            'employer': 'Работодатель',
            'moderator': 'Модератор',
            'admin': 'Администратор'
        };
        
        return roles[user.role] || roles[user.status] || 'Пользователь';
    }

    // Получение URL для профиля пользователя в зависимости от роли
    getUserProfileUrl() {
        const user = this.getCurrentUser();
        if (!user) return 'auth.html';
        
        if (user.status === 'moderator') {
            return 'moder.html';
        } else if (user.status === 'admin') {
            return 'admin.html';
        } else if (user.role === 'employer') {
            return 'worker.html';
        } else {
            return 'profile.html';
        }
    }

    // Проверка доступа к странице в зависимости от роли
    checkPageAccess() {
        const user = this.getCurrentUser();
        const currentPage = window.location.pathname.split('/').pop();
        
        if (!user) {
            if (currentPage !== 'auth.html' && currentPage !== 'index.html') {
                window.location.href = 'auth.html';
            }
            return;
        }

        // Модератор может заходить только на страницу модерации
        if (user.status === 'moderator' && currentPage !== 'moder.html' && currentPage !== 'auth.html' && currentPage !== 'index.html') {
            window.location.href = 'moder.html';
            return;
        }

        // Проверка доступа к страницам в зависимости от роли
        switch (currentPage) {
            case 'profile.html':
                if (user.role === 'employer') {
                    window.location.href = 'worker.html';
                }
                break;
            case 'worker.html':
                if (user.role !== 'employer') {
                    window.location.href = 'profile.html';
                }
                break;
            case 'resume-create.html':
                if (user.status === 'moderator') {
                    window.location.href = 'moder.html';
                } else if (user.role !== 'jobseeker') {
                    jobPlatform.showNotification('Эта страница доступна только соискателям', 'error');
                    setTimeout(() => {
                        window.location.href = this.getUserProfileUrl();
                    }, 2000);
                }
                break;
            case 'admin.html':
                if (user.status !== 'admin') {
                    jobPlatform.showNotification('Недостаточно прав для доступа к админ-панели', 'error');
                    setTimeout(() => {
                        window.location.href = this.getUserProfileUrl();
                    }, 2000);
                }
                break;
            case 'moder.html':
                if (user.status !== 'moderator') {
                    jobPlatform.showNotification('Недостаточно прав для доступа к панели модератора', 'error');
                    setTimeout(() => {
                        window.location.href = this.getUserProfileUrl();
                    }, 2000);
                }
                break;
        }
    }

    // Получение доступных действий для пользователя
    getAvailableActions() {
        const user = this.getCurrentUser();
        if (!user) return [];

        const actions = {
            jobseeker: [
                { name: 'Создать резюме', url: 'resume-create.html', icon: '📝' },
                { name: 'Мои резюме', url: 'profile.html#resumes', icon: '📄' },
                { name: 'Мои отклики', url: 'profile.html#applications', icon: '✉️' },
                { name: 'Поиск вакансий', url: 'jobs.html', icon: '🔍' }
            ],
            employer: [
                { name: 'Создать вакансию', url: 'vacancy-create.html', icon: '🏢' },
                { name: 'Мои вакансии', url: 'worker.html#vacancies', icon: '📋' },
                { name: 'Отклики на вакансии', url: 'worker.html#responses', icon: '👥' },
                { name: 'Поиск резюме', url: 'resumes-search.html', icon: '🔍' }
            ],
            moderator: [
                { name: 'Модерация резюме', url: 'moder.html#resumes', icon: '📄' },
                { name: 'Модерация вакансий', url: 'moder.html#vacancies', icon: '🏢' },
                { name: 'Статистика', url: 'moder.html#stats', icon: '📊' }
            ],
            admin: [
                { name: 'Управление пользователями', url: 'admin.html#users', icon: '👥' },
                { name: 'Управление модераторами', url: 'admin.html#moderators', icon: '🛡️' },
                { name: 'Статистика платформы', url: 'admin.html#stats', icon: '📈' }
            ]
        };

        return actions[user.role] || actions[user.status] || [];
    }

    // Настройка плавных переходов между страницами
    // Генерация 4-значного ID для вакансий и резюме
    generateVacancyResumeId() {
        let newId;
        const existingIds = new Set();
        
        // Собираем все существующие ID вакансий
        try {
            const vacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
            vacancies.forEach(v => {
                if (v.id) existingIds.add(String(v.id));
            });
        } catch (e) {
            console.warn('Ошибка при загрузке вакансий для проверки ID:', e);
        }
        
        // Собираем все существующие ID резюме из всех пользователей
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            users.forEach(user => {
                const userId = String(user.id);
                const resumes = JSON.parse(localStorage.getItem('resumes_' + userId) || '[]');
                resumes.forEach(r => {
                    if (r.id) existingIds.add(String(r.id));
                });
            });
        } catch (e) {
            console.warn('Ошибка при загрузке резюме для проверки ID:', e);
        }
        
        // Генерируем уникальный 4-значный ID
        do {
            newId = Math.floor(1000 + Math.random() * 9000); // От 1000 до 9999
        } while (existingIds.has(String(newId)));
        
        return newId;
    }

    setupPageTransitions() {
        // Добавляем плавный fade-out при переходе по ссылкам
        document.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href');
            
            // Пропускаем внешние ссылки, якоря и специальные ссылки
            if (href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                return;
            }
            
            link.addEventListener('click', (e) => {
                // Пропускаем если это Ctrl+Click или Cmd+Click (открытие в новой вкладке)
                if (e.ctrlKey || e.metaKey) {
                    return;
                }
                
                // Пропускаем если это средняя кнопка мыши
                if (e.button === 1) {
                    return;
                }
                
                // Плавное исчезновение страницы перед переходом
                document.body.style.transition = 'opacity 0.2s ease-out';
                document.body.style.opacity = '0';
                
                // Небольшая задержка для плавности
                setTimeout(() => {
                    // Переход произойдет автоматически
                }, 200);
            });
        });
    }

    // Выделение активной страницы в навигации
    highlightActivePage() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;
        
        let currentPage = window.location.pathname.split('/').pop();
        if (!currentPage || currentPage === '') {
            currentPage = 'index.html';
        }
        
        // Убираем активный класс со всех ссылок
        navMenu.querySelectorAll('a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Добавляем активный класс к текущей странице
        navMenu.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            // Сравниваем имена файлов
            if (href === currentPage) {
                link.classList.add('active');
            }
            // Также проверяем для главной страницы
            if ((currentPage === 'index.html' || currentPage === '') && (href === 'index.html' || href === './' || href === '/')) {
                link.classList.add('active');
            }
        });
    }

    // Инициализация плавных переходов страницы
    initPageTransitions() {
        // Добавляем плавное появление для всех основных контейнеров
        const containers = document.querySelectorAll('.container, .jobs-container, .contacts-container, .profile-container, .worker-container, .admin-container, .moder-container, .resume-container');
        containers.forEach((container, index) => {
            if (!container.style.animationDelay) {
                container.style.animationDelay = `${0.1 + index * 0.1}s`;
            }
        });

        // Добавляем плавное появление для карточек
        const cards = document.querySelectorAll('.card, .vacancy-card, .resume-card, .info-card');
        cards.forEach((card, index) => {
            if (!card.style.animationDelay && !card.classList.contains('feature-card')) {
                card.style.animationDelay = `${0.2 + index * 0.05}s`;
            }
        });

        // Плавное появление для списков
        const lists = document.querySelectorAll('.vacancies-list, .resumes-list, .applications-list');
        lists.forEach((list, index) => {
            if (!list.style.animationDelay) {
                list.style.animationDelay = `${0.3 + index * 0.1}s`;
            }
        });

        // Плавное появление для форм
        const forms = document.querySelectorAll('form');
        forms.forEach((form, index) => {
            if (!form.style.animationDelay) {
                form.style.animationDelay = `${0.2 + index * 0.1}s`;
            }
        });
    }
}

// Глобальные стили для уведомлений
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification {
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(notificationStyles);

// Инициализация глобального объекта
window.jobPlatform = new JobPlatform();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Плавное появление страницы
    jobPlatform.initPageTransitions();
    
    // Проверяем авторизацию на защищенных страницах
    const protectedPages = ['profile.html', 'admin.html', 'resume-create.html', 'worker.html', 'moder.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        const user = jobPlatform.getCurrentUser();
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
    }
    
    // Проверяем доступ к странице в зависимости от роли
    jobPlatform.checkPageAccess();
    
    // Обновляем навигацию в зависимости от авторизации
    jobPlatform.updateNavigation();
    
    // Выделяем активную страницу в навигации
    jobPlatform.highlightActivePage();
});

// Метод для обновления навигации
JobPlatform.prototype.updateNavigation = function() {
    const user = this.getCurrentUser();
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navMenu) return;
    
    // Находим кнопку профиля/входа
    const authButton = navMenu.querySelector('a[href="profile.html"], a[href="auth.html"]');
    
    if (user) {
        // Пользователь авторизован
        // Изменяем стиль кнопки профиля на nav-btn
        if (authButton) {
            const roleText = this.getUserRoleText();
            authButton.textContent = roleText;
            authButton.href = this.getUserProfileUrl();
            authButton.classList.add('nav-btn');
        }
        
        // Удаляем все старые кнопки выхода
        const oldLogoutBtns = navMenu.querySelectorAll('.logout-btn, #logoutBtn, button[class*="logout"]');
        oldLogoutBtns.forEach(btn => {
            const li = btn.closest('li');
            if (li) {
                li.remove();
            } else {
                btn.remove();
            }
        });
        
        // Добавляем новую кнопку выхода с правильным стилем (белый фон, синий текст, обводка)
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'nav-btn logout-btn';
        logoutBtn.textContent = 'Выйти';
        logoutBtn.addEventListener('click', () => jobPlatform.logout());
        
        // Для страниц с nav-menu добавляем в список, для других - в nav-container
        if (navMenu) {
            const logoutLi = document.createElement('li');
            logoutLi.appendChild(logoutBtn);
            navMenu.appendChild(logoutLi);
        } else {
            // Для страниц без nav-menu (например, admin.html)
            const navContainer = document.querySelector('.nav-container');
            if (navContainer) {
                const logoutDiv = document.createElement('div');
                logoutDiv.appendChild(logoutBtn);
                navContainer.appendChild(logoutDiv);
            }
        }
        
        // Модератор не должен видеть дополнительные ссылки в навигации
        if (user.status === 'moderator') {
            // Удаляем ссылку на поиск работы, если она есть
            const jobsLink = navMenu.querySelector('a[href="jobs.html"]');
            if (jobsLink) {
                jobsLink.closest('li').remove();
            }
            // Модератор остается только на странице модерации
            return;
        }
        
        // Получаем ссылку на элемент перед кнопками (профиль и выход)
        const getBeforeButtonsElement = () => {
            const profileLi = authButton?.parentElement;
            const logoutLi = navMenu.querySelector('.logout-btn')?.parentElement;
            return profileLi || logoutLi;
        };
        
        // Добавляем ссылку на главную страницу для соискателей и работодателей в начало меню
        if ((user.role === 'jobseeker' || user.role === 'employer') && !navMenu.querySelector('a[href="index.html"]')) {
            const homeLink = document.createElement('a');
            homeLink.href = 'index.html';
            homeLink.textContent = 'Главная';
            
            const li = document.createElement('li');
            li.appendChild(homeLink);
            // Вставляем в самое начало меню (перед всеми остальными ссылками)
            const firstNavItem = navMenu.querySelector('li');
            if (firstNavItem) {
                navMenu.insertBefore(li, firstNavItem);
            } else {
                navMenu.appendChild(li);
            }
        }
        
        // Добавляем ссылку на поиск работы для всех (кроме модератора)
        if (!navMenu.querySelector('a[href="jobs.html"]')) {
            const jobsLink = document.createElement('a');
            jobsLink.href = 'jobs.html';
            jobsLink.textContent = 'Поиск работы';
            
            const li = document.createElement('li');
            li.appendChild(jobsLink);
            const beforeButtons = getBeforeButtonsElement();
            if (beforeButtons) {
                navMenu.insertBefore(li, beforeButtons);
            } else {
                navMenu.appendChild(li);
            }
        }
        
        // Добавляем ссылку на контакты для всех авторизованных пользователей
        if (!navMenu.querySelector('a[href="contacts.html"]')) {
            const contactsLink = document.createElement('a');
            contactsLink.href = 'contacts.html';
            contactsLink.textContent = 'Контакты';
            
            const li = document.createElement('li');
            li.appendChild(contactsLink);
            const beforeButtons = getBeforeButtonsElement();
            if (beforeButtons) {
                navMenu.insertBefore(li, beforeButtons);
            } else {
                navMenu.appendChild(li);
            }
        }
        
        // Добавляем ссылки в зависимости от роли (перед профилем и выходом)
        if (user.role === 'employer' && !navMenu.querySelector('a[href="worker.html"]')) {
            const workerLink = document.createElement('a');
            workerLink.href = 'worker.html';
            workerLink.textContent = 'Мои вакансии';
            
            const li = document.createElement('li');
            li.appendChild(workerLink);
            const beforeButtons = getBeforeButtonsElement();
            if (beforeButtons) {
                navMenu.insertBefore(li, beforeButtons);
            } else {
                navMenu.appendChild(li);
            }
        }
        
        // Добавляем ссылку на создание резюме для соискателей
        if (user.role === 'jobseeker' && !navMenu.querySelector('a[href="resume-create.html"]')) {
            const resumeLink = document.createElement('a');
            resumeLink.href = 'resume-create.html';
            resumeLink.textContent = 'Создать резюме';
            
            const li = document.createElement('li');
            li.appendChild(resumeLink);
            const beforeButtons = getBeforeButtonsElement();
            if (beforeButtons) {
                navMenu.insertBefore(li, beforeButtons);
            } else {
                navMenu.appendChild(li);
            }
        }
        
        // Добавляем ссылку на админ-панель только для админов (не для модераторов)
        if (user.status === 'admin' && !navMenu.querySelector('a[href="admin.html"]')) {
            const adminLink = document.createElement('a');
            adminLink.href = 'admin.html';
            adminLink.textContent = 'Админ-панель';
            
            const li = document.createElement('li');
            li.appendChild(adminLink);
            const beforeButtons = getBeforeButtonsElement();
            if (beforeButtons) {
                navMenu.insertBefore(li, beforeButtons);
            } else {
                navMenu.appendChild(li);
            }
        }
        
        // Перемещаем кнопку профиля рядом с кнопкой выхода (в конец меню)
        if (authButton && authButton.parentElement) {
            const profileLi = authButton.parentElement;
            const logoutLi = navMenu.querySelector('.logout-btn')?.parentElement;
            if (profileLi && logoutLi && profileLi !== logoutLi) {
                // Удаляем профиль из текущей позиции
                profileLi.remove();
                // Вставляем перед кнопкой выхода
                navMenu.insertBefore(profileLi, logoutLi);
            }
        }
        
        // Выделяем активную страницу в навигации
        this.highlightActivePage();
    } else {
        // Пользователь не авторизован
        if (authButton) {
            authButton.textContent = 'Войти';
            authButton.href = 'auth.html';
        }
        
        // Удаляем все кнопки выхода
        const logoutBtns = navMenu.querySelectorAll('.logout-btn, #logoutBtn, button[class*="logout"]');
        logoutBtns.forEach(btn => {
            const li = btn.closest('li');
            if (li) {
                li.remove();
            } else {
                btn.remove();
            }
        });
        
        // Удаляем ссылку на админ-панель
        const adminLink = navMenu.querySelector('a[href="admin.html"], a[href="moder.html"]');
        if (adminLink) {
            adminLink.closest('li').remove();
        }
        
        // Удаляем ссылку на worker
        const workerLink = navMenu.querySelector('a[href="worker.html"]');
        if (workerLink) {
            workerLink.closest('li').remove();
        }
        
        // Удаляем ссылку на создание резюме
        const resumeLink = navMenu.querySelector('a[href="resume-create.html"]');
        if (resumeLink) {
            resumeLink.closest('li').remove();
        }
        
        // Удаляем ссылку на поиск работы для неавторизованных пользователей
        const jobsLink = navMenu.querySelector('a[href="jobs.html"]');
        if (jobsLink) {
            jobsLink.closest('li').remove();
        }
        
        // Удаляем ссылку на контакты для неавторизованных пользователей
        const contactsLink = navMenu.querySelector('a[href="contacts.html"]');
        if (contactsLink) {
            contactsLink.closest('li').remove();
        }
    }
};

// Вспомогательные функции для работы с ролями
JobPlatform.prototype.getUserDisplayInfo = function() {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    return {
        name: user.fullName,
        role: this.getUserRoleText(),
        avatar: user.avatar || 'images/default-avatar.png',
        profileUrl: this.getUserProfileUrl()
    };
};

// Метод для проверки может ли пользователь создавать резюме
JobPlatform.prototype.canCreateResume = function() {
    return this.isJobSeeker();
};

// Метод для проверки может ли пользователь создавать вакансии
JobPlatform.prototype.canCreateVacancy = function() {
    return this.isEmployer();
};

// Метод для проверки может ли пользователь модерировать контент
JobPlatform.prototype.canModerate = function() {
    return this.isModerator();
};

// Метод для получения настроек пользователя
JobPlatform.prototype.getUserSettings = function() {
    const user = this.getCurrentUser();
    if (!user) return {};
    
    return {
        notifications: user.notifications !== false,
        emailUpdates: user.emailUpdates !== false,
        theme: user.theme || 'light'
    };
};