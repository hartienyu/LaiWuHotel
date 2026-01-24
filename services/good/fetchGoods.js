import { config } from '../../config/index';

/** 获取商品列表 */
function mockFetchGoodsList(pageIndex = 1, pageSize = 20) {
  const { delay } = require('../_utils/delay');
  const { getGoodsList } = require('../../model/goods');
  return delay().then(() =>
    getGoodsList(pageIndex, pageSize).map((item) => {
      return {
        spuId: item.spuId,
        thumb: item.primaryImage,
        title: item.title,
        price: item.minSalePrice,
        originPrice: item.maxLinePrice,
        tags: item.spuTagList.map((tag) => tag.title),
      };
    }),
  );
}

/** 获取商品列表 (云开发版) */
export function fetchGoodsList(pageIndex = 1, pageSize = 20) {
  const db = wx.cloud.database();
  const skipCount = Math.max(0, (pageIndex - 1) * pageSize);

  return new Promise((resolve, reject) => {
    db.collection('goods') // 👈 集合名字要对
      .skip(skipCount)     // 跳过前几页
      .limit(pageSize)     // 限制每页数量
      .get()
      .then(res => {
        const formattedList = res.data.map(item => ({
          spuId: item.spuId || item._id, // 云数据库自带 _id
          thumb: item.primaryImage || item.thumb, // 兼容你的字段名
          title: item.title,
          price: item.minSalePrice || item.price,
          originPrice: item.maxLinePrice || item.originPrice,
          tags: item.spuTagList ? item.spuTagList.map(t => t.title) : [] 
        }));

        resolve(formattedList);
      })
      .catch(err => {
        console.error('云数据库读取失败', err);
        reject(err);
      });
  });
}
