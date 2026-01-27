# 首页日期选择立即体现在预订界面的修复验证

## 修复内容概述

用户反馈的问题：**首页选择日期后，预订界面仍需再次手动选择日期，首页的选择被忽略**

根本原因：预订弹窗打开时，使用了硬编码的默认日期（today/tomorrow），覆盖了从首页传入的日期。

## 完整修复流程

### 1️⃣ 第一层：首页日期传递（pages/home/home.js）

**修改内容**：`onBookingTap()` 方法

```javascript
onBookingTap() {
  const query = this.data.searchKeyword || '';
  const { rawStartDate, rawEndDate } = this.data;  // 获取用户选择的日期
  // 确保日期参数正确传递（日期格式本身不需要编码，但为了安全性可以编码）
  wx.navigateTo({
    url: `/pages/search/search?q=${encodeURIComponent(query)}&checkInDate=${rawStartDate}&checkOutDate=${rawEndDate}`
  });
}
```

**作用**：
- 从首页的 `data` 中读取 `rawStartDate` 和 `rawEndDate`（YYYY-MM-DD 格式）
- 通过 URL 查询参数传递给搜索页面
- 示例 URL: `/pages/search/search?q=&checkInDate=2026-01-25&checkOutDate=2026-01-27`

### 2️⃣ 第二层：搜索页面接收日期（pages/search/search.js - onLoad）

**修改内容**：`onLoad(options)` 方法

```javascript
onLoad(options) {
  this.initDateLimits();

  // 🟢 从首页获取日期参数
  let checkInDate = options?.checkInDate;
  let checkOutDate = options?.checkOutDate;
  
  console.log('🔍 onLoad 接收参数:', { checkInDate, checkOutDate });
  
  if (checkInDate && checkOutDate) {
    console.log('✅ 使用首页传入的日期:', { checkInDate, checkOutDate });
    this.setData({ selectedCheckInDate: checkInDate, selectedCheckOutDate: checkOutDate });
  } else {
    // 如果没有参数，使用默认日期
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const defaultCheckIn = format(today);
    const defaultCheckOut = format(tomorrow);
    console.log('⚠️ 使用默认日期:', { defaultCheckIn, defaultCheckOut });
    this.setData({
      selectedCheckInDate: defaultCheckIn,
      selectedCheckOutDate: defaultCheckOut
    });
  }
  
  // ... 搜索逻辑继续
}
```

**作用**：
- 从 URL 参数中读取 `checkInDate` 和 `checkOutDate`
- 如果参数存在，直接设置到 `data.selectedCheckInDate` 和 `data.selectedCheckOutDate`
- 如果参数不存在（直接访问搜索页），使用默认日期
- 包含调试日志，用于验证日期是否正确传入

### 3️⃣ 第三层：预订弹窗保持日期不变（pages/search/search.js - openBookingPopup）

**修改内容**：`openBookingPopup(e)` 方法

```javascript
openBookingPopup(e) {
  console.log('👉 点击预订，dataset:', e.currentTarget.dataset);

  // 🟢 获取房间信息
  const { roomid, roomname, roomprice, hotelname } = e.currentTarget.dataset;
  
  if (!roomid) {
    wx.showToast({ title: '数据错误: 缺少房间ID', icon: 'none' });
    return;
  }

  // 🟢 使用已有的日期，而不是重新生成默认日期
  // 这些日期已经在 onLoad() 中从首页传入或设置为默认值
  const { selectedCheckInDate, selectedCheckOutDate } = this.data;
  
  console.log('📅 打开预订弹窗，当前日期:', { selectedCheckInDate, selectedCheckOutDate });

  this.setData({
    showBookingPopup: true,
    selectedRoomId: roomid,
    selectedRoomName: roomname,
    selectedHotelName: hotelname || '未知酒店',
    selectedRoomPrice: Number(roomprice),
    // 注意：selectedCheckInDate 和 selectedCheckOutDate 保持不变，不重新赋值
  });
}
```

**关键改进**：
- ❌ **删除**了这些代码（以前的问题所在）：
  ```javascript
  const today = new Date();
  const defaultCheckIn = format(today);
  const defaultCheckOut = format(tomorrow);
  selectedCheckInDate: defaultCheckIn,        // ❌ 覆盖了首页的日期
  selectedCheckOutDate: defaultCheckOut,      // ❌ 覆盖了首页的日期
  ```
- ✅ **保留**了 `setData()` 中不设置日期字段，让日期保持不变
- 添加了调试日志，确认打开弹窗时日期是否正确

## 数据流可视化

```
首页 (pages/home/home.js)
├─ 用户选择: 2026-01-25 ~ 2026-01-27
├─ data 中存储为: rawStartDate="2026-01-25", rawEndDate="2026-01-27"
└─ 点击"预订"按钮
   │
   ▼
搜索页面加载 (pages/search/search.js - onLoad)
├─ URL 参数: checkInDate=2026-01-25&checkOutDate=2026-01-27
├─ onLoad() 读取参数
├─ setData({ selectedCheckInDate: "2026-01-25", selectedCheckOutDate: "2026-01-27" })
└─ 日期已保存在 data 中
   │
   ▼
用户点击房间预订按钮
└─ openBookingPopup() 
   ├─ 从 data 读取日期：selectedCheckInDate="2026-01-25", selectedCheckOutDate="2026-01-27"
   ├─ setData() 中不改变日期字段 ⭐️ 关键步骤
   └─ 预订弹窗打开，显示选定的日期
      │
      ▼
预订弹窗 (search.wxml)
├─ 日期选择器绑定到 selectedCheckInDate 和 selectedCheckOutDate
├─ 显示: "入住: 2026-01-25" "离店: 2026-01-27"
└─ 用户可选择编辑日期，或直接点击"确认预订"
```

## 测试验证步骤

### 场景 A：首页选择日期 → 搜索页面 → 预订

1. **进入首页**
   - 打开小程序首页

2. **选择日期**
   - 点击日期区域
   - 在日历组件中选择：入住 2026-01-25，离店 2026-01-27
   - 确认选择（关闭日历）
   - 观察首页显示："1月25日 ~ 1月27日"

3. **进入搜索页面**
   - 点击"预订"按钮（或在搜索框输入关键词后点击预订）
   - **观察控制台日志**（微信开发者工具）：
     ```
     🔍 onLoad 接收参数: { checkInDate: "2026-01-25", checkOutDate: "2026-01-27" }
     ✅ 使用首页传入的日期: { checkInDate: "2026-01-25", checkOutDate: "2026-01-27" }
     ```

4. **点击房间预订**
   - 点击搜索结果中某个房间的"预订"按钮
   - **预期结果**：
     - 预订弹窗打开
     - 日期选择器显示："入住: 2026-01-25" "离店: 2026-01-27"
     - **不是**"入住: 今天" "离店: 明天"
   - **观察控制台日志**：
     ```
     📅 打开预订弹窗，当前日期: { selectedCheckInDate: "2026-01-25", selectedCheckOutDate: "2026-01-27" }
     ```

5. **确认预订**
   - 直接点击"确认预订"（无需修改日期）
   - 预订应该使用首页选择的日期进行处理

### 场景 B：不选择日期 → 搜索页面 → 预订

1. **进入首页**
   - 保持默认日期（不修改）

2. **进入搜索页面**
   - 点击"预订"按钮
   - **观察控制台日志**：
     ```
     🔍 onLoad 接收参数: { checkInDate: undefined, checkOutDate: undefined }
     ⚠️ 使用默认日期: { defaultCheckIn: "2026-01-27", defaultCheckOut: "2026-01-28" }
     ```

3. **点击房间预订**
   - 预订弹窗显示默认日期（今天和明天）
   - 这是预期行为

### 场景 C：修改预订日期

1. **从首页选择：2026-01-25 ~ 2026-01-27**
2. **在搜索页进行房间预订**
3. **预订弹窗打开，显示 2026-01-25 ~ 2026-01-27**
4. **用户在弹窗中修改日期**：改为 2026-01-25 ~ 2026-01-28
5. **点击确认预订**
6. **预期**：订单使用修改后的日期 (2026-01-25 ~ 2026-01-28)

## 修改文件清单

| 文件 | 修改方法 | 改进点 |
|------|--------|-------|
| `pages/home/home.js` | `onBookingTap()` | 传递 URL 参数 |
| `pages/search/search.js` | `onLoad(options)` | 接收并设置日期参数 |
| `pages/search/search.js` | `openBookingPopup(e)` | **关键修复**：不覆盖日期 |

## 代码差异总结

### Before（问题代码）
```javascript
openBookingPopup(e) {
  // ... 获取房间信息 ...
  
  const today = new Date();
  const defaultCheckIn = format(today);                    // ❌ 硬编码
  const defaultCheckOut = format(tomorrow);                // ❌ 硬编码
  
  this.setData({
    showBookingPopup: true,
    selectedCheckInDate: defaultCheckIn,                   // ❌ 覆盖首页日期
    selectedCheckOutDate: defaultCheckOut,                 // ❌ 覆盖首页日期
  });
}
```

### After（修复代码）
```javascript
openBookingPopup(e) {
  // ... 获取房间信息 ...
  
  const { selectedCheckInDate, selectedCheckOutDate } = this.data;  // ✅ 使用已有值
  
  this.setData({
    showBookingPopup: true,
    selectedRoomId: roomid,
    selectedRoomName: roomname,
    selectedHotelName: hotelname || '未知酒店',
    selectedRoomPrice: Number(roomprice),
    // ✅ 不设置日期字段，保持原有值
  });
}
```

## 已知限制与注意

1. **日期格式**：必须是 `YYYY-MM-DD` 格式，与 picker 组件兼容
2. **URL 长度**：如果搜索关键词过长，需要注意 URL 最大长度限制
3. **多次导航**：如果用户从搜索页返回首页再进入搜索页，会重新刷新日期（这是正确行为）

## 后续优化建议

1. **添加事件追踪**：记录用户选择的日期和最终预订的日期，用于分析
2. **日期验证**：在 submitBooking 前验证日期是否仍然有效
3. **时区处理**：考虑统一使用 UTC 时区，避免时区相关的 bug
