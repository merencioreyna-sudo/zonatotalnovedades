// CONFIGURACIÓN DE GOOGLE SHEETS
const GOOGLE_SHEETS_ID = '1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ';
const SHEET_ID = '1201067322';
const GOOGLE_SHEETS_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_ID}`;

// Variables globales
let news = [];
let categories = [];
let filteredNews = [];
let currentCategory = 'todas';
let searchQuery = '';
let newsPerPage = 6;
let currentPage = 1;

// =============== INICIALIZACIÓN ===============
document.addEventListener('DOMContentLoaded', function() {
    console.log('Zona Total Noticias - Iniciando...');
    
    // Inicializar componentes
    initNavigation();
    initSearch();
    initModal();
    initAdmin();
    
    // Cargar noticias desde Google Sheets
    loadNewsFromGoogleSheets();
});

function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            filterNews();
            renderNews();
        });
    }
    
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadNewsFromGoogleSheets);
    }
}

function initModal() {
    const modalClose = document.getElementById('modal-close');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const newsModal = document.getElementById('news-modal');
    
    if (modalClose) modalClose.addEventListener('click', closeNewsModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeNewsModal);
    
    if (newsModal) {
        newsModal.addEventListener('click', (e) => {
            if (e.target === newsModal) closeNewsModal();
        });
    }
    
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', shareNews);
    }
}

// =============== CARGAR NOTICIAS DESDE GOOGLE SHEETS ===============
async function loadNewsFromGoogleSheets() {
    showLoading(true);
    
    try {
        // Usar proxy para evitar problemas CORS
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const response = await fetch(proxyUrl + GOOGLE_SHEETS_URL);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        parseNewsFromCSV(csvText);
        
    } catch (error) {
        console.error('Error cargando Google Sheets:', error);
        showError('No se pudieron cargar las noticias. Verifica la conexión o el enlace de Google Sheets.');
    }
}

function parseNewsFromCSV(csvText) {
    try {
        // Parsear CSV
        const rows = csvText.split('\n').filter(row => row.trim() !== '');
        
        if (rows.length <= 1) {
            showError('No hay noticias en el Google Sheets. Agrega noticias primero.');
            return;
        }
        
        // Obtener encabezados (primera fila)
        const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        // Parsear cada fila de noticias
        news = [];
        categories = new Set();
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const values = parseCSVRow(row);
            
            if (values.length >= headers.length) {
                const newsItem = {};
                
                // Mapear valores a propiedades según encabezados
                headers.forEach((header, index) => {
                    if (values[index]) {
                        // Limpiar el valor
                        let value = values[index].trim().replace(/"/g, '');
                        
                        // Asignar según el nombre de la columna esperado
                        switch(header.toLowerCase()) {
                            case 'id':
                            case 'numero':
                                newsItem.id = parseInt(value) || i;
                                break;
                            case 'titulo':
                            case 'title':
                                newsItem.title = value;
                                break;
                            case 'contenido':
                            case 'content':
                            case 'descripcion':
                                newsItem.content = value;
                                break;
                            case 'categoria':
                            case 'category':
                                newsItem.category = value;
                                categories.add(value);
                                break;
                            case 'fecha':
                            case 'date':
                                newsItem.date = value;
                                break;
                            case 'autor':
                            case 'author':
                                newsItem.author = value || 'Redacción Zona Total';
                                break;
                            case 'imagen':
                            case 'image':
                            case 'url':
                                newsItem.image = value || getDefaultImage(newsItem.category);
                                break;
                            case 'resumen':
                            case 'excerpt':
                                newsItem.excerpt = value || generateExcerpt(newsItem.content, 150);
                                break;
                            case 'activo':
                            case 'active':
                                newsItem.active = value.toLowerCase() !== 'false';
                                break;
                        }
                    }
                });
                
                // Asegurar que tenemos los campos mínimos
                if (!newsItem.id) newsItem.id = i;
                if (!newsItem.title) newsItem.title = `Noticia ${i}`;
                if (!newsItem.content) newsItem.content = 'Contenido no disponible.';
                if (!newsItem.category) newsItem.category = 'General';
                if (!newsItem.date) newsItem.date = new Date().toLocaleDateString('es-ES');
                if (!newsItem.author) newsItem.author = 'Redacción Zona Total';
                if (!newsItem.image) newsItem.image = getDefaultImage(newsItem.category);
                if (!newsItem.excerpt) newsItem.excerpt = generateExcerpt(newsItem.content, 150);
                if (newsItem.active === undefined) newsItem.active = true;
                
                if (newsItem.active) {
                    news.push(newsItem);
                }
            }
        }
        
        console.log(`Cargadas ${news.length} noticias de Google Sheets`);
        
        // Ordenar por fecha (más reciente primero)
        news.sort((a, b) => {
            try {
                const dateA = new Date(a.date.split('/').reverse().join('-'));
                const dateB = new Date(b.date.split('/').reverse().join('-'));
                return dateB - dateA;
            } catch {
                return 0;
            }
        });
        
        // Actualizar la interfaz
        updateCategories();
        filterNews();
        renderNews();
        renderCategories();
        updateNewsCount();
        updateAdminStats();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error parseando CSV:', error);
        showError('Error procesando los datos de Google Sheets. Verifica el formato.');
    }
}

function parseCSVRow(row) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                // Comilla doble escapada
                currentValue += '"';
                i++; // Saltar la siguiente comilla
            } else {
                // Comilla simple
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            // Fin del valor
            values.push(currentValue);
            currentValue = '';
        } else {
            currentValue += char;
        }
    }
    
    // Añadir el último valor
    values.push(currentValue);
    
    return values;
}

function getDefaultImage(category) {
    const categoryImages = {
        'Política': 'https://images.unsplash.com/photo-1551135049-8a33b2fb2f7f?w=800&q=80',
        'Deportes': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w-800&q-80',
        'Economía': 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w-800&q-80',
        'Tecnología': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w-800&q-80',
        'Entretenimiento': 'https://images.unsplash.com/photo-1492684223066-dd23140edf6d?w-800&q-80',
        'Salud': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w-800&q-80'
    };
    
    return categoryImages[category] || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&q=80';
}

function generateExcerpt(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength) + '...';
}

// =============== RENDERIZAR INTERFAZ ===============
function updateCategories() {
    categories = Array.from(categories).sort();
    
    const filterButtons = document.getElementById('filter-buttons');
    if (filterButtons) {
        // Mantener el botón "Todas"
        const existingButtons = filterButtons.querySelectorAll('.filter-btn');
        existingButtons.forEach(btn => {
            if (btn.dataset.category !== 'todas') {
                btn.remove();
            }
        });
        
        // Agregar botones para cada categoría
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.textContent = category;
            button.dataset.category = category.toLowerCase().replace(/ /g, '-');
            
            button.addEventListener('click', () => {
                currentCategory = category;
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                currentPage = 1;
                filterNews();
                renderNews();
            });
            
            filterButtons.appendChild(button);
        });
    }
}

function filterNews() {
    filteredNews = news.filter(item => {
        // Filtrar por categoría
        if (currentCategory !== 'todas' && item.category !== currentCategory) {
            return false;
        }
        
        // Filtrar por búsqueda
        if (searchQuery) {
            const searchText = (item.title + ' ' + item.content + ' ' + item.category).toLowerCase();
            return searchText.includes(searchQuery);
        }
        
        return true;
    });
}

function renderNews() {
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) return;
    
    // Calcular noticias para esta página
    const startIndex = (currentPage - 1) * newsPerPage;
    const endIndex = startIndex + newsPerPage;
    const newsToShow = filteredNews.slice(startIndex, endIndex);
    
    // Si no hay noticias
    if (filteredNews.length === 0) {
        newsGrid.innerHTML = `
            <div class="no-news">
                <i class="fas fa-newspaper"></i>
                <h3>No se encontraron noticias</h3>
                <p>${searchQuery ? 'Prueba con otros términos de búsqueda.' : 'No hay noticias disponibles en esta categoría.'}</p>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary">Limpiar búsqueda</button>' : 
                    ''
                }
            </div>
        `;
        
        document.getElementById('load-more-btn').style.display = 'none';
        return;
    }
    
    // Renderizar noticias
    newsGrid.innerHTML = '';
    
    newsToShow.forEach(newsItem => {
        const newsCard = createNewsCard(newsItem);
        newsGrid.appendChild(newsCard);
    });
    
    // Mostrar/ocultar botón "Cargar más"
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
        if (endIndex < filteredNews.length) {
            loadMoreBtn.style.display = 'inline-block';
            loadMoreBtn.onclick = loadMoreNews;
        } else {
            loadMoreBtn.style.display = 'none';
        }
    }
    
    updateNewsCount();
}

function createNewsCard(newsItem) {
    const newsCard = document.createElement('div');
    newsCard.className = 'news-card';
    
    newsCard.innerHTML = `
        <div class="news-image">
            <img src="${newsItem.image}" alt="${newsItem.title}" 
                 onerror="this.src='https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&q=80'">
            <div class="news-category">${newsItem.category}</div>
        </div>
        <div class="news-content">
            <div class="news-header">
                <h3 class="news-title">${newsItem.title}</h3>
                <div class="news-date">${newsItem.date}</div>
            </div>
            <p class="news-excerpt">${newsItem.excerpt}</p>
            <div class="news-meta">
                <div class="news-author">
                    <i class="fas fa-user"></i>
                    <span>${newsItem.author}</span>
                </div>
            </div>
            <div class="news-actions">
                <button class="btn btn-primary read-more-btn" data-id="${newsItem.id}">
                    <i class="fas fa-readme"></i> Leer más
                </button>
            </div>
        </div>
    `;
    
    // Evento para abrir el modal
    newsCard.querySelector('.read-more-btn').addEventListener('click', () => {
        openNewsModal(newsItem);
    });
    
    return newsCard;
}

function renderCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    if (!categoriesGrid) return;
    
    categoriesGrid.innerHTML = '';
    
    // Contar noticias por categoría
    const categoryCounts = {};
    news.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });
    
    // Renderizar cada categoría
    Object.entries(categoryCounts).forEach(([category, count]) => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.dataset.category = category;
        
        // Icono según categoría
        let iconClass = 'fas fa-newspaper';
        if (category.includes('Política')) iconClass = 'fas fa-landmark';
        if (category.includes('Deportes')) iconClass = 'fas fa-futbol';
        if (category.includes('Economía')) iconClass = 'fas fa-chart-line';
        if (category.includes('Tecnología')) iconClass = 'fas fa-laptop-code';
        if (category.includes('Entretenimiento')) iconClass = 'fas fa-film';
        if (category.includes('Salud')) iconClass = 'fas fa-heartbeat';
        
        categoryCard.innerHTML = `
            <div class="category-icon">
                <i class="${iconClass}"></i>
            </div>
            <h3>${category}</h3>
            <div class="category-count">${count} noticias</div>
        `;
        
        categoryCard.addEventListener('click', () => {
            currentCategory = category;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent === category) {
                    btn.classList.add('active');
                }
            });
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                if (btn.textContent === 'Todas') {
                    btn.classList.remove('active');
                }
            });
            
            currentPage = 1;
            filterNews();
            renderNews();
            
            // Scroll a noticias
            document.getElementById('news').scrollIntoView({ behavior: 'smooth' });
        });
        
        categoriesGrid.appendChild(categoryCard);
    });
}

function updateNewsCount() {
    const totalNewsElement = document.getElementById('total-news');
    if (totalNewsElement) {
        totalNewsElement.textContent = news.length;
    }
}

// =============== MODAL DE NOTICIAS ===============
function openNewsModal(newsItem) {
    const newsModal = document.getElementById('news-modal');
    const modalNewsTitle = document.getElementById('modal-news-title');
    const modalNewsContent = document.getElementById('modal-news-content');
    
    if (!newsModal || !modalNewsTitle || !modalNewsContent) return;
    
    modalNewsTitle.textContent = newsItem.title;
    
    modalNewsContent.innerHTML = `
        <div class="modal-news-content">
            <div class="modal-meta">
                <div class="modal-category">${newsItem.category}</div>
                <div><i class="fas fa-calendar"></i> ${newsItem.date}</div>
                <div><i class="fas fa-user"></i> ${newsItem.author}</div>
            </div>
            
            ${newsItem.image ? `
                <div class="modal-image">
                    <img src="${newsItem.image}" alt="${newsItem.title}"
                         onerror="this.style.display='none'">
                </div>
            ` : ''}
            
            <div class="modal-body">
                ${newsItem.content.split('\n').map(paragraph => 
                    `<p>${paragraph}</p>`
                ).join('')}
            </div>
        </div>
    `;
    
    newsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Guardar noticia actual para compartir
    window.currentNewsItem = newsItem;
}

function closeNewsModal() {
    const newsModal = document.getElementById('news-modal');
    if (newsModal) {
        newsModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function shareNews() {
    if (!window.currentNewsItem) return;
    
    const newsItem = window.currentNewsItem;
    const shareText = `Lee "${newsItem.title}" en Zona Total Noticias`;
    const shareUrl = window.location.href;
    
    if (navigator.share) {
        navigator.share({
            title: newsItem.title,
            text: shareText,
            url: shareUrl
        });
    } else {
        // Fallback para navegadores que no soportan Web Share API
        navigator.clipboard.writeText(`${shareText}: ${shareUrl}`);
        alert('Enlace copiado al portapapeles');
    }
}

// =============== FUNCIONALIDADES ADICIONALES ===============
function loadMoreNews() {
    currentPage++;
    renderNews();
    
    // Scroll suave a las nuevas noticias
    const newsGrid = document.getElementById('news-grid');
    if (newsGrid && newsGrid.lastElementChild) {
        newsGrid.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function clearSearch() {
    searchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    currentCategory = 'todas';
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === 'todas') {
            btn.classList.add('active');
        }
    });
    
    filterNews();
    renderNews();
}

// =============== ADMIN ===============
function initAdmin() {
    // Botón Admin
    const adminAccessBtn = document.getElementById('admin-access-btn');
    if (adminAccessBtn) {
        adminAccessBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('admin-overlay').style.display = 'flex';
            document.body.style.overflow = 'hidden';
            updateAdminStats();
        });
    }
    
    // Login
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            
            if (username === 'admin' && password === 'admin123') {
                document.getElementById('admin-login').style.display = 'none';
                document.getElementById('admin-panel').style.display = 'block';
                renderAdminNewsList();
            } else {
                alert('Credenciales: admin / admin123');
            }
        });
    }
    
    // Cancelar login
    const cancelLoginBtn = document.getElementById('cancel-login-btn');
    if (cancelLoginBtn) {
        cancelLoginBtn.addEventListener('click', () => {
            closeAdminPanel();
        });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            document.getElementById('admin-login').style.display = 'block';
            document.getElementById('admin-panel').style.display = 'none';
            closeAdminPanel();
        });
    }
    
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Actualizar noticias
    const refreshBtn = document.getElementById('refresh-news-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadNewsFromGoogleSheets();
            alert('Noticias actualizadas desde Google Sheets');
        });
    }
}

function renderAdminNewsList() {
    const adminNewsList = document.getElementById('admin-news-list');
    const newsCount = document.getElementById('news-count');
    
    if (!adminNewsList) return;
    
    // Mostrar últimas 10 noticias
    const recentNews = news.slice(0, 10);
    
    adminNewsList.innerHTML = '';
    
    if (recentNews.length === 0) {
        adminNewsList.innerHTML = '<p class="no-news-admin">No hay noticias disponibles.</p>';
        if (newsCount) newsCount.textContent = '0 noticias';
        return;
    }
    
    if (newsCount) {
        newsCount.textContent = `${news.length} noticias`;
    }
    
    recentNews.forEach(newsItem => {
        const newsElement = document.createElement('div');
        newsElement.className = 'admin-news-item';
        
        newsElement.innerHTML = `
            <div class="admin-news-header">
                <div class="admin-news-title">${newsItem.title}</div>
                <div class="admin-news-date">${newsItem.date}</div>
            </div>
            <div class="admin-news-category">${newsItem.category}</div>
            <div class="admin-news-excerpt">${newsItem.excerpt}</div>
        `;
        
        adminNewsList.appendChild(newsElement);
    });
}

function updateAdminStats() {
    const totalNewsElement = document.getElementById('admin-total-news');
    const totalCategoriesElement = document.getElementById('admin-total-categories');
    const lastUpdateElement = document.getElementById('last-update');
    
    if (totalNewsElement) {
        totalNewsElement.textContent = news.length;
    }
    
    if (totalCategoriesElement) {
        totalCategoriesElement.textContent = categories.length;
    }
    
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleTimeString('es-ES');
    }
}

function closeAdminPanel() {
    document.getElementById('admin-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// =============== UTILIDADES ===============
function showLoading(show) {
    const loadingElement = document.getElementById('loading-news');
    const errorElement = document.getElementById('error-news');
    
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }
    
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function showError(message) {
    const loadingElement = document.getElementById('loading-news');
    const errorElement = document.getElementById('error-news');
    const errorMessage = document.getElementById('error-message');
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    if (errorElement && errorMessage) {
        errorMessage.textContent = message;
        errorElement.style.display = 'block';
    }
}

// =============== FUNCIONES GLOBALES ===============
window.clearSearch = clearSearch;
window.openNewsModal = openNewsModal;
window.closeNewsModal = closeNewsModal;
window.loadNewsFromGoogleSheets = loadNewsFromGoogleSheets;
