const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { roomId, checkInDate, checkOutDate, roomPrice, hotelName, roomName } = event;
  
  console.log('收到预订请求:', { roomId, checkInDate, checkOutDate, hotelName, roomName });

  if (!roomId || !checkInDate || !checkOutDate) {
    return { code: -1, message: '参数缺失' };
  }

  try {
    const wxContext = cloud.getWXContext();
    const userId = wxContext.OPENID;

    // ====================================================
    // 1. 计算预订日期范围内的所有日期
    // ====================================================
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    const bookingDates = [];
    const currentDate = new Date(inDate);
    
    // 生成 checkInDate 到 checkOutDate 之间的所有日期
    while (currentDate < outDate) {
      const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
      const dateStr = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())}`;
      bookingDates.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('📅 预订日期范围:', { checkInDate, checkOutDate, bookingDates, totalDays: bookingDates.length });

    // ====================================================
    // 2. 对每一天的库存进行检查与扣除
    // ====================================================
    for (const inventoryDate of bookingDates) {
      const inventoryQuery = await db.collection('room_inventory')
        .where({
          roomId: roomId,
          inventoryDate: inventoryDate
        })
        .get();

      if (inventoryQuery.data.length > 0) {
        // 🅰️ [情况 A]: 该天有记录 -> 检查剩余库存
        const stockRecord = inventoryQuery.data[0];
        
        if (stockRecord.currentStock <= 0) {
          return { code: -1, message: `很抱歉，${inventoryDate} 当天已满房` };
        }
        
        // 扣减 1 间
        await db.collection('room_inventory').doc(stockRecord._id).update({
          data: { currentStock: _.inc(-1) }
        });
        console.log(`✅ ${inventoryDate} 库存已扣减`);
        
      } else {
        // 🅱️ [情况 B]: 该天无记录 -> 自动初始化
        console.warn(`未找到 [${inventoryDate}] 库存记录，正在自动初始化...`);
        
        // 设置默认值
        let finalTotalStock = 10;
        let finalHotelName = hotelName || '未知酒店';
        let finalRoomName = roomName || '未知房型';
        let finalHotelId = roomId.includes('-') ? roomId.split('-')[0] : roomId;

        // 查询该房间的历史配置
        const refQuery = await db.collection('room_inventory')
          .where({ roomId: roomId })
          .limit(1)
          .get();

        if (refQuery.data.length > 0) {
           const refRecord = refQuery.data[0];
           if (refRecord.totalStock) finalTotalStock = refRecord.totalStock;
           if (refRecord.hotelId) finalHotelId = refRecord.hotelId;
           if (refRecord.hotelName) finalHotelName = refRecord.hotelName;
           if (refRecord.roomName) finalRoomName = refRecord.roomName;
           console.log('✅ 沿用历史配置:', { totalStock: finalTotalStock });
        }
        
        // 创建该天的库存记录
        await db.collection('room_inventory').add({
          data: {
            roomId: roomId,
            inventoryDate: inventoryDate,
            currentStock: finalTotalStock - 1, // 扣掉本次
            totalStock: finalTotalStock,
            hotelId: finalHotelId,
            hotelName: finalHotelName,
            roomName: finalRoomName,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        });
        console.log(`✅ ${inventoryDate} 库存记录已创建并扣减`);
      }
    }

    // ====================================================
    // 3. 创建订单
    // ====================================================
    const bookingResult = await db.collection('inn_booking').add({
      data: {
        _openid: userId, // 显式写入，解决权限问题
        userId: userId,
        roomId,
        hotelName: hotelName || '民宿',
        roomName: roomName || '标准间',
        checkInDate,
        checkOutDate,
        stayDays: bookingDates.length, // 🟢 新增：入住天数
        roomPrice: Number(roomPrice || 0),
        createTime: db.serverDate(),
        status: 1
      }
    });

    return {
      code: 0,
      message: '预订成功',
      data: { orderId: bookingResult._id }
    };

  } catch (err) {
    console.error('云函数报错:', err);
    return {
      code: -1,
      message: '系统错误: ' + err.message
    };
  }
};
