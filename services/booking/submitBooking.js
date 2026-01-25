/**
 * 提交民宿预订
 * @param {String} roomId 房间 ID
 * @param {String} checkInDate 入住日期 (YYYY-MM-DD 格式)
 * @param {String} checkOutDate 离店日期 (YYYY-MM-DD 格式)
 * @param {Number} roomPrice 房间价格（分）
 * @param {String} hotelName 酒店名称
 * @param {String} roomName 房间名称
 * @returns {Promise} 预订结果
 */
export const submitBooking = (roomId, checkInDate, checkOutDate, roomPrice = 0, hotelName = '', roomName = '') => {
  return new Promise((resolve, reject) => {
    if (!roomId || !checkInDate || !checkOutDate) {
      return reject(new Error('参数缺失：roomId、checkInDate 和 checkOutDate 必填'));
    }

    // 本地校验：checkOut 必须晚于 checkIn
    const inDate = new Date(checkInDate);
    const outDate = new Date(checkOutDate);
    if (isNaN(inDate) || isNaN(outDate) || outDate <= inDate) {
      return reject(new Error('日期区间不合法：离店日期必须晚于入住日期'));
    }

    wx.cloud.callFunction({
      name: 'submitBooking',
      data: { roomId, checkInDate, checkOutDate, roomPrice, hotelName, roomName }, // 🟢 传递新参数
      success: (res) => {
        if (res && res.result) {
          resolve(res.result);
        } else {
          reject(new Error('云函数无返回结果'));
        }
      },
      fail: (err) => reject(err),
    });
  });
};

export const getRoomInventory = (roomId, startDate, endDate) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        code: 0,
        message: '成功',
        data: {
          roomId,
          inventoryList: [],
        },
      });
    }, 500);
  });
};