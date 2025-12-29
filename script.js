// =============== CONFIGURACIÓN SIMPLE ===============
// URL de tu archivo JSON en GitHub
const NEWS_JSON_URL = 'https://github.com/merencioreyna-sudo/zonatotalnovedades/blob/main/news.json';

// Variables globales
let news = [];
let currentCategory = "todos";
let searchQuery = "";

// =============== INICIALIZACIÓN ===============
document.addEventListener('DOMContentLoaded', function() {
    console.log('Zona Total Novedades - Iniciando...');
    
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
    
    // Cargar noticias
    loadNews();
});

// =============== CARGAR NOTICIAS DESDE JSON ===============
async function loadNews() {
    try {
        console.log('📥 Cargando noticias...');
        
        // Intentar cargar desde JSON
        const response = await fetch(NEWS_JSON_URL);
        
        if (response.ok) {
            news = await response.json();
            console.log(`✅ ${news.length} noticias cargadas desde JSON`);
        } else {
            // Si falla, usar noticias de ejemplo
            throw new Error('No se pudo cargar el JSON');
        }
        
    } catch (error) {
        console.log('❌ Usando noticias de ejemplo:', error);
        news = getExampleNews();
    }
    
    updateNewsCounts();
    renderNews();
}

// =============== NOTICIAS DE EJEMPLO ===============
function getExampleNews() {
    return [
        {
            id: 1,
            title: "Avances en Inteligencia Artificial",
            description: "Nuevos algoritmos revolucionan la medicina con diagnósticos más precisos.",
            category: "Tecnología",
            country: "EE.UU.",
            date: "2024-03-15",
            priority: "Alta",
            image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800",
            content: "Contenido completo de la noticia sobre IA...",
            source: "Nature Medicine"
        },
        {
            id: 2,
            title: "Nuevo Éxito de Artista Internacional",
            description: "El cantante rompe récords con su última gira mundial.",
            category: "Celebridades",
            country: "Internacional",
            date: "2024-03-14",
            priority: "Media",
            image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
            content: "Detalles sobre el éxito del artista...",
            source: "Revista Billboard"
        }
    ];
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
            const catId = n.category.toLowerCase().replace(/[áéíóú]/g, function(match) {
                const map = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
                return map[match];
            });
            return catId === currentCategory;
        });
    }
    
    if (searchQuery) {
        filteredNews = filteredNews.filter(n => {
            const searchText = (n.title + ' ' + n.description).toLowerCase();
            return searchText.includes(searchQuery);
        });
    }
    
    // Si no hay noticias
    if (filteredNews.length === 0) {
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <i class="fas fa-newspaper" style="font-size: 4rem; color: #0056B3; margin-bottom: 20px;"></i>
                <h3 style="color: #1A1A1A; margin-bottom: 15px;">No se encontraron noticias</h3>
                <p style="color: #6C757D; margin-bottom: 20px;">
                    ${searchQuery ? 'Prueba con otros términos de búsqueda' : 'No hay noticias en esta categoría'}
                </p>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary" style="margin: 10px;">Limpiar búsqueda</button>' : 
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
        
        const priorityClass = item.priority.toLowerCase();
        const formattedDate = new Date(item.date).toLocaleDateString('es-ES');
        
        card.innerHTML = `
            <div class="recipe-image">
                <img src="${item.image}" alt="${item.title}" 
                     style="width:100%;height:220px;object-fit:cover;">
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
                    <span><i class="fas fa-flag"></i> ${item.country}</span>
                </div>
            </div>
        `;
        newsGrid.appendChild(card);
    });
}

// =============== FUNCIONES AUXILIARES ===============
function updateNewsCounts() {
    // Actualizar contador total
    const totalElement = document.getElementById('total-news');
    if (totalElement) totalElement.textContent = news.length;
    
    // Actualizar contadores por categoría
    const categories = ['nacional', 'internacional', 'economia', 'tecnologia', 'deportes', 'cultura', 'celebridades'];
    
    categories.forEach(cat => {
        const count = news.filter(n => {
            const catId = n.category.toLowerCase().replace(/[áéíóú]/g, function(match) {
                const map = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u'};
                return map[match];
            });
            return catId === cat;
        }).length;
        
        const element = document.getElementById(`count-${cat}`);
        if (element) element.textContent = `${count} noticia${count !== 1 ? 's' : ''}`;
    });
}

// Funciones globales
window.clearSearch = function() {
    searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderNews();
};

window.openNewsModal = function(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;
    
    alert(`Noticia: ${item.title}\n\n${item.content}`);
};
