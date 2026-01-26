const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { roomId, checkInDate, checkOutDate, roomPrice, hotelName, roomName } = event;
  
  console.log('收到预订请求:', { roomId, checkInDate, hotelName, roomName });

  if (!roomId || !checkInDate || !checkOutDate) {
    return { code: -1, message: '参数缺失' };
  }

  try {
    const wxContext = cloud.getWXContext();
    const userId = wxContext.OPENID;

    // ====================================================
    // 1. 库存查询与智能初始化
    // ====================================================
    const inventoryQuery = await db.collection('room_inventory')
      .where({
        roomId: roomId,
        inventoryDate: checkInDate
      })
      .get();

    if (inventoryQuery.data.length > 0) {
      // 🅰️ [情况 A]: 当天有记录 -> 检查剩余库存
      const stockRecord = inventoryQuery.data[0];
      
      if (stockRecord.currentStock <= 0) {
        return { code: -1, message: `很抱歉，${checkInDate} 当天已满房` };
      }
      
      // 扣减 1 间
      await db.collection('room_inventory').doc(stockRecord._id).update({
        data: { currentStock: _.inc(-1) }
      });
      
    } else {
      // 🅱️ [情况 B]: 当天无记录 -> 自动初始化 (补全完整字段)
      console.warn(`未找到 [${checkInDate}] 库存记录，正在自动补全完整信息...`);
      
      // 1. 设置默认值 (兜底)
      let finalTotalStock = 10;
      let finalHotelName = hotelName || '未知酒店';
      let finalRoomName = roomName || '未知房型';
      // 尝试从 roomId (如 hotel_1-room_2) 解析 hotelId
      let finalHotelId = roomId.includes('-') ? roomId.split('-')[0] : roomId;

      // 2. 尝试查询该房间的“历史配置” (为了保持数据一致性)
      const refQuery = await db.collection('room_inventory')
        .where({ roomId: roomId })
        .limit(1) // 只要查到任意一条历史记录即可
        .get();

      if (refQuery.data.length > 0) {
         const refRecord = refQuery.data[0];
         // 如果历史记录里有这些字段，优先沿用，保证一致性
         if (refRecord.totalStock) finalTotalStock = refRecord.totalStock;
         if (refRecord.hotelId) finalHotelId = refRecord.hotelId;
         if (refRecord.hotelName) finalHotelName = refRecord.hotelName;
         if (refRecord.roomName) finalRoomName = refRecord.roomName;
         
         console.log('✅ 成功沿用历史配置:', { totalStock: finalTotalStock, hotelName: finalHotelName });
      } else {
         console.log('⚠️ 无历史记录，使用传入参数或默认值初始化');
      }
      
      // 3. 创建完整的库存记录
      await db.collection('room_inventory').add({
        data: {
          roomId: roomId,
          inventoryDate: checkInDate,
          currentStock: finalTotalStock - 1, // 扣掉本次
          totalStock: finalTotalStock,
          
          // 🟢 补全缺失的字段，与您提供的完整参照一致
          hotelId: finalHotelId,
          hotelName: finalHotelName,
          roomName: finalRoomName,
          
          // 记录创建时间方便维护
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    }

    // ====================================================
    // 2. 创建订单
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