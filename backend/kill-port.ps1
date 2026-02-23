# PowerShell script to kill process using port 3001
# Usage: .\kill-port.ps1 [port_number]

param(
    [int]$Port = 3001
)

Write-Host "Checking for processes using port $Port..." -ForegroundColor Yellow

try {
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction Stop
    
    Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Cyan
    Write-Host "Killing process..." -ForegroundColor Yellow
    
    Stop-Process -Id $processId -Force
    
    Write-Host "✓ Process killed successfully!" -ForegroundColor Green
    Write-Host "Port $Port is now free. You can start the server." -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*No MSFT_NetTCPConnection*") {
        Write-Host "✓ Port $Port is not in use." -ForegroundColor Green
    } else {
        Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "You may need to run PowerShell as Administrator." -ForegroundColor Yellow
    }
}
