# ==============================================================================
# LunchLoop Project-Isolated GitHub Push Script
# Ensures GitHub CLI credentials are saved EXCLUSIVELY in this project folder (.gh_config)
# and NEVER affects system-wide global Git or GitHub credentials.
# ==============================================================================

$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:GH_CONFIG_DIR = "$PSScriptRoot\.gh_config"
$env:PATH = "C:\Users\LAPTOP\AppData\Local\gh\bin;$env:PATH"

if (-not (Test-Path "$PSScriptRoot\.gh_config")) {
    New-Item -ItemType Directory -Path "$PSScriptRoot\.gh_config" -Force | Out-Null
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  LunchLoop: Project-Isolated GitHub Push" -ForegroundColor Green
Write-Host "  Repository: https://github.com/ashrithaastakala-sys/Queueless-campus.git" -ForegroundColor White
Write-Host "  Security: Credentials stored ONLY in local .gh_config & .git_credentials" -ForegroundColor Yellow
Write-Host "==========================================================`n" -ForegroundColor Cyan

$token = Read-Host "Paste your GitHub Personal Access Token (PAT)"
if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "❌ Token cannot be empty. Please generate a token with 'repo' scope at: https://github.com/settings/tokens" -ForegroundColor Red
    exit 1
}

# 1. Authenticate GitHub CLI locally
$token | gh auth login --with-token
Write-Host "`n✅ GitHub CLI authenticated locally in .gh_config!" -ForegroundColor Green

# 2. Push repository
Write-Host "🚀 Pushing project to https://github.com/ashrithaastakala-sys/Queueless-campus.git..." -ForegroundColor Cyan
git branch -M main
git remote set-url origin "https://${token}@github.com/ashrithaastakala-sys/Queueless-campus.git"

git push -u origin main

# 3. Securely set remote URL back to standard format and save local git credential helper
git remote set-url origin "https://github.com/ashrithaastakala-sys/Queueless-campus.git"
git config --local credential.helper "store --file=.git_credentials"
"https://ashrithaastakala-sys:${token}@github.com" | Out-File -FilePath "$PSScriptRoot\.git_credentials" -Encoding utf8 -Force

Write-Host "`n🎉 PUSH COMPLETE!" -ForegroundColor Green
Write-Host "Your project is live at: https://github.com/ashrithaastakala-sys/Queueless-campus`n" -ForegroundColor Cyan
