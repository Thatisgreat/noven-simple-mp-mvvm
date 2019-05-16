# noven-simple-mp-mvvm
一个简洁的双向数据绑定的原生小程序mvvm框架
与mpvue等框架的区别是：本框架是增强型框架（只增强原生小程序的功能），非编译型框架



实现的核心功能：

1. **小程序data中的数据变化，自动调用this.setData**，实现双向数据绑定

2. 实现表单元素的v-model功能

3. 实现与vuex一致的全局状态管理机-NovenX

4. 与vue基本一致的数据操作

5. ...

   


示例如下：

![](./img/1555583474308.gif)

![](./img/1557998161453098.gif)



同时有与Vue体验一致的computed，watch，methods等



## 使用方法

### 1、获取代码

`git clone https://github.com/a290079770/noven-simple-mp-mvvm.git`

项目是一个原生小程序demo



## 2、找到utils/noven.js和util/createPage.js

createPage.js对noven.js文件存在引用关系，需将这两个文件放置于同一目录，或修改引用路径

如果需要用到全局状态管理机 novenX，还需引入util/novenX.js



## 3、正常创建小程序页面文件.wxml、.wxss、.json、.js

xxx.js文件中，引入createPage

`const createPage = require('../../utils/createPage.js')`

创建页面

![](./img/1.png)



#### data、computed、watch、methods、novenX开发体验与Vue一致

具体用法参考Vue文档，<https://cn.vuejs.org/>

