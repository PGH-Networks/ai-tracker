const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// --- Initialize database tables ---
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      dept TEXT,
      description TEXT,
      tool TEXT,
      use_case TEXT,
      status TEXT DEFAULT 'next',
      pct INTEGER DEFAULT 0,
      notes TEXT,
      champion TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS champion TEXT;
    CREATE TABLE IF NOT EXISTS roadmap (
      id SERIAL PRIMARY KEY,
      bucket TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `);
  console.log('Database tables initialized');
}

// --- Projects API ---
app.get('/api/projects', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
  res.json(rows);
});

app.post('/api/projects', async (req, res) => {
  const { id, name, type, dept, description, tool, use_case, status, pct, notes, champion } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO projects (id, name, type, dept, description, tool, use_case, status, pct, notes, champion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [id, name, type, dept, description, tool, use_case, status, pct, notes, champion]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/projects/:id', async (req, res) => {
  const { name, type, dept, description, tool, use_case, status, pct, notes, champion } = req.body;
  const { rows } = await pool.query(
    `UPDATE projects SET name=$1, type=$2, dept=$3, description=$4, tool=$5,
     use_case=$6, status=$7, pct=$8, notes=$9, champion=$10 WHERE id=$11 RETURNING *`,
    [name, type, dept, description, tool, use_case, status, pct, notes, champion, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

app.delete('/api/projects/:id', async (req, res) => {
  await pool.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
  res.status(204).end();
});

// --- Roadmap API ---
app.get('/api/roadmap', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM roadmap ORDER BY bucket, sort_order');
  const grouped = { soon: [], mid: [], later: [] };
  for (const r of rows) {
    if (grouped[r.bucket]) grouped[r.bucket].push(r.title);
  }
  res.json(grouped);
});

app.put('/api/roadmap', async (req, res) => {
  const { soon, mid, later } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM roadmap');
    for (const [bucket, items] of Object.entries({ soon, mid, later })) {
      for (let i = 0; i < (items || []).length; i++) {
        await client.query(
          'INSERT INTO roadmap (bucket, title, sort_order) VALUES ($1, $2, $3)',
          [bucket, items[i], i]
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  res.json({ soon, mid, later });
});

// --- Serve frontend ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
