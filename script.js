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
    
    // Cargar configuración
    loadSiteSettings();
    
    // Aplicar Google Sheets ID si está configurado
    if (siteSettings.googleSheetsId) {
        GOOGLE_SHEETS_ID = siteSettings.googleSheetsId;
    }
    
    // Cargar noticias
    loadNewsFromGoogleSheets();
    
    // Configuraciones básicas
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
    
    // Aplicar título
    document.title = siteSettings.siteTitle;
    
    // Aplicar descripción
    const footerDescription = document.querySelector('.footer-logo p');
    if (footerDescription) {
        footerDescription.textContent = siteSettings.siteDescription;
    }
    
    // Aplicar contacto
    const contactEmail = document.querySelector('.footer-info p:nth-child(1)');
    const contactPhone = document.querySelector('.footer-info p:nth-child(2)');
    
    if (contactEmail) {
        contactEmail.innerHTML = `<i class="fas fa-envelope"></i> ${siteSettings.contactEmail}`;
    }
    if (contactPhone) {
        contactPhone.innerHTML = `<i class="fas fa-phone"></i> ${siteSettings.contactPhone}`;
    }
}

// =============== CARGA DE NOTICIAS DESDE GOOGLE SHEETS ===============
async function loadNewsFromGoogleSheets() {
    try {
        console.log('Cargando noticias desde Google Sheets...');
        
        // Mostrar estado de carga
        document.getElementById('loading-recipes').style.display = 'flex';
        document.getElementById('error-recipes').style.display = 'none';
        
        // URL correcta para Google Sheets
        const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
        
        console.log('URL:', sheetsUrl);
        
        // Hacer petición
        const response = await fetch(sheetsUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV recibido. Procesando...');
        
        // LIMPIAR array
        news = [];
        
        // Parsear CSV línea por línea
        const lines = csvText.split('\n');
        
        // Procesar cada línea (empezando desde la 1, saltando encabezados)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Saltar líneas completamente vacías
            if (!line || line === '' || line.replace(/,/g, '').trim() === '') {
                continue;
            }
            
            // Parsear la línea CSV
            const values = parseCSVLine(line);
            
            // Verificar que tengamos suficientes valores (9 columnas según tu estructura)
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
                
                // Solo agregar si tiene título
                if (title && title !== '') {
                    const newsItem = {
                        id: news.length + 1,
                        title: title,
                        description: description || 'Sin descripción disponible',
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
                    console.log(`✅ Noticia ${news.length}: ${title.substring(0, 50)}...`);
                }
            }
        }
        
        console.log(`✅ Total noticias cargadas: ${news.length}`);
        
        // Actualizar la interfaz
        updateNewsCounts();
        renderNews();
        
        // Ocultar carga
        document.getElementById('loading-recipes').style.display = 'none';
        
        // Actualizar estado en admin
        updateSyncStatus(true, news.length);
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        // Mostrar error
        document.getElementById('loading-recipes').style.display = 'none';
        document.getElementById('error-recipes').style.display = 'flex';
        document.getElementById('error-message').textContent = 
            `Error al cargar noticias: ${error.message}`;
        
        updateSyncStatus(false, 0);
    }
}

// Función para parsear línea CSV (maneja comas dentro de comillas)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
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
    
    // Limpiar cada valor
    return result.map(value => {
        let cleaned = value.trim();
        // Remover comillas dobles al inicio y final
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
        }
        // Reemplazar comillas dobles dobles por comillas simples
        cleaned = cleaned.replace(/""/g, '"');
        return cleaned;
    });
}

function fixImageUrl(url) {
    if (!url || url.trim() === '' || url === 'null' || url === '""') {
        return DEFAULT_IMAGE;
    }
    
    let fixedUrl = url.trim();
    
    // Limpiar comillas extras
    fixedUrl = fixedUrl.replace(/^"+|"+$/g, '');
    
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
    console.log('Actualizando contadores...');
    
    // 1. CONTADOR TOTAL
    const totalElement = document.getElementById('total-news');
    if (totalElement) {
        totalElement.textContent = news.length;
        console.log('Total noticias:', news.length);
    }
    
    // 2. INICIALIZAR CONTADORES DE CATEGORÍAS
    const categoryCounts = {
        'nacional': 0,
        'internacional': 0,
        'economia': 0,
        'tecnologia': 0,
        'deportes': 0,
        'cultura': 0,
        'celebridades': 0
    };
    
    // 3. CONTAR NOTICIAS POR CATEGORÍA
    news.forEach(item => {
        const cat = normalizeCategory(item.category);
        
        // Contar basado en el nombre de la categoría
        if (cat === 'nacional') categoryCounts.nacional++;
        else if (cat === 'internacional') categoryCounts.internacional++;
        else if (cat === 'economia') categoryCounts.economia++;
        else if (cat === 'tecnologia') categoryCounts.tecnologia++;
        else if (cat === 'deportes') categoryCounts.deportes++;
        else if (cat === 'cultura') categoryCounts.cultura++;
        else if (cat === 'celebridades') categoryCounts.celebridades++;
        else {
            // Si no coincide exactamente, buscar coincidencias parciales
            if (cat.includes('nacional')) categoryCounts.nacional++;
            else if (cat.includes('internacional')) categoryCounts.internacional++;
            else if (cat.includes('econom')) categoryCounts.economia++;
            else if (cat.includes('tecnolog')) categoryCounts.tecnologia++;
            else if (cat.includes('deporte')) categoryCounts.deportes++;
            else if (cat.includes('cultur')) categoryCounts.cultura++;
            else if (cat.includes('celebridad')) categoryCounts.celebridades++;
            else categoryCounts.nacional++; // Por defecto
        }
    });
    
    // 4. ACTUALIZAR LOS ELEMENTOS HTML
    Object.keys(categoryCounts).forEach(cat => {
        const element = document.getElementById(`count-${cat}`);
        if (element) {
            const count = categoryCounts[cat];
            element.textContent = `${count} noticia${count !== 1 ? 's' : ''}`;
            console.log(`Categoría ${cat}: ${count} noticias`);
        }
    });
}

function normalizeCategory(category) {
    if (!category) return '';
    
    return category.toLowerCase()
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/\s+/g, ''); // Eliminar espacios
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
                <i class="fas fa-newspaper" style="font-size: 3rem; color: #6c757d; opacity: 0.5; margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-dark); margin-bottom: 10px;">
                    ${searchQuery ? 'Búsqueda sin resultados' : 'No hay noticias disponibles'}
                </h3>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary">Limpiar búsqueda</button>' : 
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

// =============== MODAL - MOSTRAR TODO EL CONTENIDO ===============
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
        <div style="margin-bottom: 30px;">
            <!-- Imagen y descripción -->
            <div style="text-align: center; margin-bottom: 25px;">
                <img src="${item.image}" alt="${item.title}" 
                     onerror="this.src='${DEFAULT_IMAGE}'"
                     style="max-width: 100%; max-height: 400px; border-radius: 10px; object-fit: cover; margin-bottom: 15px;">
                <p style="color: #666; font-size: 1.1rem; font-style: italic; line-height: 1.4;">
                    ${item.description || ''}
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
            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); 
                        line-height: 1.6; font-size: 1.05rem; white-space: pre-line; text-align: justify;">
                ${item.content || 'Contenido no disponible'}
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

// =============== FUNCIONES DE SETUP ===============
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
    // Filtros
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
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadNewsFromGoogleSheets);
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
    setupSettingsForm();
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
                document.getElementById('new-recipe-date').value = today;
                
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
            
            if (tabId === 'news-tab') loadAdminNews();
            if (tabId === 'edit-news-tab') loadEditSelector();
            if (tabId === 'settings-tab') updateLogoPreview();
        });
    });
}

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
            exportAllToCSV();
        });
    }
    
    // BOTÓN ACTUALIZAR LISTA - FUNCIONAL
    const refreshBtn = document.getElementById('refresh-news-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('Actualizando lista en admin...');
            
            // Actualizar la lista
            loadAdminNews();
            loadEditSelector();
            
            // Mostrar mensaje
            const formStatus = document.getElementById('form-status');
            if (formStatus) {
                formStatus.innerHTML = `
                    <div style="padding: 10px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; margin-top: 10px; color: #155724;">
                        ✅ Lista actualizada correctamente
                    </div>
                `;
                
                setTimeout(() => {
                    formStatus.innerHTML = '';
                }, 2000);
            }
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
                
                alert('✅ Configuración guardada');
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
        adminNewsList.innerHTML = '<p style="text-align: center; padding: 20px;">No hay noticias</p>';
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

function loadEditSelector() {
    const select = document.getElementById('edit-recipe-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar noticia...</option>';
    
    news.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        option.textContent = `${item.title.substring(0, 50)}... (${item.category})`;
        select.appendChild(option);
    });
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

window.openNewsModal = openNewsModal;
window.closeModal = closeModal;
window.clearSearch = clearSearch;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.loadNewsFromGoogleSheets = loadNewsFromGoogleSheets;
window.exportAllToCSV = exportAllToCSV;
