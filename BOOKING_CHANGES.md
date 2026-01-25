# 酒店预订订单界面改造总结

## 项目改造目标
完全改造购物车页面，使其成为酒店预订订单列表界面，删除传统购物平台功能，转变为酒店预订业务。

## 改造内容

### 1. 购物车页面转变为预订订单列表 (`pages/cart/`)

#### 文件修改：

##### `pages/cart/index.js` (JavaScript 逻辑)
- **移除功能**：
  - 删除购物车数据管理相关函数（`fetchCartGroupData`, `selectGoodsService`, `selectStoreService`等）
  - 移除商品选择、数量变更等购物车操作
  - 移除收藏功能

- **新增功能**：
  - 实现`getBookingList()`方法，从云数据库`inn_booking`集合中获取预订列表
  - 支持按状态筛选：全部、待确认、已确认、已取消
  - 实现预订数据格式转换，适配订单卡片组件
  - 添加下拉刷新功能
  - 添加标签页切换功能

- **核心数据结构**：
  ```javascript
  {
    id: booking._id,
    orderNo: booking.bookingId,
    status: booking.status,
    statusDesc: '待确认/已确认/已取消',
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    nights: booking.nights,
    totalAmount: booking.roomPrice,
    goodsList: [{
      id: booking._id,
      title: '${roomName} (${nights}晚)',
      specs: ['入住: ${checkInDate}', '离店: ${checkOutDate}'],
      price: booking.roomPrice,
      num: 1
    }]
  }
  ```

##### `pages/cart/index.wxml` (模板)
- **移除组件**：
  - 删除`<cart-group>`（分层购物车组件）
  - 删除`<cart-bar>`（购物车结算栏）
  - 删除`<cart-empty>`（购物车空态组件）

- **新增组件**：
  - 添加`<t-tabs>`（标签页选择预订状态）
  - 添加`<t-pull-down-refresh>`（下拉刷新）
  - 添加`<order-card>`（订单卡片）
  - 添加`<specs-goods-card>`（房间规格卡片）
  - 添加加载状态、空态、错误提示

- **页面结构**：
  ```
  标签页导航 (全部/待确认/已确认/已取消)
    ↓
  下拉刷新容器
    ├─ 订单卡片列表
    ├─ 加载中状态
    ├─ 空列表提示
    └─ 加载失败提示
  ```

##### `pages/cart/index.json` (配置)
- **导航栏标题**：改为 `"我的预订"`
- **组件注册**：
  - 移除：`cart-group`, `cart-empty`, `cart-bar`
  - 新增：`t-tabs`, `t-tab-panel`, `t-empty`, `t-button`, `t-pull-down-refresh`, `loading-content`
  - 移除本地组件，改用订单页面的组件

##### `pages/cart/index.wxss` (样式)
- **完全重写**，适配订单页面风格
- 新增标签页样式
- 新增订单卡片样式
- 删除购物车相关样式

### 2. 导航栏更新 (`custom-tab-bar/data.js`)
- **修改内容**：标签栏文本从 `"订单"` 改为 `"我的预订"`
- **功能保持不变**：仍指向 `pages/cart/index`

## 核心特性

### 预订数据源
- **集合**：`inn_booking`（云数据库）
- **查询条件**：按用户ID(`userId`)和状态(`status`)筛选
- **状态值**：
  - `1`：待确认
  - `2`：已确认
  - `3`：已取消
  - `-1`：全部

### 页面功能
1. ✅ **标签页筛选**：快速切换查看不同状态的预订
2. ✅ **下拉刷新**：更新预订列表
3. ✅ **加载状态**：显示加载中、空列表、加载失败等状态
4. ✅ **订单详情**：点击订单卡片可查看详细信息
5. ✅ **预订信息展示**：
   - 预订号（bookingId）
   - 房间名称
   - 入住/离店日期
   - 预订金额
   - 预订状态

## 数据库字段要求

`inn_booking` 集合应包含以下字段：
```javascript
{
  _id: String,              // 记录ID
  bookingId: String,        // 预订号
  userId: String,           // 用户ID (openId)
  roomId: String,           // 房间ID
  roomName: String,         // 房间名称
  roomImage: String,        // 房间图片
  roomPrice: Number,        // 房间价格（分）
  checkInDate: String,      // 入住日期 (YYYY-MM-DD)
  checkOutDate: String,     // 离店日期 (YYYY-MM-DD)
  nights: Number,           // 入住晚数
  status: Number,           // 预订状态 (1=待确认, 2=已确认, 3=已取消)
  guestName: String,        // 客人名称
  guestPhone: String,       // 联系电话
  createdAt: Date,          // 创建时间
  updatedAt: Date           // 更新时间
}
```

## 页面间关系

### 跳转关系
- `pages/cart/index` → `pages/order/order-detail/index`
  - 点击订单卡片时，传递`orderNo`(预订号)参数跳转到详情页

### 复用组件
- `order-card`：订单卡片容器
- `specs-goods-card`：房间规格卡片（房间类型、日期等）

## 注意事项

1. **用户认证**：需要确保用户登录状态下`wx.getStorageSync('userOpenId')`能正常获取
2. **云数据库权限**：确保用户有权限访问`inn_booking`集合
3. **日期格式**：预订日期统一使用`YYYY-MM-DD`格式
4. **组件兼容性**：使用的T-Design组件需确保已在项目中正确导入

## 后续可优化项

1. 添加预订搜索功能
2. 添加预订取消功能
3. 添加预订修改功能
4. 集成支付功能（如果需要）
5. 添加预订确认邮件/短信提醒
6. 实现预订数据的实时同步

---

**改造时间**: 2026年1月25日
**项目**: LaiWuHotel 微信小程序
**类型**: 完全功能改造 - 购物车 → 预订订单
