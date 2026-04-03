@echo off
chcp 65001

REM 批量安装所有云函数的依赖

cd /d "%~dp0\..\cloudfunctions"

echo 开始安装云函数依赖...

for /d %%D in (*) do (
    if exist "%%D\package.json" (
        echo.
        echo 正在安装: %%D
        cd "%%D"
        call npm install
        cd ..
    )
)

echo.
echo 所有云函数依赖安装完成！
pause
