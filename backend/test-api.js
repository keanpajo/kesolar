// Script de prueba para verificar que el servidor y GitHub están conectados
// Usa este archivo para testear la API antes de usar el frontend

const API_BASE = 'http://localhost:3001/api';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(type, message) {
  const prefix = {
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`
  };
  console.log(`${prefix[type]} ${message}`);
}

async function testHealth() {
  log('info', 'Probando Health Check...');
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    
    if (res.ok) {
      log('success', 'Servidor activo');
      log('info', `Status: ${data.status}`);
      log('info', `GitHub configurado: ${data.github_configured ? 'Sí ✓' : 'No ✗'}`);
    } else {
      log('error', 'Servidor respondió con error');
    }
  } catch (error) {
    log('error', `No se pudo conectar: ${error.message}`);
    log('warn', 'Asegúrate de que el servidor está corriendo (npm start)');
  }
}

async function testSaveQuote() {
  log('info', 'Probando guardar cotización...');
  
  const testData = {
    quoteNumber: 'TEST-' + Date.now(),
    companyData: {
      name: 'Test Company',
      rut: '12.345.678-9',
      address: 'Calle Test 123',
      phone: '+56 9 1234 5678',
      email: 'test@example.com'
    },
    clientData: {
      name: 'Test Client',
      rut: '98.765.432-1',
      address: 'Client Street 456',
      email: 'client@example.com'
    },
    items: [
      {
        description: 'Test Product',
        quantity: 1,
        unitPrice: 10000
      }
    ],
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(`${API_BASE}/cotizaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteNumber: testData.quoteNumber,
        data: testData
      })
    });

    const result = await res.json();

    if (res.ok) {
      log('success', `Cotización guardada: ${testData.quoteNumber}`);
      log('info', `Sincronizada a GitHub: ${result.synced ? 'Sí ✓' : 'No'}`);
      if (result.githubCommit) {
        log('info', `Commit SHA: ${result.githubCommit}`);
      }
      return testData.quoteNumber;
    } else {
      log('error', `Error: ${result.error}`);
    }
  } catch (error) {
    log('error', `Error al guardar: ${error.message}`);
  }
}

async function testGetQuote(quoteNumber) {
  if (!quoteNumber) return;
  
  log('info', `Obtener cotización: ${quoteNumber}`);
  try {
    const res = await fetch(`${API_BASE}/cotizaciones/${quoteNumber}`);
    
    if (res.status === 404) {
      log('warn', 'Cotización no encontrada');
      return;
    }

    if (res.ok) {
      const result = await res.json();
      log('success', `Cotización restaurada: ${result.data.quoteNumber}`);
      log('info', `Última actualización: ${result.data.updatedAt}`);
      log('info', `Sincronizada a GitHub: ${result.data.syncedToGithub ? 'Sí ✓' : 'No'}`);
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
  }
}

async function testListQuotes() {
  log('info', 'Listando todas las cotizaciones...');
  try {
    const res = await fetch(`${API_BASE}/cotizaciones`);
    const result = await res.json();

    if (res.ok) {
      log('success', `Total de cotizaciones: ${result.count}`);
      if (result.count > 0) {
        result.data.slice(0, 3).forEach(q => {
          log('info', `- ${q.quote_number} (${q.updated_at.split('T')[0]})`);
        });
        if (result.count > 3) {
          log('info', `... y ${result.count - 3} más`);
        }
      }
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
  }
}

async function testSyncLog() {
  log('info', 'Historial de sincronizaciones...');
  try {
    const res = await fetch(`${API_BASE}/sync-log`);
    const result = await res.json();

    if (res.ok && result.count > 0) {
      log('success', `Últimas ${result.count} operaciones:`);
      result.data.slice(0, 5).forEach(log_entry => {
        const color = log_entry.status === 'success' ? 'success' : 
                     log_entry.status === 'error' ? 'error' : 'info';
        log(color, `${log_entry.action} (${log_entry.status}) - ${log_entry.timestamp}`);
      });
    } else {
      log('info', 'Sin historial de sincronizaciones aún');
    }
  } catch (error) {
    log('error', `Error: ${error.message}`);
  }
}

// Ejecutar pruebas
async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          Test Suite - Plataforma Cotizaciones            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await testHealth();
  console.log();
  
  const quoteNum = await testSaveQuote();
  console.log();
  
  await testGetQuote(quoteNum);
  console.log();
  
  await testListQuotes();
  console.log();
  
  await testSyncLog();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  Pruebas completadas                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Ejecutar si se llama desde Node.js
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}
