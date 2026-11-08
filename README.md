# Clarify — Escáner y Sintetizador de Documentos con IA

Aplicación móvil (React Native + Expo) que **captura documentos con la cámara** —notas manuscritas, páginas de libros, contratos, facturas— y usa **Google Gemini** para:

- 🔎 **OCR**: transcribir todo el texto, incluida la letra manuscrita.
- 📝 **Resumen ejecutivo** con puntos clave y datos destacados.
- 📊 **Extracción de datos clave y tablas** (fechas, importes, partes, cláusulas, partidas…).
- 💬 **Preguntas y respuestas** basadas únicamente en el contenido del documento.

Además:

- 📷 **Escáner con tres modos**: *Auto* (foto tras foto), *Manual* (recortar cada página al capturarla) y *Libro* (fotografía el libro abierto y se separa en dos páginas).
- ✂️ **Recortar y girar** cada página antes de analizarla, y reordenar o quitar páginas.
- 🧠 **Análisis especializado** según el documento: *Contrato* (riesgos, plazos, penalizaciones), *Estudio* (conceptos, preguntas de examen y tarjetas de repaso), *Factura* (totales, impuestos, alertas de cálculo) o *General*.
- 🌐 **Traducir** el documento completo a español, inglés, francés, portugués, alemán o italiano.
- ✏️ **Corregir el texto del OCR** y regenerar el resumen, los datos y las tablas.
- 📤 **Exportar** a **PDF** y a **Excel (.xlsx)** con el diseño de la app, o compartir como texto.
- 📋 **Copiar** referencias, números de transacción y respuestas con un toque.
- 🔍 **Buscar** en el historial (título, contenido, datos) y filtrar por tipo de documento.
- 🌙 **Modo oscuro** (automático o manual) y **app en español o inglés**, desde Ajustes.
- Importar fotos de la galería o PDF, hasta 10 páginas por documento, con historial guardado en el dispositivo.

## Diseño

Interfaz propia con fondo gris cálido, botones tipo píldora, tarjetas con **degradado naranja** de marca, tipografía **Plus Jakarta Sans** e iconos de línea. Navegación con barra flotante (Inicio · Documentos · Escanear · Ajustes). La pantalla *Preguntar* y el visor de la cámara usan un tema oscuro propio. Icono y pantalla de carga en `assets/` (se regeneran con `assets/make-icons.ps1`).

