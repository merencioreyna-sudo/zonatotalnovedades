// =============== CONFIGURACIÓN ===============
// REEMPLAZA ESTE ID CON EL DE TU GOOGLE SHEETS REAL
let GOOGLE_SHEETS_ID = '1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ';
const SHEET_NAME = 'Noticias';
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80';

// Variables globales
let news = [];
let currentCategory = "todos";
let searchQuery = "";
let siteSettings = {
    googleSheetsId: GOOGLE_SHEETS_ID,
    logoUrl: '',
    siteTitle: 'Zona Total Novedades',
    siteDescription: 'Tu fuente confiable de noticias nacionales e internacionales, verificadas y actualizadas.',
    contactEmail: 'contacto@zonatotalnovedades.com',
    contactPhone: '+1 800-NOTICIAS'
};

// =============== INICIALIZACIÓN ===============
document.addEventListener('DOMContentLoaded', function() {
    console.log('Zona Total Novedades - Sistema con Google Sheets');
    
    // Cargar configuración del sitio
    loadSiteSettings();
    
    // Actualizar Google Sheets ID si está configurado
    if (siteSettings.googleSheetsId) {
        GOOGLE_SHEETS_ID = siteSettings.googleSheetsId;
    }
    
    // Cargar noticias desde Google Sheets
    loadNewsFromGoogleSheets();
    
    // Menú móvil
    setupMobileMenu();
    
    // Configurar filtros y búsqueda
    setupFiltersAndSearch();
    
    // Configurar modal
    setupModal();
    
    // Configurar categorías
    setupCategories();
    
    // Configurar botones de estado
    setupStateButtons();
    
    // Configurar Admin
    setupAdmin();
});

// =============== CONFIGURACIÓN DEL SITIO ===============
function loadSiteSettings() {
    try {
        const savedSettings = localStorage.getItem('zona_total_settings');
        if (savedSettings) {
            siteSettings = JSON.parse(savedSettings);
            console.log('⚙️ Configuración cargada:', siteSettings);
            applySiteSettings();
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

function saveSiteSettings() {
    try {
        localStorage.setItem('zona_total_settings', JSON.stringify(siteSettings));
        console.log('💾 Configuración guardada:', siteSettings);
        return true;
    } catch (error) {
        console.error('Error guardando configuración:', error);
        return false;
    }
}

function applySiteSettings() {
    // Aplicar Google Sheets ID
    if (siteSettings.googleSheetsId) {
        GOOGLE_SHEETS_ID = siteSettings.googleSheetsId;
    }
    
    // Aplicar logo
    const siteLogo = document.getElementById('site-logo');
    if (siteLogo) {
        if (siteSettings.logoUrl && siteSettings.logoUrl.trim() !== '') {
            siteLogo.innerHTML = `
                <img src="${siteSettings.logoUrl}" alt="${siteSettings.siteTitle}" 
                     style="max-height: 40px; max-width: 150px; object-fit: contain;">
                <span class="logo-text">${siteSettings.siteTitle}</span>
            `;
        } else {
            siteLogo.innerHTML = `
                <div class="logo-icon">
                    <i class="fas fa-newspaper"></i>
                </div>
                <span class="logo-text">${siteSettings.siteTitle}</span>
            `;
        }
    }
    
    // Aplicar título del sitio
    document.title = siteSettings.siteTitle;
    
    // Aplicar descripción en el footer
    const footerDescription = document.querySelector('.footer-logo p');
    if (footerDescription) {
        footerDescription.textContent = siteSettings.siteDescription;
    }
    
    // Aplicar información de contacto
    const contactEmail = document.querySelector('.footer-info p:nth-child(1)');
    const contactPhone = document.querySelector('.footer-info p:nth-child(2)');
    
    if (contactEmail) {
        contactEmail.innerHTML = `<i class="fas fa-envelope"></i> ${siteSettings.contactEmail}`;
    }
    if (contactPhone) {
        contactPhone.innerHTML = `<i class="fas fa-phone"></i> ${siteSettings.contactPhone}`;
    }
}

// =============== GOOGLE SHEETS INTEGRATION - CORREGIDO ===============
async function loadNewsFromGoogleSheets() {
    try {
        console.log('📥 Cargando noticias desde Google Sheets...');
        
        // Mostrar estado de carga
        const loadingElement = document.getElementById('loading-recipes');
        const errorElement = document.getElementById('error-recipes');
        if (loadingElement) loadingElement.style.display = 'flex';
        if (errorElement) errorElement.style.display = 'none';
        
        // Construir URL de Google Sheets
        const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
        
        console.log('URL de Google Sheets:', sheetsUrl);
        
        // Hacer la petición
        const response = await fetch(sheetsUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV recibido (primeros 500 caracteres):', csvText.substring(0, 500));
        
        // Limpiar array de noticias
        news = [];
        
        // Parsear CSV - SOLO NOTICIAS REALES
        const rows = csvText.split('\n');
        
        // Contador de noticias reales
        let realNewsCount = 0;
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            
            // Saltar filas completamente vacías
            if (!row || row === '' || row.replace(/,/g, '').trim() === '' || row === ',,,,,,,,,') {
                continue;
            }
            
            // Parsear la fila
            const values = parseCSVRow(row);
            
            // Verificar que sea una noticia real (tiene título)
            if (values.length >= 1 && values[0] && values[0].trim() !== '') {
                const title = values[0].trim();
                
                // Solo procesar si el título no es vacío
                if (title !== '' && title !== 'null' && title !== '""') {
                    const newsItem = {
                        id: realNewsCount + 1,
                        title: title,
                        description: (values[1] || '').trim() || 'Sin descripción',
                        category: (values[2] || '').trim() || 'Nacional',
                        country: (values[3] || '').trim() || 'No especificado',
                        date: (values[4] || '').trim() || new Date().toISOString().split('T')[0],
                        priority: (values[5] || '').trim() || 'Media',
                        image: fixImageUrl((values[6] || '').trim()),
                        content: (values[7] || '').trim() || 'Contenido no disponible',
                        source: (values[8] || '').trim() || 'Fuente no disponible',
                        embedCode: (values[9] || '').trim() || ''
                    };
                    
                    // Agregar a la lista
                    news.push(newsItem);
                    realNewsCount++;
                    
                    console.log(`✅ Noticia ${realNewsCount}: ${newsItem.title.substring(0, 50)}...`);
                }
            }
            
            // Si ya tenemos 5 noticias reales, salir
            if (realNewsCount >= 5) {
                break;
            }
        }
        
        console.log(`✅ ${realNewsCount} noticias REALES cargadas desde Google Sheets`);
        
        // Actualizar interfaz
        updateNewsCounts();
        renderNews();
        
        // Ocultar estado de carga
        if (loadingElement) loadingElement.style.display = 'none';
        
        // Actualizar estado en admin
        updateSyncStatus(true, news.length);
        
        // Guardar en localStorage como backup
        saveToLocalStorage();
        
    } catch (error) {
        console.error('❌ Error cargando desde Google Sheets:', error);
        
        // Mostrar error
        const loadingElement = document.getElementById('loading-recipes');
        const errorElement = document.getElementById('error-recipes');
        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) {
            errorElement.style.display = 'flex';
            document.getElementById('error-message').textContent = 
                `Error: ${error.message}. Verifica el ID de Google Sheets.`;
        }
        
        // Actualizar estado en admin
        updateSyncStatus(false, 0);
        
        // Cargar desde localStorage como respaldo
        loadFromLocalStorage();
    }
}

// Función para parsear filas CSV - SIMPLE
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result.map(value => value.trim());
}

function fixImageUrl(url) {
    if (!url || url.trim() === '' || url === 'null' || url === '""') {
        return DEFAULT_IMAGE;
    }
    
    return url.trim();
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

// =============== FUNCIÓN DE EXPORTACIÓN CSV ===============
function exportAllToCSV() {
    if (news.length === 0) {
        alert('⚠️ No hay noticias para exportar.');
        return;
    }
    
    try {
        // Encabezados
        const headers = ['Título', 'Descripción', 'Categoría', 'País', 'Fecha', 'Prioridad', 'Imagen', 'Contenido', 'Fuente', 'Embed'];
        const rows = [headers];
        
        // Agregar cada noticia
        news.forEach((item) => {
            const row = [
                item.title || '',
                item.description || '',
                item.category || '',
                item.country || '',
                item.date || '',
                item.priority || '',
                item.image || '',
                item.content || '',
                item.source || '',
                item.embedCode || ''
            ];
            rows.push(row);
        });
        
        // Convertir a CSV
        const csvContent = rows.map(row => 
            row.map(cell => {
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');
        
        // Crear y descargar archivo
        const blob = new Blob(['\uFEFF' + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `noticias_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`✅ CSV exportado correctamente.`);
        
    } catch (error) {
        console.error('❌ Error al exportar CSV:', error);
        alert(`❌ Error al exportar CSV: ${error.message}`);
    }
}

// =============== PERSISTENCIA LOCAL ===============
function loadFromLocalStorage() {
    try {
        const savedNews = localStorage.getItem('zona_total_novedades');
        if (savedNews) {
            const parsedNews = JSON.parse(savedNews);
            if (Array.isArray(parsedNews)) {
                news = parsedNews;
                console.log('📂 Noticias cargadas desde localStorage:', news.length);
                updateNewsCounts();
                renderNews();
                return true;
            }
        }
    } catch (error) {
        console.error('Error cargando desde localStorage:', error);
    }
    return false;
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('zona_total_novedades', JSON.stringify(news));
        console.log('💾 Noticias guardadas en localStorage:', news.length);
        return true;
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
        return false;
    }
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
            return cat === currentCategory;
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
                <i class="fas fa-newspaper" style="font-size: 4rem; color: #6c757d; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3 style="color: var(--text-dark); margin-bottom: 15px; font-weight: 400;">
                    ${searchQuery ? 'Búsqueda sin resultados' : 'Sin noticias disponibles'}
                </h3>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary" style="margin: 5px;">Limpiar búsqueda</button>' : 
                    ''
                }
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

function normalizeCategory(category) {
    if (!category) return '';
    
    return category.toLowerCase()
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '');
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString || 'Sin fecha';
        }
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        return dateString || 'Sin fecha';
    }
}

// =============== ACTUALIZAR CONTADORES - CORREGIDO ===============
function updateNewsCounts() {
    console.log('Actualizando contadores con', news.length, 'noticias');
    
    // Actualizar contador total
    const totalElement = document.getElementById('total-news');
    if (totalElement) {
        totalElement.textContent = news.length;
        console.log('Total noticias:', news.length);
    }
    
    // Inicializar contadores en 0
    const categories = ['nacional', 'internacional', 'economia', 'tecnologia', 'deportes', 'cultura', 'celebridades'];
    const counts = {};
    categories.forEach(cat => counts[cat] = 0);
    
    // Contar noticias por categoría - SIMPLE
    news.forEach(item => {
        const cat = normalizeCategory(item.category);
        
        if (cat.includes('nacional')) counts.nacional++;
        else if (cat.includes('internacional')) counts.internacional++;
        else if (cat.includes('econom')) counts.economia++;
        else if (cat.includes('tecnolog')) counts.tecnologia++;
        else if (cat.includes('deporte')) counts.deportes++;
        else if (cat.includes('cultur')) counts.cultura++;
        else if (cat.includes('celebridad')) counts.celebridades++;
        else if (cat === 'nacional') counts.nacional++;
        else if (cat === 'internacional') counts.internacional++;
        else if (cat === 'economia') counts.economia++;
        else if (cat === 'tecnologia') counts.tecnologia++;
        else if (cat === 'deportes') counts.deportes++;
        else if (cat === 'cultura') counts.cultura++;
        else if (cat === 'celebridades') counts.celebridades++;
    });
    
    // Actualizar elementos HTML
    categories.forEach(cat => {
        const element = document.getElementById(`count-${cat}`);
        if (element) {
            const count = counts[cat] || 0;
            element.textContent = `${count} noticia${count !== 1 ? 's' : ''}`;
            console.log(`Categoría ${cat}: ${count}`);
        }
    });
}

// =============== MODAL DE NOTICIAS - MOSTRAR TODO ===============
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
    
    // CONTENIDO COMPLETO - SIN LIMITES
    let modalContent = `
        <div style="margin-bottom: 30px;">
            <!-- Imagen principal -->
            <div style="text-align: center; margin-bottom: 25px;">
                <img src="${item.image}" alt="${item.title}" 
                     onerror="this.src='${DEFAULT_IMAGE}'"
                     style="max-width: 100%; max-height: 400px; border-radius: 10px; object-fit: cover; margin-bottom: 15px;">
                <p style="color: #666; font-size: 1.1rem; font-style: italic; margin-bottom: 5px;">
                    ${item.description || 'Sin descripción'}
                </p>
            </div>
            
            <!-- Información de la noticia -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">Categoría</div>
                        <div style="font-weight: 600; color: var(--primary-blue);">${item.category}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">País</div>
                        <div style="font-weight: 600; color: var(--text-dark);">${item.country}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">Fecha</div>
                        <div style="font-weight: 600; color: var(--text-dark);">${formattedDate}</div>
                    </div>
                    <div>
                        <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">Prioridad</div>
                        <div style="font-weight: 600;">
                            <span class="recipe-difficulty ${priorityClass}">${item.priority || 'Media'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- CONTENIDO COMPLETO DE LA NOTICIA -->
        <div style="margin-bottom: 30px;">
            <h4 style="color: var(--primary-dark); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--primary-blue);">
                <i class="fas fa-file-alt"></i> Noticia Completa
            </h4>
            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); line-height: 1.6; font-size: 1.05rem;">
                ${item.content.replace(/\n/g, '<br>') || 'Contenido no disponible'}
            </div>
        </div>
        
        <!-- Información adicional -->
        <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px; border-left: 4px solid var(--accent-red);">
            <h5 style="color: var(--accent-red); margin-bottom: 10px;">
                <i class="fas fa-info-circle"></i> Información Adicional
            </h5>
            <div style="color: #666; font-size: 0.95rem;">
                <p><strong>Fuente:</strong> ${item.source || 'No especificada'}</p>
                <p><strong>Fecha de publicación:</strong> ${formattedDate}</p>
                <p><strong>Prioridad:</strong> ${item.priority || 'Media'}</p>
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

// =============== SETUP FUNCTIONS ===============
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
    // Filtros de categorías
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            renderNews();
        });
    });
    
    // Búsqueda
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
    // Botón de reintento
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadNewsFromGoogleSheets);
    }
    
    // Botón para cargar datos locales
    const localBtn = document.getElementById('load-local-btn');
    if (localBtn) {
        localBtn.addEventListener('click', () => {
            if (loadFromLocalStorage()) {
                document.getElementById('error-recipes').style.display = 'none';
            }
        });
    }
}

// =============== ADMIN SYSTEM ===============
function setupAdmin() {
    // Botón para abrir admin
    const adminAccessBtn = document.getElementById('admin-access-btn');
    if (adminAccessBtn) {
        adminAccessBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showAdminPanel();
        });
    }
    
    // Login form
    setupLoginForm();
    
    // Tabs del admin
    setupAdminTabs();
    
    // Formularios
    setupAddNewsForm();
    setupEditNewsForm();
    
    // Sincronización
    setupSyncFunctions();
    
    // Configuración
    setupSettingsForm();
    
    // Eventos generales
    setupAdminEvents();
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
                loadEditSelector();
                loadSettingsForm();
                
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('new-recipe-date');
                if (dateInput) dateInput.value = today;
                
            } else {
                alert('Credenciales incorrectas. Usuario: admin, Contraseña: admin123');
            }
        });
    }
    
    const showCredsBtn = document.getElementById('show-creds-btn');
    if (showCredsBtn) {
        showCredsBtn.addEventListener('click', function() {
            const loginHint = document.getElementById('login-hint');
            if (loginHint) {
                loginHint.classList.toggle('active');
                this.textContent = loginHint.classList.contains('active') ? 
                    'Ocultar Credenciales' : 'Mostrar Credenciales';
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
            
            if (tabId === 'news-tab') {
                loadAdminNews();
            }
            if (tabId === 'edit-news-tab') {
                loadEditSelector();
            }
            if (tabId === 'settings-tab') {
                updateLogoPreview();
            }
        });
    });
}

function setupAddNewsForm() {
    const addNewsForm = document.getElementById('add-recipe-form');
    if (addNewsForm) {
        addNewsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const title = document.getElementById('new-recipe-title').value.trim();
            const description = document.getElementById('new-recipe-description').value.trim();
            const category = document.getElementById('new-recipe-category').value;
            const country = document.getElementById('new-recipe-country').value.trim();
            const date = document.getElementById('new-recipe-date').value;
            const priority = document.getElementById('new-recipe-priority').value;
            const image = document.getElementById('new-recipe-image').value.trim();
            const content = document.getElementById('new-recipe-content').value.trim();
            const source = document.getElementById('new-recipe-source').value.trim();
            const embedCode = document.getElementById('new-recipe-embed').value.trim();
            
            if (!title || !description || !category || !country || !date || !image || !content || !source) {
                alert('Por favor, completa todos los campos obligatorios (*)');
                return;
            }
            
            const newId = news.length > 0 ? Math.max(...news.map(n => n.id)) + 1 : 1;
            const newNews = {
                id: newId,
                title,
                description,
                category,
                country,
                date,
                priority,
                image: fixImageUrl(image),
                content,
                source,
                embedCode
            };
            
            news.unshift(newNews);
            saveToLocalStorage();
            updateNewsCounts();
            renderNews();
            
            alert(`✅ Noticia "${title}" agregada localmente.`);
            addNewsForm.reset();
            
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('new-recipe-date').value = today;
            
            loadAdminNews();
            loadEditSelector();
        });
    }
}

function setupEditNewsForm() {
    const editNewsForm = document.getElementById('edit-recipe-form');
    if (editNewsForm) {
        editNewsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newsId = parseInt(document.getElementById('edit-recipe-select').value);
            const newsIndex = news.findIndex(n => n.id === newsId);
            
            if (newsIndex === -1) {
                alert('Noticia no encontrada');
                return;
            }
            
            news[newsIndex].title = document.getElementById('edit-recipe-title').value.trim();
            news[newsIndex].description = document.getElementById('edit-recipe-description').value.trim();
            news[newsIndex].category = document.getElementById('edit-recipe-category').value;
            news[newsIndex].country = document.getElementById('edit-recipe-country').value.trim();
            news[newsIndex].date = document.getElementById('edit-recipe-date').value;
            news[newsIndex].priority = document.getElementById('edit-recipe-priority').value;
            news[newsIndex].image = fixImageUrl(document.getElementById('edit-recipe-image').value.trim());
            news[newsIndex].content = document.getElementById('edit-recipe-content').value.trim();
            news[newsIndex].source = document.getElementById('edit-recipe-source').value.trim();
            news[newsIndex].embedCode = document.getElementById('edit-recipe-embed').value.trim();
            
            saveToLocalStorage();
            updateNewsCounts();
            renderNews();
            
            alert('✅ Noticia actualizada localmente.');
            loadAdminNews();
            loadEditSelector();
        });
    }
    
    const deleteBtn = document.getElementById('delete-recipe-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const newsId = parseInt(document.getElementById('edit-recipe-select').value);
            
            if (!newsId) {
                alert('Selecciona una noticia primero');
                return;
            }
            
            if (confirm('¿Estás seguro de eliminar esta noticia LOCALMENTE?')) {
                const newsIndex = news.findIndex(n => n.id === newsId);
                
                if (newsIndex !== -1) {
                    news.splice(newsIndex, 1);
                    saveToLocalStorage();
                    updateNewsCounts();
                    renderNews();
                    
                    editNewsForm.reset();
                    editNewsForm.style.display = 'none';
                    document.getElementById('edit-recipe-select').value = '';
                    
                    alert('✅ Noticia eliminada localmente.');
                    loadAdminNews();
                    loadEditSelector();
                }
            }
        });
    }
    
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            editNewsForm.reset();
            editNewsForm.style.display = 'none';
            document.getElementById('edit-recipe-select').value = '';
        });
    }
    
    const editSelect = document.getElementById('edit-recipe-select');
    if (editSelect) {
        editSelect.addEventListener('change', function() {
            const newsId = parseInt(this.value);
            if (newsId) {
                loadNewsToEdit(newsId);
            } else {
                document.getElementById('edit-recipe-form').style.display = 'none';
            }
        });
    }
}

// =============== SINCRO FUNCTIONS - CORREGIDO ===============
function setupSyncFunctions() {
    // Sincronizar ahora
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
    
    // Exportar a CSV
    const exportBtn = document.getElementById('export-news-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            this.disabled = true;
            
            exportAllToCSV();
            
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-file-export"></i> Exportar a CSV';
                this.disabled = false;
            }, 2000);
        });
    }
    
    // BOTÓN ACTUALIZAR LISTA - FUNCIONAL
    const refreshBtn = document.getElementById('refresh-news-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('Actualizando lista...');
            
            // Actualizar la lista en el admin
            loadAdminNews();
            loadEditSelector();
            
            // Mostrar mensaje
            const formStatus = document.getElementById('form-status');
            if (formStatus) {
                formStatus.innerHTML = `
                    <div style="padding: 15px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; margin-top: 20px; color: #155724;">
                        ✅ Lista actualizada correctamente
                    </div>
                `;
                
                setTimeout(() => {
                    formStatus.innerHTML = '';
                }, 3000);
            }
            
            console.log('✅ Lista actualizada');
        });
    }
}

function setupSettingsForm() {
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            siteSettings.googleSheetsId = document.getElementById('google-sheets-id').value.trim();
            siteSettings.logoUrl = document.getElementById('site-logo-url').value.trim();
            siteSettings.siteTitle = document.getElementById('site-title').value.trim();
            siteSettings.siteDescription = document.getElementById('site-description').value.trim();
            
            if (!siteSettings.siteTitle) {
                alert('El título del sitio es requerido');
                return;
            }
            
            if (saveSiteSettings()) {
                if (siteSettings.googleSheetsId) {
                    GOOGLE_SHEETS_ID = siteSettings.googleSheetsId;
                }
                
                applySiteSettings();
                updateLogoPreview();
                
                alert('✅ Configuración guardada correctamente.');
            } else {
                alert('Error al guardar la configuración');
            }
        });
    }
    
    const resetLogoBtn = document.getElementById('reset-logo-btn');
    if (resetLogoBtn) {
        resetLogoBtn.addEventListener('click', function() {
            document.getElementById('site-logo-url').value = '';
            updateLogoPreview();
        });
    }
    
    const logoUrlInput = document.getElementById('site-logo-url');
    if (logoUrlInput) {
        logoUrlInput.addEventListener('input', updateLogoPreview);
    }
}

function setupAdminEvents() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const adminOverlay = document.getElementById('admin-overlay');
            if (adminOverlay && adminOverlay.style.display === 'flex') {
                hideAdminPanel();
            }
        }
    });
    
    const adminOverlay = document.getElementById('admin-overlay');
    if (adminOverlay) {
        adminOverlay.addEventListener('click', function(e) {
            if (e.target === adminOverlay) {
                hideAdminPanel();
            }
        });
    }
}

// =============== ADMIN HELPER FUNCTIONS ===============
function showAdminPanel() {
    document.getElementById('admin-overlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    const loginHint = document.getElementById('login-hint');
    if (loginHint) loginHint.classList.add('active');
}

function hideAdminPanel() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('edit-recipe-form').reset();
    document.getElementById('edit-recipe-form').style.display = 'none';
    document.getElementById('edit-recipe-select').value = '';
    
    const loginHint = document.getElementById('login-hint');
    if (loginHint) loginHint.classList.remove('active');
    const showCredsBtn = document.getElementById('show-creds-btn');
    if (showCredsBtn) showCredsBtn.textContent = 'Mostrar Credenciales';
}

function loadAdminNews() {
    const adminNewsList = document.getElementById('admin-recipes-list');
    if (!adminNewsList) return;
    
    if (news.length === 0) {
        adminNewsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-gray);">
                <i class="fas fa-newspaper" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <p>No hay noticias cargadas.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    news.forEach(item => {
        const formattedDate = formatDate(item.date);
        
        html += `
            <div class="admin-recipe-item">
                <div class="admin-recipe-header">
                    <div class="admin-recipe-title">${item.title}</div>
                    <div class="admin-recipe-actions">
                        <button class="action-btn edit" onclick="loadNewsToEdit(${item.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
                <div class="admin-recipe-details">
                    <div><strong>Categoría:</strong> ${item.category}</div>
                    <div><strong>País:</strong> ${item.country}</div>
                    <div><strong>Fecha:</strong> ${formattedDate}</div>
                    <div><strong>Prioridad:</strong> ${item.priority || 'Media'}</div>
                </div>
            </div>
        `;
    });
    
    adminNewsList.innerHTML = html;
}

function loadEditSelector() {
    const select = document.getElementById('edit-recipe-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar noticia...</option>';
    
    if (news.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay noticias disponibles';
        select.appendChild(option);
        return;
    }
    
    news.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        const shortTitle = item.title.length > 50 ? item.title.substring(0, 47) + '...' : item.title;
        option.textContent = `${shortTitle} (${item.category})`;
        select.appendChild(option);
    });
}

function loadNewsToEdit(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) {
        alert('Noticia no encontrada');
        return;
    }
    
    document.getElementById('edit-recipe-title').value = item.title;
    document.getElementById('edit-recipe-description').value = item.description;
    document.getElementById('edit-recipe-category').value = item.category;
    document.getElementById('edit-recipe-country').value = item.country;
    document.getElementById('edit-recipe-date').value = item.date;
    document.getElementById('edit-recipe-priority').value = item.priority;
    document.getElementById('edit-recipe-image').value = item.image;
    document.getElementById('edit-recipe-content').value = item.content;
    document.getElementById('edit-recipe-source').value = item.source;
    document.getElementById('edit-recipe-embed').value = item.embedCode || '';
    
    document.getElementById('edit-recipe-form').style.display = 'block';
}

function loadSettingsForm() {
    document.getElementById('google-sheets-id').value = siteSettings.googleSheetsId || '';
    document.getElementById('site-logo-url').value = siteSettings.logoUrl || '';
    document.getElementById('site-title').value = siteSettings.siteTitle;
    document.getElementById('site-description').value = siteSettings.siteDescription;
    
    updateLogoPreview();
}

function updateLogoPreview() {
    const logoUrl = document.getElementById('site-logo-url').value.trim();
    const logoPreview = document.getElementById('logo-preview');
    
    if (!logoPreview) return;
    
    if (logoUrl) {
        logoPreview.innerHTML = `
            <img src="${logoUrl}" alt="Logo preview" 
                 style="max-height: 60px; max-width: 200px; object-fit: contain;">
            <div style="font-size: 0.9em; color: #666;">Vista previa</div>
        `;
    } else {
        logoPreview.innerHTML = `
            <div class="logo-preview-default">
                <i class="fas fa-newspaper"></i>
                <span>Zona Total Novedades</span>
            </div>
        `;
    }
}

// =============== FUNCIONES GLOBALES ===============
window.clearSearch = function() {
    searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderNews();
};

window.exportAllToCSV = exportAllToCSV;
window.openNewsModal = openNewsModal;
window.closeModal = closeModal;
window.clearSearch = clearSearch;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.loadNewsFromGoogleSheets = loadNewsFromGoogleSheets;
