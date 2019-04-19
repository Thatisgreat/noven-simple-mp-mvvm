const Noven = require('./noven.js')

function createPage(options) {
  let params = {};
  params.$options = options;

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
  },(nv)=> {
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

function getLastData(nvm,options) {
  let keys = [];
  let obj = {};

  let { data, computed } = options
  if(data) keys.push(...Object.keys(data))
  if(computed) keys.push(...Object.keys(computed))

  keys.forEach(key => obj[key] = nvm[key])  
  return obj;
}


module.exports = createPage