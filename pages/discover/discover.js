import { fetchGoodsList } from '../../services/good/fetchGoods';
import { submitBooking } from '../../services/booking/submitBooking';
import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    goodsList: [],
    goodsListLoadStatus: 0, // 0:加载中, 1:已加载, 2:没有更多了, 3:加载失败
    // 预订相关
    showBookingPopup: false,
    selectedRoomId: null,
    selectedRoomName: '',
    selectedRoomPrice: 0,
    selectedCheckInDate: '',
    selectedCheckOutDate: '',
    // 限制为今天到 30 天内
    minDateStr: '',
    maxDateStr: '',
  },

  onLoad() {
    this.goodListPagination = {
      index: 0,
      num: 10,
    };

    // 计算 min/max 日期字符串（YYYY-MM-DD），限制为 30 天内
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = new Date();
    const max = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.setData({ minDateStr: format(today), maxDateStr: format(max) });

    this.init();
  },

  onShow() {
    // 底部 TabBar 高亮初始化
    const tabBar = this.getTabBar();
    if (tabBar && typeof tabBar.init === 'function') {
      tabBar.init();
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.init();
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.goodsListLoadStatus === 0) {
      this.loadGoodsList();
    }
  },

  // 初始化
  init() {
    this.goodListPagination.index = 0;
    this.setData({ goodsList: [] });
    this.loadGoodsList(true);
  },

  // 加载列表核心逻辑
  async loadGoodsList(fresh = false) {
    if (fresh) {
      wx.stopPullDownRefresh();
    }

    this.setData({ goodsListLoadStatus: 1 });

    const pageSize = this.goodListPagination.num;
    let pageIndex = this.goodListPagination.index + 1;
    if (fresh) {
      pageIndex = 1;
    }

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

  // 加载失败重试
  onReTry() {
    this.loadGoodsList();
  },

  // 点击跳转详情
  goodListClickHandle(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.goodsList[index];
    
    // 确保有 item 再跳转
    if (item) {
      wx.navigateTo({
        url: `/pages/goods/details/index?spuId=${item.spuId}`,
      });
    }
  },

  // 开启预订弹窗
  openBookingPopup(e) {
    // 强制登录
    const app = getApp();
    if (!app.checkLogin()) return;

    const { roomId, roomName, roomPrice } = e.currentTarget.dataset;
    // 如果未选择，默认填充为今天-明天
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

  // 关闭预订弹窗
  closeBookingPopup() {
    this.setData({
      showBookingPopup: false,
      selectedRoomId: null,
      selectedRoomName: '',
      selectedRoomPrice: 0,
      selectedCheckInDate: '',
      selectedCheckOutDate: '',
    });
  },

  // 日期选择（来自 <picker>，value 为 YYYY-MM-DD）
  onCheckInDateChange(e) {
    const value = e.detail.value;
    if (value) {
      this.setData({ selectedCheckInDate: value });
    }
  },

  onCheckOutDateChange(e) {
    const value = e.detail.value;
    if (value) {
      this.setData({ selectedCheckOutDate: value });
    }
  },

  // 提交预订
  async submitBooking() {
    const { selectedCheckInDate, selectedRoomId, selectedRoomPrice } = this.data;
    
    // 验证日期
    if (!selectedCheckInDate) {
      wx.showToast({ title: '请选择入住日期', icon: 'none' });
      return;
    }

    // 校验日期范围：check-in 不早于今天, check-out 必须存在且晚于 check-in，且两者都不超过 maxDateStr
    const checkIn = new Date(selectedCheckInDate).getTime();
    const checkOut = new Date(this.data.selectedCheckOutDate).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date(this.data.maxDateStr + 'T00:00:00').getTime();

    if (checkIn < today.getTime()) {
      wx.showToast({ title: '入住日期不能早于今天', icon: 'none' });
      return;
    }
    if (!this.data.selectedCheckOutDate) {
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
      // 调用预订接口，传入房间价格
      const res = await this.submitBookingAPI(selectedRoomId, selectedCheckInDate, this.data.selectedCheckOutDate, selectedRoomPrice);
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
            this.init(); // 刷新列表
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
      console.error('预订失败:', err);
      wx.showModal({
        title: '预订失败',
        content: err.message || '预订失败，请稍后重试',
        showCancel: false,
        confirmText: '确定'
      });
    }
  },

  // 调用预订接口
  async submitBookingAPI(roomId, checkInDate, checkOutDate, roomPrice) {
    try {
      const res = await submitBooking(roomId, checkInDate, checkOutDate, roomPrice);
      console.log('预订API返回:', res);
      return res && res.code === 0;
    } catch (err) {
      console.error('预订 API 错误:', err);
      throw err; // 抛出错误而不是返回 false
    }
  },
});