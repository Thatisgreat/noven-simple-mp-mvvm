//page页面，替换Page
// const { createPage } = require('noven-mp-mvvm')
const createPage = require('../../utils/createPage.js')
const testStore = require('../../store/test.store.js')
const helloStore = require('../../store/hello.store.js')

createPage({
  data: {
    test:'hello'
  },
  computed: {
    novenX() {
      return testStore.novenxHello
    },
    novenX2() {
      return helloStore.test
    },
  },
  methods: {
    changeTest() {
      this.test = Math.random();
    },
    changeNovenXTest() {
      testStore.commit('changeTestMutation',Math.random());
    },
    changeNovenXTestAsync() {
      testStore
      .dispatch('changeTestAction',Math.random())
      .then(() => {
        console.log('in')
      })
    },
    changeNovenX2Test() {
      helloStore.commit('test',['zhangsan','li4','wang5','ma6'][Math.ceil(Math.random() * 3)]);
    }
  },
  watch: {
    novenX(nv) {
      console.log(nv)
    }
  },

  onLoad(query) {
    console.log(query)
  },

  onReady() {
    // console.log(this)
  },

  onUnload() {
    console.log(this)
  },

  config: {
    
  }
})

