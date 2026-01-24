import { config } from '../../config/index';

export function fetchGoodsList(pageIndex = 1, pageSize = 20) {
  const db = wx.cloud.database();
  const skipCount = Math.max(0, (pageIndex - 1) * pageSize);

  return new Promise(async (resolve, reject) => {
    try {
      const res = await db.collection('hotels')
        .skip(skipCount)
        .limit(pageSize)
        .get();
      
      const list = res.data;
      
      // 收集需要换取链接的 CloudID
      let cloudIDs = [];
      list.forEach(item => {
        if (Array.isArray(item.hotelImages)) {
          cloudIDs.push(...item.hotelImages.filter(id => id.startsWith('cloud://')));
        }
        if (Array.isArray(item.roomList)) {
          item.roomList.forEach(room => {
            if (Array.isArray(room.roomImages)) {
              cloudIDs.push(...room.roomImages.filter(id => id.startsWith('cloud://')));
            }
          });
        }
      });
      
      cloudIDs = [...new Set(cloudIDs)];

      let urlMap = {};
      if (cloudIDs.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < cloudIDs.length; i += batchSize) {
          const batch = cloudIDs.slice(i, i + batchSize);
          const urlRes = await wx.cloud.getTempFileURL({ fileList: batch });
          urlRes.fileList.forEach(f => {
            urlMap[f.fileID] = f.tempFileURL;
          });
        }
      }

      // 格式化数据
      const formattedList = list.map(item => {
        const replaceImgs = (imgs) => (imgs || []).map(id => urlMap[id] || id);

        return {
          spuId: item._id,
          name: item.name,
          score: item.score || 4.8,
          tags: item.tags || [],
          hotelImages: replaceImgs(item.hotelImages),
          
          // 🟢 重点修改在这里：给每个房间加上 id
          roomList: (item.roomList || []).map((room, index) => ({
            ...room,
            // 生成唯一ID：酒店ID_索引 (例如：hotel123_0)
            id: `${item._id}_${index}`, 
            roomImages: replaceImgs(room.roomImages)
          }))
        };
      });

      resolve(formattedList);

    } catch (err) {
      console.error('获取数据失败', err);
      resolve([]);
    }
  });
}