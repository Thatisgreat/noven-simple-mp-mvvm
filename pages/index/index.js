//index.js
//获取应用实例
const createPage = require('../../utils/createPage.js')

let page = {
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  computed: {
    sayMotto() {
      return this.motto + ' ' + this.hasUserInfo
    }
  },
  methods: {
    changeData() {
      this.motto = Math.random().toFixed(2);

      this.helloMotto(this.motto);
    },
    helloMotto(nv) {
      // console.log('hahaha' + nv)
    }
  },
  watch: {
    motto(nv,ov) {
      this.helloMotto(nv);
    }
  },

  onLoad(query) {
    this.changeData();
  },

  onReady() {
    // console.log(this)
  }
}

createPage(page)




