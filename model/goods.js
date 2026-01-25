// 简易 mock 商品数据，用于本地/测试环境
export function getGoodsList(count = 10) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      spuId: 1000 + i,
      primaryImage: `https://picsum.photos/seed/goods${i}/300/200`,
      title: `示例商品 ${i}`,
      // 单位与现有代码处理一致（服务层会以 minSalePrice/maxLinePrice 做显示/处理）
      minSalePrice: (Math.floor(Math.random() * 100) + 1) * 100,
      maxLinePrice: (Math.floor(Math.random() * 200) + 100) * 100,
      // 可选标签数组，fetchGoodsList 会读取 spuTagList 并生成 tags
      spuTagList: [{ title: '热卖' }, { title: '推荐' }],
    });
  }
  return list;
}