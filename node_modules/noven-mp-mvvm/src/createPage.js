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