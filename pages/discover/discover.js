import { fetchGoodsList } from '../../services/good/fetchGoods';

Page({
  data: {
    goodsList: [],
    goodsListLoadStatus: 0, // 0:加载中, 1:已加载, 2:没有更多了, 3:加载失败
  },

  onLoad() {
    this.goodListPagination = {
      index: 0,
      num: 10,
    };
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
});