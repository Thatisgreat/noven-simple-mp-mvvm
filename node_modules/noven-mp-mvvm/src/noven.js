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
		this._computedWatchers[key] = new Watcher(this,key,value);
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
		this._computedWatchers['_$watcher' + ++uid] = new Watcher(this,keyOrObjFunc,cb,option);
	}
}

//销毁当前vm实例
//销毁this._computedWatchers中每一个watcher
//移除每一个watcher对应的deps
//移除vm本身
Noven.prototype.$destroy = function() {
	Object.entries(this._computedWatchers).forEach(([key,watcher])=> {
		watcher.teardown()
	})
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

//销毁watcher的每一个dep
Watcher.prototype.teardown = function() {
	this.deps.forEach(dep => dep.removeSub(this));
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



