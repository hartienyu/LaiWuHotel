# API 文档 - 酒店搜索与预订系统

## 概述

本文档描述了酒店搜索与预订系统的所有 API 接口，包括：
- 前端服务 API
- 云函数 API
- 数据库操作

---

## 一、前端搜索服务 API

### 1. searchHotels() - 搜索酒店

**文件**: `services/booking/searchHotels.js`

**签名**:
```typescript
function searchHotels(
  keyword: string = '',
  options: {
    pageNum?: number,
    pageSize?: number,
    sortBy?: 'hot' | 'score' | 'price',
    useCloudFunction?: boolean
  } = {}
): Promise<{
  success: boolean,
  data: Hotel[],
  isFallback: boolean,
  total: number,
  pages?: number,
  error?: string
}>
```

**参数说明**:
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| keyword | string | '' | 搜索关键词（支持酒店名、城市、地区） |
| options.pageNum | number | 1 | 页码（仅云函数模式） |
| options.pageSize | number | 10 | 每页条数（仅云函数模式） |
| options.sortBy | string | 'hot' | 排序方式：hot(热度)、score(评分)、price(价格) |
| options.useCloudFunction | boolean | false | 是否使用云函数 |

**返回值说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 是否成功 |
| data | Hotel[] | 酒店列表 |
| isFallback | boolean | 是否触发兜底逻辑（无结果时） |
| total | number | 总记录数 |
| pages | number | 总页数（仅云函数模式） |
| error | string | 错误信息（失败时） |

**使用示例**:
```javascript
import { searchHotels } from '../../services/booking/searchHotels';

// 基础搜索
const result = await searchHotels('北京');

// 带选项的搜索
const result = await searchHotels('北京', {
  pageNum: 1,
  pageSize: 20,
  sortBy: 'score',
  useCloudFunction: true
});

if (result.success) {
  console.log('搜索结果:', result.data);
  if (result.isFallback) {
    console.log('无精确结果，显示所有酒店');
  }
} else {
  console.error('搜索失败:', result.error);
}
```

---

### 2. getHotelDetail() - 获取酒店详情

**文件**: `services/booking/searchHotels.js`

**签名**:
```typescript
function getHotelDetail(
  hotelId: string
): Promise<{
  success: boolean,
  data?: Hotel,
  error?: string
}>
```

**参数说明**:
| 参数 | 类型 | 说明 |
|------|------|------|
| hotelId | string | 酒店 ID |

**返回值说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 是否成功 |
| data | Hotel | 酒店详细信息 |
| error | string | 错误信息（失败时） |

**使用示例**:
```javascript
const result = await getHotelDetail('hotel001');
if (result.success) {
  console.log('酒店详情:', result.data);
}
```

---

### 3. getRoomInventory() - 获取房间库存

**文件**: `services/booking/searchHotels.js`

**签名**:
```typescript
function getRoomInventory(
  roomId: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean,
  data?: {
    bookedDates: Booking[],
    available: boolean
  },
  error?: string
}>
```

**参数说明**:
| 参数 | 类型 | 说明 |
|------|------|------|
| roomId | string | 房间 ID |
| startDate | string | 开始日期 (YYYY-MM-DD) |
| endDate | string | 结束日期 (YYYY-MM-DD) |

**返回值说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 是否成功 |
| data.bookedDates | Booking[] | 已预订的日期范围 |
| data.available | boolean | 是否有空房 |
| error | string | 错误信息 |

**使用示例**:
```javascript
const result = await getRoomInventory('room001', '2025-02-01', '2025-02-05');
if (result.success) {
  if (result.data.available) {
    console.log('房间有空房');
  } else {
    console.log('该日期房间已满');
  }
}
```

---

## 二、云函数 API

### 1. searchHotels 云函数

**路径**: `cloudfunctions/searchHotels/index.js`

**入参**:
```typescript
{
  keyword: string,          // 搜索关键词
  pageNum: number = 1,      // 页码
  pageSize: number = 10,    // 每页条数
  sortBy: string = 'hot'    // 排序方式
}
```

**返回**:
```typescript
{
  code: number,             // 0: 成功, 其他: 失败
  message: string,          // 响应信息
  data: {
    list: Hotel[],          // 酒店列表
    pageNum: number,
    pageSize: number,
    total: number,          // 总数
    pages: number           // 总页数
  }
}
```

**调用示例**:
```javascript
// 从小程序端调用
wx.cloud.callFunction({
  name: 'searchHotels',
  data: {
    keyword: '北京',
    pageNum: 1,
    pageSize: 10,
    sortBy: 'score'
  }
}).then(res => {
  console.log('搜索结果:', res.result.data.list);
});
```

**错误响应**:
```javascript
{
  code: 400,  // 参数不合法
  message: '缺少搜索关键词或关键词类型不正确',
  data: null
}

{
  code: 500,  // 服务器错误
  message: '服务器错误信息',
  data: null
}
```

---

### 2. test 云函数

**路径**: `cloudfunctions/test/index.js`

**入参**:
```typescript
{
  testCase: string = 'all'  // 测试用例
  // 可选值: 'all', 'connection', 'collections', 'search', 'indexes', 'pagination', 'performance'
}
```

**返回**:
```typescript
{
  code: number,
  message: string,
  results: {
    [testName]: TestResult
  }
}
```

**调用示例**:
```javascript
// 测试所有项目
wx.cloud.callFunction({
  name: 'test',
  data: { testCase: 'all' }
});

// 仅测试搜索功能
wx.cloud.callFunction({
  name: 'test',
  data: { testCase: 'search' }
});
```

---

## 三、数据库操作 API

### 数据模型

#### Hotel 模型
```typescript
interface Hotel {
  _id: string;              // 文档 ID
  name: string;             // 酒店名称
  city: string;             // 城市
  region: string;           // 地区
  address: string;          // 地址
  phone: string;            // 电话
  latitude: number;         // 纬度
  longitude: number;        // 经度
  score: number;            // 评分
  reviewCount: number;      // 评价数
  bookingCount: number;     // 预订量
  minPrice: number;         // 最低价格（分）
  maxPrice: number;         // 最高价格（分）
  currency: string;         // 货币
  roomList: Room[];         // 房间列表
  thumbnail: string;        // 缩略图
  images: string[];         // 图片列表
  facilities: string[];     // 设施列表
  status: 'open' | 'closed'; // 营业状态
  checkInTime: string;      // 入住时间
  checkOutTime: string;     // 退房时间
}
```

#### Room 模型
```typescript
interface Room {
  id: string;               // 房间 ID
  name: string;             // 房间名称
  description: string;      // 描述
  capacity: number;         // 容纳人数
  floor: string;            // 楼层
  size: string;             // 面积
  amenities: string[];      // 设施
  images: string[];         // 房间图片
  price: number;            // 价格（分）
  status: 'available' | 'unavailable'; // 状态
  quantity: number;         // 库存
}
```

#### Booking 模型
```typescript
interface Booking {
  _id: string;              // 文档 ID
  _openid: string;          // 用户 openid
  hotelId: string;          // 酒店 ID
  hotelName: string;        // 酒店名称
  roomId: string;           // 房间 ID
  roomName: string;         // 房间名称
  roomPrice: number;        // 房间价格（分）
  checkInDate: string;      // 入住日期
  checkOutDate: string;     // 退房日期
  nightCount: number;       // 入住夜数
  guestCount: number;       // 入住人数
  totalPrice: number;       // 总价格（分）
  paidAmount: number;       // 已付金额（分）
  paymentStatus: 'pending' | 'paid' | 'cancelled'; // 支付状态
  paymentMethod: string;    // 支付方式
  bookingStatus: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled'; // 预订状态
  specialRequest: string;   // 特殊需求
  createTime: Date;         // 创建时间
  updateTime: Date;         // 更新时间
}
```

---

## 四、常见查询示例

### 示例 1: 搜索特定城市的高评分酒店

```javascript
const result = await searchHotels('', {
  sortBy: 'score',
  useCloudFunction: true
});

// 或通过云函数
wx.cloud.callFunction({
  name: 'searchHotels',
  data: {
    keyword: '',
    sortBy: 'score',
    pageSize: 10
  }
});
```

### 示例 2: 获取用户的所有预订

```javascript
// 在云函数中
const db = wx.cloud.database();
const res = await db.collection('inn_booking')
  .where({ _openid: userOpenId })
  .orderBy('createTime', 'desc')
  .get();
```

### 示例 3: 检测房间冲突

```javascript
// 检查特定日期范围内是否有冲突预订
const db = wx.cloud.database();
const res = await db.collection('inn_booking')
  .where({
    roomId: 'room001',
    checkInDate: db.command.lte('2025-02-05'),
    checkOutDate: db.command.gte('2025-02-01'),
    bookingStatus: db.command.ne('cancelled')
  })
  .get();

const hasConflict = res.data.length > 0;
```

### 示例 4: 统计酒店热度

```javascript
const db = wx.cloud.database();
const res = await db.collection('hotels')
  .orderBy('bookingCount', 'desc')
  .limit(10)
  .get();
```

---

## 五、错误处理指南

### 常见错误代码

| 代码 | 含义 | 处理方法 |
|------|------|---------|
| 0 | 成功 | - |
| 400 | 参数不合法 | 检查请求参数 |
| 404 | 资源不存在 | 确认资源 ID |
| 500 | 服务器错误 | 查看服务器日志 |
| PERMISSION_DENIED | 无权限 | 检查安全规则 |
| INVALID_ARGUMENT | 参数验证失败 | 检查参数格式 |

### 错误处理示例

```javascript
try {
  const result = await searchHotels('北京');
  
  if (!result.success) {
    console.error('搜索失败:', result.error);
    wx.showToast({
      title: result.error,
      icon: 'none'
    });
    return;
  }
  
  console.log('搜索成功:', result.data);
} catch (err) {
  console.error('异常错误:', err);
  wx.showToast({
    title: '网络错误',
    icon: 'none'
  });
}
```

---

## 六、性能指标

### 响应时间标准

| 操作 | 目标耗时 | 说明 |
|------|---------|------|
| 搜索无结果 | < 100ms | 直接返回空结果 |
| 搜索有结果 | < 300ms | 单页查询 |
| 分页查询 | < 500ms | 最多1000条数据 |
| 详情查询 | < 100ms | 按 ID 精确查询 |

### 缓存建议

```javascript
// 实现查询缓存
const searchCache = new Map();

export async function searchHotelsWithCache(keyword) {
  const cacheKey = `search_${keyword}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  
  const result = await searchHotels(keyword);
  
  // 缓存5分钟
  searchCache.set(cacheKey, result);
  setTimeout(() => searchCache.delete(cacheKey), 5 * 60 * 1000);
  
  return result;
}
```

---

## 七、版本号

- API 版本: 1.0.0
- 最后更新: 2025-02-01
- 维护者: Hotel Booking Team

