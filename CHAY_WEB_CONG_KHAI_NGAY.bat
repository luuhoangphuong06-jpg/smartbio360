@echo off
chcp 65001 >nul
title Khởi chạy SmartBio 360 & Tạo Link Công Khai Tức Thì
color 0B

echo ======================================================================
echo    KHỞI CHẠY SMARTBIO 360 & TẠO LINK TRUY CẬP CÔNG KHAI (INTERNET)
echo ======================================================================
echo.
cd /d "%~dp0"

echo 1. Dang khoi chay may chu SmartBio 360...
start /B python server.py > server.log 2>&1
timeout /t 3 >nul

echo 2. Dang tao duong link HTTPS cong khai toan cau (khong can dang ky)...
echo.
echo ======================================================================
echo   DUONG LINK CONG KHAI CUA BAN SE HIEN THI BEN DUOI:
echo ======================================================================
echo.
ssh -p 443 -R0:localhost:5000 -o StrictHostKeyChecking=no a.pinggy.io
pause
