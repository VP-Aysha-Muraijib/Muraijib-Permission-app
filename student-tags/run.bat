@echo off
REM =====================================================================
REM  Student Tags - double click this file to build the PDF cards
REM  بطاقات الطالبات - انقري مرتين على هذا الملف لإنشاء ملفات PDF
REM =====================================================================
cd /d "%~dp0"

echo.
echo  Checking Python ...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [X] Python is not installed.
    echo      Download it from https://www.python.org/downloads/
    echo      and tick "Add Python to PATH" during the installation.
    echo.
    pause
    exit /b 1
)

echo  Checking libraries ...
python -c "import pandas, openpyxl, reportlab" >nul 2>&1
if errorlevel 1 (
    echo  Installing the required libraries, please wait ...
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
)

echo.
python generate_tags.py
echo.
pause
