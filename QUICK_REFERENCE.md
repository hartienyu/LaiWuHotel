# 快速参考卡 - 酒店搜索系统

## 核心文件位置

| 功能 | 文件路径 | 说明 |
|------|---------|------|
| 搜索页面 | `pages/search/search.js` | 用户界面和交互逻辑 |
| 搜索服务 | `services/booking/searchHotels.js` | 搜索业务逻辑 |
| 预订服务 | `services/booking/submitBooking.js` | 预订业务逻辑 |
| 搜索云函数 | `cloudfunctions/searchHotels/index.js` | 后端搜索逻辑 |
| 测试云函数 | `cloudfunctions/test/index.js` | 系统测试 |

---

## 常用 API 调用

### 搜索酒店

```javascript
import { searchHotels } from '../../services/booking/searchHotels';

// 基础搜索
const result = await searchHotels('北京');

// 带排序的搜索
const result = await searchHotels('北京', {
  sortBy: 'score', // 'hot' | 'score' | 'price'
  useCloudFunction: true
});
```

### 获取酒店详情

```javascript
import { getHotelDetail } from '../../services/booking/searchHotels';

const result = await getHotelDetail('hotel001');
```

### 提交预订

```javascript
import { submitBooking } from '../../services/booking/submitBooking';

const result = await submitBooking(
  roomId,
  checkInDate,    // 'YYYY-MM-DD'
  checkOutDate,   // 'YYYY-MM-DD'
  roomPrice
);
```

---

## 数据库查询速查表

### 搜索酒店

```javascript
// 本地查询
db.collection('hotels')
  .where({
    $or: [
      { name: db.RegExp({ regexp: '北京', options: 'i' }) },
      { city: '北京' }
    ]
  })
  .get()

// 云函数调用
wx.cloud.callFunction({
  name: 'searchHotels',
  data: { keyword: '北京' }
})
```

### 获取用户预订

```javascript
db.collection('inn_booking')
  .where({ _openid: userOpenId })
  .orderBy('createTime', 'desc')
  .get()
```

### 检查房间冲突

```javascript
db.collection('inn_booking')
  .where({
    roomId: 'room001',
    checkInDate: db.command.lte('2025-02-05'),
    checkOutDate: db.command.gte('2025-02-01'),
    bookingStatus: db.command.ne('cancelled')
  })
  .get()
```

---

## 页面导航

```javascript
// 跳转到搜索页
wx.navigateTo({
  url: `/pages/search/search?q=${encodeURIComponent('搜索词')}`
});

// 跳转到订单列表
wx.switchTab({
  url: '/pages/order/order-list/index'
});
```

---

## 常见状态值

### 预订状态 (bookingStatus)
- `confirmed` - 已确认
- `checked-in` - 已入住
- `checked-out` - 已退房
- `cancelled` - 已取消

### 支付状态 (paymentStatus)
- `pending` - 待支付
- `paid` - 已支付
- `cancelled` - 已取消

### 房间状态 (status)
- `available` - 可用
- `unavailable` - 不可用

---

## 环境变量

```javascript
// app.js
wx.cloud.init({
  env: 'your-environment-id' // 替换为实际的环境 ID
});
```

---

## 调试命令

```javascript
// 测试云函数连接
wx.cloud.callFunction({
  name: 'test',
  data: { testCase: 'connection' }
});

// 测试搜索功能
wx.cloud.callFunction({
  name: 'test',
  data: { testCase: 'search' }
});

// 测试所有项目
wx.cloud.callFunction({
  name: 'test',
  data: { testCase: 'all' }
});
```

---

## 性能指标目标

| 操作 | 目标 | 备注 |
|------|------|------|
| 搜索响应 | < 300ms | 不含网络延迟 |
| 页面加载 | < 500ms | 首屏加载 |
| 预订提交 | < 3s | 包含云函数响应 |
| 数据库查询 | < 100ms | 有索引的查询 |

---

## 错误处理模板

```javascript
try {
  const result = await searchHotels(keyword);
  
  if (!result.success) {
    wx.showToast({
      title: result.error || '搜索失败',
      icon: 'none'
    });
    return;
  }
  
  // 处理结果
  this.setData({ results: result.data });
} catch (err) {
  console.error('错误:', err);
  wx.showToast({
    title: '网络错误',
    icon: 'none'
  });
}
```

---

## 日志记录

```javascript
// 前端日志
console.log('[搜索]', { keyword, resultCount: result.data.length });
console.error('[搜索失败]', error.message);

// 云函数日志
console.log('搜索开始:', { keyword, pageNum });
console.error('数据库查询失败:', err);
```

---

## 部署检查清单

- [ ] 清理不需要的文件
- [ ] 创建云环境，获取环境 ID
- [ ] 部署云函数（searchHotels, test）
- [ ] 创建数据库集合（hotels, inn_booking）
- [ ] 创建数据库索引
- [ ] 导入示例数据
- [ ] 运行测试云函数
- [ ] 本地测试搜索和预订功能
- [ ] 检查性能指标
- [ ] 文档审查

---

## 关键数据字段

### Hotel (酒店)
```
_id, name, city, region, score, minPrice, maxPrice, 
roomList[{id, name, price, quantity}], images
```

### Booking (预订)
```
_id, _openid, hotelId, roomId, checkInDate, checkOutDate,
totalPrice, paymentStatus, bookingStatus, createTime
```

---

## 常见问题速查

| 问题 | 解决方案 |
|------|---------|
| 搜索没有结果 | 检查数据库中是否有数据 |
| 云函数超时 | 检查是否创建了索引 |
| 预订失败 | 检查日期有效性和房间库存 |
| 查询慢 | 检查是否添加了必要的索引 |

---

## 更新日志

**2026-01-25** - 搜索功能重构完成

