Page({
  goToProfile() {
    wx.navigateTo({
      url: '/pages/login/profile',
    });
  },

  goBack() {
    wx.navigateBack();
  }
});