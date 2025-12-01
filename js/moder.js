class ModerManager {
    constructor() {
        this.currentUser = null;
        this.resumes = [];
        this.vacancies = [];
        this.currentModerationItem = null;
        this.currentModerationType = null; // 'resume' или 'vacancy'
        this.currentResumePage = 1;
        this.currentVacancyPage = 1;
        this.itemsPerPage = 8;
        this.filteredResumes = [];
        this.filteredVacancies = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadData();
        this.updateStats();
        // Отображаем данные после загрузки
        setTimeout(() => {
            this.applyResumeFilters();
            this.applyVacancyFilters();
        }, 100);
    }

    checkAuth() {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        
        // Модератор может только модерировать вакансии, админ не должен заходить сюда
        if (!user || user.status !== 'moderator') {
            window.location.href = 'auth.html';
            return;
        }

        this.currentUser = user;
        console.log('Moderator logged in:', user);
    }

    setupEventListeners() {
        // Навигационные вкладки
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Фильтры и поиск
        const resumeFilter = document.getElementById('resumeFilter');
        const resumeSearch = document.getElementById('resumeSearch');
        if (resumeFilter) {
            resumeFilter.addEventListener('change', () => {
                this.renderResumes();
            });
        }
        if (resumeSearch) {
            resumeSearch.addEventListener('input', (e) => {
                this.searchResumes(e.target.value);
            });
        }
        
        const vacancyFilter = document.getElementById('vacancyFilter');
        const vacancySearch = document.getElementById('vacancySearch');
        if (vacancyFilter) {
            vacancyFilter.addEventListener('change', () => {
                this.renderVacancies();
            });
        }
        if (vacancySearch) {
            vacancySearch.addEventListener('input', (e) => {
                this.searchVacancies(e.target.value);
            });
        }

        // Выход
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });

        // Кнопки быстрых причин отклонения
        document.querySelectorAll('.reason-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('rejectReason').value = e.target.dataset.reason;
            });
        });

        // Закрытие модальных окон по клику вне их
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }

    switchTab(tabName) {
        // Обновляем активные вкладки
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Показываем соответствующую секцию
        document.querySelectorAll('.moder-section').forEach(section => {
            section.classList.toggle('active', section.id === tabName + 'Section');
        });
    }

    loadData() {
        // Загружаем резюме из всех пользователей
        this.resumes = this.getAllResumes();
        
        // Загружаем вакансии
        this.vacancies = this.getAllVacancies();
        
        console.log('Loaded resumes:', this.resumes.length);
        console.log('Loaded vacancies:', this.vacancies.length);
        
        // Инициализируем отфильтрованные данные всеми данными
        this.filteredResumes = [...this.resumes];
        this.filteredVacancies = [...this.vacancies];
    }

    getAllResumes() {
        const allResumes = [];
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        users.forEach(user => {
            const userResumes = JSON.parse(localStorage.getItem('resumes_' + user.id) || '[]');
            userResumes.forEach(resume => {
                // Добавляем информацию о пользователе в резюме
                allResumes.push({
                    ...resume,
                    userId: user.id,
                    userFullName: user.fullName,
                    userPhone: user.phone,
                    userEmail: user.username, // username используется как email
                    // Устанавливаем статус модерации, если его нет
                    moderationStatus: resume.moderationStatus || 'pending',
                    moderationDate: resume.moderationDate || null,
                    moderatorId: resume.moderatorId || null,
                    rejectReason: resume.rejectReason || null
                });
            });
        });

        return allResumes;
    }

    getAllVacancies() {
        // Заглушка для вакансий - в реальном проекте здесь будет загрузка из базы
        const vacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
        
        return vacancies.map(vacancy => ({
            ...vacancy,
            moderationStatus: vacancy.moderationStatus || 'pending',
            moderationDate: vacancy.moderationDate || null,
            moderatorId: vacancy.moderatorId || null,
            rejectReason: vacancy.rejectReason || null
        }));
    }

    updateStats() {
        const pendingResumes = this.resumes.filter(r => r.moderationStatus === 'pending').length;
        const pendingVacancies = this.vacancies.filter(v => v.moderationStatus === 'pending').length;
        
        // Подсчет действий за сегодня
        const today = new Date().toDateString();
        const approvedToday = [...this.resumes, ...this.vacancies].filter(item => 
            item.moderationStatus === 'approved' && 
            item.moderationDate && 
            new Date(item.moderationDate).toDateString() === today
        ).length;
        
        const rejectedToday = [...this.resumes, ...this.vacancies].filter(item => 
            item.moderationStatus === 'rejected' && 
            item.moderationDate && 
            new Date(item.moderationDate).toDateString() === today
        ).length;

        document.getElementById('pendingResumes').textContent = pendingResumes;
        document.getElementById('pendingVacancies').textContent = pendingVacancies;
        document.getElementById('approvedToday').textContent = approvedToday;
        document.getElementById('rejectedToday').textContent = rejectedToday;
    }

    applyResumeFilters() {
        const filterElement = document.getElementById('resumeFilter');
        const searchElement = document.getElementById('resumeSearch');
        
        if (!filterElement || !searchElement) {
            return;
        }
        
        const filter = filterElement.value;
        const search = searchElement.value.toLowerCase();

        let filteredResumes = [...this.resumes];

        // Применяем фильтр по статусу
        if (filter !== 'all') {
            filteredResumes = filteredResumes.filter(resume => resume.moderationStatus === filter);
        }

        // Применяем поиск
        if (search) {
            filteredResumes = filteredResumes.filter(resume => {
                const fullName = resume.personal?.fullName || resume.userFullName || '';
                const title = resume.title || '';
                const email = resume.personal?.email || resume.userEmail || '';
                
                return fullName.toLowerCase().includes(search) ||
                       title.toLowerCase().includes(search) ||
                       email.toLowerCase().includes(search);
            });
        }

        // Сохраняем отфильтрованные резюме
        this.filteredResumes = filteredResumes;
        this.currentResumePage = 1; // Сбрасываем на первую страницу при фильтрации
        
        this.renderResumesList();
        this.renderResumesPagination();
    }

    renderResumes() {
        this.applyResumeFilters();
    }

    renderResumesList() {
        const container = document.getElementById('resumesList');
        
        if (this.filteredResumes.length === 0) {
            container.innerHTML = `
                <div class="moderation-item">
                    <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                        Резюме не найдены
                    </div>
                </div>
            `;
            return;
        }

        // Вычисляем индексы для текущей страницы
        const startIndex = (this.currentResumePage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentPageResumes = this.filteredResumes.slice(startIndex, endIndex);

        container.innerHTML = currentPageResumes.map(resume => `
            <div class="moderation-item ${resume.moderationStatus}">
                <div class="item-header">
                    <h3 class="item-title">${resume.title}</h3>
                    <div class="item-meta">
                        <span class="status-badge status-${resume.moderationStatus}">
                            ${this.getStatusText(resume.moderationStatus)}
                        </span>
                        <span>${this.formatDate(resume.createdAt)}</span>
                    </div>
                </div>
                
                <div class="item-content">
                    <p><strong>Соискатель:</strong> ${resume.personal?.fullName || resume.userFullName || 'Не указано'}</p>
                    <p><strong>Контакты:</strong> ${resume.personal?.phone || resume.userPhone || 'Не указан'}, ${resume.personal?.email || resume.userEmail || 'Не указан'}</p>
                    <p><strong>Желаемая зарплата:</strong> ${resume.desiredSalary ? resume.desiredSalary.toLocaleString('ru-RU') + ' руб.' : 'Не указана'}</p>
                    
                    ${resume.skills && resume.skills.length > 0 ? `
                        <div class="item-skills">
                            ${resume.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    ${resume.moderationStatus === 'rejected' && resume.rejectReason ? `
                        <p><strong>Причина отклонения:</strong> ${resume.rejectReason}</p>
                    ` : ''}
                    
                    ${resume.moderationStatus === 'approved' && resume.moderatorId ? `
                        <p><strong>Одобрено модератором:</strong> ${this.getModeratorName(resume.moderatorId)}</p>
                    ` : ''}
                </div>
                
                <div class="item-actions">
                    <button onclick="moderManager.viewResume(${resume.id})" class="btn btn-outline btn-small">Просмотреть</button>
                    ${resume.moderationStatus === 'pending' ? `
                        <button onclick="moderManager.approveResume(${resume.id})" class="btn btn-success btn-small">Одобрить</button>
                        <button onclick="moderManager.showRejectModal('resume', ${resume.id})" class="btn btn-danger btn-small">Отклонить</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    applyVacancyFilters() {
        const filterElement = document.getElementById('vacancyFilter');
        const searchElement = document.getElementById('vacancySearch');
        
        if (!filterElement || !searchElement) {
            return;
        }
        
        const filter = filterElement.value;
        const search = searchElement.value.toLowerCase();

        let filteredVacancies = [...this.vacancies];

        if (filter !== 'all') {
            filteredVacancies = filteredVacancies.filter(vacancy => vacancy.moderationStatus === filter);
        }

        if (search) {
            filteredVacancies = filteredVacancies.filter(vacancy => {
                const title = vacancy.title || '';
                const company = vacancy.company || '';
                const description = vacancy.description || '';
                
                return title.toLowerCase().includes(search) ||
                       company.toLowerCase().includes(search) ||
                       description.toLowerCase().includes(search);
            });
        }

        // Сохраняем отфильтрованные вакансии
        this.filteredVacancies = filteredVacancies;
        this.currentVacancyPage = 1; // Сбрасываем на первую страницу при фильтрации
        
        this.renderVacanciesList();
        this.renderVacanciesPagination();
    }

    renderVacancies() {
        this.applyVacancyFilters();
    }

    renderVacanciesList() {
        const container = document.getElementById('vacanciesList');
        
        if (this.filteredVacancies.length === 0) {
            container.innerHTML = `
                <div class="moderation-item">
                    <div style="text-align: center; color: var(--text-light); padding: 2rem;">
                        Вакансии не найдены
                    </div>
                </div>
            `;
            return;
        }

        // Вычисляем индексы для текущей страницы
        const startIndex = (this.currentVacancyPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const currentPageVacancies = this.filteredVacancies.slice(startIndex, endIndex);

        container.innerHTML = currentPageVacancies.map(vacancy => `
            <div class="moderation-item ${vacancy.moderationStatus}">
                <div class="item-header">
                    <h3 class="item-title">${vacancy.title}</h3>
                    <div class="item-meta">
                        <span class="status-badge status-${vacancy.moderationStatus}">
                            ${this.getStatusText(vacancy.moderationStatus)}
                        </span>
                        <span>${this.formatDate(vacancy.createdAt)}</span>
                    </div>
                </div>
                
                <div class="item-content">
                    <p><strong>Компания:</strong> ${vacancy.company}</p>
                    <p><strong>Зарплата:</strong> ${vacancy.salary ? vacancy.salary : 'Не указана'}</p>
                    <p><strong>Описание:</strong> ${vacancy.description.substring(0, 200)}...</p>
                    
                    ${vacancy.moderationStatus === 'rejected' && vacancy.rejectReason ? `
                        <p><strong>Причина отклонения:</strong> ${vacancy.rejectReason}</p>
                    ` : ''}
                    
                    ${vacancy.moderationStatus === 'approved' && vacancy.moderatorId ? `
                        <p><strong>Одобрено модератором:</strong> ${this.getModeratorName(vacancy.moderatorId)}</p>
                    ` : ''}
                </div>
                
                <div class="item-actions">
                    <button onclick="moderManager.viewVacancy(${vacancy.id})" class="btn btn-outline btn-small">Просмотреть</button>
                    ${vacancy.moderationStatus === 'pending' ? `
                        <button onclick="moderManager.approveVacancy(${vacancy.id})" class="btn btn-success btn-small">Одобрить</button>
                        <button onclick="moderManager.showRejectModal('vacancy', ${vacancy.id})" class="btn btn-danger btn-small">Отклонить</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    searchResumes(query) {
        this.applyResumeFilters();
    }

    searchVacancies(query) {
        this.applyVacancyFilters();
    }

    viewResume(resumeId) {
        const resume = this.resumes.find(r => r.id === resumeId);
        if (!resume) return;

        this.currentModerationItem = resume;
        this.currentModerationType = 'resume';

        const content = document.getElementById('resumePreviewContent');
        content.innerHTML = this.generateResumePreview(resume);

        document.getElementById('viewResumeModal').style.display = 'block';
    }

    viewVacancy(vacancyId) {
        const vacancy = this.vacancies.find(v => v.id === vacancyId);
        if (!vacancy) return;

        this.currentModerationItem = vacancy;
        this.currentModerationType = 'vacancy';

        const content = document.getElementById('vacancyPreviewContent');
        content.innerHTML = this.generateVacancyPreview(vacancy);

        document.getElementById('viewVacancyModal').style.display = 'block';
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
                    ${resume.education.map(edu => `
                        <div class="education-item">
                            <h3>${edu.institution}</h3>
                            <p>${edu.specialty}, ${edu.year} год</p>
                        </div>
                    `).join('')}
                </section>
                
                ${resume.experience.hasExperience ? `
                <section class="resume-section">
                    <h2>Опыт работы</h2>
                    ${resume.experience.items.map(exp => `
                        <div class="experience-item">
                            <h3>${exp.company}</h3>
                            <p><strong>${exp.position}</strong> | ${exp.period}</p>
                            ${exp.responsibilities ? `<p>${exp.responsibilities}</p>` : ''}
                        </div>
                    `).join('')}
                </section>
                ` : `
                <section class="resume-section">
                    <h2>Опыт работы</h2>
                    <p>Нет опыта работы</p>
                </section>
                `}
                
                ${resume.skills.length > 0 ? `
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

    generateVacancyPreview(vacancy) {
        return `
            <div class="vacancy-preview">
                <header class="vacancy-header">
                    <h1>${vacancy.title}</h1>
                    <div class="vacancy-meta">
                        <p><strong>Компания:</strong> ${vacancy.company}</p>
                        <p><strong>Зарплата:</strong> ${vacancy.salary || 'Не указана'}</p>
                        <p><strong>Город:</strong> ${vacancy.city || 'Не указан'}</p>
                    </div>
                </header>
                
                <section class="vacancy-section">
                    <h2>Описание вакансии</h2>
                    <p>${vacancy.description}</p>
                </section>
                
                ${vacancy.requirements ? `
                <section class="vacancy-section">
                    <h2>Требования</h2>
                    <p>${vacancy.requirements}</p>
                </section>
                ` : ''}
                
                ${vacancy.responsibilities ? `
                <section class="vacancy-section">
                    <h2>Обязанности</h2>
                    <p>${vacancy.responsibilities}</p>
                </section>
                ` : ''}
                
                ${vacancy.conditions ? `
                <section class="vacancy-section">
                    <h2>Условия</h2>
                    <p>${vacancy.conditions}</p>
                </section>
                ` : ''}
            </div>
        `;
    }

    approveResume(resumeId = null) {
        const resume = resumeId ? 
            this.resumes.find(r => r.id === resumeId) : 
            this.currentModerationItem;
            
        if (!resume) return;

        resume.moderationStatus = 'approved';
        resume.moderationDate = new Date().toISOString();
        resume.moderatorId = this.currentUser.id;
        resume.rejectReason = null;

        this.saveResumeChanges(resume);
        this.closeAllModals();
        this.renderResumes();
        this.updateStats();
        
        jobPlatform.showNotification('Резюме одобрено');
    }

    approveVacancy(vacancyId = null) {
        const vacancy = vacancyId ? 
            this.vacancies.find(v => v.id === vacancyId) : 
            this.currentModerationItem;
            
        if (!vacancy) return;

        vacancy.moderationStatus = 'approved';
        vacancy.moderationDate = new Date().toISOString();
        vacancy.moderatorId = this.currentUser.id;
        vacancy.rejectReason = null;

        this.saveVacancyChanges(vacancy);
        this.closeAllModals();
        this.loadData();
        this.applyVacancyFilters();
        this.updateStats();
        
        jobPlatform.showNotification('Вакансия одобрена');
    }

    showRejectModal(type, itemId) {
        this.currentModerationType = type;
        this.currentModerationItem = type === 'resume' ? 
            this.resumes.find(r => r.id === itemId) : 
            this.vacancies.find(v => v.id === itemId);

        document.getElementById('rejectModalTitle').textContent = 
            `Причина отклонения ${type === 'resume' ? 'резюме' : 'вакансии'}`;
        document.getElementById('rejectReason').value = '';
        document.getElementById('rejectReasonModal').style.display = 'block';
    }

    confirmRejection() {
        const reason = document.getElementById('rejectReason').value.trim();
        if (!reason) {
            jobPlatform.showNotification('Укажите причину отклонения', 'error');
            return;
        }

        if (this.currentModerationType === 'resume') {
            this.rejectResume(reason);
        } else {
            this.rejectVacancy(reason);
        }
    }

    rejectResume(reason = null) {
        if (!reason && !this.currentModerationItem) {
            this.showRejectModal('resume', this.currentModerationItem.id);
            return;
        }

        const resume = this.currentModerationItem;
        resume.moderationStatus = 'rejected';
        resume.moderationDate = new Date().toISOString();
        resume.moderatorId = this.currentUser.id;
        resume.rejectReason = reason;

        this.saveResumeChanges(resume);
        this.closeAllModals();
        this.loadData();
        this.applyResumeFilters();
        this.updateStats();
        
        jobPlatform.showNotification('Резюме отклонено');
    }

    rejectVacancy(reason = null) {
        if (!reason && !this.currentModerationItem) {
            this.showRejectModal('vacancy', this.currentModerationItem.id);
            return;
        }

        const vacancy = this.currentModerationItem;
        vacancy.moderationStatus = 'rejected';
        vacancy.moderationDate = new Date().toISOString();
        vacancy.moderatorId = this.currentUser.id;
        vacancy.rejectReason = reason;

        this.saveVacancyChanges(vacancy);
        this.closeAllModals();
        this.loadData();
        this.applyVacancyFilters();
        this.updateStats();
        
        jobPlatform.showNotification('Вакансия отклонена');
    }

    saveResumeChanges(resume) {
        // Находим пользователя, которому принадлежит резюме
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.id === resume.userId);
        
        if (user) {
            const userResumes = JSON.parse(localStorage.getItem('resumes_' + user.id) || '[]');
            const resumeIndex = userResumes.findIndex(r => r.id === resume.id);
            
            if (resumeIndex !== -1) {
                userResumes[resumeIndex] = resume;
                localStorage.setItem('resumes_' + user.id, JSON.stringify(userResumes));
                
                // Обновляем данные в текущем экземпляре
                const globalResumeIndex = this.resumes.findIndex(r => r.id === resume.id);
                if (globalResumeIndex !== -1) {
                    this.resumes[globalResumeIndex] = resume;
                }
                
                // Обновляем отфильтрованные данные
                const filteredResumeIndex = this.filteredResumes.findIndex(r => r.id === resume.id);
                if (filteredResumeIndex !== -1) {
                    this.filteredResumes[filteredResumeIndex] = resume;
                }
            }
        }
    }

    saveVacancyChanges(vacancy) {
        const vacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
        const vacancyIndex = vacancies.findIndex(v => v.id === vacancy.id);
        
        if (vacancyIndex !== -1) {
            vacancies[vacancyIndex] = vacancy;
            localStorage.setItem('vacancies', JSON.stringify(vacancies));
            
            // Обновляем данные в текущем экземпляре
            const globalVacancyIndex = this.vacancies.findIndex(v => v.id === vacancy.id);
            if (globalVacancyIndex !== -1) {
                this.vacancies[globalVacancyIndex] = vacancy;
            }
            
            // Обновляем отфильтрованные данные
            const filteredVacancyIndex = this.filteredVacancies.findIndex(v => v.id === vacancy.id);
            if (filteredVacancyIndex !== -1) {
                this.filteredVacancies[filteredVacancyIndex] = vacancy;
            }
        }
    }

    closeRejectModal() {
        document.getElementById('rejectReasonModal').style.display = 'none';
        document.getElementById('rejectReason').value = '';
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentModerationItem = null;
        this.currentModerationType = null;
    }

    getModeratorName(moderatorId) {
        // В реальном проекте здесь будет запрос к базе данных
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const moderator = users.find(u => u.id === moderatorId);
        return moderator ? moderator.fullName : 'Неизвестный модератор';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'На модерации',
            'approved': 'Одобрено',
            'rejected': 'Отклонено'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    renderResumesPagination() {
        const container = document.getElementById('resumesPagination');
        const totalPages = Math.ceil(this.filteredResumes.length / this.itemsPerPage);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination">';
        
        // Кнопка "Предыдущая"
        paginationHTML += `
            <button class="pagination-btn" onclick="moderManager.goToResumePage(${this.currentResumePage - 1})" 
                    ${this.currentResumePage === 1 ? 'disabled' : ''}>
                Назад
            </button>
        `;

        // Номера страниц
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentResumePage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="moderManager.goToResumePage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentResumePage ? 'active' : ''}" 
                        onclick="moderManager.goToResumePage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="moderManager.goToResumePage(${totalPages})">${totalPages}</button>`;
        }

        // Кнопка "Следующая"
        paginationHTML += `
            <button class="pagination-btn" onclick="moderManager.goToResumePage(${this.currentResumePage + 1})" 
                    ${this.currentResumePage === totalPages ? 'disabled' : ''}>
                Вперед
            </button>
        `;

        // Информация о странице
        paginationHTML += `
            <div class="pagination-info">
                Показано ${(this.currentResumePage - 1) * this.itemsPerPage + 1} - ${Math.min(this.currentResumePage * this.itemsPerPage, this.filteredResumes.length)} из ${this.filteredResumes.length}
            </div>
        `;

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    renderVacanciesPagination() {
        const container = document.getElementById('vacanciesPagination');
        const totalPages = Math.ceil(this.filteredVacancies.length / this.itemsPerPage);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination">';
        
        // Кнопка "Предыдущая"
        paginationHTML += `
            <button class="pagination-btn" onclick="moderManager.goToVacancyPage(${this.currentVacancyPage - 1})" 
                    ${this.currentVacancyPage === 1 ? 'disabled' : ''}>
                Назад
            </button>
        `;

        // Номера страниц
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentVacancyPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="moderManager.goToVacancyPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentVacancyPage ? 'active' : ''}" 
                        onclick="moderManager.goToVacancyPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="moderManager.goToVacancyPage(${totalPages})">${totalPages}</button>`;
        }

        // Кнопка "Следующая"
        paginationHTML += `
            <button class="pagination-btn" onclick="moderManager.goToVacancyPage(${this.currentVacancyPage + 1})" 
                    ${this.currentVacancyPage === totalPages ? 'disabled' : ''}>
                Вперед
            </button>
        `;

        // Информация о странице
        paginationHTML += `
            <div class="pagination-info">
                Показано ${(this.currentVacancyPage - 1) * this.itemsPerPage + 1} - ${Math.min(this.currentVacancyPage * this.itemsPerPage, this.filteredVacancies.length)} из ${this.filteredVacancies.length}
            </div>
        `;

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    goToResumePage(page) {
        const totalPages = Math.ceil(this.filteredResumes.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentResumePage = page;
        this.renderResumesList();
        this.renderResumesPagination();
        
        // Прокрутка к началу списка
        const list = document.getElementById('resumesList');
        if (list) {
            list.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    goToVacancyPage(page) {
        const totalPages = Math.ceil(this.filteredVacancies.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentVacancyPage = page;
        this.renderVacanciesList();
        this.renderVacanciesPagination();
        
        // Прокрутка к началу списка
        const list = document.getElementById('vacanciesList');
        if (list) {
            list.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    logout() {
        localStorage.removeItem('currentUser');
        window.location.href = 'auth.html';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.moderManager = new ModerManager();
});