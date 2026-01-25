import { submitBooking } from '../../services/booking/submitBooking';

Page({
  data: {
    query: '',
    results: [],
    loading: false,
    
    showFallbackHint: false,
    
    // --- 预订弹窗数据 ---
    showBookingPopup: false,
    selectedRoomId: null,
    selectedRoomName: '',
    selectedHotelName: '', // 🟢 新增
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

  async doSearch() {
    this.setData({ loading: true, showFallbackHint: false });
    const db = wx.cloud.database();
    const q = (this.data.query || '').trim();

    try {
      let res;
      let isFallback = false;

      if (q) {
        const regex = db.RegExp({ regexp: q, options: 'i' });
        res = await db.collection('hotels').where({
          name: regex
        }).get();

        if (!res.data || res.data.length === 0) {
          isFallback = true;
          res = await db.collection('hotels').get();
        }
      } else {
        res = await db.collection('hotels').get();
      }

      let list = res.data || [];

      const formattedList = list.map(hotel => {
        const roomList = (hotel.roomList || []).map(room => ({
          ...room,
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

    // 🟢 获取 hotelname
    const { roomid, roomname, roomprice, hotelname } = e.currentTarget.dataset;
    
    if (!roomid) {
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
      selectedRoomId: roomid,
      selectedRoomName: roomname,
      selectedHotelName: hotelname || '未知酒店', // 🟢 设置酒店名
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
     // 🟢 取出 hotelName, roomName
     const { selectedCheckInDate, selectedCheckOutDate, selectedRoomId, selectedRoomPrice, selectedHotelName, selectedRoomName } = this.data;
     
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
       // 🟢 传入 hotelName, roomName
       const res = await submitBooking(
         selectedRoomId, 
         selectedCheckInDate, 
         selectedCheckOutDate, 
         selectedRoomPrice, 
         selectedHotelName, 
         selectedRoomName
       );
       
       wx.hideLoading();
       
       if (res && res.code === 0) {
         this.closeBookingPopup();
         wx.showModal({
           title: '预订成功',
           content: `酒店：${selectedHotelName}\n房型：${selectedRoomName}\n您的房间已锁定`,
           confirmText: '看订单',
           cancelText: '关闭',
           success: (m) => {
             if (m.confirm) { 
               wx.switchTab({ url: '/pages/cart/index' }); 
             }
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