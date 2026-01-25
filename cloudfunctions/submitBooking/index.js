const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event) => {
  const { roomId, checkInDate, checkOutDate, roomPrice } = event;
  console.log('收到预订请求:', { roomId, checkInDate, checkOutDate });

  // 参数校验
  if (!roomId || !checkInDate || !checkOutDate) {
    return { code: -1, message: '参数缺失' };
  }

  try {
    // 获取调用者的身份信息
    const wxContext = cloud.getWXContext();
    const userId = wxContext.OPENID;
    const debugQuery = await db.collection('room_inventory')
      .where({
        roomId: roomId,
        inventoryDate: checkInDate
      })
      .get();

    if (debugQuery.data.length === 0) {
      const idCheck = await db.collection('room_inventory').where({ roomId }).count();
      
      let debugMsg = '';
      if (idCheck.total === 0) {
        debugMsg = `数据库里根本没有 ID 为 [${roomId}] 的房间记录！请检查 room_inventory 表里的 roomId 字段。`;
      } else {
        debugMsg = `ID [${roomId}] 对了，但日期 [${checkInDate}] 没查到记录。请检查 inventoryDate 字段格式是否为 "YYYY-MM-DD"。`;
      }

      console.error('库存查询失败:', debugMsg);
      return {
        code: -1,
        message: '调试失败: ' + debugMsg
      };
    }

    const record = debugQuery.data[0];
    if (record.currentStock <= 0) {
      return {
        code: -1,
        message: `调试失败: 房间 [${roomId}] 在 [${checkInDate}] 的库存为 0，无法预订。`
      };
    }

    // 生成订单
    const bookingResult = await db.collection('inn_booking').add({
      data: {
        roomId,
        checkInDate,
        checkOutDate,
        roomPrice,
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