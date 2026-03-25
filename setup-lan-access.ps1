# 设置 WSL 端口转发，允许局域网访问
# 需要以管理员身份运行

$wslIP = "172.23.87.31"
$windowsIP = "192.168.1.3"

Write-Host "正在配置端口转发..." -ForegroundColor Green
Write-Host "WSL IP: $wslIP" -ForegroundColor Cyan
Write-Host "Windows IP: $windowsIP" -ForegroundColor Cyan

# 删除已存在的规则（如果有）
Write-Host "`n清理旧规则..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=5274 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=4100 listenaddress=0.0.0.0 2>$null

# 添加端口转发规则
Write-Host "`n添加端口转发规则..." -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenport=5274 listenaddress=0.0.0.0 connectport=5274 connectaddress=$wslIP
netsh interface portproxy add v4tov4 listenport=4100 listenaddress=0.0.0.0 connectport=4100 connectaddress=$wslIP

# 配置防火墙规则
Write-Host "`n配置防火墙规则..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="WSL Vite Dev Server" 2>$null
netsh advfirewall firewall delete rule name="WSL Backend Server" 2>$null

netsh advfirewall firewall add rule name="WSL Vite Dev Server" dir=in action=allow protocol=TCP localport=5274
netsh advfirewall firewall add rule name="WSL Backend Server" dir=in action=allow protocol=TCP localport=4100

# 显示当前配置
Write-Host "`n当前端口转发规则:" -ForegroundColor Green
netsh interface portproxy show v4tov4

Write-Host "`n配置完成！" -ForegroundColor Green
Write-Host "局域网访问地址: http://$windowsIP:5274" -ForegroundColor Cyan
Write-Host "后端 API 地址: http://$windowsIP:4100" -ForegroundColor Cyan
Write-Host "`n提示: WSL 重启后 IP 可能变化，需要重新运行此脚本" -ForegroundColor Yellow
