# Script para eliminar console.log pero mantener console.error y console.warn
$archivos = @(
    "assets\js\app.js",
    "assets\js\sincronizacion-simple.js",
    "assets\js\supabase-sync.js",
    "assets\js\bottom-nav.js",
    "assets\js\conflict-resolution.js",
    "assets\js\conflict-system-init.js"
)

foreach ($archivo in $archivos) {
    $ruta = Join-Path $PSScriptRoot $archivo
    if (Test-Path $ruta) {
        Write-Host "Limpiando $archivo..."
        $contenido = Get-Content $ruta -Raw
        
        # Eliminar líneas completas con console.log
        $contenido = $contenido -replace "(?m)^\s*console\.log\([^)]*\);\s*$", ""
        
        # Eliminar console.log inline
        $contenido = $contenido -replace "\s*console\.log\([^)]*\);", ""
        
        Set-Content $ruta $contenido -NoNewline
        Write-Host "✅ $archivo limpiado"
    }
}

Write-Host "`n✅ Limpieza completada"
