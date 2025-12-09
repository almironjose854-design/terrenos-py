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
    STORAGE_MODE: 'gist',
    
    // Imágenes por defecto
    DEFAULT_IMAGES: [
        'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop'
    ],
    
    // Configuración adicional
    MAX_IMAGES: 6,
    MAX_FILE_SIZE: 5 * 1024 * 1024 // 5MB
};

// 2. CONFIGURACIÓN GIST (REEMPLAZA CON TUS DATOS)
const GIST_CONFIG = {
    id: '987fe85867a8107e905b4c9cb49ed6f3', // Ej: '69332d77d0ea881f401552e2'
    apiKey: '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', // Ej: 'ghp_xxxxxxxxxxxxxxxxxxxx'
    filename: 'terrenos-py.json'
};

// 3. CONFIGURACIÓN DE API
const API_CONFIG = {
    baseURL: window.location.origin.includes('vercel.app') 
        ? window.location.origin 
        : 'http://localhost:3000',
    endpoints: {
        gist: 'https://api.github.com/gists'
    }
};

// Exportar configuración
window.APP_CONFIG = APP_CONFIG;
window.GIST_CONFIG = GIST_CONFIG;
window.API_CONFIG = API_CONFIG;

// Verificar configuración
console.log('✅ Terrenos PY - Configuración GIST cargada');
console.log('📊 Modo de almacenamiento:', APP_CONFIG.STORAGE_MODE);

if (APP_CONFIG.STORAGE_MODE === 'gist') {
    if (!GIST_CONFIG.id || GIST_CONFIG.id === 'TU_GIST_ID_AQUI') {
        console.error('❌ GIST no configurado. Cambiando a modo local.');
        APP_CONFIG.STORAGE_MODE = 'local';
    }
}