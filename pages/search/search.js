// 搜索页面：按匹配度排序酒店
Page({
  data: {
    query: '',
    results: [],
    loading: false,
  },

  onLoad(options) {
    // 支持通过 ?q=xxx 直接打开页面并自动搜索
    if (options && options.q) {
      const q = decodeURIComponent(options.q);
      this.setData({ query: q }, () => {
        this.doSearch();
      });
    }
  },

  onInput(e) {
    this.setData({ query: e.detail.value });
  },

  onConfirm() {
    const q = (this.data.query || '').trim();
    if (!q) {
      this.setData({ results: [] });
      return;
    }
    // 跳转到搜索结果页（带查询参数），页面 onLoad 会触发实际搜索
    wx.navigateTo({
      url: `/pages/search/search?q=${encodeURIComponent(q)}`
    });
  },

  onClear() {
    this.setData({ query: '', results: [] });
  },

  openHotel(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      // 跳转到酒店详情页（请根据项目实际路由调整）
      wx.navigateTo({ url: `/pages/hotel/detail?id=${id}` });
    }
  },

  // 主搜索逻辑
  async doSearch() {
    const q = (this.data.query || '').trim();
    if (!q) {
      this.setData({ results: [] });
      return;
    }
    this.setData({ loading: true, results: [] });

    const db = wx.cloud.database();
    const regexQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 转义正则特殊字符

    try {
      // 先用正则在云数据库中过滤（大小写不敏感）
      const res = await db.collection('hotels')
        .where({
          name: db.RegExp({ regexp: regexQuery, options: 'i' })
        })
        .get();

      let list = res.data || [];

      // 如果正则没有命中任何项，尝试拉取全部并在客户端计算相似度（注意：若酒店量大，请改为云端分词/索引）
      if (list.length === 0) {
        const all = await db.collection('hotels').get();
        list = all.data || [];
      }

      const scored = this.scoreAndSort(list, q);
      this.setData({ results: scored });
    } catch (err) {
      console.error('搜索出错', err);
      wx.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 计算每个酒店的匹配度并排序
  scoreAndSort(list, query) {
    const q = (query || '').toLowerCase();

    function longestCommonSubstring(a, b) {
      // 动态规划求最长公共子串长度
      const m = a.length, n = b.length;
      if (m === 0 || n === 0) return 0;
      let max = 0;
      const dp = new Array(n + 1).fill(0);
      for (let i = 1; i <= m; i++) {
        for (let j = n; j >= 1; j--) {
          if (a[i - 1] === b[j - 1]) {
            dp[j] = dp[j - 1] + 1;
            if (dp[j] > max) max = dp[j];
          } else {
            dp[j] = 0;
          }
        }
      }
      return max;
    }

    const scored = list.map(item => {
      const name = (item.name || '').toLowerCase();
      const lcsLen = longestCommonSubstring(q, name);
      // 基础得分：最长公共子串长度 / 搜索词长度（避免除0）
      let score = q.length > 0 ? (lcsLen / q.length) : 0;

      // 如果名称完全包含搜索词，加分
      if (name.indexOf(q) !== -1) score += 0.4;

      // 前缀命中再加分（更重要）
      if (name.startsWith(q)) score += 0.2;

      // 限制范围 [0, 1+]
      if (score < 0) score = 0;

      const normalized = Math.min(score, 1.0);
      // _matchScore 保留 0-1 的原始得分，_matchPercent 用于模板显示
      return Object.assign({}, item, {
        _matchScore: normalized,
        _matchPercent: Math.round(normalized * 100)
      });
    });

    // 按得分降序，得分相同时按评分或其他字段做二次排序
    scored.sort((a, b) => {
      if (b._matchScore !== a._matchScore) return b._matchScore - a._matchScore;
      // 次级排序：按酒店评分 (score 字段) 降序（若没有则不影响）
      const as = a.score || 0;
      const bs = b.score || 0;
      return bs - as;
    });

    return scored;
  }
});