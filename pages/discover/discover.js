import { fetchGoodsList } from '../../services/good/fetchGoods';
import Toast from 'tdesign-miniprogram/toast/index';

Page({
  data: {
    goodsList: [],
    goodsListLoadStatus: 0, // 0:加载中, 1:已加载, 2:没有更多了, 3:加载失败
    pageLoading: false,
  },

  // 分页控制
  goodListPagination: {
    index: 0,
    num: 10, // 每页加载多少个
  },

  // 页面加载
  onLoad() {
    this.init();
  },

  onShow() {
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

  init() {
    // 重置分页
    this.goodListPagination.index = 0;
    this.setData({ goodsList: [] }); // 清空列表
    this.loadGoodsList(true);
  },

  // 加载列表核心逻辑
  async loadGoodsList(fresh = false) {
    if (fresh) {
      wx.stopPullDownRefresh();
    }

    this.setData({ goodsListLoadStatus: 1 }); // 设为加载中

    const pageSize = this.goodListPagination.num;
    let pageIndex = this.goodListPagination.index + 1;
    if (fresh) {
      pageIndex = 0;
    }

    try {
      // 调用接口获取数据
      const nextList = await fetchGoodsList(pageIndex, pageSize);
      
      this.setData({
        goodsList: fresh ? nextList : this.data.goodsList.concat(nextList),
        goodsListLoadStatus: nextList.length < pageSize ? 2 : 0, // 如果返回数量小于页容量，说明没有更多了
      });

      this.goodListPagination.index = pageIndex;
      this.goodListPagination.num = pageSize;
    } catch (err) {
      this.setData({ goodsListLoadStatus: 3 }); // 加载失败状态
    }
  },

  // 点击加载失败重试
  onReTry() {
    this.loadGoodsList();
  },

  // 点击卡片跳转详情
  goodListClickHandle(e) {
    const { index } = e.detail;
    const { spuId } = this.data.goodsList[index];
    wx.navigateTo({
      url: `/pages/goods/details/index?spuId=${spuId}`,
    });
  },

  // 点击购物车图标（如果是房源，可以是收藏）
  goodListAddCartHandle() {
    Toast({
      context: this,
      selector: '#t-toast',
      message: '收藏成功',
    });
  },
});