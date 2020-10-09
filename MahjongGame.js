const BanTool = require('./src/BanTool')
const AIJong = require('./src/mahjong/AIJong')
const AIMonkey = require('./src/mahjong/AIMonkey')

class MahjongGame {
    constructor(roomName, socketSendByName, clientsResponse, cardCount = 13) {
        this.sendSingle = socketSendByName//用名称单发socket消息
        this.sendAll = clientsResponse

        this.strict_player = false //严格限制人数
        this.max_player = 4
        this.show_gang = true//暗杠是否显示牌
        this.card_count = cardCount//牌数，没台湾牌则为十九张
        this.player_info = {}
        this.ban_tool = new BanTool()
        this.room = roomName
        this.quan = 0//圈
        //AI有关
        this.show_ai_cards = true//是否显示ai的牌
        this.bot_wait_time = 800
        this.ai = {}
        this.ai_mind_timeout = []
    }

    __initTheGame() {
        this.bot_wait_time = 800//重置在思考时间，听牌时有
        this.end = {}
        this.direction = this.quan//当前玩家方向，标记出牌，抽牌
        //初始化牌
        this.public_cards = []//公牌库 [{打出人:牌面},{},{}]
        this.cards = []//牌库
        for (let i = 0; i < 4; i++) {
            let last = 9//万筒条九张
            if (i === 3) {
                last = 7 // 最后一排，东南西北中发白，七张
            }
            for (let j = 0; j < last; j++) {
                let card = (i << 4) | (j + 1)
                for (let t = 0; t < 4; t++) {
                    this.cards.push(card)
                }
            }
        }
        //洗牌
        this.ban_tool.shuffle(this.cards)
        //发牌
        for (let n in this.player_info) {
            this.end[n] = false
            this.player_info[n] = {
                "draw": null,
                // "turn": false,//此人回合,从接口统一设置，不在此记录
                "hand": [],
                "show": []
            }
            for (let i = 0; i < this.card_count; i++) {
                this.player_info[n].hand.push(this.cards.pop())
            }
        }
        //玩家一抽一张
        Object.values(this.player_info)[this.quan].draw = this.cards.pop()
    }

    /**
     * 平局
     */
    __drawGameInfo() {
        const response = {}
        for (let n in this.player_info) {
            const baseInfo = this.getBaseSocketInfo()
            baseInfo.command = "end"
            baseInfo.content = "draw"
            response[n] = baseInfo
        }
        return response
    }

    __getMyCardInfo(name) {
        //自动排序ＡＩ的手牌
        for (let n in this.player_info) {
            if (n.indexOf("Bot_") === 0) {//AI
                this.player_info[n].hand.sort((a, b) => { return a > b ? 1 : -1 })
            }
        }

        let tempPlayerInfo = JSON.parse(JSON.stringify(this.player_info))
        for (let n in tempPlayerInfo) {
            //吃碰杠的牌
            if (this.end[n]) {
                const show = tempPlayerInfo[n].show
                for (let i in show) {
                    show[i] = show[i] & 0x3F//高位全部去除，翻出暗杠
                }
            }
            if (n.indexOf("Bot_") === 0 && this.show_ai_cards) {//AI
                continue
            }
            if (n !== name && !this.end[n]) {//不是自己的牌，看不到
                if (tempPlayerInfo[n].draw !== null) {
                    tempPlayerInfo[n].draw = 0
                }
                const hand = tempPlayerInfo[n].hand
                for (let i in hand) {
                    hand[i] = 0//全置为0，意思为不可见
                }
            }
        }
        return tempPlayerInfo
    }

    __getAllInfoToEveryone(command) {
        const response = {}
        for (let n in this.player_info) {
            const baseInfo = this.getBaseSocketInfo()
            baseInfo.command = command
            baseInfo.content = {
                "player_info": this.__getMyCardInfo(n),
                "remaining": this.cards.length,//牌库剩余张数
                "public_cards": this.public_cards//打出的牌
            }
            response[n] = baseInfo
        }
        return response
    }

    __getSingleMessage(name, command, message) {
        const response = {}
        const baseInfo = this.getBaseSocketInfo()
        baseInfo.command = command
        baseInfo.content = message
        response[name] = baseInfo
        return response
    }

    sendToAllMessage(command, message) {
        for (let n in this.player_info) {
            const response = this.__getSingleMessage(n, command, message)
            this.sendSingle(response)
        }
    }

    /**
     * 设置当前turn，统一由此接口设置
     * @param {*} direction 当想设置为无人turn时，传值为-1
     * @param {*} response 
     */
    __setTurn(direction, response) {
        const playName = Object.keys(this.player_info)[direction]
        for (let n in response) {
            response[n].content.turn = (n === playName)//为方向置为turn，反之
        }
    }

    /**
     * 设置当前谁可以摸牌，统一由此接口设置
     * @param {*} direction 当设置为无人可摸牌时，传参为-1
     * @param {*} response 
     */
    __setCanDraw(direction, response) {
        const playName = Object.keys(this.player_info)[direction]
        for (let n in response) {
            response[n].content.can_draw = (n === playName)//为方向置为turn，反之
        }
    }

    existId(name) {
        return Object.keys(this.player_info).indexOf(name) != -1
    }

    getPlayerNameSet() {
        return Object.keys(this.player_info)
    }

    joinTheGame(name) {
        const response = {}
        const baseInfo = this.getBaseSocketInfo()
        baseInfo.command = "join"

        const nameSets = Object.keys(this.player_info)
        if (nameSets.length < this.max_player) {
            let playerIndex = nameSets.indexOf(name)
            if (playerIndex === -1) {//新局情况
                this.player_info[name] = {}
                playerIndex = Object.keys(this.player_info).indexOf(name)//再次查询加入后的状态
            } else {//重连的情况
                if (this.cards !== undefined) {//是否已经开局
                    setTimeout(() => this.reconnect(name), 888)
                }
            }
            if (playerIndex === 0) {//判定第一个加入的玩家为主机
                baseInfo.content = "root"
            } else {//别的都为客人
                baseInfo.content = "guest"
            }
        } else {//满了返回已满
            baseInfo.content = "full"
        }
        response[name] = baseInfo
        return response
    }

    /**
     * 重连游戏,发之前
     * @param {} name 
     */
    reconnect(name) {
        let draw = -1
        let direc = this.direction
        if (this.direction === Object.keys(this.player_info).indexOf(name)) {//如果是此人回合
            const p = this.player_info[name]
            if (p.draw === null && p.hand.length + p.show.length === this.card_count) {//未摸牌
                draw = this.direction
                direc = -1
            }
        }
        let response = this.__getAllInfoToEveryone("start")
        this.__setCanDraw(draw, response)
        this.__setTurn(direc, response)
        for (let n in response) {//不是重连者的信息都删除
            if (n !== name) {
                delete response[n]
            }
        }
        this.sendSingle(response)
    }

    restartGame() {
        this.__clearAIMind()
        this.quan = (this.quan + 1) % Object.keys(this.player_info).length
        const response = this.startGame()

        this.ai_mind_timeout.push(setTimeout(() => this.checkAiMove(response), this.bot_wait_time))
        return response
    }

    startGame() {
        let response = {}
        if (this.strict_player) {
            if (Object.keys(this.player_info).length === this.max_player) {
                this.__initTheGame()
                //通知全部人开始游戏
                response = this.__getAllInfoToEveryone("start")
                this.__setCanDraw(-1, response)
                this.__setTurn(this.direction, response)
            } else {//人没满
                const baseInfo = this.getBaseSocketInfo()
                baseInfo.command = "start"
                baseInfo.content = Object.keys(this.player_info).length
                response[Object.keys(this.player_info)[0]] = baseInfo
            }
        } else {
            this.__initTheGame()
            //通知全部人开始游戏
            response = this.__getAllInfoToEveryone("start")
            this.__setCanDraw(-1, response)
            this.__setTurn(this.direction, response)
        }

        return response
    }

    play(name, cards) {
        let response = null//this.__getAllInfoToEveryone()
        const currentPlay = this.player_info[name]
        if (cards.length === 1) {//单出牌,加杠
            if ((cards[0] & 0x40) === 0x40) {//补杠必须是摸到的牌
                cards[0] = cards[0] & 0x3F//保留前七位
                let tIndex = 0
                //找已show中的牌
                for (let i = 0; i < 3; i++) {
                    tIndex = currentPlay.show.indexOf(currentPlay.draw, tIndex)
                    if (tIndex === -1) {
                        console.log("play:选择的牌无法进行补杠")
                        return null
                    }
                }
                currentPlay.show.splice(tIndex, 0, cards[0])
                //再摸一张牌出一张牌
                let c = this.cards.pop()
                if (c === undefined) {//平局
                    return this.__drawGameInfo()
                }
                currentPlay.draw = c

                this.sendToAllMessage("remind", "补") //发提示
                response = this.__getAllInfoToEveryone("update")
                this.direction = Object.keys(this.player_info).indexOf(name)
                this.__setTurn(this.direction, response)
                this.__setCanDraw(-1, response)
            } else {//普通出牌
                if (currentPlay.draw !== cards[0]) {//摸了换牌打出
                    //打出卡，再用抽到牌放回
                    if (currentPlay.draw !== null) {
                        currentPlay.hand.splice(currentPlay.hand.indexOf(cards[0]), 1, currentPlay.draw)
                    } else {
                        currentPlay.hand.splice(currentPlay.hand.indexOf(cards[0]), 1)
                    }
                }
                currentPlay.draw = null
                const discard = {}
                discard[name] = cards[0]
                this.public_cards.push(discard)
                //设置下一个可以抽牌的人
                response = this.__getAllInfoToEveryone("update")
                this.direction = (this.direction + 1) % Object.keys(this.player_info).length
                this.__setTurn(-1, response)
                this.__setCanDraw(this.direction, response)
            }
        } else if (cards.length === 2) {//吃碰
            //做对子
            const dui = cards.slice()//对子
            const discard = this.public_cards.pop()
            dui.push(discard[Object.keys(discard)[0]])//从公牌最后一张抽出用做对子
            dui.sort((a, b) => { return a > b ? 1 : -1 })
            currentPlay.show = currentPlay.show.concat(dui)
            //清选择的牌
            for (let c of cards) {
                let index = currentPlay.hand.indexOf(c)
                if (index === -1) {//选择的牌和服务器上的数据不同
                    console.log("play:选择的牌和服务器上的数据不同")
                    return null
                }
                currentPlay.hand.splice(index, 1)//移除手中所选的牌 
            }
            let remind = "吃"
            if (dui[0] === dui[1]) {//第一张等于第二张直接为碰
                remind = "碰"
            }
            this.sendToAllMessage("remind", remind) //发提示
            //再自已一张牌
            response = this.__getAllInfoToEveryone("update")
            this.direction = Object.keys(this.player_info).indexOf(name)
            this.__setTurn(this.direction, response)
            this.__setCanDraw(-1, response)
        } else if (cards.length === 3) {//杠
            const gang = cards.slice()//对子
            const discard = this.public_cards.pop()
            gang.push(discard[Object.keys(discard)[0]])//从公牌最后一张抽出用做对子
            gang.sort((a, b) => { return a > b ? 1 : -1 })
            currentPlay.show = currentPlay.show.concat(gang)
            //清选择的牌
            for (let c of cards) {
                let index = currentPlay.hand.indexOf(c)
                if (index === -1) {//选择的牌和服务器上的数据不同
                    console.log("play:选择的牌和服务器上的数据不同")
                    return null
                }
                currentPlay.hand.splice(index, 1)//移除手中所选的牌 
            }
            //再摸一张牌出一张牌
            let c = this.cards.pop()
            if (c === undefined) {//平局
                return this.__drawGameInfo()
            }
            currentPlay.draw = c

            this.sendToAllMessage("remind", "杠") //发提示
            response = this.__getAllInfoToEveryone("update")
            this.direction = Object.keys(this.player_info).indexOf(name)
            this.__setTurn(this.direction, response)
            this.__setCanDraw(-1, response)
        } else if (cards.length === 4) {//暗杠
            const anGang = cards.slice()//对子
            anGang.sort((a, b) => { return a > b ? 1 : -1 })
            if (this.show_gang) {//如果显示，则两端盖空
                anGang[1] = anGang[1] & 0x3F
                anGang[2] = anGang[2] & 0x3F
            }
            //还原
            for (let i in cards) {
                cards[i] = cards[i] & 0x3F
            }
            //先查是否为抽到牌,如果是，清抽到的牌
            const tIndex = cards.indexOf(currentPlay.draw)
            if (tIndex !== -1) {
                cards.splice(tIndex, 1)
                currentPlay.draw = null
            }
            //清选择的牌
            for (let c of cards) {
                let index = currentPlay.hand.indexOf(c)
                if (index === -1) {//选择的牌和服务器上的数据不同
                    console.log("play:选择的牌和服务器上的数据不同")
                    return null
                }
                currentPlay.hand.splice(index, 1)//移除手中所选的牌 
            }
            currentPlay.show = currentPlay.show.concat(anGang)
            //再摸一张牌出一张牌
            let c = this.cards.pop()
            if (c === undefined) {//平局
                return this.__drawGameInfo()
            }
            currentPlay.draw = c

            this.sendToAllMessage("remind", "暗") //发提示
            response = this.__getAllInfoToEveryone("update")
            this.direction = Object.keys(this.player_info).indexOf(name)
            this.__setTurn(this.direction, response)
            this.__setCanDraw(-1, response)
        }
        this.__clearAIMind()
        this.ai_mind_timeout.push(setTimeout(() => this.checkAiMove(response), this.bot_wait_time))
        return response
    }

    draw(name) {
        const currentPlay = this.player_info[name]
        let c = this.cards.pop()
        if (c === undefined) {//平局
            return this.__drawGameInfo()
        }
        currentPlay.draw = c

        const response = this.__getAllInfoToEveryone("update")
        this.direction = Object.keys(this.player_info).indexOf(name)
        this.__setTurn(this.direction, response)
        this.__setCanDraw(-1, response)

        this.ai_mind_timeout.push(setTimeout(() => this.checkAiMove(response), this.bot_wait_time))
        return response
    }

    ting(name) {
        this.player_info[name]['ting'] = new AIJong(name)
        this.sendToAllMessage("remind", "听") //发提示
        //判定是不是全部人类玩家都已经听停，如全听则加速ＡＩ思考速度
        const nameSet = Object.keys(this.player_info)
        for (let n of nameSet) {
            if (n.indexOf("Bot_") === 0) {//AI
                continue
            }
            if (this.player_info[n].ting === undefined) {
                return 0
            }
        }
        this.bot_wait_time = this.bot_wait_time / 8
        console.log("所有人类玩家均听牌，ＡＩ加速:" + this.bot_wait_time)
        return 0
    }

    hu(name, playerInfo) {
        this.__clearAIMind()
        //判定牌是否和服务器一致
        let legal = true
        const serveHand = this.player_info[name].hand.slice()
        serveHand.push(this.player_info[name].draw)
        serveHand.sort()
        const playerHand = playerInfo.hand.slice()
        playerHand.push(playerInfo.draw)
        playerHand.sort()

        if (serveHand.length !== playerHand.length) {
            legal = false
        }
        for (let i in serveHand) {
            if (serveHand[i] !== playerHand[i]) {
                legal = false
                break
            }
        }
        if (!legal) {
            return this.__getSingleMessage(name, "fail", "手牌与服务数据不同步，无法胡牌")
        }
        this.player_info[name].hand = playerInfo.hand//把玩家手上的排序同步到服务器
        this.player_info[name].draw = playerInfo.draw

        //开始真正的胡牌判定
        let justShow = false
        for (let n in this.end) {
            if (this.end[n]) {
                justShow = true//已经有人胡了，只是亮牌
                break
            }
        }

        this.end[name] = true
        //牌显示
        const currentPlay = this.player_info[name]
        if (!justShow && currentPlay.draw === null) {//点炮
            const discard = this.public_cards.pop()
            currentPlay.draw = discard[Object.keys(discard)[0]]
        }
        if (!justShow) {
            this.sendToAllMessage("remind", "胡") //发提示
        }

        const response = this.__getAllInfoToEveryone("update")
        this.direction = -1
        this.__setTurn(this.direction, response)
        this.__setCanDraw(this.direction, response)

        this.ai_mind_timeout.push(setTimeout(() => this.checkAiMove(response), this.bot_wait_time))
        return response
    }

    getBaseSocketInfo() {
        const a = {
            "command": null, "content": null
        }
        return a
    }

    addAiMonkey() {
        const id = "Bot_Monkey" + Math.floor(Math.random() * 10000)
        const r = this.joinTheGame(id)
        if (r[Object.keys(r)[0]].content !== "full") {
            this.ai[id] = new AIMonkey(id)
            return id
        } else {
            return r
        }
    }

    addAiJong() {
        const id = "Bot_Jong" + Math.floor(Math.random() * 10000)
        const r = this.joinTheGame(id)
        if (r[Object.keys(r)[0]].content !== "full") {
            this.ai[id] = new AIJong(id)
            return id
        } else {
            return r
        }
    }

    __clearAIMind() {
        while (this.ai_mind_timeout.length > 0) {
            clearTimeout(this.ai_mind_timeout.pop())
        }
    }

    checkAiMove(response) {
        for (let n in response) {
            if (n.indexOf("Bot_") === 0) {//AI
                const ai = this.ai[n]
                let operation = null//操作
                if (response[n].content.can_draw) {//可以摸牌,但先让别人先判定是否可以先碰杠胡
                    // const playerNameSet = Object.keys(response[n].content.player_info)
                    // const publicC = response[n].content.public_cards
                    // const lastCardOwner = Object.keys(publicC[publicC.length - 1])[0]
                    // const isFromPrevious = (n === playerNameSet[
                    //     (playerNameSet.indexOf(lastCardOwner) + 1) % playerNameSet.length]
                    // )
                    const ai_dely = ai
                    const content = response[n].content
                    const name = n
                    const r = response
                    this.ai_mind_timeout.push(setTimeout(() => {
                        const op = ai_dely.thinkingDraw(content)
                        this.__aiDoOperation(op, name, r)
                    }, this.bot_wait_time * 4.5))
                } else if (response[n].content.turn) { // AI回合
                    operation = ai.thinking(response[n].content)
                } else {//非其回合
                    operation = ai.looking(response[n].content)
                    let justShow = false
                    for (let n in this.end) {
                        if (this.end[n]) {
                            justShow = true//已经有人胡了，只是亮牌
                            break
                        }
                    }
                    if (justShow && !this.end[n]) {
                        this.end[n] = true
                        operation = { command: "hu" }
                    }
                }
                this.__aiDoOperation(operation, n, response)
            } else {//判定有没有听牌的
                if (this.end[n]) return
                const tingAI = this.player_info[n].ting
                if (tingAI !== undefined) {
                    const operation = tingAI.ting(response[n].content, response[n].content.can_draw, response[n].content.turn)
                    this.__aiDoOperation(operation, n, response)
                }
            }
        }
    }

    __aiDoOperation(operation, n, response) {
        if (operation !== null) {
            console.log(new Date(), n, operation)
            let resp = null;
            switch (operation.command) {
                case "draw":
                    resp = this.draw(n)
                    break;
                case "play":
                    resp = this.play(n, operation.cards)
                    break;
                case "hu":
                    resp = this.hu(n, response[n].content.player_info[n])
                    break;
            }
            this.sendAll(resp)
        }
    }
}

module.exports = MahjongGame