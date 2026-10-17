Set-Location -LiteralPath $PSScriptRoot
Write-Host "Starting vite dev on 5173..."
npm run dev -- --host 127.0.0.1 --port 5173
