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
    }
  },
  onShow: function () {
    updateManager();
  },
});
