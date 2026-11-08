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
