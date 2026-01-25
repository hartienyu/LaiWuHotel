# 搜索功能重构 - 清理计划

## 已删除的文件和模块

### 1. 商品搜索页面文件（需要手动删除）
```
pages/goods/search/
├── index.js          ❌ 删除（商品搜索页面）
├── index.json        ❌ 删除
├── index.wxml        ❌ 删除
├── index.wxss        ❌ 删除
├── fetchsearchresults.js   ❌ 删除
├── fetchsearchresults.json ❌ 删除
├── fetchsearchresults.wxml ❌ 删除
└── fetchsearchresults.wxss ❌ 删除
```

### 2. 商品搜索相关服务文件（需要手动删除）
```
services/good/
├── fetchSearchHistory.js     ❌ 删除（仅用于商品搜索）
├── fetchSearchResult.js      ❌ 删除（仅用于商品搜索）
└── fetchGoodsDetailsComments.js  ⚠️ 需要检查是否被使用
```

### 3. 模型文件（需要手动删除）
```
model/
└── search.js                 ❌ 删除（商品mock数据）
```

## 新增的文件

### 1. 新的酒店搜索服务
```
services/booking/searchHotels.js  ✅ 创建
```
提供统一的酒店搜索接口：
- `searchHotels(keyword)` - 搜索酒店
- `getHotelDetail(hotelId)` - 获取酒店详情

## 需要更新的文件

### 1. `app.json` - 移除商品搜索页面配置
- 从 subpackages[goods] 中删除 `"search/index"` 和 `"search/fetchsearchresults"`

### 2. 引用商品搜索的其他页面
- `pages/goods/result/index.js` - 引用了 `fetchSearchResult`（需要检查是否被使用）

## 数据库使用规范

### ✅ 保留
- `hotels` - 酒店主表
- `inn_booking` - 酒店预订表

### ❌ 删除
- goods 相关的所有表的引用

## 搜索功能现状

### 酒店搜索 (pages/search/search.js)
- ✅ 使用 `hotels` 表
- ✅ 支持按名称模糊搜索
- ✅ 支持兜底逻辑（无结果时返回所有）
- ✅ 数据格式化完整
- ✅ 集成预订功能

