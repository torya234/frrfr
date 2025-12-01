class WorkerManager {
    constructor() {
        this.currentUser = null;
        this.vacancies = [];
        this.applications = [];
        this.editingVacancyId = null;
        this.currentApplicationId = null;
        this.currentApplication = null;
        this.pendingAction = null;
        this.pendingVacancyId = null;
        this.isClosingModal = false; // Флаг для предотвращения повторного закрытия
        this.init();
    }

    init() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ WORKERMANAGER ===');
        this.checkAuth();
        
        // Убеждаемся, что пользователь загружен перед загрузкой вакансий
        if (!this.currentUser) {
            console.error('Пользователь не авторизован');
            return;
        }
        
        console.log('Пользователь авторизован:', this.currentUser.id);
        
        // Настраиваем обработчики событий сначала
        this.setupEventListeners();
        
        // Загружаем данные
        this.loadVacancies();
        this.loadApplications();
        
        // Отображаем данные после загрузки с небольшой задержкой для гарантии готовности DOM
        setTimeout(() => {
            console.log('Начинаем рендеринг после загрузки данных');
            this.renderVacancies();
            this.renderApplications();
            console.log('Инициализация завершена');
        }, 50);
    }

    checkAuth() {
        const user = jobPlatform.getCurrentUser();
        
        if (!user || user.role !== 'employer') {
            window.location.href = 'auth.html';
            return;
        }

        // Модератор не может заходить на страницу работодателя
        if (user.status === 'moderator') {
            window.location.href = 'moder.html';
            return;
        }

        this.currentUser = user;
    }

    setupEventListeners() {
        // Создание вакансии
        const createBtn = document.getElementById('createVacancyBtn');
        if (createBtn) {
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showCreateVacancyModal();
            });
        }

        // Сохранение вакансии
        const saveBtn = document.getElementById('saveVacancyBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveVacancy();
            });
        }

        // Кнопка отмены
        const cancelBtn = document.querySelector('#createVacancyModal .btn-secondary');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeCreateVacancyModal();
            });
        }

        // Закрытие модального окна
        const modal = document.getElementById('createVacancyModal');
        if (modal) {
            // Закрытие по кнопке X
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeCreateVacancyModal();
                });
            }

            // Закрытие по клику на фон (но не на содержимое)
            modal.addEventListener('click', (e) => {
                if (e.target === modal && !this.isClosingModal) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeCreateVacancyModal();
                }
            });

            // Предотвращаем закрытие при клике на содержимое модального окна
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }

        // Закрытие модального окна просмотра резюме
        const viewResumeModal = document.getElementById('viewResumeModal');
        if (viewResumeModal) {
            const closeBtn = viewResumeModal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.closeViewResumeModal();
                });
            }
            viewResumeModal.addEventListener('click', (e) => {
                if (e.target === viewResumeModal) {
                    this.closeViewResumeModal();
                }
            });
        }

        // Модальное окно подтверждения удаления
        const confirmModal = document.getElementById('confirmDeleteModal');
        if (confirmModal) {
            // Закрытие по клику на фон
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal && !this.isClosingModal) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeConfirmModal();
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

        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        } else {
            console.warn('Кнопка выхода (logoutBtn) не найдена в DOM');
        }
    }

    loadVacancies() {
        // Загружаем вакансии текущего пользователя
        if (!this.currentUser) {
            console.error('Пользователь не загружен');
            this.vacancies = [];
            return;
        }
        
        try {
            const allVacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
            console.log('=== ЗАГРУЗКА ВАКАНСИЙ ===');
            console.log('Все вакансии из localStorage:', allVacancies.length);
            console.log('ID текущего пользователя:', this.currentUser.id, 'тип:', typeof this.currentUser.id);
            console.log('Полный объект пользователя:', this.currentUser);
            
            if (allVacancies.length > 0) {
                console.log('Пример вакансии из localStorage:', allVacancies[0]);
                console.log('employerId в первой вакансии:', allVacancies[0].employerId, 'тип:', typeof allVacancies[0].employerId);
            }
            
            // Фильтруем вакансии по employerId, сравнивая как строки для надежности
            this.vacancies = allVacancies.filter(vacancy => {
                const vacancyEmployerId = String(vacancy.employerId || '');
                const currentUserId = String(this.currentUser.id || '');
                const matches = vacancyEmployerId === currentUserId;
                
                if (!matches && allVacancies.length <= 5) {
                    console.log('Вакансия не подходит:', {
                        vacancyId: vacancy.id,
                        vacancyEmployerId: vacancyEmployerId,
                        currentUserId: currentUserId,
                        matches: matches
                    });
                }
                
                return matches;
            });
            
            console.log('Отфильтрованные вакансии для работодателя:', this.vacancies.length);
            if (this.vacancies.length > 0) {
                console.log('Первая отфильтрованная вакансия:', this.vacancies[0]);
            }
        } catch (error) {
            console.error('Ошибка при загрузке вакансий:', error);
            this.vacancies = [];
        }
    }

    renderVacancies() {
        const container = document.getElementById('vacanciesList');
        
        if (!container) {
            console.error('Контейнер vacanciesList не найден в DOM');
            return;
        }
        
        console.log('=== РЕНДЕРИНГ ВАКАНСИЙ ===');
        console.log('Количество вакансий для отображения:', this.vacancies ? this.vacancies.length : 0);
        console.log('Тип this.vacancies:', Array.isArray(this.vacancies) ? 'массив' : typeof this.vacancies);
        
        if (!this.vacancies || !Array.isArray(this.vacancies) || this.vacancies.length === 0) {
            console.log('Нет вакансий для отображения, показываем пустое состояние');
            container.innerHTML = `
                <div class="empty-state">
                    <h3>У вас пока нет вакансий</h3>
                    <p>Создайте первую вакансию, чтобы начать поиск сотрудников</p>
                    <button class="btn btn-primary" onclick="workerManager.showCreateVacancyModal()">Создать вакансию</button>
                </div>
            `;
            return;
        }
        
        console.log('Начинаем рендеринг', this.vacancies.length, 'вакансий');

        container.innerHTML = this.vacancies.map(vacancy => `
            <div class="vacancy-item">
                <div class="vacancy-header">
                    <h3>${vacancy.title}</h3>
                    <span class="status-badge status-${vacancy.moderationStatus}">
                        ${this.getStatusText(vacancy.moderationStatus)}
                    </span>
                </div>
                <div class="vacancy-info">
                    <p><strong>Компания:</strong> ${vacancy.company}</p>
                    <p><strong>Зарплата:</strong> ${vacancy.salary || 'Не указана'}</p>
                    <p><strong>Город:</strong> ${vacancy.city || 'Не указан'}</p>
                    <p><strong>Дата создания:</strong> ${new Date(vacancy.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <div class="vacancy-description">
                    <p>${vacancy.description}</p>
                </div>
                <div class="vacancy-actions">
                    <button class="btn btn-outline btn-small" onclick="workerManager.editVacancy(${vacancy.id})">Редактировать</button>
                    <button class="btn-delete-vacancy" onclick="workerManager.deleteVacancy(${vacancy.id})">Удалить</button>
                </div>
            </div>
        `).join('');
    }

    showCreateVacancyModal() {
        // Предотвращаем открытие, если модальное окно уже открывается или закрывается
        if (this.isClosingModal) {
            return;
        }
        
        this.editingVacancyId = null;
        const modal = document.getElementById('createVacancyModal');
        if (!modal) {
            console.error('Модальное окно createVacancyModal не найдено');
            return;
        }

        // Проверяем, не открыто ли уже модальное окно
        if (modal.classList.contains('show')) {
            return;
        }

        // Сбрасываем форму
        const form = document.getElementById('vacancyForm');
        if (form) {
            form.reset();
        }
        
        // Обновляем заголовок и кнопку
        const modalTitle = document.querySelector('#createVacancyModal .modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = 'Создание вакансии';
        }
        const saveBtn = document.getElementById('saveVacancyBtn');
        if (saveBtn) {
            saveBtn.textContent = 'Создать вакансию';
        }

        // Показываем модальное окно
        document.body.style.overflow = 'hidden';
        modal.style.display = 'flex';
        // Небольшая задержка для анимации
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    closeCreateVacancyModal() {
        if (this.isClosingModal) {
            return; // Предотвращаем повторное закрытие
        }
        
        this.isClosingModal = true;
        const modal = document.getElementById('createVacancyModal');
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
    }

    saveVacancy() {
        const form = document.getElementById('vacancyForm');
        const formData = new FormData(form);

        const city = formData.get('city') || '';
        const vacancyData = {
            id: this.editingVacancyId || jobPlatform.generateVacancyResumeId(),
            title: formData.get('title'),
            company: formData.get('company'),
            salary: formData.get('salary') ? parseInt(formData.get('salary')) : null,
            city: city,
            region: this.mapCityToRegion(city),
            description: formData.get('description'),
            requirements: formData.get('requirements'),
            responsibilities: formData.get('responsibilities'),
            conditions: formData.get('conditions'),
            employment: formData.getAll('employment'),
            profession: formData.get('profession'),
            experience: formData.get('experience'),
            employerId: String(this.currentUser.id), // Сохраняем как строку для надежности
            employerName: this.currentUser.fullName,
            createdAt: new Date().toISOString(),
            moderationStatus: 'pending',
            moderationDate: null,
            moderatorId: null,
            rejectReason: null
        };
        
        console.log('Создана вакансия:', vacancyData);
        console.log('employerId:', vacancyData.employerId, typeof vacancyData.employerId);

        // Валидация
        if (!vacancyData.title || !vacancyData.company || !vacancyData.description) {
            jobPlatform.showNotification('Заполните обязательные поля: название, компания и описание', 'error');
            return;
        }

        // Сохраняем вакансию
        const allVacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
        
        if (this.editingVacancyId) {
            // Редактирование существующей вакансии
            const index = allVacancies.findIndex(v => v.id === this.editingVacancyId);
            if (index !== -1) {
                // Сохраняем статус модерации и другие служебные поля
                vacancyData.id = this.editingVacancyId;
                vacancyData.moderationStatus = allVacancies[index].moderationStatus;
                vacancyData.moderationDate = allVacancies[index].moderationDate;
                vacancyData.moderatorId = allVacancies[index].moderatorId;
                vacancyData.rejectReason = allVacancies[index].rejectReason;
                vacancyData.createdAt = allVacancies[index].createdAt;
                // Если вакансия была одобрена, при редактировании она снова идет на модерацию
                if (vacancyData.moderationStatus === 'approved') {
                    vacancyData.moderationStatus = 'pending';
                    vacancyData.moderationDate = null;
                    vacancyData.moderatorId = null;
                }
                
                allVacancies[index] = vacancyData;
                localStorage.setItem('vacancies', JSON.stringify(allVacancies));
                
                jobPlatform.showNotification('Вакансия обновлена и отправлена на модерацию');
            }
        } else {
            // Создание новой вакансии
            allVacancies.push(vacancyData);
            localStorage.setItem('vacancies', JSON.stringify(allVacancies));
            
            jobPlatform.showNotification('Вакансия создана и отправлена на модерацию');
        }
        
        // Перезагружаем вакансии из localStorage для надежности
        console.log('Сохранение завершено, перезагружаем вакансии...');
        this.loadVacancies();
        this.closeCreateVacancyModal();
        
        // Небольшая задержка перед рендерингом для гарантии обновления данных
        setTimeout(() => {
            this.renderVacancies();
        }, 100);
        
        this.editingVacancyId = null;
    }

    editVacancy(vacancyId) {
        const vacancy = this.vacancies.find(v => v.id === vacancyId);
        if (!vacancy) return;

        this.editingVacancyId = vacancyId;

        // Заполняем форму данными вакансии
        document.getElementById('title').value = vacancy.title || '';
        document.getElementById('company').value = vacancy.company || '';
        document.getElementById('salary').value = vacancy.salary || '';
        document.getElementById('city').value = vacancy.city || '';
        document.getElementById('description').value = vacancy.description || '';
        document.getElementById('requirements').value = vacancy.requirements || '';
        document.getElementById('responsibilities').value = vacancy.responsibilities || '';
        document.getElementById('conditions').value = vacancy.conditions || '';
        document.getElementById('profession').value = vacancy.profession || '';
        document.getElementById('experience').value = vacancy.experience || '';

        // Сбрасываем чекбоксы занятости
        document.querySelectorAll('input[name="employment"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Устанавливаем чекбоксы занятости
        if (vacancy.employment && Array.isArray(vacancy.employment)) {
            vacancy.employment.forEach(emp => {
                const checkbox = document.querySelector(`input[name="employment"][value="${emp}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Обновляем заголовок модального окна
        const modalTitle = document.querySelector('#createVacancyModal .modal-header h3');
        if (modalTitle) {
            modalTitle.textContent = 'Редактирование вакансии';
        }
        const saveBtn = document.getElementById('saveVacancyBtn');
        if (saveBtn) {
            saveBtn.textContent = 'Сохранить изменения';
        }

        // Показываем модальное окно
        const editModal = document.getElementById('createVacancyModal');
        if (editModal) {
            // Проверяем, не открыто ли уже модальное окно
            if (editModal.classList.contains('show')) {
                return;
            }
            document.body.style.overflow = 'hidden';
            editModal.style.display = 'flex';
            setTimeout(() => {
                editModal.classList.add('show');
            }, 10);
        }
    }

    deleteVacancy(vacancyId) {
        const vacancy = this.vacancies.find(v => v.id === vacancyId);
        if (!vacancy) return;

        this.showConfirmModal(
            `Вы уверены, что хотите удалить вакансию "${vacancy.title}"? Это действие нельзя отменить.`,
            (id) => {
                // Удаляем из localStorage
                const allVacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
                const updatedVacancies = allVacancies.filter(v => {
                    // Сравниваем ID как строки для надежности
                    return String(v.id) !== String(id);
                });
                localStorage.setItem('vacancies', JSON.stringify(updatedVacancies));

                // Перезагружаем вакансии из localStorage для надежности
                this.loadVacancies();
                this.renderVacancies();
                
                jobPlatform.showNotification('Вакансия удалена');
            },
            vacancyId
        );
    }

    showConfirmModal(message, action, vacancyId = null) {
        // Предотвращаем открытие, если модальное окно уже открывается или закрывается
        if (this.isClosingModal) {
            return;
        }
        
        const modal = document.getElementById('confirmDeleteModal');
        if (modal && modal.classList.contains('show')) {
            return; // Модальное окно уже открыто
        }
        
        this.pendingAction = action;
        this.pendingVacancyId = vacancyId;
        const messageElement = document.getElementById('confirmDeleteMessage');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        if (modal) {
            document.body.style.overflow = 'hidden';
            modal.style.display = 'flex';
            // Небольшая задержка для анимации
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }

        // Настраиваем обработчик кнопки подтверждения
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
        this.pendingVacancyId = null;
    }

    executePendingAction() {
        if (this.pendingAction) {
            this.pendingAction(this.pendingVacancyId);
        }
        this.closeConfirmModal();
    }

    mapCityToRegion(city) {
        if (!city) return 'other';
        const cityLower = city.toLowerCase();
        if (cityLower.includes('москва')) return 'moscow';
        if (cityLower.includes('санкт-петербург') || cityLower.includes('спб') || cityLower.includes('питер')) return 'spb';
        if (cityLower.includes('удален') || cityLower.includes('remote')) return 'remote';
        return 'other';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'На модерации',
            'approved': 'Одобрена',
            'rejected': 'Отклонена'
        };
        return statusMap[status] || status;
    }

    loadApplications() {
        // Загружаем все отклики на вакансии этого работодателя
        this.applications = JSON.parse(localStorage.getItem('applications_to_employer_' + this.currentUser.id) || '[]');
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
                <div class="empty-state">
                    <h3>Пока нет откликов</h3>
                    <p>Отклики на ваши вакансии будут отображаться здесь</p>
                </div>
            `;
            return;
        }

        // Группируем отклики по вакансиям
        const applicationsByVacancy = {};
        this.applications.forEach(app => {
            if (!applicationsByVacancy[app.vacancyId]) {
                applicationsByVacancy[app.vacancyId] = [];
            }
            applicationsByVacancy[app.vacancyId].push(app);
        });

        container.innerHTML = Object.keys(applicationsByVacancy).map(vacancyId => {
            const vacancy = this.vacancies.find(v => v.id === parseInt(vacancyId));
            const vacancyTitle = vacancy ? vacancy.title : this.applications.find(a => a.vacancyId === parseInt(vacancyId))?.vacancyTitle || 'Неизвестная вакансия';
            const apps = applicationsByVacancy[vacancyId];
            
            return `
                <div class="vacancy-applications">
                    <h3>${vacancyTitle}</h3>
                    <div class="applications-grid">
                        ${apps.map(app => `
                            <div class="application-item" data-application-id="${app.id}">
                                <div class="application-header">
                                    <div>
                                        <h4>${app.resumeTitle}</h4>
                                        <p class="applicant-name">${app.applicantName || 'Не указано'}</p>
                                    </div>
                                    <span class="status-badge status-${app.status}">
                                        ${this.getApplicationStatusText(app.status)}
                                    </span>
                                </div>
                                <div class="application-info">
                                    <p><strong>Дата отклика:</strong> ${new Date(app.appliedAt).toLocaleDateString('ru-RU')}</p>
                                </div>
                                <div class="application-actions">
                                    <button class="btn btn-outline btn-small" onclick="workerManager.viewResumeFromApplication(${app.resumeId}, ${app.id})">
                                        Просмотреть резюме
                                    </button>
                                    ${app.status === 'sent' ? `
                                        <button class="btn btn-success btn-small" onclick="workerManager.approveApplication(${app.id})">
                                            Принять
                                        </button>
                                        <button class="btn btn-danger btn-small" onclick="workerManager.rejectApplication(${app.id})">
                                            Отклонить
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    viewResumeFromApplication(resumeId, applicationId) {
        // Находим пользователя, которому принадлежит резюме
        const application = this.applications.find(a => a.id === applicationId);
        if (!application) return;

        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const applicant = users.find(u => u.id === application.applicantId);
        
        if (!applicant) {
            jobPlatform.showNotification('Не удалось найти информацию о соискателе', 'error');
            return;
        }

        const resumes = JSON.parse(localStorage.getItem('resumes_' + applicant.id) || '[]');
        const resume = resumes.find(r => r.id === resumeId);

        if (!resume) {
            jobPlatform.showNotification('Резюме не найдено', 'error');
            return;
        }

        // Сохраняем текущий отклик для действий
        this.currentApplicationId = applicationId;
        this.currentApplication = application;

        // Генерируем HTML резюме
        const content = document.getElementById('resumePreviewContent');
        content.innerHTML = this.generateResumePreview(resume);

        // Добавляем кнопки действий
        const actions = document.getElementById('applicationActions');
        if (application.status === 'sent') {
            actions.innerHTML = `
                <button type="button" class="btn btn-secondary" onclick="workerManager.closeViewResumeModal()">Закрыть</button>
                <button type="button" class="btn btn-danger" onclick="workerManager.rejectApplication(${applicationId})">Отклонить</button>
                <button type="button" class="btn btn-success" onclick="workerManager.approveApplication(${applicationId})">Принять</button>
            `;
        } else {
            actions.innerHTML = `
                <button type="button" class="btn btn-secondary" onclick="workerManager.closeViewResumeModal()">Закрыть</button>
            `;
        }

        document.getElementById('viewResumeModal').style.display = 'block';
    }

    generateResumePreview(resume) {
        return `
            <div class="resume-preview">
                <header class="resume-header">
                    <h1>${resume.personal.fullName}</h1>
                    <div class="contact-info">
                        <div>📞 ${resume.personal.phone}</div>
                        <div>✉️ ${resume.personal.email}</div>
                        ${resume.personal.address ? `<div>📍 ${resume.personal.address}</div>` : ''}
                    </div>
                </header>
                
                ${resume.desiredSalary ? `
                <section class="resume-section">
                    <h2>Желаемая зарплата</h2>
                    <p>${parseInt(resume.desiredSalary).toLocaleString('ru-RU')} руб.</p>
                </section>
                ` : ''}
                
                <section class="resume-section">
                    <h2>Образование</h2>
                    ${resume.education && resume.education.length > 0 ? resume.education.map(edu => `
                        <div class="education-item">
                            <h3>${edu.institution}</h3>
                            <p>${edu.specialty}, ${edu.year} год</p>
                        </div>
                    `).join('') : '<p>Не указано</p>'}
                </section>
                
                ${resume.experience && resume.experience.hasExperience ? `
                <section class="resume-section">
                    <h2>Опыт работы</h2>
                    ${resume.experience.items && resume.experience.items.length > 0 ? resume.experience.items.map(exp => `
                        <div class="experience-item">
                            <h3>${exp.company}</h3>
                            <p><strong>${exp.position}</strong> | ${exp.period}</p>
                            ${exp.responsibilities ? `<p>${exp.responsibilities}</p>` : ''}
                        </div>
                    `).join('') : '<p>Нет опыта работы</p>'}
                </section>
                ` : `
                <section class="resume-section">
                    <h2>Опыт работы</h2>
                    <p>Нет опыта работы</p>
                </section>
                `}
                
                ${resume.skills && resume.skills.length > 0 ? `
                <section class="resume-section">
                    <h2>Навыки</h2>
                    <div class="skills">
                        ${resume.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                </section>
                ` : ''}
            </div>
        `;
    }

    approveApplication(applicationId) {
        const application = this.applications.find(a => a.id === applicationId);
        if (!application) return;

        application.status = 'approved';
        application.reviewedAt = new Date().toISOString();

        // Обновляем в localStorage для работодателя
        localStorage.setItem('applications_to_employer_' + this.currentUser.id, JSON.stringify(this.applications));

        // Обновляем в localStorage для соискателя
        const applicantApplications = JSON.parse(localStorage.getItem('applications_' + application.applicantId) || '[]');
        const applicantApp = applicantApplications.find(a => a.id === applicationId);
        if (applicantApp) {
            applicantApp.status = 'approved';
            applicantApp.reviewedAt = application.reviewedAt;
            localStorage.setItem('applications_' + application.applicantId, JSON.stringify(applicantApplications));
        }

        this.closeViewResumeModal();
        this.renderApplications();
        jobPlatform.showNotification('Отклик принят');
    }

    rejectApplication(applicationId) {
        const application = this.applications.find(a => a.id === applicationId);
        if (!application) return;

        application.status = 'rejected';
        application.reviewedAt = new Date().toISOString();

        // Обновляем в localStorage для работодателя
        localStorage.setItem('applications_to_employer_' + this.currentUser.id, JSON.stringify(this.applications));

        // Обновляем в localStorage для соискателя
        const applicantApplications = JSON.parse(localStorage.getItem('applications_' + application.applicantId) || '[]');
        const applicantApp = applicantApplications.find(a => a.id === applicationId);
        if (applicantApp) {
            applicantApp.status = 'rejected';
            applicantApp.reviewedAt = application.reviewedAt;
            localStorage.setItem('applications_' + application.applicantId, JSON.stringify(applicantApplications));
        }

        this.closeViewResumeModal();
        this.renderApplications();
        jobPlatform.showNotification('Отклик отклонен');
    }

    closeViewResumeModal() {
        const modal = document.getElementById('viewResumeModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Восстанавливаем прокрутку
        }
        this.currentApplicationId = null;
        this.currentApplication = null;
    }

    getApplicationStatusText(status) {
        const statusMap = {
            'sent': 'На рассмотрении',
            'approved': 'Принят',
            'rejected': 'Отклонен'
        };
        return statusMap[status] || status;
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'auth.html';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOM ЗАГРУЖЕН ===');
    
    // Проверяем, что все необходимые элементы существуют
    const vacanciesList = document.getElementById('vacanciesList');
    const applicationsList = document.getElementById('applicationsList');
    
    if (!vacanciesList) {
        console.error('Контейнер vacanciesList не найден в DOM');
    } else {
        console.log('Контейнер vacanciesList найден');
    }
    
    if (!applicationsList) {
        console.error('Контейнер applicationsList не найден в DOM');
    } else {
        console.log('Контейнер applicationsList найден');
    }
    
    // Инициализируем WorkerManager
    window.workerManager = new WorkerManager();
    
    // Дополнительная проверка и принудительный рендеринг через задержку
    setTimeout(() => {
        if (window.workerManager) {
            console.log('=== ПРОВЕРКА ПОСЛЕ ИНИЦИАЛИЗАЦИИ ===');
            console.log('Вакансии в памяти:', window.workerManager.vacancies?.length || 0);
            console.log('Отклики в памяти:', window.workerManager.applications?.length || 0);
            
            // Принудительно перерисовываем вакансии, если они есть
            if (window.workerManager.vacancies && window.workerManager.vacancies.length > 0) {
                const container = document.getElementById('vacanciesList');
                if (container) {
                    const isEmpty = container.innerHTML.trim() === '' || 
                                   container.innerHTML.includes('пока нет вакансий');
                    if (isEmpty) {
                        console.log('Принудительный рендеринг вакансий (данные есть, но не отображаются)');
                        window.workerManager.renderVacancies();
                    } else {
                        console.log('Вакансии уже отображаются');
                    }
                }
            } else {
                console.log('Нет вакансий для отображения');
            }
            
            // Принудительно перерисовываем отклики, если они есть
            if (window.workerManager.applications && window.workerManager.applications.length > 0) {
                const container = document.getElementById('applicationsList');
                if (container) {
                    const isEmpty = container.innerHTML.trim() === '' || 
                                   container.innerHTML.includes('Пока нет откликов');
                    if (isEmpty) {
                        console.log('Принудительный рендеринг откликов (данные есть, но не отображаются)');
                        window.workerManager.renderApplications();
                    }
                }
            }
        } else {
            console.error('WorkerManager не инициализирован');
        }
    }, 300);
});