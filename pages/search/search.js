import { submitBooking } from '../../services/booking/submitBooking';

Page({
  data: {
    query: '',
    results: [],
    loading: false,
    
    // 控制是否显示“无匹配结果”的提示
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
    this.setData({ query: '', results: [], showFallbackHint: false }, () => {
      this.doSearch();
    });
  },

  // --- 核心搜索逻辑 ---
  async doSearch() {
    this.setData({ loading: true, showFallbackHint: false });
    const db = wx.cloud.database();
    const q = (this.data.query || '').trim();

    try {
      let res;
      let isFallback = false;

      if (q) {
        // 1. 精准搜索 (只搜名称)
        const regex = db.RegExp({ regexp: q, options: 'i' });
        res = await db.collection('hotels').where({
          name: regex
        }).get();

        // 2. 如果没搜到 -> 兜底查所有 -> 显示提示
        if (!res.data || res.data.length === 0) {
          isFallback = true;
          res = await db.collection('hotels').get();
        }
      } else {
        // 无搜索词 -> 查所有
        res = await db.collection('hotels').get();
      }

      let list = res.data || [];

      // 数据处理
      const formattedList = list.map(hotel => {
        const roomList = (hotel.roomList || []).map((room, idx) => ({
          ...room,
          id: room.id || `${hotel._id}_${idx}` 
        }));
        
        return { ...hotel, roomList, score: hotel.score || '4.8' };
      });

      this.setData({ 
        results: formattedList,
        showFallbackHint: isFallback 
      });

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

  // --- 预订弹窗逻辑 ---

  openBookingPopup(e) {
    console.log('👉 点击了预订按钮，参数:', e.currentTarget.dataset);

    const app = getApp();
    // 登录检查 (如果您需要开启，请解开注释)
    // if (app && app.checkLogin && !app.checkLogin()) return; 

    const { roomid, roomname, roomprice } = e.currentTarget.dataset;
    
    if (!roomid) {
      console.error('❌ 缺少 roomid，请检查 wxml 中的 data-roomid');
      wx.showToast({ title: '系统错误: 缺少ID', icon: 'none' });
      return;
    }

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
    console.log('✅ 弹窗已打开');
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

  // 🔴 删除了 submitBookingAPI 包装方法，因为不需要它

  async submitBooking() {
     const { selectedCheckInDate, selectedCheckOutDate, selectedRoomId, selectedRoomPrice, maxDateStr } = this.data;
     
     if (!selectedCheckInDate || !selectedCheckOutDate) { 
       wx.showToast({ title: '请完善日期', icon: 'none' }); 
       return; 
     }

     const checkIn = new Date(selectedCheckInDate).getTime();
     const checkOut = new Date(selectedCheckOutDate).getTime();
     const today = new Date().setHours(0,0,0,0);

     if (checkIn < today) { 
       wx.showToast({ title: '入住日期无效', icon: 'none' }); 
       return; 
     }
     if (checkOut <= checkIn) { 
       wx.showToast({ title: '离店日期需晚于入住', icon: 'none' }); 
       return; 
     }

     wx.showLoading({ title: '提交中...' });
     try {
       // 🟢 修复：直接调用 import 进来的 submitBooking 函数
       const res = await submitBooking(selectedRoomId, selectedCheckInDate, selectedCheckOutDate, selectedRoomPrice);
       wx.hideLoading();
       
       // 这里 res 是对象 { code: 0, ... }，判断逻辑正确
       if (res) {
        // 预订成功，显示弹窗并跳转到订单列表
        wx.showModal({
          title: '预订成功',
          content: `房间已成功预订\n入住：${selectedCheckInDate}\n离店：${this.data.selectedCheckOutDate}`,
          showCancel: false,
          confirmText: '查看订单',
          success: () => {
            // 关闭弹窗并刷新
            this.closeBookingPopup();
            // 延迟跳转到订单页面
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/cart/index'
              });
            }, 500);
          }
        });
       }
     } catch (err) {
       wx.hideLoading();
       console.error(err);
       wx.showToast({ title: err.message || '预订失败', icon: 'none' });
     }
  }
});