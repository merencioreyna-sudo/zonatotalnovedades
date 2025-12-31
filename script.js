// =============== CONFIGURACIÓN ===============
let GOOGLE_SHEETS_ID = '1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ'; // EJEMPLO
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

// =============== GOOGLE SHEETS INTEGRATION ===============
async function loadNewsFromGoogleSheets() {
    try {
        console.log('📥 Cargando noticias desde Google Sheets...');
        
        // Mostrar estado de carga
        document.getElementById('loading-recipes').style.display = 'flex';
        document.getElementById('error-recipes').style.display = 'none';
        
        // Construir URL de Google Sheets
        const sheetsUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;
        
        console.log('URL de Google Sheets:', sheetsUrl);
        
        // Hacer la petición
        const response = await fetch(sheetsUrl);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV recibido (primeros 500 chars):', csvText.substring(0, 500));
        
        // Parsear CSV CORREGIDO
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        news = [];
        
        // Saltar encabezados (primera línea)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            // Usar parseCSVLine mejorado
            const values = parseCSVLineImproved(line);
            
            // Verificar que tenemos al menos 8 columnas (ajusta según tu estructura)
            if (values.length >= 8) {
                const newsItem = {
                    id: i,
                    title: (values[0] || '').trim() || 'Sin título',
                    description: (values[1] || '').trim() || 'Sin descripción',
                    category: (values[2] || '').trim() || 'Nacional',
                    country: (values[3] || '').trim() || 'No especificado',
                    date: (values[4] || '').trim() || new Date().toISOString().split('T')[0],
                    priority: (values[5] || '').trim() || 'Media',
                    image: fixImageUrl((values[6] || '').trim()),
                    content: (values[7] || '').trim() || 'Sin contenido',
                    source: (values[8] || '').trim() || 'Fuente no disponible',
                    embedCode: (values[9] || '').trim() || '' // Código embed (opcional)
                };
                
                // Solo agregar si tiene título
                if (newsItem.title !== 'Sin título') {
                    news.push(newsItem);
                }
                
                console.log(`Noticia ${i} cargada:`, newsItem.title.substring(0, 50));
            } else if (values.length > 0) {
                console.warn(`Fila ${i} tiene solo ${values.length} columnas:`, values);
            }
        }
        
        console.log(`✅ ${news.length} noticias cargadas desde Google Sheets`);
        
        // Actualizar interfaz
        updateNewsCounts();
        renderNews();
        
        // Ocultar estado de carga
        document.getElementById('loading-recipes').style.display = 'none';
        
        // Actualizar estado en admin
        updateSyncStatus(true, news.length);
        
    } catch (error) {
        console.error('❌ Error cargando desde Google Sheets:', error);
        
        // Mostrar error
        document.getElementById('loading-recipes').style.display = 'none';
        document.getElementById('error-recipes').style.display = 'flex';
        document.getElementById('error-message').textContent = 
            `Error al conectar con Google Sheets: ${error.message}. 
             Asegúrate de que la hoja de cálculo esté compartida públicamente.`;
        
        // Actualizar estado en admin
        updateSyncStatus(false, 0);
        
        // Intentar cargar desde localStorage como respaldo
        setTimeout(() => {
            if (news.length === 0) {
                loadFromLocalStorage();
            }
        }, 1000);
    }
}

// FUNCIÓN MEJORADA PARA PARSEAR CSV
function parseCSVLineImproved(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Comilla doble dentro de comillas
                current += '"';
                i++; // Saltar la siguiente comilla
            } else {
                // Inicio o fin de comillas
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Fin de campo
            result.push(current);
            current = '';
        } else {
            // Carácter normal
            current += char;
        }
    }
    
    // Agregar el último campo
    result.push(current);
    
    return result.map(v => v.trim());
}

function fixImageUrl(url) {
    if (!url || url.trim() === '' || url === 'null') {
        return DEFAULT_IMAGE;
    }
    
    let fixedUrl = url.trim();
    
    // Si es Unsplash, agregar parámetros para mejor rendimiento
    if (fixedUrl.includes('unsplash.com') && !fixedUrl.includes('?')) {
        fixedUrl += '?w=800&auto=format&fit=crop&q=80';
    }
    
    // Si es Imgur sin extensión, agregar .jpg
    if (fixedUrl.includes('imgur.com') && !fixedUrl.includes('.jpg') && !fixedUrl.includes('.png')) {
        const parts = fixedUrl.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.length > 0 && !lastPart.includes('.')) {
            fixedUrl = `https://i.imgur.com/${lastPart}.jpg`;
        }
    }
    
    return fixedUrl;
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
    console.log('🔄 Iniciando exportación a CSV...');
    console.log('📊 Noticias disponibles para exportar:', news.length);
    
    if (news.length === 0) {
        alert('⚠️ No hay noticias para exportar. Agrega noticias primero.');
        return;
    }
    
    try {
        // Encabezados (deben coincidir con tu Google Sheets)
        const headers = ['Título', 'Descripción', 'Categoría', 'País', 'Fecha', 'Prioridad', 'Imagen', 'Contenido', 'Fuente', 'Embed'];
        
        // Crear filas comenzando con encabezados
        const rows = [headers];
        
        // Agregar cada noticia
        news.forEach((item, index) => {
            console.log(`📝 Procesando noticia ${index + 1}: ${item.title.substring(0, 30)}...`);
            
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
        
        // Convertir a CSV (formato correcto)
        let csvContent = '';
        rows.forEach(row => {
            const escapedRow = row.map(cell => {
                // Escapar comillas dobles
                let escaped = String(cell).replace(/"/g, '""');
                // Si tiene comas, saltos de línea o comillas, encerrar en comillas
                if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
                    escaped = `"${escaped}"`;
                }
                return escaped;
            });
            csvContent += escapedRow.join(',') + '\r\n';
        });
        
        console.log('✅ CSV generado, longitud:', csvContent.length, 'caracteres');
        
        // Crear y descargar archivo
        const blob = new Blob(['\ufeff' + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `noticias_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar memoria
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // Mostrar mensaje de éxito
        const successMsg = `✅ CSV exportado correctamente.<br><br>
            <strong>Archivo descargado:</strong> noticias_${new Date().toISOString().split('T')[0]}.csv<br><br>
            <strong>Para subir a Google Sheets:</strong><br>
            1. Abre tu Google Sheets<br>
            2. Ve a "Archivo" → "Importar" → "Subir"<br>
            3. Selecciona el archivo CSV descargado<br>
            4. Elige "Reemplazar hoja de cálculo"<br>
            5. ¡Listo! Tus noticias estarán en Google Sheets`;
        
        // Mostrar en el panel admin
        const formStatus = document.getElementById('form-status');
        if (formStatus) {
            formStatus.innerHTML = `
                <div style="padding: 15px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; margin-top: 20px; color: #155724;">
                    ${successMsg}
                </div>
            `;
        }
        
        // También mostrar alerta
        alert(`✅ CSV exportado correctamente.\n\nSe descargó el archivo: noticias_${new Date().toISOString().split('T')[0]}.csv\n\nAbre Google Sheets y sube este archivo para sincronizar.`);
        
    } catch (error) {
        console.error('❌ Error al exportar CSV:', error);
        alert(`❌ Error al exportar CSV: ${error.message}`);
        
        // Mostrar error en el panel
        const formStatus = document.getElementById('form-status');
        if (formStatus) {
            formStatus.innerHTML = `
                <div style="padding: 15px; background: #f8d7da; border-left: 4px solid #dc3545; border-radius: 4px; margin-top: 20px; color: #721c24;">
                    ❌ Error al exportar CSV: ${error.message}
                </div>
            `;
        }
    }
}

// =============== PERSISTENCIA LOCAL (BACKUP) ===============
function loadFromLocalStorage() {
    try {
        const savedNews = localStorage.getItem('zona_total_novedades');
        if (savedNews) {
            news = JSON.parse(savedNews);
            console.log('📂 Noticias cargadas desde localStorage:', news.length);
            updateNewsCounts();
            renderNews();
            return true;
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
            const catId = normalizeCategory(n.category);
            return catId === currentCategory;
        });
    }
    
    if (searchQuery) {
        filteredNews = filteredNews.filter(n => {
            const searchText = (n.title + ' ' + n.description + ' ' + n.category + ' ' + n.country).toLowerCase();
            return searchText.includes(searchQuery);
        });
    }
    
    // Ordenar por prioridad y fecha
    filteredNews.sort((a, b) => {
        const priorityOrder = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
        if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.date) - new Date(a.date);
    });
    
    // Si no hay noticias
    if (filteredNews.length === 0) {
        const message = searchQuery ? 
            'No se encontraron noticias con esos términos de búsqueda.' :
            'No hay noticias disponibles en este momento.';
        
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-newspaper" style="font-size: 4rem; color: #6c757d; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3 style="color: var(--text-dark); margin-bottom: 15px; font-weight: 400;">
                    ${searchQuery ? 'Búsqueda sin resultados' : 'Sin noticias disponibles'}
                </h3>
                <p style="color: var(--text-gray); margin-bottom: 25px; max-width: 600px; margin-left: auto; margin-right: auto;">
                    ${message}
                </p>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary" style="margin: 5px;">Limpiar búsqueda</button>' : 
                    ''
                }
            </div>
        `;
        return;
    }
    
    // Mostrar noticias - SIN BOTÓN "VER EMBED" PARA USUARIOS
    filteredNews.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        const priorityClass = item.priority.toLowerCase();
        const formattedDate = formatDate(item.date);
        
        // SOLO BOTÓN "LEER NOTICIA" - SIN BOTÓN "VER EMBED"
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
                    <!-- SE ELIMINÓ EL BOTÓN "VER EMBED" PARA USUARIOS NORMALES -->
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
        .replace('tecnología', 'tecnologia');
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

// =============== MODAL DE NOTICIAS - CORREGIDO ===============
function openNewsModal(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;
    
    const modal = document.getElementById('recipe-modal');
    const title = document.getElementById('modal-recipe-title');
    const content = document.getElementById('modal-recipe-content');
    
    if (!modal || !title || !content) return;
    
    title.textContent = item.title;
    
    const formattedDate = formatDate(item.date);
    const priorityClass = item.priority.toLowerCase();
    const hasEmbed = item.embedCode && item.embedCode.trim() !== '';
    
    // CONSTRUIR CONTENIDO DEL MODAL DE FORMA ORDENADA
    let modalContent = `
        <div style="margin-bottom: 30px;">
            <!-- Imagen principal -->
            <div style="text-align: center; margin-bottom: 25px;">
                <img src="${item.image}" alt="${item.title}" 
                     style="max-width: 100%; max-height: 400px; border-radius: 10px; object-fit: cover; margin-bottom: 15px;">
                <p style="color: #666; font-size: 1.1rem; font-style: italic; margin-bottom: 5px;">
                    ${item.description}
                </p>
            </div>
            
            <!-- Información de la noticia en formato tabla -->
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
                            <span class="recipe-difficulty ${priorityClass}">${item.priority}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Contenido de la noticia (formateado correctamente)
    modalContent += `
        <div style="margin-bottom: 30px;">
            <h4 style="color: var(--primary-dark); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--primary-blue);">
                <i class="fas fa-file-alt"></i> Contenido Completo
            </h4>
            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 1px solid var(--border-color); line-height: 1.8; font-size: 1.05rem; white-space: pre-line;">
                ${item.content}
            </div>
        </div>
    `;
    
    // Si tiene embed, agregar sección especial (solo visible si admin quiere mostrar embed)
    if (hasEmbed && window.location.hash === '#admin') {
        modalContent += `
            <div style="margin: 30px 0; padding: 20px; background: #e8f4fd; border-radius: 8px; border-left: 4px solid #007bff;">
                <h4 style="color: #007bff; margin-bottom: 15px;">
                    <i class="fas fa-code"></i> Contenido Incrustado (Solo Admin)
                </h4>
                <div style="background: white; padding: 15px; border-radius: 4px; border: 1px solid #dee2e6; max-height: 300px; overflow-y: auto;">
                    <div style="margin-bottom: 15px;">
                        <strong>Vista previa del embed:</strong>
                    </div>
                    <div id="embed-preview-${item.id}" style="transform: scale(0.8); transform-origin: top left;">
                        <!-- El embed se cargará aquí -->
                    </div>
                    <div style="margin-top: 15px; text-align: center;">
                        <button onclick="copyEmbedCode(${item.id})" 
                                style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-copy"></i> Copiar Código Embed
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Información adicional (fuente, etc.)
    modalContent += `
        <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 10px; border-left: 4px solid var(--accent-red);">
            <h5 style="color: var(--accent-red); margin-bottom: 10px;">
                <i class="fas fa-info-circle"></i> Información Adicional
            </h5>
            <div style="color: #666; font-size: 0.95rem;">
                <p><strong>Fuente:</strong> ${item.source}</p>
                <p><strong>Fecha de publicación:</strong> ${formattedDate}</p>
                <p><strong>Prioridad:</strong> ${item.priority}</p>
            </div>
        </div>
    `;
    
    content.innerHTML = modalContent;
    
    // Cargar el embed después de mostrar el modal (solo si es admin)
    if (hasEmbed && window.location.hash === '#admin') {
        setTimeout(() => {
            const embedContainer = document.getElementById(`embed-preview-${item.id}`);
            if (embedContainer) {
                embedContainer.innerHTML = item.embedCode;
            }
        }, 100);
    }
    
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

// =============== FUNCIONES EMBED (solo para admin) ===============
function copyEmbedCode(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item || !item.embedCode) {
        alert('Esta noticia no tiene código embed');
        return;
    }
    
    const textarea = document.createElement('textarea');
    textarea.value = item.embedCode;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        alert('✅ Código embed copiado al portapapeles.\n\nAhora puedes pegarlo en tu sitio web.');
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('Error al copiar. Por favor, selecciona y copia manualmente.');
    }
    
    document.body.removeChild(textarea);
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
    
    if (modalClose) modalClose.addEventListener('click', () => closeModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal());
    
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
            
            // Actualizar botones de filtro
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.category === category) {
                    btn.classList.add('active');
                }
            });
            
            // Scroll suave a noticias
            document.getElementById('news').scrollIntoView({ behavior: 'smooth' });
            renderNews();
        });
    });
}

function setupStateButtons() {
    // Botón de reintento
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadNewsFromGoogleSheets();
        });
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
    console.log('🔧 Configurando panel admin...');
    
    // Botón para abrir admin
    const adminAccessBtn = document.getElementById('admin-access-btn');
    if (adminAccessBtn) {
        adminAccessBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
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
                
                // Cargar datos en admin
                loadAdminNews();
                loadEditSelector();
                loadSettingsForm();
                
                // Establecer fecha actual
                const today = new Date().toISOString().split('T')[0];
                const dateInput = document.getElementById('new-recipe-date');
                if (dateInput) dateInput.value = today;
                
            } else {
                alert('Credenciales incorrectas. Usuario: admin, Contraseña: admin123');
            }
        });
    }
    
    // Botón mostrar credenciales
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
    
    // Cancelar login
    const cancelLoginBtn = document.getElementById('cancel-login-btn');
    if (cancelLoginBtn) {
        cancelLoginBtn.addEventListener('click', hideAdminPanel);
    }
    
    // Logout
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
            
            // Remover active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Agregar active al seleccionado
            this.classList.add('active');
            const tabElement = document.getElementById(tabId);
            if (tabElement) tabElement.classList.add('active');
            
            // Acciones específicas por tab
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
        addNewsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Obtener valores
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
            
            // Validar
            if (!title || !description || !category || !country || !date || !image || !content || !source) {
                showFormStatus('Por favor, completa todos los campos obligatorios (*)', 'error');
                return;
            }
            
            // Crear nueva noticia
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
            
            // Agregar a la lista LOCAL
            news.unshift(newNews);
            
            // Guardar en localStorage
            saveToLocalStorage();
            
            // Actualizar interfaz
            updateNewsCounts();
            renderNews();
            
            // Mostrar éxito con instrucciones
            const successMsg = `
                ✅ Noticia agregada localmente.<br>
                <strong>Para guardar en Google Sheets:</strong><br>
                1. Ve a la pestaña "Sincronizar"<br>
                2. Haz clic en "Exportar a CSV"<br>
                3. Copia el contenido y pégalo en Google Sheets
            `;
            
            showFormStatus(successMsg, 'success');
            
            // Limpiar formulario
            addNewsForm.reset();
            
            // Establecer fecha actual
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('new-recipe-date').value = today;
            
            // Actualizar admin
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
                showEditFormStatus('Noticia no encontrada', 'error');
                return;
            }
            
            // Actualizar noticia LOCALMENTE
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
            
            // Guardar LOCALMENTE
            saveToLocalStorage();
            
            // Actualizar interfaz
            updateNewsCounts();
            renderNews();
            
            // Mostrar éxito
            showEditFormStatus('✅ Noticia actualizada localmente.', 'success');
            
            // Actualizar admin
            loadAdminNews();
            loadEditSelector();
        });
    }
    
    // Botón eliminar (LOCAL)
    const deleteBtn = document.getElementById('delete-recipe-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            const newsId = parseInt(document.getElementById('edit-recipe-select').value);
            
            if (!newsId) {
                showEditFormStatus('Selecciona una noticia primero', 'error');
                return;
            }
            
            if (confirm('¿Estás seguro de eliminar esta noticia LOCALMENTE?')) {
                const newsIndex = news.findIndex(n => n.id === newsId);
                
                if (newsIndex !== -1) {
                    news.splice(newsIndex, 1);
                    saveToLocalStorage();
                    updateNewsCounts();
                    renderNews();
                    
                    // Limpiar formulario
                    editNewsForm.reset();
                    editNewsForm.style.display = 'none';
                    document.getElementById('edit-recipe-select').value = '';
                    
                    showEditFormStatus('✅ Noticia eliminada localmente.', 'success');
                    loadAdminNews();
                    loadEditSelector();
                }
            }
        });
    }
    
    // Cancelar edición
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            editNewsForm.reset();
            editNewsForm.style.display = 'none';
            document.getElementById('edit-recipe-select').value = '';
            document.getElementById('edit-form-status').innerHTML = '';
        });
    }
    
    // Selector de edición
    const editSelect = document.getElementById('edit-recipe-select');
    if (editSelect) {
        editSelect.addEventListener('change', function() {
            const newsId = parseInt(this.value);
            if (newsId) {
                loadNewsToEdit(newsId);
            } else {
                document.getElementById('edit-recipe-form').style.display = 'none';
                document.getElementById('edit-form-status').innerHTML = '';
            }
        });
    }
}

// =============== SINCRO FUNCTIONS ===============
function setupSyncFunctions() {
    console.log('🔄 Configurando funciones de sincronización...');
    
    // Sincronizar ahora (solo lectura desde Google Sheets)
    const syncBtn = document.getElementById('sync-now-btn');
    if (syncBtn) {
        console.log('✅ Botón sincronizar encontrado');
        syncBtn.addEventListener('click', function() {
            console.log('🔄 Clic en botón sincronizar');
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            this.disabled = true;
            
            loadNewsFromGoogleSheets();
            
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-cloud-download-alt"></i> Cargar de Google Sheets';
                this.disabled = false;
            }, 2000);
        });
    } else {
        console.error('❌ Botón sync-now-btn NO encontrado');
    }
    
    // Exportar a CSV
    const exportBtn = document.getElementById('export-news-btn');
    if (exportBtn) {
        console.log('✅ Botón exportar encontrado, agregando event listener...');
        
        // Agregar event listener CORRECTAMENTE
        exportBtn.addEventListener('click', function(e) {
            console.log('🔄 Clic en botón exportar CSV');
            e.preventDefault();
            e.stopPropagation();
            
            // Cambiar texto del botón mientras procesa
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando CSV...';
            this.disabled = true;
            
            // Llamar a la función de exportación
            exportAllToCSV();
            
            // Restaurar botón después de 2 segundos
            setTimeout(() => {
                this.innerHTML = originalText;
                this.disabled = false;
            }, 2000);
        });
        
        // También hacerlo disponible globalmente por si acaso
        window.exportCSV = function() {
            exportAllToCSV();
        };
        
    } else {
        console.error('❌ Botón export-news-btn NO encontrado');
    }
    
    // Actualizar lista local
    const refreshBtn = document.getElementById('refresh-news-btn');
    if (refreshBtn) {
        console.log('✅ Botón refrescar encontrado');
        refreshBtn.addEventListener('click', function() {
            renderNews();
            loadAdminNews();
            loadEditSelector();
            showFormStatus('✅ Lista de noticias actualizada.', 'success');
        });
    }
}

function setupSettingsForm() {
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', function() {
            // Obtener valores
            siteSettings.googleSheetsId = document.getElementById('google-sheets-id').value.trim();
            siteSettings.logoUrl = document.getElementById('site-logo-url').value.trim();
            siteSettings.siteTitle = document.getElementById('site-title').value.trim();
            siteSettings.siteDescription = document.getElementById('site-description').value.trim();
            
            // Validar
            if (!siteSettings.siteTitle) {
                showSettingsStatus('El título del sitio es requerido', 'error');
                return;
            }
            
            // Guardar
            if (saveSiteSettings()) {
                // Actualizar Google Sheets ID
                if (siteSettings.googleSheetsId) {
                    GOOGLE_SHEETS_ID = siteSettings.googleSheetsId;
                }
                
                // Aplicar cambios
                applySiteSettings();
                updateLogoPreview();
                
                showSettingsStatus('✅ Configuración guardada correctamente.', 'success');
            } else {
                showSettingsStatus('Error al guardar la configuración', 'error');
            }
        });
    }
    
    // Reset logo
    const resetLogoBtn = document.getElementById('reset-logo-btn');
    if (resetLogoBtn) {
        resetLogoBtn.addEventListener('click', function() {
            document.getElementById('site-logo-url').value = '';
            updateLogoPreview();
        });
    }
    
    // Logo preview
    const logoUrlInput = document.getElementById('site-logo-url');
    if (logoUrlInput) {
        logoUrlInput.addEventListener('input', updateLogoPreview);
    }
}

function setupAdminEvents() {
    // Cerrar admin con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const adminOverlay = document.getElementById('admin-overlay');
            if (adminOverlay && adminOverlay.style.display === 'flex') {
                hideAdminPanel();
            }
        }
    });
    
    // Cerrar admin haciendo clic fuera
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
    
    // Mostrar credenciales
    const loginHint = document.getElementById('login-hint');
    if (loginHint) loginHint.classList.add('active');
}

function hideAdminPanel() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Limpiar
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('edit-recipe-form').reset();
    document.getElementById('edit-recipe-form').style.display = 'none';
    document.getElementById('edit-recipe-select').value = '';
    
    // Ocultar credenciales
    const loginHint = document.getElementById('login-hint');
    if (loginHint) loginHint.classList.remove('active');
    const showCredsBtn = document.getElementById('show-creds-btn');
    if (showCredsBtn) showCredsBtn.textContent = 'Mostrar Credenciales';
    
    // Limpiar mensajes
    document.getElementById('form-status').innerHTML = '';
    document.getElementById('edit-form-status').innerHTML = '';
    document.getElementById('settings-status').innerHTML = '';
}

function loadAdminNews() {
    const adminNewsList = document.getElementById('admin-recipes-list');
    
    if (!adminNewsList) return;
    
    if (news.length === 0) {
        adminNewsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-gray);">
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
        const hasEmbed = item.embedCode && item.embedCode.trim() !== '';
        
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
                    <div style="grid-column:1/-1;margin-top:10px;">
                        <strong>Embed:</strong> 
                        <span style="color:${hasEmbed ? '#28a745' : '#dc3545'};">
                            ${hasEmbed ? '✅ Disponible' : '❌ No disponible'}
                        </span>
                    </div>
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
        option.textContent = `${shortTitle} (${item.category} - ${formatDate(item.date)})`;
        select.appendChild(option);
    });
}

function loadNewsToEdit(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) {
        showEditFormStatus('Noticia no encontrada', 'error');
        return;
    }
    
    // Cargar datos
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
    
    // Mostrar formulario
    document.getElementById('edit-recipe-form').style.display = 'block';
    document.getElementById('edit-form-status').innerHTML = '';
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
                 style="max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 10px;">
            <div style="font-size: 0.9em; color: #666;">
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

function showFormStatus(message, type) {
    const statusDiv = document.getElementById('form-status');
    showStatus(statusDiv, message, type);
}

function showEditFormStatus(message, type) {
    const statusDiv = document.getElementById('edit-form-status');
    showStatus(statusDiv, message, type);
}

function showSettingsStatus(message, type) {
    const statusDiv = document.getElementById('settings-status');
    showStatus(statusDiv, message, type);
}

function showStatus(element, message, type) {
    if (!element) return;
    
    element.innerHTML = `
        <div style="padding: 15px; border-radius: 4px; margin-top: 10px; 
                    background-color: ${type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 
                                      type === 'error' ? 'rgba(244, 67, 54, 0.1)' : 
                                      type === 'info' ? 'rgba(23, 162, 184, 0.1)' : 'rgba(255, 193, 7, 0.1)'}; 
                    border-left: 4px solid ${type === 'success' ? '#4CAF50' : 
                                           type === 'error' ? '#F44336' : 
                                           type === 'info' ? '#17A2B8' : '#FFC107'}; 
                    color: ${type === 'success' ? '#4CAF50' : 
                            type === 'error' ? '#F44336' : 
                            type === 'info' ? '#17A2B8' : '#FFC107'};">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        if (element) element.innerHTML = '';
    }, 5000);
}

// =============== FUNCIONES GLOBALES ===============
window.clearSearch = function() {
    searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderNews();
};

// Hacer las funciones disponibles globalmente
window.exportAllToCSV = exportAllToCSV;
window.openNewsModal = openNewsModal;
window.closeModal = closeModal;
window.copyEmbedCode = copyEmbedCode;
window.clearSearch = clearSearch;
window.showAdminPanel = showAdminPanel;
