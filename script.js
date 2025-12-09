// script.js - Sistema principal con Gist

// Variables globales
let propiedades = [];
let editandoId = null;
let currentUser = null;

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Terrenos PY - Iniciando aplicación...');
    
    // Inicializar API
    try {
        propiedades = await terrenosAPI.init();
        console.log(`✅ ${propiedades.length} terrenos cargados`);
    } catch (error) {
        console.error('❌ Error inicializando API:', error);
    }
    
    // Inicializar según la página
    const path = window.location.pathname;
    
    if (path.includes('admin.html')) {
        inicializarAdmin();
    } else if (path.includes('property.html')) {
        inicializarDetalle();
    } else {
        inicializarHome();
    }
});

// ==================== FUNCIONES DE UTILIDAD ====================

function formatoNumero(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-PY');
}

function formatoPrecio(precio) {
    if (!precio || precio <= 0) return 'Consultar precio';
    return `Gs. ${formatoNumero(precio)}`;
}

// ==================== PÁGINA PRINCIPAL ====================

function inicializarHome() {
    console.log('🏠 Inicializando página principal...');
    
    // Renderizar terrenos
    const container = document.getElementById('propertiesContainer');
    if (container) {
        renderizarTerrenosHome(container);
    }
    
    // Configurar búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            buscarTerrenos(this.value);
        });
    }
    
    // Botón de sincronización
    const syncBtn = document.createElement('button');
    syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar';
    syncBtn.className = 'btn-primary';
    syncBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        padding: 10px 20px;
        font-size: 0.9rem;
    `;
    syncBtn.onclick = async () => {
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
        syncBtn.disabled = true;
        
        try {
            await terrenosAPI.sincronizar();
            propiedades = terrenosAPI.getTerrenos();
            renderizarTerrenosHome(document.getElementById('propertiesContainer'));
            mostrarNotificacion('✅ Sincronizado correctamente', 'success');
        } catch (error) {
            mostrarNotificacion('❌ Error sincronizando', 'error');
        } finally {
            syncBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar';
            syncBtn.disabled = false;
        }
    };
    
    document.body.appendChild(syncBtn);
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
    card.dataset.id = terreno.id;
    
    // Imagen
    const imgContainer = document.createElement('div');
    imgContainer.className = 'property-image-container';
    
    const img = document.createElement('img');
    img.src = terreno.imagenes && terreno.imagenes.length > 0 
        ? terreno.imagenes[0] 
        : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&auto=format&fit=crop';
    img.alt = terreno.titulo || 'Terreno';
    img.className = 'property-image';
    
    if (!esAdmin) {
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            window.location.href = `property.html?id=${terreno.id}`;
        });
    }
    
    imgContainer.appendChild(img);
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
    
    // Ubicación
    const location = document.createElement('div');
    location.className = 'property-location';
    location.innerHTML = `<i class="fas fa-map-marker-alt"></i><span>${terreno.ubicacion || 'Sin ubicación'}</span>`;
    content.appendChild(location);
    
    // Precio
    const price = document.createElement('div');
    price.className = 'property-price';
    price.innerHTML = `<i class="fas fa-tag"></i><span>${formatoPrecio(terreno.precio)}</span>`;
    content.appendChild(price);
    
    // Tamaño
    const size = document.createElement('div');
    size.className = 'property-size';
    size.innerHTML = `<i class="fas fa-expand-alt"></i><span>${formatoNumero(terreno.tamaño)} m²</span>`;
    content.appendChild(size);
    
    // Descripción breve
    const description = document.createElement('p');
    description.className = 'property-description';
    if (terreno.descripcion) {
        const descCorta = terreno.descripcion.length > 100 
            ? terreno.descripcion.substring(0, 100) + '...' 
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
        detailBtn.className = 'btn-primary property-detail-btn';
        detailBtn.innerHTML = '<i class="fas fa-eye"></i> Ver detalles';
        actions.appendChild(detailBtn);
    } else {
        const adminActions = document.createElement('div');
        adminActions.className = 'admin-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar';
        editBtn.addEventListener('click', () => {
            editarTerreno(terreno.id);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
        deleteBtn.addEventListener('click', async () => {
            if (confirm('¿Estás seguro de eliminar este terreno?\n\nEsta acción no se puede deshacer.')) {
                await eliminarTerreno(terreno.id);
            }
        });
        
        adminActions.appendChild(editBtn);
        adminActions.appendChild(deleteBtn);
        actions.appendChild(adminActions);
    }
    
    content.appendChild(actions);
    card.appendChild(content);
    
    return card;
}

function buscarTerrenos(query) {
    if (!query.trim()) {
        const container = document.getElementById('propertiesContainer');
        if (container) renderizarTerrenosHome(container);
        return;
    }
    
    const resultados = terrenosAPI.buscarTerrenos(query);
    
    const container = document.getElementById('propertiesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (resultados.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>No se encontraron resultados</h3>
                <p>Intenta con otros términos de búsqueda</p>
            </div>
        `;
        return;
    }
    
    resultados.forEach(terreno => {
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
    configurarMapa(terreno.mapaUrl);
    configurarWhatsApp(terreno);
}

function actualizarPaginaDetalle(terreno) {
    const elementos = {
        'detailTitle': terreno.titulo || 'Terreno',
        'detailPrice': formatoPrecio(terreno.precio),
        'detailDescription': terreno.descripcion || 'Sin descripción',
        'detailLocationShort': terreno.ubicacion || 'Ubicación no disponible',
        'detailSizeShort': terreno.tamaño ? `${formatoNumero(terreno.tamaño)} m²` : 'No especificado',
        'detailPriceShort': formatoPrecio(terreno.precio)
    };
    
    Object.keys(elementos).forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = elementos[id];
    });
}

function configurarCarrusel(imagenes) {
    const imagenPrincipal = document.getElementById('detailImage');
    const btnAnterior = document.getElementById('prevImage');
    const btnSiguiente = document.getElementById('nextImage');
    
    if (!imagenPrincipal || !imagenes || imagenes.length === 0) return;
    
    let indiceActual = 0;
    
    function actualizarImagen() {
        imagenPrincipal.src = imagenes[indiceActual];
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

function configurarMapa(urlMapa) {
    const iframeMapa = document.getElementById('detailMap');
    if (!iframeMapa || !urlMapa) return;
    
    let urlEmbed = urlMapa;
    if (urlMapa.includes('/maps?') && !urlMapa.includes('/embed')) {
        urlEmbed = urlMapa.replace('/maps?', '/maps/embed?');
    }
    
    iframeMapa.src = urlEmbed;
}

function configurarWhatsApp(terreno) {
    const btnWhatsApp = document.getElementById('detailContactBtn');
    if (!btnWhatsApp) return;
    
    const mensaje = encodeURIComponent(
        `Hola! Estoy interesado en el terreno: ${terreno.titulo} (${terreno.ubicacion}). Precio: ${formatoPrecio(terreno.precio)}.`
    );
    btnWhatsApp.href = `https://wa.me/595984323438?text=${mensaje}`;
}

function mostrarError(mensaje) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="container">
                <div class="error-container">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>${mensaje}</h2>
                    <a href="index.html" class="btn-primary">Volver al inicio</a>
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
            usuario: 'admin',
            contraseña: 'admin123'
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
            
        } else {
            alert('Usuario o contraseña incorrectos');
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
    }
}

async function cargarTerrenosAdmin() {
    const container = document.getElementById('adminPropertiesContainer');
    const countElement = document.getElementById('propertyCount');
    
    if (!container) return;
    
    // Obtener terrenos actualizados
    propiedades = terrenosAPI.getTerrenos();
    
    // Actualizar contador
    if (countElement) {
        countElement.textContent = `${propiedades.length} terrenos`;
    }
    
    // Renderizar
    renderizarTerrenosAdmin(container);
}

function renderizarTerrenosAdmin(container) {
    if (!container || !propiedades) return;
    
    container.innerHTML = '';
    
    if (propiedades.length === 0) {
        container.innerHTML = `
            <div class="no-properties">
                <i class="fas fa-home"></i>
                <h3>No hay terrenos disponibles</h3>
                <p>Agrega tu primer terreno usando el formulario</p>
            </div>
        `;
        return;
    }
    
    propiedades.forEach(terreno => {
        const card = crearTarjetaTerreno(terreno, true);
        container.appendChild(card);
    });
}

async function configurarFormulario() {
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
                imagenes = ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&auto=format&fit=crop'];
            }
            
            // Crear objeto terreno
            const terrenoData = {
                id: editandoId || undefined,
                titulo,
                ubicacion,
                precio: Number(precio),
                tamaño: Number(tamaño),
                descripcion,
                email,
                telefono,
                mapaUrl,
                imagenes
            };
            
            // Guardar
            let terrenoGuardado;
            if (editandoId) {
                terrenoGuardado = await terrenosAPI.actualizarTerreno(editandoId, terrenoData);
            } else {
                terrenoGuardado = await terrenosAPI.agregarTerreno(terrenoData);
            }
            
            // Actualizar lista local
            propiedades = terrenosAPI.getTerrenos();
            
            // Actualizar vista
            await cargarTerrenosAdmin();
            
            // Limpiar formulario
            form.reset();
            editandoId = null;
            document.getElementById('imagePreview').innerHTML = '';
            btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar terreno</span>';
            
            // Mostrar mensaje
            mostrarNotificacion(editandoId ? '✅ Terreno actualizado' : '✅ Terreno agregado');
            
        } catch (error) {
            console.error('❌ Error guardando terreno:', error);
            mostrarNotificacion('Error: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

async function procesarImagenes(files) {
    const imagenes = [];
    const maxFiles = Math.min(files.length, 6);
    
    for (let i = 0; i < maxFiles; i++) {
        const file = files[i];
        
        // Validar que sea imagen
        if (!file.type.startsWith('image/')) continue;
        
        // Validar tamaño (máx 5MB)
        if (file.size > 5 * 1024 * 1024) continue;
        
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
        alert('Terreno no encontrado');
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
    
    // Cambiar texto del botón
    const btn = document.getElementById('submitPropertyBtn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> <span>Actualizar terreno</span>';
    }
    
    // Mostrar imágenes existentes
    const preview = document.getElementById('imagePreview');
    if (preview && terreno.imagenes && terreno.imagenes.length > 0) {
        preview.innerHTML = '<p style="grid-column: 1/-1; color: #666; margin-bottom: 10px;">Imágenes actuales:</p>';
        terreno.imagenes.forEach(img => {
            const imgEl = document.createElement('img');
            imgEl.src = img;
            imgEl.style.cssText = 'width: 100px; height: 100px; object-fit: cover; border-radius: 8px;';
            preview.appendChild(imgEl);
        });
    }
    
    // Scroll al formulario
    document.getElementById('propertyForm').scrollIntoView({ behavior: 'smooth' });
}

async function eliminarTerreno(id) {
    if (!confirm('¿Estás seguro de eliminar este terreno? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const eliminado = await terrenosAPI.borrarTerreno(id);
        
        if (eliminado) {
            // Actualizar lista local
            propiedades = terrenosAPI.getTerrenos();
            
            // Actualizar vista
            await cargarTerrenosAdmin();
            
            // Si estaba editando este terreno, resetear formulario
            if (editandoId === id) {
                editandoId = null;
                const form = document.getElementById('propertyForm');
                if (form) form.reset();
                const btn = document.getElementById('submitPropertyBtn');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-save"></i> <span>Guardar terreno</span>';
                }
                const preview = document.getElementById('imagePreview');
                if (preview) preview.innerHTML = '';
            }
            
            mostrarNotificacion('🗑️ Terreno eliminado');
        }
    } catch (error) {
        mostrarNotificacion('❌ Error eliminando terreno', 'error');
    }
}

// ==================== FUNCIONES GLOBALES ====================

function mostrarNotificacion(mensaje, tipo = 'success') {
    // Usar función existente o crear nueva
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion(mensaje, tipo);
    } else {
        // Crear notificación simple
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === 'success' ? '#28a745' : '#dc3545'};
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notificacion.textContent = mensaje;
        document.body.appendChild(notificacion);
        
        setTimeout(() => {
            notificacion.remove();
        }, 3000);
    }
}

// Hacer funciones disponibles globalmente
window.cargarTerrenosAdmin = cargarTerrenosAdmin;
window.sincronizarDatos = () => terrenosAPI.sincronizar();