const Game = require('./MahjongGame')
const BanTool = require('./src/BanTool')
const webSocketServer = require('websocket').server;

const ban_tool = new BanTool()
let clients = {}
let game_info = {}
const port = 7654
const http = require('http');
const { client } = require('websocket');
const server = http.createServer(webSocketServer)
server.listen(port)
const wsServer = new webSocketServer({
    httpServer: server
})

function __getIdAndRomWithCon(con) {
    //TODO　可能会出现重名，目前不解决
    for (let n in clients) {
        if (clients[n] === con) {
            for (let r in game_info) {
                game = game_info[r]
                if (game.existId(n)) {
                    return { "name": n, "game": game }
                }
            }
        }
    }
    return null
}

/**
 * 加入房间
 * 
 * @param {名称} name 
 * @param {房间号} room 
 * @param {连接对象} connection 
 */
function joinGame(name, room, connection) {
    //是否已经登录
    const login = Object.keys(clients).indexOf(name) != -1
    if (!login) {//没登陆或者已经掉线
        let sourceKey = null
        for (let n in clients) {
            if (clients[n] === connection) {
                sourceKey = n
                break
            }
        }
        //删除原始key，加入命名的name做为连接名
        delete clients[sourceKey]
        clients[name] = connection
    } else {//已经登陆，看此连接有没有断开，如已经断开，覆盖之，无则返回错误
        const tempCon = clients[name]
        if (tempCon.connected) {
            serverFail(connection, "此用户名已经被使用")
            connection.close()
        } else {//应该不会走到．onclose已删除
            delete clients[name]
            joinGame(name, room, connection)//回调
        }
        return
    }
    //加入牌局
    let hasRoom = Object.keys(game_info).indexOf(room) != -1
    let game = null
    if (hasRoom) {
        game = game_info[room]
    } else {
        game = new Game(room, sendSingle, clientsResponse)
        game_info[room] = game
    }
    clientsResponse(game_info[room].joinTheGame(name))
}

/**
 * 开始游戏
 * @param {房间号} room 
 */
function startGame(room) {
    clientsResponse(game_info[room].startGame())
}

/**
 * 新一局
 * @param {*} con 
 */
function restartGame(con) {
    const i = __getIdAndRomWithCon(con)
    if (i === null) {
        serverFail(con, "连接已失效")
    }
    i.game.sendToAllMessage("remind", "新") //发提示
    i.game.sendToAllMessage("restart", null) //发提示
    clientsResponse(i.game.restartGame())
}

/**
 * 打出牌
 * @param {牌} cards 
 */
function gamePlay(cards, con) {
    const i = __getIdAndRomWithCon(con)
    if (i === null) {
        serverFail(con, "连接已失效")
    }
    const response = i.game.play(i.name, cards)
    if (response === null) {
        serverFail(con, "操作非法")
    } else {
        clientsResponse(response)
    }
}

/**
 * 抓牌
 * @param {*} con 
 */
function gameDraw(con) {
    const i = __getIdAndRomWithCon(con)
    if (i === null) {
        serverFail(con, "连接已失效")
    }
    const response = i.game.draw(i.name)
    if (response === null) {
        serverFail(con, "操作非法")
    } else {
        clientsResponse(response)
    }
}

/**
 * 胡
 * @param {*} con 
 */
function gameTing(con) {
    const i = __getIdAndRomWithCon(con)
    if (i === null) {
        serverFail(con, "连接已失效")
    }
    const response = i.game.ting(i.name)
    if (response === null) {
        serverFail(con, "操作非法")
    }
}

/**
 * 胡
 * @param {*} con 
 */
function gameHu(cards, con) {
    const i = __getIdAndRomWithCon(con)
    if (i === null) {
        serverFail(con, "连接已失效")
    }
    const response = i.game.hu(i.name, cards)
    if (response === null) {
        serverFail(con, "操作非法")
    } else {
        clientsResponse(response)
    }
}

/**
 * 添加Ai 
 */
function gameAddBot(aiType, con) {
    const i = __getIdAndRomWithCon(con)
    if (i === null) {
        serverFail(con, "连接已失效")
    }
    let response = null
    switch (parseInt(aiType)) {
        case 0://monkey
            response = i.game.addAiMonkey()
            break;
        case 1://Jong
            response = i.game.addAiJong()
            break;
        default:
            break;
    }
    if (typeof (response) === "string") {
        serverFail(con, "已成功添加：" + response)
    } else {
        response[i.name] = Object.values(response)[0]
        clientsResponse(response)
    }
}

/**
 * 服务器信息处理出错,只能发给请求方了
 */
function serverFail(con, message) {
    const a = {
        "command": "fail",
        "content": message
    }
    con.sendUTF(JSON.stringify(a))
}

/**
 * 单发消息
 * @param {*} response 
 */
function sendSingle(response) {
    const n = Object.keys(response)[0]
    const c = clients[n]
    if (c !== undefined) {//ＡＩ当然不用发
        c.sendUTF(JSON.stringify(response[n]))
    }
}

function clientsResponse(response) {
    if (response === null) {
        console.log("response clientsResponse")
        return
    }
    for (let name in response) {
        const c = clients[name]
        if (c !== undefined) {
            c.sendUTF(JSON.stringify(response[name]))
        }
    }
}

function clientsMessage(message, connection) {
    // for (let k in clients) {
    //     clients[k].sendUTF("服务器已收到你的message:" + message.utf8Data)
    // }
    try {
        const m = JSON.parse(message.utf8Data)
        const info = m.content
        switch (m.command) {
            case "addBot":
                gameAddBot(info, connection)
                break;
            case "join":
                joinGame(info.name, info.room, connection)
                break;
            case "start":
                startGame(info.room)
                break;
            case "restart":
                restartGame(connection)
                break;
            case "draw"://抓牌
                gameDraw(connection)
                break;
            case "play"://打牌，吃碰杠，暗杠全是这个接口
                gamePlay(info, connection)
                break;
            case "ting"://听牌
                gameTing(connection)
                break;
            case "hu"://胡
                gameHu(info, connection)
                break;
            default:
                break;
        }
    } catch (err) {
        console.log(err)
    }
}

function clientsClose(connection) {
    let key = null
    for (let k in clients) {
        if (clients[k] === connection) {
            key = k
            checkEmptyRoom(k)
            delete clients[k]
            console.log("clients delete:" + key)
            break
        }
    }
    console.log("----Close:" + key)
}

/**
 * 查询空的房间
 * @param {*} name 
 */
function checkEmptyRoom(name) {
    for (let r in game_info) {
        const g = game_info[r]
        if (g.existId(name)) {
            for (let n of g.getPlayerNameSet()) {
                if (clients[n] === undefined) {
                    continue
                }
                if (clients[n].connected) {
                    console.log("玩家:" + n + "　未退出房间:" + r + "，不用关停")
                    return
                }
            }
            delete game_info[r]
            console.log("所玩家已退出房间：" + r)
        }
    }
}

wsServer.on("request", function (request) {
    console.log("收到一个新连接:" + request.key)
    const connection = request.accept(null, request.origin)
    connection.on("message", (message) => { clientsMessage(message, connection) })
    connection.sendUTF(request.origin + ",服务器已收到你的request,连接成功")
    clients[request.key] = connection
    console.log("Connection:" + request.key)
})

wsServer.on("close", clientsClose)
