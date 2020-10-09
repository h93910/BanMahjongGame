This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
如上述，用的Create React App建的项目

## 运行

这里包括了服务器和客户端代码了，先跑服务器，再跑客户端渲染

### `服务器`

用的websocket来做，功能有房间登记，游戏逻辑处理
根目录运行: 
node　webSocketServer.js

### `客户端`

根目录运行:
yarn start
然后浏览器，[http://localhost:3000/](http://localhost:3000/)

## Learn More

目前两种AI,只在主页添加ＡＩ时写入值：
0，Monkey AI，只会抓牌和随机出牌，不会别的操作
1，Jong AI，用的某位老哥的日本麻将ＡＩ，我改为广东牌的形式，鸡胡即可，规则写了只吃上家，全局可碰，会杠会胡
他的项目地址为：https://github.com/Jimboom7/AlphaJong](https://github.com/Jimboom7/AlphaJong)
