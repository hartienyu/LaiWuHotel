import {
    getSearchHistory,
    getSearchPopular,
} from '../../../services/good/fetchSearchHistory';

Page({
    data: {
        historyWords: [],
        popularWords: [],
        searchValue: '',
        dialog: {
            title: '确认删除当前历史记录',
            showCancelButton: true,
            message: '',
        },
        dialogShow: false,
    },

    deleteType: 0,
    deleteIndex: '',

    onShow() {
        this.queryHistory();
        this.queryPopular();
    },

    async queryHistory() {
        try {
            const data = await getSearchHistory();
            const code = 'Success';
            if (String(code).toUpperCase() === 'SUCCESS') {
                const { historyWords = [] } = data;
                this.setData({
                    historyWords,
                });
            }
        } catch (error) {
            console.error(error);
        }
    },

    async queryPopular() {
        try {
            const data = await getSearchPopular();
            const code = 'Success';
            if (String(code).toUpperCase() === 'SUCCESS') {
                const { popularWords = [] } = data;
                this.setData({
                    popularWords,
                });
            }
        } catch (error) {
            console.error(error);
        }
    },

    confirm() {
        const { historyWords } = this.data;
        const { deleteType, deleteIndex } = this;
        historyWords.splice(deleteIndex, 1);
        if (deleteType === 0) {
            this.setData({
                historyWords,
                dialogShow: false,
            });
        } else {
            this.setData({ historyWords: [], dialogShow: false });
        }
    },

    close() {
        this.setData({ dialogShow: false });
    },

    handleClearHistory() {
        const { dialog } = this.data;
        this.deleteType = 1;
        this.setData({
            dialog: {
                ...dialog,
                message: '确认删除所有历史记录',
            },
            dialogShow: true,
        });
    },

    deleteCurr(e) {
        const { index } = e.currentTarget.dataset;
        const { dialog } = this.data;
        this.deleteIndex = index;
        this.setData({
            dialog: {
                ...dialog,
                message: '确认删除当前历史记录',
                deleteType: 0,
            },
            dialogShow: true,
        });
    },

    handleHistoryTap(e) {
        const { historyWords } = this.data;
        const { dataset } = e.currentTarget;
        const _searchValue = historyWords[dataset.index || 0] || '';
        if (_searchValue) {
            // 跳转到民宿搜索结果页（discover 数据），参数名为 q
            wx.navigateTo({
                url: `/pages/search/search?q=${encodeURIComponent(_searchValue)}`,
            });
        }
    },

    handleSubmit(e) {
        // 兼容多种组件回调格式：
        // - e.detail 可能是字符串（直接返回值）
        // - e.detail.value 可能是字符串（表单场景）
        // - e.detail.value 也可能为对象（表单中有多个字段）
        let value = '';
        if (e && e.detail !== undefined && e.detail !== null) {
            if (typeof e.detail === 'string') {
                value = e.detail;
            } else if (typeof e.detail.value === 'string') {
                value = e.detail.value;
            } else if (typeof e.detail.value === 'object' && e.detail.value.searchValue) {
                value = e.detail.value.searchValue;
            } else if (typeof e.detail.searchValue === 'string') {
                value = e.detail.searchValue;
            }
        }
        value = String(value || '').trim();
        if (value.length === 0) return;
        // 跳转到民宿搜索结果页（discover 数据），参数名为 q
        wx.navigateTo({
            url: `/pages/search/search?q=${encodeURIComponent(value)}`,
        });
    },
});