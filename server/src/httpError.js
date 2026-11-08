export class HttpError extends Error {
  /**
   * @param {number} status Código HTTP que se devolverá a la app
   * @param {string} key Clave del mensaje en messages.js (se traduce al idioma de la petición)
   * @param {Record<string, string | number>} [params] Valores para interpolar en el mensaje
   */
  constructor(status, key, params = {}) {
    super(key);
    this.status = status;
    this.key = key;
    this.params = params;
  }
}
