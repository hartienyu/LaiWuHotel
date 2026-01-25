# 腾讯云数据库 - 酒店预订系统数据结构

## 数据库概览

使用腾讯云微信小程序云开发的云数据库，包含以下核心集合：

| 集合名 | 用途 | 文档数 | 备注 |
|--------|------|--------|------|
| `hotels` | 酒店主信息 | N | 酒店基础数据 |
| `inn_booking` | 酒店预订记录 | N | 用户预订数据 |
| `rooms` | 房间类型（可选） | N | 房间详细信息 |

---

## 1. 酒店集合 (hotels)

### 数据结构

```javascript
{
  "_id": "hotel001",                    // 系统自动生成
  "_openid": "user_openid",             // 创建者的 openid
  "createTime": ISODate(),              // 创建时间
  "updateTime": ISODate(),              // 更新时间
  
  // 🏨 基本信息
  "name": "如家酒店·北京中关村店",      // 酒店名称 ✅ 可搜索
  "description": "舒适的商务酒店",      // 描述
  "city": "北京",                        // 城市 ✅ 可搜索
  "region": "中关村",                    // 区域/街道 ✅ 可搜索
  "address": "中关村大街1号",            // 详细地址
  "phone": "010-xxxxxxxx",              // 电话
  
  // 📍 地理信息
  "latitude": 39.9864,                  // 纬度
  "longitude": 116.3274,                // 经度
  
  // ⭐ 评价信息
  "score": 4.8,                         // 评分（0-5）
  "reviewCount": 1250,                  // 评价数
  "bookingCount": 3500,                 // 预订量（用于热度排序）
  
  // 💰 价格信息
  "minPrice": 298,                      // 最低价格（分）
  "maxPrice": 1288,                     // 最高价格（分）
  "currency": "CNY",                    // 货币
  
  // 🛏️ 房间列表
  "roomList": [
    {
      "id": "room001",                  // 房间ID
      "name": "标准间",                  // 房间名称
      "description": "1张大床，独立卫浴", // 房间描述
      "capacity": 2,                    // 容纳人数
      "floor": "2F",                    // 楼层
      "size": "30m²",                   // 面积
      "amenities": [                    // 设施
        "空调",
        "WIFI",
        "电视",
        "独立卫浴",
        "热水淋浴"
      ],
      "images": [                       // 房间图片
        "https://example.com/room001_1.jpg",
        "https://example.com/room001_2.jpg"
      ],
      "price": 298,                     // 房间价格（分）
      "status": "available",            // 可用状态
      "quantity": 10                    // 库存数量
    }
  ],
  
  // 🖼️ 图片
  "thumbnail": "https://example.com/hotel001.jpg",  // 缩略图
  "images": [                           // 详情图
    "https://example.com/hotel_001.jpg",
    "https://example.com/hotel_002.jpg"
  ],
  
  // 📋 设施与服务
  "facilities": [                       // 酒店设施
    "前台24小时",
    "免费WIFI",
    "停车场",
    "会议室",
    "餐厅"
  ],
  
  // 📊 营业信息
  "status": "open",                     // 营业状态 (open/closed)
  "checkInTime": "14:00",               // 入住时间
  "checkOutTime": "12:00"               // 退房时间
}
```

### 必要索引

```
索引建议：

1️⃣ 名称索引（用于搜索）
   字段: name
   排序: 升序
   目的: 加速酒店名称搜索

2️⃣ 城市索引（用于搜索）
   字段: city
   排序: 升序
   目的: 加速按城市筛选

3️⃣ 评分排序索引
   字段: score
   排序: 降序
   目的: 加速评分排序

4️⃣ 价格排序索引
   字段: minPrice
   排序: 升序
   目的: 加速价格排序

5️⃣ 热度排序索引
   字段: bookingCount
   排序: 降序
   目的: 加速按热度排序

6️⃣ 复合索引（推荐用于常见查询）
   字段: city + name
   目的: 加速 "某城市+关键词" 的组合查询
```

### 查询示例

```javascript
// 1. 搜索特定名称的酒店
db.collection('hotels')
  .where({
    name: db.RegExp({ regexp: '如家', options: 'i' })
  })
  .get()

// 2. 获取某城市的所有酒店
db.collection('hotels')
  .where({ city: '北京' })
  .orderBy('score', 'desc')
  .get()

// 3. 多条件搜索
db.collection('hotels')
  .where({
    city: '北京',
    minPrice: db.command.lte(500)  // 最低价 <= 500
  })
  .get()

// 4. 模糊搜索多个字段
db.collection('hotels')
  .where({
    $or: [
      { name: db.RegExp({ regexp: '关键词', options: 'i' }) },
      { city: db.RegExp({ regexp: '关键词', options: 'i' }) },
      { region: db.RegExp({ regexp: '关键词', options: 'i' }) }
    ]
  })
  .get()

// 5. 分页查询
db.collection('hotels')
  .orderBy('bookingCount', 'desc')
  .skip((pageNum - 1) * pageSize)
  .limit(pageSize)
  .get()
```

---

## 2. 预订集合 (inn_booking)

### 数据结构

```javascript
{
  "_id": "booking001",                  // 系统自动生成
  "_openid": "user_openid",             // 用户 openid
  "createTime": ISODate(),              // 预订时间
  "updateTime": ISODate(),              // 更新时间
  
  // 👤 用户信息
  "userId": "user_id",                  // 用户ID（可选，如有用户表）
  "userName": "张三",                    // 用户姓名
  "userPhone": "13800138000",           // 用户电话
  "userEmail": "user@example.com",      // 用户邮箱（可选）
  
  // 🏨 酒店信息
  "hotelId": "hotel001",                // 酒店ID
  "hotelName": "如家酒店",               // 酒店名称
  "hotelPhone": "010-xxxxxxxx",         // 酒店电话
  
  // 🛏️ 房间信息
  "roomId": "room001",                  // 房间ID
  "roomName": "标准间",                  // 房间名称
  "roomPrice": 298,                     // 房间价格（分）
  
  // 📅 入住信息
  "checkInDate": "2025-02-01",          // 入住日期（YYYY-MM-DD）
  "checkOutDate": "2025-02-03",         // 退房日期（YYYY-MM-DD）
  "nightCount": 2,                      // 入住夜数
  "guestCount": 2,                      // 入住人数
  
  // 💰 费用信息
  "totalPrice": 596,                    // 总价格（分）= roomPrice * nightCount
  "paidAmount": 0,                      // 已付金额（分）
  "paymentStatus": "pending",           // 支付状态 (pending/paid/cancelled)
  "paymentMethod": "weixin",            // 支付方式 (weixin/alipay/bank)
  "paymentTime": ISODate(),             // 支付时间（可选）
  
  // 📋 预订状态
  "bookingStatus": "confirmed",         // 预订状态
                                        // confirmed - 已确认
                                        // checked-in - 已入住
                                        // checked-out - 已退房
                                        // cancelled - 已取消
  
  // 🎫 特殊字段
  "specialRequest": "靠近电梯",         // 特殊需求
  "remark": "备注信息",                  // 备注
  
  // 🚫 取消信息（可选）
  "cancelledAt": ISODate(),             // 取消时间
  "cancelReason": "用户主动取消",       // 取消原因
  "refundAmount": 596,                  // 退款金额（分）
  "refundStatus": "pending"             // 退款状态
}
```

### 必要索引

```
索引建议：

1️⃣ 用户预订记录索引
   字段: _openid
   排序: 升序
   目的: 快速查询用户的所有预订

2️⃣ 酒店预订索引
   字段: hotelId
   排序: 升序
   目的: 快速查询某酒店的预订

3️⃣ 日期范围索引
   字段: checkInDate
   排序: 升序
   目的: 快速查询某日期的预订

4️⃣ 预订状态索引
   字段: bookingStatus
   排序: 升序
   目的: 快速查询各状态的预订

5️⃣ 复合索引（推荐）
   字段: _openid + bookingStatus
   目的: 快速查询用户的特定状态预订
```

### 查询示例

```javascript
// 1. 获取用户的所有预订
db.collection('inn_booking')
  .where({ _openid: userOpenId })
  .orderBy('createTime', 'desc')
  .get()

// 2. 获取特定状态的预订
db.collection('inn_booking')
  .where({
    _openid: userOpenId,
    bookingStatus: 'confirmed'
  })
  .get()

// 3. 获取日期范围内的预订（冲突检测）
db.collection('inn_booking')
  .where({
    hotelId: hotelId,
    roomId: roomId,
    checkInDate: db.command.lte('2025-02-05'),
    checkOutDate: db.command.gte('2025-02-01')
  })
  .get()

// 4. 获取待支付的预订
db.collection('inn_booking')
  .where({
    _openid: userOpenId,
    paymentStatus: 'pending'
  })
  .get()

// 5. 统计用户的预订数
db.collection('inn_booking')
  .where({ _openid: userOpenId })
  .count()
```

---

## 3. 房间集合 (rooms) - 可选

如果需要管理房间库存和状态，可建立独立的房间集合：

```javascript
{
  "_id": "room001",
  "hotelId": "hotel001",
  "name": "标准间",
  "type": "standard",
  "price": 298,
  "stock": [
    {
      "date": "2025-02-01",
      "available": 5,
      "booked": 5,
      "total": 10
    }
  ],
  "images": [],
  "amenities": []
}
```

---

## 数据库安全规则

### 建议的安全策略

```javascript
// 1. hotels 集合 - 仅读，只能读取其他用户创建的数据
{
  "read": true,
  "write": false
}

// 2. inn_booking 集合 - 用户只能读写自己的数据
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid || (!data._openid && newData._openid == auth.openid)"
}

// 3. rooms 集合 - 仅读
{
  "read": true,
  "write": false
}
```

---

## 数据迁移脚本示例

```javascript
// 批量导入酒店数据（管理员）
async function importHotels(data) {
  const db = wx.cloud.database();
  const promises = data.map(hotel => 
    db.collection('hotels').add({ data: hotel })
  );
  return Promise.all(promises);
}

// 导入示例数据
const sampleHotels = [
  {
    name: "如家酒店·北京中关村店",
    city: "北京",
    region: "中关村",
    score: 4.8,
    bookingCount: 3500,
    minPrice: 298,
    maxPrice: 1288,
    roomList: [
      {
        id: "room001",
        name: "标准间",
        price: 298,
        quantity: 10
      }
    ]
  }
  // ... 更多酒店
];
```

---

## 备份和维护

### 定期备份计划
```
- 频率: 每周一次
- 方式: 腾讯云数据库导出
- 保留期: 30天
```

### 性能监控
```
- 监控数据库操作延迟
- 监控集合大小增长
- 定期检查索引性能
```

### 清理过期数据
```
// 删除6个月前的已取消预订
db.collection('inn_booking')
  .where({
    bookingStatus: 'cancelled',
    cancelledAt: db.command.lt(new Date(Date.now() - 180*24*60*60*1000))
  })
  .remove()
```

