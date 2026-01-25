import { submitBooking } from '../../services/booking/submitBooking';
import { searchHotels } from '../../services/booking/searchHotels';

Page({
  data: {
    query: '',
    results: [],
    loading: false,
    
    // 🟢 恢复：控制是否显示“无匹配结果”的提示
    showFallbackHint: false,
    
    // --- 预订弹窗数据 ---
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
    this.initDateLimits();

    if (options && options.q) {
      const q = decodeURIComponent(options.q);
      this.setData({ query: q }, () => {
        this.doSearch();
      });
    } else {
      // 初始状态：没有搜索词，显示所有
      this.doSearch();
    }
  },

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
    // 清空时，重置提示并查所有
    this.setData({ query: '', results: [], showFallbackHint: false }, () => {
      this.doSearch();
    });
  },

  // --- 核心搜索逻辑 ---
  async doSearch() {
    // 每次搜索前，先显示 loading，并重置提示
    this.setData({ loading: true, showFallbackHint: false });

    const q = (this.data.query || '').trim();

    try {
      // 使用新的统一搜索服务
      const result = await searchHotels(q);
      
      if (result.success) {
        this.setData({ 
          results: result.data,
          showFallbackHint: result.isFallback // 设置提示状态
        });
      } else {
        console.error('搜索失败:', result.error);
        wx.showToast({ title: result.error || '搜索失败', icon: 'none' });
        this.setData({ results: [] });
      }

    } catch (err) {
      console.error('搜索出错', err);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  navToDetail(e) {
    const spuId = e.currentTarget.dataset.id;
    if (spuId) {
      wx.navigateTo({ url: `/pages/goods/details/index?spuId=${spuId}` });
    }
  },

  // --- 预订逻辑 (保持不变) ---
  openBookingPopup(e) {
    const { roomid, roomname, roomprice } = e.currentTarget.dataset;
    if (!roomid) return;
    const app = getApp();
    if (app && app.checkLogin && !app.checkLogin()) return;

    const today = new Date();
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const defaultCheckIn = format(today);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const defaultCheckOut = format(tomorrow);

    this.setData({
      showBookingPopup: true,
      selectedRoomId: roomid,
      selectedRoomName: roomname,
      selectedRoomPrice: Number(roomprice),
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
     if (!selectedCheckInDate || !selectedCheckOutDate) { wx.showToast({ title: '请完善日期', icon: 'none' }); return; }
     
     const checkIn = new Date(selectedCheckInDate).getTime();
     const checkOut = new Date(selectedCheckOutDate).getTime();
     const today = new Date().setHours(0,0,0,0);
     const max = new Date(maxDateStr + 'T00:00:00').getTime();

     if (checkIn < today) { wx.showToast({ title: '入住日期无效', icon: 'none' }); return; }
     if (checkOut <= checkIn) { wx.showToast({ title: '离店日期需晚于入住', icon: 'none' }); return; }

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
             if (m.confirm) { wx.switchTab({ url: '/pages/order/order-list/index' }); }
           }
         });
       }
     } catch (err) {
       wx.hideLoading();
       wx.showToast({ title: err.message || '预订失败', icon: 'none' });
     }
  }
});