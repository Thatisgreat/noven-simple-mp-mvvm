//page页面，替换Page
const { createPage } = require('noven-mp-mvvm')
const testStore = require('../../store/test.store.js')

createPage({
  data: {
    test:'hello'
  },
  computed: {
    novenX() {
      return testStore.novenxHello
    }
  },
  methods: {
    changeTest() {
      this.test = Math.random();
      testStore.dispatch('changeTestAction',Math.random());
    },
    changeNovenXTest() {
      testStore.commit('changeTestMutation',Math.random());
    }
  },
  watch: {
    novenX(nv) {
      console.log(nv)
    }
  },

  onLoad(query) {
    console.log('in')
  },

  onReady() {
    // console.log(this)
  },

  config: {
    
  }
})

