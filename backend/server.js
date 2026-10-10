import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { Octokit } from 'octokit';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));

// Base de datos SQLite
const dbPath = path.join(__dirname, 'cotizaciones.db');
const db = new Database(dbPath);

// Inicializar tabla de cotizaciones
db.exec(`
  CREATE TABLE IF NOT EXISTS cotizaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT UNIQUE NOT NULL,
    data JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_to_github INTEGER DEFAULT 0,
    github_commit_sha TEXT
  );
  
  CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    quote_number TEXT,
    status TEXT NOT NULL,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Inicializar Octokit (GitHub API)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// ===== RUTAS =====

/**
 * POST /api/cotizaciones
 * Guardar o actualizar cotización y sincronizar con GitHub
 */
app.post('/api/cotizaciones', async (req, res) => {
  try {
    const { quoteNumber, data } = req.body;

    if (!quoteNumber || !data) {
      return res.status(400).json({ error: 'quote_number y data son requeridos' });
    }

    // Guardar en SQLite
    const stmt = db.prepare(`
      INSERT INTO cotizaciones (quote_number, data, synced_to_github)
      VALUES (?, ?, 0)
      ON CONFLICT(quote_number) DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(quoteNumber, JSON.stringify(data));

    // Sincronizar con GitHub si token está disponible
    let githubResult = null;
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
      githubResult = await syncToGithub(quoteNumber, data);
    }

    // Log
    logSync(quoteNumber, 'save', githubResult ? 'success' : 'pending', 
            githubResult ? `Sincronizado: ${githubResult.commit_sha}` : 'Pendiente de sincronización');

    res.json({
      success: true,
      message: 'Cotización guardada exitosamente',
      synced: !!githubResult,
      githubCommit: githubResult?.commit_sha || null
    });

  } catch (error) {
    console.error('Error al guardar cotización:', error);
    logSync(null, 'save', 'error', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cotizaciones/:quoteNumber
 * Obtener cotización guardada
 */
app.get('/api/cotizaciones/:quoteNumber', async (req, res) => {
  try {
    const { quoteNumber } = req.params;
    const stmt = db.prepare('SELECT * FROM cotizaciones WHERE quote_number = ? LIMIT 1');
    const row = stmt.get(quoteNumber);

    if (!row) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json({
      success: true,
      data: {
        quoteNumber: row.quote_number,
        data: JSON.parse(row.data),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        syncedToGithub: !!row.synced_to_github,
        githubCommitSha: row.github_commit_sha
      }
    });

  } catch (error) {
    console.error('Error al obtener cotización:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cotizaciones
 * Listar todas las cotizaciones
 */
app.get('/api/cotizaciones', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT quote_number, created_at, updated_at, synced_to_github 
      FROM cotizaciones 
      ORDER BY updated_at DESC 
      LIMIT 100
    `);
    const rows = stmt.all();

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    console.error('Error al listar cotizaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/cotizaciones/:quoteNumber
 * Eliminar cotización local (GitHub permanece)
 */
app.delete('/api/cotizaciones/:quoteNumber', (req, res) => {
  try {
    const { quoteNumber } = req.params;
    const stmt = db.prepare('DELETE FROM cotizaciones WHERE quote_number = ?');
    stmt.run(quoteNumber);

    logSync(quoteNumber, 'delete', 'success', 'Eliminada localmente');

    res.json({
      success: true,
      message: 'Cotización eliminada del almacenamiento local'
    });

  } catch (error) {
    console.error('Error al eliminar cotización:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sync-github
 * Forzar sincronización manual con GitHub
 */
app.post('/api/sync-github', async (req, res) => {
  try {
    if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
      return res.status(400).json({ error: 'GitHub no está configurado' });
    }

    const { quoteNumber } = req.body;
    const stmt = db.prepare('SELECT * FROM cotizaciones WHERE quote_number = ?');
    const row = stmt.get(quoteNumber);

    if (!row) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const result = await syncToGithub(quoteNumber, JSON.parse(row.data));

    res.json({
      success: true,
      message: 'Sincronizado con GitHub',
      commitSha: result.commit_sha,
      url: result.url
    });

  } catch (error) {
    console.error('Error en sincronización:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sync-log
 * Ver historial de sincronizaciones
 */
app.get('/api/sync-log', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM sync_log 
      ORDER BY timestamp DESC 
      LIMIT 50
    `);
    const logs = stmt.all();

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });

  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    github_configured: !!(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO),
    timestamp: new Date().toISOString()
  });
});

// ===== FUNCIONES AUXILIARES =====

/**
 * Sincronizar cotización a GitHub
 */
async function syncToGithub(quoteNumber, data) {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPO) {
    throw new Error('GitHub no está configurado');
  }

  const [owner, repo] = process.env.GITHUB_REPO.split('/');
  const filePath = `cotizaciones/${quoteNumber}.json`;
  const content = JSON.stringify(data, null, 2);
  const encodedContent = Buffer.from(content).toString('base64');

  try {
    // Verificar si el archivo ya existe
    let sha = null;
    try {
      const existing = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath
      });
      sha = existing.data.sha;
    } catch (e) {
      // Archivo no existe, crear nuevo
    }

    // Crear o actualizar archivo
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `Actualizar cotización: ${quoteNumber} (${new Date().toISOString()})`,
      content: encodedContent,
      sha: sha || undefined
    });

    // Actualizar en base de datos
    const updateStmt = db.prepare(`
      UPDATE cotizaciones 
      SET synced_to_github = 1, github_commit_sha = ?
      WHERE quote_number = ?
    `);
    updateStmt.run(response.commit.sha, quoteNumber);

    return {
      success: true,
      commit_sha: response.commit.sha,
      url: response.commit.html_url
    };

  } catch (error) {
    console.error(`Error sincronizando ${quoteNumber} a GitHub:`, error);
    throw error;
  }
}

/**
 * Registrar evento de sincronización
 */
function logSync(quoteNumber, action, status, message) {
  const stmt = db.prepare(`
    INSERT INTO sync_log (quote_number, action, status, message)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(quoteNumber || 'N/A', action, status, message);
}

// ===== INICIAR SERVIDOR =====

app.listen(PORT, () => {
  console.log(`\n✓ Servidor escuchando en http://localhost:${PORT}`);
  console.log(`✓ Base de datos: ${dbPath}`);
  
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
    console.log(`✓ GitHub sincronización activada: ${process.env.GITHUB_REPO}`);
  } else {
    console.log(`⚠ GitHub no configurado. Ver .env`);
  }
  
  console.log(`\nEndpoints disponibles:`);
  console.log(`  POST   /api/cotizaciones`);
  console.log(`  GET    /api/cotizaciones`);
  console.log(`  GET    /api/cotizaciones/:quoteNumber`);
  console.log(`  DELETE /api/cotizaciones/:quoteNumber`);
  console.log(`  POST   /api/sync-github`);
  console.log(`  GET    /api/sync-log`);
  console.log(`  GET    /api/health\n`);
});
