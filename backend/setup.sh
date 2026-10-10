#!/bin/bash
# Script de configuración inicial

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Configurador: Plataforma de Cotizaciones + GitHub Sync   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar Node.js
echo "[1/4] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no encontrado. Descargalo en https://nodejs.org"
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Crear .env
echo ""
echo "[2/4] Configurando .env..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✓ Archivo .env creado. Edita con tus valores:"
    echo "  - GITHUB_TOKEN: Tu token de GitHub"
    echo "  - GITHUB_REPO: formato 'usuario/repositorio'"
else
    echo "✓ .env ya existe"
fi

# Instalar dependencias
echo ""
echo "[3/4] Instalando dependencias..."
npm install
if [ $? -eq 0 ]; then
    echo "✓ Dependencias instaladas"
else
    echo "❌ Error al instalar dependencias"
    exit 1
fi

# Verificar Git
echo ""
echo "[4/4] Verificando Git..."
if ! command -v git &> /dev/null; then
    echo "⚠ Git no encontrado (opcional pero recomendado)"
else
    echo "✓ Git $(git --version)"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Configuración completada                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Próximos pasos:"
echo "1. Edita 'backend/.env' con tus credenciales de GitHub"
echo "2. Corre: npm start"
echo "3. Abre: http://localhost:3001"
echo ""
