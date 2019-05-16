//page页面，替换Page
const createPage = require('../../utils/createPage.js')
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
    },
    changeNovenXTest() {
      testStore.commit('changeTest',Math.random());
    }
  },
  watch: {
    
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

