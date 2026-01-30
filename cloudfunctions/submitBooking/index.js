const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_TYPE_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { roomId, checkInDate, checkOutDate, roomPrice, hotelName, roomName } = event;
  if (!roomId || !checkInDate || !checkOutDate) return { code: -1, message: '参数缺失' };

  // 1. 生成日期数组
  const bookingDates = [];
  let curr = new Date(checkInDate);
  const out = new Date(checkOutDate);
  while (curr < out) {
    bookingDates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  const transaction = await db.startTransaction(); // 开启事务

  try {
    // 2. 一次性查询该房间在这些日期的所有库存记录
    const { data: existingRecords } = await transaction.collection('room_inventory')
      .where({
        roomId: roomId,
        inventoryDate: _.in(bookingDates)
      }).get();

    // 将查询结果转为 Map 方便快速查找
    const recordMap = new Map(existingRecords.map(r => [r.inventoryDate, r]));

    // 3. 准备执行逻辑
    for (const dateStr of bookingDates) {
      const stockRecord = recordMap.get(dateStr);

      if (stockRecord) {
        // 情况 A: 已有记录 -> 校验并扣减
        if (stockRecord.currentStock <= 0) {
          await transaction.rollback();
          return { code: -1, message: `${dateStr} 已满房` };
        }
        await transaction.collection('room_inventory').doc(stockRecord._id).update({
          data: { currentStock: _.inc(-1), updateTime: db.serverDate() }
        });
      } else {
        // 情况 B: 无记录 -> 初始化 (此处建议默认值根据业务调整)
        await transaction.collection('room_inventory').add({
          data: {
            roomId,
            inventoryDate: dateStr,
            currentStock: 9, // 假设默认10间，扣除1间后剩9
            totalStock: 10,
            hotelName: hotelName || '酒店',
            roomName: roomName || '房型',
            createTime: db.serverDate()
          }
        });
      }
    }

    // 4. 创建订单
    const { OPENID } = cloud.getWXContext();
    const orderRes = await transaction.collection('inn_booking').add({
      data: {
        _openid: OPENID,
        roomId,
        checkInDate,
        checkOutDate,
        stayDays: bookingDates.length,
        roomPrice: Number(roomPrice),
        status: 1,
        createTime: db.serverDate()
      }
    });

    await transaction.commit(); // 提交事务
    return { code: 0, message: '预订成功', data: { orderId: orderRes._id } };

  } catch (err) {
    await transaction.rollback(); // 发生错误全部回滚
    console.error('事务失败:', err);
    return { code: -1, message: '订房失败，请重试' };
  }
};