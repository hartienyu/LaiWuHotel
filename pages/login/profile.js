const app = getApp();

Page({
  data: {
    avatarUrl: '', // 默认头像留空
    nickName: '',
  },

  // 选择头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl });
  },

  // 填写昵称
  onNicknameChange(e) {
    const nickName = e.detail.value;
    this.setData({ nickName });
  },

  // 保存并登录
  handleSave() {
    const { avatarUrl, nickName } = this.data;

    // 1. 简单校验
    if (!avatarUrl || !nickName) {
      wx.showToast({ title: '请先完善头像和昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '登录中...' });

    // 2. 模拟后端登录请求
    setTimeout(() => {
      wx.hideLoading();

      // 构造用户信息
      const userInfo = {
        nickName,
        avatarUrl, // 注意：实际开发中，这里需要把临时路径上传到云存储换取 http 链接
      };

      // 3. 写入缓存和全局变量
      wx.setStorageSync('token', 'token_' + Date.now());
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.isLogin = true;
      app.globalData.userInfo = userInfo;

      wx.showToast({ title: '登录成功' });

      const pages = getCurrentPages();
      if (pages.length > 2) {
        wx.navigateBack({ delta: 2 });
      } else {
        // 防止页面栈不够的情况（比如分享卡片直接进来的）
        wx.reLaunch({ url: '/pages/home/home' });
      }

    }, 1000);
  }
});