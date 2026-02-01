# 🔍 订单显示问题诊断脚本

## 在微信开发者工具控制台运行

将以下代码复制粘贴到微信开发者工具的**控制台**中，逐个执行来诊断问题：

### 诊断 #1: 检查登录状态

```javascript
// 执行这段代码
const userId = wx.getStorageSync('userId');
const userInfo = wx.getStorageSync('userInfo');
const token = wx.getStorageSync('token');

console.log('=== 登录状态诊断 ===');
console.log('userId:', userId || '❌ 未找到');
console.log('userInfo:', userInfo);
console.log('token:', token || '❌ 未找到');

if (!userId && !userInfo?._id) {
  console.warn('⚠️  警告：没有找到用户ID，需要重新登录');
}
```

**预期输出**:
```
=== 登录状态诊断 ===
userId: "5f1a2b3c4d5e6f7g8h9i0j1k"  // 应该是一个 24 位的字符串
userInfo: { _id: "5f1a2b...", nickName: "testuser", ... }
token: "token_1706614400000"
```

---

### 诊断 #2: 测试数据库连接

```javascript
// 执行这段代码
const db = wx.cloud.database();
const userId = wx.getStorageSync('userId') || (wx.getStorageSync('userInfo')?._id);

console.log('=== 数据库连接诊断 ===');
console.log('云数据库对象:', db ? '✅ 已连接' : '❌ 未连接');
console.log('当前用户ID:', userId || '❌ 未找到');

if (!userId) {
  console.error('❌ 错误：无法找到用户ID，无法查询订单');
} else {
  // 查询订单
  db.collection('inn_booking')
    .where({ userId: userId })
    .get()
    .then(res => {
      console.log('✅ 数据库查询成功');
      console.log('找到的订单数:', res.data.length);
      console.log('订单数据:', res.data);
    })
    .catch(err => {
      console.error('❌ 数据库查询失败:', err);
    });
}
```

**可能的结果**:
- ✅ 找到订单: `订单数据: [{...}, {...}]`
- ❌ 没找到订单: `找到的订单数: 0`
- ❌ 权限错误: `Error: permission denied`
- ❌ 集合不存在: `Error: collection not found`

---

### 诊断 #3: 检查订单页面数据

```javascript
// 执行这段代码
const page = getCurrentPages()[0]; // 获取当前页面实例
const pageData = page.data;

console.log('=== 订单页面数据诊断 ===');
console.log('当前页面:', page.route);
console.log('orderList 长度:', pageData.orderList?.length || 0);
console.log('listLoading 状态:', pageData.listLoading);
console.log('  0=完成, 1=加载中, 2=为空, 3=失败');
console.log('完整的 orderList:', pageData.orderList);

if (pageData.listLoading === 3) {
  console.warn('⚠️  警告：订单加载失败');
} else if (pageData.listLoading === 2) {
  console.warn('⚠️  警告：没有找到订单（可能没有测试数据）');
}
```

**预期输出**:
```
=== 订单页面数据诊断 ===
当前页面: pages/order/order-list
orderList 长度: 2
listLoading 状态: 0
  0=完成, 1=加载中, 2=为空, 3=失败
完整的 orderList: [{id: "...", orderNo: "...", ...}]
```

---

### 诊断 #4: 手动刷新订单列表

```javascript
// 执行这段代码来手动刷新订单
const page = getCurrentPages()[0];

console.log('=== 手动刷新订单列表 ===');
console.log('开始刷新...');

if (page.getBookingList) {
  page.getBookingList(-1)  // -1 表示查询所有状态
    .then(() => {
      console.log('✅ 刷新成功');
      console.log('订单数:', page.data.orderList.length);
    })
    .catch(err => {
      console.error('❌ 刷新失败:', err);
    });
} else {
  console.error('❌ 页面不是订单列表页面或方法不存在');
}
```

---

## 常见问题排查

### 问题 1: 找不到 userId

**症状**: 诊断 #1 中 userId 返回空

**解决**:
1. 检查是否已登录 → 需要先登录
2. 检查登录代码是否有问题 → 查看 pages/login/profile.js
3. 尝试重新登录

---

### 问题 2: 数据库查询失败，权限错误

**症状**: 诊断 #2 中出现 `Error: permission denied`

**解决**:
1. 打开云开发控制台
2. 进入数据库 → `inn_booking` 集合
3. 点击"权限"选项卡
4. 确保权限设置为"所有用户可读"或类似的开放策略

---

### 问题 3: 数据库查询返回 0 条数据

**症状**: 诊断 #2 中 `找到的订单数: 0`

**解决**:
1. 打开云开发控制台 > 数据库
2. 检查 `inn_booking` 集合中是否有数据
3. 检查现有数据的 `userId` 字段是否与当前登录用户的 `_id` 一致
4. 如果没有数据，需要创建测试订单（见下面的"创建测试数据"部分）

---

### 问题 4: 页面显示"加载失败"

**症状**: 诊断 #3 中 `listLoading 状态: 3`

**解决**:
1. 打开浏览器控制台（F12）
2. 查看网络选项卡中的错误信息
3. 查看控制台中的错误日志
4. 检查云开发连接是否正常

---

## 创建测试数据

如果诊断 #2 返回 0 条数据，需要创建测试订单。

### 步骤 1: 获取当前用户的 ID

```javascript
const userId = wx.getStorageSync('userId') || wx.getStorageSync('userInfo')?._id;
console.log('当前用户ID:', userId);
// 复制这个 ID 供后续使用
```

### 步骤 2: 在云开发控制台创建数据

1. 打开 [https://console.cloud.tencent.com/tcb](云开发控制台)
2. 选择你的数据库 > `inn_booking` 集合
3. 点击"新增文档"或"添加字段"
4. 创建以下结构的文档：

```javascript
{
  "userId": "上面复制的用户ID",
  "bookingId": "TEST001",
  "status": 1,
  "roomPrice": 699,
  "checkInDate": "2026-02-01",
  "checkOutDate": "2026-02-03",
  "nights": 2,
  "roomId": "room_001",
  "createdAt": "2026-01-30T10:00:00.000Z",
  "storeName": "测试民宿",
  "storeLogo": "",
  "statusDesc": "待确认"
}
```

### 步骤 3: 重新加载页面并测试

1. 在微信开发者工具中按 F5 刷新
2. 导航到 "我的订单" 页面
3. 应该看到刚才创建的订单

---

## 快速恢复步骤

如果诊断出具体问题，可按以下步骤恢复：

```bash
# 1. 完全清除所有缓存
wx.clearStorageSync()

# 2. 重新编译项目
# 在微信开发者工具中: Ctrl + Shift + B

# 3. 清除缓存
# 选项 > 清除缓存 > 全部清除 > 关闭重启

# 4. 重新登录并测试
# 点击登录 > 完善资料 > 完成
# 然后检查订单页面
```

---

## 获取更多帮助

如果问题仍未解决：

1. **查看日志**
   - 微信开发者工具 > 控制台 > 查看所有错误和警告

2. **查看代码修改**
   - `git diff pages/login/` - 检查登录代码修改
   - `git diff pages/order/` - 检查订单代码修改

3. **检查文档**
   - [ORDERS_FIX_GUIDE.md](ORDERS_FIX_GUIDE.md) - 详细修复指南
   - [CODE_REVIEW.md](CODE_REVIEW.md) - 代码审查报告

---

**诊断完成** ✅
