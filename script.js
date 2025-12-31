// =============== CONFIGURACIÓN ===============
let GOOGLE_SHEETS_ID = '1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ'; // TU ID REAL
const SHEET_NAME = 'Noticias';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80';

// Variables globales
let news = [];
let currentCategory = "todos";
let searchQuery = "";

// =============== INICIALIZACIÓN ===============
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cargando noticias desde Google Sheets...');
    loadNewsFromGoogleSheets();
    setupMobileMenu();
    setupFiltersAndSearch();
    setupModal();
    setupCategories();
    setupStateButtons();
    setupAdmin();
});

// =============== GOOGLE SHEETS - CARGAR SOLO NOTICIAS REALES ===============
async function loadNewsFromGoogleSheets() {
    try {
        console.log('📥 Conectando a Google Sheets...');
        
        // Mostrar estado de carga
        document.getElementById('loading-recipes').style.display = 'flex';
        document.getElementById('error-recipes').style.display = 'none';
        
        // URL de tu Google Sheets
        const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
        
        console.log('URL:', sheetsUrl);
        
        // Hacer la petición
        const response = await fetch(sheetsUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV recibido, procesando...');
        
        // LIMPIAR ARRAY DE NOTICIAS VIEJAS
        news = [];
        
        // Parsear CSV línea por línea - SIMPLE Y DIRECTO
        const lines = csvText.split('\n');
        
        // Procesar desde la segunda línea (omitir encabezados)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Saltar líneas vacías
            if (!line || line === '' || line === ',,,,,,,,,') {
                continue;
            }
            
            // Separar por comas
            const values = line.split(',');
            
            // Asegurar que tenemos suficientes columnas
            if (values.length >= 9) {
                const title = cleanValue(values[0]);
                const description = cleanValue(values[1]);
                const category = cleanValue(values[2]);
                const country = cleanValue(values[3]);
                const date = cleanValue(values[4]);
                const priority = cleanValue(values[5]);
                const image = cleanValue(values[6]) || DEFAULT_IMAGE;
                const content = cleanValue(values[7]);
                const source = cleanValue(values[8]);
                const embed = values[9] ? cleanValue(values[9]) : '';
                
                // Solo agregar si tiene título
                if (title && title !== '' && title !== 'null') {
                    const newsItem = {
                        id: news.length + 1,
                        title: title,
                        description: description || 'Sin descripción',
                        category: category || 'Nacional',
                        country: country || 'No especificado',
                        date: date || new Date().toISOString().split('T')[0],
                        priority: priority || 'Media',
                        image: image,
                        content: content || 'Contenido no disponible',
                        source: source || 'Fuente no disponible',
                        embedCode: embed || ''
                    };
                    
                    news.push(newsItem);
                    console.log(`✅ Cargada: ${title.substring(0, 50)}...`);
                }
            }
        }
        
        console.log(`✅ ${news.length} noticias REALES cargadas`);
        
        // Actualizar contadores y mostrar
        updateNewsCounts();
        renderNews();
        
        // Ocultar carga
        document.getElementById('loading-recipes').style.display = 'none';
        
        // Actualizar estado en admin
        updateSyncStatus(true, news.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        document.getElementById('loading-recipes').style.display = 'none';
        document.getElementById('error-recipes').style.display = 'flex';
        document.getElementById('error-message').textContent = 
            `Error: ${error.message}`;
        
        updateSyncStatus(false, 0);
    }
}

// Función simple para limpiar valores
function cleanValue(value) {
    if (!value) return '';
    return value.trim().replace(/^"+|"+$/g, '');
}

function updateSyncStatus(success, count) {
    const statusElement = document.getElementById('sync-status');
    const countElement = document.getElementById('loaded-news-count');
    const timeElement = document.getElementById('last-sync-time');
    
    if (statusElement) {
        statusElement.textContent = success ? '✅ Conectado' : '❌ Error';
        statusElement.style.color = success ? '#28a745' : '#dc3545';
    }
    
    if (countElement) {
        countElement.textContent = count;
    }
    
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = now.toLocaleTimeString('es-ES');
    }
}

// =============== ACTUALIZAR CONTADORES - CORREGIDO ===============
function updateNewsCounts() {
    console.log('🔄 Actualizando contadores con', news.length, 'noticias');
    
    // 1. ACTUALIZAR CONTADOR TOTAL
    const totalElement = document.getElementById('total-news');
    if (totalElement) {
        totalElement.textContent = news.length;
        console.log('Noticias disponibles:', news.length);
    }
    
    // 2. INICIALIZAR TODOS LOS CONTADORES EN 0
    const categoryCounts = {
        'nacional': 0,
        'internacional': 0,
        'economia': 0,
        'tecnologia': 0,
        'deportes': 0,
        'cultura': 0,
        'celebridades': 0
    };
    
    // 3. CONTAR NOTICIAS POR CATEGORÍA - SISTEMA SIMPLE
    news.forEach(item => {
        const cat = normalizeCategory(item.category);
        
        // Contar por coincidencia exacta o parcial
        if (cat.includes('nacional')) categoryCounts.nacional++;
        else if (cat.includes('internacional')) categoryCounts.internacional++;
        else if (cat.includes('econom')) categoryCounts.economia++;
        else if (cat.includes('tecnolog')) categoryCounts.tecnologia++;
        else if (cat.includes('deporte')) categoryCounts.deportes++;
        else if (cat.includes('cultur')) categoryCounts.cultura++;
        else if (cat.includes('celebridad')) categoryCounts.celebridades++;
        else {
            // Si no coincide, asignar a Nacional por defecto
            categoryCounts.nacional++;
        }
    });
    
    // 4. ACTUALIZAR ELEMENTOS HTML - MISMOS NÚMEROS
    Object.keys(categoryCounts).forEach(cat => {
        const element = document.getElementById(`count-${cat}`);
        if (element) {
            const count = categoryCounts[cat];
            element.textContent = `${count} noticia${count !== 1 ? 's' : ''}`;
            console.log(`Categoría ${cat}: ${count}`);
        }
    });
}

function normalizeCategory(category) {
    if (!category) return '';
    return category.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// =============== RENDERIZAR NOTICIAS ===============
function renderNews() {
    const newsGrid = document.getElementById('recipes-grid');
    if (!newsGrid) return;
    
    newsGrid.innerHTML = '';
    
    // Filtrar noticias
    let filteredNews = [...news];
    
    if (currentCategory !== 'todos') {
        filteredNews = news.filter(n => {
            const cat = normalizeCategory(n.category);
            return cat.includes(currentCategory);
        });
    }
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredNews = filteredNews.filter(n => {
            const searchText = (n.title + ' ' + n.description + ' ' + n.category).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    // Si no hay noticias
    if (filteredNews.length === 0) {
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-newspaper" style="font-size: 4rem; color: #6c757d; opacity: 0.5;"></i>
                <p style="color: var(--text-gray); margin-top: 20px;">
                    ${searchQuery ? 'No hay resultados' : 'No hay noticias'}
                </p>
            </div>
        `;
        return;
    }
    
    // Mostrar noticias
    filteredNews.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const priorityClass = item.priority ? item.priority.toLowerCase() : 'media';
        const formattedDate = formatDate(item.date);
        
        card.innerHTML = `
            <div class="recipe-image">
                <img src="${item.image}" alt="${item.title}" 
                     onerror="this.src='${DEFAULT_IMAGE}'">
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.8rem;">
                    ${item.priority || 'Media'}
                </div>
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h3 class="recipe-title">${item.title}</h3>
                    <span class="recipe-difficulty ${priorityClass}">${item.country}</span>
                </div>
                <p class="recipe-description">${item.description || 'Sin descripción'}</p>
                <div class="recipe-meta">
                    <span class="recipe-category">${item.category}</span>
                    <span class="recipe-time"><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
                </div>
                <div class="recipe-actions">
                    <button class="view-recipe-btn" onclick="openNewsModal(${item.id})">
                        <i class="fas fa-book-open"></i> Leer Noticia
                    </button>
                </div>
            </div>
        `;
        newsGrid.appendChild(card);
    });
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Sin fecha';
        }
        return date.toLocaleDateString('es-ES');
    } catch (error) {
        return dateString || 'Sin fecha';
    }
}

// =============== MODAL - MOSTRAR TODO EL CONTENIDO ORGANIZADO ===============
function openNewsModal(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;
    
    const modal = document.getElementById('recipe-modal');
    const title = document.getElementById('modal-recipe-title');
    const content = document.getElementById('modal-recipe-content');
    
    if (!modal || !title || !content) return;
    
    title.textContent = item.title;
    
    const formattedDate = formatDate(item.date);
    const priorityClass = item.priority ? item.priority.toLowerCase() : 'media';
    
    // CONTENIDO COMPLETO Y ORGANIZADO
    let modalContent = `
        <div style="margin-bottom: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${item.image}" alt="${item.title}" 
                     onerror="this.src='${DEFAULT_IMAGE}'"
                     style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: cover; margin-bottom: 15px;">
                <p style="color: #666; font-size: 1.1rem; font-style: italic;">
                    ${item.description || ''}
                </p>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                    <div>
                        <div style="color: #666; font-size: 0.85rem; margin-bottom: 5px;">Categoría</div>
                        <div style="font-weight: 600; color: var(--primary-blue);">${item.category}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.85rem; margin-bottom: 5px;">País</div>
                        <div style="font-weight: 600;">${item.country}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.85rem; margin-bottom: 5px;">Fecha</div>
                        <div style="font-weight: 600;">${formattedDate}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.85rem; margin-bottom: 5px;">Prioridad</div>
                        <div style="font-weight: 600;">
                            <span class="recipe-difficulty ${priorityClass}">${item.priority || 'Media'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- CONTENIDO COMPLETO -->
        <div style="margin-bottom: 25px;">
            <h4 style="color: var(--primary-dark); margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid var(--border-color);">
                Contenido Completo
            </h4>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); 
                        line-height: 1.6; font-size: 1rem; white-space: pre-line;">
                ${item.content || 'Contenido no disponible'}
            </div>
        </div>
        
        <!-- INFORMACIÓN ADICIONAL -->
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid var(--accent-red);">
            <div style="color: #666; font-size: 0.9rem;">
                <p><strong>Fuente:</strong> ${item.source || 'No especificada'}</p>
                <p><strong>Publicación:</strong> ${formattedDate}</p>
                ${item.embedCode ? '<p><strong>Contenido adicional:</strong> Disponible</p>' : ''}
            </div>
        </div>
    `;
    
    content.innerHTML = modalContent;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// =============== FUNCIONES DE SETUP (sin cambios) ===============
function setupMobileMenu() {
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

function setupFiltersAndSearch() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            renderNews();
        });
    });
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderNews();
        });
    }
}

function setupModal() {
    const modalClose = document.getElementById('modal-close');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const recipeModal = document.getElementById('recipe-modal');
    
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
    if (recipeModal) {
        recipeModal.addEventListener('click', (e) => {
            if (e.target === recipeModal) closeModal();
        });
    }
}

function setupCategories() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.dataset.category;
            currentCategory = category;
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                }
            });
            
            document.getElementById('news').scrollIntoView({ behavior: 'smooth' });
            renderNews();
        });
    });
}

function setupStateButtons() {
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadNewsFromGoogleSheets);
    }
    
    const localBtn = document.getElementById('load-local-btn');
    if (localBtn) {
        localBtn.addEventListener('click', () => {
            alert('Función local deshabilitada temporalmente');
        });
    }
}

// =============== ADMIN SYSTEM (solo lo necesario) ===============
function setupAdmin() {
    const adminAccessBtn = document.getElementById('admin-access-btn');
    if (adminAccessBtn) {
        adminAccessBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showAdminPanel();
        });
    }
    
    setupLoginForm();
    setupAdminTabs();
    setupSyncFunctions();
}

function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            
            if (username === 'admin' && password === 'admin123') {
                document.getElementById('admin-login').style.display = 'none';
                document.getElementById('admin-panel').style.display = 'block';
                loadAdminNews();
            } else {
                alert('Credenciales: admin / admin123');
            }
        });
    }
    
    const cancelLoginBtn = document.getElementById('cancel-login-btn');
    if (cancelLoginBtn) {
        cancelLoginBtn.addEventListener('click', hideAdminPanel);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', hideAdminPanel);
    }
}

function setupAdminTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const tabElement = document.getElementById(tabId);
            if (tabElement) tabElement.classList.add('active');
        });
    });
}

function setupSyncFunctions() {
    const syncBtn = document.getElementById('sync-now-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            this.disabled = true;
            
            loadNewsFromGoogleSheets();
            
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Cargar de Google Sheets';
                this.disabled = false;
            }, 2000);
        });
    }
    
    const refreshBtn = document.getElementById('refresh-news-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadAdminNews();
            
            const formStatus = document.getElementById('form-status');
            if (formStatus) {
                formStatus.innerHTML = `
                    <div style="padding: 10px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; margin-top: 10px; color: #155724;">
                        ✅ Lista actualizada
                    </div>
                `;
                
                setTimeout(() => {
                    formStatus.innerHTML = '';
                }, 2000);
            }
        });
    }
}

// =============== FUNCIONES ADMIN ===============
function showAdminPanel() {
    document.getElementById('admin-overlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hideAdminPanel() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
}

function loadAdminNews() {
    const adminNewsList = document.getElementById('admin-recipes-list');
    if (!adminNewsList) return;
    
    if (news.length === 0) {
        adminNewsList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No hay noticias</p>';
        return;
    }
    
    let html = '';
    news.forEach(item => {
        html += `
            <div class="admin-recipe-item">
                <div class="admin-recipe-header">
                    <div class="admin-recipe-title">${item.title}</div>
                </div>
                <div class="admin-recipe-details">
                    <div><strong>Categoría:</strong> ${item.category}</div>
                    <div><strong>Fecha:</strong> ${formatDate(item.date)}</div>
                </div>
            </div>
        `;
    });
    
    adminNewsList.innerHTML = html;
}

// =============== FUNCIONES GLOBALES ===============
window.clearSearch = function() {
    searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderNews();
};

window.openNewsModal = openNewsModal;
window.closeModal = closeModal;
window.clearSearch = clearSearch;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.loadNewsFromGoogleSheets = loadNewsFromGoogleSheets;
