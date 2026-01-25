// pages/login/index.js
Page({
  data: { },

  onLoad() {},

  // 用户点击登录按钮后调用：先获取用户授权（可使用 getUserProfile），再调用 app.ensureLoginAtStartup
  async onLoginTap() {
    const app = getApp();

    try {
      // 可先请求用户个人信息（可选）
      if (wx.getUserProfile) {
        const res = await new Promise((resolve, reject) => {
          wx.getUserProfile({
            desc: '用于完善用户信息',
            success: (r) => resolve(r),
            fail: (e) => reject(e),
          });
        });
        console.log('用户信息', res.userInfo);
      }

      // 调用 app 方法去执行云函数获取 openId 并 ensureUser
      const userid = await app.ensureLoginAtStartup();
      console.log('登录并获取 userid:', userid);

      // 登录成功后返回首页（或者 wx.reLaunch 到 tab 页）
      wx.reLaunch({ url: '/pages/home/home' }); // 根据你项目首页路由调整
    } catch (err) {
      console.error('登录流程失败', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  },
});