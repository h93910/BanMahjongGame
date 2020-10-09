import React from 'react';
import { w3cwebsocket } from 'websocket'
import { Link } from 'react-router-dom';

class HomePage extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        // return (<div><a href="/mahjong/game">ma jiang home</a></div>)
        let data = { id: 3, name: "sam", age: 36 };
        let path = {
            pathname: '/mahjong/game',
            state: data,
        }
        return (<div><Link to={path}>ma</Link></div>)
    }
}

function output() {
    return (
        <HomePage />
    );
}

export default output;