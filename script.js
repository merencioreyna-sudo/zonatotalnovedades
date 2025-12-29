// =============== CONFIGURACIÓN ===============
// Google Sheets como base de datos compartida
const GOOGLE_SHEETS_ID = '1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ';
const SHEET_GID = '1201005628';
const GOOGLE_SHEETS_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=csv&gid=${SHEET_GID}`;

// Variables globales
let news = [];
let currentCategory = "todos";
let searchQuery = "";
let siteSettings = {
    logoUrl: '',
    siteTitle: 'Zona Total Novedades',
    siteDescription: 'Tu fuente confiable de noticias nacionales e internacionales, verificadas y actualizadas.',
    contactEmail: 'contacto@zonatotalnovedades.com',
    contactPhone: '+1 800-NOTICIAS'
};

// =============== INICIALIZACIÓN ===============
document.addEventListener('DOMContentLoaded', function() {
    console.log('Zona Total Novedades - Iniciando...');
    
    // Inicializar estados
    setTimeout(() => {
        const errorElement = document.getElementById('error-recipes');
        const loadingElement = document.getElementById('loading-recipes');
        if (errorElement) errorElement.style.display = 'none';
        if (loadingElement) loadingElement.style.display = 'none';
    }, 100);
    
    // Menú móvil
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
    
    // Modal
    const modalClose = document.getElementById('modal-close');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const recipeModal = document.getElementById('recipe-modal');
    
    if (modalClose) modalClose.addEventListener('click', () => closeModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal());
    
    if (recipeModal) {
        recipeModal.addEventListener('click', (e) => {
            if (e.target === recipeModal) closeModal();
        });
    }
    
    // Categorías
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.dataset.category;
            currentCategory = category;
            
            // Actualizar botones de filtro
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                }
            });
            
            renderNews();
        });
    });
    
    // Botón de reintento
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadNewsFromGoogleSheets();
        });
    }
    
    // Configurar Admin
    setupAdmin();
    
    // Configurar Embed
    setupEmbed();
    
    // Cargar configuración del sitio
    loadSiteSettings();
    
    // Cargar noticias (pero vacías para empezar desde cero)
    initializeEmptyNews();
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
    // Aplicar logo
    const siteLogo = document.getElementById('site-logo');
    if (siteLogo && siteSettings.logoUrl) {
        siteLogo.innerHTML = `
            <img src="${siteSettings.logoUrl}" alt="${siteSettings.siteTitle}" 
                 style="max-height: 40px; max-width: 150px;">
            <span class="logo-text">${siteSettings.siteTitle}</span>
        `;
    }
    
    // Aplicar título del sitio
    const siteTitleElements = document.querySelectorAll('.site-title');
    if (siteTitleElements.length > 0) {
        siteTitleElements.forEach(el => {
            el.textContent = siteSettings.siteTitle;
        });
    }
    
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

// =============== INICIALIZAR NOTICIAS VACÍAS ===============
function initializeEmptyNews() {
    console.log('Inicializando noticias vacías...');
    news = []; // Vaciar el array de noticias
    updateNewsCounts();
    updateTotalNews();
    renderNews();
    
    // Ocultar estados de carga
    document.getElementById('loading-recipes').style.display = 'none';
    document.getElementById('error-recipes').style.display = 'none';
    
    // Mostrar mensaje de que no hay noticias
    const newsGrid = document.getElementById('recipes-grid');
    if (newsGrid) {
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-newspaper" style="font-size: 4rem; color: #D4AF37; margin-bottom: 20px;"></i>
                <h3 style="color: white; margin-bottom: 15px;">¡Bienvenido a Zona Total Novedades!</h3>
                <p style="color: #cccccc; margin-bottom: 20px;">
                    No hay noticias cargadas aún. Usa el panel de administración para agregar tu primera noticia.
                </p>
                <button onclick="showAdminPanel()" class="btn btn-primary" style="margin: 10px;">
                    <i class="fas fa-user-cog"></i> Ir al Panel Admin
                </button>
            </div>
        `;
    }
}

// =============== CARGAR NOTICIAS DESDE GOOGLE SHEETS ===============
async function loadNewsFromGoogleSheets() {
    try {
        console.log('📥 Cargando noticias desde Google Sheets...');
        document.getElementById('loading-recipes').style.display = 'flex';
        document.getElementById('error-recipes').style.display = 'none';
        
        const response = await fetch(GOOGLE_SHEETS_URL);
        const csvText = await response.text();
        
        const lines = csvText.split('\n');
        news = [];
        
        // Empezar desde la línea 1 (saltar encabezados)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line === ',') continue;
            
            const values = parseCSVLine(line);
            
            if (values.length >= 10) {
                const newsItem = {
                    id: i,
                    title: values[1]?.trim() || 'Noticia sin título',
                    description: values[2]?.trim() || 'Sin descripción',
                    category: values[3]?.trim() || 'Nacional',
                    country: values[4]?.trim() || 'No especificado',
                    date: values[5]?.trim() || new Date().toLocaleDateString(),
                    priority: values[6]?.trim() || 'Media',
                    image: fixImageUrl(values[7]?.trim()),
                    content: values[8]?.trim() || 'Sin contenido',
                    source: values[9]?.trim() || 'Fuente no disponible'
                };
                
                if (newsItem.title !== 'Noticia sin título' && newsItem.title !== '') {
                    news.push(newsItem);
                    console.log(`✅ Noticia cargada: "${newsItem.title}"`);
                }
            }
        }
        
        console.log(`✅ Total: ${news.length} noticias cargadas desde Google Sheets`);
        
        // Actualizar interfaz
        updateNewsCounts();
        updateTotalNews();
        renderNews();
        
        // Actualizar selector de embed
        updateEmbedSelector();
        
        // Ocultar estados
        document.getElementById('loading-recipes').style.display = 'none';
        
    } catch (error) {
        console.log('❌ Error cargando noticias desde Google Sheets:', error);
        document.getElementById('loading-recipes').style.display = 'none';
        document.getElementById('error-recipes').style.display = 'flex';
        document.getElementById('error-message').textContent = 'Error al conectar con la base de datos.';
    }
}

function parseCSVLine(line) {
    const values = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    values.push(current.trim());
    return values;
}

function fixImageUrl(url) {
    if (!url || url.trim() === '') {
        return 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80';
    }
    
    let fixedUrl = url.trim();
    
    // Si es Unsplash, agregar parámetros
    if (fixedUrl.includes('unsplash.com') && !fixedUrl.includes('?')) {
        fixedUrl += '?w=800&auto=format&fit=crop&q=80';
    }
    
    // Si es Imgur sin extensión, agregar .jpg
    if (fixedUrl.includes('imgur.com') && !fixedUrl.includes('.jpg') && !fixedUrl.includes('.png')) {
        const parts = fixedUrl.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.length > 0) {
            fixedUrl = `https://i.imgur.com/${lastPart}.jpg`;
        }
    }
    
    return fixedUrl;
}

// =============== FUNCIONES DE PERSISTENCIA LOCAL ===============
function saveNewsToLocalStorage() {
    try {
        localStorage.setItem('zona_total_novedades', JSON.stringify(news));
        console.log('💾 Noticias guardadas en localStorage:', news.length);
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
    }
}

function loadNewsFromLocalStorage() {
    try {
        const savedNews = localStorage.getItem('zona_total_novedades');
        if (savedNews) {
            news = JSON.parse(savedNews);
            console.log('📂 Noticias cargadas desde localStorage:', news.length);
            updateNewsCounts();
            updateTotalNews();
            renderNews();
            updateEmbedSelector();
            return true;
        }
    } catch (error) {
        console.error('Error cargando desde localStorage:', error);
    }
    return false;
}

// =============== RENDERIZAR NOTICIAS ===============
function renderNews() {
    const newsGrid = document.getElementById('recipes-grid');
    if (!newsGrid) return;
    
    newsGrid.innerHTML = '';
    
    // Filtrar noticias
    let filteredNews = news;
    
    if (currentCategory !== 'todos') {
        filteredNews = news.filter(n => {
            const catId = normalizeCategory(n.category);
            return catId === currentCategory;
        });
    }
    
    if (searchQuery) {
        filteredNews = filteredNews.filter(n => {
            const searchText = (n.title + ' ' + n.description + ' ' + n.category + ' ' + n.country + ' ' + n.content).toLowerCase();
            return searchText.includes(searchQuery);
        });
    }
    
    // Ordenar por prioridad y fecha (las más recientes primero)
    filteredNews.sort((a, b) => {
        const priorityOrder = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
        if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.date) - new Date(a.date);
    });
    
    // Si no hay noticias después de filtrar
    if (filteredNews.length === 0) {
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-newspaper" style="font-size: 4rem; color: #D4AF37; margin-bottom: 20px;"></i>
                <h3 style="color: white; margin-bottom: 15px;">${news.length === 0 ? '¡Agrega tu primera noticia!' : 'No se encontraron noticias'}</h3>
                <p style="color: #cccccc; margin-bottom: 20px;">
                    ${searchQuery ? 'Prueba con otros términos de búsqueda' : 
                      news.length === 0 ? 'Usa el panel de administración para agregar noticias' : 'No hay noticias en esta categoría'}
                </p>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary" style="margin: 10px;">Limpiar búsqueda</button>' : 
                    ''
                }
                ${news.length === 0 ? 
                    '<button onclick="showAdminPanel()" class="btn btn-primary" style="margin: 10px;"><i class="fas fa-user-cog"></i> Ir al Panel Admin</button>' : 
                    ''
                }
                <button onclick="loadNewsFromGoogleSheets()" class="btn btn-secondary" style="margin: 10px;">
                    <i class="fas fa-redo"></i> Recargar desde Google Sheets
                </button>
            </div>
        `;
        return;
    }
    
    // Mostrar noticias
    filteredNews.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Clase de prioridad
        const priorityClass = item.priority.toLowerCase().replace(/[áéíóú]/g, function(match) {
            const map = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
            return map[match];
        });
        
        // Formatear fecha
        const formattedDate = formatDate(item.date);
        
        card.innerHTML = `
            <div class="recipe-image">
                <img src="${item.image}" alt="${item.title}" 
                     style="width:100%;height:200px;object-fit:cover;border-radius:8px 8px 0 0;">
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 3px 8px; border-radius: 3px; font-size: 0.8rem;">
                    ${item.priority}
                </div>
            </div>
            <div class="recipe-content">
                <div class="recipe-header">
                    <h3 class="recipe-title">${item.title}</h3>
                    <span class="recipe-difficulty ${priorityClass}">${item.country}</span>
                </div>
                <p class="recipe-description">${item.description}</p>
                <div class="recipe-meta">
                    <span class="recipe-category">${item.category}</span>
                    <span class="recipe-time"><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
                </div>
                <div class="recipe-actions">
                    <button class="view-recipe-btn" onclick="openNewsModal(${item.id})">
                        <i class="fas fa-book-open"></i> Leer Noticia
                    </button>
                    <button class="view-recipe-btn" onclick="generateEmbed(${item.id})" style="background-color: #6c757d;">
                        <i class="fas fa-code"></i> Embed
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
        .replace(/[áéíóú]/g, function(match) {
            const map = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
            return map[match];
        })
        .replace('economía', 'economia')
        .replace('tecnología', 'tecnologia')
        .replace('deportes', 'deportes')
        .replace('cultura', 'cultura')
        .replace('celebridades', 'celebridades');
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        return dateString;
    }
}

function updateNewsCounts() {
    // Actualizar contador total
    const totalElement = document.getElementById('total-news');
    if (totalElement) totalElement.textContent = news.length;
    
    // Actualizar contadores por categoría
    const categories = ['nacional', 'internacional', 'economia', 'tecnologia', 'deportes', 'cultura', 'celebridades'];
    categories.forEach(cat => {
        const count = news.filter(n => normalizeCategory(n.category) === cat).length;
        const element = document.getElementById(`count-${cat}`);
        if (element) element.textContent = `${count} noticia${count !== 1 ? 's' : ''}`;
    });
}

function updateTotalNews() {
    const element = document.getElementById('total-news');
    if (element) {
        element.textContent = news.length;
        // Animación del contador
        element.style.opacity = '0.5';
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        }, 50);
    }
}

// =============== MODAL DE NOTICIAS ===============
function openNewsModal(newsId) {
    console.log('Abriendo modal para noticia ID:', newsId);
    const item = news.find(n => n.id === newsId);
    if (!item) {
        console.error('Noticia no encontrada con ID:', newsId);
        return;
    }
    
    const modal = document.getElementById('recipe-modal');
    const title = document.getElementById('modal-recipe-title');
    const content = document.getElementById('modal-recipe-content');
    
    if (!modal || !title || !content) {
        console.error('Elementos del modal no encontrados');
        return;
    }
    
    title.textContent = item.title;
    
    const formattedDate = formatDate(item.date);
    
    // Clase de prioridad
    const priorityClass = item.priority.toLowerCase().replace(/[áéíóú]/g, function(match) {
        const map = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
        return map[match];
    });
    
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <div>
                <div style="color: #cccccc; font-size: 0.9rem; margin-bottom: 5px;">Categoría</div>
                <div style="font-weight: 500; color: white;">${item.category}</div>
            </div>
            <div>
                <div style="color: #cccccc; font-size: 0.9rem; margin-bottom: 5px;">País</div>
                <div style="font-weight: 500; color: white;">${item.country}</div>
            </div>
            <div>
                <div style="color: #cccccc; font-size: 0.9rem; margin-bottom: 5px;">Fecha</div>
                <div style="font-weight: 500; color: white;">${formattedDate}</div>
            </div>
            <div>
                <div style="color: #cccccc; font-size: 0.9rem; margin-bottom: 5px;">Prioridad</div>
                <div style="font-weight: 500; color: white;">
                    <span class="recipe-difficulty ${priorityClass}">${item.priority}</span>
                </div>
            </div>
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
            <img src="${item.image}" alt="${item.title}" 
                 style="max-width: 100%; max-height: 400px; border-radius: 10px; object-fit: cover; margin-bottom: 20px;">
            <p style="color: #cccccc; font-size: 0.9rem; font-style: italic;">${item.description}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
            <h4 style="color: #D4AF37; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #D4AF37;">
                <i class="fas fa-file-alt"></i> Contenido de la Noticia
            </h4>
            <div style="background-color: #333; padding: 25px; border-radius: 5px; white-space: pre-line; line-height: 1.8; border: 1px solid #444; font-size: 1.05rem;">
                ${item.content}
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 30px;">
            <div>
                <h4 style="color: #E6C158; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #E6C158;">
                    <i class="fas fa-info-circle"></i> Información Adicional
                </h4>
                <div style="background-color: #333; padding: 20px; border-radius: 5px; border: 1px solid #444;">
                    <div style="margin-bottom: 10px;">
                        <strong>Fuente:</strong> ${item.source}
                    </div>
                    <div style="margin-bottom: 10px;">
                        <strong>Fecha de publicación:</strong> ${formattedDate}
                    </div>
                    <div>
                        <strong>Categoría:</strong> ${item.category}
                    </div>
                </div>
            </div>
            
            <div>
                <h4 style="color: #E6C158; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #E6C158;">
                    <i class="fas fa-share-alt"></i> Compartir
                </h4>
                <div style="background-color: #333; padding: 20px; border-radius: 5px; text-align: center; border: 1px solid #444;">
                    <p style="color: #cccccc; margin-bottom: 15px;">Comparte esta noticia en redes sociales</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" style="padding: 8px 15px;" onclick="shareOnTwitter(${item.id})">
                            <i class="fab fa-twitter"></i> Twitter
                        </button>
                        <button class="btn btn-primary" style="padding: 8px 15px;" onclick="shareOnFacebook(${item.id})">
                            <i class="fab fa-facebook"></i> Facebook
                        </button>
                        <button class="btn btn-primary" style="padding: 8px 15px;" onclick="generateEmbed(${item.id})">
                            <i class="fas fa-code"></i> Embed
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background-color: rgba(212, 175, 55, 0.05); border-radius: 10px; border-left: 4px solid #D4AF37;">
            <h5 style="color: #D4AF37; margin-bottom: 10px;">
                <i class="fas fa-lightbulb"></i> Nota del Editor
            </h5>
            <p style="color: #cccccc; font-size: 0.95rem;">
                Esta noticia ha sido verificada por nuestro equipo editorial. Si tienes alguna información adicional o corrección, por favor contáctanos a través de nuestro correo electrónico.
            </p>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    console.log('Modal abierto correctamente');
}

function closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// =============== SISTEMA EMBED ===============
function setupEmbed() {
    console.log('🔧 Configurando sistema embed...');
    
    // Selector de tamaño
    const embedSizeSelect = document.getElementById('embed-size');
    if (embedSizeSelect) {
        embedSizeSelect.addEventListener('change', function() {
            const customSizeContainer = document.getElementById('custom-size-container');
            if (this.value === 'custom') {
                customSizeContainer.style.display = 'block';
            } else {
                customSizeContainer.style.display = 'none';
            }
            updateEmbedPreview();
        });
    }
    
    // Selector de tema
    const embedThemeSelect = document.getElementById('embed-theme');
    if (embedThemeSelect) {
        embedThemeSelect.addEventListener('change', updateEmbedPreview);
    }
    
    // Input de ancho personalizado
    const customWidthInput = document.getElementById('custom-width');
    if (customWidthInput) {
        customWidthInput.addEventListener('input', updateEmbedPreview);
    }
    
    // Botón copiar embed
    const copyEmbedBtn = document.getElementById('copy-embed-btn');
    if (copyEmbedBtn) {
        copyEmbedBtn.addEventListener('click', copyEmbedCode);
    }
    
    // Selector de noticias para embed
    const embedNewsSelect = document.getElementById('embed-news-select');
    if (embedNewsSelect) {
        embedNewsSelect.addEventListener('change', function() {
            const newsId = parseInt(this.value);
            if (newsId) {
                generateEmbed(newsId);
            }
        });
    }
    
    // Cargar selector de embed
    updateEmbedSelector();
}

function updateEmbedSelector() {
    const select = document.getElementById('embed-news-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecciona una noticia...</option>';
    
    news.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        const shortTitle = item.title.length > 50 ? item.title.substring(0, 47) + '...' : item.title;
        option.textContent = `${shortTitle} (${item.category})`;
        select.appendChild(option);
    });
}

function generateEmbed(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) {
        alert('Noticia no encontrada');
        return;
    }
    
    // Ir a la sección de embed
    document.getElementById('embed').scrollIntoView({ behavior: 'smooth' });
    
    // Seleccionar la noticia en el selector
    const embedSelect = document.getElementById('embed-news-select');
    if (embedSelect) {
        embedSelect.value = newsId;
    }
    
    // Actualizar vista previa y código
    updateEmbedPreview();
}

function updateEmbedPreview() {
    const embedSelect = document.getElementById('embed-news-select');
    const newsId = parseInt(embedSelect.value);
    
    if (!newsId) {
        // Mostrar placeholder
        const previewContent = document.getElementById('embed-preview-content');
        if (previewContent) {
            previewContent.innerHTML = `
                <div class="embed-preview-placeholder">
                    <i class="fas fa-code"></i>
                    <p>Selecciona una noticia para generar el código embed</p>
                </div>
            `;
        }
        document.getElementById('embed-code').value = '';
        return;
    }
    
    const item = news.find(n => n.id === newsId);
    if (!item) return;
    
    // Obtener configuraciones
    const size = document.getElementById('embed-size').value;
    const theme = document.getElementById('embed-theme').value;
    let width = 400; // Valor por defecto
    
    if (size === 'small') width = 300;
    else if (size === 'medium') width = 400;
    else if (size === 'large') width = 500;
    else if (size === 'custom') {
        const customWidth = document.getElementById('custom-width').value;
        width = parseInt(customWidth) || 400;
    }
    
    // Generar HTML para la vista previa
    const previewHTML = generateEmbedHTML(item, width, theme, true);
    const previewContent = document.getElementById('embed-preview-content');
    if (previewContent) {
        previewContent.innerHTML = previewHTML;
    }
    
    // Generar código embed
    const embedCode = generateEmbedCode(item, width, theme);
    document.getElementById('embed-code').value = embedCode;
}

function generateEmbedHTML(item, width, theme, isPreview = false) {
    const formattedDate = formatDate(item.date);
    const themeClass = theme === 'dark' ? 'embed-dark' : 'embed-light';
    
    return `
        <div class="embed-container ${themeClass}" style="width: ${width}px; max-width: 100%; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; margin: 0 auto;">
            <div class="embed-header" style="background-color: ${theme === 'dark' ? '#0A1428' : '#0056B3'}; color: white; padding: 15px; text-align: center;">
                <div style="font-weight: bold; font-size: 1.1em;">${siteSettings.siteTitle}</div>
                <div style="font-size: 0.9em; opacity: 0.9;">Noticia Destacada</div>
            </div>
            
            <div class="embed-image" style="height: 200px; overflow: hidden;">
                <img src="${item.image}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            
            <div class="embed-content" style="padding: 20px; background-color: ${theme === 'dark' ? '#1a1a1a' : '#ffffff'}; color: ${theme === 'dark' ? '#ffffff' : '#333333'};">
                <h3 style="margin: 0 0 10px 0; font-size: 1.2em; line-height: 1.3;">${item.title}</h3>
                <p style="margin: 0 0 15px 0; font-size: 0.95em; color: ${theme === 'dark' ? '#cccccc' : '#666666'};">
                    ${item.description}
                </p>
                
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85em; color: ${theme === 'dark' ? '#999999' : '#888888'}; margin-top: 15px; padding-top: 15px; border-top: 1px solid ${theme === 'dark' ? '#333' : '#eee'};">
                    <div>
                        <span style="display: inline-block; padding: 3px 8px; background-color: ${theme === 'dark' ? '#0056B3' : '#e6f2ff'}; color: ${theme === 'dark' ? 'white' : '#0056B3'}; border-radius: 3px; margin-right: 10px;">
                            ${item.category}
                        </span>
                        <span>${formattedDate}</span>
                    </div>
                    <div>
                        ${isPreview ? 
                            `<button style="background-color: ${theme === 'dark' ? '#C41230' : '#C41230'}; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                                Ver más
                            </button>` : 
                            `<a href="${window.location.origin}${window.location.pathname}#news" target="_blank" style="background-color: ${theme === 'dark' ? '#C41230' : '#C41230'}; color: white; text-decoration: none; padding: 8px 15px; border-radius: 4px; display: inline-block; font-size: 0.9em;">
                                Ver más
                            </a>`
                        }
                    </div>
                </div>
            </div>
            
            <div class="embed-footer" style="background-color: ${theme === 'dark' ? '#0a0a0a' : '#f8f9fa'}; color: ${theme === 'dark' ? '#999' : '#666'}; padding: 10px 20px; text-align: center; font-size: 0.8em; border-top: 1px solid ${theme === 'dark' ? '#333' : '#eee'};">
                <div>Fuente: ${item.source}</div>
                <div style="margin-top: 5px;">© ${new Date().getFullYear()} ${siteSettings.siteTitle}</div>
            </div>
        </div>
    `;
}

function generateEmbedCode(item, width, theme) {
    const siteUrl = window.location.origin + window.location.pathname;
    
    return `<!-- Embed para Zona Total Novedades -->
<div id="ztn-embed-${item.id}"></div>
<script>
    (function() {
        var embedData = {
            id: ${item.id},
            title: "${item.title.replace(/"/g, '\\"')}",
            description: "${item.description.replace(/"/g, '\\"')}",
            image: "${item.image}",
            category: "${item.category}",
            date: "${item.date}",
            source: "${item.source.replace(/"/g, '\\"')}",
            width: ${width},
            theme: "${theme}"
        };
        
        var embedDiv = document.getElementById('ztn-embed-${item.id}');
        var embedHTML = '<div style="width:' + embedData.width + 'px; max-width:100%; border:1px solid #ddd; border-radius:8px; overflow:hidden; font-family:Arial,sans-serif; margin:0 auto;">' +
            '<div style="background-color:' + (embedData.theme === 'dark' ? '#0A1428' : '#0056B3') + '; color:white; padding:15px; text-align:center;">' +
                '<div style="font-weight:bold; font-size:1.1em;">${siteSettings.siteTitle.replace(/"/g, '\\"')}</div>' +
                '<div style="font-size:0.9em; opacity:0.9;">Noticia Destacada</div>' +
            '</div>' +
            '<div style="height:200px; overflow:hidden;">' +
                '<img src="${item.image}" alt="${item.title.replace(/"/g, '\\"')}" style="width:100%; height:100%; object-fit:cover;">' +
            '</div>' +
            '<div style="padding:20px; background-color:' + (embedData.theme === 'dark' ? '#1a1a1a' : '#ffffff') + '; color:' + (embedData.theme === 'dark' ? '#ffffff' : '#333333') + ';">' +
                '<h3 style="margin:0 0 10px 0; font-size:1.2em; line-height:1.3;">${item.title.replace(/"/g, '\\"')}</h3>' +
                '<p style="margin:0 0 15px 0; font-size:0.95em; color:' + (embedData.theme === 'dark' ? '#cccccc' : '#666666') + ';">' +
                    '${item.description.replace(/"/g, '\\"')}' +
                '</p>' +
                '<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85em; color:' + (embedData.theme === 'dark' ? '#999999' : '#888888') + '; margin-top:15px; padding-top:15px; border-top:1px solid ' + (embedData.theme === 'dark' ? '#333' : '#eee') + ';">' +
                    '<div>' +
                        '<span style="display:inline-block; padding:3px 8px; background-color:' + (embedData.theme === 'dark' ? '#0056B3' : '#e6f2ff') + '; color:' + (embedData.theme === 'dark' ? 'white' : '#0056B3') + '; border-radius:3px; margin-right:10px;">' +
                            '${item.category}' +
                        '</span>' +
                        '<span>${formatDate(item.date)}</span>' +
                    '</div>' +
                    '<div>' +
                        '<a href="${siteUrl}#news" target="_blank" style="background-color:#C41230; color:white; text-decoration:none; padding:8px 15px; border-radius:4px; display:inline-block; font-size:0.9em;">' +
                            'Ver más' +
                        '</a>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div style="background-color:' + (embedData.theme === 'dark' ? '#0a0a0a' : '#f8f9fa') + '; color:' + (embedData.theme === 'dark' ? '#999' : '#666') + '; padding:10px 20px; text-align:center; font-size:0.8em; border-top:1px solid ' + (embedData.theme === 'dark' ? '#333' : '#eee') + ';">' +
                '<div>Fuente: ${item.source.replace(/"/g, '\\"')}</div>' +
                '<div style="margin-top:5px;">© ${new Date().getFullYear()} ${siteSettings.siteTitle.replace(/"/g, '\\"')}</div>' +
            '</div>' +
        '</div>';
        
        embedDiv.innerHTML = embedHTML;
    })();
</script>
<!-- Fin del embed -->`;
}

function copyEmbedCode() {
    const embedCode = document.getElementById('embed-code');
    if (!embedCode || !embedCode.value) {
        alert('No hay código para copiar. Primero selecciona una noticia.');
        return;
    }
    
    embedCode.select();
    embedCode.setSelectionRange(0, 99999); // Para móviles
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            alert('¡Código copiado al portapapeles! Ahora puedes pegarlo en tu sitio web.');
        } else {
            alert('Error al copiar el código. Intenta seleccionar y copiar manualmente.');
        }
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('Error al copiar el código. Intenta seleccionar y copiar manualmente.');
    }
}

// =============== ADMIN COMPLETO ===============
function setupAdmin() {
    console.log('🔧 Configurando panel admin...');
    
    // 1. Botón para abrir admin
    const adminAccessBtn = document.getElementById('admin-access-btn');
    if (adminAccessBtn) {
        adminAccessBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showAdminPanel();
        });
    }
    
    // 2. Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('admin-username').value;
            const password = document.getElementById('admin-password').value;
            
            // Credenciales válidas
            if (username === 'admin' && password === 'admin123') {
                console.log('✅ Login exitoso');
                document.getElementById('admin-login').style.display = 'none';
                document.getElementById('admin-panel').style.display = 'block';
                
                // Cargar noticias en el admin
                loadAdminNews();
                
                // Cargar configuración en el formulario
                loadSettingsForm();
                
                // Establecer fecha por defecto en formulario de agregar
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('new-recipe-date');
                if (dateInput) dateInput.value = today;
            } else {
                alert('Credenciales incorrectas. Usuario: admin, Contraseña: admin123');
            }
        });
    }
    
    // 3. Botón mostrar credenciales
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
    
    // 4. Cancelar login
    const cancelLoginBtn = document.getElementById('cancel-login-btn');
    if (cancelLoginBtn) {
        cancelLoginBtn.addEventListener('click', function() {
            document.getElementById('admin-overlay').style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Limpiar formulario
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
        });
    }
    
    // 5. Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            document.getElementById('admin-login').style.display = 'block';
            document.getElementById('admin-panel').style.display = 'none';
            document.getElementById('admin-overlay').style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Limpiar formulario
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
            
            // Ocultar credenciales
            const loginHint = document.getElementById('login-hint');
            if (loginHint) loginHint.classList.remove('active');
            const showCredsBtn = document.getElementById('show-creds-btn');
            if (showCredsBtn) showCredsBtn.textContent = 'Mostrar Credenciales';
        });
    }
    
    // 6. Tabs del admin
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remover active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Agregar active al seleccionado
            this.classList.add('active');
            const tabElement = document.getElementById(tabId);
            if (tabElement) tabElement.classList.add('active');
            
            // Si es la tab de noticias, cargarlas
            if (tabId === 'news-tab') {
                loadAdminNews();
            }
            // Si es la tab de editar, cargar selector
            if (tabId === 'edit-news-tab') {
                loadEditSelector();
            }
            // Si es la tab de configuración, cargar vista previa del logo
            if (tabId === 'settings-tab') {
                updateLogoPreview();
            }
        });
    });
    
    // 7. Formulario agregar noticia
    const addNewsForm = document.getElementById('add-recipe-form');
    if (addNewsForm) {
        addNewsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validar campos
            const title = document.getElementById('new-recipe-title').value;
            const description = document.getElementById('new-recipe-description').value;
            const category = document.getElementById('new-recipe-category').value;
            const country = document.getElementById('new-recipe-country').value;
            const date = document.getElementById('new-recipe-date').value;
            const priority = document.getElementById('new-recipe-priority').value;
            const image = document.getElementById('new-recipe-image').value;
            const content = document.getElementById('new-recipe-ingredients').value;
            const source = document.getElementById('new-recipe-instructions').value;
            
            if (!title || !description || !category || !country || !date || !image || !content || !source) {
                showFormStatus('Por favor, completa todos los campos obligatorios (*)', 'error');
                return;
            }
            
            // Crear nueva noticia con ID único
            const newId = news.length > 0 ? Math.max(...news.map(n => n.id)) + 1 : 1;
            const newNews = {
                id: newId,
                title: title,
                description: description,
                category: category,
                country: country,
                date: date,
                priority: priority,
                image: fixImageUrl(image),
                content: content,
                source: source
            };
            
            // Agregar a la lista
            news.unshift(newNews); // Agregar al principio
            
            // Guardar en localStorage
            saveNewsToLocalStorage();
            
            // Actualizar interfaz
            updateNewsCounts();
            updateTotalNews();
            renderNews();
            updateEmbedSelector();
            
            // Mostrar éxito
            showFormStatus('✅ Noticia agregada correctamente. Los cambios se guardaron localmente.', 'success');
            
            // Limpiar formulario
            addNewsForm.reset();
            
            // Establecer fecha actual
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('new-recipe-date').value = today;
            
            // Actualizar lista admin
            loadAdminNews();
            loadEditSelector();
            
            console.log('📰 Nueva noticia agregada:', newNews);
        });
    }
    
    // 8. Formulario editar noticia
    const editNewsForm = document.getElementById('edit-recipe-form');
    if (editNewsForm) {
        editNewsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newsId = parseInt(document.getElementById('edit-recipe-select').value);
            const newsIndex = news.findIndex(n => n.id === newsId);
            
            if (newsIndex === -1) {
                showEditFormStatus('Noticia no encontrada', 'error');
                return;
            }
            
            // Actualizar noticia
            news[newsIndex].title = document.getElementById('edit-recipe-title').value;
            news[newsIndex].description = document.getElementById('edit-recipe-description').value;
            news[newsIndex].category = document.getElementById('edit-recipe-category').value;
            news[newsIndex].country = document.getElementById('edit-recipe-country').value;
            news[newsIndex].date = document.getElementById('edit-recipe-date').value;
            news[newsIndex].priority = document.getElementById('edit-recipe-priority').value;
            news[newsIndex].image = fixImageUrl(document.getElementById('edit-recipe-image').value);
            news[newsIndex].content = document.getElementById('edit-recipe-ingredients').value;
            news[newsIndex].source = document.getElementById('edit-recipe-instructions').value;
            
            // Guardar cambios en localStorage
            saveNewsToLocalStorage();
            
            // Actualizar interfaz
            updateNewsCounts();
            updateTotalNews();
            renderNews();
            updateEmbedSelector();
            
            // Mostrar éxito
            showEditFormStatus('✅ Noticia actualizada correctamente. Los cambios se guardaron localmente.', 'success');
            
            // Actualizar lista admin
            loadAdminNews();
            loadEditSelector();
            
            console.log('📝 Noticia actualizada:', news[newsIndex]);
        });
    }
    
    // 9. Botón eliminar noticia
    const deleteBtn = document.getElementById('delete-recipe-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const newsId = parseInt(document.getElementById('edit-recipe-select').value);
            
            if (!newsId) {
                showEditFormStatus('Selecciona una noticia primero', 'error');
                return;
            }
            
            if (confirm('¿Estás seguro de eliminar esta noticia? Esta acción no se puede deshacer.')) {
                const newsIndex = news.findIndex(n => n.id === newsId);
                
                if (newsIndex !== -1) {
                    const deletedNews = news.splice(newsIndex, 1)[0];
                    
                    // Guardar cambios en localStorage
                    saveNewsToLocalStorage();
                    
                    // Actualizar interfaz
                    updateNewsCounts();
                    updateTotalNews();
                    renderNews();
                    updateEmbedSelector();
                    
                    // Limpiar formulario
                    editNewsForm.reset();
                    editNewsForm.style.display = 'none';
                    document.getElementById('edit-recipe-select').value = '';
                    
                    // Mostrar éxito
                    showEditFormStatus(`✅ Noticia "${deletedNews.title}" eliminada correctamente. Los cambios se guardaron localmente.`, 'success');
                    
                    // Actualizar lista admin
                    loadAdminNews();
                    loadEditSelector();
                }
            }
        });
    }
    
    // 10. Cancelar edición
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            document.getElementById('edit-recipe-form').reset();
            document.getElementById('edit-recipe-form').style.display = 'none';
            document.getElementById('edit-recipe-select').value = '';
            document.getElementById('edit-form-status').innerHTML = '';
        });
    }
    
    // 11. Configuración del sitio
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
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
    
    // 12. Cerrar admin con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const adminOverlay = document.getElementById('admin-overlay');
            if (adminOverlay && adminOverlay.style.display === 'flex') {
                document.getElementById('admin-overlay').style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });
    
    console.log('✅ Admin configurado correctamente');
}

function loadSettingsForm() {
    // Cargar valores actuales en el formulario de configuración
    document.getElementById('site-logo-url').value = siteSettings.logoUrl || '';
    document.getElementById('site-title').value = siteSettings.siteTitle;
    document.getElementById('site-description').value = siteSettings.siteDescription;
    document.getElementById('site-contact-email').value = siteSettings.contactEmail;
    document.getElementById('site-contact-phone').value = siteSettings.contactPhone;
    
    updateLogoPreview();
}

function updateLogoPreview() {
    const logoUrl = document.getElementById('site-logo-url').value;
    const logoPreview = document.getElementById('logo-preview');
    
    if (!logoPreview) return;
    
    if (logoUrl) {
        logoPreview.innerHTML = `
            <img src="${logoUrl}" alt="Logo preview" 
                 style="max-height: 60px; max-width: 200px; object-fit: contain;">
            <div style="margin-top: 10px; font-size: 0.9em; color: #666;">
                Vista previa del logo
            </div>
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

function saveSettings() {
    // Obtener valores del formulario
    siteSettings.logoUrl = document.getElementById('site-logo-url').value.trim();
    siteSettings.siteTitle = document.getElementById('site-title').value.trim();
    siteSettings.siteDescription = document.getElementById('site-description').value.trim();
    siteSettings.contactEmail = document.getElementById('site-contact-email').value.trim();
    siteSettings.contactPhone = document.getElementById('site-contact-phone').value.trim();
    
    // Validar
    if (!siteSettings.siteTitle) {
        showSettingsStatus('El título del sitio es requerido', 'error');
        return;
    }
    
    // Guardar configuración
    if (saveSiteSettings()) {
        // Aplicar cambios inmediatamente
        applySiteSettings();
        
        // Actualizar vista previa del logo
        updateLogoPreview();
        
        // Mostrar mensaje de éxito
        showSettingsStatus('✅ Configuración guardada correctamente. Los cambios se aplicaron inmediatamente.', 'success');
        
        console.log('⚙️ Configuración actualizada:', siteSettings);
    } else {
        showSettingsStatus('Error al guardar la configuración', 'error');
    }
}

function showAdminPanel() {
    console.log('👤 Mostrando panel admin');
    document.getElementById('admin-overlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Mostrar credenciales automáticamente
    const loginHint = document.getElementById('login-hint');
    if (loginHint) loginHint.classList.add('active');
}

function loadAdminNews() {
    console.log('📋 Cargando noticias en panel admin...');
    const adminNewsList = document.getElementById('admin-recipes-list');
    
    if (!adminNewsList) return;
    
    if (news.length === 0) {
        adminNewsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #cccccc;">
                <i class="fas fa-newspaper" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <p>No hay noticias cargadas.</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Usa el formulario "Agregar Noticia" para comenzar.</p>
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
                    <div><strong>Prioridad:</strong> ${item.priority}</div>
                </div>
            </div>
        `;
    });
    
    adminNewsList.innerHTML = html;
    console.log(`✅ ${news.length} noticias cargadas en admin`);
}

function loadEditSelector() {
    const select = document.getElementById('edit-recipe-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Seleccionar noticia...</option>';
    
    news.forEach(item => {
        const option = document.createElement('option');
        option.value = item.id;
        const shortTitle = item.title.length > 50 ? item.title.substring(0, 47) + '...' : item.title;
        option.textContent = `${shortTitle} (${item.category} - ${formatDate(item.date)})`;
        select.appendChild(option);
    });
    
    // Event listener para cargar noticia seleccionada
    select.addEventListener('change', function() {
        const newsId = parseInt(this.value);
        if (newsId) {
            loadNewsToEdit(newsId);
        } else {
            document.getElementById('edit-recipe-form').style.display = 'none';
        }
    });
}

function loadNewsToEdit(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;
    
    // Cargar datos en formulario
    document.getElementById('edit-recipe-title').value = item.title;
    document.getElementById('edit-recipe-description').value = item.description;
    document.getElementById('edit-recipe-category').value = item.category;
    document.getElementById('edit-recipe-country').value = item.country;
    document.getElementById('edit-recipe-date').value = item.date;
    document.getElementById('edit-recipe-priority').value = item.priority;
    document.getElementById('edit-recipe-image').value = item.image;
    document.getElementById('edit-recipe-ingredients').value = item.content;
    document.getElementById('edit-recipe-instructions').value = item.source;
    
    // Mostrar formulario
    document.getElementById('edit-recipe-form').style.display = 'block';
}

function showFormStatus(message, type) {
    const statusDiv = document.getElementById('form-status');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = `
        <div style="padding: 15px; border-radius: 4px; margin-top: 10px; 
                    background-color: ${type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}; 
                    border-left: 4px solid ${type === 'success' ? '#4CAF50' : '#F44336'}; 
                    color: ${type === 'success' ? '#4CAF50' : '#F44336'};">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

function showEditFormStatus(message, type) {
    const statusDiv = document.getElementById('edit-form-status');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = `
        <div style="padding: 15px; border-radius: 4px; margin-top: 10px; 
                    background-color: ${type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}; 
                    border-left: 4px solid ${type === 'success' ? '#4CAF50' : '#F44336'}; 
                    color: ${type === 'success' ? '#4CAF50' : '#F44336'};">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

function showSettingsStatus(message, type) {
    const statusDiv = document.getElementById('settings-status');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = `
        <div style="padding: 15px; border-radius: 4px; margin-top: 10px; 
                    background-color: ${type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}; 
                    border-left: 4px solid ${type === 'success' ? '#4CAF50' : '#F44336'}; 
                    color: ${type === 'success' ? '#4CAF50' : '#F44336'};">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 5000);
}

// =============== FUNCIONES GLOBALES ===============
window.clearSearch = function() {
    searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderNews();
};

// Funciones de compartir
window.shareOnTwitter = function(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;
    
    const text = encodeURIComponent(`📰 ${item.title} - ${siteSettings.siteTitle}`);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
};

window.shareOnFacebook = function(newsId) {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
};

// Asegurar que las funciones sean globales
window.openNewsModal = openNewsModal;
window.closeModal = closeModal;
window.loadNewsFromGoogleSheets = loadNewsFromGoogleSheets;
window.loadNewsToEdit = loadNewsToEdit;
window.clearSearch = clearSearch;
window.showAdminPanel = showAdminPanel;
window.generateEmbed = generateEmbed;
