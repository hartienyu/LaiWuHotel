import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    tabs: [{
        key: -1,
        text: '全部订单'
      },
      {
        key: 1,
        text: '待确认'
      },
      {
        key: 2,
        text: '已确认'
      },
      {
        key: 3,
        text: '已取消'
      },
    ],
    curTab: -1,
    bookingList: [],
    listLoading: 0,
    pullDownRefreshing: false,
    emptyImg: 'https://tdesign.gtimg.com/miniprogram/template/retail/order/empty-order-list.png',
    backRefresh: false,
    status: -1,
  },

  // 调用自定义tabbar的init函数，使页面与tabbar激活状态保持一致
  onShow() {
    this.getTabBar().init();
    if (!this.data.backRefresh) return;
    this.onRefresh();
    this.setData({
      backRefresh: false
    });
  },

  onLoad() {
    this.init();
    // 确保页面有 id="wr-pull-down-refresh" 的组件，否则这里会报错
    this.pullDownRefresh = this.selectComponent('#wr-pull-down-refresh');
  },

  onPageScroll(e) {
    this.pullDownRefresh && this.pullDownRefresh.onPageScroll(e);
  },

  onPullDownRefresh_() {
    this.setData({
      pullDownRefreshing: true
    });
    this.getBookingList(this.data.curTab)
      .then(() => {
        this.setData({
          pullDownRefreshing: false
        });
      })
      .catch((err) => {
        this.setData({
          pullDownRefreshing: false
        });
        Promise.reject(err);
      });
  },

  init(status) {
    status = status !== undefined ? status : this.data.curTab;
    this.setData({
      status
    });
    this.getBookingList(status);
  },

  getBookingList(statusCode = -1) {
    this.setData({
      listLoading: 1
    });
    const db = wx.cloud.database();
    const userOpenId = wx.getStorageSync('userOpenId');

    if (!userOpenId) {
      console.error('用户ID未找到');
      this.setData({
        listLoading: 3
      });
      return Promise.reject(new Error('用户ID未找到'));
    }

    let query = db.collection('inn_booking').where({
      userId: userOpenId
    });

    // 按状态筛选
    if (statusCode !== -1) {
      query = query.where({
        status: statusCode
      });
    }

    return query
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()
      .then((res) => {
        const bookingList = (res.data || []).map((booking) => ({
          id: booking._id,
          orderNo: booking.bookingId,
          status: booking.status,
          statusDesc: booking.status === 1 ? '待确认' : booking.status === 2 ? '已确认' : '已取消',
          amount: booking.roomPrice || 0,
          totalAmount: booking.roomPrice || 0,
          createTime: booking.createdAt,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          nights: booking.nights || 1,
          roomName: booking.roomName || '民宿房间',
          guestName: booking.guestName || '游客',
          guestPhone: booking.guestPhone || '',
          goodsList: [{
            id: booking._id,
            thumb: booking.roomImage || '',
            title: `${booking.roomName || '民宿房间'} (${booking.nights || 1}晚)`,
            specs: [`入住: ${booking.checkInDate}`, `离店: ${booking.checkOutDate}`],
            price: booking.roomPrice || 0,
            num: 1,
          }, ],
          buttons: [],
        }));

        this.setData({
          bookingList,
          listLoading: bookingList.length > 0 ? 0 : 2,
          curTab: statusCode,
        });
      })
      .catch((err) => {
        console.error('获取预订列表失败:', err);
        this.setData({
          listLoading: 3
        });
      });
  },

  onReTryLoad() {
    this.getBookingList(this.data.curTab);
  },

  onTabChange(e) {
    const {
      value
    } = e.detail;
    this.setData({
      status: value
    });
    this.getBookingList(value);
  },

  onRefresh() {
    this.getBookingList(this.data.curTab);
  },

  onOrderCardTap(e) {
    const {
      order
    } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/order/order-detail/index?orderNo=${order.orderNo}`,
    });
  },

  // 这是一个通用的跳转首页方法，通常用于空列表时的“去逛逛”按钮
  onGotoHome() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },
});