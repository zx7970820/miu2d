@echo off
echo Setting up port forwarding for LAN access...
echo.

REM Delete existing rules
netsh interface portproxy delete v4tov4 listenport=5274 listenaddress=0.0.0.0 2>nul
netsh interface portproxy delete v4tov4 listenport=4100 listenaddress=0.0.0.0 2>nul

REM Add port forwarding rules
echo Adding port forwarding rules...
netsh interface portproxy add v4tov4 listenport=5274 listenaddress=0.0.0.0 connectport=5274 connectaddress=172.23.87.31
netsh interface portproxy add v4tov4 listenport=4100 listenaddress=0.0.0.0 connectport=4100 connectaddress=172.23.87.31

REM Configure firewall
echo Configuring firewall...
netsh advfirewall firewall delete rule name="WSL Vite Dev Server" 2>nul
netsh advfirewall firewall delete rule name="WSL Backend Server" 2>nul
netsh advfirewall firewall add rule name="WSL Vite Dev Server" dir=in action=allow protocol=TCP localport=5274
netsh advfirewall firewall add rule name="WSL Backend Server" dir=in action=allow protocol=TCP localport=4100

echo.
echo Current port forwarding rules:
netsh interface portproxy show v4tov4

echo.
echo Done! LAN access URL: http://192.168.1.3:5274
echo Backend API URL: http://192.168.1.3:4100
echo.
pause
