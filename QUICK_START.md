# 🚀 Guía Rápida de Inicio

## ⚡ 5 minutos para empezar

### Paso 1️⃣: Obtener GitHub Token

1. Ve a: https://github.com/settings/tokens
2. Haz clic en "Generate new token (classic)"
3. Configura:
   - **Note**: `Cotizaciones Sync`
   - **Scopes**: Marca ✅ `repo`
4. **Copia y guarda el token** (no podrás verlo después)

### Paso 2️⃣: Crear Repositorio GitHub

1. Ve a: https://github.com/new
2. **Repository name**: `cotizaciones`
3. **Visibility**: Private (o Public si prefieres)
4. Click en "Create repository"
5. **NO marques** "Initialize with README"

### Paso 3️⃣: Instalar y Configurar

```bash
# Abre PowerShell en la carpeta backend:
cd "c:\Users\kevin\Documents\plataforma edicion\backend"

# Instalar dependencias
npm install

# Crear archivo de configuración
copy .env.example .env
```

### Paso 4️⃣: Agregar Credenciales

Edita el archivo `backend/.env`:

```ini
PORT=3001
GITHUB_TOKEN=ghp_tu_token_de_45_caracteres_aqui
GITHUB_REPO=tu-usuario/cotizaciones
```

Reemplaza:
- `ghp_tu_token_de_45_caracteres_aqui` con tu token real
- `tu-usuario` con tu usuario de GitHub
- `cotizaciones` con el nombre del repositorio

### Paso 5️⃣: Ejecutar el Servidor

```bash
npm start
```

Deberías ver:
```
✓ Servidor escuchando en http://localhost:3001
✓ GitHub sincronización activada: tu-usuario/cotizaciones
```

### Paso 6️⃣: Usar la Plataforma

1. Abre `index.html` en tu navegador
2. Llena los datos de la cotización
3. **Haz clic en "Guardar en nube"** ☁️
4. ✅ Automáticamente se guardará en GitHub

---

## 📱 Interfaz Rápida

| Botón | Función |
|-------|---------|
| 🌐 **Guardar en nube** | Sincroniza con GitHub + base de datos |
| 📄 **Guardar PDF** | Descarga como PDF |
| 📊 **Guardar DOCX** | Descarga como Word |
| 🖨️ **Imprimir** | Abre diálogo de impresión |

---

## ✅ Verificar que funciona

### Opción 1: Ver en GitHub

1. Ve a tu repositorio: https://github.com/tu-usuario/cotizaciones
2. Busca la carpeta `/cotizaciones/`
3. Deberías ver archivos JSON con tus cotizaciones

### Opción 2: Usar API

Abre en navegador:
```
http://localhost:3001/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "github_configured": true,
  "timestamp": "2026-10-10T..."
}
```

---

## 🔴 Problemas Comunes

| Problema | Solución |
|----------|----------|
| "Servidor no disponible" | ¿Corriste `npm start`? |
| "GitHub no configurado" | Verifica `.env` tiene valores |
| "Error al guardar" | Revisa el token sea válido en GitHub |
| "Puerto 3001 en uso" | Cambia `PORT=3002` en `.env` |

---

## 📚 Más Información

- 📖 [Documentación Completa](../README.md)
- 🔗 [API REST Reference](../README.md#-api-rest)
- 🆘 [Troubleshooting](../README.md#-solución-de-problemas)

---

**¡Listo! 🎉 Ya puedes guardar cotizaciones sincronizadas con GitHub**
