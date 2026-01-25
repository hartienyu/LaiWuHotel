import { submitBooking } from '../../services/booking/submitBooking';
import { searchHotels } from '../../services/booking/searchHotels';

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

      const formattedList = list.map(hotel => {
        // 确保 roomList 存在
        const roomList = (hotel.roomList || []).map(room => ({
          ...room,
          // 如果数据库里已经有了 id (例如 "hotel_1-room_1")，直接用；否则兜底用旧逻辑
          // 这里的 .id 是新 JSON 中的字段
          id: room.id || `${hotel._id}_${Math.random().toString(36).substr(2, 5)}`
        }));
        
        return {
          ...hotel,
          roomList,
          score: hotel.score || '4.8'
        };
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
    console.log('👉 点击预订，dataset:', e.currentTarget.dataset);

    const app = getApp();
    // if (app && app.checkLogin && !app.checkLogin()) return; // 登录拦截

    // WXML 中 data-roomid 会转换为 dataset.roomid (全小写)
    const { roomid, roomname, roomprice } = e.currentTarget.dataset;
    
    if (!roomid) {
      console.error('❌ 未获取到 roomid，请检查 JSON 数据中 roomList 是否包含 id 字段');
      wx.showToast({ title: '数据错误: 缺少房间ID', icon: 'none' });
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
      selectedRoomId: roomid,       // 这里直接就是 "hotel_1-room_1" 这种格式
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
       // 🟢 直接调用，传入的 selectedRoomId 已经是正确的格式 (如 hotel_1-room_1)
       const res = await submitBooking(selectedRoomId, selectedCheckInDate, selectedCheckOutDate, selectedRoomPrice);
       
       wx.hideLoading();
       
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