// const { NovenX } = require('noven-mp-mvvm')
const NovenX = require('../utils/novenX.js')

module.exports = new NovenX({
	state: {
		test: 'zhangsan'
	},
	actions: {
		test(newName) {
			this.commit('test',newName)
		}
	},
	mutations: {
		test(newName) {
			this.test = newName
		}
	},
})