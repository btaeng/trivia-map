/* eslint-disable no-undef */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));

const ai = new GoogleGenAI(process.env.GEMINI_API_KEY);
const triviaCache = new Map();

app.post('/api/trivia', async (req, res) => {
  const { location, category } = req.body;
  const cacheKey = `${location}:${category}`;

  // Prepare cache for this location
  if (!triviaCache.has(cacheKey)) {
    triviaCache.set(cacheKey, new Set());
  }
  const usedQuestions = Array.from(triviaCache.get(cacheKey));

  try {
    console.log('Generating trivia for location:', location, 'category:', category);

    const prompt = `
Create one fun, factual multiple-choice trivia question about ${location},
specifically in the category: ${category}.

Do NOT repeat any of the following questions:
${usedQuestions.length > 0 ? usedQuestions.map(q => `- ${q}`).join('\n') : '(none yet)'}

Respond ONLY in JSON with keys:
"question": string,
"choices": array of 4 strings,
"answerIndex": number (0–3).
`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = result.text.trim();
    console.log('Raw Gemini output:', text);
    text = text.replace(/```json/i, '').replace(/```/g, '').trim();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const safeJson = text.slice(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(safeJson);

    const newQuestion = parsed.question;

    // Store question in cache
    triviaCache.get(cacheKey).add(newQuestion);

    res.json({
      question: parsed.question,
      choices: parsed.choices,
      answerIndex: parsed.answerIndex
    });
  } catch (err) {
    console.error('Error parsing Gemini output:', err);
    res.status(500).json({ error: 'Failed to fetch trivia question.' });
  }
});

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';

// app.listen(PORT, HOST, () => {
//   console.log(`Server running on http://${HOST}:${PORT}`);
// });

export default app;