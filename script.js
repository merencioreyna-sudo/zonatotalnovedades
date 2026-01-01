// =============== CONFIGURACIÓN ===============
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
    console.log('Zona Total Novedades - Iniciando...');
    loadSiteSettings();
    
    if (siteSettings.googleSheetsId) {
        GOOGLE_SHEETS_ID = siteSettings.googleSheetsId;
    }
    
    loadNewsFromGoogleSheets();
    setupMobileMenu();
    setupFiltersAndSearch();
    setupModal();
    setupCategories();
    setupStateButtons();
    setupAdmin();
});

// =============== CONFIGURACIÓN DEL SITIO ===============
function loadSiteSettings() {
    try {
        const savedSettings = localStorage.getItem('zona_total_settings');
        if (savedSettings) {
            siteSettings = JSON.parse(savedSettings);
            applySiteSettings();
        }
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

function saveSiteSettings() {
    try {
        localStorage.setItem('zona_total_settings', JSON.stringify(siteSettings));
        return true;
    } catch (error) {
        console.error('Error guardando configuración:', error);
        return false;
    }
}

function applySiteSettings() {
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
    
    document.title = siteSettings.siteTitle;
    
    const footerDescription = document.querySelector('.footer-logo p');
    if (footerDescription) {
        footerDescription.textContent = siteSettings.siteDescription;
    }
    
    const contactEmail = document.querySelector('.footer-info p:nth-child(1)');
    const contactPhone = document.querySelector('.footer-info p:nth-child(2)');
    
    if (contactEmail) {
        contactEmail.innerHTML = `<i class="fas fa-envelope"></i> ${siteSettings.contactEmail}`;
    }
    if (contactPhone) {
        contactPhone.innerHTML = `<i class="fas fa-phone"></i> ${siteSettings.contactPhone}`;
    }
}

// =============== CARGA DE GOOGLE SHEETS - CORREGIDO ===============
async function loadNewsFromGoogleSheets() {
    try {
        console.log('📥 Cargando noticias desde Google Sheets...');
        
        document.getElementById('loading-recipes').style.display = 'flex';
        document.getElementById('error-recipes').style.display = 'none';
        
        const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
        console.log('URL:', sheetsUrl);
        
        const response = await fetch(sheetsUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV recibido (primeros 500 caracteres):', csvText.substring(0, 500));
        
        news = [];
        
        const lines = csvText.split('\n');
        console.log('Total líneas:', lines.length);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (i === 0) continue;
            if (!line || line.trim() === '') continue;
            
            const values = parseCSVRowSimple(line);
            
            if (values.length >= 9) {
                const title = values[0] ? values[0].trim() : '';
                const description = values[1] ? values[1].trim() : '';
                const category = values[2] ? values[2].trim() : 'Nacional';
                const country = values[3] ? values[3].trim() : 'No especificado';
                const date = values[4] ? values[4].trim() : new Date().toISOString().split('T')[0];
                const priority = values[5] ? values[5].trim() : 'Media';
                const image = values[6] ? values[6].trim() : DEFAULT_IMAGE;
                const content = values[7] ? values[7].trim() : '';
                const source = values[8] ? values[8].trim() : 'Fuente no disponible';
                
                if (title && title !== '' && title !== 'null') {
                    const newsItem = {
                        id: news.length + 1,
                        title: title,
                        description: description || 'Sin descripción',
                        category: category,
                        country: country,
                        date: date,
                        priority: priority,
                        image: fixImageUrl(image),
                        content: content || 'Contenido no disponible',
                        source: source,
                        embedCode: values[9] ? values[9].trim() : ''
                    };
                    
                    news.push(newsItem);
                    console.log(`✅ Noticia cargada: "${title.substring(0, 50)}..."`);
                }
            }
        }
        
        console.log(`✅ Total noticias cargadas: ${news.length}`);
        
        if (news.length === 0) {
            console.log('⚠️ No se encontraron noticias. Verifica el formato del CSV.');
        }
        
        updateNewsCounts();
        renderNews();
        
        document.getElementById('loading-recipes').style.display = 'none';
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

function parseCSVRowSimple(row) {
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
    
    return result.map(value => {
        let cleaned = value.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }
        cleaned = cleaned.replace(/""/g, '"');
        return cleaned;
    });
}

function fixImageUrl(url) {
    if (!url || url.trim() === '' || url === 'null' || url === '""') {
        return DEFAULT_IMAGE;
    }
    
    let fixedUrl = url.trim();
    fixedUrl = fixedUrl.replace(/^"+|"+$/g, '');
    
    if (fixedUrl && !fixedUrl.startsWith('http://') && !fixedUrl.startsWith('https://')) {
        fixedUrl = 'https://' + fixedUrl;
    }
    
    return fixedUrl || DEFAULT_IMAGE;
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
        alert('No hay noticias para exportar.');
        return;
    }
    
    try {
        const headers = ['Título', 'Descripción', 'Categoría', 'País', 'Fecha', 'Prioridad', 'Imagen', 'Contenido', 'Fuente', 'Embed'];
        const rows = [headers];
        
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
        
        const csvContent = rows.map(row => 
            row.map(cell => {
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');
        
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
        
        alert('✅ CSV exportado correctamente.');
        
    } catch (error) {
        console.error('Error al exportar CSV:', error);
        alert(`Error: ${error.message}`);
    }
}

// =============== CONTADORES - CORREGIDO ===============
function updateNewsCounts() {
    console.log('🔄 Actualizando contadores con', news.length, 'noticias');
    
    const totalElement = document.getElementById('total-news');
    if (totalElement) {
        totalElement.textContent = news.length;
        console.log('Noticias disponibles:', news.length);
    }
    
    const categoryCounts = {
        'nacional': 0,
        'internacional': 0,
        'economia': 0,
        'tecnologia': 0,
        'deportes': 0,
        'cultura': 0,
        'celebridades': 0
    };
    
    news.forEach(item => {
        const cat = normalizeCategory(item.category);
        
        if (cat === 'nacional') categoryCounts.nacional++;
        else if (cat === 'internacional') categoryCounts.internacional++;
        else if (cat === 'economia') categoryCounts.economia++;
        else if (cat === 'tecnologia') categoryCounts.tecnologia++;
        else if (cat === 'deportes') categoryCounts.deportes++;
        else if (cat === 'cultura') categoryCounts.cultura++;
        else if (cat === 'celebridades') categoryCounts.celebridades++;
        else if (cat.includes('nacional')) categoryCounts.nacional++;
        else if (cat.includes('internacional')) categoryCounts.internacional++;
        else if (cat.includes('econom')) categoryCounts.economia++;
        else if (cat.includes('tecnolog')) categoryCounts.tecnologia++;
        else if (cat.includes('deporte')) categoryCounts.deportes++;
        else if (cat.includes('cultur')) categoryCounts.cultura++;
        else if (cat.includes('celebridad')) categoryCounts.celebridades++;
    });
    
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
        .trim()
        .replace(/\s+/g, '');
}

// =============== RENDERIZAR NOTICIAS ===============
function renderNews() {
    const newsGrid = document.getElementById('recipes-grid');
    if (!newsGrid) return;
    
    newsGrid.innerHTML = '';
    
    let filteredNews = [...news];
    
    if (currentCategory !== 'todos') {
        filteredNews = news.filter(n => {
            const cat = normalizeCategory(n.category);
            return cat === currentCategory || cat.includes(currentCategory);
        });
    }
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredNews = filteredNews.filter(n => {
            const searchText = (n.title + ' ' + n.description + ' ' + n.category).toLowerCase();
            return searchText.includes(query);
        });
    }
    
    if (filteredNews.length === 0) {
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-newspaper" style="font-size: 3rem; color: #6c757d; opacity: 0.5; margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-dark); margin-bottom: 10px;">
                    ${searchQuery ? 'Búsqueda sin resultados' : 'No hay noticias disponibles'}
                </h3>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary" style="margin-top: 10px;">Limpiar búsqueda</button>' : 
                    ''
                }
            </div>
        `;
        return;
    }
    
    filteredNews.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const priorityClass = item.priority ? item.priority.toLowerCase() : 'media';
        const formattedDate = formatDate(item.date);
        
        card.innerHTML = `
            <div class="recipe-image">
                <img src="${item.image}" alt="${item.title}" 
                     onerror="this.src='${DEFAULT_IMAGE}'"
                     style="width: 100%; height: 200px; object-fit: cover;">
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.8rem;">
                    ${item.priority || 'Media'}
                </div>
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h3 class="recipe-title">${item.title}</h3>
                    <span class="recipe-difficulty ${priorityClass}">${item.country}</span>
                </div>
                <p class="recipe-description">${item.description || 'Sin descripción disponible'}</p>
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

// =============== MODAL - CONTENIDO COMPLETO ===============
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
    
    let modalContent = `
        <div style="margin-bottom: 25px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${item.image}" alt="${item.title}" 
                     onerror="this.src='${DEFAULT_IMAGE}'"
                     style="max-width: 100%; max-height: 300px; border-radius: 8px; object-fit: cover; margin-bottom: 15px;">
                <p style="color: #666; font-size: 1.1rem; font-style: italic; line-height: 1.4;">
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
        
        <div style="margin-bottom: 25px;">
            <h4 style="color: var(--primary-dark); margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid var(--border-color);">
                Contenido Completo
            </h4>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); 
                        line-height: 1.6; font-size: 1rem; white-space: pre-line;">
                ${item.content || 'Contenido no disponible'}
            </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid var(--accent-red);">
            <div style="color: #666; font-size: 0.9rem;">
                <p><strong>Fuente:</strong> ${item.source || 'No especificada'}</p>
                <p><strong>Publicación:</strong> ${formattedDate}</p>
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
        retryBtn.addEventListener('click', function() {
            console.log('Reintentando carga...');
            loadNewsFromGoogleSheets();
        });
    }
}

// =============== ADMIN SYSTEM ===============
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
                alert('Usuario: admin / Contraseña: admin123');
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
            console.log('Sincronizando con Google Sheets...');
            
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
            console.log('Actualizando lista en admin...');
            
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
        adminNewsList.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #666;">
                <i class="fas fa-newspaper" style="font-size: 2rem; opacity: 0.5; margin-bottom: 10px;"></i>
                <p>No hay noticias cargadas</p>
            </div>
        `;
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
window.exportAllToCSV = exportAllToCSV;
