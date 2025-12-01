class ResumeManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.skills = [];
        this.education = [this.createEmptyEducation()];
        this.experience = [this.createEmptyExperience()];
        this.userData = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserData();
        this.setupEventListeners();
        this.updateNavigation();
        this.setupPhoneMask();
        this.fillUserData();
    }

    checkAuth() {
        const user = jobPlatform.getCurrentUser();
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        
        // Модератор не может создавать резюме
        if (user.status === 'moderator') {
            window.location.href = 'moder.html';
            return;
        }
    }

    loadUserData() {
        const user = jobPlatform.getCurrentUser();
        if (user) {
            // Загружаем данные пользователя из localStorage
            this.userData = JSON.parse(localStorage.getItem('userData_' + user.id) || '{}');
            
            // Если в userData нет данных, используем базовые данные пользователя
            if (!this.userData.fullName) {
                this.userData = {
                    fullName: user.fullName || '',
                    phone: user.phone || '',
                    email: user.username + '@example.com',
                    address: ''
                };
            }
        }
    }

    fillUserData() {
        if (this.userData) {
            // Заполняем поля личных данных
            const fullNameInput = document.getElementById('resumeFullName');
            const phoneInput = document.getElementById('resumePhone');
            const emailInput = document.getElementById('resumeEmail');
            const addressInput = document.getElementById('resumeAddress');

            if (fullNameInput && this.userData.fullName) {
                fullNameInput.value = this.userData.fullName;
            }
            
            if (phoneInput && this.userData.phone) {
                phoneInput.value = this.userData.phone;
            }
            
            if (emailInput && this.userData.email) {
                emailInput.value = this.userData.email;
            }
            
            if (addressInput && this.userData.address) {
                addressInput.value = this.userData.address;
            }
        }
    }

    setupEventListeners() {
        // Навигация по шагам
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());

        // Радио-кнопки опыта работы
        document.querySelectorAll('input[name="hasExperience"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleExperienceSection(e.target.value === 'yes');
            });
        });

        // Добавление навыков
        document.getElementById('skillInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addSkill();
            }
        });

        // Отправка формы
        document.getElementById('resumeForm').addEventListener('submit', (e) => this.saveResume(e));

        // Прогресс-бар
        document.querySelectorAll('.progress-step').forEach(step => {
            step.addEventListener('click', (e) => {
                const stepNumber = parseInt(e.target.dataset.step);
                if (stepNumber < this.currentStep) {
                    this.goToStep(stepNumber);
                }
            });
        });

        // Автоматическое обновление предпросмотра при изменении данных
        document.getElementById('resumeForm').addEventListener('input', () => {
            if (this.currentStep === 5) {
                this.generatePreview();
            }
        });
    }

    setupPhoneMask() {
        const phoneInput = document.getElementById('resumePhone');

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

    nextStep() {
        if (!this.validateStep(this.currentStep)) {
            jobPlatform.showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStep();
            this.updateNavigation();

            if (this.currentStep === 5) {
                this.generatePreview();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
            this.updateNavigation();
        }
    }

    goToStep(stepNumber) {
        this.currentStep = stepNumber;
        this.updateStep();
        this.updateNavigation();
        
        if (this.currentStep === 5) {
            this.generatePreview();
        }
    }

    updateStep() {
        // Скрываем все шаги
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        // Показываем текущий шаг
        document.querySelector(`.form-step[data-step="${this.currentStep}"]`).classList.add('active');

        // Обновляем прогресс-бар
        document.querySelectorAll('.progress-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.toggle('active', stepNum === this.currentStep);
            step.classList.toggle('completed', stepNum < this.currentStep);
        });
    }

    updateNavigation() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
        nextBtn.style.display = this.currentStep < this.totalSteps ? 'block' : 'none';
        submitBtn.style.display = this.currentStep === this.totalSteps ? 'block' : 'none';
    }

    validateStep(step) {
        const currentStepElement = document.querySelector(`.form-step[data-step="${step}"]`);
        const requiredInputs = currentStepElement.querySelectorAll('input[required], select[required]');

        for (let input of requiredInputs) {
            if (!input.value.trim()) {
                input.focus();
                return false;
            }

            // Специфическая валидация для email
            if (input.type === 'email' && !jobPlatform.validateEmail(input.value)) {
                jobPlatform.showNotification('Введите корректный email', 'error');
                input.focus();
                return false;
            }

            // Специфическая валидация для телефона
            if (input.type === 'tel' && !jobPlatform.validatePhone(input.value)) {
                jobPlatform.showNotification('Введите корректный номер телефона', 'error');
                input.focus();
                return false;
            }
        }

        // Дополнительная валидация для шага с опытом работы
        if (step === 3) {
            const hasExperience = document.querySelector('input[name="hasExperience"]:checked');
            if (!hasExperience) {
                jobPlatform.showNotification('Выберите, есть ли у вас опыт работы', 'error');
                return false;
            }

            // Если выбран "нет опыта", пропускаем валидацию полей опыта работы
            if (hasExperience.value === 'no') {
                return true;
            }

            // Если выбран "да", проверяем поля опыта работы
            if (hasExperience.value === 'yes') {
                const experienceInputs = document.querySelectorAll('#experienceList input[required]');
                for (let input of experienceInputs) {
                    if (!input.value.trim()) {
                        input.focus();
                        return false;
                    }
                }
            }
        }

        return true;
    }

    // Образование
    addEducation() {
        this.education.push(this.createEmptyEducation());
        this.renderEducationList();
    }

    removeEducation(button) {
        const item = button.closest('.education-item');
        const index = Array.from(item.parentNode.children).indexOf(item);

        if (this.education.length > 1) {
            this.education.splice(index, 1);
            this.renderEducationList();
        } else {
            jobPlatform.showNotification('Должно быть указано хотя бы одно образование', 'error');
        }
    }

    createEmptyEducation() {
        return {
            institution: '',
            specialty: '',
            year: new Date().getFullYear()
        };
    }

    renderEducationList() {
        const container = document.getElementById('educationList');
        container.innerHTML = '';

        this.education.forEach((edu, index) => {
            const eduElement = document.createElement('div');
            eduElement.className = 'education-item';
            eduElement.innerHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>Учебное заведение *</label>
                        <input type="text" name="educationInstitution" value="${edu.institution}" required>
                    </div>
                    <div class="form-group">
                        <label>Специальность *</label>
                        <input type="text" name="educationSpecialty" value="${edu.specialty}" required>
                    </div>
                    <div class="form-group">
                        <label>Год окончания *</label>
                        <input type="number" name="educationYear" value="${edu.year}" min="1950" max="2030" required>
                    </div>
                </div>
                <button type="button" class="btn btn-danger btn-remove" onclick="resumeManager.removeEducation(this)">Удалить</button>
            `;
            container.appendChild(eduElement);
        });
    }

    // Опыт работы
    toggleExperienceSection(show) {
        const section = document.getElementById('experienceSection');
        section.style.display = show ? 'block' : 'none';
        
        // Если скрываем секцию опыта, очищаем обязательность полей
        if (!show) {
            const experienceInputs = section.querySelectorAll('input[required]');
            experienceInputs.forEach(input => {
                input.removeAttribute('required');
            });
        } else {
            // Если показываем секцию опыта, добавляем обязательность полей
            const experienceInputs = section.querySelectorAll('input[name="experienceCompany"], input[name="experiencePosition"], input[name="experiencePeriod"]');
            experienceInputs.forEach(input => {
                input.setAttribute('required', 'required');
            });
        }
    }

    addExperience() {
        this.experience.push(this.createEmptyExperience());
        this.renderExperienceList();
    }

    removeExperience(button) {
        const item = button.closest('.experience-item');
        const index = Array.from(item.parentNode.children).indexOf(item);

        if (this.experience.length > 1) {
            this.experience.splice(index, 1);
            this.renderExperienceList();
        } else {
            jobPlatform.showNotification('Должно быть указано хотя бы одно место работы', 'error');
        }
    }

    createEmptyExperience() {
        return {
            company: '',
            position: '',
            period: '',
            responsibilities: ''
        };
    }

    renderExperienceList() {
        const container = document.getElementById('experienceList');
        container.innerHTML = '';

        this.experience.forEach((exp, index) => {
            const expElement = document.createElement('div');
            expElement.className = 'experience-item';
            expElement.innerHTML = `
                <div class="form-grid">
                    <div class="form-group">
                        <label>Компания *</label>
                        <input type="text" name="experienceCompany" value="${exp.company}" required>
                    </div>
                    <div class="form-group">
                        <label>Должность *</label>
                        <input type="text" name="experiencePosition" value="${exp.position}" required>
                    </div>
                    <div class="form-group">
                        <label>Период работы *</label>
                        <input type="text" name="experiencePeriod" value="${exp.period}" placeholder="Например: 2020-2023" required>
                    </div>
                    <div class="form-group full-width">
                        <label>Обязанности и достижения</label>
                        <textarea name="experienceResponsibilities" rows="3">${exp.responsibilities}</textarea>
                    </div>
                </div>
                <button type="button" class="btn btn-danger btn-remove" onclick="resumeManager.removeExperience(this)">Удалить</button>
            `;
            container.appendChild(expElement);
        });
    }

    // Навыки
    addSkill() {
        const skillInput = document.getElementById('skillInput');
        const skill = skillInput.value.trim();

        if (skill && !this.skills.includes(skill)) {
            this.skills.push(skill);
            this.renderSkillsList();
            skillInput.value = '';
        }
    }

    removeSkill(skill) {
        this.skills = this.skills.filter(s => s !== skill);
        this.renderSkillsList();
    }

    renderSkillsList() {
        const container = document.getElementById('skillsList');
        container.innerHTML = '';

        this.skills.forEach(skill => {
            const skillElement = document.createElement('div');
            skillElement.className = 'skill-tag';
            skillElement.innerHTML = `
                ${skill}
                <button type="button" class="remove" onclick="resumeManager.removeSkill('${skill}')">&times;</button>
            `;
            container.appendChild(skillElement);
        });
    }

    // Предпросмотр
    generatePreview() {
        const container = document.getElementById('resumePreview');

        // Собираем данные из формы
        const formData = new FormData(document.getElementById('resumeForm'));
        const hasExperience = document.querySelector('input[name="hasExperience"]:checked')?.value === 'yes';

        // Обновляем массивы образования и опыта
        this.updateEducationFromForm();
        if (hasExperience) {
            this.updateExperienceFromForm();
        }

        // Генерируем HTML для предпросмотра
        container.innerHTML = this.generateResumeHTML(formData, hasExperience);
    }

    updateEducationFromForm() {
        const educationItems = document.querySelectorAll('.education-item');
        this.education = [];

        educationItems.forEach(item => {
            this.education.push({
                institution: item.querySelector('input[name="educationInstitution"]').value,
                specialty: item.querySelector('input[name="educationSpecialty"]').value,
                year: item.querySelector('input[name="educationYear"]').value
            });
        });
    }

    updateExperienceFromForm() {
        const experienceItems = document.querySelectorAll('.experience-item');
        this.experience = [];

        experienceItems.forEach(item => {
            this.experience.push({
                company: item.querySelector('input[name="experienceCompany"]').value,
                position: item.querySelector('input[name="experiencePosition"]').value,
                period: item.querySelector('input[name="experiencePeriod"]').value,
                responsibilities: item.querySelector('textarea[name="experienceResponsibilities"]').value
            });
        });
    }

    generateResumeHTML(formData, hasExperience) {
        const desiredSalary = formData.get('desiredSalary');

        return `
            <div class="resume-template basic">
                <header class="resume-header">
                    <h1>${formData.get('fullName')}</h1>
                    <div class="contact-info">
                        <div>📞 ${formData.get('phone')}</div>
                        <div>✉️ ${formData.get('email')}</div>
                        ${formData.get('address') ? `<div>📍 ${formData.get('address')}</div>` : ''}
                    </div>
                </header>
                
                ${desiredSalary ? `
                <section class="resume-section">
                    <h2>Желаемая зарплата</h2>
                    <p>${parseInt(desiredSalary).toLocaleString('ru-RU')} руб.</p>
                </section>
                ` : ''}
                
                <section class="resume-section">
                    <h2>Образование</h2>
                    ${this.education.map(edu => `
                        <div class="education-item">
                            <h3>${edu.institution}</h3>
                            <p>${edu.specialty}, ${edu.year} год</p>
                        </div>
                    `).join('')}
                </section>
                
                ${hasExperience ? `
                <section class="resume-section">
                    <h2>Опыт работы</h2>
                    ${this.experience.map(exp => `
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
                
                ${this.skills.length > 0 ? `
                <section class="resume-section">
                    <h2>Навыки</h2>
                    <div class="skills">
                        ${this.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                </section>
                ` : ''}
            </div>
        `;
    }

    async saveResume(e) {
        e.preventDefault();

        if (!this.validateStep(this.currentStep)) {
            jobPlatform.showNotification('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }

        const user = jobPlatform.getCurrentUser();
        const formData = new FormData(document.getElementById('resumeForm'));
        const hasExperience = document.querySelector('input[name="hasExperience"]:checked').value === 'yes';

        // Собираем все данные резюме
        const resumeData = {
            id: jobPlatform.generateVacancyResumeId(),
            title: `Резюме ${formData.get('fullName')} - ${new Date().toLocaleDateString()}`,
            createdAt: new Date().toISOString(),
            personal: {
                fullName: formData.get('fullName'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address')
            },
            education: this.education,
            experience: {
                hasExperience: hasExperience,
                items: hasExperience ? this.experience : [] // Сохраняем опыт только если он есть
            },
            skills: this.skills,
            desiredSalary: formData.get('desiredSalary')
        };

        // Сохраняем в localStorage
        const userId = String(user.id); // Преобразуем ID в строку для надежности
        const resumes = JSON.parse(localStorage.getItem('resumes_' + userId) || '[]');
        resumes.push(resumeData);
        localStorage.setItem('resumes_' + userId, JSON.stringify(resumes));
        
        console.log('Резюме сохранено:', resumeData);
        console.log('Всего резюме у пользователя:', resumes.length);

        jobPlatform.showNotification('Резюме успешно сохранено!');

        // Перенаправляем на страницу предпросмотра
        setTimeout(() => {
            window.location.href = `resume-preview.html?id=${resumeData.id}`;
        }, 1500);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.resumeManager = new ResumeManager();
});