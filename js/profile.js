class ProfileManager {
    constructor() {
        this.isEditing = false;
        this.avatarChanged = false;
        this.currentUser = null;
        this.resumes = [];
        this.applications = [];
        this.pendingAction = null;
        this.pendingResumeId = null;
        this.isClosingModal = false;
        this.init();
    }

    init() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ PROFILEMANAGER ===');
        this.checkAuth();
        
        // Убеждаемся, что пользователь загружен перед загрузкой данных
        if (!this.currentUser) {
            console.error('Пользователь не авторизован');
            return;
        }
        
        console.log('Пользователь авторизован:', this.currentUser.id);
        
        this.loadUserData();
        this.setupEventListeners();
        
        // Загружаем данные
        this.loadResumes();
        this.loadApplications();
        
        // Отображаем данные после загрузки с небольшой задержкой для гарантии готовности DOM
        setTimeout(() => {
            console.log('Начинаем рендеринг после загрузки данных');
            console.log('this.resumes:', this.resumes);
            console.log('this.applications:', this.applications);
            this.renderResumes();
            this.renderApplications();
            console.log('Инициализация завершена');
        }, 100);
        
        this.setupModal(); // Инициализация модального окна
    }

    setupModal() {
        // Создаем HTML для модального окна
        const modalHTML = `
            <div id="customModal" class="custom-modal" style="display: none;">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitle">Уведомление</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="modalMessage"></p>
                    </div>
                    <div class="modal-footer">
                        <button id="modalCancel" class="btn btn-secondary">Отмена</button>
                        <button id="modalConfirm" class="btn btn-primary">OK</button>
                    </div>
                </div>
            </div>
        `;

        // Добавляем модальное окно в body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Настраиваем обработчики событий для модального окна
        this.setupModalEvents();
    }

    setupModalEvents() {
        const modal = document.getElementById('customModal');
        const overlay = modal.querySelector('.modal-overlay');
        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('modalCancel');
        const confirmBtn = document.getElementById('modalConfirm');

        const closeModal = () => {
            modal.style.display = 'none';
        };

        overlay.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Обработчик для подтверждающей кнопки
        confirmBtn.addEventListener('click', () => {
            if (this.modalResolve) {
                this.modalResolve(true);
                closeModal();
            }
        });

        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display !== 'none') {
                closeModal();
                if (this.modalResolve) {
                    this.modalResolve(false);
                }
            }
        });
    }

    // Метод для показа уведомления
    showNotification(message, type = 'success') {
        jobPlatform.showNotification(message, type);
    }

    // Метод для подтверждения действия
    async showConfirm(message, title = 'Подтверждение действия') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('modalTitle');
            const messageEl = document.getElementById('modalMessage');
            const cancelBtn = document.getElementById('modalCancel');
            const confirmBtn = document.getElementById('modalConfirm');

            // Настраиваем содержимое
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.textContent = 'Подтвердить';
            cancelBtn.style.display = 'block';

            // Сохраняем resolve для использования в обработчиках
            this.modalResolve = resolve;

            // Показываем модальное окно
            modal.style.display = 'block';

            // Фокус на кнопке подтверждения для удобства
            setTimeout(() => confirmBtn.focus(), 100);
        });
    }

    // Метод для показа alert
    async showAlert(message, title = 'Уведомление') {
        return new Promise((resolve) => {
            const modal = document.getElementById('customModal');
            const titleEl = document.getElementById('modalTitle');
            const messageEl = document.getElementById('modalMessage');
            const cancelBtn = document.getElementById('modalCancel');
            const confirmBtn = document.getElementById('modalConfirm');

            // Настраиваем содержимое
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.textContent = 'OK';
            cancelBtn.style.display = 'none';

            // Сохраняем resolve для использования в обработчиках
            this.modalResolve = resolve;

            // Показываем модальное окно
            modal.style.display = 'block';

            // Фокус на кнопке OK для удобства
            setTimeout(() => confirmBtn.focus(), 100);
        });
    }

    checkAuth() {
        const user = jobPlatform.getCurrentUser();
        console.log('checkAuth: получен пользователь:', user);
        
        if (!user) {
            console.error('checkAuth: пользователь не найден, перенаправление на auth.html');
            window.location.href = 'auth.html';
            return;
        }
        
        // Модератор не может заходить на страницу профиля
        if (user.status === 'moderator') {
            console.log('checkAuth: модератор, перенаправление на moder.html');
            window.location.href = 'moder.html';
            return;
        }
        
        // Проверяем, что пользователь - соискатель или работодатель
        if (user.role !== 'jobseeker' && user.role !== 'employer') {
            console.log('checkAuth: пользователь не соискатель и не работодатель, роль:', user.role);
            // Если админ, перенаправляем на админ панель
            if (user.status === 'admin') {
                window.location.href = 'admin.html';
                return;
            }
        }
        
        this.currentUser = user;
        console.log('checkAuth: currentUser установлен:', this.currentUser);
    }

    loadUserData() {
        const user = this.currentUser || jobPlatform.getCurrentUser();
        if (!user) return;
        
        const userId = String(user.id);
        const userData = JSON.parse(localStorage.getItem('userData_' + userId) || '{}');

        // Устанавливаем значения по умолчанию
        const defaultData = {
            fullName: user.fullName || '',
            birthDate: '1990-01-01',
            phone: user.phone || '',
            email: user.username + '@example.com',
            avatar: 'images/default-avatar.png'
        };

        const mergedData = { ...defaultData, ...userData };

        // Заполняем поля
        document.getElementById('userFullName').textContent = mergedData.fullName;
        document.getElementById('userBirthDate').textContent = this.formatDate(mergedData.birthDate);
        document.getElementById('userPhone').textContent = mergedData.phone;
        document.getElementById('userEmail').textContent = mergedData.email;
        document.getElementById('userAvatar').src = mergedData.avatar;

        // Заполняем поля редактирования
        document.getElementById('editFullName').value = mergedData.fullName;
        document.getElementById('editBirthDate').value = mergedData.birthDate;
        document.getElementById('editPhone').value = mergedData.phone;
        document.getElementById('editEmail').value = mergedData.email;
    }

    setupEventListeners() {
        // Кнопка редактирования профиля
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => this.toggleEditMode(true));
        }

        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => this.saveProfile());
        }

        const cancelEditBtn = document.getElementById('cancelEditBtn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.toggleEditMode(false));
        }

        // Смена аватара
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', () => {
                const avatarInput = document.getElementById('avatarInput');
                if (avatarInput) {
                    avatarInput.click();
                }
            });
        }

        const avatarInput = document.getElementById('avatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarChange(e);
            });
        }

        // Выход из системы
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }

        // Модальное окно подтверждения удаления
        const confirmModal = document.getElementById('confirmDeleteModal');
        if (confirmModal) {
            // Закрытие по клику на фон
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal) {
                    if (!this.isClosingModal) {
                        this.closeConfirmModal();
                    }
                }
            });

            // Закрытие по кнопке X (если есть)
            const closeBtn = confirmModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!this.isClosingModal) {
                        this.closeConfirmModal();
                    }
                });
            }
        }
    }

    async handleLogout() {
        const confirmed = await this.showConfirm(
            'Вы уверены, что хотите выйти из системы?',
            'Подтверждение выхода'
        );
        
        if (confirmed) {
            jobPlatform.logout();
        }
    }

    toggleEditMode(enable) {
        this.isEditing = enable;

        const viewElements = document.querySelectorAll('.info-item span');
        const editElements = document.querySelectorAll('.edit-input');
        const editActions = document.querySelector('.edit-actions');

        viewElements.forEach(el => el.style.display = enable ? 'none' : 'inline');
        editElements.forEach(el => el.style.display = enable ? 'block' : 'none');
        editActions.style.display = enable ? 'flex' : 'none';
        document.getElementById('editProfileBtn').style.display = enable ? 'none' : 'block';

        // Сбрасываем флаг при отмене редактирования
        if (!enable) {
            this.avatarChanged = false;
            this.loadUserData(); // Перезагружаем данные для отмены изменений
        }
    }

    async saveProfile() {
        const user = jobPlatform.getCurrentUser();
        const userData = {
            fullName: document.getElementById('editFullName').value,
            birthDate: document.getElementById('editBirthDate').value,
            phone: document.getElementById('editPhone').value,
            email: document.getElementById('editEmail').value,
            avatar: document.getElementById('userAvatar').src
        };

        // Валидация
        if (!userData.fullName.trim()) {
            this.showNotification('ФИО обязательно для заполнения', 'error');
            return;
        }

        if (!jobPlatform.validateEmail(userData.email)) {
            this.showNotification('Введите корректный email', 'error');
            return;
        }

        // Сохраняем данные
        const userId = String(user.id);
        localStorage.setItem('userData_' + userId, JSON.stringify(userData));

        // Обновляем отображение
        this.loadUserData();
        this.toggleEditMode(false);
        this.avatarChanged = false;

        this.showNotification('Профиль успешно обновлен');
    }

    handleAvatarChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showNotification('Пожалуйста, выберите изображение', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const newAvatarSrc = e.target.result;
            document.getElementById('userAvatar').src = newAvatarSrc;
            
            // Автоматически сохраняем аватар в localStorage
            this.saveAvatarImmediately(newAvatarSrc);
            
            this.showNotification('Аватар успешно изменен');
        };
        reader.readAsDataURL(file);
    }

    saveAvatarImmediately(avatarSrc) {
        const user = jobPlatform.getCurrentUser();
        if (!user) return;

        // Получаем текущие данные пользователя
        const userData = JSON.parse(localStorage.getItem('userData_' + user.id) || '{}');
        
        // Обновляем только аватар
        userData.avatar = avatarSrc;
        
        // Сохраняем обратно в localStorage
        localStorage.setItem('userData_' + user.id, JSON.stringify(userData));
        
        this.avatarChanged = true;
    }

    loadResumes() {
        // Загружаем резюме текущего пользователя
        if (!this.currentUser) {
            console.error('Пользователь не загружен');
            this.resumes = [];
            return;
        }
        
        try {
            const userId = String(this.currentUser.id);
            console.log('=== ЗАГРУЗКА РЕЗЮМЕ ===');
            console.log('ID текущего пользователя:', userId, 'тип:', typeof userId);
            
            let resumes = JSON.parse(localStorage.getItem('resumes_' + userId) || '[]');
            console.log('Резюме из localStorage (resumes_' + userId + '):', resumes.length);
            
            // Если не найдено, пробуем найти во всех пользователях
            if (resumes.length === 0) {
                console.log('Резюме не найдены по ключу, ищем во всех пользователях...');
                const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
                console.log('Всего пользователей:', allUsers.length);
                
                allUsers.forEach(u => {
                    const userResumes = JSON.parse(localStorage.getItem('resumes_' + String(u.id)) || '[]');
                    console.log(`Пользователь ${u.id} (${u.fullName}): ${userResumes.length} резюме`);
                    
                    // Если ID совпадают (как строки), добавляем резюме
                    if (String(u.id) === userId) {
                        resumes = userResumes;
                        console.log('Найдены резюме для пользователя:', resumes.length);
                    }
                });
            }
            
            this.resumes = resumes;
            console.log('Загружено резюме:', this.resumes.length);
            if (this.resumes.length > 0) {
                console.log('Первое резюме:', this.resumes[0]);
            }
        } catch (error) {
            console.error('Ошибка при загрузке резюме:', error);
            this.resumes = [];
        }
    }

    renderResumes() {
        const container = document.getElementById('resumesList');
        
        if (!container) {
            console.error('Контейнер resumesList не найден в DOM');
            // Попробуем найти контейнер еще раз через небольшую задержку
            setTimeout(() => {
                const retryContainer = document.getElementById('resumesList');
                if (retryContainer && this.resumes) {
                    console.log('Контейнер найден при повторной попытке, рендерим резюме');
                    this.renderResumes();
                }
            }, 200);
            return;
        }
        
        console.log('=== РЕНДЕРИНГ РЕЗЮМЕ ===');
        console.log('Контейнер найден:', container);
        console.log('Количество резюме для отображения:', this.resumes ? this.resumes.length : 0);
        console.log('Тип this.resumes:', Array.isArray(this.resumes) ? 'массив' : typeof this.resumes);
        console.log('Содержимое this.resumes:', this.resumes);
        
        if (!this.resumes || !Array.isArray(this.resumes) || this.resumes.length === 0) {
            console.log('Нет резюме для отображения, показываем пустое состояние');
            container.innerHTML = `
                <div class="resume-item">
                    <div colspan="4" style="text-align: center; color: var(--text-light); padding: 2rem;">
                        У вас пока нет созданных резюме
                    </div>
                </div>
            `;
            return;
        }
        
        console.log('Начинаем рендеринг', this.resumes.length, 'резюме');
        
        try {
            container.innerHTML = this.resumes.map(resume => {
                console.log('Рендерим резюме:', resume.id, resume.title);
                return `
                    <div class="resume-item">
                        <div>#${resume.id}</div>
                        <div>${this.escapeHtml(resume.title || 'Резюме')}</div>
                        <div>${this.formatDate(resume.createdAt)}</div>
                        <div class="resume-actions">
                            <button onclick="profileManager.viewResume(${resume.id})" class="btn btn-primary btn-small">Просмотреть</button>
                            <button onclick="profileManager.deleteResume(${resume.id})" class="btn-delete-resume">Удалить</button>
                        </div>
                    </div>
                `;
            }).join('');
            console.log('Рендеринг завершен успешно');
        } catch (error) {
            console.error('Ошибка при рендеринге резюме:', error);
            container.innerHTML = `
                <div class="resume-item">
                    <div colspan="4" style="text-align: center; color: var(--text-danger); padding: 2rem;">
                        Ошибка при загрузке резюме
                    </div>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadApplications() {
        // Загружаем все отклики этого соискателя
        if (!this.currentUser) {
            console.error('Пользователь не загружен');
            this.applications = [];
            return;
        }
        
        try {
            const userId = String(this.currentUser.id);
            console.log('=== ЗАГРУЗКА ОТКЛИКОВ ===');
            console.log('ID текущего пользователя:', userId);
            
            this.applications = JSON.parse(localStorage.getItem('applications_' + userId) || '[]');
            console.log('Загружено откликов:', this.applications.length);
            if (this.applications.length > 0) {
                console.log('Первый отклик:', this.applications[0]);
            }
        } catch (error) {
            console.error('Ошибка при загрузке откликов:', error);
            this.applications = [];
        }
    }

    renderApplications() {
        const container = document.getElementById('applicationsList');
        
        if (!container) {
            console.error('Контейнер applicationsList не найден');
            return;
        }
        
        console.log('Рендеринг откликов. Количество:', this.applications ? this.applications.length : 0);
        
        if (!this.applications || this.applications.length === 0) {
            container.innerHTML = `
                <div class="application-item">
                    <div colspan="4" style="text-align: center; color: var(--text-light); padding: 2rem;">
                        У вас пока нет откликов
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.applications.map(app => `
            <div class="application-item">
                <div>${app.vacancyTitle || 'Неизвестная вакансия'}</div>
                <div>${app.resumeTitle || 'Неизвестное резюме'}</div>
                <div>${this.formatDate(app.appliedAt)}</div>
                <div>
                    <span class="status-badge status-${app.status || 'sent'}">${this.getStatusText(app.status || 'sent')}</span>
                </div>
            </div>
        `).join('');
    }

    viewResume(resumeId) {
        const user = this.currentUser || jobPlatform.getCurrentUser();
        if (!user) {
            console.error('Пользователь не авторизован');
            return;
        }
        
        const userId = String(user.id);
        window.location.href = `resume-preview.html?id=${resumeId}&userId=${userId}`;
    }

    deleteResume(resumeId) {
        const resume = this.resumes.find(r => r.id === resumeId);
        const resumeTitle = resume ? resume.title : 'резюме';
        
        this.showConfirmModal(
            `Вы уверены, что хотите удалить резюме "${resumeTitle}"? Это действие нельзя отменить.`,
            (id) => {
                const user = this.currentUser || jobPlatform.getCurrentUser();
                if (!user) {
                    console.error('Пользователь не авторизован');
                    return;
                }

                const userId = String(user.id);
                const resumes = JSON.parse(localStorage.getItem('resumes_' + userId) || '[]');
                const updatedResumes = resumes.filter(r => {
                    // Сравниваем ID как числа и как строки для надежности
                    return String(r.id) !== String(id) && r.id !== id;
                });

                localStorage.setItem('resumes_' + userId, JSON.stringify(updatedResumes));
                this.loadResumes();
                
                // Небольшая задержка перед рендерингом для гарантии обновления данных
                setTimeout(() => {
                    this.renderResumes();
                }, 100);

                this.showNotification('Резюме удалено');
            },
            resumeId
        );
    }

    showConfirmModal(message, action, resumeId = null) {
        // Предотвращаем открытие, если модальное окно уже открывается или закрывается
        if (this.isClosingModal) {
            return;
        }
        
        const modal = document.getElementById('confirmDeleteModal');
        if (modal && modal.classList.contains('show')) {
            return; // Модальное окно уже открыто
        }
        
        this.pendingAction = action;
        this.pendingResumeId = resumeId;
        
        const messageEl = document.getElementById('confirmDeleteMessage');
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        if (modal) {
            document.body.style.overflow = 'hidden';
            modal.style.display = 'flex';
            // Небольшая задержка для анимации
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
        
        // Настраиваем обработчик для кнопки подтверждения
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            // Удаляем старые обработчики
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            
            newConfirmBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.executePendingAction();
            });
        }
    }

    closeConfirmModal() {
        if (this.isClosingModal) {
            return; // Предотвращаем повторное закрытие
        }
        
        this.isClosingModal = true;
        const modal = document.getElementById('confirmDeleteModal');
        if (modal) {
            // Добавляем класс для анимации закрытия
            modal.classList.add('closing');
            modal.classList.remove('show');
            
            setTimeout(() => {
                modal.classList.remove('closing');
                modal.style.display = 'none';
                document.body.style.overflow = '';
                this.isClosingModal = false; // Сбрасываем флаг после закрытия
            }, 200); // Задержка соответствует длительности анимации
        } else {
            this.isClosingModal = false;
        }
        
        this.pendingAction = null;
        this.pendingResumeId = null;
    }

    executePendingAction() {
        if (this.pendingAction && this.pendingResumeId !== null) {
            this.pendingAction(this.pendingResumeId);
        }
        this.closeConfirmModal();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    getStatusText(status) {
        const statusMap = {
            'sent': 'На рассмотрении',
            'approved': 'Принято',
            'rejected': 'Отклонено',
            'viewed': 'Просмотрено',
            'invitation': 'Приглашение'
        };
        return statusMap[status] || status;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});