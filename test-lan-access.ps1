# 测试局域网访问配置
# 需要以管理员身份运行

Write-Host "=== 检查当前配置 ===" -ForegroundColor Cyan

# 1. 检查端口转发规则
Write-Host "`n1. 端口转发规则:" -ForegroundColor Yellow
$portProxy = netsh interface portproxy show v4tov4
if ($portProxy) {
    Write-Host $portProxy
} else {
    Write-Host "没有配置端口转发规则" -ForegroundColor Red
}

# 2. 检查防火墙规则
Write-Host "`n2. 防火墙规则:" -ForegroundColor Yellow
$rules = netsh advfirewall firewall show rule name=all | Select-String -Pattern "5274|4100" -Context 1,0
if ($rules) {
    Write-Host $rules
} else {
    Write-Host "没有找到相关防火墙规则" -ForegroundColor Red
}

# 3. 检查端口监听状态
Write-Host "`n3. 端口监听状态:" -ForegroundColor Yellow
$listening = netstat -ano | Select-String -Pattern ":5274|:4100"
if ($listening) {
    Write-Host $listening
} else {
    Write-Host "端口未在监听" -ForegroundColor Red
}

# 4. 测试本地访问
Write-Host "`n4. 测试本地访问:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5274" -TimeoutSec 5 -UseBasicParsing
    Write-Host "localhost:5274 - 可访问 (状态码: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "localhost:5274 - 无法访问: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://172.23.87.31:5274" -TimeoutSec 5 -UseBasicParsing
    Write-Host "172.23.87.31:5274 - 可访问 (状态码: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "172.23.87.31:5274 - 无法访问: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://192.168.1.3:5274" -TimeoutSec 5 -UseBasicParsing
    Write-Host "192.168.1.3:5274 - 可访问 (状态码: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "192.168.1.3:5274 - 无法访问: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 建议的修复步骤 ===" -ForegroundColor Cyan
Write-Host "如果端口转发规则为空，请以管理员身份运行 setup-lan-access.ps1" -ForegroundColor Yellow
Write-Host "如果端口未监听，请确保 pnpm dev 正在运行" -ForegroundColor Yellow
Write-Host "如果本地可访问但局域网不行，检查路由器/交换机设置" -ForegroundColor Yellow
