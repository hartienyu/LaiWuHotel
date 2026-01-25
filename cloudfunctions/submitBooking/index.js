const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  // 🟢 接收 hotelName, roomName
  const { roomId, checkInDate, checkOutDate, roomPrice, hotelName, roomName } = event;
  console.log('收到预订请求:', { roomId, checkInDate, checkOutDate, hotelName, roomName });

  if (!roomId || !checkInDate || !checkOutDate) {
    return { code: -1, message: '参数缺失' };
  }

  try {
    const wxContext = cloud.getWXContext();
    const userId = wxContext.OPENID;

    // 库存检查逻辑...
    const debugQuery = await db.collection('room_inventory')
      .where({
        roomId: roomId,
        inventoryDate: checkInDate
      })
      .get();

    if (debugQuery.data.length === 0) {
        // ... (省略部分调试代码，保持原样)
        return { code: -1, message: '无法查询到库存记录' };
    }

    const record = debugQuery.data[0];
    if (record.currentStock <= 0) {
      return {
        code: -1,
        message: `房间在 ${checkInDate} 已售罄。`
      };
    }

    // 🟢 生成订单，写入 hotelName 和 roomName
    const bookingResult = await db.collection('inn_booking').add({
      data: {
        userId: userId,
        roomId,
        hotelName: hotelName || '未知酒店',
        roomName: roomName || '未知房型',
        checkInDate,
        checkOutDate,
        roomPrice: Number(roomPrice),
        createTime: db.serverDate(),
        status: 1
      }
    });

    // 扣库存
    await db.collection('room_inventory').where({
      roomId, 
      inventoryDate: checkInDate
    }).update({
      data: {
        currentStock: db.command.inc(-1)
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