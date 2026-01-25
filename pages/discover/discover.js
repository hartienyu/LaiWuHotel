import { fetchGoodsList } from '../../services/good/fetchGoods';
import { submitBooking } from '../../services/booking/submitBooking';
import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    goodsList: [],
    goodsListLoadStatus: 0, 
    // 预订相关
    showBookingPopup: false,
    selectedRoomId: null,
    selectedRoomName: '',
    selectedHotelName: '', // 🟢 必须有这个字段
    selectedRoomPrice: 0,
    selectedCheckInDate: '',
    selectedCheckOutDate: '',
    minDateStr: '',
    maxDateStr: '',
  },

  onLoad() {
    this.goodListPagination = { index: 0, num: 10 };
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = new Date();
    const max = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.setData({ minDateStr: format(today), maxDateStr: format(max) });
    this.init();
  },

  onShow() {
    const tabBar = this.getTabBar();
    if (tabBar && typeof tabBar.init === 'function') {
      tabBar.init();
    }
  },

  onPullDownRefresh() {
    this.init();
  },

  onReachBottom() {
    if (this.data.goodsListLoadStatus === 0) {
      this.loadGoodsList();
    }
  },

  init() {
    this.goodListPagination.index = 0;
    this.setData({ goodsList: [] });
    this.loadGoodsList(true);
  },

  async loadGoodsList(fresh = false) {
    if (fresh) wx.stopPullDownRefresh();
    this.setData({ goodsListLoadStatus: 1 });
    const pageSize = this.goodListPagination.num;
    let pageIndex = this.goodListPagination.index + 1;
    if (fresh) pageIndex = 1;

    try {
      const nextList = await fetchGoodsList(pageIndex, pageSize);
      this.setData({
        goodsList: fresh ? nextList : this.data.goodsList.concat(nextList),
        goodsListLoadStatus: nextList.length < pageSize ? 2 : 0,
      });
      this.goodListPagination.index = pageIndex;
    } catch (err) {
      console.error(err);
      this.setData({ goodsListLoadStatus: 3 });
    }
  },

  onReTry() {
    this.loadGoodsList();
  },

  goodListClickHandle(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.goodsList[index];
    if (item) {
      wx.navigateTo({ url: `/pages/goods/details/index?spuId=${item.spuId}` });
    }
  },

  // 🟢 1. 打开弹窗，获取并保存数据
  openBookingPopup(e) {
    // dataset 会自动把 data-room-id 转为 roomId, data-hotel-name 转为 hotelName
    const { roomId, roomName, roomPrice, hotelName } = e.currentTarget.dataset;
    
    console.log('点击预订，数据:', { roomId, roomName, hotelName }); // 调试日志

    const today = new Date();
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const defaultCheckIn = format(today);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const defaultCheckOut = format(tomorrow);

    this.setData({
      showBookingPopup: true,
      selectedRoomId: roomId,
      selectedRoomName: roomName,
      selectedHotelName: hotelName || '未知酒店', // 保存到 data
      selectedRoomPrice: roomPrice,
      selectedCheckInDate: defaultCheckIn,
      selectedCheckOutDate: defaultCheckOut,
    });
  },

  closeBookingPopup() {
    this.setData({
      showBookingPopup: false,
      selectedRoomId: null,
      selectedRoomName: '',
      selectedHotelName: '',
      selectedRoomPrice: 0,
      selectedCheckInDate: '',
      selectedCheckOutDate: '',
    });
  },

  onCheckInDateChange(e) {
    if (e.detail.value) this.setData({ selectedCheckInDate: e.detail.value });
  },

  onCheckOutDateChange(e) {
    if (e.detail.value) this.setData({ selectedCheckOutDate: e.detail.value });
  },

  // 🟢 2. 提交预订，传递所有参数
  async submitBooking() {
    const { selectedCheckInDate, selectedCheckOutDate, selectedRoomId, selectedRoomPrice, selectedHotelName, selectedRoomName } = this.data;
    
    if (!selectedCheckInDate) {
      wx.showToast({ title: '请选择入住日期', icon: 'none' });
      return;
    }
    const checkIn = new Date(selectedCheckInDate).getTime();
    const checkOut = new Date(selectedCheckOutDate).getTime();
    const today = new Date(); today.setHours(0,0,0,0);
    const max = new Date(this.data.maxDateStr + 'T00:00:00').getTime();

    if (checkIn < today.getTime()) {
      wx.showToast({ title: '入住日期不能早于今天', icon: 'none' });
      return;
    }
    if (!selectedCheckOutDate) {
      wx.showToast({ title: '请选择离店日期', icon: 'none' });
      return;
    }
    if (checkOut <= checkIn) {
      wx.showToast({ title: '离店日期必须晚于入住日期', icon: 'none' });
      return;
    }
    if (checkOut > max) {
      wx.showToast({ title: '请选择一个月内的日期', icon: 'none' });
      return;
    }

    try {
      // 🟢 关键点：这里必须传 selectedHotelName 和 selectedRoomName
      const res = await this.submitBookingAPI(
        selectedRoomId, 
        selectedCheckInDate, 
        selectedCheckOutDate, 
        selectedRoomPrice, 
        selectedHotelName, 
        selectedRoomName
      );

      if (res) {
        wx.showModal({
          title: '预订成功',
          content: `酒店：${selectedHotelName}\n房型：${selectedRoomName}\n入住：${selectedCheckInDate}\n离店：${selectedCheckOutDate}`,
          showCancel: false,
          confirmText: '查看订单',
          success: () => {
            this.closeBookingPopup();
            this.init();
            setTimeout(() => {
              wx.switchTab({ url: '/pages/cart/index' });
            }, 500);
          }
        });
      }
    } catch (err) {
      console.error('预订失败:', err);
      wx.showModal({
        title: '预订失败',
        content: err.message || '请稍后重试',
        showCancel: false,
        confirmText: '确定'
      });
    }
  },

  async submitBookingAPI(roomId, checkInDate, checkOutDate, roomPrice, hotelName, roomName) {
    try {
      // 调用 service 层
      const res = await submitBooking(roomId, checkInDate, checkOutDate, roomPrice, hotelName, roomName);
      return res && res.code === 0;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  },
});