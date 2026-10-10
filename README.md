# 🚀 Plataforma de Cotizaciones con Sincronización GitHub

Una plataforma completa para generar cotizaciones con sincronización **en tiempo real** a GitHub.

## ✨ Características

✅ **Edición en vivo** - Interfaz moderna con doble clic para editar directamente  
✅ **Sincronización GitHub** - Guarda todas las cotizaciones automáticamente en tu repositorio  
✅ **Base de datos local** - SQLite para almacenamiento persistente  
✅ **API REST** - Endpoints para integración con otras aplicaciones  
✅ **Exportación PDF/DOCX** - Descarga las cotizaciones en múltiples formatos  
✅ **Modo offline** - Funciona sin conexión y sincroniza cuando se reconecta  
✅ **Historial de cambios** - Log completo de todas las sincronizaciones  

## 📋 Requisitos previos

- **Node.js** v16+ ([Descargar](https://nodejs.org))
- **GitHub** - Cuenta activa
- **GitHub Token** - Para sincronización automática
- **Git** - Instalado en tu sistema

## 🔧 Configuración

### 1. Crear Token de GitHub

1. Ve a [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Haz clic en "Generate new token" → "Generate new token (classic)"
3. Configura:
   - **Note**: `Cotizaciones Sync`
   - **Expiration**: "No expiration" (o 90 días)
   - **Scopes**: Marca `repo` (acceso completo)
4. Copia el token (no podrás verlo de nuevo)

### 2. Crear Repositorio en GitHub

```bash
# En GitHub, crea un nuevo repositorio público o privado
# Nombre sugerido: "cotizaciones"
# NO inicializes con README

# En tu máquina:
cd "c:\Users\kevin\Documents\plataforma edicion\backend"
git init
git add .
git commit -m "Inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/cotizaciones.git
git push -u origin main
```

### 3. Instalar dependencias

```bash
cd "c:\Users\kevin\Documents\plataforma edicion\backend"
npm install
```

### 4. Configurar variables de entorno

```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env y agrega:
# GITHUB_TOKEN=ghp_tu_token_aqui_1234567890
# GITHUB_REPO=tu-usuario/cotizaciones
# PORT=3001
```

## 🚀 Uso

### Iniciar el servidor

```bash
cd "c:\Users\kevin\Documents\plataforma edicion\backend"
npm start

# Output esperado:
# ✓ Servidor escuchando en http://localhost:3001
# ✓ GitHub sincronización activada: tu-usuario/cotizaciones
```

### Usar la plataforma

1. Abre `index.html` en tu navegador (o sirve con un servidor local)
2. Completa los datos de la cotización
3. Haz clic en **"Guardar en nube"** para:
   - ✅ Guardar en base de datos local
   - ✅ Sincronizar a GitHub automáticamente
   - ✅ Crear archivo JSON en `/cotizaciones/` del repositorio

4. La sincronización también ocurre cada 30 segundos automáticamente

### Exportar cotizaciones

- **PDF**: Botón "Guardar PDF"
- **DOCX**: Botón "Guardar DOCX"
- **Imprimir**: Botón "Imprimir"

## 📡 API REST

### Endpoints disponibles

#### Guardar/Actualizar cotización
```
POST /api/cotizaciones
Content-Type: application/json

{
  "quoteNumber": "COT-2026-001",
  "data": { /* datos de la cotización */ }
}

Response: { success: true, synced: true, githubCommit: "abc123..." }
```

#### Obtener cotización
```
GET /api/cotizaciones/:quoteNumber

Response: {
  success: true,
  data: {
    quoteNumber: "COT-2026-001",
    data: { /* ... */ },
    syncedToGithub: true,
    githubCommitSha: "abc123..."
  }
}
```

#### Listar todas las cotizaciones
```
GET /api/cotizaciones?limit=50

Response: {
  success: true,
  count: 5,
  data: [ /* ... */ ]
}
```

#### Ver historial de sincronización
```
GET /api/sync-log

Response: {
  success: true,
  count: 10,
  data: [
    { action: "save", status: "success", timestamp: "...", message: "..." }
  ]
}
```

#### Forzar sincronización manual
```
POST /api/sync-github
{ "quoteNumber": "COT-2026-001" }
```

#### Health Check
```
GET /api/health

Response: {
  status: "ok",
  github_configured: true,
  timestamp: "2026-10-10T..."
}
```

## 📂 Estructura del Proyecto

```
plataforma edicion/
├── index.html                 # Frontend (interfaz de usuario)
├── backend/
│   ├── package.json          # Dependencias Node.js
│   ├── server.js             # Servidor Express principal
│   ├── .env.example          # Plantilla de variables de entorno
│   ├── .env                  # Variables (gitignored)
│   ├── cotizaciones.db       # Base de datos SQLite (autogenerada)
│   └── .git/                 # Repositorio Git local
└── README.md                 # Este archivo
```

## 🔄 Flujo de Sincronización

```
┌─────────────────────────────────────────────────────────┐
│         FRONTEND (index.html - Navegador)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Editar cotización → Click "Guardar en nube"     │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │  API REST (:3001/api)        │
        │  POST /cotizaciones          │
        └──────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    ┌────────────────┐   ┌─────────────────┐
    │ SQLite (Local) │   │ GitHub API      │
    │ Almacenamiento │   │ sincroniza.json │
    └────────────────┘   └─────────────────┘
```

## 🛡️ Seguridad

⚠️ **IMPORTANTE**:
- **Nunca** commits tu `.env` con el token real a Git
- Usa `.env.example` como plantilla
- Regenera el token si fue expuesto
- Los repositorios privados protegen tus cotizaciones
- Los tokens expiran después del tiempo configurado

## 🐛 Solución de Problemas

### "Servidor no disponible"
```bash
# Verifica que el servidor esté corriendo
netstat -ano | findstr :3001

# Reinicia el servidor
npm start
```

### "GitHub no está configurado"
```bash
# Verifica .env:
echo %GITHUB_TOKEN%
echo %GITHUB_REPO%

# Debe mostrar valores, no estar vacío
```

### "Error al sincronizar"
```bash
# Verifica el token es válido
# Verifica que el repositorio existe
# Verifica conexión a internet
# Revisa logs en: GET /api/sync-log
```

### "Puerto 3001 en uso"
```bash
# Cambia el puerto en .env:
PORT=3002

# O mata el proceso:
taskkill /F /PID 12345
```

## 📊 Ejemplo de estructura JSON guardada en GitHub

```json
{
  "quoteNumber": "COT-2026-001",
  "companyData": {
    "name": "INGENIERÍA Y ENERGÍA KESOLAR SPA",
    "rut": "77.753.882-9",
    "address": "PJE LUIS PENAILILLO 1053, COQUIMBO",
    "phone": "+56 9 4525 9288",
    "email": "contacto.kesolar@gmail.com"
  },
  "items": [
    {
      "description": "Sistema fotovoltaico OFF-GRID de 4,96 [kWp]",
      "quantity": 1,
      "unitPrice": 3821987
    }
  ],
  "timestamp": "2026-10-10T14:30:00.000Z"
}
```

## 🚀 Próximas mejoras

- [ ] Autenticación de usuarios
- [ ] Múltiples usuarios/equipos
- [ ] Webhooks para notificaciones
- [ ] Plantillas de cotizaciones reutilizables
- [ ] Integración con APIs de facturación
- [ ] Dashboard de analytics

## 📞 Soporte

Si encuentras problemas:

1. Revisa el [API Health](http://localhost:3001/api/health)
2. Verifica [Sync Log](http://localhost:3001/api/sync-log)
3. Abre una issue en GitHub
4. Consulta los logs de la consola del navegador (F12)

## 📝 Licencia

MIT - Libre para usar y modificar

---

**Hecho con ❤️ para optimizar tu flujo de cotizaciones**
