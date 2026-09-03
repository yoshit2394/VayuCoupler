@echo off
title VayuCoupler Android APK Installer (SIH 2026)
cls
echo ======================================================================
echo    VAYUCOUPLER -- ANDROID MOBILE APK INSTALLER
echo    Ministry of Earth Sciences (MoES) ^| SIH 2026
echo ======================================================================
echo.

set "ADB_PATH=C:\Users\YOSHIT\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "APK_PATH=%~dp0VayuCoupler.apk"

if not exist "%APK_PATH%" (
    echo [ERROR] VayuCoupler.apk not found in this folder!
    pause
    exit /b 1
)

echo [INFO] Found VayuCoupler.apk!
echo.
echo Checking for connected Android devices via USB...
"%ADB_PATH%" devices
echo.

echo ----------------------------------------------------------------------
echo Instructions:
echo  1. Connect your Android phone to PC using a USB cable.
echo  2. Enable "Developer Options" and "USB Debugging" on your phone.
echo  3. Allow USB Debugging prompt on your phone's screen.
echo ----------------------------------------------------------------------
echo.
echo Press any key to automatically install VayuCoupler.apk onto your phone...
echo (Or you can simply copy VayuCoupler.apk to your phone and tap to install)
echo.
pause >nul

echo.
echo [INSTALLING] Pushing and installing VayuCoupler.apk...
"%ADB_PATH%" install -r -d "%APK_PATH%"

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==================================================================
    echo  [SUCCESS] VayuCoupler has been successfully installed on your phone!
    echo ==================================================================
    echo Opening VayuCoupler on phone...
    "%ADB_PATH%" shell am start -n gov.in.moes.vayucoupler/.MainActivity
) else (
    echo.
    echo [NOTICE] USB installation failed or phone was not detected.
    echo No worries! You can simply copy "VayuCoupler.apk" from this folder
    echo to your phone via USB cable, WhatsApp, or Google Drive,
    echo and tap on it to install!
)

echo.
pause
