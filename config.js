// CONFIGURACIÓN TERREMOS PY - GIST
// ==================================

// 1. CONFIGURACIÓN BÁSICA
const APP_CONFIG = {
    // Credenciales del administrador
    ADMIN: {
        USERNAME: 'admin',
        PASSWORD: 'admin123'
    },
    
    // Contacto WhatsApp
    WHATSAPP: '595984323438',
    
    // Modo de almacenamiento: 'local' o 'gist'
    STORAGE_MODE: 'local', // Cambiado a local temporalmente por error 401
    
    // Imágenes por defecto
    DEFAULT_IMAGES: [
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w-800&auto=format&fit=crop&q=80'
    ],
    
    // Configuración adicional
    MAX_IMAGES: 6,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    
    // Precios formateados
    formatPrice: (precio) => {
        if (!precio || precio <= 0) return 'Consultar precio';
        return `Gs. ${parseInt(precio).toLocaleString('es-PY')}`;
    }
};

// 2. CONFIGURACIÓN GIST - CON TUS DATOS (modo fallback)
const GIST_CONFIG = {
    id: '987fe85867a8107e905b4c9cb49ed6f3',
    apiKey: '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',
    filename: 'terrenos-py.json',
    gistUrl: 'https://gist.github.com/987fe85867a8107e905b4c9cb49ed6f3',
    // Modo seguro: si falla Gist, usa localStorage
    fallbackEnabled: true
};

// 3. CONFIGURACIÓN DE API
const API_CONFIG = {
    baseURL: window.location.origin.includes('vercel.app') 
        ? window.location.origin 
        : window.location.protocol + '//' + window.location.host,
    endpoints: {
        gist: 'https://api.github.com/gists'
    },
    timeout: 10000 // 10 segundos timeout
};

// 4. SITIO CONFIG
const SITE_CONFIG = {
    name: 'Terrenos PY',
    slogan: 'Tu terreno ideal en Paraguay',
    phone: '+595 984 323 438',
    email: 'info@terrenospy.com',
    address: 'Asunción, Paraguay',
    whatsapp: '595984323438',
    social: {
        facebook: '#',
        instagram: '#',
        twitter: '#',
        linkedin: '#'
    }
};

// 5. VERIFICACIÓN DE CONFIGURACIÓN
function verificarConfiguracion() {
    console.log('🔍 Verificando configuración...');
    
    // Verificar modo de almacenamiento
    if (APP_CONFIG.STORAGE_MODE === 'gist') {
        if (!GIST_CONFIG.id || GIST_CONFIG.id === 'TU_GIST_ID_AQUI') {
            console.warn('⚠️ GIST ID no configurado. Cambiando a modo local.');
            APP_CONFIG.STORAGE_MODE = 'local';
        } else if (!GIST_CONFIG.apiKey || GIST_CONFIG.apiKey.includes('TU_TOKEN')) {
            console.warn('⚠️ Token GIST no configurado. Cambiando a modo local.');
            APP_CONFIG.STORAGE_MODE = 'local';
        } else {
            console.log('✅ Configuración GIST válida');
        }
    }
    
    return APP_CONFIG.STORAGE_MODE;
}

// Exportar configuración
window.APP_CONFIG = APP_CONFIG;
window.GIST_CONFIG = GIST_CONFIG;
window.API_CONFIG = API_CONFIG;
window.SITE_CONFIG = SITE_CONFIG;
window.verificarConfiguracion = verificarConfiguracion;

// Verificar configuración al cargar
const modoActual = verificarConfiguracion();
console.log('✅ Terrenos PY - Configuración cargada');
console.log('📊 Modo de almacenamiento:', modoActual);
console.log('🔐 Modo seguro activado:', GIST_CONFIG.fallbackEnabled);