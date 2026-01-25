import { phoneEncryption } from '../../../utils/util';
import Toast from 'tdesign-miniprogram/toast/index';

const app = getApp();

Page({
  data: {
    personInfo: {
      avatarUrl: '',
      nickName: '',
      gender: 0,
      phoneNumber: '',
    },
    genderColumns: [
      { label: '男', value: '1' },
      { label: '女', value: '2' },
    ],
    genderMap: { 0: '未知', 1: '男', 2: '女' },
  },

  onShow() {
    this.fetchDataFromDB();
  },

  async fetchDataFromDB() {
    const db = wx.cloud.database();
    try {
      const res = await db.collection('users').get();
      if (res.data.length > 0) {
        const userInfo = res.data[0];
        this.setData({
          personInfo: {
            avatarUrl: userInfo.avatarUrl,
            nickName: userInfo.nickName,
            gender: userInfo.gender || 0,
            phoneNumber: userInfo.phoneNumber ? phoneEncryption(userInfo.phoneNumber) : ''
          }
        });
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.userInfo = userInfo;
      }
    } catch (err) {
      console.error(err);
    }
  },

  async updateUserInfoToDB(dataToUpdate) {
    const db = wx.cloud.database();
    try {
      const userRes = await db.collection('users').get();
      if (userRes.data.length === 0) return;
      const docId = userRes.data[0]._id;

      await db.collection('users').doc(docId).update({
        data: dataToUpdate
      });
      this.fetchDataFromDB();
      return true;
    } catch (err) {
      Toast({ context: this, selector: '#t-toast', message: '更新失败', theme: 'error' });
      return false;
    }
  },

  onClickCell({ currentTarget }) {
    const { dataset } = currentTarget;
    switch (dataset.type) {
      case 'name':
        wx.navigateTo({
          url: `/pages/user/name-edit/index?name=${this.data.personInfo.nickName}`,
        });
        break;
      case 'avatarUrl':
        this.toModifyAvatar();
        break;
    }
  },

  async onGenderChange(e) {
    const index = e.detail.value;
    const selectedItem = this.data.genderColumns[index];
    const genderVal = parseInt(selectedItem.value);

    wx.showLoading({ title: '保存中...' });
    
    const success = await this.updateUserInfoToDB({ gender: genderVal });
    
    wx.hideLoading();
    if (success) {
      Toast({ context: this, selector: '#t-toast', message: '设置成功', theme: 'success' });
    }
  },

  async toModifyAvatar() {
    try {
      const res = await wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'] });
      const tempFilePath = res.tempFiles[0].path;

      wx.showLoading({ title: '上传中...' });
      
      const suffix = tempFilePath.match(/\.[^.]+?$/)?.[0] || '.jpg';
      const cloudPath = `avatars/${Date.now()}-${Math.floor(Math.random() * 1000)}${suffix}`;
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath,
      });
      
      const fileID = uploadRes.fileID;
      await this.updateUserInfoToDB({ avatarUrl: fileID });
      
      wx.hideLoading();
      Toast({ context: this, selector: '#t-toast', message: '头像修改成功', theme: 'success' });

    } catch (error) {
      wx.hideLoading();
      if (error.errMsg && error.errMsg.indexOf('cancel') > -1) return;
      Toast({ context: this, selector: '#t-toast', message: '修改失败', theme: 'error' });
    }
  },

  openUnbindConfirm() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          app.globalData.isLogin = false;
          app.globalData.userInfo = null;
          wx.reLaunch({ url: '/pages/home/home' });
        }
      }
    });
  }
});