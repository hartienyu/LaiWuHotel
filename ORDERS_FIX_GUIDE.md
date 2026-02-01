# 🔧 订单显示问题修复指南

## 问题分析

用户登录后在订单页仍看不到订单数据。根据代码分析，原因是：

### 根本原因：userId 获取失败

**之前的问题**:
- ❌ 订单页面查找 `userOpenId`（来自 localStorage）
- ❌ 登录时只保存了 `userInfo` 对象，没有单独保存 `userId`
- ❌ 因此订单查询时 userId 为 undefined，导致无法获取订单

### 修复方案

已应用以下修复：

#### 1️⃣ 登录时保存 userId（2 个文件）

**pages/login/profile.js**
```javascript
// 新增
wx.setStorageSync('userId', addRes._id);
```

**pages/login/index.js**
```javascript
// 新增
if (userInfo._id) {
  wx.setStorageSync('userId', userInfo._id);
}
```

#### 2️⃣ 订单页面改为正确获取 userId（2 个文件）

**pages/order/order-list/index.js**
```javascript
// 修改前：查找 userOpenId（不存在）
const userOpenId = wx.getStorageSync('userOpenId');

// 修改后：查找 userId，缺少时从 userInfo 提取
let userId = wx.getStorageSync('userId');
if (!userId) {
  const userInfo = wx.getStorageSync('userInfo');
  userId = userInfo && userInfo._id;
}
```

**pages/cart/index.js**
```javascript
// 类似的修改，支持从 userInfo 提取 _id
let userId = wx.getStorageSync('userId');
if (!userId) {
  const userInfo = wx.getStorageSync('userInfo');
  userId = userInfo && userInfo._id;
}
```

---

## 验证步骤

### ✅ 第一步：确保数据库有数据

在云开发数据库中创建测试数据（如果没有）：

**集合**: `inn_booking`

**示例文档**:
```json
{
  "userId": "用户的_id",
  "bookingId": "BOOK001",
  "status": 1,
  "roomPrice": 699,
  "checkInDate": "2026-02-01",
  "checkOutDate": "2026-02-03",
  "nights": 2,
  "createdAt": "2026-01-30T10:00:00Z",
  "roomId": "room_001"
}
```

### ✅ 第二步：微信开发者工具中验证

1. **关闭项目，完全重启**
   - 关闭微信开发者工具
   - 清除所有缓存（设置 > 清除缓存 > 全部清除）
   - 重新打开项目

2. **测试登录流程**
   - 点击 "登录" 按钮
   - 完善头像和昵称
   - 点击 "完成"
   - **检查**: LocalStorage 中是否保存了 `userId`
     - 在开发者工具控制台执行: `wx.getStorageSync('userId')`
     - 应该输出一个 24 位的 ObjectId 字符串

3. **查看订单页面**
   - 底部菜单 > "我的" > "订单"
   - **应该看到**:
     - 订单列表加载成功
     - 显示刚才创建的测试订单
     - 订单卡片显示完整信息

### ✅ 第三步：控制台调试

在微信开发者工具的控制台中查看：

```javascript
// 检查 userId 是否正确保存
wx.getStorageSync('userId')
// 应返回: "5f1a2b3c4d5e6f7g8h9i0j1k" 或类似的 _id

// 检查 userInfo
wx.getStorageSync('userInfo')
// 应返回: { _id: "...", nickName: "...", ... }

// 检查云数据库中是否有该用户的订单
// 在云开发控制台查看 inn_booking 表，筛选 userId 字段
```

---

## 如果仍看不到订单

### 排查清单

- [ ] **1. 检查登录状态**
  ```javascript
  // 在控制台输入
  wx.getStorageSync('userId')
  ```
  如果返回空或 undefined，说明登录失败或 userId 未保存

- [ ] **2. 检查数据库数据**
  - 打开云开发控制台 > 数据库 > `inn_booking` 集合
  - 查看是否有数据
  - 确认数据的 `userId` 字段与登录用户的 `_id` 一致

- [ ] **3. 检查查询语句**
  - 在云开发控制台中手动执行：
  ```javascript
  db.collection('inn_booking').where({
    userId: '你的userId'
  }).get()
  ```
  - 如果有结果，说明数据库查询没问题

- [ ] **4. 检查网络和权限**
  - 确保云开发服务已启用
  - 确保 `inn_booking` 表的读权限已配置（通常为"所有用户可读"）

---

## 文件修改总结

| 文件 | 修改内容 | 目的 |
|-----|--------|------|
| pages/login/profile.js | 添加 `wx.setStorageSync('userId', ...)` | 新用户注册时保存 userId |
| pages/login/index.js | 添加 `wx.setStorageSync('userId', ...)` | 已有用户登录时保存 userId |
| pages/order/order-list/index.js | 改用 userId 替代 userOpenId | 正确获取订单数据 |
| pages/cart/index.js | 改用 userId 替代 userOpenId | 正确获取预订数据 |

---

## 后续建议

1. **添加测试数据**
   - 在云开发控制台为测试用户创建几条订单记录

2. **改进错误提示**
   - 如果 userId 未找到，应该引导用户登录而不是显示加载失败

3. **缓存优化**
   - 可以考虑在 App.js 的 onLaunch 中读取并缓存 userId 到全局变量

4. **数据同步**
   - 确保注册和登录时 `_id` 字段被正确保存

---

## 🚀 快速开始

```bash
# 1. 确保修改已应用
git status

# 2. 编译项目
# 在微信开发者工具中 Ctrl+Shift+B

# 3. 清除缓存
# 选项 > 清除缓存 > 全部清除

# 4. 重启预览
# 按 F5 或重新启动

# 5. 测试登录和订单
# 按照上面的验证步骤进行测试
```

---

**修复完成** ✅ | 测试中...
