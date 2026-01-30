import updateManager from './common/updateManager';

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-8gmfv8spb80715eb', 
        traceUser: true,
      });
      this.getUserOpenId();
    }
  },

  getUserOpenId() {
    const cachedOpenId = wx.getStorageSync('userOpenId');
    if (cachedOpenId) {
      return;
    }

    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        const openId = res.result?.openid;
        if (openId) {
          wx.setStorageSync('userOpenId', openId);
          console.log('用户 OpenID 已存储:', openId);
        }
      },
      fail: (err) => {
        console.error('获取用户 OpenID 失败:', err);
        const tempId = 'temp_' + Date.now();
        wx.setStorageSync('userOpenId', tempId);
      },
    });
  },

  onShow: function () {
    updateManager();
  },
  globalData: {
    isLogin: false,
    token: '',
  },

  silentLogin() {
    wx.login({
      success: res => {
        if (res.code) {
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
          console.log('获取到的登录凭证 code:', res.code);
          // 这里调用你的后端接口，如果后端发现由于已注册，直接返回 token
          // this.setLoginSuccess(token);
        }
      }
    });
  },

  checkLogin() {
    if (this.globalData.isLogin) return true;

    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.isLogin = true;
      return true;
    }

    this.forceLogin();
    return false;
  },
  
  forceLogin() {
    console.log('👉 准备跳转登录页...');
    wx.navigateTo({
      url: '/pages/login/index',
    });
  }
});
