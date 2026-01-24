import updateManager from './common/updateManager';

App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env: '你的环境ID', // 如果报错，把这行注释去掉，填入你的环境ID
        traceUser: true,
      });

      // 获取用户 OpenID 用于数据库查询
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
});
