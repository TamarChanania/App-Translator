import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import pkg from 'pg';
const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@db:5432/translations'
});

// פונקציית תרגום עם טיפול בשגיאות למניעת ערכי null
async function translateText(text, target) {
  try {
    const res = await fetch('http://translator:5000/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'auto', target, format: 'text' })
    });

    if (!res.ok) {
      console.error('Translator service error:', res.status);
      return '(שגיאה בתקשורת עם המתרגם)';
    }

    const data = await res.json();
    // וודוא שהשדה קיים ולא null
    return data.translatedText || '(תרגום ריק)';
  } catch (err) {
    console.error('Translation connection error:', err.message);
    return '(שגיאה בחיבור לשירות)';
  }
}

app.post('/translate', async (req, res) => {
  try {
    const { text, target } = req.body;
    if (!text || !target) return res.status(400).json({ error: 'Missing text or target' });

    const translatedText = await translateText(text, target);

    // שמירה למסד הנתונים
    await pool.query(
      'INSERT INTO translations (source_text, target_lang, translated_text) VALUES ($1, $2, $3)', 
      [text, target, translatedText]
    );

    res.json({ translatedText });
  } catch (dbErr) {
    console.error('Database Error:', dbErr);
    res.status(500).json({ error: 'Failed to save to database' });
  }
});

app.get('/health', async (req, res) => {
  try {
    // אתגר: נבדוק שהחיבור ל-PostgreSQL באמת חי ומגיב
    await pool.query('SELECT 1');
    
    // אם הבדיקה הצליחה, נחזיר סטטוס 200 (הצלחה) לקוברנטיס
    res.status(200).json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date() 
    });
  } catch (dbErr) {
    // אם הדאטה-בייס נפל, נחזיר סטטוס 500 כדי שקוברנטיס ידע שהפוד לא מוכן לקבל תעבורה
    console.error('Health check failed - Database unreachable:', dbErr.message);
    res.status(500).json({ 
      status: 'error', 
      database: 'unreachable',
      error: dbErr.message 
    });
  }
});

// התיקון הקריטי: האזנה ל-0.0.0.0 כדי שדוקר יחשוף את הפורט למחשב שלך
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
 