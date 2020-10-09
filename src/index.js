import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';

import './index.css';
import App from './App';//井字棋
import Rev from './Reversi';//黑白棋
import MahjongGame from './mahjong/MahjongClient'
import * as serviceWorker from './serviceWorker';


// ReactDOM.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );

// ReactDOM.render(
//   <React.StrictMode>
//     <WS />
//   </React.StrictMode>,
//   document.getElementById('mahjong')
// );

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <Switch>
        <Route path="/mahjong" component={MahjongGame} />
        <Route path="/rev" component={Rev} />
        <Route path="/app" component={App} />
        <Redirect exact from="/" to="/mahjong" />
        <Route path="/" render={() => (<div>hello world</div>)} />
      </Switch>
    </Router>
  </React.StrictMode>,
  document.getElementById('root')
);


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
