

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

如上述，用的Create React App建的项目

图片素材来源于网上，分辨率有区别是否为PC和手机，具体用户界面未做太多美化，支持局域网联机对战

### 游戏规则

游戏内不包含吃碰胡的判定，甚至理牌也需要自己理，玩家都可以手动操作，所以理论是此项目兼容任何没有**梅兰竹菊**的麻将玩法

### PC效果
![pc](https://raw.githubusercontent.com/h93910/BanMahjongGame/main/show/pc.jpg)

### 手机效果
![phone](https://raw.githubusercontent.com/h93910/BanMahjongGame/main/show/phone.jpg)

## 运行

这里包括了服务器和客户端代码了，先跑服务器，再跑客户端渲染

### `服务器`

* 目前上传的代码为ＡＩ牌全部显示，玩家牌不显示，要隐藏ＡＩ牌请自行修改（./MahjongGame.js          this.show_ai_cards = true//是否显示ai的牌）

用的websocket来做，功能有房间登记，游戏逻辑处理

根目录运行: 
```console
node　webSocketServer.js
```

### `客户端`

根目录运行:
```console
yarn start
```
然后浏览器，[http://localhost:3000/](http://localhost:3000/)

游戏操作自行研究，正常操作可正常游戏．已知存在非常规操作后出现的问题，但未解决，有需求可自修

```python
已在安卓端实践过使用**Termux**开服务器，再开热点让朋友连接后成功进行局域网游玩
```

## Learn More

目前两种AI,只在主页添加ＡＩ时写入值：

0，Monkey AI，只会抓牌和随机出牌，不会别的操作

1，Jong AI，用的某位老哥的日本麻将ＡＩ，我改为广东牌的形式，鸡胡即可，规则写了只吃上家，全局可碰，会杠会胡

他的项目地址为：[https://github.com/Jimboom7/AlphaJong](https://github.com/Jimboom7/AlphaJong)
