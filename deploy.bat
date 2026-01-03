@echo off
setlocal enabledelayedexpansion

echo ==================================================
echo   DEPLOY (Git Commit + Push) - despesas-pwa
echo ==================================================
echo.

REM 1) Verifica se está dentro de um repo git
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Esta pasta nao e um repositorio Git.
  echo Abra o deploy.bat dentro da pasta do projeto (onde tem .git).
  echo.
  pause
  exit /b 1
)

REM 2) Mostra branch atual
for /f "delims=" %%b in ('git branch --show-current') do set BRANCH=%%b
if "%BRANCH%"=="" set BRANCH=(desconhecida)
echo Branch atual: %BRANCH%
echo.

REM 3) Mostra status
echo ---------- git status ----------
git status
echo -------------------------------
echo.

REM 4) Pergunta se quer dar stage
set /p DOADD=Quer rodar "git add ." agora? (S/N): 
if /I "%DOADD%"=="S" (
  git add .
  echo.
  echo ---------- Apos git add . ----------
  git status
  echo ----------------------------------
  echo.
) else (
  echo Ok, pulando git add .
  echo.
)

REM 5) Pausa para o usuario decidir a mensagem do commit
echo ==================================================
echo  AGORA VAMOS COMMITAR
echo  - Digite a mensagem do commit e pressione ENTER
echo  - Se deixar em branco, o script cancela o commit
echo ==================================================
set "MSG="
set /p MSG=Mensagem do commit: 

if "%MSG%"=="" (
  echo.
  echo [CANCELADO] Nenhuma mensagem informada. Commit nao foi feito.
  echo Se voce ja tem commits prontos, pode fazer so o push manualmente.
  echo.
  pause
  exit /b 0
)

REM 6) Faz o commit (pode falhar se nao houver changes staged)
git commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo [ATENCAO] O commit falhou. Causas comuns:
  echo - Nada para commitar (working tree clean)
  echo - Nao havia arquivos em stage
  echo.
  echo Rode novamente e escolha "S" no git add .
  echo.
  pause
  exit /b 1
)

echo.
echo ---------- Ultimo commit ----------
git log -1 --oneline
echo -------------------------------
echo.

REM 7) Push para main (ajuste aqui se necessario)
echo Enviando para GitHub: origin main ...
git push origin main
if errorlevel 1 (
  echo.
  echo [ERRO] Falha no push.
  echo Verifique se voce esta logado no GitHub e se a branch main existe no remote.
  echo.
  pause
  exit /b 1
)

echo.
echo ==================================================
echo  OK! Push concluido.
echo  Agora verifique o Render > Events/Deploys
echo  Deve aparecer um deploy novo automaticamente.
echo ==================================================
echo.
pause
endlocal
