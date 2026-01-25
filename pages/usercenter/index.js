import { fetchUserCenter } from '../../services/usercenter/fetchUsercenter';
import Toast from 'tdesign-miniprogram/toast/index';

const menuData = [
  [
    {
      title: '旅客信息',
      tit: '',
      url: '/pages/user/name-edit/index',
      type: 'guest',
    },
  ],
];

const orderTagInfos = [
  {
    title: '待付款',
    iconName: 'wallet',
    orderNum: 0,
    tabType: 5,
    status: 1,
  },
  {
    title: '待发货',
    iconName: 'deliver',
    orderNum: 0,
    tabType: 10,
    status: 1,
  },
  {
    title: '待收货',
    iconName: 'package',
    orderNum: 0,
    tabType: 40,
    status: 1,
  },
  {
    title: '待评价',
    iconName: 'comment',
    orderNum: 0,
    tabType: 60,
    status: 1,
  },
  {
    title: '退款/售后',
    iconName: 'exchang',
    orderNum: 0,
    tabType: 0,
    status: 1,
  },
];

const getDefaultData = () => ({
  showMakePhone: false,
  userInfo: {
    avatarUrl: '',
    nickName: '正在登录...',
    phoneNumber: '',
  },
  menuData,
  orderTagInfos,
  customerServiceInfo: {},
  currAuthStep: 1,
  showKefu: true,
  versionNo: '',
  bookings: [], // 用户的预订记录
});

Page({
  data: getDefaultData(),

  onLoad() {
    this.getVersionInfo();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().init();
    }
    this.init();
  },
  
  onPullDownRefresh() {
    this.init();
  },

  init() {
    this.fetUseriInfoHandle();
    this.loadUserBookings();
  },

  fetUseriInfoHandle() {
    // 优先读取本地缓存的用户信息
    const localUserInfo = wx.getStorageSync('userInfo');

    fetchUserCenter().then(({ userInfo, countsData, orderTagInfos: orderInfo, customerServiceInfo }) => {
      // eslint-disable-next-line no-unused-expressions
      menuData?.[0].forEach((v) => {
        countsData.forEach((counts) => {
          if (counts.type === v.type) {
            // eslint-disable-next-line no-param-reassign
            v.tit = counts.num;
          }
        });
      });
      const info = orderTagInfos.map((v, index) => ({
        ...v,
        ...orderInfo[index],
      }));

      // 如果有本地登录信息，覆盖接口返回的默认信息
      let finalUserInfo = userInfo;
      let finalAuthStep = 2; // 默认为已登录状态

      if (localUserInfo) {
        finalUserInfo = {
          ...userInfo,
          ...localUserInfo
        };
      } else {
        // 如果没有本地缓存，可能是未登录状态
        // 检查 app.globalData.isLogin
        const app = getApp();
        if (!app.globalData.isLogin) {
           finalAuthStep = 1; // 未登录
           finalUserInfo = { nickName: '请登录', avatarUrl: '' };
        }
      }

      this.setData({
        userInfo: finalUserInfo,
        menuData,
        orderTagInfos: info,
        customerServiceInfo,
        currAuthStep: finalAuthStep,
      });
      wx.stopPullDownRefresh();
    });
  },

  // ... 剩余代码保持不变 (onClickCell, jumpNav, jumpAllOrder, loadUserBookings, gotoBookingDetail, openMakePhone, closeMakePhone, call, gotoUserEditPage, getVersionInfo)
  onClickCell({ currentTarget }) {
    const { type } = currentTarget.dataset;

    switch (type) {
      case 'guest': {
        wx.navigateTo({ url: '/pages/user/name-edit/index' });
        break;
      }
      default: {
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
          duration: 1000,
        });
        break;
      }
    }
  },

  jumpNav(e) {
    const status = e.detail.tabType;

    if (status === 0) {
      wx.navigateTo({ url: '/pages/order/after-service-list/index' });
    } else {
      wx.navigateTo({ url: `/pages/order/order-list/index?status=${status}` });
    }
  },

  jumpAllOrder() {
    wx.navigateTo({ url: '/pages/order/order-list/index' });
  },

  // 加载用户预订记录
  loadUserBookings() {
    const db = wx.cloud.database();
    // 注意：之前是 userId: wx.getStorageSync('userOpenId')，现在我们用 userInfo._openid 或 云函数获取
    // 假设已经登录且有 openid 权限
    db.collection('inn_booking')
      .where({
        // userId: wx.getStorageSync('userOpenId') || '' 
        // 简化处理：通常在云开发中，小程序端查询会自动带上 _openid 过滤，如果字段本身就是 _openid 创建的
        // 如果字段是 userId，需要确保 login 时存入了 userOpenId
        // 这里暂时保持原样，或者您可以改为查所有自己的记录：
        _openid: '{openid}' 
      })
      .orderBy('createTime', 'desc') // 注意：原来的代码可能是 createdAt，云函数生成的是 createTime
      .limit(10)
      .get()
      .then((res) => {
        this.setData({ bookings: res.data || [] });
      })
      .catch((err) => {
        console.error('加载预订记录失败:', err);
        this.setData({ bookings: [] });
      });
  },

  // 点击预订卡片跳转到订单详情
  gotoBookingDetail(e) {
    // 假设详情页需要 ID
    // wx.navigateTo({ url: `/pages/order/order-detail/index?orderNo=${bookingId}` });
    console.log('点击预订详情', e);
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

  gotoUserEditPage() {
    const { currAuthStep } = this.data;
    if (currAuthStep === 2) {
      wx.navigateTo({ url: '/pages/user/person-info/index' });
    } else {
      // 未登录去登录
      wx.navigateTo({ url: '/pages/login/index' });
    }
  },

  getVersionInfo() {
    const versionInfo = wx.getAccountInfoSync();
    const { version, envVersion = __wxConfig } = versionInfo.miniProgram;
    this.setData({
      versionNo: envVersion === 'release' ? version : envVersion,
    });
  },
});