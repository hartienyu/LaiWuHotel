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
    checkInDate: '',  // 展示用：1月25日
    checkInWeek: '',  // 🟢 新增：周日
    checkOutDate: '', // 展示用：1月26日
    checkOutWeek: '', // 🟢 新增：周一
    stayDays: 1,      // 共X晚

    // 日历组件数据
    calendarVisible: false,
    minDate: new Date().getTime(),
    rawStartDate: '', // 组件用：YYYY-MM-DD
    rawEndDate: '',   // 组件用：YYYY-MM-DD

    // --- 其他数据 ---
    showMakePhone: false,
    showKefu: true,
    customerServiceInfo: {
      servicePhone: '188-8888-8888',
      serviceTimeDuration: '每日 9:00 - 21:00'
    },
    searchKeyword: '',
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

  // 初始化日期
  initDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // 直接传 Date 对象进去
    this.updateDateState(today, tomorrow);
  },

  // 🟢 核心修复：更新日期状态
  updateDateState(startInput, endInput) {
    // 1. 强制转为 Date 对象 (修复 .getTime is not a function 报错)
    // TDesign 日历返回的可能是时间戳，new Date() 可以兼容时间戳和字符串
    const startObj = new Date(startInput);
    const endObj = new Date(endInput);

    // 2. 星期映射表
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    // 3. 格式化展示用
    const formatShow = (d) => `${d.getMonth() + 1}月${d.getDate()}日`;
    
    // 4. 格式化组件用 (YYYY-MM-DD)
    const pad = (n) => n < 10 ? `0${n}` : n;
    const formatRaw = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    // 5. 计算天数
    const diff = endObj.getTime() - startObj.getTime();
    const days = Math.floor(diff / (24 * 3600 * 1000));

    this.setData({
      checkInDate: formatShow(startObj),
      checkOutDate: formatShow(endObj),
      // 🟢 新增星期计算
      checkInWeek: weeks[startObj.getDay()],
      checkOutWeek: weeks[endObj.getDay()],
      
      rawStartDate: formatRaw(startObj),
      rawEndDate: formatRaw(endObj),
      stayDays: days > 0 ? days : 1
    });
  },

  loadHomePage() {
    wx.stopPullDownRefresh();
    this.setData({
      imgSrcs: [
        'https://i.ibb.co/RTTdkP4q/1.jpg',
        'https://i.ibb.co/8Dd5Nq6Y/2.jpg',
        'https://i.ibb.co/mCCqyJWc/3.png',
        'https://i.ibb.co/FqqSZpzX/4.jpg',
        'https://i.ibb.co/ZRGW2GWW/5.png'
      ],
    });
  },

  // 交互事件
  onDateSelect() {
    this.setData({ calendarVisible: true });
  },

  onCalendarConfirm(e) {
    const { value } = e.detail; 
    // TDesign 这里返回的 value 通常是 [Timestamp, Timestamp]
    if (value && value.length === 2) {
      this.updateDateState(value[0], value[1]);
    }
    this.setData({ calendarVisible: false });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onBookingTap() {
    const query = this.data.searchKeyword || '';
    wx.navigateTo({
      url: `/pages/search/search?q=${encodeURIComponent(query)}`
    });
  },

  onMemberTap() {
    Toast({ context: this, selector: '#t-toast', message: '查看会员权益' });
  },

  onCouponTap() {
    wx.navigateTo({ url: '/pages/coupon/coupon-list/index' });
  },

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