#!/bin/bash
# 搜索功能重构 - 文件清理脚本
# 用途: 删除商品搜索相关的已弃用文件

echo "🧹 开始清理搜索功能重构..."
echo ""

# 1. 删除商品搜索页面
echo "❌ 删除 pages/goods/search/ ..."
rm -rf pages/goods/search/

# 2. 删除商品搜索服务
echo "❌ 删除 services/good/fetchSearchHistory.js ..."
rm -f services/good/fetchSearchHistory.js

echo "❌ 删除 services/good/fetchSearchResult.js ..."
rm -f services/good/fetchSearchResult.js

# 3. 删除模型文件
echo "❌ 删除 model/search.js ..."
rm -f model/search.js

# 4. 更新 Git 追踪
echo ""
echo "📝 更新 Git 追踪..."
git rm -r pages/goods/search/ 2>/dev/null || true
git rm services/good/fetchSearchHistory.js 2>/dev/null || true
git rm services/good/fetchSearchResult.js 2>/dev/null || true
git rm model/search.js 2>/dev/null || true

echo ""
echo "✅ 清理完成！"
echo ""
echo "📋 下一步: 提交更改"
echo "   git commit -m 'refactor: remove goods search system and unify hotel search'"
