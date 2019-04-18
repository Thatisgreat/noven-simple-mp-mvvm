let uid = 1;

class Noven {
	constructor($options) {
		this.$options = $options;
		this._computedWatchers = null;
		this._data = null;

		this.initProxy();
		this.initLifeCycle();
		this.initComputed();
		this.initWatch();

		this.initMethods();
	}

	//初始化data数据代理
	initProxy() {
		if(!this.$options.data) return;

		let { data } = this.$options;
		this._data = data;

		this.walk(this._data, true);
	}

	//生命周期
	initLifeCycle() {
		let { 
			created
		} = this.$options;

		//执行created生命周期
		if(created) created.call(this);
	}
	//计算属性
	initComputed() {
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
	initWatch() {
		if(!this.$options.watch) return;
		Object.entries(this.$options.watch).forEach(([key,value]) =>{
			//每一个watch都是一个watcher
			new Watcher(this,key,value);
		})
	}

	//methods对象
	initMethods() {
		if(!this.$options.methods) return;

		Object.entries(this.$options.methods).forEach(([key,value]) =>{
			this[key] = value.bind(this,...arguments);
		})
	}



	/**
	 * [walk 遍历对象，对每个key进行代理]
	 * @Author   罗文
	 * @DateTime 2019-04-11
	 * @param    {[Object]}   obj    [description]
	 * @param    {Boolean}  isRoot [是否是根节点，如果是，则直接代理在nvm实例上，
	 * 如果不是，则绑定在对应的对象身上，如 _data.testObj.name，这个name属性就需要代理到nvm.testObj对象身上
	 * ]
	 */
	walk(obj,isRoot) {
		if(!obj || typeof obj !== 'object') return;

		Object.entries(obj).forEach(([key,value]) => {
			this.defineReactive(obj,key,value,isRoot);
		})
	}

	//进行数据的代理绑定
	defineReactive(obj,key,value,isRoot = false) {
		let dep = new Dep(key);
		//如果值是对象，需要递归代理
		this.walk(value, false);	

		let nvm = this;
		let proxyObj = isRoot ? nvm : obj;

		Object.defineProperty(proxyObj,key, {
			enumerable: true,
      configurable: true,
      get() {
      	//每次访问这个属性，如某一个computed中使用了这个属性，
      	//此时dep.depend()中的Dep.target就是这个computed对应的watcher，
      	//需要向此watcher的deps数组中添加当前dep，同时在当前dep的subs数组中添加该watcher
      	//建立 dep<->watcher的依赖关系
      	dep.depend();
        return value
      },
      set(newValue) {
      	if( value === newValue ) return;
        nvm.walk(newValue, false);
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

//自定义对一个对象进行监听
Noven.prototype.$watch = function(keyOrObjFunc,cb,option) {
	if(typeof keyOrObjFunc === 'string' || typeof keyOrObjFunc === 'function') {
		new Watcher(this,keyOrObjFunc,cb);
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
	this.subs.push(watcher)
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
	this.subs.forEach(watcher => {
		watcher.update();
	})
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
function Watcher(nvm,funcOrExp,cb) {
	this.id = uid ++;
	this.deps = []; //保存所有的dep
	this.depIds = [];  //保存所有的depId，不会重复
	this.cb = cb || noop; //依赖变化后的回调
	this.nvm = nvm;

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

	if( !this.depIds.includes(depId) ) {
		//将dep保存到watcher的deps依赖数组中
		this.deps.push(dep);
		this.depIds.push(depId);
		//同时，在dep的subs数组中，也新增watcher依赖
		dep.addSubs(this);
	}
}


//实例化watcher的时候，将这个watcher绑定到Dep类的静态属性target身上
//其后实例化出来的所有dep，都有这个target，且是同一个watcher
Watcher.prototype.pushTarget = function() {
	Dep.target = this;
}

//实例化watcher的时候，需要计算当前watcher对应的value，并且将当前watcher
//保存到Dep.target身上
Watcher.prototype.get = function() {
	this.pushTarget();
	return this.getter.call(this.nvm)
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
  if (value !== this.value) {
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


module.exports = Noven
