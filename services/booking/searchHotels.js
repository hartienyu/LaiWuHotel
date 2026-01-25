/**
 * 酒店搜索服务 - 统一的酒店搜索接口
 * 该文件封装了酒店搜索的业务逻辑，支持：
 * 1. 按酒店名称、城市、地区模糊搜索
 * 2. 搜索不到时的兜底逻辑（返回所有酒店）
 * 3. 数据格式化和扩展
 * 4. 支持云函数和本地数据库两种查询方式
 */

/**
 * 搜索酒店 - 本地数据库方式（直连）
 * @param {String} keyword - 搜索关键词（可选，为空时返回所有）
 * @returns {Promise<Object>} 返回酒店数据数组
 */
async function searchHotelsLocal(keyword = '') {
  const db = wx.cloud.database();
  let res;
  let isFallback = false;

  try {
    const q = (keyword || '').trim();

    // 如果有搜索词，先精准搜索
    if (q) {
      const regex = db.RegExp({ regexp: q, options: 'i' });
      res = await db.collection('hotels').where({
        $or: [
          { name: regex },
          { city: regex },
          { region: regex },
        ],
      }).get();

      // 如果没有搜索结果，触发兜底逻辑：返回所有酒店
      if (!res.data || res.data.length === 0) {
        isFallback = true;
        res = await db.collection('hotels').get();
      }
    } else {
      // 如果没有搜索词，直接返回所有酒店
      res = await db.collection('hotels').get();
    }

    // 数据格式化
    const list = res.data || [];
    const formattedList = list.map((hotel) => {
      const roomList = (hotel.roomList || []).map((room, idx) => ({
        ...room,
        id: room.id || `${hotel._id}_${idx}`,
      }));

      return {
        ...hotel,
        roomList,
        score: hotel.score || '4.8',
      };
    });

    return {
      success: true,
      data: formattedList,
      isFallback, // 标记是否触发了兜底逻辑
      total: formattedList.length,
    };
  } catch (err) {
    console.error('酒店搜索出错:', err);
    return {
      success: false,
      error: err.message || '搜索失败',
      data: [],
    };
  }
}

/**
 * 搜索酒店 - 云函数方式（推荐用于生产环境）
 * @param {String} keyword - 搜索关键词
 * @param {Number} pageNum - 页码（默认1）
 * @param {Number} pageSize - 每页数量（默认10）
 * @param {String} sortBy - 排序方式（hot/score/price）
 * @returns {Promise<Object>} 返回搜索结果
 */
async function searchHotelsWithCloudFunction(keyword = '', pageNum = 1, pageSize = 10, sortBy = 'hot') {
  try {
    const res = await wx.cloud.callFunction({
      name: 'searchHotels',
      data: {
        keyword: (keyword || '').trim(),
        pageNum,
        pageSize,
        sortBy,
      },
    });

    if (res.result && res.result.code === 0) {
      return {
        success: true,
        data: res.result.data.list || [],
        isFallback: false,
        total: res.result.data.total || 0,
        pages: res.result.data.pages || 0,
      };
    } else {
      console.error('云函数返回错误:', res.result);
      return {
        success: false,
        error: res.result?.message || '搜索失败',
        data: [],
      };
    }
  } catch (err) {
    console.error('调用搜索云函数出错:', err);
    return {
      success: false,
      error: err.message || '搜索失败',
      data: [],
    };
  }
}

/**
 * 搜索酒店（统一接口，自动选择查询方式）
 * @param {String} keyword - 搜索关键词（可选，为空时返回所有）
 * @param {Object} options - 可选参数
 * @param {Number} options.pageNum - 页码（仅云函数模式使用）
 * @param {Number} options.pageSize - 每页数量（仅云函数模式使用）
 * @param {String} options.sortBy - 排序方式（仅云函数模式使用）
 * @param {Boolean} options.useCloudFunction - 是否使用云函数（默认 false）
 * @returns {Promise<Object>} 返回酒店数据对象
 */
export async function searchHotels(keyword = '', options = {}) {
  const {
    pageNum = 1,
    pageSize = 10,
    sortBy = 'hot',
    useCloudFunction = false, // 根据需要设置为 true
  } = options;

  if (useCloudFunction) {
    // 使用云函数方式（生产环境推荐）
    return searchHotelsWithCloudFunction(keyword, pageNum, pageSize, sortBy);
  } else {
    // 使用本地数据库方式（开发测试推荐）
    return searchHotelsLocal(keyword);
  }
}

/**
 * 获取酒店详情
 * @param {String} hotelId - 酒店ID
 * @returns {Promise<Object>} 返回酒店详情
 */
export async function getHotelDetail(hotelId) {
  const db = wx.cloud.database();

  try {
    const res = await db.collection('hotels').doc(hotelId).get();
    if (res.data) {
      return {
        success: true,
        data: res.data,
      };
    }
    return {
      success: false,
      error: '酒店不存在',
    };
  } catch (err) {
    console.error('获取酒店详情出错:', err);
    return {
      success: false,
      error: err.message || '获取详情失败',
    };
  }
}

/**
 * 获取房间库存（某日期范围内）
 * @param {String} roomId - 房间ID
 * @param {String} startDate - 开始日期 (YYYY-MM-DD)
 * @param {String} endDate - 结束日期 (YYYY-MM-DD)
 * @returns {Promise<Object>} 返回库存信息
 */
export async function getRoomInventory(roomId, startDate, endDate) {
  const db = wx.cloud.database();

  try {
    const res = await db.collection('inn_booking').where({
      roomId: roomId,
      checkInDate: db.command.lte(endDate),
      checkOutDate: db.command.gte(startDate),
      bookingStatus: db.command.ne('cancelled'), // 不包含已取消的预订
    }).get();

    return {
      success: true,
      data: {
        bookedDates: res.data || [],
        available: (res.data || []).length === 0,
      },
    };
  } catch (err) {
    console.error('获取房间库存出错:', err);
    return {
      success: false,
      error: err.message || '获取库存失败',
    };
  }
}
