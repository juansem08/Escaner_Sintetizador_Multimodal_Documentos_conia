// Lista los modelos de Gemini que tu API key puede usar para generar contenido.
// Uso (desde server/): npm run models
import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  console.error('Falta GEMINI_API_KEY en server/.env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pager = await ai.models.list();
for await (const model of pager) {
  if ((model.supportedActions ?? []).includes('generateContent')) {
    console.log(model.name.replace(/^models\//, ''));
  }
}
