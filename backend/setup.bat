@echo off
REM Script de configuración inicial para Windows

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Configurador: Plataforma de Cotizaciones + GitHub Sync   ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Verificar Node.js
echo [1/4] Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no encontrado. Descargalo en https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION%

REM Crear .env
echo.
echo [2/4] Configurando .env...
if not exist ".env" (
    copy .env.example .env >nul
    echo ✓ Archivo .env creado. Edita con tus valores:
    echo   - GITHUB_TOKEN: Tu token de GitHub
    echo   - GITHUB_REPO: formato 'usuario/repositorio'
) else (
    echo ✓ .env ya existe
)

REM Instalar dependencias
echo.
echo [3/4] Instalando dependencias...
call npm install
if %ERRORLEVEL% EQU 0 (
    echo ✓ Dependencias instaladas
) else (
    echo ❌ Error al instalar dependencias
    pause
    exit /b 1
)

REM Verificar Git
echo.
echo [4/4] Verificando Git...
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠ Git no encontrado (opcional pero recomendado)
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo ✓ %GIT_VERSION%
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                    Configuración completada                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Próximos pasos:
echo 1. Edita 'backend\.env' con tus credenciales de GitHub
echo 2. Corre: npm start
echo 3. Abre: http://localhost:3001
echo.
pause
