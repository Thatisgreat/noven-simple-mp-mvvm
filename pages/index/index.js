//page页面，替换Page
const { createPage } = require('noven-mp-mvvm')
// const createPage = require('../../utils/createPage.js')
const testStore = require('../../store/test.store.js')
const helloStore = require('../../store/hello.store.js')

createPage({
  data: {
    motto: 'Hello World',
    userInfo: {
      name:'li4',
      age: 18
    },
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  computed: {
    sayMotto() {
      return this.motto + ' ' + this.hasUserInfo
    },
    novenX() {
      return testStore.novenxHello
    },
    novenx2() {
      return helloStore.test
    }
  },
  methods: {
    changeData() {
      // this.motto = Math.random().toFixed(2);

      this.helloMotto(this.motto);
    },
    helloMotto(nv) {
      this.userInfo.age = Math.ceil(Math.random()*20);
      // testStore.commit('changeTest',Math.random());
    },
    goTo() {
      wx.navigateTo({
        url:'/pages/novenx/index?id=1'
      })
    },
    getUserInfo(e) {
      console.log(e.detail)
    }
  },
  watch: {
    motto(nv,ov) {
      // this.helloMotto(nv);
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




