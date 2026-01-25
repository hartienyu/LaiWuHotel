# 腾讯云部署指南

## 一、云函数部署

### 1. 创建云函数

#### 方式一：使用微信开发者工具（推荐）

1. 打开微信开发者工具
2. 右键点击 `cloudfunctions` 文件夹
3. 选择 "新建 Node.js Cloud Function"
4. 命名为 `searchHotels`
5. 确认创建

#### 方式二：通过腾讯云控制台

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 进入 "云开发" -> "云函数"
3. 点击 "新建函数"
4. 配置基本信息：
   - 函数名称：`searchHotels`
   - 运行环境：`Node.js 12` 或更高版本
   - 执行方法：`index.main`

### 2. 部署云函数代码

#### 步骤：

1. **替换云函数代码**
   - 将 `cloudfunctions/searchHotels/index.js` 的内容复制到云函数编辑器

2. **安装依赖**
   ```bash
   # 在开发者工具中，右键点击 searchHotels 文件夹
   # 选择 "上传并部署（云端安装依赖）"
   # 或手动上传时，确保 package.json 包含正确的依赖
   ```

3. **测试云函数**
   ```javascript
   // 在云函数测试页面，输入测试数据
   {
     "keyword": "如家",
     "pageNum": 1,
     "pageSize": 10,
     "sortBy": "hot"
   }
   
   // 预期响应
   {
     "code": 0,
     "message": "搜索成功",
     "data": {
       "list": [...],
       "pageNum": 1,
       "pageSize": 10,
       "total": 5,
       "pages": 1
     }
   }
   ```

### 3. 云函数环境变量配置

在 `cloudfunctions/searchHotels/index.js` 中的环境初始化：

```javascript
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV, // 使用动态环境 ID
  // 或指定具体环境 ID
  // env: 'your-env-id'
});
```

---

## 二、数据库配置

### 1. 创建数据库集合

#### 使用腾讯云控制台：

1. 登录腾讯云控制台 -> 云开发
2. 进入 "数据库" 面板
3. 创建以下集合：

| 集合名 | 用途 | 文档示例 |
|--------|------|---------|
| `hotels` | 酒店主信息 | 见 DATABASE_STRUCTURE.md |
| `inn_booking` | 酒店预订记录 | 见 DATABASE_STRUCTURE.md |

#### 使用代码创建：

```javascript
// 在云函数中执行一次
const db = wx.cloud.database();

// 创建 hotels 集合（通过添加第一个文档）
await db.collection('hotels').add({
  data: {
    name: "示例酒店",
    city: "北京",
    score: 4.5
  }
});

// 创建 inn_booking 集合
await db.collection('inn_booking').add({
  data: {
    hotelId: "hotel001",
    userId: "user001",
    bookingStatus: "confirmed"
  }
});
```

### 2. 创建数据库索引

#### 通过腾讯云控制台：

1. 进入 "数据库" -> 对应集合
2. 选择 "索引" 标签
3. 点击 "新建索引"
4. 按 DATABASE_STRUCTURE.md 中的索引建议配置

#### hotels 集合推荐索引：

```
索引1: name (升序)
索引2: city (升序)
索引3: score (降序)
索引4: minPrice (升序)
索引5: bookingCount (降序)
索引6: city + name (复合)
```

#### inn_booking 集合推荐索引：

```
索引1: _openid (升序)
索引2: hotelId (升序)
索引3: checkInDate (升序)
索引4: bookingStatus (升序)
索引5: _openid + bookingStatus (复合)
```

### 3. 数据库安全规则

#### hotels 集合 - 所有人可读，只能看自己创建的数据

```json
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

#### inn_booking 集合 - 用户只能读写自己的数据

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

---

## 三、前端配置

### 1. 切换查询方式

在 `pages/search/search.js` 中：

```javascript
// 使用本地数据库方式（开发环境）
const result = await searchHotels(q);

// 使用云函数方式（生产环境）
const result = await searchHotels(q, { useCloudFunction: true });
```

### 2. 云函数名称配置

如果云函数名称不是 `searchHotels`，需要在 `services/booking/searchHotels.js` 中修改：

```javascript
async function searchHotelsWithCloudFunction(keyword, pageNum, pageSize, sortBy) {
  const res = await wx.cloud.callFunction({
    name: 'your-function-name', // 修改为实际的云函数名称
    data: { keyword, pageNum, pageSize, sortBy }
  });
  // ...
}
```

---

## 四、导入示例数据

### 1. 创建数据导入脚本

在 `cloudfunctions/importData/index.js`：

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
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
    },
    // ... 更多酒店数据
  ];

  const promises = sampleHotels.map(hotel =>
    db.collection('hotels').add({ data: hotel })
  );

  try {
    await Promise.all(promises);
    return { code: 0, message: "导入成功" };
  } catch (err) {
    return { code: 500, message: err.message };
  }
};
```

### 2. 通过 CSV 导入

1. 在腾讯云控制台，进入数据库
2. 选择 `hotels` 集合
3. 点击 "导入数据" 按钮
4. 上传 CSV 文件

CSV 格式示例：
```
name,city,region,score,minPrice,maxPrice
如家酒店·北京中关村店,北京,中关村,4.8,298,1288
速8酒店·北京天安门店,北京,天安门,4.5,199,899
```

---

## 五、监控和日志

### 1. 查看云函数日志

1. 打开微信开发者工具 -> "云函数" 面板
2. 选择 `searchHotels` 函数
3. 点击 "日志" 标签
4. 查看实时日志

### 2. 设置日志级别

在 `cloudfunctions/searchHotels/index.js`：

```javascript
// 启用详细日志
console.log('搜索开始:', { keyword, pageNum, pageSize });
console.error('搜索出错:', err);

// 生产环境可以集成专业日志服务
// 如：腾讯云日志服务、ELK Stack 等
```

### 3. 数据库操作监控

```javascript
// 监控慢查询
const startTime = Date.now();
const res = await db.collection('hotels').get();
const duration = Date.now() - startTime;

if (duration > 1000) {
  console.warn('慢查询检测:', { duration, data: res });
}
```

---

## 六、性能优化建议

### 1. 使用查询缓存

```javascript
const cacheMap = new Map();

export async function searchHotels(keyword = '', options = {}) {
  const cacheKey = `${keyword}_${JSON.stringify(options)}`;
  
  // 检查缓存
  if (cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }
  
  // 执行查询
  const result = await searchHotelsLocal(keyword);
  
  // 缓存结果（5分钟）
  cacheMap.set(cacheKey, result);
  setTimeout(() => cacheMap.delete(cacheKey), 5 * 60 * 1000);
  
  return result;
}
```

### 2. 数据库查询优化

```javascript
// 使用投影，只查询需要的字段
db.collection('hotels')
  .field({
    name: true,
    city: true,
    score: true,
    minPrice: true
    // 不查询 roomList 等大字段
  })
  .get()
```

### 3. 分页查询

```javascript
// 一次性查询所有数据会很慢
// 应该使用分页查询
db.collection('hotels')
  .skip((pageNum - 1) * pageSize)
  .limit(pageSize)
  .get()
```

---

## 七、常见问题解决

### Q1: 云函数返回超时错误

**原因**: 数据库查询时间过长

**解决方案**:
1. 添加数据库索引
2. 优化查询条件（使用投影）
3. 增加云函数超时时间（最长900秒）

```javascript
// 在函数配置中增加超时时间
{
  "timeout": 60 // 秒
}
```

### Q2: 找不到集合中的数据

**原因**: 数据库初始化环境不正确

**解决方案**:
```javascript
// 确保环境 ID 正确
cloud.init({
  env: 'your-actual-env-id' // 替换为实际环境 ID
});
```

### Q3: 正则表达式搜索不工作

**原因**: 数据库版本不支持 RegExp

**解决方案**:
```javascript
// 改用字符串匹配
db.collection('hotels')
  .where({
    name: db.command.regex({
      pattern: keyword,
      options: 'i'
    })
  })
  .get()
```

### Q4: 性能下降明显

**原因**: 集合数据过多，缺少合适的索引

**解决方案**:
1. 检查是否有不必要的字段（删除）
2. 添加常用查询的索引
3. 考虑分表策略（按日期或其他维度）
4. 使用 CDN 缓存热点数据

---

## 八、产品上线检查清单

- [ ] 云函数已部署且测试通过
- [ ] 数据库集合已创建（hotels, inn_booking）
- [ ] 所有必要索引已创建
- [ ] 数据库安全规则已配置
- [ ] 示例数据已导入
- [ ] 前端配置正确（云函数名称等）
- [ ] 日志监控已设置
- [ ] 性能测试通过（搜索响应时间 < 500ms）
- [ ] 备份策略已制定
- [ ] 版本号已更新

---

## 九、联系和支持

- 腾讯云文档：https://cloud.tencent.com/document/product/876
- 小程序云开发：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 问题反馈：在腾讯云控制台创建工单

