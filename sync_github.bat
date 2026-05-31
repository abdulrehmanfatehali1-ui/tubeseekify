@echo off
title TubeSeekify GitHub & Vercel Sync Tool
color 0B
echo ===================================================
echo      ⚡ TUBE-SEEKIFY GITHUB & VERCEL SYNC TOOL ⚡
echo ===================================================
echo.
echo [1/5] Git repository initialize kar rahe hain...
git init

echo.
echo [2/5] GitHub remote repository link kar rahe hain...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/abdulrehmanfatehali1-ui/tubeseekify.git

echo.
echo [3/5] Git identity config kar rahe hain (Error se bachne ke liye)...
git config user.email "abdulrehmanfatehali1@gmail.com"
git config user.name "Abdul Rehman"

echo.
echo [4/5] Saari premium files aur favicon.png stage kar rahe hain...
git add .

echo.
echo [5/5] Commit aur Push kar rahe hain...
git commit -m "feat: Add transparent favicon_small.png and integrate auto-compression controls with dynamic stats size preview in Admin Panel"

echo.
echo 🚀 Upload (Push) kar rahe hain...
echo (Yeh Vercel deployment ko automatically trigger kar dega!)
echo.
git branch -M main
git push -u origin main --force

echo.
echo ===================================================
echo        🎉 SHABASH! SYNC COMPLETED SUCCESSFULLY! 🎉
echo.
echo Ab aapki live website: https://tubeseekify.online
echo par naya favicon aur loader deploy ho raha hai!
echo ===================================================
echo.
pause
