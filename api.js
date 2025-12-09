// api.js - Sistema de sincronización con GitHub Gist

class TerrenosAPI {
    constructor() {
        this.cacheKey = 'terrenos_py_cache';
        this.syncKey = 'terrenos_py_last_sync';
        this.propiedades = [];
        this.isOnline = navigator.onLine;
        
        // Detectar cambios en conexión
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    // ==================== MANEJO DE CONEXIÓN ====================
    
    handleOnline() {
        console.log('🌐 Conexión restaurada - Sincronizando...');
        this.isOnline = true;
        this.sincronizar();
    }
    
    handleOffline() {
        console.log('📴 Sin conexión - Usando caché local');
        this.isOnline = false;
    }
    
    // ==================== FUNCIONES PRINCIPALES ====================
    
    async obtenerTerrenos() {
        try {
            // Si hay conexión, intentar obtener del Gist
            if (this.isOnline && APP_CONFIG.STORAGE_MODE === 'gist') {
                const datosGist = await this.obtenerDelGist();
                if (datosGist) {
                    this.propiedades = datosGist;
                    this.guardarCache();
                    return this.propiedades;
                }
            }
            
            // Fallback a caché local
            return this.obtenerDelCache();
            
        } catch (error) {
            console.error('❌ Error obteniendo terrenos:', error);
            return this.obtenerDelCache();
        }
    }
    
    async guardarTerreno(terreno, esEdicion = false) {
        try {
            // Asignar ID si es nuevo
            if (!esEdicion && !terreno.id) {
                terreno.id = this.generarId();
                terreno.fechaCreacion = new Date().toISOString();
            }
            
            terreno.fechaActualizacion = new Date().toISOString();
            
            // Si hay conexión y está en modo Gist
            if (this.isOnline && APP_CONFIG.STORAGE_MODE === 'gist') {
                let propiedadesActualizadas;
                
                if (esEdicion) {
                    const index = this.propiedades.findIndex(t => t.id === terreno.id);
                    if (index !== -1) {
                        this.propiedades[index] = { ...this.propiedades[index], ...terreno };
                    } else {
                        this.propiedades.unshift(terreno);
                    }
                } else {
                    this.propiedades.unshift(terreno);
                }
                
                propiedadesActualizadas = this.propiedades;
                
                // Guardar en Gist
                const exito = await this.guardarEnGist(propiedadesActualizadas);
                
                if (exito) {
                    this.guardarCache();
                    return terreno;
                } else {
                    throw new Error('Error al guardar en Gist');
                }
            }
            
            // Modo offline o local
            if (esEdicion) {
                const index = this.propiedades.findIndex(t => t.id === terreno.id);
                if (index !== -1) {
                    this.propiedades[index] = terreno;
                } else {
                    this.propiedades.unshift(terreno);
                }
            } else {
                this.propiedades.unshift(terreno);
            }
            
            this.guardarCache();
            return terreno;
            
        } catch (error) {
            console.error('❌ Error guardando terreno:', error);
            throw error;
        }
    }
    
    async eliminarTerreno(id) {
        try {
            // Filtrar el terreno a eliminar
            const nuevasPropiedades = this.propiedades.filter(t => t.id !== id);
            
            // Si hay cambios
            if (nuevasPropiedades.length !== this.propiedades.length) {
                this.propiedades = nuevasPropiedades;
                
                // Si hay conexión y está en modo Gist
                if (this.isOnline && APP_CONFIG.STORAGE_MODE === 'gist') {
                    const exito = await this.guardarEnGist(this.propiedades);
                    
                    if (exito) {
                        this.guardarCache();
                        return true;
                    } else {
                        throw new Error('Error al eliminar del Gist');
                    }
                }
                
                // Modo offline o local
                this.guardarCache();
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Error eliminando terreno:', error);
            throw error;
        }
    }
    
    // ==================== FUNCIONES GIST ====================
    
    async obtenerDelGist() {
        try {
            console.log('📡 Obteniendo datos del Gist...');
            
            const response = await fetch(
                `https://api.github.com/gists/${GIST_CONFIG.id}`,
                {
                    headers: {
                        'Authorization': `token ${GIST_CONFIG.apiKey}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Error Gist: ${response.status}`);
            }
            
            const gistData = await response.json();
            const contenido = JSON.parse(gistData.files[GIST_CONFIG.filename].content);
            
            console.log(`✅ ${contenido.terrenos?.length || 0} terrenos obtenidos del Gist`);
            return contenido.terrenos || [];
            
        } catch (error) {
            console.error('❌ Error obteniendo del Gist:', error);
            return null;
        }
    }
    
    async guardarEnGist(terrenos) {
        try {
            console.log('💾 Guardando en Gist...');
            
            const contenido = {
                terrenos: terrenos,
                ultimaActualizacion: new Date().toISOString()
            };
            
            const response = await fetch(
                `https://api.github.com/gists/${GIST_CONFIG.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${GIST_CONFIG.apiKey}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: {
                            [GIST_CONFIG.filename]: {
                                content: JSON.stringify(contenido, null, 2)
                            }
                        }
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`Error guardando Gist: ${response.status}`);
            }
            
            console.log('✅ Datos guardados en Gist');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando en Gist:', error);
            return false;
        }
    }
    
    async sincronizar() {
        if (!this.isOnline || APP_CONFIG.STORAGE_MODE !== 'gist') {
            return false;
        }
        
        try {
            const datosGist = await this.obtenerDelGist();
            const datosLocales = this.obtenerDelCache();
            
            if (!datosGist) return false;
            
            // Fusionar datos (los del Gist tienen prioridad)
            const fusionados = this.fusionarDatos(datosLocales, datosGist);
            
            // Actualizar Gist si hay cambios
            if (JSON.stringify(fusionados) !== JSON.stringify(datosGist)) {
                await this.guardarEnGist(fusionados);
            }
            
            this.propiedades = fusionados;
            this.guardarCache();
            
            console.log('🔄 Sincronización completada');
            return true;
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            return false;
        }
    }
    
    // ==================== FUNCIONES AUXILIARES ====================
    
    fusionarDatos(locales, remotos) {
        const mapa = new Map();
        
        // Primero agregar todos los remotos
        remotos.forEach(terreno => {
            mapa.set(terreno.id, terreno);
        });
        
        // Luego agregar locales que no existan
        locales.forEach(terreno => {
            if (!mapa.has(terreno.id)) {
                mapa.set(terreno.id, terreno);
            }
        });
        
        return Array.from(mapa.values());
    }
    
    obtenerDelCache() {
        try {
            const cache = localStorage.getItem(this.cacheKey);
            if (cache) {
                const datos = JSON.parse(cache);
                this.propiedades = datos;
                console.log(`📁 ${datos.length} terrenos cargados de caché`);
                return datos;
            }
        } catch (error) {
            console.error('❌ Error cargando caché:', error);
        }
        
        return [];
    }
    
    guardarCache() {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(this.propiedades));
            localStorage.setItem(this.syncKey, new Date().toISOString());
        } catch (error) {
            console.error('❌ Error guardando caché:', error);
        }
    }
    
    generarId() {
        return 'terreno_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // ==================== FUNCIONES PÚBLICAS ====================
    
    async init() {
        await this.obtenerTerrenos();
        return this.propiedades;
    }
    
    async agregarTerreno(datos) {
        return await this.guardarTerreno(datos, false);
    }
    
    async actualizarTerreno(id, datos) {
        const terreno = { id, ...datos };
        return await this.guardarTerreno(terreno, true);
    }
    
    async borrarTerreno(id) {
        return await this.eliminarTerreno(id);
    }
    
    getTerrenos() {
        return this.propiedades;
    }
    
    getTerrenoPorId(id) {
        return this.propiedades.find(t => t.id === id);
    }
    
    buscarTerrenos(termino) {
        if (!termino) return this.propiedades;
        
        const busqueda = termino.toLowerCase();
        return this.propiedades.filter(terreno => {
            const texto = `${terreno.titulo || ''} ${terreno.ubicacion || ''} ${terreno.descripcion || ''}`.toLowerCase();
            return texto.includes(busqueda);
        });
    }
}

// Crear instancia global
const terrenosAPI = new TerrenosAPI();
window.terrenosAPI = terrenosAPI;