const Noven = require('./noven.js')

module.exports = class Store {
  constructor(options) {
  	this.$options = options;
  	//保存所有action
  	this._actionsSubscribers = {};
  	//保存所有mutation
  	this._mutationsSubscribers = {};
  	//不允许直接修改vuex中的值
  	this.$committing = false;


  	//执行store的初始化工作
  	this.initState();

  	//初始化所有actions 和 mutations
  	this.initMethods();


  	//不允许直接修改state的值
  	let nvm = this._nvm;

  	this._nvm.$watch(function() {
  		return getLastData(nvm,options)
  	},(nv)=> {
  		if(!this.$committing) {
  			console.warn('只能通过commit修改state的值');
  		}
  	},{
  		deep: true
  	})
  }


	//Store的state实际上就是一个Vue实例，也就是Noven实例
	//这个实例只具备data和computed（实际上对应vuex中的getters）
  initState() {
		let { state: data = {}, computed = {} } = this.$options;

		this._nvm = new Noven({
			data,
			computed
		})

		//代理一下，将 $options中配置的所有的state和computed都代理到this.$store
		//可以通过 this.$store.xxx 来访问 this.$store._nvm 
		function defineReactive(obj,key) {
			Object.defineProperty(obj,key,{
				enumerable: true,
        configurable: true,
				get() {
					return this._nvm[key];
				},
				set(nv) {
					this._nvm[key] = nv;
				}
			})
		}

		Object.keys(data).forEach(key => defineReactive(this,key));
		Object.keys(computed).forEach(key => defineReactive(this,key));
	}


	//初始化所有actions 和 mutations
  initMethods() {
		let { actions = {}, mutations = {} } = this.$options;
		let _this = this;

		//工厂模式
		function factory(server,name) {
			if(!Object.prototype.toString.call(server).includes('Object')) return;
			Object.entries(server).forEach(([key,value]) => {
				if(name !== '_actions') 
					//mutation
					_this[`${name}Subscribers`][key] = function() {
						return value.call(_this,...arguments);
					}
				else 
					//action
					_this[`${name}Subscribers`][key] = function() {
						return Promise.resolve().then(() => value.call(_this,...arguments))
					};
			})
		}

		factory(actions,'_actions');
		factory(mutations,'_mutations');
	}


	//触发actions
	dispatch(actionName, params) {
		if(!actionName) {
			console.warn('dispatch要触发的action不能为空！');
			return;
		}

		let action = this._actionsSubscribers[actionName];

		if(!action) {
			console.warn(`action[${actionName}]不存在！`);
			return;
		}

		return action(params);
	}

	//触发mutations
	commit(mutationName, params) {
		if(!mutationName) {
			console.warn('commit要触发的mutation不能为空！');
			return;
		}

		let mutation = this._mutationsSubscribers[mutationName];

		if(!mutation) {
			console.warn(`mutation[${mutationName}]不存在！`);
			return;
		}	

		//只有mutation才允许改变state
		this.$committing = true;
		mutation(params);
		this.$committing = false;
	}
}


function getLastData(nvm,options) {
  let keys = [];
  let obj = {};

  let { state, computed } = options
  if(state) keys.push(...Object.keys(state))
  if(computed) keys.push(...Object.keys(computed))

  keys.forEach(key => obj[key] = nvm[key])  
  return obj;
}