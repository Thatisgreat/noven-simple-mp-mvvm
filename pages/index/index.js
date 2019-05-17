//page页面，替换Page
const { createPage } = require('noven-mp-mvvm')
const testStore = require('../../store/test.store.js')


createPage({
  data: {
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  computed: {
    sayMotto() {
      return this.motto + ' ' + this.hasUserInfo
    },
    novenX() {
      return testStore.novenxHello
    }
  },
  methods: {
    changeData() {
      this.motto = Math.random().toFixed(2);

      this.helloMotto(this.motto);
    },
    helloMotto(nv) {
      // testStore.commit('changeTest',Math.random());
    },
    goTo() {
      wx.navigateTo({
        url:'/pages/novenx/index'
      })
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
  },

  config: {
    vModel: ['motto']
  }
})




