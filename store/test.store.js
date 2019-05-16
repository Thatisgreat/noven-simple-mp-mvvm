const NovenX = require('../utils/novenX.js');

module.exports = new NovenX({
	state: {
		novenxHello: 'zzzzzzzz'
	},
	actions: {

	},
	mutations: {
		changeTest(newValue) {
			this.novenxHello = newValue;
		}
	}
})