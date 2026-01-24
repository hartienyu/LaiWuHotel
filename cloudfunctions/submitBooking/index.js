const cloud = require('wx-server-sdk');

cloud.init();

const db = cloud.database();

exports.main = async (event) => {
  const { roomId, checkInDate, checkOutDate, roomPrice } = event;

  // 参数校验
  if (!roomId || !checkInDate || !checkOutDate) {
    return {
      code: -1,
      message: '参数缺失',
    };
  }

  try {
    // 获取调用者的身份信息
    const wxContext = cloud.getWXContext();
    const userId = wxContext.OPENID;

    // 校验日期格式和逻辑
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
      return {
        code: -1,
        message: '日期格式无效',
      };
    }

    if (outDate <= inDate) {
      return {
        code: -1,
        message: '离店日期必须晚于入住日期',
      };
    }

    // 计算住宿晚数
    const nights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));

    // 生成预订ID
    const bookingId = `BK${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // 检查房间库存是否足够
    const inventoryCheck = await db
      .collection('room_inventory')
      .where({
        roomId,
        date: db.command.gte(checkInDate).and(db.command.lt(checkOutDate)),
        inventory: db.command.gt(0),
      })
      .count();

    if (inventoryCheck.total < nights) {
      return {
        code: -1,
        message: '所选日期房间库存不足',
      };
    }

    // 开始事务：插入预订记录 + 扣减库存
    const _ = db.command;
    
    // 插入预订记录到 inn_booking
    const bookingResult = await db.collection('inn_booking').add({
      data: {
        bookingId,
        roomId,
        userId,
        checkInDate,
        checkOutDate,
        nights,
        status: 1, // 1=待确认, 2=已确认, 3=已取消
        roomPrice: roomPrice || 0, // 使用前端传来的价格
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 扣减房间库存（每个日期扣1）
    const dateArray = [];
    let currentDate = new Date(checkInDate);
    while (currentDate < new Date(checkOutDate)) {
      const dateStr = currentDate.getFullYear() + '-' +
        String(currentDate.getMonth() + 1).padStart(2, '0') + '-' +
        String(currentDate.getDate()).padStart(2, '0');
      dateArray.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 批量更新库存（扣减）
    for (const date of dateArray) {
      await db
        .collection('room_inventory')
        .where({
          roomId,
          date,
        })
        .update({
          data: {
            inventory: _.inc(-1),
            updatedAt: new Date(),
          },
        });
    }

    return {
      code: 0,
      message: '预订成功',
      data: {
        bookingId,
        orderId: bookingResult._id,
      },
    };
  } catch (err) {
    console.error('云函数错误:', err);
    return {
      code: -1,
      message: err.message || '预订失败',
    };
  }
};
