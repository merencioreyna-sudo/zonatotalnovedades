// Zona Total Novedades - Script corregido
// MANTIENE TODO TU DISEÑO ORIGINAL
// SOLO ARREGLA LA CARGA DE NOTICIAS

console.log('🚀 Zona Total - Iniciando...');

// URL de TU Google Sheets (la misma que ya tienes)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1YAqfZadMR5O6mABhl0QbhF8scbtIW9JJPfwdED4bzDQ/gviz/tq?tqx=out:csv&sheet=Noticias';

// Variable global para las noticias
let todasLasNoticias = [];

// Función principal para cargar noticias DESDE GOOGLE SHEETS
async function cargarNoticiasDesdeGoogleSheets() {
    console.log('📥 Conectando a Google Sheets...');
    
    try {
        const respuesta = await fetch(SHEET_URL);
        
        if (!respuesta.ok) {
            throw new Error('Error de conexión con Google Sheets');
        }
        
        const textoCSV = await respuesta.text();
        console.log('✅ CSV recibido correctamente');
        
        // Parsear el CSV
        const noticias = parsearCSV(textoCSV);
        
        if (noticias && noticias.length > 0) {
            console.log(`📰 ${noticias.length} noticias cargadas`);
            todasLasNoticias = noticias;
            
            // Mostrar en la página
            mostrarNoticias(noticias);
            
            // Actualizar contadores
            actualizarContadores(noticias);
            
            return true;
        } else {
            console.warn('⚠️ No hay noticias en el CSV');
            mostrarMensajeSinNoticias();
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error cargando noticias:', error);
        mostrarErrorCarga();
        return false;
    }
}

// Función para parsear CSV - VERSIÓN CORREGIDA
function parsearCSV(csvTexto) {
    console.log('🔧 Parseando CSV...');
    
    // Limpiar y dividir líneas
    const lineas = csvTexto.split('\n').filter(linea => linea.trim() !== '');
    
    if (lineas.length < 2) {
        console.warn('CSV vacío o con solo encabezados');
        return [];
    }
    
    // Obtener encabezados (primera línea)
    const encabezados = parsearLineaCSV(lineas[0]);
    
    const noticias = [];
    
    // Procesar cada línea de datos
    for (let i = 1; i < lineas.length; i++) {
        const valores = parsearLineaCSV(lineas[i]);
        
        if (valores.length >= encabezados.length) {
            const noticia = {};
            
            // Asignar valores a encabezados
            for (let j = 0; j < encabezados.length; j++) {
                const clave = encabezados[j].trim();
                const valor = (valores[j] || '').trim();
                noticia[clave] = valor;
            }
            
            // Solo agregar si tiene título
            if (noticia.Título && noticia.Título !== '') {
                noticias.push(noticia);
            }
        }
    }
    
    console.log(`📊 ${noticias.length} noticias parseadas`);
    return noticias;
}

// Función auxiliar para parsear línea CSV con comas
function parsearLineaCSV(linea) {
    const valores = [];
    let valorActual = '';
    let dentroDeComillas = false;
    
    for (let i = 0; i < linea.length; i++) {
        const caracter = linea[i];
        const siguienteCaracter = linea[i + 1];
        
        if (caracter === '"') {
            if (dentroDeComillas && siguienteCaracter === '"') {
                // Comilla doble dentro de comillas
                valorActual += '"';
                i++; // Saltar la siguiente comilla
            } else {
                // Inicio o fin de comillas
                dentroDeComillas = !dentroDeComillas;
            }
        } else if (caracter === ',' && !dentroDeComillas) {
            // Fin de un valor
            valores.push(valorActual);
            valorActual = '';
        } else {
            // Caracter normal
            valorActual += caracter;
        }
    }
    
    // Agregar el último valor
    valores.push(valorActual);
    
    return valores;
}

// Función para mostrar noticias en tu diseño original
function mostrarNoticias(noticias) {
    console.log('🎨 Mostrando noticias...');
    
    // Buscar contenedores (usa los IDs de TU diseño original)
    const contenedorNoticias = document.getElementById('news-container') || 
                               document.getElementById('news-grid') ||
                               document.querySelector('.news-container');
    
    if (!contenedorNoticias) {
        console.error('❌ No se encontró el contenedor de noticias');
        return;
    }
    
    // Limpiar contenedor
    contenedorNoticias.innerHTML = '';
    
    // Ordenar noticias: Destacadas primero, luego por fecha
    const noticiasOrdenadas = [...noticias].sort((a, b) => {
        // Primero por prioridad (Alta primero)
        if (a.Prioridad === 'Alta' && b.Prioridad !== 'Alta') return -1;
        if (a.Prioridad !== 'Alta' && b.Prioridad === 'Alta') return 1;
        
        // Luego intentar ordenar por fecha
        try {
            const fechaA = parsearFecha(a.Fecha);
            const fechaB = parsearFecha(b.Fecha);
            if (fechaA && fechaB) {
                return fechaB - fechaA; // Más reciente primero
            }
        } catch (e) {
            console.warn('Error ordenando por fecha:', e);
        }
        
        return 0;
    });
    
    // Crear y agregar cada noticia
    noticiasOrdenadas.forEach((noticia, index) => {
        const elementoNoticia = crearElementoNoticia(noticia, index);
        contenedorNoticias.appendChild(elementoNoticia);
    });
    
    console.log(`✅ ${noticiasOrdenadas.length} noticias mostradas`);
}

// Función para crear elemento de noticia (ADAPTABLE A TU DISEÑO)
function crearElementoNoticia(noticia, indice) {
    const esDestacada = noticia.Prioridad === 'Alta';
    
    // Crear elemento según tu diseño original
    const div = document.createElement('div');
    div.className = esDestacada ? 'news-item featured' : 'news-item';
    
    // Usar imagen por defecto si no hay
    const imagenUrl = noticia.Imagen || 
                     `https://via.placeholder.com/400x250/1a2980/ffffff?text=Zona+Total+${indice + 1}`;
    
    // Crear HTML de la noticia (AJUSTA ESTO A TU DISEÑO)
    div.innerHTML = `
        <div class="news-image">
            <img src="${imagenUrl}" alt="${noticia.Título || 'Noticia'}" 
                 onerror="this.src='https://via.placeholder.com/400x250/cccccc/333333?text=Imagen+No+Disponible'">
            ${esDestacada ? '<span class="featured-badge">🌟 Destacada</span>' : ''}
            ${noticia.Categoría ? `<span class="category-badge">${noticia.Categoría}</span>` : ''}
        </div>
        <div class="news-content">
            <div class="news-meta">
                ${noticia.País ? `<span class="country-flag">${noticia.País}</span>` : ''}
                <span class="news-date">${noticia.Fecha || 'Fecha no disponible'}</span>
                <span class="priority-label ${(noticia.Prioridad || 'Media').toLowerCase()}">
                    ${noticia.Prioridad || 'Normal'}
                </span>
            </div>
            <h3 class="news-title">${noticia.Título || 'Sin título'}</h3>
            <p class="news-description">${noticia.Descripción || noticia.Contenido?.substring(0, 150) || 'Descripción no disponible'}...</p>
            <div class="news-actions">
                <button class="btn-read-more" onclick="abrirNoticiaCompleta(${indice})">
                    📖 Leer más
                </button>
                <span class="source-info">${noticia.Fuente ? 'Fuente: ' + noticia.Fuente : ''}</span>
            </div>
        </div>
    `;
    
    return div;
}

// Función para parsear fecha (soporta formato español)
function parsearFecha(fechaStr) {
    if (!fechaStr) return null;
    
    // Intentar con formato "1 de enero de 2026"
    const match = fechaStr.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/i);
    if (match) {
        const [, dia, mesTexto, año] = match;
        const meses = {
            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
            'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
            'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };
        
        const mes = meses[mesTexto.toLowerCase()];
        if (mes !== undefined) {
            return new Date(año, mes, dia);
        }
    }
    
    // Intentar con Date nativo
    return new Date(fechaStr);
}

// Función para abrir noticia completa
function abrirNoticiaCompleta(indice) {
    if (!todasLasNoticias[indice]) return;
    
    const noticia = todasLasNoticias[indice];
    
    // Crear modal simple (puedes usar el que ya tienes)
    const modalHTML = `
        <div class="modal-overlay" onclick="cerrarModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close" onclick="cerrarModal()">×</button>
                <div class="modal-header">
                    <div class="modal-meta">
                        ${noticia.Categoría ? `<span class="modal-category">${noticia.Categoría}</span>` : ''}
                        ${noticia.País ? `<span class="modal-country">${noticia.País}</span>` : ''}
                        <span class="modal-date">${noticia.Fecha || ''}</span>
                        <span class="modal-priority ${(noticia.Prioridad || 'media').toLowerCase()}">
                            ${noticia.Prioridad || 'Normal'}
                        </span>
                    </div>
                    <h2>${noticia.Título || 'Sin título'}</h2>
                </div>
                <div class="modal-body">
                    ${noticia.Imagen ? `<img src="${noticia.Imagen}" alt="${noticia.Título}" class="modal-image">` : ''}
                    <div class="modal-description">
                        <h3>Resumen</h3>
                        <p>${noticia.Descripción || ''}</p>
                    </div>
                    <div class="modal-full-content">
                        <h3>Contenido completo</h3>
                        <p>${noticia.Contenido || 'Contenido no disponible'}</p>
                    </div>
                    ${noticia.Fuente ? `<div class="modal-source"><strong>Fuente:</strong> ${noticia.Fuente}</div>` : ''}
                </div>
            </div>
        </div>
    `;
    
    // Crear y mostrar modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'news-modal-container';
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    document.body.style.overflow = 'hidden';
}

// Función para cerrar modal
function cerrarModal() {
    const modal = document.getElementById('news-modal-container');
    if (modal) {
        modal.remove();
        document.body.style.overflow = 'auto';
    }
}

// Actualizar contadores
function actualizarContadores(noticias) {
    // Buscar elementos de contadores (usa los IDs de TU diseño)
    const contadorTotal = document.getElementById('total-news') || 
                         document.querySelector('.total-counter');
    const contadorCategorias = document.getElementById('categories-count');
    const contadorPaises = document.getElementById('countries-count');
    
    if (contadorTotal) {
        contadorTotal.textContent = noticias.length;
    }
    
    if (contadorCategorias) {
        const categoriasUnicas = [...new Set(noticias.map(n => n.Categoría).filter(Boolean))];
        contadorCategorias.textContent = categoriasUnicas.length;
    }
    
    if (contadorPaises) {
        const paisesUnicos = [...new Set(noticias.map(n => n.País).filter(Boolean))];
        contadorPaises.textContent = paisesUnicos.length;
    }
    
    console.log(`📊 Contadores actualizados: ${noticias.length} noticias`);
}

// Mostrar mensaje cuando no hay noticias
function mostrarMensajeSinNoticias() {
    const contenedor = document.getElementById('news-container') || 
                      document.getElementById('news-grid');
    
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="no-news-message">
                <h3>📭 No hay noticias disponibles</h3>
                <p>Agrega noticias en Google Sheets para verlas aquí.</p>
                <p>La página se actualizará automáticamente cada 30 segundos.</p>
                <button onclick="cargarNoticiasDesdeGoogleSheets()" class="btn-retry">
                    🔄 Reintentar carga
                </button>
            </div>
        `;
    }
}

// Mostrar error de carga
function mostrarErrorCarga() {
    const contenedor = document.getElementById('news-container') || 
                      document.getElementById('news-grid');
    
    if (contenedor) {
        contenedor.innerHTML = `
            <div class="error-message">
                <h3>⚠️ Error de conexión</h3>
                <p>No se pudo conectar con Google Sheets.</p>
                <p>Verifica tu conexión a internet.</p>
                <button onclick="cargarNoticiasDesdeGoogleSheets()" class="btn-retry">
                    🔄 Reintentar conexión
                </button>
            </div>
        `;
    }
}

// Función para sincronizar periódicamente
function sincronizarConGoogleSheets() {
    console.log('🔄 Sincronizando con Google Sheets...');
    cargarNoticiasDesdeGoogleSheets();
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Página cargada - Iniciando carga de noticias');
    
    // Cargar noticias inmediatamente
    cargarNoticiasDesdeGoogleSheets();
    
    // Sincronizar cada 30 segundos (como ya tenías)
    setInterval(sincronizarConGoogleSheets, 30000);
    
    // Configurar botón de recarga manual si existe
    const btnRecargar = document.getElementById('btn-reload-news');
    if (btnRecargar) {
        btnRecargar.addEventListener('click', cargarNoticiasDesdeGoogleSheets);
    }
});

// Función para buscar noticias (si tienes barra de búsqueda)
function buscarNoticias() {
    const inputBusqueda = document.getElementById('search-input');
    if (!inputBusqueda) return;
    
    const termino = inputBusqueda.value.toLowerCase().trim();
    
    if (!termino) {
        mostrarNoticias(todasLasNoticias);
        return;
    }
    
    const noticiasFiltradas = todasLasNoticias.filter(noticia => {
        return (
            (noticia.Título && noticia.Título.toLowerCase().includes(termino)) ||
            (noticia.Descripción && noticia.Descripción.toLowerCase().includes(termino)) ||
            (noticia.Contenido && noticia.Contenido.toLowerCase().includes(termino)) ||
            (noticia.Categoría && noticia.Categoría.toLowerCase().includes(termino)) ||
            (noticia.País && noticia.País.toLowerCase().includes(termino))
        );
    });
    
    mostrarNoticias(noticiasFiltradas);
}

// Exportar funciones para usar en HTML
window.cargarNoticiasDesdeGoogleSheets = cargarNoticiasDesdeGoogleSheets;
window.abrirNoticiaCompleta = abrirNoticiaCompleta;
window.cerrarModal = cerrarModal;
window.buscarNoticias = buscarNoticias;
