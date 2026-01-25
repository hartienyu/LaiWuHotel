# 搜索功能重构 - 文件清理脚本（Windows PowerShell 版本）
# 用途: 删除商品搜索相关的已弃用文件
# 运行方式: .\cleanup-search-refactor.ps1

Write-Host "🧹 开始清理搜索功能重构..." -ForegroundColor Green
Write-Host ""

# 1. 删除商品搜索页面
Write-Host "❌ 删除 pages/goods/search/ ..." -ForegroundColor Yellow
if (Test-Path "pages/goods/search") {
    Remove-Item -Path "pages/goods/search" -Recurse -Force
    Write-Host "   已删除" -ForegroundColor Green
} else {
    Write-Host "   目录不存在（已清理）" -ForegroundColor Gray
}

# 2. 删除商品搜索服务
Write-Host "❌ 删除 services/good/fetchSearchHistory.js ..." -ForegroundColor Yellow
if (Test-Path "services/good/fetchSearchHistory.js") {
    Remove-Item -Path "services/good/fetchSearchHistory.js" -Force
    Write-Host "   已删除" -ForegroundColor Green
} else {
    Write-Host "   文件不存在（已清理）" -ForegroundColor Gray
}

Write-Host "❌ 删除 services/good/fetchSearchResult.js ..." -ForegroundColor Yellow
if (Test-Path "services/good/fetchSearchResult.js") {
    Remove-Item -Path "services/good/fetchSearchResult.js" -Force
    Write-Host "   已删除" -ForegroundColor Green
} else {
    Write-Host "   文件不存在（已清理）" -ForegroundColor Gray
}

# 3. 删除模型文件
Write-Host "❌ 删除 model/search.js ..." -ForegroundColor Yellow
if (Test-Path "model/search.js") {
    Remove-Item -Path "model/search.js" -Force
    Write-Host "   已删除" -ForegroundColor Green
} else {
    Write-Host "   文件不存在（已清理）" -ForegroundColor Gray
}

# 4. 更新 Git 追踪
Write-Host ""
Write-Host "📝 更新 Git 追踪..." -ForegroundColor Yellow

try {
    git rm -r "pages/goods/search" 2>$null
    git rm "services/good/fetchSearchHistory.js" 2>$null
    git rm "services/good/fetchSearchResult.js" 2>$null
    git rm "model/search.js" 2>$null
    Write-Host "   Git 追踪已更新" -ForegroundColor Green
} catch {
    Write-Host "   Git 更新出现问题（可能文件已删除）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ 清理完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步: 提交更改" -ForegroundColor Cyan
Write-Host "   git commit -m 'refactor: remove goods search system and unify hotel search'" -ForegroundColor Gray
