const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    return {
      code: 0,
      openid: wxContext.OPENID || '',
      appid: wxContext.APPID || '',
      unionid: wxContext.UNIONID || '',
      // 同时保留 tcbContext 可选项
      tcbContext: wxContext,
    };
  } catch (err) {
    console.error('login cloud error', err);
    return { code: 1, message: err.message || 'login error' };
  }
};