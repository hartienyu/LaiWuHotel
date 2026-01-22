import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    // --- 顶部大图轮播配置 ---
    imgSrcs: [],
    current: 0,
    autoplay: true,
    duration: 500,
    interval: 5000,
    navigation: { type: 'dots' },
    swiperImageProps: { mode: 'aspectFill' },

    // --- 民宿业务核心数据 ---
    cityName: '莱芜市',
    checkInDate: '',
    checkOutDate: '',
    stayDays: 1,

    // --- 客服弹窗相关数据 ---
    showMakePhone: false,
    showKefu: true,
    customerServiceInfo: {
      servicePhone: '188-8888-8888',
      serviceTimeDuration: '每日 9:00 - 21:00'
    },
    
    pageLoading: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
  },

  onLoad() {
    this.init();
    this.initDates();
  },

  onPullDownRefresh() {
    this.init();
  },

  init() {
    this.loadHomePage();
  },

  initDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const format = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
    
    this.setData({
      checkInDate: format(today),
      checkOutDate: format(tomorrow),
      stayDays: 1
    });
  },

  loadHomePage() {
    wx.stopPullDownRefresh();
    this.setData({ pageLoading: true });
    this.setData({
      imgSrcs: [
        'https://i.ibb.co/RTTdkP4q/1.jpg',
        'https://i.ibb.co/8Dd5Nq6Y/2.jpg',
        'https://i.ibb.co/mCCqyJWc/3.png',
        'https://i.ibb.co/FqqSZpzX/4.jpg',
        'https://i.ibb.co/ZRGW2GWW/5.png'
      ],
      pageLoading: false,
    });
  },

  // --- 交互事件 ---

  onDateSelect() {
    Toast({ context: this, selector: '#t-toast', message: '打开日历选择器' });
  },

  onBookingTap() {
    Toast({ context: this, selector: '#t-toast', message: '正在查询房源...' });
  },

  onMemberTap() {
    Toast({ context: this, selector: '#t-toast', message: '查看会员权益' });
  },

  onCouponTap() {
    wx.navigateTo({ url: '/pages/coupon/coupon-list/index' });
  },

  navToSearchPage() {
    wx.navigateTo({ url: '/pages/goods/search/index' });
  },

  // --- 客服方法 ---
  openMakePhone() {
    this.setData({ showMakePhone: true });
  },

  closeMakePhone() {
    this.setData({ showMakePhone: false });
  },

  call() {
    wx.makePhoneCall({
      phoneNumber: this.data.customerServiceInfo.servicePhone,
    });
  },

  navToActivityDetail({ detail }) {
    const { index: promotionID = 0 } = detail || {};
    wx.navigateTo({
      url: `/pages/promotion/promotion-detail/index?promotion_id=${promotionID}`,
    });
  },
});