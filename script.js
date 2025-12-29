// =============== CONFIGURACIÓN ===============
// Usando Google Sheets como "base de datos" simple
const GOOGLE_SHEETS_ID = '1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ';
const SHEET_GID = '1201005628';
const GOOGLE_SHEETS_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_ID}/export?format=csv&gid=${SHEET_GID}`;

// Variables globales
let news = [];
let currentCategory = "todos";
let searchQuery = "";

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
    
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    
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
            loadNews();
        });
    }
    
    // Configurar Admin
    setupAdmin();
    
    // Cargar noticias
    loadNews();
});

// =============== CARGAR NOTICIAS ===============
async function loadNews() {
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
        
        console.log(`✅ Total: ${news.length} noticias cargadas`);
        
        // Si no hay noticias, mostrar algunas de ejemplo
        if (news.length === 0) {
            console.log('⚠️ No hay noticias, mostrando ejemplos');
            news = getExampleNews();
        }
        
        // Actualizar interfaz
        updateNewsCounts();
        updateTotalNews();
        renderNews();
        
        // Ocultar estados
        document.getElementById('loading-recipes').style.display = 'none';
        
    } catch (error) {
        console.log('❌ Error cargando noticias:', error);
        
        // Usar noticias de ejemplo si hay error
        news = getExampleNews();
        
        updateNewsCounts();
        updateTotalNews();
        renderNews();
        document.getElementById('loading-recipes').style.display = 'none';
        document.getElementById('error-recipes').style.display = 'none';
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

function getExampleNews() {
    return [
        {
            id: 1,
            title: "Avances en Inteligencia Artificial Revolucionan la Medicina",
            description: "Nuevos algoritmos de IA permiten diagnósticos más precisos y tratamientos personalizados.",
            category: "Tecnología",
            country: "EE.UU.",
            date: "2024-03-15",
            priority: "Alta",
            image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&auto=format&fit=crop&q=80",
            content: "Un equipo de investigadores de la Universidad de Stanford ha desarrollado un nuevo sistema de inteligencia artificial capaz de diagnosticar enfermedades con una precisión del 98%. El sistema, que ha sido entrenado con millones de imágenes médicas, podría revolucionar el campo de la medicina diagnóstica.\n\nLos expertos aseguran que esta tecnología permitirá detectar enfermedades en etapas más tempranas, lo que aumentará significativamente las tasas de supervivencia. Además, el sistema es capaz de personalizar tratamientos basándose en el perfil genético de cada paciente.",
            source: "Nature Medicine"
        },
        {
            id: 2,
            title: "Acuerdo Histórico en la Cumbre Climática Global",
            description: "Más de 150 países firman un acuerdo para reducir las emisiones de carbono en un 50% para 2030.",
            category: "Internacional",
            country: "Francia",
            date: "2024-03-14",
            priority: "Alta",
            image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
            content: "En una cumbre histórica celebrada en París, líderes mundiales de más de 150 países han alcanzado un acuerdo sin precedentes para combatir el cambio climático. El acuerdo establece metas ambiciosas para reducir las emisiones de gases de efecto invernadero en un 50% para el año 2030.\n\nEl presidente francés destacó que este acuerdo marca 'un punto de inflexión en la lucha contra el cambio climático'. Los países desarrollados se han comprometido a proporcionar 100 mil millones de dólares anuales a partir de 2025 para ayudar a los países en desarrollo en su transición energética.",
            source: "ONU - United Nations"
        },
        {
            id: 3,
            title: "Economía Nacional Registra Crecimiento del 3.5% en el Primer Trimestre",
            description: "Los indicadores económicos muestran una recuperación sólida impulsada por el sector tecnológico y exportaciones.",
            category: "Nacional",
            country: "España",
            date: "2024-03-13",
            priority: "Media",
            image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
            content: "El Instituto Nacional de Estadística ha publicado los datos del primer trimestre del año, mostrando un crecimiento del 3.5% en el PIB nacional. Este crecimiento supera las expectativas de los analistas, que pronosticaban un aumento del 2.8%.\n\nEl sector tecnológico ha sido el principal motor de este crecimiento, con un aumento del 12% en su producción. Las exportaciones también han mostrado un comportamiento positivo, creciendo un 8% respecto al mismo periodo del año anterior. Los expertos señalan que estos datos indican una recuperación sólida de la economía nacional.",
            source: "INE - Instituto Nacional de Estadística"
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
                <h3 style="color: white; margin-bottom: 15px;">No se encontraron noticias</h3>
                <p style="color: #cccccc; margin-bottom: 20px;">
                    ${searchQuery ? 'Prueba con otros términos de búsqueda' : 'No hay noticias en esta categoría'}
                </p>
                ${searchQuery ? 
                    '<button onclick="clearSearch()" class="btn btn-primary" style="margin: 10px;">Limpiar búsqueda</button>' : 
                    ''
                }
                <button onclick="loadNews()" class="btn btn-secondary" style="margin: 10px;">
                    <i class="fas fa-redo"></i> Recargar noticias
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
                    <span><i class="fas fa-flag"></i> ${item.country}</span>
                </div>
            </div>
        `;
        newsGrid.appendChild(card);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function updateNewsCounts() {
    // Actualizar contador total
    const totalElement = document.getElementById('total-news');
    if (totalElement) totalElement.textContent = news.length;
    
    // Actualizar contadores por categoría
    const categories = ['nacional', 'internacional', 'economia', 'tecnologia', 'deportes', 'cultura'];
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

function updateTotalNews() {
    const element = document.getElementById('total-news');
    if (element) element.textContent = news.length;
}

// =============== MODAL DE NOTICIAS ===============
function openNewsModal(newsId) {
    const item = news.find(n => n.id === newsId);
    if (!item) return;
    
    const modal = document.getElementById('recipe-modal');
    const title = document.getElementById('modal-recipe-title');
    const content = document.getElementById('modal-recipe-content');
    
    if (!modal || !title || !content) return;
    
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
                        <button class="btn btn-primary" style="padding: 8px 15px;">
                            <i class="fab fa-twitter"></i> Twitter
                        </button>
                        <button class="btn btn-primary" style="padding: 8px 15px;">
                            <i class="fab fa-facebook"></i> Facebook
                        </button>
                        <button class="btn btn-primary" style="padding: 8px 15px;">
                            <i class="fab fa-whatsapp"></i> WhatsApp
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
}

function closeModal() {
    const modal = document.getElementById('recipe-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
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
            console.log('👤 Click en botón Admin');
            document.getElementById('admin-overlay').style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Mostrar credenciales automáticamente
            const loginHint = document.getElementById('login-hint');
            if (loginHint) loginHint.classList.add('active');
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
                
                // Establecer fecha por defecto en formulario de agregar
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('new-recipe-date').value = today;
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
            document.getElementById(tabId).classList.add('active');
            
            // Si es la tab de noticias, cargarlas
            if (tabId === 'news-tab') {
                loadAdminNews();
            }
            // Si es la tab de editar, cargar selector
            if (tabId === 'edit-news-tab') {
                loadEditSelector();
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
            
            // Crear nueva noticia
            const newNews = {
                id: news.length + 1,
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
            
            // Actualizar interfaz
            updateNewsCounts();
            updateTotalNews();
            renderNews();
            
            // Mostrar éxito
            showFormStatus('✅ Noticia agregada correctamente. Los cambios se reflejan en todos los dispositivos.', 'success');
            
            // Limpiar formulario
            addNewsForm.reset();
            
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
            
            // Actualizar interfaz
            updateNewsCounts();
            updateTotalNews();
            renderNews();
            
            // Mostrar éxito
            showEditFormStatus('✅ Noticia actualizada correctamente. Los cambios se reflejan en todos los dispositivos.', 'success');
            
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
            
            if (confirm('¿Estás seguro de eliminar esta noticia?')) {
                const newsIndex = news.findIndex(n => n.id === newsId);
                
                if (newsIndex !== -1) {
                    news.splice(newsIndex, 1);
                    
                    // Actualizar interfaz
                    updateNewsCounts();
                    updateTotalNews();
                    renderNews();
                    
                    // Limpiar formulario
                    editNewsForm.reset();
                    editNewsForm.style.display = 'none';
                    document.getElementById('edit-recipe-select').value = '';
                    
                    // Mostrar éxito
                    showEditFormStatus('✅ Noticia eliminada correctamente. Los cambios se reflejan en todos los dispositivos.', 'success');
                    
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
    
    console.log('✅ Admin configurado correctamente');
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
                <button onclick="loadNews()" class="btn btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-redo"></i> Cargar Noticias
                </button>
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
        option.textContent = `${item.title} (${item.category} - ${formatDate(item.date)})`;
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

// =============== FUNCIONES GLOBALES ===============
window.clearSearch = function() {
    searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    renderNews();
};

window.openNewsModal = openNewsModal;
window.closeModal = closeModal;
window.loadNews = loadNews;
window.loadNewsToEdit = loadNewsToEdit;