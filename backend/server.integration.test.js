import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@db-test:5432/translations_test'
});

async function waitForDB(maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database ready');
      return;
    } catch (err) {
      console.log(`⏳ Waiting for DB... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  throw new Error('Database not ready');
}

describe('Database Integration Tests', () => {
  
  before(async () => {
    await waitForDB();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS translations (
        id SERIAL PRIMARY KEY,
        source_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        target_lang VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  after(async () => {
    await pool.query('DROP TABLE IF EXISTS translations');
    await pool.end();
  });

  it('should connect to database', async () => {
    const result = await pool.query('SELECT NOW()');
    assert.ok(result.rows.length > 0);
  });

  it('should insert translation', async () => {
    const result = await pool.query(
      'INSERT INTO translations (source_text, target_lang, translated_text) VALUES ($1, $2, $3) RETURNING id',
      ['Hello', 'es', 'Hola']
    );
    assert.ok(result.rows[0].id);
  });

  it('should retrieve translations', async () => {
    await pool.query(
      'INSERT INTO translations (source_text, target_lang, translated_text) VALUES ($1, $2, $3)',
      ['Test', 'fr', 'Tester']
    );
    
    const result = await pool.query('SELECT * FROM translations WHERE source_text = $1', ['Test']);
    assert.strictEqual(result.rows.length, 1);
    assert.strictEqual(result.rows[0].source_text, 'Test');
  });
});
