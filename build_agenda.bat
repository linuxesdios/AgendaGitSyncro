@echo off
echo ================================
echo  AGENDA GIT SYNCRO - BUILD SCRIPT
echo ================================
echo.

REM Configurar variables de entorno para Java y Android SDK
set JAVA_HOME=C:\Users\pablo\.bubblewrap\jdk\jdk-17.0.11+9
set PATH=%JAVA_HOME%\bin;%PATH%

echo [1/4] Sincronizando con GitHub...
echo --------------------------------

REM Agregar todos los archivos modificados
git add .

REM Verificar si hay cambios para hacer commit
git diff --cached --quiet
if %errorlevel% neq 0 (
    REM Hay cambios, hacer commit con timestamp
    for /f "delims=" %%i in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"') do set timestamp=%%i
    git commit -m "Auto sync: %timestamp%"
    echo Cambios detectados y guardados en commit
) else (
    echo No hay cambios nuevos para sincronizar
)

REM Subir cambios a GitHub
echo Subiendo cambios a GitHub...
git push
if %errorlevel% neq 0 (
    echo ERROR: Fallo al subir a GitHub
    pause
    exit /b 1
)

echo [2/4] Limpiando builds anteriores...
echo ------------------------------------
.\gradlew.bat clean

echo [3/4] Generando APK de debug...
echo ------------------------------
.\gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: Fallo al generar APK de debug
    pause
    exit /b 1
)

echo [4/4] Generando APK de release...
echo --------------------------------
bubblewrap build
if %errorlevel% neq 0 (
    echo ERROR: Fallo al generar APK de release
    pause
    exit /b 1
)

echo.
echo ================================
echo        BUILD COMPLETADO
echo ================================
echo.
echo APKs generados:
echo - Debug:   app\build\outputs\apk\debug\app-debug.apk
echo - Release: app-release-signed.apk
echo.
echo La web actualizada esta en:
echo https://linuxesdios.github.io/AgendaGitSyncro/agenda_mobile.html
echo.
echo Presiona cualquier tecla para abrir la carpeta con los APKs...
pause
explorer .

echo.
echo Script completado exitosamente!
pause