import { fetchUserCenter } from '../../services/usercenter/fetchUsercenter';
import Toast from 'tdesign-miniprogram/toast/index';

// 🟢 修改点1：将“旅客信息”改为“联系客服”，并修改 type 为 'service'
const menuData = [
  [
    {
      title: '联系客服',
      tit: '',
      url: '', 
      type: 'service',
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
  bookings: [], 
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

      let finalUserInfo = userInfo;
      let finalAuthStep = 2; 

      if (localUserInfo) {
        finalUserInfo = {
          ...userInfo,
          ...localUserInfo
        };
      } else {
        const app = getApp();
        if (!app.globalData.isLogin) {
           finalAuthStep = 1; 
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

  onClickCell({ currentTarget }) {
    const { type } = currentTarget.dataset;

    switch (type) {
      // 🟢 修改点2：新增 'service' 类型的处理逻辑，调用 openMakePhone 打开弹窗
      case 'service': {
        this.openMakePhone();
        break;
      }
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

  loadUserBookings() {
    const db = wx.cloud.database();
    db.collection('inn_booking')
      .where({
        _openid: '{openid}' 
      })
      .orderBy('createTime', 'desc') 
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

  gotoBookingDetail(e) {
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