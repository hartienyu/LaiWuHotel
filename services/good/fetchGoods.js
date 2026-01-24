import { config } from '../../config/index';

/** 获取酒店列表 (云开发版) */
export function fetchGoodsList(pageIndex = 1, pageSize = 20) {
  const db = wx.cloud.database();
  const skipCount = Math.max(0, (pageIndex - 1) * pageSize);

  return new Promise((resolve, reject) => {
    // 🟢 确保这里是 'hotels'，对应你之前导入的酒店数据集合
    db.collection('hotels') 
      .skip(skipCount)
      .limit(pageSize)
      .get()
      .then(res => {
        // 数据格式转换
        const formattedList = res.data.map(item => ({
          spuId: item._id,               
          name: item.name,               
          score: item.score || 4.5,      // 防止没分数的报错
          tags: item.tags || [],         
          hotelImages: item.hotelImages || [], 
          roomList: item.roomList || [], 
        }));

        resolve(formattedList);
      })
      .catch(err => {
        console.error('云数据库读取失败', err);
        reject(err);
      });
  });
}