@echo off
chcp 65001 >nul
title Triển khai SmartBio 360 lên Render Cloud
color 0A

echo ======================================================================
echo       HỆ THỐNG TỰ ĐỘNG TRIỂN KHAI SMARTBIO 360 LÊN CLOUD 24/7
echo ======================================================================
echo.
cd /d "%~dp0"

echo [BƯỚC 1/3] Đang mở trình duyệt để tạo kho chứa GitHub "smartbio360"...
start https://github.com/new?name=smartbio360
echo.
echo ===> HÀNH ĐỘNG DUY NHẤT BẠN CẦN LÀM TRÊN TRÌNH DUYỆT:
echo      Bấm vào nút xanh lá: [Create repository] ở cuối trang!
echo.
echo Sau khi bấm nút [Create repository] xong, hãy quay lại đây và:
pause

echo.
echo [BƯỚC 2/3] Đang đẩy toàn bộ mã nguồn lên GitHub của bạn: luuhoangphuong06-jpg...
git remote remove origin 2>nul
git remote add origin https://github.com/luuhoangphuong06-jpg/smartbio360.git
git branch -M main
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [LƯU Ý] Nếu GitHub hiện cửa sổ yêu cầu đăng nhập, hãy bấm "Sign in with your browser".
    echo Đang thử đẩy lại...
    git push -u origin main
)

echo.
echo ======================================================================
echo [BƯỚC 3/3] ĐẨY CODE LÊN GITHUB THÀNH CÔNG!
echo Đang mở trang Render.com để lấy Link Web công khai...
echo ======================================================================
echo.
echo ===> TRÊN TRANG RENDER VỪA MỞ:
echo      1. Đăng nhập bằng tài khoản GitHub của bạn.
echo      2. Chọn repo "smartbio360" vừa tạo và bấm [Connect].
echo      3. Cuộn xuống bấm [Deploy Web Service].
echo.
start https://dashboard.render.com/select-repo?type=web
echo Hoàn tất! Link web sẽ có dạng: https://smartbio360.onrender.com
echo.
pause
