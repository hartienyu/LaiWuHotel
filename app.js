import updateManager from './common/updateManager';

App({
    onLaunch() {
        if (!wx.cloud) {
            console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        } else {
            wx.cloud.init({
                env: 'cloud1-6g8tcpm9a4ef8050',
                traceUser: true,
            });

            // 启动时优先检查本地 userId；不存在则跳登录页（避免未部署云函数时报错）
            const cachedUserId = wx.getStorageSync('userId');
            if (cachedUserId) {
                this.globalData.userId = cachedUserId;
            } else {
                // 直接跳转登录页，登录页会在用户确认后调用 ensureLoginAtStartup
                this.forceLogin();
            }
        }
    },

    /**
     * 确保在需要时获取 userId（供登录页调用）
     * 返回 Promise，成功时 resolve(userId)，失败 reject(err)
     */
    ensureLoginAtStartup() {
      return new Promise((resolve, reject) => {
        const cachedUserId = wx.getStorageSync('userId');
        if (cachedUserId) {
          this.globalData.userId = cachedUserId;
          resolve(cachedUserId);
          return;
        }
    
        wx.cloud.callFunction({
          name: 'login',
          success: (res) => {
            console.log('login 云函数返回：', res);
            const result = res && res.result ? res.result : {};
    
            // 兼容多种可能字段名与 tcbContext 结构
            const openId =
              result.openid ||
              result.openId ||
              result.OPENID ||
              (result.tcbContext && (result.tcbContext.OPENID || result.tcbContext.openid)) ||
              '';
    
            if (!openId) {
              console.warn('login 云函数未返回 openid，result =', result);
              return reject(new Error('未获取 openid，请确认 cloudfunctions/login 已部署且返回 OPENID'));
            }
    
            wx.setStorageSync('userOpenId', openId);
    
            wx.cloud.callFunction({
              name: 'ensureUser',
              data: {},
              success: (r) => {
                console.log('ensureUser 返回：', r);
                const rr = r && r.result ? r.result : {};
                if (rr && rr.code === 0 && rr.userid) {
                  const userid = rr.userid;
                  wx.setStorageSync('userId', userid);
                  this.globalData.userId = userid;
                  resolve(userid);
                } else {
                  console.warn('ensureUser 未返回有效 userid：', rr);
                  reject(new Error('ensureUser 未返回 userid'));
                }
              },
              fail: (err) => {
                console.error('调用 ensureUser 失败', err);
                reject(err);
              },
            });
          },
          fail: (err) => {
            console.error('login 云函数调用失败', err);
            reject(err);
          },
        });
      });
    },

    onShow() {
        updateManager();
    },

    globalData: {
        isLogin: false,
        token: '',
        userId: '',
    },

    silentLogin() {
        wx.login({
            success: (res) => {
                if (res.code) {
                    console.log('获取到的登录凭证 code:', res.code);
                }
            },
        });
    },

    /**
     * 优先检测 userId 再检测 token
     */
    checkLogin() {
        if (this.globalData.isLogin) return true;

        const userId = this.globalData.userId || wx.getStorageSync('userId');
        if (userId) {
            this.globalData.userId = userId;
            this.globalData.isLogin = true;
            return true;
        }

        const token = wx.getStorageSync('token');
        if (token) {
            this.globalData.isLogin = true;
            return true;
        }

        this.forceLogin();
        return false;
    },

    forceLogin() {
        console.log('👉 强制跳转登录页');
        // 如果当前不是登录页面则跳转（避免重复跳转）
        const pages = getCurrentPages();
        const current = pages.length ? pages[pages.length - 1] : null;
        const currentRoute = current ? `/${current.route}` : '';
        if (currentRoute !== '/pages/login/index') {
            wx.navigateTo({
                url: '/pages/login/index',
            });
        }
    },
});