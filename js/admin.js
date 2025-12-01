class AdminManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.moderators = [];
        this.pendingAction = null;
        this.pendingUserId = null;
        this.currentSearchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 8;
        this.filteredUsers = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUsers();
        this.setupEventListeners();
        this.setupLogoutButton();
        this.updateStats();
        this.renderUsers();
        this.renderModerators();
    }

    setupLogoutButton() {
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('currentUser');
                if (typeof jobPlatform !== 'undefined' && jobPlatform.showNotification) {
                    jobPlatform.showNotification('Вы успешно вышли из системы');
                }
                setTimeout(() => {
                    window.location.href = 'auth.html';
                }, 1000);
            });
        }
    }

    checkAuth() {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        // Только админ может заходить в админ панель
        if (!user || user.status !== 'admin') {
            window.location.href = 'auth.html';
            return;
        }

        this.currentUser = user;
    }

    setupEventListeners() {
        // Навигационные вкладки
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Поиск пользователей
        document.getElementById('userSearch').addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });

        // Фильтрация по ролям
        document.getElementById('roleFilter').addEventListener('change', (e) => {
            this.filterUsers();
        });

        // Выход (кнопка создается динамически через main.js, обработчик добавляется там)

        // Закрытие модальных окон
        const closeBtn = document.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModeratorModal();
            });
        }

        // Маска для телефона в модальном окне
        const moderatorPhoneInput = document.getElementById('moderatorPhone');
        if (moderatorPhoneInput) {
            moderatorPhoneInput.addEventListener('input', (e) => {
                this.setupPhoneMask(e.target);
            });
        }

        document.getElementById('confirmActionBtn').addEventListener('click', () => {
            this.executePendingAction();
        });

        // Закрытие модальных окон по клику вне их
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('addModeratorModal');
            const confirmModal = document.getElementById('confirmModal');
            
            if (e.target === modal) {
                this.closeModeratorModal();
            }
            if (e.target === confirmModal) {
                this.closeConfirmModal();
            }
        });
    }

    switchTab(tabName) {
        // Обновляем активные вкладки
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Показываем соответствующую секцию
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === tabName + 'Section');
        });
    }

    loadUsers() {
        // Загружаем обычных пользователей
        this.users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Обновляем ID существующих пользователей до 4-значных
        this.updateUserIds(this.users);
        
        // Загружаем модераторов и админов
        this.moderators = this.users.filter(user => 
            user.status === 'moderator' || user.status === 'admin'
        );
    }

    // Обновление ID пользователей до 4-значных
    updateUserIds(users) {
        let updated = false;
        const adminData = JSON.parse(localStorage.getItem('adminData') || '[]');
        const allExistingIds = new Set();
        
        // Собираем все существующие ID (админы, модераторы, пользователи)
        adminData.forEach(admin => {
            if (admin.id) allExistingIds.add(String(admin.id));
        });
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

    updateStats() {
        // Статистика удалена, функция оставлена для совместимости
        // Если в будущем понадобится статистика, можно будет легко восстановить
    }

    renderUsers() {
        this.currentSearchQuery = '';
        this.currentPage = 1;
        this.filteredUsers = [...this.users];
        const searchInput = document.getElementById('userSearch');
        const roleFilter = document.getElementById('roleFilter');
        if (searchInput) searchInput.value = '';
        if (roleFilter) roleFilter.value = 'all';
        this.applyFilters();
    }

    renderModerators() {
        const container = document.getElementById('moderatorsList');
        
        if (this.moderators.length === 0) {
            container.innerHTML = `
                <div class="moderator-item">
                    <div style="grid-column: 1 / -1; text-align: center; color: var(--text-light);">
                        Модераторы не найдены
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.moderators.map(moderator => `
            <div class="moderator-item">
                <div class="moderator-id">${moderator.id}</div>
                <div class="moderator-fullname">${moderator.fullName}</div>
                <div class="moderator-username">${moderator.username}</div>
                <div class="moderator-phone">${moderator.phone}</div>
                <div class="moderator-date">${this.formatDate(moderator.registrationDate)}</div>
                <div class="moderator-actions">
                    ${moderator.status === 'moderator' ? `
                        <button onclick="adminManager.demoteModerator(${moderator.id})" class="btn btn-warning btn-small">Убрать права</button>
                        <button onclick="adminManager.deleteUser(${moderator.id})" class="btn btn-danger btn-small">Удалить</button>
                    ` : '<span class="admin-label">Администратор</span>'}
                </div>
            </div>
        `).join('');
    }

    searchUsers(query) {
        this.currentSearchQuery = query;
        this.applyFilters();
    }

    filterUsers() {
        this.applyFilters();
    }

    applyFilters() {
        const searchQuery = this.currentSearchQuery || '';
        const roleFilter = document.getElementById('roleFilter').value;

        let filteredUsers = this.users;

        // Применяем поиск
        if (searchQuery) {
            filteredUsers = filteredUsers.filter(user =>
                user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.phone.includes(searchQuery)
            );
        }

        // Применяем фильтр по ролям
        if (roleFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => {
                if (roleFilter === 'moderator') {
                    return user.status === 'moderator';
                } else if (roleFilter === 'admin') {
                    return user.status === 'admin';
                } else {
                    return user.role === roleFilter;
                }
            });
        }

        // Сохраняем отфильтрованных пользователей
        this.filteredUsers = filteredUsers;
        this.currentPage = 1; // Сбрасываем на первую страницу при фильтрации
        
        this.renderUsersList();
        this.renderPagination();
    }

    renderUsersList() {
        const container = document.getElementById('usersList');
        
        if (this.filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="user-item">
                    <div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 2rem;">
                        Пользователи не найдены
                    </div>
                </div>
            `;
            return;
        }

        // Вычисляем индексы для текущей страницы
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentPageUsers = this.filteredUsers.slice(startIndex, endIndex);

        container.innerHTML = currentPageUsers.map(user => `
            <div class="user-item">
                <div class="user-id">${user.id}</div>
                <div class="user-fullname">${user.fullName}</div>
                <div class="user-username">${user.username}</div>
                <div class="user-phone">${user.phone}</div>
                <div class="user-role">
                    <span class="role-badge role-${this.getRoleClass(user)}">${this.getRoleText(user)}</span>
                </div>
                <div class="user-date">${this.formatDate(user.registrationDate)}</div>
                <div class="user-actions">
                    ${user.status !== 'admin' && this.currentUser.status === 'admin' ? `
                        <button onclick="adminManager.deleteUser(${user.id})" class="btn-delete-user">Удалить</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderPagination() {
        const container = document.getElementById('paginationContainer');
        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination">';
        
        // Кнопка "Предыдущая"
        paginationHTML += `
            <button class="pagination-btn" onclick="adminManager.goToPage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                Назад
            </button>
        `;

        // Номера страниц
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="adminManager.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="adminManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="adminManager.goToPage(${totalPages})">${totalPages}</button>`;
        }

        // Кнопка "Следующая"
        paginationHTML += `
            <button class="pagination-btn" onclick="adminManager.goToPage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Вперед
            </button>
        `;

        // Информация о странице
        paginationHTML += `
            <div class="pagination-info">
                Показано ${(this.currentPage - 1) * this.itemsPerPage + 1} - ${Math.min(this.currentPage * this.itemsPerPage, this.filteredUsers.length)} из ${this.filteredUsers.length}
            </div>
        `;

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderUsersList();
        this.renderPagination();
        
        // Прокрутка к началу таблицы
        const tableBody = document.getElementById('usersList');
        if (tableBody) {
            tableBody.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    showConfirmModal(message, action, userId = null) {
        this.pendingAction = action;
        this.pendingUserId = userId;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('show');
        this.pendingAction = null;
        this.pendingUserId = null;
    }

    executePendingAction() {
        if (this.pendingAction) {
            this.pendingAction(this.pendingUserId);
        }
        this.closeConfirmModal();
    }

    promoteToModerator(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showConfirmModal(
                `Вы уверены, что хотите назначить пользователя "${user.fullName}" модератором?`,
                (id) => {
                    const userToPromote = this.users.find(u => u.id === id);
                    if (userToPromote) {
                        userToPromote.status = 'moderator';
                        this.saveUsers();
                        this.loadUsers();
                        this.applyFilters();
                        this.renderModerators();
                        this.updateStats();
                        jobPlatform.showNotification('Пользователь назначен модератором');
                    }
                },
                userId
            );
        }
    }

    demoteModerator(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showConfirmModal(
                `Вы уверены, что хотите снять права модератора с пользователя "${user.fullName}"?`,
                (id) => {
                    const userToDemote = this.users.find(u => u.id === id);
                    if (userToDemote) {
                        userToDemote.status = 'user';
                        this.saveUsers();
                        this.loadUsers();
                        this.applyFilters();
                        this.renderModerators();
                        this.updateStats();
                        jobPlatform.showNotification('Права модератора сняты');
                    }
                },
                userId
            );
        }
    }

    toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            const action = user.isActive === false ? 'активировать' : 'деактивировать';
            
            this.showConfirmModal(
                `Вы уверены, что хотите ${action} пользователя "${user.fullName}"?`,
                (id) => {
                    const userToToggle = this.users.find(u => u.id === id);
                    if (userToToggle) {
                        userToToggle.isActive = userToToggle.isActive === false ? true : false;
                        this.saveUsers();
                        this.loadUsers();
                        this.applyFilters();
                        this.updateStats();
                        jobPlatform.showNotification(`Пользователь ${userToToggle.isActive ? 'активирован' : 'деактивирован'}`);
                    }
                },
                userId
            );
        }
    }

    deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        this.showConfirmModal(
            `Вы уверены, что хотите удалить пользователя "${user.fullName}"? Это действие нельзя отменить.`,
            (id) => {
                this.users = this.users.filter(u => u.id !== id);
                this.saveUsers();
                this.loadUsers();
                this.applyFilters();
                this.renderModerators();
                this.updateStats();
                jobPlatform.showNotification('Пользователь удален');
            },
            userId
        );
    }

    showAddModeratorModal() {
        document.getElementById('addModeratorModal').classList.add('show');
    }

    setupPhoneMask(input) {
        let value = input.value.replace(/\D/g, '');

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

        input.value = formattedValue;
    }

    closeModeratorModal() {
        document.getElementById('addModeratorModal').classList.remove('show');
        const form = document.getElementById('addModeratorForm');
        if (form) {
            form.reset();
        }
        // Очищаем сообщения об ошибках
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('input.error').forEach(el => el.classList.remove('error'));
    }

    addModerator() {
        const form = document.getElementById('addModeratorForm');
        const formData = new FormData(form);

        const fullName = formData.get('fullName')?.trim();
        const username = formData.get('username')?.trim();
        const phone = formData.get('phone')?.trim();
        const password = formData.get('password');

        // Валидация
        if (!fullName || !username || !phone || !password) {
            jobPlatform.showNotification('Все поля обязательны для заполнения', 'error');
            return;
        }

        if (username.length < 3) {
            jobPlatform.showNotification('Логин должен содержать минимум 3 символа', 'error');
            return;
        }

        if (password.length < 6) {
            jobPlatform.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        // Генерация 4-значного ID
        const generateUserId = () => {
            let newId;
            const existingIds = new Set();
            
            // Собираем все существующие ID
            this.users.forEach(u => {
                if (u.id) existingIds.add(String(u.id));
            });
            
            // Добавляем ID админов
            const adminData = JSON.parse(localStorage.getItem('adminData') || '[]');
            adminData.forEach(admin => {
                if (admin.id) existingIds.add(String(admin.id));
            });
            
            do {
                newId = Math.floor(1000 + Math.random() * 9000); // Генерация от 1000 до 9999
            } while (existingIds.has(String(newId)));
            
            return newId;
        };

        const moderatorData = {
            id: generateUserId(),
            fullName: fullName,
            username: username,
            phone: phone,
            password: password,
            status: 'moderator',
            registrationDate: new Date().toISOString(),
            isActive: true,
            role: null // Модератор не имеет роли соискателя/работодателя
        };

        // Проверка на существующего пользователя
        if (this.users.find(u => u.username === moderatorData.username)) {
            jobPlatform.showNotification('Пользователь с таким логином уже существует', 'error');
            return;
        }

        this.users.push(moderatorData);
        this.saveUsers();
        this.loadUsers(); // Перезагружаем данные
        this.applyFilters();
        this.renderModerators();
        this.updateStats();
        this.closeModeratorModal();
        
        jobPlatform.showNotification('Модератор успешно добавлен');
    }


    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    getStatusText(status) {
        const statusMap = {
            'user': 'Пользователь',
            'moderator': 'Модератор',
            'admin': 'Администратор'
        };
        return statusMap[status] || status;
    }

    getRoleText(user) {
        // Если статус модератор или админ, показываем статус
        if (user.status === 'moderator') {
            return 'Модератор';
        }
        if (user.status === 'admin') {
            return 'Администратор';
        }
        // Иначе показываем роль
        const roleMap = {
            'jobseeker': 'Соискатель',
            'employer': 'Работодатель'
        };
        return roleMap[user.role] || 'Не указана';
    }

    getRoleClass(user) {
        // Если статус модератор или админ, возвращаем класс статуса
        if (user.status === 'moderator') {
            return 'moderator';
        }
        if (user.status === 'admin') {
            return 'admin';
        }
        // Иначе возвращаем класс роли
        return user.role || 'jobseeker';
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'auth.html';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});