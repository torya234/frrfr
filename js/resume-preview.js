class ResumePreview {
    constructor() {
        this.currentTemplate = 'basic';
        this.resumeData = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadResume();
        this.setupEventListeners();
    }

    checkAuth() {
        const user = jobPlatform.getCurrentUser();
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        
        // Модератор не может заходить на страницы резюме (кроме просмотра через jobs.html)
        // Но если это просмотр через jobs.html для работодателя, то разрешаем
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        // Если userId указан, значит это просмотр резюме работодателем - разрешаем
        if (!userId && user.status === 'moderator') {
            window.location.href = 'moder.html';
            return;
        }
    }

    async loadResume() {
        const urlParams = new URLSearchParams(window.location.search);
        const resumeId = parseInt(urlParams.get('id'));
        const userId = urlParams.get('userId');

        if (!resumeId) {
            jobPlatform.showNotification('Резюме не найдено', 'error');
            window.location.href = 'profile.html';
            return;
        }

        const currentUser = jobPlatform.getCurrentUser();
        
        // Если указан userId, загружаем резюме этого пользователя (для работодателей)
        if (userId) {
            const resumes = JSON.parse(localStorage.getItem('resumes_' + userId) || '[]');
            this.resumeData = resumes.find(r => r.id === resumeId);
        } else {
            // Иначе загружаем резюме текущего пользователя
            const resumes = JSON.parse(localStorage.getItem('resumes_' + currentUser.id) || '[]');
            this.resumeData = resumes.find(r => r.id === resumeId);
        }

        // Если не найдено в localStorage, пробуем загрузить из JSON
        if (!this.resumeData) {
            try {
                const response = await fetch('resumes.json');
                if (response.ok) {
                    const exampleResumes = await response.json();
                    this.resumeData = exampleResumes.find(r => r.id === resumeId);
                }
            } catch (error) {
                console.warn('Не удалось загрузить резюме из JSON:', error);
            }
        }

        // Если все еще не найдено, ищем во всех пользователях
        if (!this.resumeData) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            for (const user of users) {
                const resumes = JSON.parse(localStorage.getItem('resumes_' + user.id) || '[]');
                const resume = resumes.find(r => r.id === resumeId);
                if (resume) {
                    this.resumeData = resume;
                    break;
                }
            }
        }

        if (!this.resumeData) {
            jobPlatform.showNotification('Резюме не найдено', 'error');
            window.location.href = currentUser && currentUser.role === 'employer' ? 'jobs.html' : 'profile.html';
            return;
        }

        this.renderResume();
    }

    setupEventListeners() {
        // Выбор шаблона
        document.getElementById('templateSelect').addEventListener('change', (e) => {
            this.currentTemplate = e.target.value;
            this.renderResume();
        });

        // Экспорт в PDF
        document.getElementById('exportPdf').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Экспорт в DOCX
        document.getElementById('exportDocx').addEventListener('click', () => {
            this.exportToDOCX();
        });
    }

    renderResume() {
        const container = document.getElementById('resumeOutput');
        container.className = `resume-template ${this.currentTemplate}`;
        container.innerHTML = this.generateResumeHTML();
    }

    generateResumeHTML() {
        const { personal, education, experience, skills, desiredSalary } = this.resumeData;

        return `
            <header class="resume-header">
                <h1>${personal.fullName}</h1>
                <div class="contact-info">
                    <div>📞 ${personal.phone}</div>
                    <div>✉️ ${personal.email}</div>
                    ${personal.address ? `<div>📍 ${personal.address}</div>` : ''}
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
                ${education.map(edu => `
                    <div class="education-item">
                        <h3>${edu.institution}</h3>
                        <p>${edu.specialty}, ${edu.year} год</p>
                    </div>
                `).join('')}
            </section>
            
            ${experience.hasExperience && experience.items.length > 0 ? `
            <section class="resume-section">
                <h2>Опыт работы</h2>
                ${experience.items.map(exp => `
                    <div class="experience-item">
                        <h3>${exp.company}</h3>
                        <p><strong>${exp.position}</strong> | ${exp.period}</p>
                        ${exp.responsibilities ? `<p>${exp.responsibilities}</p>` : ''}
                    </div>
                `).join('')}
            </section>
            ` : ''}
            
            ${skills.length > 0 ? `
            <section class="resume-section">
                <h2>Навыки</h2>
                <div class="skills">
                    ${skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </section>
            ` : ''}
        `;
    }

    async exportToPDF() {
        const element = document.getElementById('resumeOutput');

        try {
            // Показываем индикатор загрузки
            const exportBtn = document.getElementById('exportPdf');
            const originalText = exportBtn.textContent;
            exportBtn.textContent = 'Генерация PDF...';
            exportBtn.disabled = true;

            // Используем html2canvas для создания изображения
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
            const imgWidth = 210;
            const pageHeight = 295;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(`resume_${this.resumeData.personal.fullName}.pdf`);

            jobPlatform.showNotification('PDF успешно скачан');

        } catch (error) {
            console.error('Ошибка при генерации PDF:', error);
            jobPlatform.showNotification('Ошибка при генерации PDF', 'error');
        } finally {
            // Восстанавливаем кнопку
            const exportBtn = document.getElementById('exportPdf');
            exportBtn.textContent = originalText;
            exportBtn.disabled = false;
        }
    }

    exportToDOCX() {
        try {
            // Создаем простой текстовый файл как временное решение
            const content = this.generateTextContent();
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume_${this.resumeData.personal.fullName}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            jobPlatform.showNotification('Файл успешно скачан (временное решение)');

        } catch (error) {
            console.error('Ошибка при генерации DOCX:', error);
            jobPlatform.showNotification('Ошибка при генерации файла', 'error');
        }
    }

    generateTextContent() {
        const { personal, education, experience, skills, desiredSalary } = this.resumeData;

        let content = `Р Е З Ю М Е\n\n`;
        content += `ФИО: ${personal.fullName}\n`;
        content += `Телефон: ${personal.phone}\n`;
        content += `Email: ${personal.email}\n`;
        if (personal.address) content += `Адрес: ${personal.address}\n`;
        content += `\n`;

        if (desiredSalary) {
            content += `Желаемая зарплата: ${parseInt(desiredSalary).toLocaleString('ru-RU')} руб.\n\n`;
        }

        content += `ОБРАЗОВАНИЕ:\n`;
        education.forEach(edu => {
            content += `- ${edu.institution}, ${edu.specialty}, ${edu.year} год\n`;
        });
        content += `\n`;

        if (experience.hasExperience && experience.items.length > 0) {
            content += `ОПЫТ РАБОТЫ:\n`;
            experience.items.forEach(exp => {
                content += `- ${exp.company}, ${exp.position} (${exp.period})\n`;
                if (exp.responsibilities) {
                    content += `  Обязанности: ${exp.responsibilities}\n`;
                }
            });
            content += `\n`;
        }

        if (skills.length > 0) {
            content += `НАВЫКИ:\n`;
            content += skills.map(skill => `- ${skill}`).join('\n');
        }

        return content;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.resumePreview = new ResumePreview();
});