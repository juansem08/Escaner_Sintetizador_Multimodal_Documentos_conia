// Verificación de las sesiones de Firebase Authentication.
// La app envía "Authorization: Bearer <ID token>" y aquí comprobamos la firma con las
// claves públicas de Google: no hace falta ninguna credencial secreta de Firebase.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpError } from './httpError.js';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || '';

/** Si no hay FIREBASE_PROJECT_ID (desarrollo local) el servidor funciona sin login */
export const authEnabled = Boolean(projectId);

// jose guarda en caché las claves y las renueva cuando Google las rota
const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

/** Middleware: solo deja pasar a usuarios con sesión iniciada y correo verificado */
export async function requireAuth(req, _res, next) {
  if (!authEnabled) return next();

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return next(new HttpError(401, 'unauthorized'));

  let payload;
  try {
    ({ payload } = await jwtVerify(token, googleKeys, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    }));
  } catch (err) {
    const expired = err?.code === 'ERR_JWT_EXPIRED';
    return next(new HttpError(401, expired ? 'sessionExpired' : 'unauthorized'));
  }

  if (typeof payload.sub !== 'string' || !payload.sub) return next(new HttpError(401, 'unauthorized'));
  if (payload.email_verified !== true) return next(new HttpError(403, 'emailNotVerified'));

  req.user = { uid: payload.sub, email: typeof payload.email === 'string' ? payload.email : '' };
  next();
}
