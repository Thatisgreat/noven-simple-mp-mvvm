const { NovenX } = require('noven-mp-mvvm')

module.exports = new NovenX({
	state: {
		novenxHello: '0'
	},
	actions: {
		changeTest(newValue) {
			return new Promise(resolve => {
				setTimeout(()=>{
					this.commit('changeTest',newValue);
					resolve();
				},2000)
			})
		}
	},
	mutations: {
		changeTest(newValue) {
			this.novenxHello = newValue.toFixed(5);
		}
	},
})