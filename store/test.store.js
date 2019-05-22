const { NovenX } = require('noven-mp-mvvm')

module.exports = new NovenX({
	state: {
		novenxHello: '0'
	},
	actions: {
		changeTestAction(newValue) {
			return new Promise(resolve => {
				setTimeout(()=>{
					this.commit('changeTestMutation',newValue);
					resolve();
				},2000)
			})
		}
	},
	mutations: {
		changeTestMutation(newValue) {
			this.novenxHello = newValue.toFixed(5);
		}
	},
})