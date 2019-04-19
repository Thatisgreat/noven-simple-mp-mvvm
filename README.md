# noven-simple-mp-mvvm
一个简洁的双向数据绑定的原生小程序mvvm框架



实现的功能：**小程序data中的数据变化，自动调用this.setData**，实现双向数据绑定

示例如下：

![](/Users/luowen/Desktop/1555583474308.gif)



同时有与Vue体验一致的computed，watch，methods等



## 使用方法

### 1、获取代码

`git clone https://github.com/a290079770/noven-simple-mp-mvvm.git`

项目是一个原生小程序demo



## 2、找到utils/noven.js和util/createPage.js

createPage.js对noven.js文件存在引用关系，需将这两个文件放置于同一目录，或修改引用路径



## 3、正常创建小程序页面文件.wxml、.wxss、.json、.js

xxx.js文件中，引入createPage

`const createPage = require('../../utils/createPage.js')`

创建页面

![](/Users/luowen/Desktop/1.png)



#### data、computed、watch、methods开发体验与Vue一致

具体用法参考Vue文档，<https://cn.vuejs.org/>

