# Visual Workflow - Sincronización GitHub

## 1️⃣ Antes de Empezar

```
┌─────────────────────────────────────────────────────────────┐
│ Necesitas tener:                                            │
│  • Node.js instalado (nodejs.org)                           │
│  • Cuenta GitHub (github.com)                               │
│  • GitHub Token de acceso personal                          │
└─────────────────────────────────────────────────────────────┘
```

## 2️⃣ Obtener GitHub Token

```
1. https://github.com/settings/tokens
   
2. Click en "Generate new token (classic)"
   
3. Completa:
   ┌──────────────────────────────────────────┐
   │ Note: Cotizaciones Sync                  │
   │ Expiration: No expiration                │
   │ [✓] repo                                 │
   └──────────────────────────────────────────┘
   
4. Click "Generate token" y COPIA el token
   
5. Guardar en lugar seguro (no podrás verlo después)
```

## 3️⃣ Crear Repositorio

```
1. https://github.com/new
   
2. Configura:
   ┌──────────────────────────────────────────┐
   │ Repository name: cotizaciones            │
   │ Description: Mi plataforma de cotizaciones
   │ [o] Public   [•] Private                 │
   │ [ ] Initialize with README               │
   └──────────────────────────────────────────┘
   
3. Click "Create repository"
   
4. Copia la URL: https://github.com/TU-USUARIO/cotizaciones
```

## 4️⃣ Instalar Backend

```powershell
# Abre PowerShell en esta carpeta:
# C:\Users\kevin\Documents\plataforma edicion\backend

# 1. Instalar dependencias
npm install

# 2. Crear archivo .env
copy .env.example .env

# 3. Editar .env con tus valores
notepad .env

# Cambiar:
# GITHUB_TOKEN=ghp_tu_token_de_40_caracteres
# GITHUB_REPO=tu-usuario/cotizaciones
```

## 5️⃣ Iniciar Servidor

```powershell
npm start

# Deberías ver:
✓ Servidor escuchando en http://localhost:3001
✓ Base de datos: C:\Users\...\backend\cotizaciones.db
✓ GitHub sincronización activada: tu-usuario/cotizaciones

Endpoints disponibles:
  POST   /api/cotizaciones
  GET    /api/cotizaciones
  GET    /api/cotizaciones/:quoteNumber
  DELETE /api/cotizaciones/:quoteNumber
  POST   /api/sync-github
  GET    /api/sync-log
  GET    /api/health
```

## 6️⃣ Usar la Plataforma

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Abre: index.html en tu navegador                        │
│                                                             │
│ 2. En la parte superior verás:                             │
│    ● Generador de Cotizaciones                            │
│    ✓ GitHub conectado  ← Esto indica que todo va bien     │
│                                                             │
│ 3. Completa los datos:                                     │
│    • Mi Empresa (nombre, RUT, teléfono, etc)             │
│    • Datos del Cliente                                    │
│    • Productos/Servicios (tabla)                          │
│    • Firma y condiciones                                  │
│                                                             │
│ 4. Haz clic en: ☁️ "Guardar en nube"                      │
│    La cotización se guarda automáticamente en:            │
│    • Base de datos SQLite (local)                         │
│    • GitHub (en tu repositorio)                           │
│                                                             │
│ 5. Verás confirmación: "✓ Guardado!"                      │
│    Y un commit en GitHub (usuario → cotizaciones repo)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 7️⃣ Verificar en GitHub

```
Para confirmar que funciona:

1. Ve a: https://github.com/TU-USUARIO/cotizaciones

2. Deberías ver una carpeta: cotizaciones/

3. Dentro, archivos JSON con tus cotizaciones:
   📄 COT-2026-001.json
   📄 COT-2026-002.json
   ...

4. Haz clic en un archivo para ver el contenido guardado
```

## 8️⃣ Dashboard de Estado

```
En la interfaz verás indicadores:

┌────────────────────────────────────────────┐
│ ● Desconectado   ← No se conectó al servidor
│ ● Sincronizando  ← En proceso de guardar
│ ● Guardado       ← Exitosamente guardado
│ ⚠ GitHub no configura← Falta configuración
└────────────────────────────────────────────┘

Al guardar:
"Guardado y sincronizado" = ✓ Todo funciona perfecto
"Guardado localmente"     = ✓ Servidor OK, GitHub pendiente
"Error al guardar"        = ✗ Revisa configuración
```

## 9️⃣ Sincronización Automática

```
La plataforma sincroniza AUTOMÁTICAMENTE cada 30 segundos:

Timeline:
├─ T+0s    Usuario edita la cotización
├─ T+10s   Cambios se guardan en SQLite
├─ T+30s   Auto-sync intenta GitHub
├─ T+31s   ✓ Sincronización completada
└─ T+60s   Siguiente ciclo de auto-sync

Si no hay conexión:
├─ T+0s    Usuario edita (modo offline)
├─ T+30s   Auto-sync intenta (falla)
├─ T+60s   Espera conexión...
├─ Reconecta a internet
└─ T+X     ✓ Auto-sync exitoso

Resultado: Nunca pierdes datos ✓
```

## 🔟 Exportar Cotizaciones

```
En la parte inferior tienes más opciones:

┌──────────────────────────────────────┐
│ ☁️  Guardar en nube      (Servidor)  │
│ 📄 Guardar PDF          (Descargar) │
│ 📊 Guardar DOCX         (Descargar) │
│ 🖨️  Imprimir             (Impresora)│
└──────────────────────────────────────┘

• Nube: Sincroniza con GitHub
• PDF:  Abre cotización como PDF
• DOCX: Archivo Word editable
• Imprimir: Abre diálogo de impresión
```

## API REST (Opcional - Avanzado)

```
Para integrar con otras aplicaciones:

// Guardar cotización
fetch('http://localhost:3001/api/cotizaciones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    quoteNumber: 'COT-2026-001',
    data: { /* tus datos */ }
  })
})

// Obtener cotización
fetch('http://localhost:3001/api/cotizaciones/COT-2026-001')

// Listar todas
fetch('http://localhost:3001/api/cotizaciones')

// Ver estado
fetch('http://localhost:3001/api/health')

// Ver historial
fetch('http://localhost:3001/api/sync-log')
```

## ⚠️ Problemas Comunes

```
┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: "Servidor no disponible"                         │
├─────────────────────────────────────────────────────────────┤
│ CAUSA: El servidor Node.js no está corriendo               │
│ SOLUCIÓN: npm start en la carpeta backend                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: "GitHub no configurado"                          │
├─────────────────────────────────────────────────────────────┤
│ CAUSA: .env no tiene token o repo válido                   │
│ SOLUCIÓN: Edita .env con tus credenciales reales           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: "Error al guardar"                               │
├─────────────────────────────────────────────────────────────┤
│ CAUSA: Token inválido o repo no existe                     │
│ SOLUCIÓN: Verifica token en https://github.com/settings     │
│           Verifica repo en https://github.com/tu-usuario    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: "Puerto 3001 en uso"                             │
├─────────────────────────────────────────────────────────────┤
│ CAUSA: Otro proceso usa el puerto 3001                     │
│ SOLUCIÓN: Cambia PORT=3002 en .env                         │
└─────────────────────────────────────────────────────────────┘
```

## 📞 Soporte

```
1. Abre navegador: http://localhost:3001/api/health
   
2. Deberías ver JSON con estado

3. Si hay error, revisa:
   • ¿npm start está corriendo?
   • ¿.env tiene valores reales?
   • ¿Token de GitHub es válido?
   • ¿Repositorio existe?

4. Ver logs: http://localhost:3001/api/sync-log

5. Probar API: npm test
```

---

## ✅ Flujo Completo Visual

```
Usuario                Frontend               Backend               GitHub
   │                     │                      │                     │
   ├─ Abre index.html ──→│                      │                     │
   │                     ├─ GET /api/health ──→ │                     │
   │                     │◄─ {github: true} ──┤ │                     │
   │                     │ Mostrar estado ✓ ←─┤                      │
   │                     │                      │                     │
   ├─ Edita datos ──────→│                      │                     │
   │                     │ Auto-sync (30s)     │                     │
   │                     ├─ POST /cotizaciones→│                     │
   │                     │                      ├─ Guardar SQLite     │
   │                     │                      ├─ API GitHub ──────→│
   │                     │                      │◄─ Commit SHA ──────┤
   │                     │◄─ {synced: true} ──┤ │                    │
   │                     │ ✓ Guardado! ←──────┤ │                    │
   │                     │                      │                     │
   ├─ Click "Guardar" ──→│                      │                     │
   │                     ├─ POST /cotizaciones→│                     │
   │                     │                      ├─ Guardar SQLite     │
   │                     │                      ├─ API GitHub ──────→│
   │                     │                      │◄─ Commit SHA ──────┤
   │                     │◄─ {synced: true} ──┤ │                    │
   │                     │ ✓ Guardado! ←──────┤ │                    │
   │                     │                      │                     │
   ├─ Click "PDF" ──────→│ Generar PDF         │                     │
   │◄─ Descargar PDF ────│◄────────────────────┤                     │
   │                     │                      │                     │

Resultado: Cotización guardada en 3 lugares:
  ✓ Navegador (sesión)
  ✓ SQLite (local)
  ✓ GitHub (nube)
```

---

## 🎯 Resumen

```
┌─────────────────────────────────────────────────────────────┐
│ ANTES DE ESTA IMPLEMENTACIÓN:                              │
│                                                             │
│ ❌ Solo guardaba en navegador (perdía datos)              │
│ ❌ Sin respaldo                                            │
│ ❌ Sin historial de cambios                                │
│ ❌ Sin sincronización                                      │
│                                                             │
│ AHORA (DESPUÉS DE ESTA IMPLEMENTACIÓN):                   │
│                                                             │
│ ✅ Guarda en 3 lugares automáticamente                    │
│ ✅ Respaldo en GitHub                                     │
│ ✅ Historial completo de cambios                          │
│ ✅ Sincronización en tiempo real                          │
│ ✅ Funciona offline                                        │
│ ✅ API REST para integraciones                            │
│ ✅ Base de datos local para queries rápidas               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**¡Listo! Tu plataforma de cotizaciones ahora está conectada a GitHub en tiempo real. 🚀**
