Page({
  data: {
    tabs: [
      { key: -1, text: '全部' },
      { key: 1, text: '待确认' },
      { key: 2, text: '已确认' },
      { key: 3, text: '已取消' }
    ],
    curTab: -1,
    
    bookingList: [],
    listLoading: 0, // 0:完成, 1:加载中, 2:为空, 3:失败
    pullDownRefreshing: false,
    emptyImg: 'https://tdesign.gtimg.com/miniprogram/template/retail/order/empty-order-list.png',
  },

  onShow() {
    this.getTabBar().init();
    this.init();
  },

  onLoad() {
    this.init();
  },

  init() {
    this.getBookingList(this.data.curTab);
  },

  onTabChange(e) {
    const nextTab = e.detail.value;
    this.setData({ curTab: nextTab });
    this.getBookingList(nextTab);
  },

  onPullDownRefresh() {
    this.setData({ pullDownRefreshing: true });
    this.getBookingList(this.data.curTab)
      .then(() => {
        this.setData({ pullDownRefreshing: false });
        wx.stopPullDownRefresh();
      })
      .catch(() => {
        this.setData({ pullDownRefreshing: false });
        wx.stopPullDownRefresh();
      });
  },

  // 🟢 核心修改：支持关联查询图片
  async getBookingList(status = -1) {
    this.setData({ listLoading: 1 });
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 1. 获取用户信息
    let userOpenId = wx.getStorageSync('userOpenId');
    if (!userOpenId) {
       const userInfo = wx.getStorageSync('userInfo');
       if (userInfo && userInfo._openid) userOpenId = userInfo._openid;
    }

    // 2. 构建订单查询
    let query = db.collection('inn_booking');
    
    if (userOpenId) {
      query = query.where({ userId: userOpenId });
    }
    if (status !== -1) {
      query = query.where({ status: status });
    }

    try {
      // 3. 执行主查询（查订单）
      const res = await query.orderBy('createTime', 'desc').limit(20).get();
      const rawBookings = res.data || [];

      // 4. 🟢 提取所有 roomId，准备去 hotels 表查图片
      const roomIds = rawBookings.map(b => b.roomId).filter(id => id);
      const uniqueRoomIds = [...new Set(roomIds)]; // 去重
      const roomImageMap = {};

      if (uniqueRoomIds.length > 0) {
        try {
          // 查 hotels 表，找到包含这些 roomId 的酒店
          // 这里的逻辑是：查找 roomList.id 在我们列表里的酒店
          const hotelRes = await db.collection('hotels')
            .where({
              'roomList.id': _.in(uniqueRoomIds)
            })
            .field({
              'roomList.id': true,
              'roomList.roomImages': true
            })
            .get();

          // 建立映射关系: roomId -> imageUrl
          (hotelRes.data || []).forEach(hotel => {
            if (hotel.roomList) {
              hotel.roomList.forEach(room => {
                // 如果这个房间是我们需要的，且它有图片
                if (uniqueRoomIds.includes(room.id) && room.roomImages && room.roomImages.length > 0) {
                  roomImageMap[room.id] = room.roomImages[0];
                }
              });
            }
          });
        } catch (imgErr) {
          console.error('图片加载失败，将使用默认图:', imgErr);
        }
      }

      // 5. 数据组装
      const bookingList = rawBookings.map((booking) => {
        const statusMap = { 1: '待确认', 2: '已确认', 3: '已取消' };
        
        // 时间格式化
        let createTimeStr = '';
        if (booking.createTime) {
           const date = new Date(booking.createTime);
           const pad = n => n < 10 ? '0'+n : n;
           createTimeStr = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        }

        // 🟢 优先使用查到的图片，没有则用默认图
        const thumbUrl = roomImageMap[booking.roomId] 
          || booking.roomImage 
          || 'https://tdesign.gtimg.com/miniprogram/template/hotel.png';

        return {
          id: booking._id,
          orderNo: booking._id,
          status: booking.status,
          statusDesc: statusMap[booking.status] || '处理中',
          amount: booking.roomPrice || 0,
          
          thumb: thumbUrl, // 使用关联查询到的图片
          hotelName: booking.hotelName || '民宿',
          roomName: booking.roomName || '标准间',
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          createTimeStr: createTimeStr
        };
      });

      this.setData({
        bookingList,
        listLoading: bookingList.length > 0 ? 0 : 2,
      });

    } catch (err) {
      console.error('订单加载失败', err);
      this.setData({ listLoading: 3 });
    }
  },

  onReTryLoad() {
    this.getBookingList(this.data.curTab);
  },

  onOrderCardTap(e) {
    const { order } = e.currentTarget.dataset;
    wx.showModal({
      title: '订单详情',
      content: `酒店：${order.hotelName}\n房型：${order.roomName}\n价格：¥${order.amount/100}\n状态：${order.statusDesc}`,
      showCancel: false
    });
  },
});