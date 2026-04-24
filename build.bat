@echo off
chcp 65001 > nul
echo ============================================
echo   BLINDSAFE — Build do executavel
echo ============================================
echo.

echo [1/4] Instalando PyInstaller...
py -m pip install pyinstaller -q
if errorlevel 1 ( echo ERRO ao instalar PyInstaller & pause & exit /b 1 )

echo [2/4] Compilando frontend React...
cd frontend
call npm run build
if errorlevel 1 ( echo ERRO no build do frontend & pause & exit /b 1 )
cd ..

echo [3/4] Gerando executavel...
py -m PyInstaller blindsafe.spec --clean --noconfirm
if errorlevel 1 ( echo ERRO no PyInstaller & pause & exit /b 1 )

echo [4/4] Copiando templates...
if not exist "dist\BlindSafe\templates" mkdir "dist\BlindSafe\templates"
if exist "templates\*" xcopy /E /I /Y "templates\*" "dist\BlindSafe\templates\" > nul

echo.
echo ============================================
echo   Pronto!
echo   Executavel: dist\BlindSafe\BlindSafe.exe
echo ============================================
pause
