//################################
// API (MAHJONG SOUL)
// Returns data from Mahjong Souls Javascript
//################################


//Prevent AFK warning, gets called every minute. Does not work -> Move Mouse?
function sendHeatBeat() {
	log("Sending Heatbeat");
	app.NetAgent.sendReq2Lobby('Lobby', 'heatbeat', {no_operation_counter: 0});
	//this.GameMgr.Inst._pre_mouse_point...
}

function searchForGame() {
	app.NetAgent.sendReq2Lobby('Lobby', 'matchGame', {match_mode: ROOM});
}

function getOperationList() {
	return view.DesktopMgr.Inst.oplist;
}

function getOperations() {
	return mjcore.E_PlayOperation;
}

function getDora() {
	return view.DesktopMgr.Inst.dora;
}

function getPlayerHand() {
	return view.DesktopMgr.Inst.players[0].hand;
}

function getDiscardsOfPlayer(player) {
	return view.DesktopMgr.Inst.players[player].container_qipai;
}

function getCallsOfPlayer(player) {
	return view.DesktopMgr.Inst.players[player].container_ming.pais;
}

function getTilesLeft() {
	return view.DesktopMgr.Inst.left_tile_count;
}

function localPosition2Seat(player) {
	return view.DesktopMgr.Inst.localPosition2Seat(player);
}

function seat2LocalPosition(playerSeat) {
	return view.DesktopMgr.Inst.seat2LocalPosition(playerSeat);
}

function getCurrentPlayer() {
	return view.DesktopMgr.Inst.index_player;
}

function getSeatWind(player) {
	return ((4 + localPosition2Seat(player) - view.DesktopMgr.Inst.index_ju) % 4) + 1;
}

function getRound() {
	return view.DesktopMgr.Inst.index_ju;
}

function getRoundWind() {
	return view.DesktopMgr.Inst.index_change + 1;
}

function setAutoCallWin(win) {
	view.DesktopMgr.Inst.setAutoHule(win);
	//view.DesktopMgr.Inst.setAutoNoFulu(true) //Auto No Chi/Pon/Kan
}

function getTileForCall() {
	if(view.DesktopMgr.Inst.lastqipai == null) {
		return {index: 0, type: 0, dora: false, doraValue: 0};
	}
	var tile = view.DesktopMgr.Inst.lastqipai.val;
	tile.doraValue = getTileDoraValue(tile);
	return tile;
}

function makeCall(type) {
	app.NetAgent.sendReq2MJ('FastTest', 'inputChiPengGang', {type: type, index: 0, timeuse: 2});
}

function makeCallWithOption(type, option) {
	app.NetAgent.sendReq2MJ('FastTest', 'inputChiPengGang', {type: type, index: option, timeuse: 2});
}

function declineCall(operation) {
	if(operation == getOperationList()[getOperationList().length - 1].type) { //Is last operation -> Send decline Command
		app.NetAgent.sendReq2MJ('FastTest', 'inputChiPengGang', {cancel_operation: true, timeuse: 2});
	}
}

function sendRiichiCall(tile, moqie) {
	app.NetAgent.sendReq2MJ('FastTest', 'inputOperation', {type: mjcore.E_PlayOperation.liqi, tile: tile, moqie: moqie, timeuse: 2}); //Moqie: Throwing last drawn tile (Riichi -> false)
}

function callDiscard(tileNumber) {
	view.DesktopMgr.Inst.players[0]._choose_pai = view.DesktopMgr.Inst.players[0].hand[tileNumber];
	view.DesktopMgr.Inst.players[0].DoDiscardTile();
}

function getPlayerLinkState(player) {
	return view.DesktopMgr.player_link_state[localPosition2Seat(player)];
}

function getNumberOfPlayerHand(player) {
	return view.DesktopMgr.Inst.players[player].hand.length;
}

function isEndscreenShown() {
	return view.DesktopMgr.Inst.gameEndResult != null;
}

function isDisconnect() {
	return uiscript.UI_Hanguplogout.Inst != null && uiscript.UI_Hanguplogout.Inst._me.visible;
}

function isPlayerRiichi(player) {
	return view.DesktopMgr.Inst.players[player].liqibang._activeInHierarchy || getDiscardsOfPlayer(player).last_is_liqi;
}

function isInGame() {
	return this != null && view != null && view.DesktopMgr != null && view.DesktopMgr.Inst != null && view.DesktopMgr.player_link_state != null;
}

function getPlayerScore(player) {
	return view.DesktopMgr.Inst.players[player].score;
}

//Needs to be called before calls array is updated
function hasPlayerHandChanged(player) {
	for(var i = 0; i < view.DesktopMgr.Inst.players[player].hand.length; i++) {
		if(view.DesktopMgr.Inst.players[player].hand[i].old != true) {
			return true;
		}
	}
	return getCallsOfPlayer(player).length > calls[player].length;
}

//Sets a variable for each pai in a players hand
function rememberPlayerHand(player) {
	for(var i = 0; i < view.DesktopMgr.Inst.players[player].hand.length; i++) {
		view.DesktopMgr.Inst.players[player].hand[i].old = true;
	}
}
