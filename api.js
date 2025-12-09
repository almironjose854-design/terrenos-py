// api.js - Sistema de sincronización con GitHub Gist
// Versión 2.0 - Con manejo robusto de errores

class TerrenosAPI {
    constructor() {
        this.cacheKey = 'terrenos_py_cache_v3';
        this.syncKey = 'terrenos_py_last_sync_v3';
        this.connectionKey = 'terrenos_py_connection_status';
        this.errorKey = 'terrenos_py_last_error';
        this.propiedades = [];
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        this.gistEnabled = APP_CONFIG.STORAGE_MODE === 'gist';
        
        // Detectar cambios en conexión
        this.initConnectionListeners();
        
        // Cargar caché inicial
        this.loadCache();
        
        // Verificar token Gist
        this.verificarTokenGist();
    }
    
    // ==================== INICIALIZACIÓN ====================
    
    initConnectionListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 Conexión restaurada');
            this.isOnline = true;
            localStorage.setItem(this.connectionKey, 'online');
            this.autoSync();
        });
        
        window.addEventListener('offline', () => {
            console.log('📴 Sin conexión - Modo offline');
            this.isOnline = false;
            localStorage.setItem(this.connectionKey, 'offline');
        });
        
        // Estado inicial
        localStorage.setItem(this.connectionKey, this.isOnline ? 'online' : 'offline');
    }
    
    verificarTokenGist() {
        if (!this.gistEnabled) return;
        
        const token = GIST_CONFIG.apiKey;
        if (!token || token.includes('TU_TOKEN') || token.length < 20) {
            console.error('❌ Token Gist inválido o no configurado');
            this.gistEnabled = false;
            APP_CONFIG.STORAGE_MODE = 'local';
            localStorage.setItem('gist_token_error', 'true');
        }
    }
    
    // ==================== FUNCIONES PRINCIPALES ====================
    
    async init() {
        try {
            console.log('🔄 Inicializando Terrenos API...');
            
            // Si Gist está habilitado y hay conexión, intentar obtener
            if (this.gistEnabled && this.isOnline) {
                console.log('📡 Intentando conectar con Gist...');
                const datosGist = await this.obtenerDelGist();
                
                if (datosGist && datosGist.success) {
                    this.propiedades = datosGist.data || [];
                    console.log(`✅ ${this.propiedades.length} terrenos cargados desde Gist`);
                    this.guardarCache();
                    return this.propiedades;
                } else {
                    console.warn('⚠️ Falló conexión con Gist, usando caché local');
                }
            }
            
            // Fallback a caché local
            return this.obtenerDelCache();
            
        } catch (error) {
            console.error('❌ Error inicializando API:', error);
            return this.obtenerDelCache();
        }
    }
    
    async obtenerTerrenos() {
        return await this.init();
    }
    
    async guardarTerreno(terreno, esEdicion = false) {
        try {
            // Validar terreno
            if (!terreno.titulo || !terreno.ubicacion) {
                throw new Error('Título y ubicación son requeridos');
            }
            
            // Preparar datos
            const terrenoCompleto = {
                id: esEdicion ? terreno.id : this.generarId(),
                titulo: terreno.titulo.trim(),
                ubicacion: terreno.ubicacion.trim(),
                precio: parseInt(terreno.precio) || 0,
                tamaño: parseInt(terreno.tamaño) || 0,
                descripcion: terreno.descripcion?.trim() || '',
                imagenes: Array.isArray(terreno.imagenes) ? terreno.imagenes : [],
                mapaUrl: terreno.mapaUrl?.trim() || '',
                email: terreno.email?.trim() || SITE_CONFIG.email,
                telefono: terreno.telefono?.trim() || SITE_CONFIG.phone,
                fechaCreacion: esEdicion ? (terreno.fechaCreacion || new Date().toISOString()) : new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
                destacado: terreno.destacado || false,
                estado: terreno.estado || 'disponible'
            };
            
            // Si no hay imágenes, usar por defecto
            if (terrenoCompleto.imagenes.length === 0) {
                terrenoCompleto.imagenes = APP_CONFIG.DEFAULT_IMAGES.slice(0, 2);
            }
            
            // Actualizar localmente
            if (esEdicion) {
                const index = this.propiedades.findIndex(t => t.id === terrenoCompleto.id);
                if (index !== -1) {
                    this.propiedades[index] = terrenoCompleto;
                } else {
                    this.propiedades.unshift(terrenoCompleto);
                }
            } else {
                this.propiedades.unshift(terrenoCompleto);
            }
            
            // Guardar en Gist si está habilitado y hay conexión
            if (this.gistEnabled && this.isOnline) {
                const resultado = await this.guardarEnGist();
                if (!resultado.success) {
                    console.warn('⚠️ Error guardando en Gist, pero se guardó localmente');
                }
            }
            
            // Guardar en caché local siempre
            this.guardarCache();
            
            console.log(`💾 Terreno ${esEdicion ? 'actualizado' : 'guardado'}:`, terrenoCompleto.titulo);
            return {
                success: true,
                data: terrenoCompleto,
                message: `Terreno ${esEdicion ? 'actualizado' : 'agregado'} correctamente`,
                savedLocally: true
            };
            
        } catch (error) {
            console.error('❌ Error guardando terreno:', error);
            return {
                success: false,
                error: error.message,
                message: 'Error al guardar el terreno',
                savedLocally: false
            };
        }
    }
    
    async eliminarTerreno(id) {
        try {
            const index = this.propiedades.findIndex(t => t.id === id);
            
            if (index === -1) {
                throw new Error('Terreno no encontrado');
            }
            
            const terrenoEliminado = this.propiedades[index];
            this.propiedades.splice(index, 1);
            
            // Actualizar Gist si está habilitado
            if (this.gistEnabled && this.isOnline) {
                await this.guardarEnGist();
            }
            
            // Actualizar caché
            this.guardarCache();
            
            console.log('🗑️ Terreno eliminado:', terrenoEliminado.titulo);
            return {
                success: true,
                message: 'Terreno eliminado correctamente',
                data: terrenoEliminado
            };
            
        } catch (error) {
            console.error('❌ Error eliminando terreno:', error);
            return {
                success: false,
                error: error.message,
                message: 'Error al eliminar el terreno'
            };
        }
    }
    
    // ==================== FUNCIONES GIST ====================
    
    async obtenerDelGist() {
        if (!this.gistEnabled || !this.isOnline) {
            return { 
                success: false, 
                error: this.gistEnabled ? 'Sin conexión a internet' : 'Gist deshabilitado',
                fallback: true 
            };
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            console.log('🔍 Solicitando datos del Gist...');
            
            const response = await fetch(
                `https://api.github.com/gists/${GIST_CONFIG.id}`,
                {
                    headers: {
                        'Authorization': `token ${GIST_CONFIG.apiKey}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Terrenos-PY-App'
                    },
                    signal: controller.signal
                }
            );
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('❌ Error 401: Token de GitHub inválido o expirado');
                    this.gistEnabled = false;
                    APP_CONFIG.STORAGE_MODE = 'local';
                    localStorage.setItem('gist_auth_error', 'true');
                    throw new Error('Token de GitHub inválido. Cambiando a modo local.');
                } else if (response.status === 404) {
                    console.warn('⚠️ Gist no encontrado, usando datos locales');
                    return { success: false, error: 'Gist no encontrado', fallback: true };
                }
                throw new Error(`Error Gist: ${response.status} ${response.statusText}`);
            }
            
            const gistData = await response.json();
            
            if (!gistData.files || !gistData.files[GIST_CONFIG.filename]) {
                throw new Error('Formato de Gist inválido');
            }
            
            const contenido = JSON.parse(gistData.files[GIST_CONFIG.filename].content);
            const terrenos = contenido.terrenos || [];
            
            console.log(`✅ ${terrenos.length} terrenos obtenidos del Gist`);
            localStorage.removeItem('gist_auth_error');
            
            return {
                success: true,
                data: terrenos,
                metadata: {
                    ultimaActualizacion: contenido.ultimaActualizacion,
                    totalTerrenos: terrenos.length
                }
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo del Gist:', error.message);
            
            // Deshabilitar Gist si es error de autenticación
            if (error.message.includes('Token') || error.message.includes('401')) {
                this.gistEnabled = false;
                APP_CONFIG.STORAGE_MODE = 'local';
            }
            
            return {
                success: false,
                error: error.message,
                fallback: true
            };
        }
    }
    
    async guardarEnGist() {
        if (!this.gistEnabled || !this.isOnline) {
            console.log('📴 Modo offline - Guardando solo en caché local');
            return { success: true, offline: true };
        }
        
        if (this.syncInProgress) {
            console.log('🔄 Sincronización en progreso...');
            return { success: true, queued: true };
        }
        
        this.syncInProgress = true;
        
        try {
            const contenido = {
                terrenos: this.propiedades,
                ultimaActualizacion: new Date().toISOString(),
                totalTerrenos: this.propiedades.length,
                version: '2.0',
                app: 'Terrenos PY'
            };
            
            const response = await fetch(
                `https://api.github.com/gists/${GIST_CONFIG.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${GIST_CONFIG.apiKey}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json',
                        'User-Agent': 'Terrenos-PY-App'
                    },
                    body: JSON.stringify({
                        description: `Terrenos PY - ${this.propiedades.length} terrenos`,
                        files: {
                            [GIST_CONFIG.filename]: {
                                content: JSON.stringify(contenido, null, 2)
                            }
                        }
                    })
                }
            );
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.gistEnabled = false;
                    APP_CONFIG.STORAGE_MODE = 'local';
                    throw new Error('Token inválido. Cambiando a modo local.');
                }
                throw new Error(`Error guardando Gist: ${response.status}`);
            }
            
            console.log(`✅ ${this.propiedades.length} terrenos guardados en Gist`);
            return {
                success: true,
                message: 'Datos sincronizados correctamente'
            };
            
        } catch (error) {
            console.error('❌ Error guardando en Gist:', error.message);
            return {
                success: false,
                error: error.message,
                message: 'Error al sincronizar con la nube'
            };
        } finally {
            this.syncInProgress = false;
        }
    }
    
    async autoSync() {
        if (!this.gistEnabled || !this.isOnline) {
            return false;
        }
        
        try {
            console.log('🔄 Sincronización automática...');
            const datosGist = await this.obtenerDelGist();
            
            if (datosGist.success) {
                // Fusionar datos inteligentemente
                const fusionados = this.fusionarDatos(this.propiedades, datosGist.data);
                
                if (JSON.stringify(fusionados) !== JSON.stringify(this.propiedades)) {
                    this.propiedades = fusionados;
                    this.guardarCache();
                    console.log('✅ Datos sincronizados desde la nube');
                    
                    // Disparar evento de sincronización
                    window.dispatchEvent(new CustomEvent('terrenos-sincronizados', {
                        detail: { count: this.propiedades.length }
                    }));
                }
            }
            return true;
        } catch (error) {
            console.warn('⚠️ Error en sincronización automática:', error.message);
            return false;
        }
    }
    
    // ==================== FUNCIONES AUXILIARES ====================
    
    fusionarDatos(locales, remotos) {
        const mapa = new Map();
        
        // Agregar todos los remotos primero
        remotos.forEach(terreno => {
            if (terreno.id) {
                mapa.set(terreno.id, terreno);
            }
        });
        
        // Agregar locales que no existan o sean más recientes
        locales.forEach(terrenoLocal => {
            if (!terrenoLocal.id) return;
            
            const terrenoRemoto = mapa.get(terrenoLocal.id);
            
            if (!terrenoRemoto) {
                // Terreno nuevo local
                mapa.set(terrenoLocal.id, terrenoLocal);
            } else {
                // Comparar fechas de actualización
                const fechaLocal = new Date(terrenoLocal.fechaActualizacion || 0);
                const fechaRemota = new Date(terrenoRemoto.fechaActualizacion || 0);
                
                if (fechaLocal > fechaRemota) {
                    // Local es más reciente
                    mapa.set(terrenoLocal.id, terrenoLocal);
                }
            }
        });
        
        return Array.from(mapa.values()).sort((a, b) => 
            new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion)
        );
    }
    
    loadCache() {
        try {
            const cache = localStorage.getItem(this.cacheKey);
            if (cache) {
                const datos = JSON.parse(cache);
                if (Array.isArray(datos)) {
                    this.propiedades = datos;
                    console.log(`📁 ${datos.length} terrenos cargados de caché`);
                }
            }
        } catch (error) {
            console.error('❌ Error cargando caché:', error);
            this.propiedades = [];
        }
    }
    
    guardarCache() {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(this.propiedades));
            localStorage.setItem(this.syncKey, new Date().toISOString());
        } catch (error) {
            console.error('❌ Error guardando caché:', error);
        }
    }
    
    obtenerDelCache() {
        return [...this.propiedades];
    }
    
    generarId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `terreno_${timestamp}_${random}`.substring(0, 50);
    }
    
    // ==================== FUNCIONES PÚBLICAS ====================
    
    async sincronizar() {
        return await this.autoSync();
    }
    
    async agregarTerreno(datos) {
        return await this.guardarTerreno(datos, false);
    }
    
    async actualizarTerreno(id, datos) {
        return await this.guardarTerreno({ id, ...datos }, true);
    }
    
    async borrarTerreno(id) {
        return await this.eliminarTerreno(id);
    }
    
    getTerrenos() {
        return [...this.propiedades];
    }
    
    getTerrenoPorId(id) {
        return this.propiedades.find(t => t.id === id);
    }
    
    buscarTerrenos(termino) {
        if (!termino || termino.trim() === '') {
            return [...this.propiedades];
        }
        
        const busqueda = termino.toLowerCase().trim();
        return this.propiedades.filter(terreno => {
            const texto = [
                terreno.titulo || '',
                terreno.ubicacion || '',
                terreno.descripcion || '',
                terreno.precio ? APP_CONFIG.formatPrice(terreno.precio) : ''
            ].join(' ').toLowerCase();
            
            return texto.includes(busqueda);
        });
    }
    
    getTerrenosDestacados() {
        return this.propiedades.filter(t => t.destacado).slice(0, 6);
    }
    
    getTotalTerrenos() {
        return this.propiedades.length;
    }
    
    getEstadoConexion() {
        const gistError = localStorage.getItem('gist_auth_error') === 'true';
        const tokenError = localStorage.getItem('gist_token_error') === 'true';
        
        return {
            online: this.isOnline,
            modo: APP_CONFIG.STORAGE_MODE,
            gistHabilitado: this.gistEnabled,
            ultimaSincronizacion: localStorage.getItem(this.syncKey),
            totalTerrenos: this.propiedades.length,
            errores: {
                gistAuth: gistError,
                token: tokenError
            }
        };
    }
    
    limpiarCache() {
        try {
            localStorage.removeItem(this.cacheKey);
            localStorage.removeItem(this.syncKey);
            localStorage.removeItem('gist_auth_error');
            localStorage.removeItem('gist_token_error');
            this.propiedades = [];
            console.log('🧹 Caché limpiado');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    // Nueva función para probar conexión Gist
    async probarConexionGist() {
        if (!this.gistEnabled) {
            return { success: false, error: 'Gist deshabilitado' };
        }
        
        try {
            const response = await fetch(
                `https://api.github.com/gists/${GIST_CONFIG.id}`,
                {
                    headers: {
                        'Authorization': `token ${GIST_CONFIG.apiKey}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                return { success: true, message: 'Conexión Gist exitosa' };
            } else if (response.status === 401) {
                return { success: false, error: 'Token inválido o expirado' };
            } else {
                return { success: false, error: `Error ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Crear instancia global
const terrenosAPI = new TerrenosAPI();
window.terrenosAPI = terrenosAPI;

// Inicializar auto-sincronización solo si Gist está habilitado
if (terrenosAPI.gistEnabled) {
    setInterval(() => {
        if (terrenosAPI.isOnline) {
            terrenosAPI.autoSync();
        }
    }, 120000);
}

console.log('✅ API de Terrenos PY inicializada');
console.log('📊 Modo actual:', APP_CONFIG.STORAGE_MODE);
console.log('🔐 Gist habilitado:', terrenosAPI.gistEnabled);