const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuBottom: 0,
    menuHeight: 32,
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync();
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight,
      navBarHeight: 44,
      menuBottom: menuButtonInfo.bottom,
      menuHeight: menuButtonInfo.height
    });
  },

  // 🟢 核心修改：登录前先检查数据库
  async goToProfile() {
    wx.showLoading({ title: '检查账号中...' });
    
    const db = wx.cloud.database();
    try {
      // 1. 查询数据库中是否已有当前用户的记录
      // 云开发会自动根据 OpenID 过滤，所以不需要写 where({_openid: ...})
      const res = await db.collection('users').get();

      wx.hideLoading();

      if (res.data.length > 0) {
        // A. 账号已存在 -> 直接登录
        const userInfo = res.data[0];
        
        // 写入缓存和全局变量
        wx.setStorageSync('token', 'token_' + Date.now());
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.isLogin = true;
        app.globalData.userInfo = userInfo;

        wx.showToast({ title: '欢迎回来' });
        
        // 跳转回首页
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/home/home' });
        }, 500);

      } else {
        // B. 账号不存在 -> 跳转去填写资料页面
        wx.navigateTo({
          url: '/pages/login/profile',
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('登录检查失败', err);
      // 如果出错，为了保险起见，还是让用户去尝试填写资料或重试
      wx.showToast({ title: '网络异常', icon: 'none' });
    }
  },

  goBack() {
    wx.showModal({
      title: '提示',
      content: '小程序为会员功能，请登录',
      showCancel: false,
      confirmText: '我知道了'
    });
  }
});