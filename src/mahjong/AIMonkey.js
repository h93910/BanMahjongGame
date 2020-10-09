class AIMonkey {
    constructor(name) {
        this.my_id = name
    }

    thinkingDraw(info) {
        return { command: "draw", cards: [] }
    }

    //随机出牌
    thinking(info) {
        const playInfo = info.player_info
        const playSet = playInfo[this.my_id].hand.slice()
        playSet.push(playInfo[this.my_id].draw)
        return { command: "play", cards: [playSet[Math.floor(Math.random() * playSet.length)]] }
    }

    looking(info) {
        return null
    }

}

module.exports = AIMonkey