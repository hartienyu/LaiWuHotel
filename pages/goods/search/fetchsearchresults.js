
import { config } from '../../config/index';

/** 原来的 mock 逻辑，保留以便切回 */
function mockSearchResult(params) {
  const { delay } = require('../_utils/delay');
  const { getSearchResult } = require('../../model/search');

  const data = getSearchResult(params);

  if (data.spuList && data.spuList.length) {
    data.spuList.forEach((item) => {
      item.spuId = item.spuId;
      item.thumb = item.primaryImage;
      item.title = item.title;
      item.price = item.minSalePrice;
      item.originPrice = item.maxLinePrice;
      if (item.spuTagList) {
        item.tags = item.spuTagList.map((tag) => ({ title: tag.title }));
      } else {
        item.tags = [];
      }
    });
  }
  return delay().then(() => {
    return data;
  });
}

/** 将后端单条记录映射为前端期望格式 */
function mapBackendItemToSpu(item) {
  return {
    spuId: item._id || item.spuId || '',
    primaryImage: (item.hotelImages && item.hotelImages[0]) || item.primaryImage || '',
    title: item.name || item.title || '',
    minSalePrice:
      // roomList 中 price 假定为分（与你给的样例一致）
      (item.roomList && item.roomList[0] && item.roomList[0].price) || item.minSalePrice || 0,
    maxLinePrice: (item.roomList && item.roomList[0] && item.roomList[0].price) || item.maxLinePrice || 0,
    spuTagList:
      Array.isArray(item.tags) ? item.tags.map((t) => ({ title: t })) : item.spuTagList || [],
    // 保留原始对象便于调试
    __raw: item,
  };
}

/** 真正请求后端的实现 */
function realSearchResult(params) {
  const apiBase = config.apiBase || 'https://api.example.com'; // 请在 config 中覆盖
  // 假设后端搜索接口为 GET {apiBase}/hotels
  const url = `${apiBase.replace(/\/$/, '')}/hotels`;

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      data: {
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        keyword: params.keyword,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        sort: params.sort,
        sortType: params.sortType,
      },
      success(res) {
        const body = res.data || {};
        // 兼容几种常见返回结构
        let list = [];
        let totalCount = 0;
        if (Array.isArray(body.data)) {
          list = body.data;
          totalCount = body.total || list.length;
        } else if (body.data && Array.isArray(body.data.list)) {
          list = body.data.list;
          totalCount = body.data.totalCount || body.data.total || list.length;
        } else if (Array.isArray(body.spuList)) {
          list = body.spuList;
          totalCount = body.totalCount || list.length;
        } else if (Array.isArray(body.list)) {
          list = body.list;
          totalCount = body.total || list.length;
        } else {
          // 如果后端直接返回数组
          if (Array.isArray(body)) {
            list = body;
            totalCount = list.length;
          } else {
            list = [];
            totalCount = 0;
          }
        }

        const spuList = list.map(mapBackendItemToSpu);

        resolve({
          saasId: body.saasId || null,
          storeId: body.storeId || null,
          pageNum: params.pageNum,
          pageSize: params.pageSize,
          totalCount,
          spuList,
          algId: body.algId || 0,
        });
      },
      fail(err) {
        reject(err);
      },
    });
  });
}

/** 对外接口 */
export function getSearchResult(params) {
  if (config.useMock) {
    return mockSearchResult(params);
  }
  return realSearchResult(params);
}