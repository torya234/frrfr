class AuthManager {
    constructor() {
        this.currentTab = 'login';
        this.adminData = null;
        this.init();
    }

    async init() {
        await this.loadAdminData();
        this.updateUserIds(); // Обновляем ID всех пользователей до 4-значных
        this.setupTabs();
        this.setupFormValidation();
        this.setupPhoneMask();
        this.setupRoleSelection();
    }

    // Обновление ID пользователей до 4-значных
    updateUserIds() {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.length === 0) return;

        let updated = false;
        const allExistingIds = new Set();
        
        // Собираем все существующие ID (админы, пользователи)
        if (this.adminData) {
            this.adminData.forEach(admin => {
                if (admin.id) allExistingIds.add(String(admin.id));
            });
        }
        users.forEach(user => {
            if (user.id) allExistingIds.add(String(user.id));
        });

        // Генерация 4-значного ID
        const generateUserId = () => {
            let newId;
            do {
                newId = Math.floor(1000 + Math.random() * 9000); // Генерация от 1000 до 9999
            } while (allExistingIds.has(String(newId)));
            return newId;
        };

        // Обновляем ID пользователей, которые не являются 4-значными
        users.forEach(user => {
            const currentId = String(user.id);
            // Проверяем, является ли ID 4-значным числом (от 1000 до 9999)
            if (!/^\d{4}$/.test(currentId) || parseInt(currentId) < 1000 || parseInt(currentId) > 9999) {
                const newId = generateUserId();
                allExistingIds.add(String(newId));
                user.id = newId;
                updated = true;
            }
        });

        // Сохраняем обновленные данные
        if (updated) {
            localStorage.setItem('users', JSON.stringify(users));
        }
    }

    // Настройка выбора роли
    setupRoleSelection() {
        const roleOptions = document.querySelectorAll('input[name="role"]');
        roleOptions.forEach(option => {
            option.addEventListener('change', (e) => {
                this.animateRoleSelection(e.target.value);
            });
        });
    }

    // Анимация выбора роли
    animateRoleSelection(selectedRole) {
        const roleCards = document.querySelectorAll('.role-card');
        
        roleCards.forEach(card => {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        });

        // Добавляем дополнительную анимацию для выбранной карточки
        const selectedCard = document.querySelector(`input[value="${selectedRole}"] + .role-card`);
        if (selectedCard) {
            selectedCard.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                selectedCard.style.animation = '';
            }, 500);
        }
    }

    // Загрузка данных админа из admin.json
    async loadAdminData() {
        try {
            console.log('Loading admin data...');
            const response = await fetch('./admin.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Admin data loaded successfully:', data);
            this.adminData = data;
            
        } catch (error) {
            console.error('Ошибка загрузки admin.json:', error);
            
            // Fallback данные админа с 4-значным ID
            this.adminData = [
                {
                    "id": 1001,
                    "fio": "Торяник Ксения Александровна",
                    "login": "admin",
                    "username": "admin",
                    "phone": "+7 (123) 456-78-90",
                    "password": "qweqwe",
                    "status": "admin",
                    "registrationDate": "2025-12-15T11:00:00.000Z"
                }
            ];
            console.log('Using fallback admin data:', this.adminData);
            
            // Сохраняем fallback данные в localStorage для надежности
            localStorage.setItem('adminAccount', JSON.stringify(this.adminData));
        }
    }

    // Переключение между вкладками
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const authForms = document.querySelectorAll('.auth-form');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;

                // Обновляем активные кнопки
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Обновляем активные формы
                authForms.forEach(form => form.classList.remove('active'));
                document.getElementById(`${tab}Form`).classList.add('active');

                this.currentTab = tab;
            });
        });
    }

    // Маска для телефона
    setupPhoneMask() {
        const phoneInput = document.getElementById('regPhone');

        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');

                if (value.startsWith('7')) {
                    value = '7' + value.substring(1);
                } else if (value.startsWith('8')) {
                    value = '7' + value.substring(1);
                } else if (!value.startsWith('7')) {
                    value = '7' + value;
                }

                let formattedValue = '+7 (';

                if (value.length > 1) {
                    formattedValue += value.substring(1, 4);
                }
                if (value.length >= 4) {
                    formattedValue += ') ' + value.substring(4, 7);
                }
                if (value.length >= 7) {
                    formattedValue += '-' + value.substring(7, 9);
                }
                if (value.length >= 9) {
                    formattedValue += '-' + value.substring(9, 11);
                }

                e.target.value = formattedValue;
            });
        }
    }

    // Валидация форм
    setupFormValidation() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        // Валидация в реальном времени
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        // Валидация логина
        const loginInputs = document.querySelectorAll('#loginForm input');
        loginInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateLoginField(input));
        });

        // Валидация регистрации
        const regInputs = document.querySelectorAll('#registerForm input');
        regInputs.forEach(input => {
            input.addEventListener('blur', () => this.validateRegisterField(input));

            // Специальная валидация для подтверждения пароля
            if (input.name === 'confirmPassword') {
                input.addEventListener('input', () => {
                    const password = document.getElementById('regPassword');
                    this.validatePasswordMatch(password, input);
                });
            }
        });
    }

    validateLoginField(field) {
        const errorElement = field.parentElement.querySelector('.error-message');

        switch (field.name) {
            case 'username':
                if (field.value.length < 3) {
                    this.showFieldError(field, errorElement, 'Логин должен содержать минимум 3 символа');
                    return false;
                }
                break;
            case 'password':
                if (field.value.length < 6) {
                    this.showFieldError(field, errorElement, 'Пароль должен содержать минимум 6 символов');
                    return false;
                }
                if (field.value.includes(' ')) {
                    this.showFieldError(field, errorElement, 'Пароль не должен содержать пробелы');
                    return false;
                }
                break;
        }

        this.clearFieldError(field, errorElement);
        return true;
    }

    validateRegisterField(field) {
        const errorElement = field.parentElement.querySelector('.error-message');

        switch (field.name) {
            case 'username':
                if (field.value.length < 3) {
                    this.showFieldError(field, errorElement, 'Логин должен содержать минимум 3 символа');
                    return false;
                }
                break;
            case 'phone':
                const phoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
                if (!phoneRegex.test(field.value)) {
                    this.showFieldError(field, errorElement, 'Введите корректный номер телефона');
                    return false;
                }
                break;
            case 'password':
                if (field.value.length < 6) {
                    this.showFieldError(field, errorElement, 'Пароль должен содержать минимум 6 символов');
                    return false;
                }
                if (field.value.includes(' ')) {
                    this.showFieldError(field, errorElement, 'Пароль не должен содержать пробелы');
                    return false;
                }
                // Проверяем соответствие с подтверждением
                const confirmPassword = document.getElementById('regConfirmPassword');
                if (confirmPassword && confirmPassword.value) {
                    this.validatePasswordMatch(field, confirmPassword);
                }
                break;
            case 'confirmPassword':
                const password = document.getElementById('regPassword');
                if (password) {
                    return this.validatePasswordMatch(password, field);
                }
                break;
        }

        this.clearFieldError(field, errorElement);
        return true;
    }

    validatePasswordMatch(passwordField, confirmField) {
        if (!passwordField || !confirmField) return true;
        
        const errorElement = confirmField.parentElement.querySelector('.error-message');

        if (passwordField.value !== confirmField.value) {
            this.showFieldError(confirmField, errorElement, 'Пароли не совпадают');
            return false;
        }

        this.clearFieldError(confirmField, errorElement);
        return true;
    }

    showFieldError(field, errorElement, message) {
        if (field && errorElement) {
            field.classList.add('error');
            errorElement.textContent = message;
        }
    }

    clearFieldError(field, errorElement) {
        if (field && errorElement) {
            field.classList.remove('error');
            errorElement.textContent = '';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // Валидация всех полей
        let isValid = true;
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            if (!this.validateLoginField(input)) {
                isValid = false;
            }
        });

        if (!isValid) {
            jobPlatform.showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
            return;
        }

        const userData = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        console.log('Login attempt with:', userData);

        try {
            const user = await this.authenticateUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(user));
            jobPlatform.showNotification('Успешный вход!');

            // Перенаправление на главную страницу
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            jobPlatform.showNotification(error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        // Валидация всех полей
        let isValid = true;
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            if (!this.validateRegisterField(input)) {
                isValid = false;
            }
        });

        // Проверка выбора роли
        const role = formData.get('role');
        if (!role) {
            jobPlatform.showNotification('Пожалуйста, выберите тип аккаунта', 'error');
            return;
        }

        if (!isValid) {
            jobPlatform.showNotification('Пожалуйста, исправьте ошибки в форме', 'error');
            return;
        }

        const userData = {
            fullName: formData.get('fullName'),
            username: formData.get('username'),
            phone: formData.get('phone'),
            password: formData.get('password'),
            role: role
        };

        try {
            const user = await this.registerUser(userData);
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            const roleText = user.role === 'employer' ? 'работодателя' : 'соискателя';
            jobPlatform.showNotification(`Регистрация ${roleText} успешна!`);

            // Перенаправление на главную страницу
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } catch (error) {
            jobPlatform.showNotification(error.message, 'error');
        }
    }

    // Аутентификация пользователя
    authenticateUser(userData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log('Authentication process started');
                console.log('Available admin data:', this.adminData);

                // Проверка админских учетных данных
                if (this.adminData && this.adminData.length > 0) {
                    console.log('Checking admin credentials...');
                    
                    const admin = this.adminData.find(a =>
                        (a.login === userData.username || a.username === userData.username) &&
                        a.password === userData.password
                    );

                    if (admin) {
                        console.log('Admin authenticated successfully:', admin);
                        resolve({
                            id: admin.id, // Используем ID из adminData, а не Date.now()
                            fullName: admin.fio,
                            username: admin.username,
                            phone: admin.phone,
                            status: admin.status,
                            registrationDate: admin.registrationDate
                        });
                        return;
                    } else {
                        console.log('No matching admin found');
                    }
                } else {
                    console.log('No admin data available');
                }

                // Проверка обычных пользователей
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                console.log('Available regular users:', users);
                
                const user = users.find(u =>
                    u.username === userData.username &&
                    u.password === userData.password
                );

                if (user) {
                    console.log('Regular user authenticated:', user);
                    resolve({
                        id: user.id, // Используем существующий ID пользователя
                        fullName: user.fullName,
                        username: user.username,
                        phone: user.phone,
                        status: user.status || 'user',
                        role: user.role || 'jobseeker'
                    });
                } else {
                    console.log('No user found with these credentials');
                    reject(new Error('Пользователь не найден. Проверьте данные или зарегистрируйтесь'));
                }
            }, 1000);
        });
    }

    // Регистрация пользователя
    registerUser(userData) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = JSON.parse(localStorage.getItem('users') || '[]');

                // Проверка на существующего пользователя
                if (users.find(u => u.username === userData.username)) {
                    reject(new Error('Пользователь с таким логином уже существует'));
                    return;
                }

                // Проверка, не регистрируется ли админский аккаунт
                if (this.adminData && this.adminData.find(a => a.username === userData.username)) {
                    reject(new Error('Этот логин зарезервирован'));
                    return;
                }

                // Генерация 4-значного ID
                const generateUserId = () => {
                    let newId;
                    const existingIds = new Set();
                    
                    // Собираем все существующие ID пользователей
                    users.forEach(u => {
                        if (u.id) existingIds.add(String(u.id));
                    });
                    
                    // Добавляем ID админов в существующие ID для проверки уникальности
                    if (this.adminData) {
                        this.adminData.forEach(admin => {
                            if (admin.id) existingIds.add(String(admin.id));
                        });
                    }
                    
                    do {
                        newId = Math.floor(1000 + Math.random() * 9000); // Генерация от 1000 до 9999
                    } while (existingIds.has(String(newId)));
                    
                    return newId;
                };

                const newUser = {
                    id: generateUserId(), // Используем новую функцию генерации ID
                    ...userData,
                    status: 'user',
                    registrationDate: new Date().toISOString(),
                    isActive: true,
                    company: userData.role === 'employer' ? '' : null,
                    position: userData.role === 'employer' ? '' : null
                };

                users.push(newUser);
                localStorage.setItem('users', JSON.stringify(users));

                resolve({
                    id: newUser.id,
                    fullName: newUser.fullName,
                    username: newUser.username,
                    phone: newUser.phone,
                    status: newUser.status,
                    role: newUser.role
                });
            }, 1000);
        });
    }

    // Метод для проверки доступности админских данных (для отладки)
    checkAdminData() {
        console.log('Current admin data:', this.adminData);
        return this.adminData && this.adminData.length > 0;
    }
}

// Добавляем анимацию pulse в CSS
const pulseAnimation = document.createElement('style');
pulseAnimation.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(pulseAnimation);

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    
    // Отладочная информация
    console.log('Auth page loaded successfully');
    console.log('Try logging in with: admin / qweqwe');
});

// Добавляем глобальную функцию для отладки
window.debugAuth = function() {
    if (window.authManager) {
        console.log('=== AUTH DEBUG INFO ===');
        console.log('Admin data:', authManager.adminData);
        console.log('Current user:', jobPlatform.getCurrentUser());
        console.log('LocalStorage users:', JSON.parse(localStorage.getItem('users') || '[]'));
        
        // Проверяем доступность admin.json
        fetch('./admin.json')
            .then(response => {
                console.log('admin.json status:', response.status);
                return response.json();
            })
            .then(data => console.log('admin.json content:', data))
            .catch(error => console.log('admin.json error:', error));
    }
};