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
    if(options.onLoad) options.onLoad.call(this._nvm,query);
  }

  params.onReady = function() {
    if(options.onReady) options.onReady.call(this._nvm);
  }

  params.onUnload = function() {
    this._nvm.$destroy();
    if(options.onUnload) options.onUnload.call(this._nvm);
  }

  Page(params)
}



function initNvm(wxPage,options) {
  let nvm = new Noven(options)
  nvm.$wxPage = wxPage;
  wxPage._nvm = nvm;
  nvm.$options = options

  //初始化首屏数据
  initState(nvm)
  //初始化所有事件
  initMethods(nvm);

  nvm.$watch(()=>{
    return getLastData(nvm,options)
  },(nv,ov)=> {
    wxPage.setData(diff(nv,ov),function() {
      nextTick(nv,ov,nvm,options,wxPage)
    })
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

function nextTick(nv,ov,nvm,options,wxPage) {
  //这里打印出界面的数据变化
  let computed = {};
  if(computed) {
    Object.entries(options.computed).forEach(([key,func])=> {
      computed[key] = func.call(nvm);
    })
  }
  console.groupCollapsed(`--- ${wxPage.route}界面数据变化 ---`);
　　　　console.log("---diff---:",diff(nv,ov));
　　　　console.log("---data---",nvm.$data);
　　　　console.log("---computed---",computed);
　　 console.groupEnd();
}

function getLastData(nvm,options) {
  let keys = [];
  let obj = {};

  let { data, computed } = options

  if(data) keys.push(...Object.keys(data))
  if(computed) keys.push(...Object.keys(computed))

  keys.forEach(key => obj[key] = cloneDeep(nvm[key]))  
  return obj;
}

//微信里新旧data都是对象
function diff(newData,oldData) {
    if(!newData) return {};

    let _diff = [];

    function diffData(path,nv,ov) {
        //表示没有修改
        if(nv === ov) return false;

        //如果新值存在，旧值不存在，则返回新值
        if(!nv || !ov) return _diff.push([path,nv])

        //如果新值和旧值数据类型不一样
        if(!isSameDataType(nv,ov)) return _diff.push([path,nv])

        //数据类型一致
        //简单类型       
        if(isSimpleDataType(nv) && isSimpleDataType(ov) && nv !== ov) return _diff.push([path,nv]);
        
        let obj = false; 
        //如果都是数组，判断长度是否一致，如果长度不一致，返回新值
        //如果长度一致，diff判断每一项
        
        if(Array.isArray(nv)) {
            if(nv.length !== ov.length) return _diff.push([path,nv]);

            //长度相同，需要判断内部的每一项
            nv.forEach((item,index) => {
               let fullPath = path ? `${path}[${index}]` : `${index}`;
               diffData(`${path}[${index}]`,item,ov[index]);
            })
        }
        
        
        //如果都是对象，递归判断每一项
        if(isObject(nv)) {
           for(let k in nv) {
              //首先比较新对象与旧对象的所有key，如果新对象有，旧对象没有的则返回这个key                    
              if(!nv.hasOwnProperty(k)) {
                obj = obj || [];
                obj.push([`${obj}.${k}`,nv[k]])
                continue;
              }

              //都有相同key，进行diff比较
              let fullPath = path ? `${path}.${k}` : k;
              diffData(fullPath,nv[k],ov[k]);
           }
        } 
    }

    diffData('',newData,oldData);

    let obj = {};
    _diff.forEach(([path,value]) => {
      obj[path] = value
    })

    return obj
}



//是否是相同的数据类型
function isSameDataType(a,b) {
    return Object.prototype.toString.call(a) === Object.prototype.toString.call(b) 
}
//是否是简单数据类型
function isSimpleDataType(data) {
    return ['string','boolean','undefined','number'].includes(typeof data); 
}

function isObject(obj) {
    return Object.prototype.toString.call(obj).includes('Object');
}

function isObjectOrArray(obj) {
    return Object.prototype.toString.call(obj).includes('Object') || Array.isArray(obj);
}


function cloneDeep(obj) {
  if (!isObjectOrArray(obj)) return obj

  let result

  if (Array.isArray(obj)) {
    result = []

    obj.forEach(item => {
      result.push(cloneDeep(item))
    })
    return result
  }

  return ext({}, obj)
}


function ext(target, source) {
  if (isObjectOrArray(source) && isObjectOrArray(target)) {
    for (let key in source) {
      let item = source[key]

      if (isObjectOrArray(item)) {
        if (isObject(item) && !isObject(target[key])) {
          target[key] = {}
        } else if (Array.isArray(item) && !Array.isArray(target[key])) {
          target[key] = []
        }

        ext(target[key], item)
      } else {
        target[key] = item
      }
    }
  }

  return target
}


module.exports = createPage