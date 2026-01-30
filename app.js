import updateManager from './common/updateManager';

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // 云开发环境ID
      wx.cloud.init({
        env: 'cloudbase-8gmfv8spb80715eb', 
        traceUser: true,
      });
      this.getUserOpenId();
    }
  },

  getUserOpenId() {
    // 检查是否已存储
    const cachedOpenId = wx.getStorageSync('userOpenId');
    if (cachedOpenId) {
      return;
    }

    // 通过云函数获取用户 OpenID
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
        // 降级方案：生成临时用户ID（仅用于开发测试）
        const tempId = 'temp_' + Date.now();
        wx.setStorageSync('userOpenId', tempId);
      },
    });
  },

  onShow: function () {
    updateManager();
  },
  globalData: {
    isLogin: false, // 全局登录状态
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
    // 1. 优先检查内存 globalData（速度快）
    if (this.globalData.isLogin) return true;

    // 2. 其次检查缓存 Storage（防止刷新后状态丢失）
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.isLogin = true; // 同步回内存
      return true;
    }

    // 3. 既没内存也没缓存 -> 没登录，强制跳转
    this.forceLogin();
    return false;
  },
  
  // 强制跳转登录页的方法
  forceLogin() {
    console.log('👉 准备跳转登录页...');
    wx.navigateTo({
      url: '/pages/login/index', // 指向你的登录页
    });
  }
});
