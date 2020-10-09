import React from 'react';
import { w3cwebsocket } from 'websocket'
import BanTool from '../BanTool';

class Card extends React.Component {
  constructor(props) {
    super(props)
    this.card_id = 0
    this.state = {
      select: false
    }
  }

  mySelect(gameClick) {
    if (this.card_id !== "0" && gameClick !== undefined) {//为0即背面,有显示的牌，如吃碰；均无点击
      this.setState({
        select: !this.state.select
      });
      gameClick()
    }
  }

  render() {
    let n = 0
    if (this.props.number !== undefined) {
      n = this.props.number
    }
    let title = null
    if (this.props.info !== undefined) {
      const info = this.props.info
      title = Object.keys(info)[0]
      n = info[title]
    }
    if (n > 0x40) {
      n = 0
    }
    this.card_id = n.toString(16)
    //测试随机生成牌
    // cardId = Math.floor(Math.random() * 4)
    // if (cardId === 3) {
    //   cardId = (cardId << 4) | (Math.floor(Math.random() * 7) + 1)
    // } else {
    //   cardId = (cardId << 4) | (Math.floor(Math.random() * 9) + 1)
    // }
    //=====End====

    const img = process.env.PUBLIC_URL + "/card/card_" + this.card_id.toString(16) + ".jpg"
    let classN = this.state.select ? "card select" : "card"
    if (this.props.className !== undefined) {
      classN += this.props.className
    }
    if (this.cardId === "0") {
      return <div className={classN} style={{ backgroundImage: 'url(' + img + ')' }} />
    } else {//可操作
      return <div className={classN} onClick={() => this.mySelect(this.props.onClick)} style={{
        backgroundImage: 'url(' + img + ')'
      }} title={title} />
    }
  }
}

let client = null
const ban_tool = new BanTool()

class Game extends React.Component {
  constructor(props) {
    super(props)
    this.root = props.root

    const init_info = props.init_info
    this.my_id = init_info.username
    const tempP = new Array(123).fill({ "r": 0 })
    this.state = {
      turn: init_info.turn,//是否是此玩家回合
      can_draw: init_info.can_draw,//是否可以抽牌
      mode: 0,//0　整理牌　1选牌
      ting: false,//听牌，有胡就胡，有摸就摸，只打摸到的牌
      remaining: init_info.remaining,
      player_info: init_info.player_info,
      public_cards: init_info.public_cards
      // public_cards: tempP
    }
    this.end = false
    this.select_cards_position = new Set()
    // this.state = {
    //   my_id: "ban",
    //   remaining: 110,
    //   mode: 0,//0　整理牌　1选牌
    //   player_info: {
    //     "ban": {
    //       "draw": 1,
    //       "turn":false,
    //       "hand": [2, 3, 4, 5, 6, 7, 8, 9, 49, 50, 51],
    //       "show": [54, 54, 54]
    //     },
    //     "e": {
    //       "draw": null,
    //       "hand": [0, 0, 0, 0, 0, 0, 0, 0],
    //       "show": [0, 0, 0, 0, 0, 0]
    //     },
    //     "c": {
    //       "draw": null,
    //       "hand": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       "show": []
    //     },
    //     "a": {
    //       "draw": null,
    //       "hand": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //       "show": []
    //     },
    //   },
    //   public_cards: []
    // }
    this.remind = React.createRef()
    var sUserAgent = navigator.userAgent.toLowerCase();
    this.is_windows = sUserAgent.match(/windows/i) !== null;
    console.log("is_windows:" + this.is_windows)

    this.initClient()
  }

  initClient() {
    client.onmessage = (message) => {
      console.log(message)
      try {
        const m = JSON.parse(message.data)
        switch (m.command) {
          case "update"://更新当前卡牌信息
            this.updateInfo(m.content)
            break;
          case "fail":
            alert(m.content)
            break
          case "remind":
            const r = this.remind.current
            r.innerText = m.content
            r.className = "remind";
            setTimeout(function () {
              r.className = "remind anim";
            }, 1000);
            break
          case "start":
            this.restartInfo(m.content)
            break
          case "end":
            const r2 = this.remind.current
            r2.innerText = "平"
            r2.className = "remind";
            setTimeout(function () {
              r2.className = "remind anim";
            }, 1000);
            break;
          default:
            break;
        }
      } catch (err) {
        console.log(err)
      }
    }
  }

  updateInfo(info) {
    const tempPlayerInfo = info.player_info
    const localHand = this.state.player_info[this.my_id].hand
    if (localHand.length !== tempPlayerInfo[this.my_id].hand.length) {
      alert("手牌数与服务器数量不一致，将回滚至服务器值")
    } else {
      //一样，就保留本地的已排序的值
      tempPlayerInfo[this.my_id].hand = localHand
    }

    this.setState({
      turn: info.turn,
      can_draw: info.can_draw,
      player_info: tempPlayerInfo,
      remaining: info.remaining,
      public_cards: info.public_cards
    })
  }

  restartInfo(info) {
    this.end = false
    this.setState({
      ting: false,
      turn: info.turn,
      can_draw: info.can_draw,
      player_info: info.player_info,
      remaining: info.remaining,
      public_cards: info.public_cards
    })
    this.select_cards_position = new Set()
  }

  /**
   * 切换整理和选牌
   */
  switchMode() {
    this.select_cards_position = new Set()
    const m = (this.state.mode + 1) % 2
    this.setState({
      mode: m
    })
  }
  /**
   * 选择卡
   * @param {*} postion 
   */
  selectCard(postion) {
    console.log("selectCard:" + postion)
    if (this.select_cards_position.has(postion)) {
      this.select_cards_position.delete(postion)
    } else {
      this.select_cards_position.add(postion)
    }

    if (this.state.mode === 0) {//整理模式
      if (this.select_cards_position.size === 2) {
        this.changeCard()
        this.select_cards_position = new Set()
      }
    } else {//选牌模式

    }
  }

  /**
   * 换牌的位置
   */
  changeCard() {
    console.log(">>>>?")
    const myCards = this.state.player_info[this.my_id]
    const positionInfo = Array.from(this.select_cards_position)
    //min max　均只为下标
    const min = Math.min.apply(null, positionInfo)
    const max = Math.max.apply(null, positionInfo)

    const newHand = myCards.hand.slice()
    let draw = myCards.draw
    if (min === -1) {//换抓的牌
      //splice() 方法向/从数组中添加/删除项目，然后返回被删除的项目（以数组形式返回）。
      draw = newHand.splice(max, 1)[0]
      newHand.splice(max, 0, myCards.draw)
    } else {//单换手牌
      // newHand[min] = newHand.splice(max, 1, newHand[min])[0];//真骚，删的同时增加
      // 先用null占位
      newHand.splice(positionInfo[1], 0, newHand.splice(positionInfo[0], 1, null)[0])
      newHand.splice(newHand.indexOf(null), 1)//移除占位
    }

    const newPlayerInfo = this.state.player_info
    newPlayerInfo[this.my_id].hand = newHand
    newPlayerInfo[this.my_id].draw = draw
    this.setState({
      player_info: newPlayerInfo
    })
  }

  /**
   * 抓牌
   */
  draw() {
    this.select_cards_position = new Set()

    const info = getBaseSocketInfo()
    info.command = "draw"
    sendSocketMessage(info)
  }

  /**
   * 打出牌
   */
  play() {
    const info = getBaseSocketInfo()
    info.command = "play"

    const s = this.select_cards_position.size
    const currentPlay = this.state.player_info[this.my_id]
    if (s === 0) {//不选时，默认出抽到的牌
      if (currentPlay.draw === null) {
        alert("请选择一张牌出牌")
        return
      }
      info.content = [currentPlay.draw]//只有一个数字的数组
    } else if (s === 1) {
      const p = Array.from(this.select_cards_position)[0]
      if (p === -1) {//选中抽到的牌
        info.content = [currentPlay.draw]
      } else {
        info.content = [currentPlay.hand[p]]//只有一个数字的数组
        currentPlay.hand.push(currentPlay.draw)
      }
    } else {
      alert("你所选牌数为：" + s + "张,不能出牌")
      return
    }

    this.adjustHand()
    sendSocketMessage(info)
  }

  /**
   * 吃碰杠，先选牌，然后才能操作
   */
  chiPengGang() {
    const s = this.select_cards_position.size
    if (s > 4) {
      alert("你所选牌数为：" + s + ",不合法，被拒绝此操作")
      return
    }
    if (s !== 1 && this.state.player_info[this.my_id].turn) {
      alert("你已抓牌，不能再吃碰杠别人的牌")
      return
    }
    //把已选的牌上传
    const selectCards = []
    for (let c of this.select_cards_position) {
      let card = this.state.player_info[this.my_id].hand[c]
      if (s === 1) {//自摸到加杠
        card |= 0x40
      }
      selectCards.push(card)
    }

    const info = getBaseSocketInfo()
    info.command = "play"
    info.content = selectCards
    this.adjustHand()
    sendSocketMessage(info)
  }

  /**
 * 暗杠
 */
  anGang() {
    const s = this.select_cards_position.size
    if (s !== 4) {
      alert("你所选牌数为：" + s + ",不为四，被拒绝此操作")
      return
    }
    if (!this.state.turn) {
      alert("不是你的回合不能暗杠")
      return
    }
    //把已选的牌上传
    const selectCards = []
    for (let c of this.select_cards_position) {
      if (c !== -1) {//不是抽到的牌
        selectCards.push(this.state.player_info[this.my_id].hand[c] | 0x40)//第八位为暗杠位
      } else {
        selectCards.push(this.state.player_info[this.my_id].draw | 0x40)
      }
    }

    const info = getBaseSocketInfo()
    info.command = "play"
    info.content = selectCards
    this.adjustHand()
    sendSocketMessage(info)
  }

  /**
   * 听牌
   */
  ting() {
    const info = getBaseSocketInfo()
    info.command = "ting"
    sendSocketMessage(info)

    this.setState({
      ting: !this.state.ting
    })
  }

  /**
   * 吃碰杠之后的整理手牌
   */
  adjustHand() {
    const hand = this.state.player_info[this.my_id].hand
    //先直接置空
    for (let c of this.select_cards_position) {
      if (c !== -1) {//-1时为选中抽到的牌
        hand[c] = null
      } else {
        this.state.player_info[this.my_id].draw = null
      }
    }
    let i = 0
    while (i < hand.length) {
      if (hand[i] === null) {
        hand.splice(i, 1)
        continue
      }
      i++
    }
    this.select_cards_position = new Set()
  }

  /**
   * 胡
   */
  hu() {
    this.end = true

    const info = getBaseSocketInfo()
    info.command = "hu"
    info.content = this.state.player_info[this.my_id]
    sendSocketMessage(info)
  }



  /**
   * 新一局
   */
  restart() {
    const info = getBaseSocketInfo()
    info.command = "restart"
    sendSocketMessage(info)
  }

  render() {
    const playerKey = Object.keys(this.state.player_info)
    const playerCount = playerKey.length
    const myIdIndex = playerKey.indexOf(this.my_id)
    if (myIdIndex === -1) {
      return ("找不到本机ＩＤ")
    }
    //生成自己的牌和别的玩家的牌，默认数组第一位为自己，然后按逆时针依次排序
    const playerDiv = []
    let direction = 0;
    let playerNameInfo = ""
    let playerNameInfoSet = []
    for (let i = myIdIndex; i < myIdIndex + playerCount; i++) {
      const playerName = playerKey[i % playerCount]
      const playerInfo = this.state.player_info[playerName]
      let classN = undefined
      if (playerName === this.my_id) {
        classN = " my"
      }
      const hand = playerInfo.hand.map((value, key) => {
        return <Card key={Math.random()} className={classN} number={value} onClick={() => this.selectCard(key)} />
      })
      const show = playerInfo.show.map((value, key) => {
        return <Card key={Math.random()} className={classN} number={value} />
      })
      const draw = playerInfo.draw

      let cardCount = hand.length + show.length
      if (draw !== null) {
        let cn = " draw"
        if (classN !== undefined) {
          cn += classN
        }
        hand.push(<Card key={Math.random()} number={draw} className={cn} onClick={() => this.selectCard(-1)} />)
        cardCount++
      }
      let cn = "card none"
      if (classN !== undefined) {
        cn += classN
      }
      if (show !== null) {//加个分割
        hand.push(<div key={Math.random()} className={cn}></div>)
        hand.push(show)
      }
      //以牌数最多的台湾牌16张来定为基础布局
      for (let i = 0; i < 17 - cardCount; i++) {
        hand.push(<div key={Math.random()} className={cn}></div>)
      }
      playerDiv.push(hand)

      //玩家名字信息
      switch (direction) {
        case 0:
          playerNameInfo += "下："
          break;
        case 1:
          playerNameInfo += "右："
          break;
        case 2:
          playerNameInfo += "上："
          break;
        case 3:
          playerNameInfo += "左："
          break;
        default:
          break;
      }
      playerNameInfoSet[direction] = playerName
      playerNameInfo += playerName + " "
      direction++
    }
    //已打出的牌
    const publicCards = this.state.public_cards.map((v, k) => {
      return <Card key={Math.random()} info={v} />
    })

    let controlPanel = null
    if (!this.end && !this.state.ting) {
      controlPanel =
        <div className="control_panel">
          <div className="card none" />
          <button disabled={!this.state.turn} onClick={() => this.play()}>出牌</button>
          <div className="card none" />
          <button disabled={!this.state.can_draw} onClick={() => this.draw()}>抓牌</button>
          <div className="card none" />
          <button onClick={() => this.switchMode()}>{this.state.mode === 0 ? "整理/选牌" : "选牌/整理"}</button>
          <div className="card none" />
          <button disabled={this.state.turn} onClick={() => this.chiPengGang()}>吃碰杠</button>
          <div className="card none" />
          <button disabled={!this.state.turn} onClick={() => this.anGang()}>暗杠</button>
          <div className="card none" />
          <button disabled={this.state.turn} onClick={() => this.ting()}>听牌</button>
          <div className="card none" />
          <button onClick={() => this.hu()}>胡/亮牌</button>
        </div>
    }

    let rootPanel = null
    if (this.root) {
      rootPanel =
        <div className="control_panel">
          <div className="card none" />
          <button onClick={() => this.restart()}>新一局</button>
        </div>
    }

    //根据不同的型号给匹配css
    if (this.is_windows) {
      require('./MahjongGui.css')
    } else {
      require('./MahjongGuiPhone.css')
    }

    if (this.is_windows) {
      return (
        <div>
          <div className="box">
            <div className="tt play_card_set">
              {playerDiv[2]}
            </div>
            <div className="cdiv">
              <div className="ll play_card_set">
                {playerDiv[3]}
              </div>
              <div className="cc">
                <div style={{ width: "100%", height: "35px", textAlign: "center" }}>剩余牌数:{this.state.remaining}</div>
                {publicCards}
                <div className="remind" ref={this.remind} />
              </div>
              <div className="rr play_card_set">
                {playerDiv[1]}
              </div>
            </div>
            <div className="bb play_card_set">
              {playerDiv[0]}
            </div>
            {controlPanel}
            {rootPanel}
          </div>
          <div className="player_name">{playerNameInfo}</div>
        </div>
      );
    } else {
      return (
        <div>
          <div className="box">
            <div className="cdiv">
              <div className="cc">
                <div style={{ width: "100%", textAlign: "center" }}>剩余牌数:{this.state.remaining}</div>
                {publicCards}
                <div className="remind" ref={this.remind} onClick={() => { this.remind.current.className = "remind anim"; }}></div>
              </div>
            </div>
            <div className="opponet">
              <div className="bb play_card_set"><div className="player_name">{playerNameInfoSet[3]}:</div>{playerDiv[3]}</div>
              <div className="bb play_card_set"><div className="player_name">{playerNameInfoSet[2]}:</div>{playerDiv[2]}</div>
              <div className="bb play_card_set"><div className="player_name">{playerNameInfoSet[1]}:</div>{playerDiv[1]}</div>
            </div>
            <div className="bb play_card_set">{playerDiv[0]}</div>
            <div className="panel">
              {controlPanel}
              {rootPanel}
            </div>
          </div>
        </div>
      );
    }
  }
}

class Login extends React.Component {
  constructor(props) {
    super(props)
    this.server_input = React.createRef()
    this.username_input = React.createRef()
    this.room_input = React.createRef()
    this.login_button = React.createRef()
    this.ai_type = React.createRef()

    this.username = ban_tool.randomString(2)
    this.server = window.location.host.split(":")[0] + ":7654"
    this.room = "123"
    this.state = {
      login: false,
      root: false
    }
  }

  loginIn() {
    this.server = this.server_input.current.value
    this.username = this.username_input.current.value
    this.room = this.room_input.current.value

    if (this.username.indexOf("Bot_") !== -1) {
      alert("你不能占用ＡＩ的前缀，请换用户名")
      return
    }

    client = new w3cwebsocket("ws://" + this.server, null, this.username)
    client.onopen = () => {
      console.log("客户端open")
      const joinInfo = getBaseSocketInfo()
      joinInfo.command = "join"
      joinInfo.content = { "name": this.username, "room": this.room }
      sendSocketMessage(joinInfo)
    }
    client.onmessage = (message) => {
      console.log(message)
      try {
        const m = JSON.parse(message.data)
        switch (m.command) {
          case "join":
            const button = this.login_button.current
            if (m.content === "root") {
              button.innerText = "主机登录成功"
              button.disabled = true
              button.onClick = null
              this.setState({ root: true })
            } else if (m.content === "guest") {
              button.innerText = "登录成功"
              button.disabled = true
              button.onClick = null
            } else if (m.content === "full") {
              alert("房间已满")
            }
            break;
          case "start":
            if (isNaN(parseInt(m.content))) {
              this.init_info = {
                public_cards: m.content.public_cards,
                player_info: m.content.player_info,
                remaining: m.content.remaining,
                can_draw: m.content.can_draw,
                turn: m.content.turn
              }
              this.setState({ login: true })
            } else {
              const need = 4 - parseInt(m.content)
              alert(m.content + "缺" + need)
            }
            break
          case "fail":
            alert(m.content)
            break
          default:
            break;
        }
      } catch {
        console.log("消息无法转成JSON")
      }
    }
  }

  startGame() {
    const info = getBaseSocketInfo()
    info.command = "start"
    info.content = { "room": this.room }
    sendSocketMessage(info)
  }

  addAI() {
    const info = getBaseSocketInfo()
    info.command = "addBot"
    info.content = this.ai_type.current.value
    sendSocketMessage(info)
  }


  render() {
    if (this.state.login) {
      client.onmessage = null
      this.init_info.username = this.username
      return (<Game init_info={this.init_info} root={this.state.root} />)
    } else {
      let rootPanel = null
      if (this.state.root) {
        rootPanel = <div>
          <button onClick={() => this.startGame()}>开始游戏</button>
          <button onClick={() => this.addAI()}>添加AI</button>
          <input ref={this.ai_type} defaultValue={1} />
        </div>
      }

      return (
        <div>
          <div>服务器地址与端口号：<input ref={this.server_input} defaultValue={this.server} /></div>
          <div>用户名:<input ref={this.username_input} defaultValue={this.username} /></div>
          <div>房间号:<input ref={this.room_input} defaultValue={this.room} /></div>
          <button ref={this.login_button} onClick={() => this.loginIn()}>登录</button>
          {rootPanel}
        </div>
      )
    }
  }
}

/**
 * socket 发送信息
 * @param {*} message 
 */
function sendSocketMessage(message) {
  client.send(JSON.stringify(message))
}

/**
 * 获取基本的socket格式信息，用于发送数据
 */
function getBaseSocketInfo() {
  const a = {
    "command": null, "content": null
  }
  return a
}

function WebSocketTest() {
  var sUserAgent = navigator.userAgent.toLowerCase();
  console.log(sUserAgent)
  return (
    <Login />
  );
}

export default WebSocketTest;
