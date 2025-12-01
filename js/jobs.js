class JobsManager {
    constructor() {
        this.vacancies = [];
        this.resumes = [];
        this.filteredVacancies = [];
        this.filteredResumes = [];
        this.currentPage = 1;
        this.currentResumePage = 1;
        this.currentVacancyPage = 1;
        this.vacanciesPerPage = 8;
        this.resumesPerPage = 8;
        this.currentFilters = {};
        this.selectedVacancy = null;
        this.selectedResume = null;
        this.activeFiltersCount = 0;
        this.isEmployer = false;
        this.currentView = 'vacancies';
        this.init();
    }

    async init() {
        console.log('=== ИНИЦИАЛИЗАЦИЯ JobsManager ===');
        this.checkAuthButtons();
        this.checkUserRole();
        
        if (this.isEmployer) {
            console.log('Режим: РАБОТОДАТЕЛЬ');
            // Показываем фильтры для резюме
            const vacancyFilters = document.getElementById('vacancyFilters');
            const resumeFilters = document.getElementById('resumeFilters');
            if (vacancyFilters) vacancyFilters.style.display = 'none';
            if (resumeFilters) resumeFilters.style.display = 'block';
            
            await this.loadResumes();
            this.setupResumeEventListeners();
            // Применяем фильтры при загрузке (показываем все резюме)
            this.applyResumeFilters();
        } else {
            console.log('Режим: СОИСКАТЕЛЬ');
            // Показываем фильтры для вакансий
            const vacancyFilters = document.getElementById('vacancyFilters');
            const resumeFilters = document.getElementById('resumeFilters');
            if (vacancyFilters) vacancyFilters.style.display = 'block';
            if (resumeFilters) resumeFilters.style.display = 'none';
            
            await this.loadVacancies();
            this.setupEventListeners();
            
            // Применяем фильтры при загрузке
            this.applyFilters();
            
            // Если все еще нет вакансий, создаем тестовые
            if (this.filteredVacancies.length === 0) {
                console.log('Создаем тестовые вакансии...');
                this.createTestVacancies();
                this.applyFilters();
            }
        }
    }

    createTestVacancies() {
        console.log('Создание тестовых вакансий...');
        this.vacancies = [
            {
                id: 1001,
                title: "Frontend разработчик",
                company: "ТехноКомпания",
                salary: 120000,
                region: "moscow",
                employment: ["full", "remote"],
                profession: "frontend",
                description: "Ищем опытного фронтенд разработчика для работы над интересными проектами. Требования: опыт работы с React, JavaScript, TypeScript.",
                experience: "1-3 года",
                created: new Date().toISOString(),
                city: "Москва",
                moderationStatus: "approved"
            },
            {
                id: 1002,
                title: "Backend разработчик",
                company: "ИТ Решения",
                salary: 150000,
                region: "spb",
                employment: ["full"],
                profession: "backend",
                description: "Требуется backend разработчик для разработки высоконагруженных систем. Работа с Node.js, PostgreSQL, Docker.",
                experience: "3-5 лет",
                created: new Date().toISOString(),
                city: "Санкт-Петербург",
                moderationStatus: "approved"
            },
            {
                id: 1003,
                title: "UX/UI дизайнер",
                company: "Дизайн Студия",
                salary: 80000,
                region: "remote",
                employment: ["remote", "part"],
                profession: "design",
                description: "Нужен креативный дизайнер для создания интерфейсов мобильных приложений. Опыт работы с Figma, Adobe Creative Suite.",
                experience: "1-2 года",
                created: new Date().toISOString(),
                city: "Удаленно",
                moderationStatus: "approved"
            },
            {
                id: 1004,
                title: "Менеджер проектов",
                company: "БизнесТех",
                salary: 110000,
                region: "moscow",
                employment: ["full"],
                profession: "management",
                description: "Ищем менеджера проектов для управления IT-проектами. Знание Agile, Scrum, опыт управления командой.",
                experience: "2-4 года",
                created: new Date().toISOString(),
                city: "Москва",
                moderationStatus: "approved"
            },
            {
                id: 1005,
                title: "Data Scientist",
                company: "Аналитика Про",
                salary: 170000,
                region: "remote",
                employment: ["remote", "full"],
                profession: "data",
                description: "Требуется data scientist для работы с большими данными. Опыт работы с Python, ML, SQL.",
                experience: "3-5 лет",
                created: new Date().toISOString(),
                city: "Удаленно",
                moderationStatus: "approved"
            }
        ];
        this.filteredVacancies = [...this.vacancies];
        console.log('Создано тестовых вакансий:', this.vacancies.length);
    }

    checkUserRole() {
        try {
            const user = jobPlatform.getCurrentUser();
            console.log('Текущий пользователь:', user);
            this.isEmployer = user && (user.role === 'employer' || user.status === 'employer');
            console.log('Роль пользователя:', this.isEmployer ? 'employer' : 'jobseeker');
        } catch (error) {
            console.error('Ошибка при проверке роли пользователя:', error);
            this.isEmployer = false;
        }
    }

    checkAuthButtons() {
        try {
            const user = jobPlatform.getCurrentUser();
            const authBtn = document.getElementById('authBtn');
            const profileBtn = document.getElementById('profileBtn');

            if (user) {
                if (authBtn) authBtn.style.display = 'none';
                if (profileBtn) profileBtn.style.display = 'block';
            }
        } catch (error) {
            console.error('Ошибка при проверке кнопок авторизации:', error);
        }
    }

    async loadVacancies() {
        console.log('=== ЗАГРУЗКА ВАКАНСИЙ ===');
        
        // Загружаем вакансии из localStorage
        let localStorageVacancies = [];
        try {
            localStorageVacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
            console.log('Вакансии из localStorage:', localStorageVacancies.length);
        } catch (error) {
            console.error('Ошибка при загрузке вакансий из localStorage:', error);
        }

        // Загружаем примеры вакансий из JSON файла
        let exampleVacancies = [];
        try {
            console.log('Пытаемся загрузить vacancies.json...');
            const response = await fetch('./vacancies.json');
            console.log('Статус ответа:', response.status, response.statusText);
            
            if (response.ok) {
                exampleVacancies = await response.json();
                console.log('Вакансии из JSON:', exampleVacancies.length);
            } else {
                console.warn('Файл vacancies.json не найден или недоступен');
            }
        } catch (error) {
            console.warn('Ошибка при загрузке vacancies.json:', error);
        }
        
        // Объединяем все вакансии
        const allVacancies = [...localStorageVacancies, ...exampleVacancies];
        console.log('Все вакансии после объединения:', allVacancies.length);

        // Фильтруем только одобренные и добавляем moderationStatus если нет
        this.vacancies = allVacancies
            .map(vacancy => {
                // Добавляем moderationStatus если отсутствует
                if (!vacancy.moderationStatus) {
                    vacancy.moderationStatus = 'approved';
                }
                return vacancy;
            })
            .filter(vacancy => vacancy.moderationStatus === 'approved')
            .map(vacancy => this.adaptVacancyFormat(vacancy));

        // Убираем дубликаты по ID
        this.vacancies = this.removeDuplicateVacancies(this.vacancies);
        
        this.filteredVacancies = [...this.vacancies];
        
        console.log('Финальный список вакансий:', this.vacancies.length);
        if (this.vacancies.length > 0) {
            console.log('Пример первой вакансии:', this.vacancies[0]);
        }
    }

    adaptVacancyFormat(vacancy) {
        return {
            id: vacancy.id || Date.now() + Math.random(),
            title: vacancy.title || 'Без названия',
            company: vacancy.company || 'Компания не указана',
            salary: vacancy.salary ? parseInt(vacancy.salary) : 0,
            region: vacancy.region || this.mapCityToRegion(vacancy.city),
            employment: Array.isArray(vacancy.employment) ? vacancy.employment : (vacancy.employment ? [vacancy.employment] : ['full']),
            profession: vacancy.profession || '',
            description: vacancy.description || 'Описание отсутствует',
            experience: vacancy.experience || 'Не указан',
            created: vacancy.createdAt || vacancy.created || new Date().toISOString(),
            city: vacancy.city,
            requirements: vacancy.requirements,
            responsibilities: vacancy.responsibilities,
            conditions: vacancy.conditions,
            employerId: vacancy.employerId,
            employerName: vacancy.employerName,
            moderationStatus: vacancy.moderationStatus || 'approved'
        };
    }

    removeDuplicateVacancies(vacancies) {
        const unique = [];
        const seenIds = new Set();
        
        vacancies.forEach(vacancy => {
            const vacancyId = vacancy.id;
            if (!seenIds.has(vacancyId)) {
                seenIds.add(vacancyId);
                unique.push(vacancy);
            }
        });
        
        return unique;
    }

    mapCityToRegion(city) {
        if (!city) return 'other';
        const cityLower = city.toLowerCase();
        if (cityLower.includes('москва')) return 'moscow';
        if (cityLower.includes('санкт-петербург') || cityLower.includes('спб') || cityLower.includes('питер')) return 'spb';
        if (cityLower.includes('удален') || cityLower.includes('remote')) return 'remote';
        return 'other';
    }

    setupEventListeners() {
        console.log('Настройка обработчиков событий...');
        
        // Поиск
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        if (searchInput) {
            // Поиск при вводе текста (с небольшой задержкой для производительности)
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch();
                }, 300); // Задержка 300мс
            });
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(searchTimeout);
                    this.handleSearch();
                }
            });
        }

        // Фильтры (только для вакансий, не для резюме)
        if (!this.isEmployer) {
            const filtersToggle = document.getElementById('filtersToggle');
            const mobileFiltersToggle = document.getElementById('mobileFiltersToggle');
            const closeFilters = document.getElementById('closeFilters');
            const resetFilters = document.getElementById('resetFilters');

            if (filtersToggle) filtersToggle.addEventListener('click', () => this.toggleFilters());
            if (mobileFiltersToggle) mobileFiltersToggle.addEventListener('click', () => this.toggleFilters());
            if (closeFilters) closeFilters.addEventListener('click', () => this.toggleFilters());
            if (resetFilters) resetFilters.addEventListener('click', () => this.resetFilters());
        }

        // Отслеживание изменений в фильтрах (применяются автоматически)
        const regionFilter = document.getElementById('regionFilter');
        const salaryMin = document.getElementById('salaryMin');
        const salaryMax = document.getElementById('salaryMax');

        if (regionFilter) regionFilter.addEventListener('change', () => this.applyFilters());
        if (salaryMin) salaryMin.addEventListener('input', () => this.applyFilters());
        if (salaryMax) salaryMax.addEventListener('input', () => this.applyFilters());
        
        const employmentCheckboxes = document.querySelectorAll('input[name="employment"]');
        employmentCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.applyFilters());
        });

        // Загрузка ещё
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadMore());
        }

        // Модальное окно
        document.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        
        const cancelApply = document.getElementById('cancelApply');
        const confirmApply = document.getElementById('confirmApply');
        
        if (cancelApply) cancelApply.addEventListener('click', () => this.closeModal());
        if (confirmApply) confirmApply.addEventListener('click', () => this.submitApplication());

        // Закрытие фильтров по клику вне области
        document.addEventListener('click', (e) => {
            const filtersSidebar = document.getElementById('filtersSidebar');
            const filtersToggle = document.getElementById('filtersToggle');
            const mobileFiltersToggle = document.getElementById('mobileFiltersToggle');
            
            if (filtersSidebar && filtersSidebar.classList.contains('active') && 
                !filtersSidebar.contains(e.target) && 
                e.target !== filtersToggle && 
                e.target !== mobileFiltersToggle &&
                !filtersToggle?.contains(e.target) &&
                !mobileFiltersToggle?.contains(e.target)) {
                this.toggleFilters();
            }
        });

        console.log('Обработчики событий настроены');
    }

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            this.currentFilters.search = searchTerm;
            this.applyFilters();
        }
    }

    toggleFilters() {
        const sidebar = document.getElementById('filtersSidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
            
            // Блокируем скролл body при открытых фильтрах на мобильных
            if (window.innerWidth <= 768) {
                document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
            }
        }
    }

    onFilterChange() {
        this.updateFilterCount();
        this.highlightActiveFilters();
    }

    updateFilterCount() {
        let count = 0;

        // Регион
        const regionFilter = document.getElementById('regionFilter');
        if (regionFilter && regionFilter.value) count++;

        // Зарплата
        const salaryMin = document.getElementById('salaryMin');
        const salaryMax = document.getElementById('salaryMax');
        if ((salaryMin && salaryMin.value) || (salaryMax && salaryMax.value)) count++;

        // Тип занятости (считаем только если выбраны не все)
        const employmentCheckboxes = document.querySelectorAll('input[name="employment"]');
        if (employmentCheckboxes.length > 0) {
            const checkedEmployment = Array.from(employmentCheckboxes).filter(cb => cb.checked);
            if (checkedEmployment.length > 0 && checkedEmployment.length < employmentCheckboxes.length) count++;
        }

        this.activeFiltersCount = count;

        // Обновляем счетчики
        const filterCount = document.getElementById('filterCount');
        const mobileFilterCount = document.getElementById('mobileFilterCount');
        
        if (filterCount) filterCount.textContent = count;
        if (mobileFilterCount) mobileFilterCount.textContent = count;

        // Показываем/скрываем счетчики
        const filterCounts = document.querySelectorAll('.filter-count');
        filterCounts.forEach(el => {
            el.style.display = count > 0 ? 'flex' : 'none';
        });
    }

    highlightActiveFilters() {
        const filterGroups = document.querySelectorAll('.filter-group');
        
        filterGroups.forEach(group => {
            let isActive = false;
            
            if (group.querySelector('select')) {
                const select = group.querySelector('select');
                isActive = select.value !== '';
            } else if (group.querySelector('input[type="number"]')) {
                const min = document.getElementById('salaryMin')?.value || '';
                const max = document.getElementById('salaryMax')?.value || '';
                isActive = min !== '' || max !== '';
            } else if (group.querySelector('input[type="checkbox"]')) {
                const checkboxes = group.querySelectorAll('input[type="checkbox"]');
                const checked = Array.from(checkboxes).filter(cb => cb.checked);
                const allChecked = checkboxes.length === checked.length;
                isActive = !allChecked && checked.length > 0;
            }
            
            group.classList.toggle('active-filter', isActive);
        });
    }

    applyFilters() {
        console.log('Применение фильтров...');
        this.currentVacancyPage = 1; // Сбрасываем на первую страницу при фильтрации

        // Собираем фильтры
        const filters = {
            salaryMin: document.getElementById('salaryMin')?.value ? parseInt(document.getElementById('salaryMin').value) : null,
            salaryMax: document.getElementById('salaryMax')?.value ? parseInt(document.getElementById('salaryMax').value) : null,
            region: document.getElementById('regionFilter')?.value || '',
            employment: Array.from(document.querySelectorAll('input[name="employment"]:checked')).map(cb => cb.value),
            search: document.getElementById('searchInput')?.value.toLowerCase() || ''
        };

        this.currentFilters = filters;
        console.log('Текущие фильтры:', filters);

        // Применяем фильтры
        this.filteredVacancies = this.vacancies.filter(vacancy => {
            // Поиск по тексту (расширенный)
            if (filters.search) {
                const searchLower = filters.search.toLowerCase().trim();
                const searchableText = `${vacancy.title || ''} ${vacancy.company || ''} ${vacancy.description || ''} ${vacancy.city || ''} ${vacancy.profession || ''} ${vacancy.experience || ''}`.toLowerCase();
                if (!searchableText.includes(searchLower)) {
                    return false;
                }
            }

            // Фильтр по зарплате
            if (filters.salaryMin && vacancy.salary < filters.salaryMin) {
                return false;
            }
            if (filters.salaryMax && vacancy.salary > filters.salaryMax) {
                return false;
            }

            // Фильтр по региону
            if (filters.region && vacancy.region !== filters.region) {
                return false;
            }

            // Фильтр по типу занятости
            if (filters.employment.length > 0) {
                const hasMatchingEmployment = filters.employment.some(emp => 
                    vacancy.employment && Array.isArray(vacancy.employment) && vacancy.employment.includes(emp)
                );
                if (!hasMatchingEmployment) {
                    return false;
                }
            }

            return true;
        });

        console.log('После фильтрации осталось вакансий:', this.filteredVacancies.length);

        // Всегда рендерим вакансии после применения фильтров
        this.renderVacancies();
        
        // Закрываем фильтры на мобильных после применения
        if (window.innerWidth <= 768) {
            this.toggleFilters();
        }
    }

    resetFilters() {
        console.log('Сброс фильтров...');
        
        const salaryMin = document.getElementById('salaryMin');
        const salaryMax = document.getElementById('salaryMax');
        const regionFilter = document.getElementById('regionFilter');
        const searchInput = document.getElementById('searchInput');

        if (salaryMin) salaryMin.value = '';
        if (salaryMax) salaryMax.value = '';
        if (regionFilter) regionFilter.value = '';
        if (searchInput) searchInput.value = '';

        document.querySelectorAll('input[name="employment"]').forEach(cb => cb.checked = false);
        document.querySelectorAll('input[name="employment"][value="full"]').forEach(cb => cb.checked = true);

        this.currentFilters = {};
        this.applyFilters();
        this.updateFilterCount();
        this.highlightActiveFilters();
    }

    renderVacancies() {
        console.log('=== RENDER VACANCIES ===');
        console.log('Всего вакансий:', this.vacancies.length);
        console.log('Отфильтрованных вакансий:', this.filteredVacancies.length);
        
        const container = document.getElementById('vacanciesList');
        if (!container) {
            console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Контейнер vacanciesList не найден в DOM!');
            return;
        }
        console.log('Контейнер найден:', container);

        const countElement = document.getElementById('jobsCount');
        if (countElement) {
            countElement.textContent = `Найдено ${this.filteredVacancies.length} вакансий`;
        }

        // Скрываем кнопку "Загрузить ещё" для вакансий (используем пагинацию)
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }

        // Если вакансий нет, показываем сообщение
        if (this.filteredVacancies.length === 0) {
            console.log('Нет вакансий для отображения');
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: #666;">
                    <h3>😔 Вакансии не найдены</h3>
                    <p>Попробуйте изменить параметры поиска или фильтры</p>
                    <button onclick="jobsManager.createTestVacancies(); jobsManager.renderVacancies();" 
                            class="btn btn-primary" style="margin-top: 1rem;">
                        Показать тестовые вакансии
                    </button>
                </div>
            `;
            
            const paginationContainer = document.getElementById('vacanciesPagination');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        // Получаем вакансии для текущей страницы
        const startIndex = (this.currentVacancyPage - 1) * this.vacanciesPerPage;
        const endIndex = startIndex + this.vacanciesPerPage;
        const vacanciesToShow = this.filteredVacancies.slice(startIndex, endIndex);

        console.log('Отображаем вакансии:', vacanciesToShow.length);
        
        // Создаем HTML для вакансий
        let vacanciesHTML = '';
        vacanciesToShow.forEach(vacancy => {
            try {
                vacanciesHTML += this.createVacancyCard(vacancy);
            } catch (error) {
                console.error('Ошибка при создании карточки вакансии:', error, vacancy);
                vacanciesHTML += `<div class="vacancy-card error-card">
                    <h3>Ошибка отображения вакансии</h3>
                    <p>ID: ${String(vacancy.id)}</p>
                </div>`;
            }
        });

        container.innerHTML = vacanciesHTML;
        console.log('HTML добавлен в контейнер');

        // Отображаем пагинацию
        this.renderVacanciesPagination();

        // Добавляем обработчики
        this.attachApplyHandlers();
        console.log('Рендеринг завершен');
    }

    renderVacanciesPagination() {
        const paginationContainer = document.getElementById('vacanciesPagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredVacancies.length / this.vacanciesPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="pagination-info">
                Показано ${(this.currentVacancyPage - 1) * this.vacanciesPerPage + 1} - ${Math.min(this.currentVacancyPage * this.vacanciesPerPage, this.filteredVacancies.length)} из ${this.filteredVacancies.length}
            </div>
            <div class="pagination-controls">
                <div class="pagination-numbers">
        `;

        // Кнопка "Назад"
        paginationHTML += `
            <button class="pagination-btn ${this.currentVacancyPage === 1 ? 'disabled' : ''}" 
                    onclick="jobsManager.goToVacancyPage(${this.currentVacancyPage - 1})" 
                    ${this.currentVacancyPage === 1 ? 'disabled' : ''}>
                ‹
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
            paginationHTML += `<button class="pagination-btn" onclick="jobsManager.goToVacancyPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentVacancyPage ? 'active' : ''}" 
                        onclick="jobsManager.goToVacancyPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="jobsManager.goToVacancyPage(${totalPages})">${totalPages}</button>`;
        }

        // Кнопка "Вперед"
        paginationHTML += `
            <button class="pagination-btn ${this.currentVacancyPage === totalPages ? 'disabled' : ''}" 
                    onclick="jobsManager.goToVacancyPage(${this.currentVacancyPage + 1})" 
                    ${this.currentVacancyPage === totalPages ? 'disabled' : ''}>
                ›
            </button>
        `;

        paginationHTML += `
                </div>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToVacancyPage(page) {
        const totalPages = Math.ceil(this.filteredVacancies.length / this.vacanciesPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentVacancyPage = page;
        this.renderVacancies();
        
        // Прокручиваем к началу списка
        const container = document.getElementById('vacanciesList');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    createVacancyCard(vacancy) {
        const employmentLabels = {
            'full': 'Полная',
            'part': 'Частичная',
            'remote': 'Удалённая',
            'project': 'Проектная'
        };

        const regionLabels = {
            'moscow': 'Москва',
            'spb': 'Санкт-Петербург',
            'remote': 'Удалённо',
            'other': vacancy.city || 'Другие регионы'
        };

        // Форматируем дату
        let formattedDate = 'Не указана';
        try {
            if (vacancy.created) {
                formattedDate = new Date(vacancy.created).toLocaleDateString('ru-RU');
            }
        } catch (e) {
            formattedDate = 'Не указана';
        }

        // Форматируем зарплату
        const salaryDisplay = vacancy.salary && vacancy.salary > 0 
            ? `${vacancy.salary.toLocaleString('ru-RU')} ₽`
            : 'Не указана';

        // Проверяем роль пользователя и наличие отклика
        const user = jobPlatform.getCurrentUser();
        let applyButton = '';
        
        if (user && user.role !== 'employer' && user.status !== 'employer') {
            const applications = JSON.parse(localStorage.getItem('applications_' + user.id) || '[]');
            const hasApplied = applications.some(app => app.vacancyId === vacancy.id);
            
            if (hasApplied) {
                applyButton = '<button class="btn btn-secondary" disabled>Уже откликнулись</button>';
            } else {
                applyButton = `<button class="btn btn-primary btn-apply" data-id="${vacancy.id}">Откликнуться</button>`;
            }
        }

        return `
            <div class="vacancy-card" data-id="${vacancy.id}">
                <div class="vacancy-header">
                    <div>
                        <h3 class="vacancy-title">${this.escapeHtml(vacancy.title)}</h3>
                        <div class="vacancy-company">${this.escapeHtml(vacancy.company)}</div>
                    </div>
                    <div class="vacancy-salary">${salaryDisplay}</div>
                </div>
                
                <div class="vacancy-info">
                    <div class="vacancy-meta">📍 ${regionLabels[vacancy.region] || this.escapeHtml(vacancy.city) || 'Не указан'}</div>
                    <div class="vacancy-meta">💼 ${this.escapeHtml(vacancy.experience) || 'Не указан'}</div>
                    <div class="vacancy-meta">📅 ${formattedDate}</div>
                </div>
                
                <div class="vacancy-description">
                    ${this.escapeHtml(vacancy.description) || 'Описание отсутствует'}
                </div>
                
                <div class="vacancy-actions">
                    <div class="vacancy-tags">
                        ${vacancy.employment && vacancy.employment.length > 0 
                            ? vacancy.employment.map(emp => 
                                `<span class="vacancy-tag">${employmentLabels[emp] || this.escapeHtml(emp)}</span>`
                              ).join('')
                            : '<span class="vacancy-tag">Не указано</span>'}
                    </div>
                    ${applyButton}
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadMore() {
        this.currentPage++;
        this.renderVacancies();
    }

    attachApplyHandlers() {
        document.querySelectorAll('.btn-apply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const vacancyId = parseInt(e.target.dataset.id);
                this.showApplyModal(vacancyId);
            });
        });
    }

    showApplyModal(vacancyId) {
        const user = jobPlatform.getCurrentUser();
        if (!user) {
            jobPlatform.showNotification('Для отклика на вакансии необходимо авторизоваться', 'error');
            window.location.href = 'auth.html';
            return;
        }

        // Проверяем, что пользователь не работодатель
        if (user.role === 'employer' || user.status === 'employer') {
            jobPlatform.showNotification('Работодатели не могут откликаться на вакансии', 'error');
            return;
        }

        this.selectedVacancy = this.vacancies.find(v => v.id === vacancyId);
        if (!this.selectedVacancy) {
            jobPlatform.showNotification('Вакансия не найдена', 'error');
            return;
        }

        // Проверяем, не откликался ли уже пользователь на эту вакансию
        const applications = JSON.parse(localStorage.getItem('applications_' + user.id) || '[]');
        const existingApplication = applications.find(app => app.vacancyId === vacancyId);
        if (existingApplication) {
            jobPlatform.showNotification('Вы уже откликались на эту вакансию', 'error');
            return;
        }

        // Заполняем информацию о вакансии
        const vacancyPreview = document.getElementById('vacancyPreview');
        if (vacancyPreview) {
            const salaryText = this.selectedVacancy.salary && this.selectedVacancy.salary > 0
                ? `${this.selectedVacancy.salary.toLocaleString('ru-RU')} ₽`
                : 'Не указана';
            vacancyPreview.innerHTML = `
                <h4>${this.escapeHtml(this.selectedVacancy.title)}</h4>
                <p><strong>${this.escapeHtml(this.selectedVacancy.company)}</strong></p>
                <p>${salaryText}</p>
            `;
        }

        // Загружаем резюме пользователя
        this.loadUserResumes();

        // Показываем модальное окно
        const applyModal = document.getElementById('applyModal');
        if (applyModal) {
            applyModal.classList.add('active');
        }
    }

    loadUserResumes() {
        const user = jobPlatform.getCurrentUser();
        const resumes = JSON.parse(localStorage.getItem('resumes_' + user.id) || '[]');
        const select = document.getElementById('resumeSelect');
        const confirmApply = document.getElementById('confirmApply');

        if (!select) return;

        select.innerHTML = '';

        if (resumes.length === 0) {
            select.innerHTML = '<option value="">У вас нет созданных резюме</option>';
            if (confirmApply) {
                confirmApply.disabled = true;
            }
        } else {
            resumes.forEach(resume => {
                const option = document.createElement('option');
                option.value = resume.id;
                option.textContent = resume.title || 'Резюме без названия';
                select.appendChild(option);
            });
            if (confirmApply) {
                confirmApply.disabled = false;
            }
        }
    }

    closeModal() {
        const applyModal = document.getElementById('applyModal');
        if (applyModal) {
            applyModal.classList.remove('active');
        }
        this.selectedVacancy = null;
    }

    async submitApplication() {
        const resumeSelect = document.getElementById('resumeSelect');
        if (!resumeSelect) return;

        const resumeId = parseInt(resumeSelect.value);

        if (!resumeId) {
            jobPlatform.showNotification('Выберите резюме для отправки', 'error');
            return;
        }

        const user = jobPlatform.getCurrentUser();
        if (!user) {
            jobPlatform.showNotification('Пользователь не авторизован', 'error');
            return;
        }
        
        // Проверяем, не откликался ли уже пользователь на эту вакансию
        const applications = JSON.parse(localStorage.getItem('applications_' + user.id) || '[]');
        const existingApplication = applications.find(app => app.vacancyId === this.selectedVacancy.id);
        if (existingApplication) {
            jobPlatform.showNotification('Вы уже откликались на эту вакансию', 'error');
            this.closeModal();
            return;
        }

        const resumes = JSON.parse(localStorage.getItem('resumes_' + user.id) || '[]');
        const selectedResume = resumes.find(r => r.id === resumeId);

        if (!selectedResume) {
            jobPlatform.showNotification('Ошибка при выборе резюме', 'error');
            return;
        }

        // Получаем информацию о работодателе из вакансии
        const allVacancies = JSON.parse(localStorage.getItem('vacancies') || '[]');
        let vacancy = allVacancies.find(v => v.id === this.selectedVacancy.id);
        
        // Если не найдено, загружаем из JSON файла
        if (!vacancy) {
            try {
                const response = await fetch('./vacancies.json');
                if (response.ok) {
                    const exampleVacancies = await response.json();
                    vacancy = exampleVacancies.find(v => v.id === this.selectedVacancy.id);
                }
            } catch (error) {
                console.warn('Не удалось загрузить вакансии из JSON:', error);
            }
        }
        
        const employerId = vacancy ? vacancy.employerId : null;

        // Сохраняем отклик для соискателя
        const application = {
            id: jobPlatform.generateVacancyResumeId(),
            vacancyId: this.selectedVacancy.id,
            vacancyTitle: this.selectedVacancy.title,
            resumeId: resumeId,
            resumeTitle: selectedResume.title,
            appliedAt: new Date().toISOString(),
            status: 'sent',
            applicantId: user.id,
            applicantName: user.fullName,
            employerId: employerId
        };

        applications.push(application);
        localStorage.setItem('applications_' + user.id, JSON.stringify(applications));

        // Сохраняем отклик для работодателя (если есть employerId)
        if (employerId) {
            const employerApplications = JSON.parse(localStorage.getItem('applications_to_employer_' + employerId) || '[]');
            employerApplications.push(application);
            localStorage.setItem('applications_to_employer_' + employerId, JSON.stringify(employerApplications));
        }

        this.closeModal();
        jobPlatform.showNotification('Резюме успешно отправлено!');
        
        // Обновляем отображение вакансий (кнопка "Откликнуться" должна измениться на "Уже откликнулись")
        this.renderVacancies();
    }

    // Методы для работодателей (резюме)
    async loadResumes() {
        console.log('=== ЗАГРУЗКА РЕЗЮМЕ ===');
        
        // Загружаем резюме из localStorage (всех пользователей)
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        let localStorageResumes = [];
        
        users.forEach(user => {
            const userResumes = JSON.parse(localStorage.getItem('resumes_' + user.id) || '[]');
            userResumes.forEach(resume => {
                localStorageResumes.push({
                    ...resume,
                    userId: user.id,
                    userFullName: user.fullName
                });
            });
        });
        
        // Загружаем примеры резюме из JSON файла
        let exampleResumes = [];
        try {
            const response = await fetch('./resumes.json');
            if (response.ok) {
                exampleResumes = await response.json();
                console.log(`Загружено ${exampleResumes.length} примеров резюме из resumes.json`);
            }
        } catch (error) {
            console.warn('Не удалось загрузить примеры резюме из resumes.json:', error);
        }
        
        // Объединяем резюме из localStorage и из JSON файла
        const allResumes = [...localStorageResumes, ...exampleResumes];
        
        // Фильтруем только одобренные резюме и убираем дубликаты по ID
        const uniqueResumes = [];
        const seenIds = new Set();
        
        // Сначала добавляем резюме из localStorage (они имеют приоритет)
        localStorageResumes
            .filter(resume => resume.moderationStatus === 'approved')
            .forEach(resume => {
                if (!seenIds.has(resume.id)) {
                    seenIds.add(resume.id);
                    uniqueResumes.push(resume);
                }
            });
        
        // Затем добавляем примеры из JSON файла (только если их ID еще нет)
        exampleResumes
            .filter(resume => resume.moderationStatus === 'approved')
            .forEach(resume => {
                if (!seenIds.has(resume.id)) {
                    seenIds.add(resume.id);
                    uniqueResumes.push(resume);
                }
            });
        
        this.resumes = uniqueResumes;
        this.filteredResumes = [...this.resumes];
        console.log(`Всего загружено ${this.resumes.length} одобренных резюме`);
    }

    setupResumeEventListeners() {
        console.log('Настройка обработчиков для резюме...');
        
        // Поиск
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleResumeSearch());
        }
        if (searchInput) {
            // Поиск при вводе текста (с небольшой задержкой для производительности)
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleResumeSearch();
                }, 300); // Задержка 300мс
            });
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    clearTimeout(searchTimeout);
                    this.handleResumeSearch();
                }
            });
            searchInput.placeholder = 'Имя, профессия или навыки...';
        }

        // Фильтры для резюме
        const resumeProfessionFilter = document.getElementById('resumeProfessionFilter');
        const resumeSalaryMin = document.getElementById('resumeSalaryMin');
        const resumeSalaryMax = document.getElementById('resumeSalaryMax');
        const resumeExperienceFilter = document.getElementById('resumeExperienceFilter');
        const resumeRegionFilter = document.getElementById('resumeRegionFilter');
        const resumeSkillsFilter = document.getElementById('resumeSkillsFilter');
        const resetFilters = document.getElementById('resetFilters');

        if (resumeProfessionFilter) {
            this.populateProfessionFilter();
            resumeProfessionFilter.addEventListener('change', () => this.applyResumeFilters());
        }
        if (resumeSalaryMin) resumeSalaryMin.addEventListener('input', () => this.applyResumeFilters());
        if (resumeSalaryMax) resumeSalaryMax.addEventListener('input', () => this.applyResumeFilters());
        if (resumeExperienceFilter) resumeExperienceFilter.addEventListener('change', () => this.applyResumeFilters());
        if (resumeRegionFilter) resumeRegionFilter.addEventListener('change', () => this.applyResumeFilters());
        if (resumeSkillsFilter) resumeSkillsFilter.addEventListener('input', () => this.applyResumeFilters());
        if (resetFilters) resetFilters.addEventListener('click', () => this.resetResumeFilters());

        // Обновляем заголовок
        const header = document.querySelector('.jobs-header h1');
        if (header) {
            header.textContent = 'Поиск сотрудников';
        }

        console.log('Обработчики для резюме настроены');
    }

    populateProfessionFilter() {
        const professionFilter = document.getElementById('resumeProfessionFilter');
        if (!professionFilter) return;

        // Собираем уникальные профессии из резюме
        const professions = new Set();
        this.resumes.forEach(resume => {
            // Получаем профессию из должности или title
            let profession = '';
            if (resume.experience && resume.experience.hasExperience && resume.experience.items && resume.experience.items.length > 0) {
                profession = resume.experience.items[0].position;
            } else if (resume.title) {
                // Извлекаем профессию из title (убираем "Резюме" и дату)
                profession = resume.title.replace(/^Резюме /, '').replace(/\s*-\s*\d{2}\.\d{2}\.\d{4}$/, '');
            }
            
            if (profession && profession.trim()) {
                professions.add(profession.trim());
            }
        });

        // Сортируем профессии
        const sortedProfessions = Array.from(professions).sort();

        // Добавляем опции
        sortedProfessions.forEach(profession => {
            const option = document.createElement('option');
            option.value = profession;
            option.textContent = profession;
            professionFilter.appendChild(option);
        });
    }

    resetResumeFilters() {
        document.getElementById('resumeProfessionFilter').value = '';
        document.getElementById('resumeSalaryMin').value = '';
        document.getElementById('resumeSalaryMax').value = '';
        document.getElementById('resumeExperienceFilter').value = '';
        document.getElementById('resumeRegionFilter').value = '';
        document.getElementById('resumeSkillsFilter').value = '';
        document.getElementById('searchInput').value = '';
        this.applyResumeFilters();
    }

    handleResumeSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            this.currentFilters.search = searchTerm;
            this.applyResumeFilters();
        }
    }

    applyResumeFilters() {
        // Сбрасываем на первую страницу при фильтрации
        this.currentResumePage = 1;
        const searchInput = document.getElementById('searchInput');
        const search = searchInput?.value.toLowerCase().trim() || '';
        
        const professionFilter = document.getElementById('resumeProfessionFilter')?.value || '';
        const salaryMin = document.getElementById('resumeSalaryMin')?.value ? parseInt(document.getElementById('resumeSalaryMin').value) : null;
        const salaryMax = document.getElementById('resumeSalaryMax')?.value ? parseInt(document.getElementById('resumeSalaryMax').value) : null;
        const experienceFilter = document.getElementById('resumeExperienceFilter')?.value || '';
        const regionFilter = document.getElementById('resumeRegionFilter')?.value || '';
        const skillsFilter = document.getElementById('resumeSkillsFilter')?.value.toLowerCase().trim() || '';
        
        this.filteredResumes = this.resumes.filter(resume => {
            // Поиск по тексту (расширенный поиск)
            if (search) {
                const fullName = resume.personal?.fullName?.toLowerCase() || '';
                const title = resume.title?.toLowerCase() || '';
                const position = resume.experience?.items?.[0]?.position?.toLowerCase() || '';
                const company = resume.experience?.items?.[0]?.company?.toLowerCase() || '';
                const email = resume.personal?.email?.toLowerCase() || '';
                const phone = resume.personal?.phone?.toLowerCase() || '';
                const skills = resume.skills ? resume.skills.map(s => s.toLowerCase()).join(' ') : '';
                
                const searchableText = `${fullName} ${title} ${position} ${company} ${email} ${phone} ${skills}`;
                
                if (!searchableText.includes(search)) {
                    return false;
                }
            }

            // Фильтр по профессии (сравниваем с должностью или title)
            if (professionFilter) {
                const resumePosition = resume.experience?.items?.[0]?.position || '';
                let resumeProfession = '';
                
                if (resume.title) {
                    resumeProfession = resume.title.replace(/^Резюме /, '').replace(/\s*-\s*\d{2}\.\d{2}\.\d{4}$/, '').trim();
                }
                
                if (resumePosition !== professionFilter && resumeProfession !== professionFilter) {
                    return false;
                }
            }

            // Фильтр по зарплате
            const desiredSalary = resume.desiredSalary ? parseInt(resume.desiredSalary) : 0;
            if (salaryMin !== null && desiredSalary < salaryMin) {
                return false;
            }
            if (salaryMax !== null && desiredSalary > salaryMax) {
                return false;
            }

            // Фильтр по опыту работы
            if (experienceFilter) {
                const hasExperience = resume.experience && resume.experience.hasExperience && 
                                     resume.experience.items && resume.experience.items.length > 0;
                
                if (experienceFilter === 'no' && hasExperience) {
                    return false;
                }
                if (experienceFilter !== 'no' && !hasExperience) {
                    return false;
                }
                
                if (hasExperience && experienceFilter !== 'no') {
                    // Можно добавить более детальную проверку опыта
                    const experienceYears = this.calculateExperienceYears(resume.experience);
                    if (experienceFilter === '1-3' && (experienceYears < 1 || experienceYears > 3)) {
                        return false;
                    }
                    if (experienceFilter === '3-5' && (experienceYears < 3 || experienceYears > 5)) {
                        return false;
                    }
                    if (experienceFilter === '5+' && experienceYears < 5) {
                        return false;
                    }
                }
            }

            // Фильтр по региону
            if (regionFilter) {
                const resumeRegion = this.getResumeRegion(resume);
                if (resumeRegion !== regionFilter) {
                    return false;
                }
            }

            // Фильтр по навыкам
            if (skillsFilter) {
                const requiredSkills = skillsFilter.split(',').map(s => s.trim()).filter(s => s);
                if (requiredSkills.length > 0) {
                    const resumeSkills = (resume.skills || []).map(s => s.toLowerCase());
                    const hasAllSkills = requiredSkills.every(skill => 
                        resumeSkills.some(rs => rs.includes(skill.toLowerCase()))
                    );
                    if (!hasAllSkills) {
                        return false;
                    }
                }
            }

            return true;
        });

        this.renderResumes();
    }

    calculateExperienceYears(experience) {
        if (!experience || !experience.items || experience.items.length === 0) {
            return 0;
        }
        
        // Простая оценка: считаем количество позиций как годы опыта
        // В реальном приложении нужно учитывать даты начала и окончания работы
        return experience.items.length;
    }

    getResumeRegion(resume) {
        const city = resume.personal?.city || resume.city || '';
        const cityLower = city.toLowerCase();
        
        if (cityLower.includes('москва')) return 'moscow';
        if (cityLower.includes('санкт-петербург') || cityLower.includes('спб') || cityLower.includes('питер')) return 'spb';
        if (cityLower.includes('удален') || cityLower.includes('remote')) return 'remote';
        return 'other';
    }

    renderResumes() {
        const container = document.getElementById('vacanciesList');
        if (!container) {
            console.error('Контейнер vacanciesList не найден для резюме');
            return;
        }

        const countElement = document.getElementById('jobsCount');
        if (countElement) {
            countElement.textContent = `Найдено ${this.filteredResumes.length} резюме`;
        }

        // Скрываем кнопку "Загрузить ещё" для резюме
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }

        // Если нет резюме
        if (this.filteredResumes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Резюме не найдены</h3>
                    <p>Попробуйте изменить параметры поиска или фильтры</p>
                </div>
            `;
            const paginationContainer = document.getElementById('resumesPagination');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        // Получаем резюме для текущей страницы
        const startIndex = (this.currentResumePage - 1) * this.resumesPerPage;
        const endIndex = startIndex + this.resumesPerPage;
        const resumesToShow = this.filteredResumes.slice(startIndex, endIndex);

        container.innerHTML = resumesToShow.map(resume => this.createResumeCard(resume)).join('');

        // Отображаем пагинацию
        this.renderResumesPagination();

        // Добавляем обработчики для просмотра резюме
        this.attachViewResumeHandlers();
    }

    renderResumesPagination() {
        const paginationContainer = document.getElementById('resumesPagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.filteredResumes.length / this.resumesPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <div class="pagination-info">
                Показано ${(this.currentResumePage - 1) * this.resumesPerPage + 1} - ${Math.min(this.currentResumePage * this.resumesPerPage, this.filteredResumes.length)} из ${this.filteredResumes.length}
            </div>
            <div class="pagination-controls">
                <div class="pagination-numbers">
        `;

        // Кнопка "Назад"
        paginationHTML += `
            <button class="pagination-btn ${this.currentResumePage === 1 ? 'disabled' : ''}" 
                    onclick="jobsManager.goToResumePage(${this.currentResumePage - 1})" 
                    ${this.currentResumePage === 1 ? 'disabled' : ''}>
                ‹
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
            paginationHTML += `<button class="pagination-btn" onclick="jobsManager.goToResumePage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentResumePage ? 'active' : ''}" 
                        onclick="jobsManager.goToResumePage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="pagination-dots">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn" onclick="jobsManager.goToResumePage(${totalPages})">${totalPages}</button>`;
        }

        // Кнопка "Вперед"
        paginationHTML += `
            <button class="pagination-btn ${this.currentResumePage === totalPages ? 'disabled' : ''}" 
                    onclick="jobsManager.goToResumePage(${this.currentResumePage + 1})" 
                    ${this.currentResumePage === totalPages ? 'disabled' : ''}>
                ›
            </button>
        `;

        paginationHTML += `
                </div>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;
    }

    goToResumePage(page) {
        const totalPages = Math.ceil(this.filteredResumes.length / this.resumesPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentResumePage = page;
        this.renderResumes();
        
        // Прокручиваем к началу списка
        const container = document.getElementById('vacanciesList');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    createResumeCard(resume) {
        const skills = resume.skills && resume.skills.length > 0 
            ? resume.skills.slice(0, 5).map(skill => `<span class="vacancy-tag">${this.escapeHtml(skill)}</span>`).join('')
            : '<span class="vacancy-tag">Навыки не указаны</span>';

        const salaryDisplay = resume.desiredSalary 
            ? `${parseInt(resume.desiredSalary).toLocaleString('ru-RU')} ₽`
            : 'Не указана';

        // Получаем должность из опыта работы
        const position = resume.experience && resume.experience.hasExperience && resume.experience.items && resume.experience.items.length > 0
            ? resume.experience.items[0].position
            : 'Должность не указана';

        // Получаем профессию из title (убираем "Резюме" и дату) или используем должность
        let profession = resume.title || '';
        // Убираем "Резюме" и дату из названия
        if (profession.startsWith('Резюме ')) {
            profession = profession.replace(/^Резюме /, '');
            // Убираем дату в формате " - ДД.ММ.ГГГГ"
            profession = profession.replace(/\s*-\s*\d{2}\.\d{2}\.\d{4}$/, '');
        }
        // Если профессия пустая или равна ФИО, используем должность
        if (!profession || profession === resume.personal?.fullName) {
            profession = position !== 'Должность не указана' ? position : 'Профессия не указана';
        }

        const experienceText = resume.experience && resume.experience.hasExperience && resume.experience.items && resume.experience.items.length > 0
            ? resume.experience.items[0].position + ' в ' + resume.experience.items[0].company
            : 'Без опыта';

        const fullName = resume.personal?.fullName || 'Не указано';
        const email = resume.personal?.email || 'Не указан';
        const phone = resume.personal?.phone || 'Не указан';
        const createdAt = resume.createdAt ? new Date(resume.createdAt).toLocaleDateString('ru-RU') : 'Не указана';

        return `
            <div class="vacancy-card" data-id="${resume.id}">
                <div class="vacancy-header">
                    <div>
                        <h3 class="vacancy-title">${this.escapeHtml(position)}</h3>
                        <div class="vacancy-company">${this.escapeHtml(profession)}</div>
                    </div>
                    <div class="vacancy-salary">${salaryDisplay}</div>
                </div>
                
                <div class="vacancy-info">
                    <div class="vacancy-meta">👤 ${this.escapeHtml(fullName)}</div>
                    <div class="vacancy-meta">📧 ${this.escapeHtml(email)}</div>
                    <div class="vacancy-meta">📞 ${this.escapeHtml(phone)}</div>
                    <div class="vacancy-meta">💼 ${this.escapeHtml(experienceText)}</div>
                    <div class="vacancy-meta">📅 ${createdAt}</div>
                </div>
                
                <div class="vacancy-description">
                    <strong>Навыки:</strong> ${skills}
                </div>
                
                <div class="vacancy-actions">
                    <div class="vacancy-tags">
                        ${skills}
                    </div>
                    <button class="btn btn-primary btn-view-resume" data-id="${resume.id}">Просмотреть резюме</button>
                </div>
            </div>
        `;
    }

    loadMoreResumes() {
        // Эта функция больше не используется для резюме, используется пагинация
        this.currentPage++;
        this.renderResumes();
    }

    attachViewResumeHandlers() {
        document.querySelectorAll('.btn-view-resume').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resumeId = parseInt(e.target.dataset.id);
                this.viewResume(resumeId);
            });
        });
    }

    viewResume(resumeId) {
        const resume = this.resumes.find(r => r.id === resumeId);
        if (!resume) return;

        // Открываем резюме в новом окне или модальном окне
        const userId = resume.userId || resume.userId;
        if (userId) {
            window.location.href = `resume-preview.html?id=${resumeId}&userId=${userId}`;
        } else {
            window.location.href = `resume-preview.html?id=${resumeId}`;
        }
    }
}

// Инициализация при загрузке страницы с улучшенной обработкой ошибок
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM ЗАГРУЖЕН ===');
    console.log('Контейнер vacanciesList:', document.getElementById('vacanciesList'));
    console.log('Контейнер jobsCount:', document.getElementById('jobsCount'));
    
    try {
        // Проверяем, существует ли jobPlatform
        if (typeof jobPlatform === 'undefined') {
            console.error('jobPlatform не определен. Создаем заглушку...');
            // Создаем минимальную заглушку для jobPlatform
            window.jobPlatform = {
                getCurrentUser: function() {
                    try {
                        return JSON.parse(localStorage.getItem('currentUser'));
                    } catch (e) {
                        return null;
                    }
                },
                showNotification: function(message, type = 'success') {
                    console.log(`Notification [${type}]: ${message}`);
                    alert(message);
                }
            };
        }
        
        // Инициализируем JobsManager
        window.jobsManager = new JobsManager();
        
        // Дополнительная проверка через 3 секунды
        setTimeout(() => {
            console.log('=== ПРОВЕРКА ЧЕРЕЗ 3 СЕКУНДЫ ===');
            if (window.jobsManager) {
                console.log('Вакансии:', window.jobsManager.vacancies?.length);
                console.log('Отфильтрованные:', window.jobsManager.filteredVacancies?.length);
                
                if (window.jobsManager.filteredVacancies?.length === 0 && !window.jobsManager.isEmployer) {
                    console.log('Создаем тестовые вакансии принудительно...');
                    window.jobsManager.createTestVacancies();
                    window.jobsManager.renderVacancies();
                }
            } else {
                console.error('JobsManager не инициализирован!');
            }
        }, 3000);
        
    } catch (error) {
        console.error('Критическая ошибка при инициализации JobsManager:', error);
        
        // Показываем сообщение об ошибке пользователю
        const container = document.getElementById('vacanciesList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 3rem; color: #d32f2f;">
                    <h3>😔 Произошла ошибка</h3>
                    <p>Не удалось загрузить вакансии. Пожалуйста, обновите страницу.</p>
                    <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem;">
                        Обновить страницу
                    </button>
                </div>
            `;
        }
    }
});

// Глобальная функция для отладки
window.debugJobsManager = function() {
    console.log('=== DEBUG JobsManager ===');
    console.log('jobsManager:', window.jobsManager);
    if (window.jobsManager) {
        console.log('Вакансии:', window.jobsManager.vacancies);
        console.log('Отфильтрованные:', window.jobsManager.filteredVacancies);
        console.log('isEmployer:', window.jobsManager.isEmployer);
    }
};