module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = { exports: {} }; __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); if(typeof m.exports === "object") { Object.keys(m.exports).forEach(function(k) { __MODS__[modId].m.exports[k] = m.exports[k]; }); if(m.exports.__esModule) Object.defineProperty(__MODS__[modId].m.exports, "__esModule", { value: true }); } else { __MODS__[modId].m.exports = m.exports; } } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1558491691502, function(require, module, exports) {
const Noven = require('./src/noven.js')
const NovenX = require('./src/novenX.js')
const createPage = require('./src/createPage.js')

module.exports = {
	Noven,
	NovenX,
	createPage
}

}, function(modId) {var map = {"./src/noven.js":1558491691503,"./src/novenX.js":1558491691504,"./src/createPage.js":1558491691505}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1558491691503, function(require, module, exports) {
let uid = 1;
let targetStack = []; //保存所有的target
let arrayHandler = handleArray();


//核心类
class Noven {
	constructor($options) {
		this.$options = $options;
		this._computedWatchers = null;
		this.$data = null;

		this.init($options);

		this.initProxy();
		this.initComputed();
		this.initWatch();
		this.initMethods();
		this.initLifeCycle();
	}

	/**
	 * [walk 遍历对象，对每个key进行代理]
	 * @Author   罗文
	 * @DateTime 2019-04-11
	 * @param    {[Object]}   obj    [description]
	 * @param    {Boolean}  isRoot [是否是根节点，如果是，则直接代理在nvm实例上，
	 * 如果不是，则绑定在对应的对象身上，如 $data.testObj.name，这个name属性就需要代理到nvm.testObj对象身上
	 * ]
	 */
	walk(obj,isRoot) {
		if(!obj || typeof obj !== 'object') return;

		Object.entries(obj).forEach(([key,value]) => {
			this.defineReactive(obj,key,value,isRoot);
		})
	}

	/**
	 * [walkArray 遍历数组，对每个key进行代理]
	 * @Author   罗文
	 * @DateTime 2019-04-11
	 * @param    {[Array]}   arr    [要代理的数组]
	 * ]
	 */
	walkArray(arr) {
		if(!arr || !Array.isArray(arr)) return;

		arr.__proto__ = arrayHandler;

		//给数组的每一项添加代理，这里用forEach要报错
		for(let i = 0 ; i < arr.length ; i ++ ) {
			this.walk(arr[i]);
		}
	}

	//进行数据的代理绑定
	defineReactive(obj,key,value,isRoot = false) {
		let dep = new Dep(key);

		if(isObject(value) || Array.isArray(value)) defineDep(value,dep);

		//如果值是数组，需要循环添加代理
		if(Array.isArray(value)) {
			this.walkArray(value);
		}	else {
			//如果值是对象，需要递归代理
		  this.walk(value, false);
		}

		let nvm = this;
		let proxyObj = isRoot ? nvm : obj;

		Object.defineProperty(proxyObj,key, {
			enumerable: true,
      configurable: true,
      get() {
      	// if(key == 'student') debugger
      	//每次访问这个属性，如某一个computed中使用了这个属性，
      	//此时dep.depend()中的Dep.target就是这个computed对应的watcher，
      	//需要向此watcher的deps数组中添加当前dep，同时在当前dep的subs数组中添加该watcher
      	//建立 dep<->watcher的依赖关系
      	dep.depend();
        return value
      },
      set(newValue) {
      	if( value === newValue ) return;

      	if(isObject(newValue) || Array.isArray(newValue)) defineDep(newValue,dep);
      	//如果值是数组，需要循环添加代理
				if(Array.isArray(newValue)) {
					nvm.walkArray(newValue);
				}	else {
					nvm.walk(newValue, false);
				}
        
        value = newValue
        dep.notify();
      }
		})
	}

	/**
	 * [defineComputed 进行computed的代理绑定]
	 * @Author   罗文
	 * @DateTime 2019-04-11
	 * @param    {[String]}   key  [computed的键]
	 * @param    {[Function]}   func [计算computed值的表达式]
	 */
	defineComputed(key,func) {
		let nvm = this;
		Object.defineProperty(nvm,key, {
			enumerable: true,
      configurable: true,
      get() {
        return func.call(nvm);
      },
      set(newValue) {
      	console.warn('不能设置computed的值')
      }
		})
	}
}

//可以进行一些额外的初始化工作，在所有任务开始之前
//如添加store，添加mixins等
Noven.prototype.init = function(options) {}


//初始化data数据代理
Noven.prototype.initProxy = function() {
	if(!this.$options.data) return;

	let { data } = this.$options;
	this.$data = data;

	this.walk(this.$data, true);
}

//生命周期
Noven.prototype.initLifeCycle = function() {
	let { 
		created
	} = this.$options;

	//执行created生命周期
	if(created) created.call(this);
}
//计算属性
Noven.prototype.initComputed = function() {
	if(!this.$options.computed) return;
	//就是用来保存computed相关watcher的
	let watchers = this._computedWatchers = Object.create(null);

	Object.entries(this.$options.computed).forEach(([key,value]) =>{
		//如果computed是一个函数，则直接把这个函数做为这个computed得到的key的getter
		//如果是对象，则取这个对象的get
		let getter = typeof value === 'function' ? value : value.get;
		getter = getter || noop;

		//每一个computed都是一个watcher
		watchers[key] = new Watcher(this,getter,noop);

		//将每一个computed的key，代理到nvm身上，可以通过this.xxx来访问这个computed
		this.defineComputed(key,getter);
	})
}
//watch对象
Noven.prototype.initWatch = function() {
	if(!this.$options.watch) return;
	Object.entries(this.$options.watch).forEach(([key,value]) =>{
		//每一个watch都是一个watcher
		new Watcher(this,key,value);
	})
}

//methods对象
Noven.prototype.initMethods = function() {
	if(!this.$options.methods) return;

	Object.entries(this.$options.methods).forEach(([key,value]) =>{
		this[key] = value.bind(this,...arguments);
	})

}


//自定义对一个对象进行监听
Noven.prototype.$watch = function(keyOrObjFunc,cb,option) {
	if(typeof keyOrObjFunc === 'string' || typeof keyOrObjFunc === 'function') {
		new Watcher(this,keyOrObjFunc,cb,option);
	}
}






/*  --------- Dep 相关 ---------  */
/*
  Dep的作用
  1、data中每一个key，都会有一个dep实例，这个实例在defineReactive生命，并且被闭包一直缓存着
    let dep = new Dep();
    Object.defineProperty中的get和set,每次执行，都是用的缓存的dep实例，如
    dep.depend();
    dep.notify();
    Dep.target.addDep(this) 中的this;
  2、
 */
function Dep(key) {
	this.name = key;
	this.id = uid ++;
	this.subs = [];
}

Dep.prototype.addSubs = function(watcher) {
	let { id } = watcher;
	//相同watcher只添加一次
	if(!this.subs.find(sub => sub.id === id)) this.subs.push(watcher);
}

Dep.prototype.removeSub = function(watcher) {
	let index = this.subs.findIndex(sub => sub.id === watcher.id);
	if(index > -1) this.subs.splice(index,1);
}

// 将dep添加到对应的watcher实例中，建立watcher -> dep直接的依赖关系
// Dep.target 就是 new Watcher的实例
// 一个watcher对应多个dep，如果data有多个key，则最后watcher的deps数组就含有所有key的deps
Dep.prototype.depend = function() {
	if( Dep.target ) {
		Dep.target.addDep(this);
	}
}

//给属性设置新值会触发setter，同时会触发闭包的dep的更新
//循环subs数组，触发每个watcher的更新
Dep.prototype.notify = function() {
	for (var i = 0, l = this.subs.length; i < l; i++) {
    this.subs[i].update();
  }
}



/* ----------- Watcher 相关 ------- */

/**
 * [Watcher 构造函数，建立与属性的依赖]
 * @Author   Noven
 * @DateTime 2019-04-11
 * @param    {[Object]}   nvm        [框架的实例化对象]
 * @param    {[type]}   funcOrExp [函数或者表达式]
 * @param    {Function} cb        [属性变化的回调函数]
 */
function Watcher(nvm,funcOrExp,cb,options) {
	this.id = uid ++;

	this.newDeps = []; //保存本次事件循环中所有的dep
	this.newDepIds = [];  //保存本次事件循环中所有的depId，不会重复
	this.deps = []; //保存上次事件循环所有的dep
	this.depIds = [];  //保存上次事件循环所有的depId，不会重复

	this.cb = cb || noop; //依赖变化后的回调
	this.nvm = nvm;
	this.deep = options && options.deep;

	//将传入的函数或表达式做为watcher实例的getter
	//如果funcOrExp不是函数，则可能是watch对象，此时的funcOrExp就是每个watch对应的key
	this.getter = typeof funcOrExp === 'function' ? funcOrExp : (()=> {
		if(typeof funcOrExp !== 'string' || !funcOrExp.includes('.')) return nvm[funcOrExp]

		//可以接收 hello => this.hello      testObj.hello => this.testObj.hello	
		let propSplit = funcOrExp.split('.');
		let value = nvm;
		propSplit.forEach(key => value = value[key]);
		
		return value
	});

	this.value = this.get()
}

//添加一个dep
//每次获取属性如，this.name，都会触发getter，也都会触发addDep操作，所以需要不会重复添加同一个dep
Watcher.prototype.addDep = function(dep) {
	let depId = dep.id;

	if( !this.newDepIds.includes(depId) ) {
		//将dep保存到watcher的deps依赖数组中
		this.newDeps.push(dep);
		this.newDepIds.push(depId);
		//同时，在dep的subs数组中，也新增watcher依赖
		dep.addSubs(this);
	}
}


//实例化watcher的时候，将这个watcher绑定到Dep类的静态属性target身上
//其后实例化出来的所有dep，都有这个target，且是同一个watcher
Watcher.prototype.pushTarget = function() {
	targetStack.push(this)
	Dep.target = this;
}

//多数情况下，Dep.target应该为null
//只有在watcher取值的时候（new的时候和update的时候），才有 Dep.target = watcher
//所以用完就要清掉
Watcher.prototype.popTarget = function() {
	targetStack.pop()
	Dep.target = targetStack[targetStack.length - 1];
}

//
Watcher.prototype.cleanDeps = function() {
	var i = this.deps.length;
  while (i--) {
    var dep = this.deps[i];
    if (!this.newDepIds.includes(dep.id)) {
      dep.removeSub(this);
    }
  }
  var tmp = this.depIds;
  this.depIds = this.newDepIds;
  this.newDepIds = tmp;
  this.newDepIds = [];

  tmp = this.deps;
  this.deps = this.newDeps;
  this.newDeps = tmp;
  this.newDeps = [];
}

//实例化watcher的时候，需要计算当前watcher对应的value，并且将当前watcher
//保存到Dep.target身上
Watcher.prototype.get = function() {
	this.pushTarget();
	let value;
	try {
	  value = this.getter.call(this.nvm);
	}catch(e) {
	  console.error('获取初始值失败！')
	}finally {
	  // if(this.deep) deepTransfer(value);
	  deepTransfer(value);
	}

	this.popTarget();
	this.cleanDeps()
	return value;
}

//每次依赖属性的改变，都会触发dep下所有的watcher更新
Watcher.prototype.update = function() {
	//这里暂时采用同步更新
	this.run();
}

//每次update都会有同步更新和异步更新
//异步更新会推送到异步队列，采用microtasks和macrotasks的方式更新，不过最后更新时都是调用的run
//同步更新，直接调用run
Watcher.prototype.run = function() {
	//每次执行run的时候，先判断新值和旧值，不同才更新
	const value = this.get();
  if (value !== this.value || isObject(value) || Array.isArray(value) || this.deep) {
    const oldValue = this.value;
    this.value = value;
    //执行更新后的回调，一般用于watch的调用
    this.cb.call(this.nvm, value, oldValue);
    //后面就是调用diff算法，更新界面了
  }
}




//一个占位的函数，主要是用来做兼容的
//如 cb = cb || noop
function noop (a, b, c) {}
function isObject(val) {
	return Object.prototype.toString.call(val).includes('Object');
}


//拦截数组的某些操作方法
//通过调用这些方法，触发数组的dep的notify -> watcher的update -> 界面的更新
function handleArray() {
	let arrayProto = Object.create(Array.prototype);
	let arrayMethods = [
	  'push',
	  'pop',
	  'shift',
	  'unshift',
	  'splice',
	  'sort',
	  'reverse'
	];
	arrayMethods.forEach(method => {
	  Object.defineProperty(arrayProto,method,{
	    enumerable: false,
	    writable: true,
	    configurable: true,
	    value: function(...arg) {
	      //Array对应的这个方法，先取出来
	      let original = Array.prototype[method];

	      //这里就是重写方法的核心代码
	      //在初始化的时候，会给数组添加一个dep对象，保存与watcher的关系，每次调用
	      //这些方法的时候，就会触发watcher更新
	      if(this.__dep__) this.__dep__.notify()

	      //执行原数组的对应方法，返回值
	      return original.apply(this,arg);
	    }
	  })
	})

	return arrayProto;
}


//递归触发内部的每一个键，目的是为了调用每一个key的get，触发其dep.depend()
function deepTransfer(obj) {
	let set = new Set();

	function _deepTransfer(val) {
		let isObj = isObject(val);
		if(!Array.isArray(val) && !isObj) return;

		//本次递归中，同一个key的dep，只会保存一次
		let dep = val.__dep__;
		if(dep) {
			if(set.has(dep.id)) return;
		  set.add(dep.id);
		}

		if(Array.isArray(val)) {
			val.forEach(item => {
				_deepTransfer(item)
			});
		}

		if(isObj) {
			Object.entries(val).forEach(([key,value]) => {
				_deepTransfer(value)
			});
		}
	}

	_deepTransfer(obj);

}

function defineDep(obj,value) {
	Object.defineProperty(obj,'__dep__',{
    enumerable:false,
    value
  })
}


module.exports = Noven;




}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1558491691504, function(require, module, exports) {
const Noven = require('./noven.js')

module.exports = class Store {
  constructor(options) {
  	//挂载到Noven身上
  	if(!Noven) return;
  	this.$options = options;
  	//保存所有action
  	this._actionsSubscribers = {};
  	//保存所有mutation
  	this._mutationsSubscribers = {};
  	//不允许直接修改vuex中的值
  	this.$committing = false;


  	let _this = this;
  	let init = Noven.prototype.init;
  	Noven.prototype.init = function (nvmOptions) {
  		if(Object.keys(nvmOptions).includes('store')) {
  			this.$store = _this;
  		}

  		init.call(this);
  	}

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
}, function(modId) { var map = {"./noven.js":1558491691503}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1558491691505, function(require, module, exports) {
const Noven = require('./noven.js')

function createPage(options) {
  let params = {};
  params.$options = options;

  //在页面渲染之前，初始化一些配置信息，如登录拦截，methods拦截等
  initConfig(options);

  params.onLoad = function(query) {
    //初始化vue
    initNvm(this,options);
    //执行生命周期的onLoad
    if(options.onLoad) options.onLoad.call(this,query);
  }

  params.onReady = function() {
    if(options.onReady) options.onReady.call(this);
  }

  Page(params)
}



function initNvm(wxPage,options) {
  let nvm = new Noven(options)
  nvm.$wxPage = wxPage;
  nvm.$options = options

  //初始化首屏数据
  initState(nvm)
  //初始化所有事件
  initMethods(nvm);

  nvm.$watch(()=>{
    return getLastData(nvm,options)
  },(nv,ov)=> {
    wxPage.setData(nv)
  })
}


function initState(nvm) {
  let { $wxPage, $options } = nvm;
  $wxPage.setData(getLastData(nvm,$options))
}

function initMethods(nvm) {
  let { methods } = nvm.$options;

  if(!methods) return;
  Object.entries(methods).forEach(([key,value]) => {
    Object.defineProperty(nvm.$wxPage,key, {
      enumerable: true,
      configurable: false,
      get() {
        return nvm[key]
      }
    })
  })
}

function initConfig(options) {
  let { config, methods = {} } = options;

  if(!config) return;

  let { vModel } = config;

  //初始化input框的双向数据绑定，实质就是自动添加对应的bindinput
  //如v-model="hello"，则自动生成一个method: set_hello
  //只接受一层vmodel， this.hello.world是不允许的
  if(vModel) {
    vModel.forEach(model => {
      //如果methods里有同名方法，以methods为准
      if(methods[`set_${model}`]) return;

      methods[`set_${model}`] = function(e) {
        this[model] = e.detail.value;
      }
    })
  }
}

function getLastData(nvm,options) {
  let keys = [];
  let obj = {};

  let { data, computed } = options
  if(data) keys.push(...Object.keys(data))
  if(computed) keys.push(...Object.keys(computed))

  keys.forEach(key => obj[key] = nvm[key])  
  return obj;
}

function diff(nv,ov) {
  console.log(nv,ov);
  //先移除每个节点的__dep
}


module.exports = createPage
}, function(modId) { var map = {"./noven.js":1558491691503}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1558491691502);
})()
//# sourceMappingURL=index.js.map