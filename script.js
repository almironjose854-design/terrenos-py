// script.js - Sistema principal mejorado
// Versión 3.1 - Funcional y sincronizado

// Variables globales
let propiedades = [];
let editandoId = null;
let currentUser = null;

// ==================== FUNCIÓN DE NOTIFICACIÓN ====================

function mostrarNotificacion(mensaje, tipo = 'success') {
    try {
        // Crear notificación
        const notificacion = document.createElement('div');
        notificacion.className = 'notification';
        
        // Icono según tipo
        let icono = 'fa-check-circle';
        if (tipo === 'error') icono = 'fa-exclamation-circle';
        if (tipo === 'warning') icono = 'fa-exclamation-triangle';
        if (tipo === 'info') icono = 'fa-info-circle';
        
        notificacion.innerHTML = `
            <i class="fas ${icono}"></i>
            <span>${mensaje}</span>
        `;
        
        // Estilos
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === 'success' ? '#28a745' : 
                        tipo === 'error' ? '#dc3545' : 
                        tipo === 'warning' ? '#ffc107' : '#17a2b8'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        `;
        
        // Agregar al DOM
        document.body.appendChild(notificacion);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notificacion.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.parentNode.removeChild(notificacion);
                }
            }, 300);
        }, 3000);
        
    } catch (error) {
        console.error('Error mostrando notificación:', error);
        // Fallback simple
        alert(mensaje);
    }
}

// ==================== FUNCIONES DE UTILIDAD ====================

function formatoNumero(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-PY');
}

function formatoPrecio(precio) {
    if (!precio || precio <= 0) return 'Consultar precio';
    return `Gs. ${formatoNumero(precio)}`;
}

function actualizarEstadisticas() {
    // Actualizar contador en hero si existe
    const totalElement = document.getElementById('totalTerrenos');
    if (totalElement) {
        totalElement.textContent = propiedades.length;
    }
    
    // Actualizar destacados en hero si existe
    const destacadosElement = document.getElementById('totalDestacados');
    if (destacadosElement) {
        const destacados = propiedades.filter(t => t.destacado).length;
        destacadosElement.textContent = destacados;
    }
    
    // Actualizar en admin si existe
    const totalAdmin = document.getElementById('totalTerrenosCount');
    if (totalAdmin) {
        totalAdmin.textContent = propiedades.length;
    }
    
    const destacados = propiedades.filter(t => t.destacado).length;
    const destacadosAdminElement = document.getElementById('destacadosCount');
    if (destacadosAdminElement) {
        destacadosAdminElement.textContent = destacados;
    }
    
    const disponibles = propiedades.filter(t => t.estado === 'disponible').length;
    const disponiblesElement = document.getElementById('disponiblesCount');
    if (disponiblesElement) {
        disponiblesElement.textContent = disponibles;
    }
    
    // Actualizar última sincronización
    const lastSync = localStorage.getItem('terrenos_py_last_sync_v3');
    if (lastSync) {
        const lastSyncElement = document.getElementById('lastSync');
        if (lastSyncElement) {
            const fecha = new Date(lastSync);
            const ahora = new Date();
            const diffHoras = Math.floor((ahora - fecha) / (1000 * 60 * 60));
            
            let texto = '';
            if (diffHoras < 1) {
                texto = 'Hace menos de 1 hora';
            } else if (diffHoras === 1) {
                texto = 'Hace 1 hora';
            } else if (diffHoras < 24) {
                texto = `Hace ${diffHoras} horas`;
            } else {
                texto = fecha.toLocaleDateString();
            }
            
            lastSyncElement.textContent = texto;
        }
    }
}

// ==================== PÁGINA PRINCIPAL ====================

function inicializarHome() {
    console.log('🏠 Inicializando página principal...');
    
    // Renderizar terrenos con animación
    const container = document.getElementById('propertiesContainer');
    if (container) {
        setTimeout(() => {
            renderizarTerrenosHome(container);
        }, 300);
    }
    
    // Configurar búsqueda con debounce
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                buscarTerrenos(this.value);
            }, 300);
        });
    }
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            buscarTerrenos(searchInput.value);
        });
    }
    
    // Configurar filtros rápidos
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover activo de todos
            filterButtons.forEach(b => b.classList.remove('active'));
            // Activar actual
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            aplicarFiltro(filter);
        });
    });
    
    // Inicializar estadísticas
    actualizarEstadisticas();
}

function renderizarTerrenosHome(container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (propiedades.length === 0) {
        container.innerHTML = `
            <div class="no-properties">
                <i class="fas fa-home"></i>
                <h3>No hay terrenos disponibles</h3>
                <p>Agrega tu primer terreno desde el panel de administración</p>
                <p style="margin-top: 10px; color: #666;">
                    <i class="fas fa-info-circle"></i> Modo: ${APP_CONFIG.STORAGE_MODE}
                </p>
            </div>
        `;
        return;
    }
    
    propiedades.forEach(terreno => {
        const card = crearTarjetaTerreno(terreno, false);
        container.appendChild(card);
    });
}

function crearTarjetaTerreno(terreno, esAdmin = false) {
    const card = document.createElement('div');
    card.className = 'property-card';
    if (terreno.destacado) card.classList.add('destacado');
    card.dataset.id = terreno.id;
    
    // Imagen
    const imgContainer = document.createElement('div');
    imgContainer.className = 'property-image-container';
    
    const img = document.createElement('img');
    img.src = terreno.imagenes && terreno.imagenes.length > 0 
        ? terreno.imagenes[0] 
        : APP_CONFIG.DEFAULT_IMAGES[0];
    img.alt = terreno.titulo || 'Terreno';
    img.className = 'property-image';
    
    if (!esAdmin) {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            window.location.href = `property.html?id=${terreno.id}`;
        });
    }
    
    imgContainer.appendChild(img);
    
    // Badge destacado
    if (terreno.destacado) {
        const badge = document.createElement('div');
        badge.className = 'destacado-badge';
        badge.innerHTML = '<i class="fas fa-star"></i> Destacado';
        imgContainer.appendChild(badge);
    }
    
    // Contador de imágenes
    if (terreno.imagenes && terreno.imagenes.length > 1) {
        const count = document.createElement('div');
        count.className = 'image-count';
        count.textContent = `${terreno.imagenes.length} imágenes`;
        imgContainer.appendChild(count);
    }
    
    card.appendChild(imgContainer);
    
    // Contenido
    const content = document.createElement('div');
    content.className = 'property-content';
    
    // Título
    const title = document.createElement('h3');
    if (!esAdmin) {
        const titleLink = document.createElement('a');
        titleLink.href = `property.html?id=${terreno.id}`;
        titleLink.textContent = terreno.titulo || 'Terreno sin título';
        titleLink.className = 'property-title-link';
        title.appendChild(titleLink);
    } else {
        title.textContent = terreno.titulo || 'Terreno sin título';
    }
    content.appendChild(title);
    
    // Metadatos
    const meta = document.createElement('div');
    meta.className = 'property-meta';
    
    // Ubicación
    const location = document.createElement('div');
    location.className = 'property-location';
    location.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>${terreno.ubicacion || 'Sin ubicación'}</span>`;
    meta.appendChild(location);
    
    // Precio
    const price = document.createElement('div');
    price.className = 'property-price';
    price.innerHTML = `<i class="fas fa-tag"></i><span>${formatoPrecio(terreno.precio)}</span>`;
    meta.appendChild(price);
    
    // Tamaño
    const size = document.createElement('div');
    size.className = 'property-size';
    size.innerHTML = `<i class="fas fa-expand-alt"></i><span>${formatoNumero(terreno.tamaño)} m²</span>`;
    meta.appendChild(size);
    
    content.appendChild(meta);
    
    // Descripción breve
    const description = document.createElement('p');
    description.className = 'property-description';
    if (terreno.descripcion) {
        const descCorta = terreno.descripcion.length > 120 
            ? terreno.descripcion.substring(0, 120) + '...' 
            : terreno.descripcion;
        description.textContent = descCorta;
    }
    content.appendChild(description);
    
    // Acciones
    const actions = document.createElement('div');
    actions.className = 'property-actions';
    
    if (!esAdmin) {
        const detailBtn = document.createElement('a');
        detailBtn.href = `property.html?id=${terreno.id}`;
        detailBtn.className = 'btn btn-primary property-detail-btn';
        detailBtn.innerHTML = '<i class="fas fa-eye"></i> Ver detalles';
        actions.appendChild(detailBtn);
    }
    
    content.appendChild(actions);
    card.appendChild(content);
    
    return card;
}

function buscarTerrenos(query) {
    const container = document.getElementById('propertiesContainer');
    const noResults = document.getElementById('noResults');
    
    if (!container) return;
    
    if (!query.trim()) {
        if (noResults) noResults.style.display = 'none';
        renderizarTerrenosHome(container);
        return;
    }
    
    const resultados = terrenosAPI.buscarTerrenos(query);
    
    container.innerHTML = '';
    
    if (resultados.length === 0) {
        if (noResults) {
            noResults.style.display = 'block';
        } else {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No se encontraron resultados</h3>
                    <p>Intenta con otros términos de búsqueda</p>
                </div>
            `;
        }
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    
    resultados.forEach(terreno => {
        const card = crearTarjetaTerreno(terreno, false);
        container.appendChild(card);
    });
}

function aplicarFiltro(filtro) {
    const container = document.getElementById('propertiesContainer');
    if (!container) return;
    
    let terrenosFiltrados = [...propiedades];
    
    switch(filtro) {
        case 'destacados':
            terrenosFiltrados = terrenosFiltrados.filter(t => t.destacado);
            break;
        case 'baratos':
            terrenosFiltrados = terrenosFiltrados
                .filter(t => t.precio > 0)
                .sort((a, b) => a.precio - b.precio);
            break;
        case 'grandes':
            terrenosFiltrados = terrenosFiltrados
                .filter(t => t.tamaño > 0)
                .sort((a, b) => b.tamaño - a.tamaño);
            break;
        // 'all' no filtra
    }
    
    container.innerHTML = '';
    
    if (terrenosFiltrados.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-filter"></i>
                <h3>No hay terrenos con este filtro</h3>
                <p>Intenta con otro filtro</p>
            </div>
        `;
        return;
    }
    
    terrenosFiltrados.forEach(terreno => {
        const card = crearTarjetaTerreno(terreno, false);
        container.appendChild(card);
    });
}

// ==================== PÁGINA DE DETALLE ====================

function inicializarDetalle() {
    console.log('📄 Inicializando página de detalle...');
    cargarDetalleTerreno();
}

async function cargarDetalleTerreno() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (!id) {
        mostrarError('No se especificó un terreno');
        return;
    }
    
    const terreno = terrenosAPI.getTerrenoPorId(id);
    
    if (!terreno) {
        mostrarError('Terreno no encontrado');
        return;
    }
    
    // Actualizar página
    actualizarPaginaDetalle(terreno);
    configurarCarrusel(terreno.imagenes);
    configurarWhatsApp(terreno);
}

function actualizarPaginaDetalle(terreno) {
    // Elementos principales
    const elementos = {
        'detailTitle': terreno.titulo || 'Terreno',
        'detailPrice': formatoPrecio(terreno.precio),
        'detailDescription': terreno.descripcion || 'Sin descripción',
        'detailLocation': terreno.ubicacion || 'Ubicación no disponible'
    };
    
    Object.keys(elementos).forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = elementos[id];
    });
    
    // Actualizar título de la página
    document.title = `${terreno.titulo} | Terrenos PY`;
    
    // Actualizar features si existen
    const featuresContainer = document.getElementById('propertyFeatures');
    if (featuresContainer) {
        featuresContainer.innerHTML = '';
        
        const features = [
            { icon: 'expand', label: 'Tamaño', value: `${formatoNumero(terreno.tamaño)} m²` },
            { icon: 'calendar', label: 'Publicado', value: new Date(terreno.fechaCreacion).toLocaleDateString() },
            { icon: 'star', label: 'Estado', value: terreno.estado === 'disponible' ? 'Disponible' : 'Reservado' },
            { icon: 'sync', label: 'Actualizado', value: new Date(terreno.fechaActualizacion).toLocaleDateString() }
        ];
        
        features.forEach(feature => {
            if (feature.value) {
                const featureItem = document.createElement('div');
                featureItem.className = 'feature-extended';
                featureItem.innerHTML = `
                    <i class="fas fa-${feature.icon}"></i>
                    <div class="value">${feature.value}</div>
                    <div class="label">${feature.label}</div>
                `;
                featuresContainer.appendChild(featureItem);
            }
        });
    }
    
    // Configurar mapa si existe
    if (terreno.mapaUrl) {
        const mapSection = document.getElementById('propertyMapSection');
        if (mapSection) {
            mapSection.style.display = 'block';
            const mapIframe = document.getElementById('detailMap');
            if (mapIframe) {
                mapIframe.src = terreno.mapaUrl;
            }
        }
    }
}

function configurarCarrusel(imagenes) {
    const imagenPrincipal = document.getElementById('detailImage');
    const btnAnterior = document.getElementById('prevImage');
    const btnSiguiente = document.getElementById('nextImage');
    const dotsContainer = document.getElementById('carouselNav');
    const thumbnailsContainer = document.getElementById('galleryThumbnails');
    
    if (!imagenPrincipal || !imagenes || imagenes.length === 0) {
        // Usar imagen por defecto
        if (imagenPrincipal) {
            imagenPrincipal.src = APP_CONFIG.DEFAULT_IMAGES[0];
        }
        return;
    }
    
    let indiceActual = 0;
    
    function actualizarImagen() {
        imagenPrincipal.src = imagenes[indiceActual];
        
        // Actualizar dots
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            imagenes.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.className = `carousel-dot ${index === indiceActual ? 'active' : ''}`;
                dot.addEventListener('click', () => {
                    indiceActual = index;
                    actualizarImagen();
                });
                dotsContainer.appendChild(dot);
            });
        }
        
        // Actualizar thumbnails
        if (thumbnailsContainer) {
            thumbnailsContainer.innerHTML = '';
            imagenes.forEach((img, index) => {
                const thumbnail = document.createElement('img');
                thumbnail.src = img;
                thumbnail.className = `thumbnail ${index === indiceActual ? 'active' : ''}`;
                thumbnail.addEventListener('click', () => {
                    indiceActual = index;
                    actualizarImagen();
                });
                thumbnailsContainer.appendChild(thumbnail);
            });
        }
    }
    
    if (btnAnterior) {
        btnAnterior.addEventListener('click', function() {
            indiceActual = (indiceActual - 1 + imagenes.length) % imagenes.length;
            actualizarImagen();
        });
    }
    
    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', function() {
            indiceActual = (indiceActual + 1) % imagenes.length;
            actualizarImagen();
        });
    }
    
    actualizarImagen();
}

function configurarWhatsApp(terreno) {
    const btnWhatsApp = document.getElementById('detailContactBtn');
    const sidebarBtn = document.getElementById('sidebarContactBtn');
    
    const mensaje = encodeURIComponent(
        `Hola! Estoy interesado en el terreno:\n\n` +
        `*${terreno.titulo}*\n` +
        `📍 ${terreno.ubicacion}\n` +
        `💰 ${formatoPrecio(terreno.precio)}\n` +
        `📏 ${formatoNumero(terreno.tamaño)} m²\n\n` +
        `Me gustaría más información.`
    );
    
    const whatsappUrl = `https://wa.me/${SITE_CONFIG.whatsapp}?text=${mensaje}`;
    
    if (btnWhatsApp) btnWhatsApp.href = whatsappUrl;
    if (sidebarBtn) sidebarBtn.href = whatsappUrl;
}

function mostrarError(mensaje) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="container">
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>${mensaje}</h2>
                    <a href="index.html" class="btn btn-primary">Volver al inicio</a>
                </div>
            </div>
        `;
    }
}

// ==================== ADMINISTRACIÓN ====================

function inicializarAdmin() {
    console.log('⚙️ Inicializando panel de administración...');
    
    configurarLogin();
    configurarFormulario();
    configurarSistema();
    
    // Verificar si ya está logueado
    verificarLoginPrev();
}

function configurarLogin() {
    const loginForm = document.getElementById('loginForm');
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Credenciales por defecto
        const credencialesValidas = {
            usuario: APP_CONFIG.ADMIN.USERNAME,
            contraseña: APP_CONFIG.ADMIN.PASSWORD
        };
        
        // Validar credenciales
        if (username === credencialesValidas.usuario && password === credencialesValidas.contraseña) {
            // Guardar en sessionStorage
            sessionStorage.setItem('terrenos_admin_logueado', 'true');
            sessionStorage.setItem('terrenos_admin_usuario', username);
            
            // Mostrar dashboard
            if (loginSection) loginSection.style.display = 'none';
            if (dashboardSection) dashboardSection.style.display = 'block';
            
            // Cargar terrenos
            cargarTerrenosAdmin();
            actualizarEstadisticasAdmin();
            
            mostrarNotificacion('¡Bienvenido al panel de administración!', 'success');
            
        } else {
            mostrarNotificacion('Usuario o contraseña incorrectos', 'error');
        }
    });
    
    // Configurar logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('¿Cerrar sesión del administrador?')) {
                sessionStorage.removeItem('terrenos_admin_logueado');
                sessionStorage.removeItem('terrenos_admin_usuario');
                location.reload();
            }
        });
    }
}

function verificarLoginPrev() {
    const estaLogueado = sessionStorage.getItem('terrenos_admin_logueado') === 'true';
    
    if (estaLogueado) {
        const loginSection = document.getElementById('loginSection');
        const dashboardSection = document.getElementById('dashboardSection');
        
        if (loginSection) loginSection.style.display = 'none';
        if (dashboardSection) dashboardSection.style.display = 'block';
        
        cargarTerrenosAdmin();
        actualizarEstadisticasAdmin();
    }
}

async function cargarTerrenosAdmin() {
    const container = document.getElementById('adminPropertiesTable');
    const countElement = document.getElementById('propertyCount');
    
    if (!container) return;
    
    // Obtener terrenos actualizados
    propiedades = terrenosAPI.getTerrenos();
    
    // Actualizar contador
    if (countElement) {
        countElement.textContent = `${propiedades.length} terrenos`;
    }
    
    // Renderizar tabla
    renderizarTablaAdmin(container);
}

function renderizarTablaAdmin(container) {
    if (!container || !propiedades) return;
    
    container.innerHTML = '';
    
    if (propiedades.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <i class="fas fa-home" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3 style="color: #666; margin: 10px 0;">No hay terrenos disponibles</h3>
                    <p style="color: #999;">Agrega tu primer terreno usando el formulario</p>
                </td>
            </tr>
        `;
        return;
    }
    
    propiedades.forEach(terreno => {
        const row = document.createElement('tr');
        
        // ID
        const tdId = document.createElement('td');
        tdId.textContent = terreno.id ? terreno.id.substring(0, 8) + '...' : 'N/A';
        row.appendChild(tdId);
        
        // Imagen
        const tdImg = document.createElement('td');
        const img = document.createElement('img');
        img.src = terreno.imagenes && terreno.imagenes.length > 0 
            ? terreno.imagenes[0] 
            : APP_CONFIG.DEFAULT_IMAGES[0];
        img.style.cssText = 'width: 50px; height: 50px; object-fit: cover; border-radius: 4px;';
        tdImg.appendChild(img);
        row.appendChild(tdImg);
        
        // Título
        const tdTitle = document.createElement('td');
        tdTitle.innerHTML = `<strong>${terreno.titulo || 'Sin título'}</strong>`;
        if (terreno.destacado) {
            tdTitle.innerHTML += '<br><small style="color: var(--accent-color);"><i class="fas fa-star"></i> Destacado</small>';
        }
        row.appendChild(tdTitle);
        
        // Ubicación
        const tdLocation = document.createElement('td');
        tdLocation.textContent = terreno.ubicacion || 'Sin ubicación';
        row.appendChild(tdLocation);
        
        // Precio
        const tdPrice = document.createElement('td');
        tdPrice.textContent = formatoPrecio(terreno.precio);
        row.appendChild(tdPrice);
        
        // Tamaño
        const tdSize = document.createElement('td');
        tdSize.textContent = `${formatoNumero(terreno.tamaño)} m²`;
        row.appendChild(tdSize);
        
        // Estado
        const tdStatus = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge status-${terreno.estado || 'available'}`;
        statusBadge.textContent = terreno.estado === 'disponible' ? 'Disponible' : 
                                 terreno.estado === 'reservado' ? 'Reservado' : 'Vendido';
        tdStatus.appendChild(statusBadge);
        row.appendChild(tdStatus);
        
        // Fecha
        const tdDate = document.createElement('td');
        tdDate.textContent = new Date(terreno.fechaActualizacion).toLocaleDateString();
        row.appendChild(tdDate);
        
        // Acciones
        const tdActions = document.createElement('td');
        tdActions.className = 'action-buttons';
        
        const viewBtn = document.createElement('button');
        viewBtn.className = 'action-btn action-view';
        viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
        viewBtn.title = 'Ver detalles';
        viewBtn.onclick = () => window.open(`property.html?id=${terreno.id}`, '_blank');
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn action-edit';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Editar';
        editBtn.onclick = () => editarTerreno(terreno.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn action-delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Eliminar';
        deleteBtn.onclick = async () => {
            if (confirm('¿Estás seguro de eliminar este terreno?')) {
                await eliminarTerreno(terreno.id);
            }
        };
        
        tdActions.appendChild(viewBtn);
        tdActions.appendChild(editBtn);
        tdActions.appendChild(deleteBtn);
        row.appendChild(tdActions);
        
        container.appendChild(row);
    });
}

function actualizarEstadisticasAdmin() {
    actualizarEstadisticas();
    
    // Última sincronización
    const lastSync = localStorage.getItem('terrenos_py_last_sync_v3');
    const syncElement = document.getElementById('ultimaSync');
    if (syncElement && lastSync) {
        const fecha = new Date(lastSync);
        syncElement.textContent = fecha.toLocaleTimeString();
    }
    
    // Sistema info
    const sysTotalElement = document.getElementById('sysTotalTerrenos');
    if (sysTotalElement) {
        sysTotalElement.textContent = propiedades.length;
    }
    
    const sysLastUpdate = document.getElementById('sysLastUpdate');
    if (sysLastUpdate) {
        sysLastUpdate.textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Nunca';
    }
}

function configurarFormulario() {
    const form = document.getElementById('propertyForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('submitPropertyBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;
        
        try {
            // Obtener valores
            const titulo = document.getElementById('propTitle').value.trim();
            const ubicacion = document.getElementById('propLocation').value.trim();
            const precio = document.getElementById('propPrice').value;
            const tamaño = document.getElementById('propSize').value;
            const descripcion = document.getElementById('propDescription').value.trim();
            const email = document.getElementById('propEmail').value.trim();
            const telefono = document.getElementById('propPhone').value.trim();
            const mapaUrl = document.getElementById('propMapLink').value.trim();
            const estado = document.getElementById('propEstado').value;
            const destacado = document.getElementById('propDestacado').checked;
            const inputImagenes = document.getElementById('propImages');
            
            // Validar campos obligatorios
            if (!titulo || !ubicacion || !precio || !tamaño || !descripcion) {
                throw new Error('Por favor completa todos los campos obligatorios (*)');
            }
            
            // Procesar imágenes
            let imagenes = [];
            if (inputImagenes.files.length > 0) {
                imagenes = await procesarImagenes(inputImagenes.files);
            } else if (editandoId) {
                // Mantener imágenes existentes al editar
                const terrenoExistente = terrenosAPI.getTerrenoPorId(editandoId);
                if (terrenoExistente && terrenoExistente.imagenes) {
                    imagenes = terrenoExistente.imagenes;
                }
            }
            
            // Si no hay imágenes, usar por defecto
            if (imagenes.length === 0) {
                imagenes = APP_CONFIG.DEFAULT_IMAGES.slice(0, 2);
            }
            
            // Crear objeto terreno
            const terrenoData = {
                titulo,
                ubicacion,
                precio: Number(precio),
                tamaño: Number(tamaño),
                descripcion,
                email,
                telefono,
                mapaUrl,
                estado,
                destacado,
                imagenes
            };
            
            // Guardar
            let resultado;
            if (editandoId) {
                resultado = await terrenosAPI.actualizarTerreno(editandoId, terrenoData);
            } else {
                resultado = await terrenosAPI.agregarTerreno(terrenoData);
            }
            
            if (resultado.success) {
                // Actualizar lista local
                propiedades = terrenosAPI.getTerrenos();
                
                // Actualizar vista
                await cargarTerrenosAdmin();
                actualizarEstadisticasAdmin();
                
                // Limpiar formulario
                limpiarFormulario();
                
                // Mostrar mensaje
                mostrarNotificacion(resultado.message);
            } else {
                throw new Error(resultado.error || 'Error al guardar');
            }
            
        } catch (error) {
            console.error('❌ Error guardando terreno:', error);
            mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
    
    // Botón cancelar edición
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', limpiarFormulario);
    }
    
    // Botón limpiar formulario
    const clearBtn = document.getElementById('clearFormBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', limpiarFormulario);
    }
}

async function procesarImagenes(files) {
    const imagenes = [];
    const maxFiles = Math.min(files.length, 6);
    
    for (let i = 0; i < maxFiles; i++) {
        const file = files[i];
        
        // Validar que sea imagen
        if (!file.type.startsWith('image/')) continue;
        
        // Validar tamaño (máx 5MB)
        if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
            console.warn(`Imagen ${file.name} demasiado grande (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
            continue;
        }
        
        // Convertir a DataURL
        try {
            const dataUrl = await archivoADataURL(file);
            imagenes.push(dataUrl);
        } catch (error) {
            console.error('Error procesando imagen:', error);
        }
    }
    
    return imagenes;
}

function archivoADataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Error leyendo archivo'));
        reader.readAsDataURL(file);
    });
}

function editarTerreno(id) {
    const terreno = terrenosAPI.getTerrenoPorId(id);
    if (!terreno) {
        mostrarNotificacion('Terreno no encontrado', 'error');
        return;
    }
    
    editandoId = id;
    
    // Llenar formulario
    document.getElementById('propTitle').value = terreno.titulo || '';
    document.getElementById('propLocation').value = terreno.ubicacion || '';
    document.getElementById('propPrice').value = terreno.precio || '';
    document.getElementById('propSize').value = terreno.tamaño || '';
    document.getElementById('propDescription').value = terreno.descripcion || '';
    document.getElementById('propEmail').value = terreno.email || '';
    document.getElementById('propPhone').value = terreno.telefono || '';
    document.getElementById('propMapLink').value = terreno.mapaUrl || '';
    document.getElementById('propEstado').value = terreno.estado || 'disponible';
    document.getElementById('propDestacado').checked = terreno.destacado || false;
    
    // Cambiar texto del botón
    const btn = document.getElementById('submitBtnText');
    if (btn) btn.textContent = 'Actualizar Terreno';
    
    // Mostrar botón cancelar
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    
    // Mostrar imágenes existentes
    const preview = document.getElementById('imagePreview');
    if (preview && terreno.imagenes && terreno.imagenes.length > 0) {
        preview.innerHTML = '<p style="grid-column: 1/-1; color: #666; margin-bottom: 10px;">Imágenes actuales:</p>';
        terreno.imagenes.forEach(img => {
            const imgEl = document.createElement('img');
            imgEl.src = img;
            imgEl.className = 'preview-image';
            preview.appendChild(imgEl);
        });
    }
    
    // Scroll al formulario
    document.getElementById('propertyForm').scrollIntoView({ behavior: 'smooth' });
    
    // Cambiar a pestaña agregar si no está activa
    const tabBtn = document.querySelector('.tab-btn[data-tab="agregar"]');
    if (tabBtn && !tabBtn.classList.contains('active')) {
        tabBtn.click();
    }
    
    mostrarNotificacion(`Editando terreno: ${terreno.titulo}`, 'info');
}

function limpiarFormulario() {
    const form = document.getElementById('propertyForm');
    if (form) form.reset();
    
    editandoId = null;
    
    // Restaurar texto del botón
    const btn = document.getElementById('submitBtnText');
    if (btn) btn.textContent = 'Guardar Terreno';
    
    // Ocultar botón cancelar
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    
    // Limpiar previsualización
    const preview = document.getElementById('imagePreview');
    if (preview) preview.innerHTML = '';
    
    mostrarNotificacion('Formulario limpiado', 'info');
}

async function eliminarTerreno(id) {
    if (!confirm('¿Estás seguro de eliminar este terreno? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const resultado = await terrenosAPI.borrarTerreno(id);
        
        if (resultado.success) {
            // Actualizar lista local
            propiedades = terrenosAPI.getTerrenos();
            
            // Actualizar vista
            await cargarTerrenosAdmin();
            actualizarEstadisticasAdmin();
            
            // Si estaba editando este terreno, limpiar formulario
            if (editandoId === id) {
                limpiarFormulario();
            }
            
            mostrarNotificacion(resultado.message);
        } else {
            throw new Error(resultado.error);
        }
    } catch (error) {
        mostrarNotificacion('❌ Error eliminando terreno: ' + error.message, 'error');
    }
}

function configurarSistema() {
    // Configurar botones del sistema
    const testGistBtn = document.getElementById('testGistBtn');
    if (testGistBtn) {
        testGistBtn.addEventListener('click', async function() {
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';
            this.disabled = true;
            
            const resultado = await terrenosAPI.probarConexionGist();
            
            if (resultado.success) {
                mostrarNotificacion('✅ Conexión Gist exitosa');
            } else {
                mostrarNotificacion('❌ Error: ' + resultado.error, 'error');
            }
            
            this.innerHTML = originalHTML;
            this.disabled = false;
        });
    }
    
    const manualSyncBtn = document.getElementById('manualSyncBtn');
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', async function() {
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
            this.disabled = true;
            
            try {
                await terrenosAPI.sincronizar();
                propiedades = terrenosAPI.getTerrenos();
                await cargarTerrenosAdmin();
                actualizarEstadisticasAdmin();
                mostrarNotificacion('✅ Sincronización completada');
            } catch (error) {
                mostrarNotificacion('❌ Error sincronizando', 'error');
            } finally {
                this.innerHTML = originalHTML;
                this.disabled = false;
            }
        });
    }
    
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', function() {
            if (confirm('¿Limpiar caché local? Esto no afecta los datos en Gist.')) {
                const resultado = terrenosAPI.limpiarCache();
                if (resultado.success) {
                    mostrarNotificacion('🧹 Caché limpiado correctamente');
                    setTimeout(() => location.reload(), 1000);
                }
            }
        });
    }
    
    // Mostrar información del sistema
    const sysTotalElement = document.getElementById('sysTotalTerrenos');
    if (sysTotalElement) {
        sysTotalElement.textContent = propiedades.length;
    }
    
    const sysLastUpdate = document.getElementById('sysLastUpdate');
    if (sysLastUpdate) {
        const lastSync = localStorage.getItem('terrenos_py_last_sync_v3');
        sysLastUpdate.textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Nunca';
    }
}

// ==================== INICIALIZACIÓN GLOBAL ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Terrenos PY - Iniciando aplicación...');
    
    // Inicializar API
    try {
        propiedades = await terrenosAPI.init();
        console.log(`✅ ${propiedades.length} terrenos cargados`);
        
        // Actualizar estadísticas
        actualizarEstadisticas();
        
    } catch (error) {
        console.error('❌ Error inicializando API:', error);
        mostrarNotificacion('Error cargando datos. Usando modo local.', 'warning');
    }
    
    // Inicializar según la página
    const path = window.location.pathname.split('/').pop();
    
    if (path === 'admin.html') {
        inicializarAdmin();
    } else if (path === 'property.html') {
        inicializarDetalle();
    } else {
        inicializarHome();
    }
});

// Asegurar que las funciones estén disponibles
window.cargarTerrenosAdmin = cargarTerrenosAdmin;
window.sincronizarDatos = () => terrenosAPI.sincronizar();
window.terrenosAPI = terrenosAPI;

console.log('✅ Sistema Terrenos PY cargado correctamente');