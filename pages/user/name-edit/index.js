Page({
  data: {
    nameValue: '',
  },
  onLoad(options) {
    const { name } = options;
    this.setData({
      nameValue: name,
    });
  },
  
  // 🟢 保存昵称到数据库
  async onSubmit() {
    const name = this.data.nameValue.trim();
    if (!name) return;

    wx.showLoading({ title: '保存中...' });
    const db = wx.cloud.database();
    
    try {
      const res = await db.collection('users').get();
      if (res.data.length > 0) {
        const docId = res.data[0]._id;
        await db.collection('users').doc(docId).update({
          data: { nickName: name }
        });
        
        wx.hideLoading();
        wx.navigateBack(); // 返回上一页，上一页的 onShow 会自动刷新数据
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(err);
    }
  },

  clearContent() {
    this.setData({
      nameValue: '',
    });
  },
});