import { submitBooking } from '../../services/booking/submitBooking';

Page({
  data: {
    query: '',
    results: [],
    loading: false,
    
    // --- 预订弹窗相关数据 (从 discover.js 复刻) ---
    showBookingPopup: false,
    selectedRoomId: null,
    selectedRoomName: '',
    selectedRoomPrice: 0,
    selectedCheckInDate: '',
    selectedCheckOutDate: '',
    minDateStr: '',
    maxDateStr: '',
  },

  onLoad(options) {
    // 1. 初始化日期限制
    this.initDateLimits();

    // 2. 处理 URL 参数搜索
    if (options && options.q) {
      const q = decodeURIComponent(options.q);
      this.setData({ query: q }, () => {
        this.doSearch();
      });
    }
  },

  // 初始化日期范围 (今天 ~ 30天后)
  initDateLimits() {
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = new Date();
    const max = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.setData({ minDateStr: format(today), maxDateStr: format(max) });
  },

  onInput(e) {
    this.setData({ query: e.detail.value });
  },

  onConfirm() {
    this.doSearch();
  },

  onClear() {
    this.setData({ query: '', results: [] });
  },

  // 核心搜索逻辑
  async doSearch() {
    const q = (this.data.query || '').trim();
    if (!q) {
      this.setData({ results: [] });
      return;
    }
    this.setData({ loading: true, results: [] });

    const db = wx.cloud.database();
    const _ = db.command;
    // 构建正则查询
    const regex = db.RegExp({ regexp: q, options: 'i' });

    try {
      // 模糊匹配：名称、地址、标签包含关键词
      const res = await db.collection('hotels').where(_.or([
        { name: regex },
        { address: regex },
        { tags: regex } // 假设 tags 是字符串数组
      ])).get();

      let list = res.data || [];

      // ⚡️ 数据处理：确保 render 需要的字段存在
      const formattedList = list.map(hotel => {
        // 如果房间没有 ID，临时生成一个，确保预订功能正常
        const roomList = (hotel.roomList || []).map((room, idx) => ({
          ...room,
          id: room.id || `${hotel._id}_${idx}` // 兜底生成 ID
        }));
        
        return {
          ...hotel,
          roomList,
          score: hotel.score || '4.8' // 默认评分兜底
        };
      });

      this.setData({ results: formattedList });
    } catch (err) {
      console.error('搜索出错', err);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 跳转详情页
  navToDetail(e) {
    const spuId = e.currentTarget.dataset.id;
    if (spuId) {
      wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
    }
  },

  // --- 👇 以下是复刻的预订逻辑 👇 ---

  openBookingPopup(e) {
    const app = getApp();
    // 简单的登录检查
    if (app && app.checkLogin && !app.checkLogin()) return;

    const { roomId, roomName, roomPrice } = e.currentTarget.dataset;
    
    // 默认选中：今天入住，明天离店
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
      selectedRoomPrice: roomPrice,
      selectedCheckInDate: defaultCheckIn,
      selectedCheckOutDate: defaultCheckOut,
    });
  },

  closeBookingPopup() {
    this.setData({ showBookingPopup: false });
  },

  onCheckInDateChange(e) {
    this.setData({ selectedCheckInDate: e.detail.value });
  },

  onCheckOutDateChange(e) {
    this.setData({ selectedCheckOutDate: e.detail.value });
  },

  async submitBooking() {
    const { selectedCheckInDate, selectedCheckOutDate, selectedRoomId, selectedRoomPrice, maxDateStr } = this.data;
    
    if (!selectedCheckInDate || !selectedCheckOutDate) {
      wx.showToast({ title: '请完善日期', icon: 'none' });
      return;
    }

    const checkIn = new Date(selectedCheckInDate).getTime();
    const checkOut = new Date(selectedCheckOutDate).getTime();
    const today = new Date().setHours(0,0,0,0);
    const max = new Date(maxDateStr + 'T00:00:00').getTime();

    if (checkIn < today) {
      wx.showToast({ title: '入住日期无效', icon: 'none' });
      return;
    }
    if (checkOut <= checkIn) {
      wx.showToast({ title: '离店日期需晚于入住', icon: 'none' });
      return;
    }
    if (checkOut > max) {
      wx.showToast({ title: '仅限30天内预订', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    try {
      const res = await submitBooking(selectedRoomId, selectedCheckInDate, selectedCheckOutDate, selectedRoomPrice);
      wx.hideLoading();
      
      if (res && res.code === 0) {
        this.closeBookingPopup();
        wx.showModal({
          title: '预订成功',
          content: '您的房间已锁定，请前往订单查看',
          confirmText: '看订单',
          cancelText: '关闭',
          success: (m) => {
            if (m.confirm) {
              wx.switchTab({ url: '/pages/order/order-list/index' });
            }
          }
        });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '预订失败', icon: 'none' });
    }
  }
});