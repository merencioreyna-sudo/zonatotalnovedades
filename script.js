// Zona Total - Noticias
// Script principal para cargar noticias desde Google Sheets
// Versión corregida - Carga completa y ordenada

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Zona Total Noticias - Iniciando...');
    loadNews();
    
    // Sincronizar cada 30 segundos
    setInterval(syncWithGoogleSheets, 30000);
});

// URL de Google Sheets (TU URL)
const GOOGLE_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ/gviz/tq?tqx=out:csv&sheet=Noticias';

// Variable global para almacenar noticias
let allNews = [];

// Función principal para cargar noticias
async function loadNews() {
    console.log('📥 Cargando noticias desde Google Sheets...');
    console.log('🔗 URL:', GOOGLE_SHEETS_URL);
    
    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('📄 CSV recibido (primeras 500 chars):', csvText.substring(0, 500));
        
        // Parsear el CSV correctamente
        allNews = parseCSV(csvText);
        console.log(`✅ Total noticias cargadas: ${allNews.length}`);
        
        if (allNews.length > 0) {
            console.log('📰 Primera noticia:', allNews[0]);
            displayNews(allNews);
            updateCounters(allNews);
        } else {
            showNoNewsMessage();
        }
        
    } catch (error) {
        console.error('❌ Error cargando noticias:', error);
        showErrorMessage();
    }
}

// Función para parsear CSV CORREGIDA
function parseCSV(csvText) {
    console.log('🔧 Parseando CSV...');
    
    // Limpiar el texto del CSV
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
        console.warn('⚠️ CSV tiene menos de 2 líneas');
        return [];
    }
    
    // Obtener headers (primera línea)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('📋 Headers encontrados:', headers);
    
    const news = [];
    
    // Procesar cada línea de datos
    for (let i = 1; i < lines.length; i++) {
        let line = lines[i];
        
        // Manejar comas dentro de campos entre comillas
        const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
        let matches;
        const values = [];
        
        while ((matches = regex.exec(line)) !== null) {
            values.push(matches[1].replace(/"/g, '').trim());
        }
        
        // Si no coincide con regex, intentar split simple
        if (values.length !== headers.length) {
            console.warn(`⚠️ Línea ${i}: valores no coinciden, usando split simple`);
            const simpleValues = line.split(',').map(v => v.trim().replace(/"/g, ''));
            if (simpleValues.length >= headers.length) {
                for (let j = 0; j < headers.length; j++) {
                    values[j] = simpleValues[j] || '';
                }
            }
        }
        
        // Crear objeto de noticia solo si tenemos valores suficientes
        if (values.length >= headers.length) {
            const newsItem = {};
            for (let j = 0; j < headers.length; j++) {
                newsItem[headers[j]] = values[j] || '';
            }
            news.push(newsItem);
            console.log(`📝 Noticia ${i} parseada:`, newsItem.Título || 'Sin título');
        } else {
            console.warn(`❌ Línea ${i} ignorada: valores insuficientes`);
        }
    }
    
    console.log(`📊 Total noticias parseadas: ${news.length}`);
    return news;
}

// Función para mostrar noticias CORREGIDA
function displayNews(newsArray) {
    console.log('🎨 Mostrando noticias...');
    
    const newsContainer = document.getElementById('news-container');
    const newsGrid = document.getElementById('news-grid');
    const featuredContainer = document.getElementById('featured-news');
    
    if (!newsContainer || !newsGrid || !featuredContainer) {
        console.error('❌ Contenedores de noticias no encontrados');
        return;
    }
    
    // Limpiar contenedores
    newsGrid.innerHTML = '';
    featuredContainer.innerHTML = '';
    
    if (newsArray.length === 0) {
        showNoNewsMessage();
        return;
    }
    
    // ORDENAR noticias: Primero por Prioridad "Alta", luego por fecha más reciente
    const sortedNews = [...newsArray].sort((a, b) => {
        // Primero por prioridad
        if (a.Prioridad === 'Alta' && b.Prioridad !== 'Alta') return -1;
        if (a.Prioridad !== 'Alta' && b.Prioridad === 'Alta') return 1;
        
        // Luego intentar ordenar por fecha (si tienen formato de fecha)
        try {
            const dateA = parseDate(a.Fecha);
            const dateB = parseDate(b.Fecha);
            if (dateA && dateB) {
                return dateB - dateA; // Más reciente primero
            }
        } catch (e) {
            console.warn('Error parseando fechas:', e);
        }
        
        return 0;
    });
    
    // Separar noticias destacadas (prioridad Alta)
    const featuredNews = sortedNews.filter(news => news.Prioridad === 'Alta');
    const regularNews = sortedNews.filter(news => news.Prioridad !== 'Alta');
    
    // Mostrar noticias destacadas
    if (featuredNews.length > 0) {
        featuredNews.forEach((news, index) => {
            if (index < 3) { // Máximo 3 destacadas
                const featuredCard = createFeaturedCard(news);
                featuredContainer.appendChild(featuredCard);
            }
        });
    }
    
    // Mostrar noticias regulares
    regularNews.forEach(news => {
        const newsCard = createNewsCard(news);
        newsGrid.appendChild(newsCard);
    });
    
    // Si no hay noticias destacadas, mostrar las primeras 3 como destacadas
    if (featuredNews.length === 0 && sortedNews.length > 0) {
        for (let i = 0; i < Math.min(3, sortedNews.length); i++) {
            const featuredCard = createFeaturedCard(sortedNews[i]);
            featuredContainer.appendChild(featuredCard);
        }
    }
    
    console.log(`✅ Mostradas ${sortedNews.length} noticias (${featuredNews.length} destacadas)`);
}

// Función auxiliar para parsear fechas
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Intentar diferentes formatos de fecha
    const formats = [
        'd [de] MMMM [de] yyyy', // 1 de enero de 2026
        'dd/MM/yyyy',
        'MM/dd/yyyy',
        'yyyy-MM-dd'
    ];
    
    for (let format of formats) {
        try {
            if (format.includes('de')) {
                // Manejar formato en español
                const parts = dateStr.toLowerCase().split(' de ');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    const monthStr = parts[1];
                    const year = parseInt(parts[2]);
                    
                    const months = {
                        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
                        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
                        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
                    };
                    
                    if (months[monthStr] !== undefined) {
                        return new Date(year, months[monthStr], day);
                    }
                }
            }
        } catch (e) {
            continue;
        }
    }
    
    return new Date(dateStr); // Último intento
}

// Función para crear tarjeta de noticia destacada
function createFeaturedCard(news) {
    const card = document.createElement('div');
    card.className = 'featured-card';
    
    const imageUrl = news.Imagen || 'https://via.placeholder.com/800x400?text=Zona+Total+Noticias';
    const category = news.Categoría || 'General';
    const country = news.País || 'Internacional';
    
    card.innerHTML = `
        <div class="featured-image">
            <img src="${imageUrl}" alt="${news.Título || 'Noticia'}">
            <div class="featured-badge">Destacado</div>
        </div>
        <div class="featured-content">
            <div class="news-meta">
                <span class="news-category">${category}</span>
                <span class="news-country">${country}</span>
                <span class="news-date">${news.Fecha || 'Fecha no disponible'}</span>
            </div>
            <h3 class="featured-title">${news.Título || 'Sin título'}</h3>
            <p class="featured-description">${news.Descripción || news.Contenido?.substring(0, 150) || 'Descripción no disponible'}...</p>
            <div class="featured-actions">
                <button class="read-more" onclick="openNewsModal('${encodeURIComponent(JSON.stringify(news))}')">
                    Leer más
                </button>
                <span class="news-priority ${news.Prioridad?.toLowerCase() || 'media'}">
                    ${news.Prioridad || 'Normal'}
                </span>
            </div>
        </div>
    `;
    
    return card;
}

// Función para crear tarjeta de noticia regular
function createNewsCard(news) {
    const card = document.createElement('div');
    card.className = 'news-card';
    
    const imageUrl = news.Imagen || 'https://via.placeholder.com/400x250?text=Zona+Total';
    const category = news.Categoría || 'General';
    const country = news.País || 'Internacional';
    
    card.innerHTML = `
        <div class="news-image">
            <img src="${imageUrl}" alt="${news.Título || 'Noticia'}">
            <div class="category-badge">${category}</div>
        </div>
        <div class="news-content">
            <div class="news-meta">
                <span class="news-country">${country}</span>
                <span class="news-date">${news.Fecha || 'Fecha no disponible'}</span>
            </div>
            <h3 class="news-title">${news.Título || 'Sin título'}</h3>
            <p class="news-description">${news.Descripción || news.Contenido?.substring(0, 100) || 'Descripción no disponible'}...</p>
            <div class="news-actions">
                <button class="read-more-btn" onclick="openNewsModal('${encodeURIComponent(JSON.stringify(news))}')">
                    Leer completo
                </button>
                <span class="priority-badge ${news.Prioridad?.toLowerCase() || 'media'}">
                    ${news.Prioridad || 'Normal'}
                </span>
            </div>
        </div>
    `;
    
    return card;
}

// Función para abrir modal con noticia completa
function openNewsModal(newsJSON) {
    try {
        const news = JSON.parse(decodeURIComponent(newsJSON));
        const modal = document.getElementById('news-modal');
        const modalContent = document.getElementById('modal-news-content');
        
        if (!modal || !modalContent) {
            alert('Error: No se puede mostrar la noticia completa');
            return;
        }
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <div class="modal-meta">
                    <span class="modal-category">${news.Categoría || 'General'}</span>
                    <span class="modal-country">${news.País || 'Internacional'}</span>
                    <span class="modal-date">${news.Fecha || ''}</span>
                    <span class="modal-priority ${news.Prioridad?.toLowerCase() || 'media'}">
                        ${news.Prioridad || 'Normal'}
                    </span>
                </div>
                <h2 class="modal-title">${news.Título || 'Sin título'}</h2>
                <button class="modal-close" onclick="closeNewsModal()">&times;</button>
            </div>
            <div class="modal-body">
                ${news.Imagen ? `<img src="${news.Imagen}" alt="${news.Título}" class="modal-image">` : ''}
                <div class="modal-description">
                    <h3>Resumen</h3>
                    <p>${news.Descripción || ''}</p>
                </div>
                <div class="modal-full-content">
                    <h3>Contenido completo</h3>
                    <p>${news.Contenido || 'Contenido no disponible'}</p>
                </div>
                ${news.Fuente ? `<div class="modal-source"><strong>Fuente:</strong> ${news.Fuente}</div>` : ''}
            </div>
        `;
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error abriendo modal:', error);
        alert('Error al cargar la noticia completa');
    }
}

// Función para cerrar modal
function closeNewsModal() {
    const modal = document.getElementById('news-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('news-modal');
    if (event.target === modal) {
        closeNewsModal();
    }
};

// Actualizar contadores
function updateCounters(newsArray) {
    console.log('🔢 Actualizando contadores...');
    
    const totalNewsElement = document.getElementById('total-news');
    const categoriesElement = document.getElementById('categories-count');
    const countriesElement = document.getElementById('countries-count');
    
    if (!totalNewsElement) {
        console.warn('⚠️ Elemento total-news no encontrado');
        return;
    }
    
    totalNewsElement.textContent = newsArray.length;
    console.log(`📊 Noticias disponibles: ${newsArray.length}`);
    
    // Calcular categorías únicas
    if (categoriesElement) {
        const categories = [...new Set(newsArray.map(n => n.Categoría).filter(Boolean))];
        categoriesElement.textContent = categories.length;
    }
    
    // Calcular países únicos
    if (countriesElement) {
        const countries = [...new Set(newsArray.map(n => n.País).filter(Boolean))];
        countriesElement.textContent = countries.length;
    }
}

// Mostrar mensaje cuando no hay noticias
function showNoNewsMessage() {
    const newsGrid = document.getElementById('news-grid');
    const featuredContainer = document.getElementById('featured-news');
    
    if (newsGrid) {
        newsGrid.innerHTML = `
            <div class="no-news-message">
                <h3>📭 No hay noticias disponibles</h3>
                <p>Agrega noticias en Google Sheets para verlas aquí.</p>
                <p>La página se actualizará automáticamente.</p>
            </div>
        `;
    }
    
    if (featuredContainer) {
        featuredContainer.innerHTML = '';
    }
}

// Mostrar mensaje de error
function showErrorMessage() {
    const newsGrid = document.getElementById('news-grid');
    if (newsGrid) {
        newsGrid.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Error cargando noticias</h3>
                <p>No se pudieron cargar las noticias desde Google Sheets.</p>
                <p>Verifica la conexión e intenta nuevamente.</p>
                <button onclick="loadNews()" class="retry-btn">Reintentar</button>
            </div>
        `;
    }
}

// Sincronizar con Google Sheets
function syncWithGoogleSheets() {
    console.log('🔄 Sincronizando con Google Sheets...');
    loadNews();
}

// Filtrar noticias por categoría
function filterByCategory(category) {
    console.log(`🔍 Filtrando por categoría: ${category}`);
    
    if (category === 'all') {
        displayNews(allNews);
        updateActiveFilter('all');
    } else {
        const filteredNews = allNews.filter(news => 
            news.Categoría && news.Categoría.toLowerCase() === category.toLowerCase()
        );
        displayNews(filteredNews);
        updateActiveFilter(category);
    }
}

// Actualizar filtro activo
function updateActiveFilter(selectedCategory) {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        if (btn.dataset.category === selectedCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Función para buscar noticias
function searchNews() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    console.log(`🔎 Buscando: "${searchTerm}"`);
    
    if (!searchTerm) {
        displayNews(allNews);
        return;
    }
    
    const filteredNews = allNews.filter(news => {
        return (
            (news.Título && news.Título.toLowerCase().includes(searchTerm)) ||
            (news.Descripción && news.Descripción.toLowerCase().includes(searchTerm)) ||
            (news.Contenido && news.Contenido.toLowerCase().includes(searchTerm)) ||
            (news.Categoría && news.Categoría.toLowerCase().includes(searchTerm)) ||
            (news.País && news.País.toLowerCase().includes(searchTerm))
        );
    });
    
    displayNews(filteredNews);
}

// Inicializar cuando se carga la página
window.onload = function() {
    console.log('🌐 Página cargada - Zona Total Noticias');
    loadNews();
    
    // Configurar búsqueda al presionar Enter
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchNews();
            }
        });
    }
    
    // Configurar botón de búsqueda
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchNews);
    }
};
