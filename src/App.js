import React from 'react';
import './App.css';

function Square(props) {
  return <button className={props.cn} onClick={props.onClick}>
    {props.value}
  </button>
}

class Board extends React.Component {
  renderSquare(i) {
    let cn = "square"
    if (this.win_number != null) {
      if (this.win_number.indexOf(i) !== -1) {
        cn += " win"
      }
    }
    return <Square key={i} value={this.props.squares[i]} cn={cn} onClick={() => this.props.onClick(i)} />;
  }

  render() {
    const win = calculateWinner(this.props.squares)
    if (win) {
      this.win_number = win[1]
    } else {
      this.win_number = null
    }
    const colunm = this.props.colunm
    const row = this.props.row

    let squares = []
    for (let i = 0; i < row; i++) {
      let ls = []
      for (let j = 0; j < colunm; j++) {
        ls.push(this.renderSquare(i * colunm + j))
      }
      squares.push(<div key={i} className="board-row">{ls}</div>)
    }

    return <div>{squares}</div>
  }
}

class Game extends React.Component {
  constructor(props) {
    super(props)
    this.rev = false
    this.colunm = 3
    this.row = 3
    this.state = {
      step: 0,
      coordinate: Array(this.colunm * this.row).fill(0),
      history: [
        Array(this.colunm * this.row).fill(null)
      ]
    }
  }

  handleClick(i) {
    const history = this.state.history.slice(0, this.state.step + 1)
    const squares = history[this.state.step].slice()
    if (calculateWinner(squares) != null) {
      alert('gameover')
      return
    }
    if (squares[i] != null) {
      alert('此格已有')
      return
    }
    const c = this.state.coordinate.slice()
    c[this.state.step] = i
    squares[i] = this.state.step % 2 === 0 ? 'O' : 'X'
    this.setState({
      coordinate: c,
      step: this.state.step + 1,
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
  }

  jumpTo(s) {
    this.setState({
      step: s
    })
  }

  render() {
    const history = this.state.history;
    const current_squares = history[this.state.step].slice()

    let winer = calculateWinner(current_squares)
    let status, result
    if (winer != null) {
      status = 'winner: ' + winer[0]
      result = "win"
    } else {
      status = 'Next player: ' + (this.state.step % 2 === 0 ? 'O' : 'X')
      if (this.state.step >= this.row * this.colunm) {
        status = 'draw game'
        result = status
      }
    }

    const moves = history.map((value, key) => {
      const desc = key ?
        'Go to move #' + key :
        'Go to game start';
      let c
      if (key > 0) {
        const player = (key - 1) % 2 === 0 ? 'O' : 'X'
        const row_number = parseInt(this.state.coordinate[key - 1] / this.colunm) + 1
        const colunm_number = this.state.coordinate[key - 1] % this.colunm + 1
        c = player + " go:" + row_number + "," + colunm_number
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
          <div>{status} {reversed_button}</div>
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

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return [squares[a], lines[i]];
    }
  }
  return null;
}

export default App;
