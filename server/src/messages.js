/** Mensajes de error del servidor en los idiomas de la app */
const messages = {
  es: {
    noPages: 'No se recibió ninguna página.',
    tooManyPages: 'Puedes enviar como máximo {max} páginas.',
    fileTooLarge: 'Cada archivo puede pesar como máximo {max} MB.',
    totalTooLarge: 'El documento completo supera {max} MB. Prueba con menos páginas.',
    unsupportedFormat: 'Formato no soportado ({type}). Usa JPG, PNG, WEBP, HEIC o PDF.',
    uploadError: 'Error al recibir los archivos.',
    requestTooLarge: 'La petición es demasiado grande.',
    noKey: 'El servidor no tiene configurada GEMINI_API_KEY (revisa server/.env).',
    invalidKey: 'La API key de Gemini no es válida. Revisa server/.env.',
    forbidden: 'La API key de Gemini no tiene permiso para usar este modelo.',
    modelNotFound: 'El modelo "{model}" no existe o no está disponible. Cambia GEMINI_MODEL en server/.env.',
    rateLimit: 'Se alcanzó el límite de uso de Gemini. Espera un momento y vuelve a intentarlo.',
    unavailable: 'El servicio de Gemini no está disponible ahora mismo. Inténtalo en unos segundos.',
    aiFailed: 'No se pudo procesar el documento con la IA.',
    invalidFormat: 'La IA devolvió una respuesta con un formato no válido. Inténtalo de nuevo.',
    notDocument:
      'No se detectó texto legible. Asegúrate de que el documento esté bien iluminado, enfocado y completo en la foto.',
    emptyAnswer: 'La IA no devolvió respuesta. Inténtalo de nuevo.',
    missingDocument: 'Falta el documento.',
    emptyText: 'El texto del documento está vacío.',
    emptyQuestion: 'La pregunta está vacía.',
    questionTooLong: 'La pregunta es demasiado larga.',
    invalidMode: 'Tipo de análisis no válido.',
    invalidLanguage: 'Idioma no soportado.',
    routeNotFound: 'Ruta no encontrada.',
    internal: 'Error interno del servidor.',
    unauthorized: 'Inicia sesión para usar Clarify.',
    sessionExpired: 'Tu sesión caducó. Vuelve a intentarlo.',
    emailNotVerified: 'Verifica tu correo electrónico para usar Clarify.',
  },
  en: {
    noPages: 'No pages were received.',
    tooManyPages: 'You can send at most {max} pages.',
    fileTooLarge: 'Each file can be at most {max} MB.',
    totalTooLarge: 'The whole document is larger than {max} MB. Try with fewer pages.',
    unsupportedFormat: 'Unsupported format ({type}). Use JPG, PNG, WEBP, HEIC or PDF.',
    uploadError: 'Error while receiving the files.',
    requestTooLarge: 'The request is too large.',
    noKey: 'The server has no GEMINI_API_KEY configured (check server/.env).',
    invalidKey: 'The Gemini API key is not valid. Check server/.env.',
    forbidden: 'The Gemini API key is not allowed to use this model.',
    modelNotFound: 'The model "{model}" does not exist or is unavailable. Change GEMINI_MODEL in server/.env.',
    rateLimit: 'Gemini usage limit reached. Wait a moment and try again.',
    unavailable: 'The Gemini service is unavailable right now. Try again in a few seconds.',
    aiFailed: 'The document could not be processed by the AI.',
    invalidFormat: 'The AI returned a response in an invalid format. Please try again.',
    notDocument: 'No readable text was found. Make sure the document is well lit, in focus and fully inside the photo.',
    emptyAnswer: 'The AI returned no answer. Please try again.',
    missingDocument: 'The document is missing.',
    emptyText: 'The document text is empty.',
    emptyQuestion: 'The question is empty.',
    questionTooLong: 'The question is too long.',
    invalidMode: 'Invalid analysis type.',
    invalidLanguage: 'Unsupported language.',
    routeNotFound: 'Route not found.',
    internal: 'Internal server error.',
    unauthorized: 'Sign in to use Clarify.',
    sessionExpired: 'Your session expired. Please try again.',
    emailNotVerified: 'Verify your email address to use Clarify.',
  },
};

/** @param {import('express').Request} req */
export function requestLang(req) {
  return String(req.headers['accept-language'] ?? '').toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function translate(lang, key, params = {}) {
  const template = messages[lang]?.[key] ?? messages.es[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}
