// =============== CONFIGURACIÓN ===============
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
    
    // Cargar noticias desde localStorage
    loadNewsFromLocalStorage();
    
    // Cargar configuración del sitio
    loadSiteSettings();
    
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
            
            // Scroll suave a noticias
            document.getElementById('news').scrollIntoView({ behavior: 'smooth' });
            renderNews();
        });
    });
    
    // Botón de reintento
    const retryBtn = document.getElementById('retry-load-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            // Ya no cargamos de Google Sheets
            renderNews();
        });
    }
    
    // Configurar Admin
    setupAdmin();
    
    // Renderizar noticias iniciales
    renderNews();
    
    // Establecer fecha actual en formulario de agregar
    setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('new-recipe-date');
        if (dateInput) dateInput.value = today;
    }, 100);
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
    
    // Aplicar título del sitio en la página
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

// =============== PERSISTENCIA LOCAL ===============
function saveNewsToLocalStorage() {
    try {
        localStorage.setItem('zona_total_novedades', JSON.stringify(news));
        console.log('💾 Noticias guardadas en localStorage:', news.length);
        return true;
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
        return false;
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
    const loadingElement = document.getElementById('loading-recipes');
    const errorElement = document.getElementById('error-recipes');
    
    if (!newsGrid) return;
    
    // Ocultar estados
    if (loadingElement) loadingElement.style.display = 'none';
    if (errorElement) errorElement.style.display = 'none';
    
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
    
    // Ordenar por prioridad y fecha (las más recientes primero)
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
    
    // Mostrar noticias
    filteredNews.forEach(item => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        
        // Clase de prioridad
        const priorityClass = item.priority.toLowerCase();
        
        // Formatear fecha
        const formattedDate = formatDate(item.date);
        
        card.innerHTML = `
            <div class="recipe-image">
                <img src="${item.image || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80'}" alt="${item.title}" 
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
    const priorityClass = item.priority.toLowerCase();
    
    // Generar contenido del embed si existe
    let embedContent = '';
    if (item.embedCode && item.embedCode.trim() !== '') {
        embedContent = `
            <div style="margin: 30px 0;">
                <h4 style="color: #D4AF37; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #D4AF37;">
                    <i class="fas fa-code"></i> Contenido Incrustado
                </h4>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; overflow: auto;">
                    ${item.embedCode}
                </div>
            </div>
        `;
    }
    
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
            <div>
                <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">Categoría</div>
                <div style="font-weight: 500; color: var(--text-dark);">${item.category}</div>
            </div>
            <div>
                <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">País</div>
                <div style="font-weight: 500; color: var(--text-dark);">${item.country}</div>
            </div>
            <div>
                <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">Fecha</div>
                <div style="font-weight: 500; color: var(--text-dark);">${formattedDate}</div>
            </div>
            <div>
                <div style="color: #666; font-size: 0.9rem; margin-bottom: 5px;">Prioridad</div>
                <div style="font-weight: 500; color: var(--text-dark);">
                    <span class="recipe-difficulty ${priorityClass}">${item.priority}</span>
                </div>
            </div>
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
            <img src="${item.image || 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&auto=format&fit=crop&q=80'}" alt="${item.title}" 
                 style="max-width: 100%; max-height: 400px; border-radius: 10px; object-fit: cover; margin-bottom: 20px;">
            <p style="color: #666; font-size: 1.1rem; font-style: italic; margin-bottom: 20px;">${item.description}</p>
        </div>
        
        ${embedContent}
        
        <div style="margin-bottom: 30px;">
            <h4 style="color: var(--primary-blue); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--primary-blue);">
                <i class="fas fa-file-alt"></i> Contenido de la Noticia
            </h4>
            <div style="background-color: var(--light-bg); padding: 25px; border-radius: 8px; white-space: pre-line; line-height: 1.8; border: 1px solid var(--border-color); font-size: 1.05rem;">
                ${item.content}
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 30px;">
            <div>
                <h4 style="color: var(--accent-red); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--accent-red);">
                    <i class="fas fa-info-circle"></i> Información Adicional
                </h4>
                <div style="background-color: var(--light-bg); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
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
                <h4 style="color: var(--accent-red); margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid var(--accent-red);">
                    <i class="fas fa-share-alt"></i> Compartir
                </h4>
                <div style="background-color: var(--light-bg); padding: 20px; border-radius: 8px; text-align: center; border: 1px solid var(--border-color);">
                    <p style="color: #666; margin-bottom: 15px;">Comparte esta noticia en redes sociales</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" style="padding: 8px 15px;" onclick="shareOnTwitter(${item.id})">
                            <i class="fab fa-twitter"></i> Twitter
                        </button>
                        <button class="btn btn-primary" style="padding: 8px 15px;" onclick="shareOnFacebook(${item.id})">
                            <i class="fab fa-facebook"></i> Facebook
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background-color: rgba(0, 86, 179, 0.05); border-radius: 10px; border-left: 4px solid var(--primary-blue);">
            <h5 style="color: var(--primary-blue); margin-bottom: 10px;">
                <i class="fas fa-lightbulb"></i> Nota del Editor
            </h5>
            <p style="color: #666; font-size: 0.95rem;">
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
            
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            
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
                
                // Cargar selector de edición
                loadEditSelector();
                
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
            hideAdminPanel();
        });
    }
    
    // 5. Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            hideAdminPanel();
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
            const title = document.getElementById('new-recipe-title').value.trim();
            const description = document.getElementById('new-recipe-description').value.trim();
            const category = document.getElementById('new-recipe-category').value;
            const country = document.getElementById('new-recipe-country').value.trim();
            const date = document.getElementById('new-recipe-date').value;
            const priority = document.getElementById('new-recipe-priority').value;
            const image = document.getElementById('new-recipe-image').value.trim();
            const content = document.getElementById('new-recipe-ingredients').value.trim();
            const source = document.getElementById('new-recipe-instructions').value.trim();
            const embedCode = document.getElementById('new-recipe-embed').value.trim();
            
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
                image: image,
                content: content,
                source: source,
                embedCode: embedCode
            };
            
            // Agregar a la lista
            news.unshift(newNews); // Agregar al principio
            
            // Guardar en localStorage
            if (saveNewsToLocalStorage()) {
                // Actualizar interfaz
                updateNewsCounts();
                updateTotalNews();
                renderNews();
                
                // Mostrar éxito
                showFormStatus('✅ Noticia agregada correctamente. Los cambios se guardaron permanentemente.', 'success');
                
                // Limpiar formulario
                addNewsForm.reset();
                
                // Establecer fecha actual
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('new-recipe-date').value = today;
                
                // Actualizar lista admin
                loadAdminNews();
                loadEditSelector();
                
                console.log('📰 Nueva noticia agregada:', newNews);
            } else {
                showFormStatus('❌ Error al guardar la noticia. Intenta nuevamente.', 'error');
            }
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
            news[newsIndex].title = document.getElementById('edit-recipe-title').value.trim();
            news[newsIndex].description = document.getElementById('edit-recipe-description').value.trim();
            news[newsIndex].category = document.getElementById('edit-recipe-category').value;
            news[newsIndex].country = document.getElementById('edit-recipe-country').value.trim();
            news[newsIndex].date = document.getElementById('edit-recipe-date').value;
            news[newsIndex].priority = document.getElementById('edit-recipe-priority').value;
            news[newsIndex].image = document.getElementById('edit-recipe-image').value.trim();
            news[newsIndex].content = document.getElementById('edit-recipe-ingredients').value.trim();
            news[newsIndex].source = document.getElementById('edit-recipe-instructions').value.trim();
            news[newsIndex].embedCode = document.getElementById('edit-recipe-embed').value.trim();
            
            // Guardar cambios en localStorage
            if (saveNewsToLocalStorage()) {
                // Actualizar interfaz
                updateNewsCounts();
                updateTotalNews();
                renderNews();
                
                // Mostrar éxito
                showEditFormStatus('✅ Noticia actualizada correctamente. Los cambios se guardaron permanentemente.', 'success');
                
                // Actualizar lista admin
                loadAdminNews();
                loadEditSelector();
                
                console.log('📝 Noticia actualizada:', news[newsIndex]);
            } else {
                showEditFormStatus('❌ Error al guardar los cambios. Intenta nuevamente.', 'error');
            }
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
                    if (saveNewsToLocalStorage()) {
                        // Actualizar interfaz
                        updateNewsCounts();
                        updateTotalNews();
                        renderNews();
                        
                        // Limpiar formulario
                        editNewsForm.reset();
                        editNewsForm.style.display = 'none';
                        document.getElementById('edit-recipe-select').value = '';
                        
                        // Mostrar éxito
                        showEditFormStatus(`✅ Noticia "${deletedNews.title}" eliminada correctamente.`, 'success');
                        
                        // Actualizar lista admin
                        loadAdminNews();
                        loadEditSelector();
                    } else {
                        showEditFormStatus('❌ Error al eliminar la noticia. Intenta nuevamente.', 'error');
                    }
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
    
    // 11. Selector de edición
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
    
    // 12. Configuración del sitio
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
    
    // 13. Cerrar admin con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const adminOverlay = document.getElementById('admin-overlay');
            if (adminOverlay && adminOverlay.style.display === 'flex') {
                hideAdminPanel();
            }
        }
    });
    
    // 14. Cerrar admin haciendo clic fuera
    const adminOverlay = document.getElementById('admin-overlay');
    if (adminOverlay) {
        adminOverlay.addEventListener('click', function(e) {
            if (e.target === adminOverlay) {
                hideAdminPanel();
            }
        });
    }
    
    console.log('✅ Admin configurado correctamente');
}

function hideAdminPanel() {
    document.getElementById('admin-login').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-overlay').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Limpiar formularios
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
    
    // Limpiar mensajes de estado
    document.getElementById('form-status').innerHTML = '';
    document.getElementById('edit-form-status').innerHTML = '';
    document.getElementById('settings-status').innerHTML = '';
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
    document.getElementById('edit-recipe-embed').value = item.embedCode || '';
    
    // Mostrar formulario
    document.getElementById('edit-recipe-form').style.display = 'block';
    
    // Limpiar mensajes de estado
    document.getElementById('edit-form-status').innerHTML = '';
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
window.loadNewsToEdit = loadNewsToEdit;
window.clearSearch = clearSearch;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
