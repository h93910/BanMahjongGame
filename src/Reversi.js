import React from 'react';
import BanTool from './BanTool'
import './App.css';

const piece = ['●', '○']
const tool = new BanTool()

function Square(props) {
  return <button className="square" onClick={props.onClick}>
    {props.value}
  </button>
}

class Board extends React.Component {
  renderSquare(i) {
    return <Square key={i} value={this.props.squares[i]} onClick={() => this.props.onClick(i)} />;
  }

  /**
   * 渲染行号列号
   * @param {id} k 
   * @param {显示号} v 
   */
  renderLine(k, v) {
    return <div key={k} className="square line">{v}</div>
  }

  render() {
    const colunm = this.props.colunm
    const row = this.props.row

    let squares = []
    for (let i = 0; i < row; i++) {
      let ls = []
      //行号
      ls.push(this.renderLine("r" + i, i + 1))
      for (let j = 0; j < colunm; j++) {
        ls.push(this.renderSquare(i * colunm + j))
      }
      squares.push(<div key={i} className="board-row">{ls}</div>)
    }

    //列号
    let colunm_line = []
    colunm_line.push(this.renderLine("rc0", ""))//空格
    for (let i = 0; i < colunm; i++) {
      colunm_line.push(this.renderLine("c" + i, String.fromCharCode(65 + i)))
    }

    return <div><div className="board-row">{colunm_line}</div>{squares}</div>
  }
}

class Game extends React.Component {
  constructor(props) {
    super(props)
    this.player = 0
    this.rev = false
    this.colunm = 8
    this.row = 8
    this.state = {
      who: 0,
      step: 0,
      coordinate: Array(this.colunm * this.row).fill(
        Array(2).fill(0)// 0:表示是谁，1:表示所下位置
      ),
      history: [
      ]//起始有初值
    }
    this.ai_info = {
      level: 2,
      thinking: 333
    }

    const initH = Array(this.colunm * this.row).fill(null)
    initH[27] = piece[0]
    initH[36] = piece[0]
    initH[28] = piece[1]
    initH[35] = piece[1]

    // for (let i = 0; i < this.row; i++) {
    //   for (let j = 0; j < this.colunm; j++) {
    //     if (i == 7) {
    //       initH[i * this.row + j] = piece[1]
    //     } else {
    //       initH[i * this.row + j] = piece[0]
    //     }
    //   }
    // }
    // initH[63]= piece[0]
    // initH[62]= piece[0]
    // initH[53]= piece[1]
    // initH[52]= null
    // initH[50]= null
    // initH[49]= null
    this.state.history.push(initH)
  }

  handleClick(i) {
    const history = this.state.history.slice(0, this.state.step + 1)
    let squares = history[this.state.step].slice()
    if (this.calculateWinner(squares) != null) {
      alert('gameover')
      return
    }
    if (squares[i] != null) {
      alert('此格已有')
      return
    }

    //落子判定
    squares = this.calculateMove(i, this.state.who, squares)
    if (squares != null) {
      const c = tool.copyArr(this.state.coordinate)
      c[this.state.step][0] = this.state.who
      c[this.state.step][1] = i

      let next = (this.state.who + 1) % 2
      if (this.canPlay(next, squares).length === 0) {
        next = this.state.who
        alert("下一玩家无法落子!")
      }

      this.setState({
        coordinate: c,
        step: this.state.step + 1,
        who: next,
        history: history.concat([squares])
      });


      for (let i = 0; i < this.row; i++) {
        let r = []
        for (let j = 0; j < this.colunm; j++) {
          r.push(squares[i * this.colunm + j])
        }
        console.log(r)
      }
      console.log("")
      console.log(this.state.history)

      if (next !== this.player) {
        setTimeout(() => { this.ai() }, this.ai_info.thinking)
      }
    } else {
      alert('落子错误')
    }
  }

  /**
   * 跳转到历史记录
   * @param {*} s 
   */
  jumpTo(s) {
    let next = 0
    if (s > 0) {
      const history = this.state.history.slice(0, s + 1)
      let squares = history[s].slice()

      next = (this.state.coordinate[s - 1][0] + 1) % 2
      if (this.canPlay(next, squares).length === 0) {
        next = this.state.who
        alert("jump start:下一玩家无法落子!")
      }
    }

    this.setState({
      step: s,
      who: next
    })
  }

  calculateMove(position, who, squares) {
    const c = this.colunm
    const direction = [-c - 1, -c, -c + 1, -1, 1, c - 1, c, c + 1]
    let legal = false
    for (let i = 0; i < direction.length; i++) {
      if (this.judgELegal(direction[i], position, who, squares)) {
        legal = true
        let j = 1
        let around = squares[position + j * direction[i]]
        while (typeof (around) == "string") {
          squares[position + j * direction[i]] = piece[who]//翻转棋子的操作
          j++
          around = squares[position + j * direction[i]]
          if (around === piece[who]) {
            break
          }
        }
      }
    }
    if (legal) {
      squares[position] = piece[who]
      return squares
    }
    return null
  }

  /**
   * 判定方向该落子是否合法
   * 
   * @param {方向} d 
   * @param {位置} p 
   * @param {玩家下标} w 
   * @param {棋盘} s 
   */
  judgELegal(d, p, w, s) {
    const c = this.colunm
    const direction = [-c - 1, -c, -c + 1, -1, 1, c - 1, c, c + 1]
    //边界判定
    if (p % this.colunm === 0) {//左排不查左边　
      if (d === direction[0] || d === direction[3] || d === direction[5]) {
        return false
      }
    }
    if (p % this.colunm === this.colunm - 1) {//右排不查右边　
      if (d === direction[2] || d === direction[4] || d === direction[7]) {
        return false
      }
    }

    let i = 1
    let index = p + d * i
    let around = s[index]
    while (around !== null && around !== undefined) {
      if (around === piece[(w + 1) % piece.length]) {
        let index_temp = p + d * ++i
        if ((index % this.colunm === 0 && index_temp % this.colunm === 7)
          || (index % this.colunm === 7 && index_temp % this.colunm === 0)) {//防跨行合法
          return false
        }
        index = index_temp
        around = s[index]
        if (around === undefined) {//越界
          return false
        }
      } else {
        if (i >= 2) {
          return true
        } else {
          return false
        }
      }
    }
    return false
  }

  /**
   * 可落子处
   * @param {*} w 
   * @param {*} s 
   */
  canPlay(w, s) {
    const go = []
    const c = this.colunm
    const direction = [-c - 1, -c, -c + 1, -1, 1, c - 1, c, c + 1]

    for (let i = 0; i < this.row * this.colunm; i++) {
      if (s[i] == null) {
        for (let j = 0; j < direction.length; j++) {
          if (this.judgELegal(direction[j], i, w, s)) {
            go.push(i)
          }
        }
      }
    }
    const show = go.map((v, k) => {
      return this.showPieceId(v)
    });
    console.log("可落子:" + show)
    return go
  }

  showPieceId(p) {
    const row_number = parseInt(p / this.colunm) + 1
    const colunm_number = String.fromCharCode(65 + p % this.colunm)
    return colunm_number + row_number
  }

  getCornerAndSideFromMind(mind) {
    const corner = mind.filter(n => {
      return n === 0 || n === this.colunm - 1 || n === this.colunm * (this.row - 1)
        || n === this.colunm * this.row - 1
    })
    const side = mind.filter(n => {
      let need = false
      need = need || n < this.colunm
      need = need || (n > this.colunm * (this.row - 1) && (n < this.colunm * this.row))
      need = need || (n % this.colunm === 0) || (n % this.colunm === this.colunm - 1)
      return need
    })
    return [corner, side]
  }

  ai() {
    const mind = this.canPlay(this.state.who, this.state.history[this.state.step])
    console.log("ai mind:" + mind)

    let go = mind[parseInt(Math.random() * mind.length)]//难度0
    if (this.ai_info.level === 1 || this.ai_info.level === 2) {
      let passThink = false
      //优先下线角
      const cs = this.getCornerAndSideFromMind(mind)
      const corner = cs[0]
      const side = cs[1]

      console.log("corner:" + corner)
      console.log("side:" + side)

      if (this.ai_info.level === 1) {//难度1
        if (corner.length !== 0) {
          go = corner[parseInt(Math.random() * corner.length)]
        } else if (side.length !== 0) {
          go = side[parseInt(Math.random() * side.length)]
        }
      } else {//难度2
        let next = (this.state.who + 1) % 2
        const block = []
        //优先让玩家下一步无法落子
        mind.map((value, key) => {
          let temp = this.state.history[this.state.step].slice()
          temp = this.calculateMove(value, this.state.who, temp)
          if (this.canPlay(next, temp).length === 0) {
            block.push(value)
            console.log("ai:成功让玩家下一步无法落子!")
          }
          return null
        });
        if (block.length !== 0) {
          go = block[parseInt(Math.random() * block.length)]
          passThink = true
        } else if (corner.length !== 0) {
          go = corner[parseInt(Math.random() * corner.length)]
          passThink = true
        } else if (side.length !== 0) {
          go = side[parseInt(Math.random() * side.length)]
        }
      }

      //思考下一步
      if (!passThink && this.ai_info.level === 2) {
        let corner_t = null
        let side_t = null

        let mind_t = mind.filter((n) => { return n !== go })
        let change = false
        do {
          if (change) {
            go = mind_t[parseInt(Math.random() * mind_t.length)]
          }
          const next = (this.state.who + 1) % 2
          let temp = this.state.history[this.state.step].slice()
          temp = this.calculateMove(go, this.state.who, temp)
          let next_play = this.canPlay(next, temp)
          const cs_t = this.getCornerAndSideFromMind(next_play)
          corner_t = cs_t[0]
          side_t = cs_t[1]

          const go_temp = go
          mind_t = mind_t.filter((n) => { return n !== go_temp })
          change = true
        } while ((corner_t.length !== 0 || side_t.length !== 0) && mind_t.length > 0)
      }
    }

    console.log("ai_info level:" + this.ai_info.level + " go:" + go)
    this.handleClick(go)
  }

  calculateWinner(squares) {
    const sn = squares.filter((n) => { return n === null }).length
    const s0 = squares.filter((n) => { return n === piece[0] }).length
    const s1 = squares.filter((n) => { return n === piece[1] }).length
    if (sn === 0) {//全部下满
      return [s0, s1]
    } else if (s0 === 0 || s1 === 0) {//一方已无子
      return [s0, s1]
    } else {
      const a = this.canPlay(this.state.who, squares)
      const b = this.canPlay((this.state.who + 1) % 2, squares)
      if (a.concat(b).length === 0) {
        alert("双方匀无子可落　gameover")
        return [s0, s1]
      }
    }
    return null;
  }

  render() {
    const history = this.state.history;
    const current_squares = history[this.state.step].slice()

    let winner = this.calculateWinner(current_squares)
    let status, result
    if (winner != null) {
      status = 'winner: ' + piece[winner[0] > winner[1] ? 0 : 1]
      status += "\n" + piece[0] + ":" + winner[0] + " " + piece[1] + ":" + winner[1]
      result = "win"
      if (winner[0] === winner[1]) {
        status = 'draw game'
        result = status
      }
    } else {
      status = 'Next player: ' + piece[this.state.who]
    }

    const moves = history.map((value, key) => {
      const desc = key ?
        'Go to move #' + key :
        'Go to game start';
      let c
      if (key > 0) {
        const play_info = this.state.coordinate[key - 1]
        const player = piece[play_info[0]]
        c = player + " go:" + this.showPieceId(play_info[1])
        if (key + 1 === history.length && result) {
          c += " " + result
        }
      }
      return (
        <li key={key}>
          <button className="back-button" onClick={() => this.jumpTo(key)}>{desc}</button> {c}
        </li>
      );
    });

    let ol
    if (this.rev) {
      ol = <ol reversed>{moves.reverse()}</ol>
    } else {
      ol = <ol>{moves}</ol>
    }
    console.log("reversed:" + this.rev)

    const reversed_button = <button onClick={() => {
      this.rev = !this.rev
      this.setState({})
    }}>{this.rev ? "倒序" : "正序"}</button>

    return (
      <div className="game">
        <div className="game-board">
          <Board row={this.row} colunm={this.colunm}
            squares={current_squares} onClick={i => this.handleClick(i)} />
        </div>
        <div className="game-info">
          <div>{status} {reversed_button}<button onClick={() => this.ai()}>AI</button></div>
          {ol}
        </div>
      </div>
    );
  }
}

function App() {
  return (
    <Game />
  );
}

export default App;
