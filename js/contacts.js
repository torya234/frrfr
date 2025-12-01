class ContactsManager {
    constructor() {
        this.init();
    }

    init() {
        this.checkAuthButtons();
        this.initMap();
    }

    checkAuthButtons() {
        const user = jobPlatform.getCurrentUser();
        const authBtn = document.getElementById('authBtn');
        const profileBtn = document.getElementById('profileBtn');

        if (user) {
            authBtn.style.display = 'none';
            profileBtn.style.display = 'block';
        }
    }


    initMap() {
        // Проверяем, загружена ли API Яндекс.Карт
        if (typeof ymaps === 'undefined') {
            console.warn('Yandex Maps API not loaded');
            this.showFallbackMap();
            return;
        }

        try {
            ymaps.ready(() => {
                const mapContainer = document.getElementById('map');

                if (!mapContainer) {
                    console.warn('Map container not found');
                    return;
                }

                // Очищаем контейнер
                mapContainer.innerHTML = '';

                // Создаем карту
                const map = new ymaps.Map('map', {
                    center: [55.76, 37.64], // Москва
                    zoom: 14,
                    controls: ['zoomControl', 'fullscreenControl']
                });

                // Добавляем метку
                const placemark = new ymaps.Placemark([55.76, 37.64], {
                    balloonContent: `
                        <strong>JobPlatform</strong><br>
                        г. Москва, ул. Тверская, д. 10<br>
                        Бизнес-центр "Центральный"
                    `
                }, {
                    preset: 'islands#blueBusinessIcon'
                });

                map.geoObjects.add(placemark);

                // Открываем балун при клике на метку
                placemark.balloon.open();

            });
        } catch (error) {
            console.error('Error initializing Yandex Map:', error);
            this.showFallbackMap();
        }
    }

    showFallbackMap() {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="map-fallback">
                    <h4>Наш офис</h4>
                    <p>📍 г. Москва, ул. Тверская, д. 10</p>
                    <p>Бизнес-центр "Центральный"</p>
                    <p>🚇 Ближайшее метро: Тверская, Пушкинская, Чеховская</p>
                    <p>🕐 Пн-Пт: 9:00-18:00</p>
                </div>
            `;
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.contactsManager = new ContactsManager();
});