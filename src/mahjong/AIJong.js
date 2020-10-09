

//################################
// PARAMETERS
// Contains Parameters to change the playstile of the bot
//################################

//AI PARAMETERS
var AUTORUN = true; //Automatically start new Games 
var ROOM = 5; //2 = Bronze East, 3 = Bronze South, 5 = Silver East, ...

//DEFENSE CONSTANTS
var FOLD_CONSTANT = 10; //Lower -> Earlier Fold. Default: 10
var SUJI_MODIFIER = 1; //Higher Value: Suji is worth more

//CALLS
var CALL_CONSTANT = 3; //Amount of han (Open Yaku + Dora) that is needed for calls (to accelerate high value hands). Default: 3
var CALL_YAKU_THRESHOLD = 0.01; //How many Yakus does the hand need to call for tiles? Default: 0.01 (aka medium chance for yaku soon)
var CALL_KAN_CONSTANT = 60; //Higher Value: Higher Threshold for calling Kans. Default: 60
var EFFICIENCY_THRESHOLD = 1; // If efficiency of hand is below this threshhold (& dealer): Call if hand has open yaku.

//HAND EVALUATION CONSTANTS
var EFFICIENCY_VALUE = 1; // 0 -> ignore Efficiency (lol). Default: 1
var YAKU_VALUE = 0.5; // 0 -> ignore Yaku. Default: 0.5
var DORA_VALUE = 0.3; // 0 -> ignore Dora. Default: 0.3
var SAFETY_VALUE = 0.5; // 0 -> Ignore Safety. Default: 0.5
var PAIR_VALUE = 0.5; //Value for the first pair when evaluating the hand (Triples are 1). Default: 0.5
var WAIT_VALUE = 0.3; //Value for good waits when tenpai. Maximum: 1. Default: 0.3

//STRATEGY CONSTANTS
var CHIITOITSU = 5; //Number of Pairs in Hand to go for chiitoitsu
var THIRTEEN_ORPHANS = 10; //Number of Honor/Terminals in hand to go for 13 orphans
var RIICHI_TILES_LEFT = 6; //How many tiles need to be left for calling Riichi
var WAITS_FOR_RIICHI = 3; //Waits needed to call Riichi at the start of the game. Goes down over time. Default: 3

//LOGGING
var LOG_AMOUNT = 3; //Amount of Messages to log for Tile Priorities
var DEBUG = true

//################################
// AI DEFENSE
// Defensive part of the AI
//################################

//Get Dangerlevels for all tiles in hand
function getHandDanger(hand) {
	var handDanger = [];
	for (var i = 0; i < hand.length; i++) {
		var tileDanger = getTileDanger(hand[i]);
		handDanger.push({ tile: hand[i], danger: tileDanger });
	}
	return handDanger;
}

//Returns danger of tile for all players as a number from 0-100
function getTileDanger(tile) {
	var dangerPerPlayer = [0, 100, 100, 100];
	for (var i = 1; i < 4; i++) { //Foreach Player
		var dangerLevel = getPlayerDangerLevel(i);
		if (getLastTileInDiscard(i, tile) != null) { // Check if tile in discard
			dangerPerPlayer[i] = 0;
			continue;
		}

		dangerPerPlayer[i] = getWaitScoreForTileAndPlayer(i, tile);

		if (dangerPerPlayer[i] <= 0) {
			continue;
		}

		//Is Dora? -> 12,5% more dangerous
		dangerPerPlayer[i] *= (1 + (getTileDoraValue(tile) / 8));

		//Is the player going for a flush of that type? -> 30% more dangerous
		if (isGoingForFlush(i, tile.type)) {
			dangerPerPlayer[i] *= 1.3;
		}

		//Danger is at least 5
		if (dangerPerPlayer[i] < 5) {
			dangerPerPlayer[i] = 5;
		}

		//Multiply with Danger Level
		dangerPerPlayer[i] *= getPlayerDangerLevel(i) / 100;
	}

	var dangerNumber = ((dangerPerPlayer[1] + dangerPerPlayer[2] + dangerPerPlayer[3] + Math.max.apply(null, dangerPerPlayer)) / 4); //Most dangerous player counts twice

	return dangerNumber;
}

//Returns danger of tile for all players as a number from 0-100
function getTileDangerOLD(tile) {
	var dangerPerPlayer = [0, 100, 100, 100];
	for (var i = 1; i < 4; i++) { //Foreach Player
		var dangerLevel = getPlayerDangerLevel(i);
		if (getLastTileInDiscard(i, tile) != null) { // Check if tile in discard
			dangerPerPlayer[i] = 0;
			continue;
		}


		if (tile.type == 3) { // Honor tiles
			var availableHonors = availableTiles.filter(t => t.index == tile.index && t.type == tile.type).length;
			if (availableHonors == 0) {
				dangerPerPlayer[i] = 0;
				continue;
			}
			else if (availableHonors == 1) {
				dangerPerPlayer[i] = 10;
			}
			else if (availableHonors == 2) {
				dangerPerPlayer[i] = 60;
			}
			else if (availableHonors == 3) {
				dangerPerPlayer[i] = 90;
			}
		}
		else if (getNumberOfPlayerHand(i) > 1 && getMostRecentDiscardDanger({ index: tile.index + 3, type: tile.type }, i) == 0 || getMostRecentDiscardDanger({ index: tile.index - 3, type: tile.type }, i) == 0) { //Suji
			if (tile.index < 4 || tile.index > 6) {
				dangerPerPlayer[i] -= 40 * SUJI_MODIFIER;
			}
			else {
				dangerPerPlayer[i] -= 10 * SUJI_MODIFIER;
			}
		}


		var recentDiscardDanger = getMostRecentDiscardDanger(tile, i);
		if (recentDiscardDanger == 0) {
			dangerPerPlayer[i] = 0;
			continue;
		}
		else if (recentDiscardDanger == 1) {
			dangerPerPlayer[i] -= 50;
		}
		else if (recentDiscardDanger == 2) {
			dangerPerPlayer[i] -= 20;
		}
		else if (recentDiscardDanger < 99) {
			dangerPerPlayer[i] -= 5;
		}


		//Rest: Outer Tiles
		if (tile.type != 3 && tile.index == 1 || tile.index == 9) {
			dangerPerPlayer[i] -= 6;
		}
		//Rest: Outer Tiles
		if (tile.type != 3 && tile.index == 2 || tile.index == 8) {
			dangerPerPlayer[i] -= 3;
		}


		//Is Dora? -> 12,5% more dangerous
		dangerPerPlayer[i] *= (1 + (getTileDoraValue(tile) / 8));

		//Is the player going for a flush of that type? -> 30% more dangerous
		if (isGoingForFlush(i, tile.type)) {
			dangerPerPlayer[i] *= 1.3;
		}

		//Danger is at least 5
		if (dangerPerPlayer[i] < 5) {
			dangerPerPlayer[i] = 5;
		}

		//Multiply with Danger Level
		dangerPerPlayer[i] *= getPlayerDangerLevel(i) / 100;
	}

	var dangerNumber = ((dangerPerPlayer[1] + dangerPerPlayer[2] + dangerPerPlayer[3] + Math.max.apply(null, dangerPerPlayer)) / 4); //Most dangerous player counts twice

	return dangerNumber;
}

//Returns danger level for players. 100: Tenpai (Riichi)
function getPlayerDangerLevel(player) {
	if (isDebug()) {
		return TEST_DANGER_LEVEL;
	}
	if (getPlayerLinkState(player) == 0) { //Disconnected -> Safe
		return 0;
	}

	if (getNumberOfPlayerHand(player) < 13) { //Some Calls
		var dangerLevel = parseInt(185 - (getNumberOfPlayerHand(player) * 8) - (tilesLeft * 1.5));
	}
	else {
		var dangerLevel = 15 - tilesLeft; //Full hand without Riichi -> Nearly always safe
	}


	if (dangerLevel > 80) {
		dangerLevel = 80;
	}
	else if (isPlayerRiichi(player)) { //Riichi
		dangerLevel = 100;
	}
	else if (dangerLevel < 0) {
		return 0;
	}

	//Account for possible values of hands.

	if (getSeatWind(player) == 1) { //Is Dealer
		dangerLevel += 10;
	}

	dangerLevel += getNumberOfDorasInHand(calls[player]) * 10; //TODO: Does not account for non-red dora. Fix!

	if (isGoingForFlush(player, 0) || isGoingForFlush(player, 1) || isGoingForFlush(player, 2)) {
		dangerLevel += 10;
	}

	return dangerLevel;
}

//Returns the current Danger level of the table
function getCurrentDangerLevel() { //Most Dangerous Player counts extra
	return ((getPlayerDangerLevel(1) + getPlayerDangerLevel(2) + getPlayerDangerLevel(3) + Math.max(getPlayerDangerLevel(1), getPlayerDangerLevel(2), getPlayerDangerLevel(3))) / 4);
}

//Returns the number of turns ago when the tile was most recently discarded
function getMostRecentDiscardDanger(tile, player) {
	var danger = 99;
	for (var i = 0; i < 4; i++) {
		var r = getLastTileInDiscard(i, tile);
		if (player == i && r != null) {
			return 0;
		}
		if (r != null && r.numberOfPlayerHandChanges[player] < danger) {
			danger = r.numberOfPlayerHandChanges[player];
		}
	}

	return danger;
}

//Returns the position of a tile in discards
function getLastTileInDiscard(player, tile) {
	for (var i = discards[player].length - 1; i >= 0; i--) {
		if (discards[player][i].index == tile.index && discards[player][i].type == tile.type) {
			return discards[player][i];
		}
	}
	return null;
}

//Returns the safety of a tile
function getTileSafety(tile) {
	return 1 - (Math.pow(getTileDanger(tile) / 10, 2) / 100);
}

//Returns true if the player is going for a flush of a given type
function isGoingForFlush(player, type) {
	if (calls[player].length <= 3 || calls[player].some(tile => tile.type != type && tile.type != 3)) { //Not enough or different calls -> false
		return false;
	}
	if (discards[player].filter(tile => tile.type == type).length >= (discards[player].length / 6)) { //Many discards of that type -> false
		return false;
	}
	return true;
}

//Returns the Wait Score for a Tile (Possible that anyone is waiting for this tile)
function getWaitScoreForTile(tile) {
	var score = 0;
	for (var i = 1; i < 4; i++) {
		score += getWaitScoreForTileAndPlayer(i, tile);
	}
	return score / 3;
}

//Returns a score how likely this tile can form the last triple/pair for a player
function getWaitScoreForTileAndPlayer(player, tile) {
	var tile0 = getNumberOfTilesAvailable(tile.index, tile.type);
	var tile0Public = tile0 + getNumberOfTilesInHand(ownHand, tile.index, tile.type);
	var factor = getFuritenValue(player, tile);

	var score = 0;

	//Same tile
	score += tile0 * (tile0Public + 1) * 6;

	if (getNumberOfPlayerHand(player) == 1 || tile.type == 3) {
		return score * factor; //Return normalized result
	}

	var tileL3 = getNumberOfTilesAvailable(tile.index - 3, tile.type);
	var tileL3Public = tileL3 + getNumberOfTilesInHand(ownHand, tile.index - 3, tile.type);
	var factorL = getFuritenValue(player, { index: tile.index - 3, type: tile.type });

	var tileL2 = getNumberOfTilesAvailable(tile.index - 2, tile.type);
	var tileL1 = getNumberOfTilesAvailable(tile.index - 1, tile.type);
	var tileU1 = getNumberOfTilesAvailable(tile.index + 1, tile.type);
	var tileU2 = getNumberOfTilesAvailable(tile.index + 2, tile.type);
	var tileU3 = getNumberOfTilesAvailable(tile.index + 3, tile.type);
	var tileU3Public = tileU3 + getNumberOfTilesInHand(ownHand, tile.index + 3, tile.type);
	var factorU = getFuritenValue(player, { index: tile.index + 3, type: tile.type });

	score += (tileL1 * tileL2) * (tile0Public + tileL3Public) * factorL;
	score += (tileU1 * tileU2) * (tile0Public + tileU3Public) * factorU;

	//Lower + Upper Tile -> lower * upper
	score += tileL1 * tileU1 * tile0Public;
	score *= factor;

	if (score > 180) {
		score = 180 + ((score - 180) / 4); //add "overflow" that is worth less
	}

	score /= 1.6; //Divide by this number to normalize result (more or less)

	return score;
}

//Returns 0 if tile is 100% furiten, 1 if not. Value between 0-1 is returned if furiten tile was not called some turns ago.
function getFuritenValue(player, tile) {
	var danger = getMostRecentDiscardDanger(tile, player);
	if (danger == 0) {
		return 0;
	}
	else if (danger == 1) {
		if (calls[player].length > 0) {
			return 0.3;
		}
		return 0.9;
	}
	else if (danger == 2) {
		if (calls[player].length > 0) {
			return 0.8;
		}
		return 0.95;
	}
	return 1;
}

//Sets tile safeties for discards
function updateDiscardedTilesSafety() {
	for (var k = 1; k < 4; k++) { //For all other players
		for (var i = 0; i < 4; i++) { //For all discard ponds
			for (var j = 0; j < discards[i].length; j++) { //For every tile in it
				if (typeof (discards[i][j].numberOfPlayerHandChanges) == "undefined") {
					discards[i][j].numberOfPlayerHandChanges = [0, 0, 0, 0];
				}
				if (hasPlayerHandChanged(k)) {
					if (j == discards[i].length - 1 && k < i && (k <= seat2LocalPosition(getCurrentPlayer()) || seat2LocalPosition(getCurrentPlayer()) == 0)) { //Ignore tiles by players after hand change
						continue;
					}
					discards[i][j].numberOfPlayerHandChanges[k]++;
				}
			}
		}
		rememberPlayerHand(k);
	}
}

//For testing purposes
function compareDangers() {
	setData();
	var avgA = 0;
	var avgB = 0;

	var safeDiff = 0;
	var dangerDiff = 0;
	var dangerCount = 0;
	var safeCount = 0;
	for (var i = 0; i < ownHand.length; i++) {
		var isDead = getPlayerHand(0)[i].ispaopai;
		var a = getTileDanger(ownHand[i]);
		avgA += a;
		var b = getTileDangerOLD(ownHand[i]);
		avgB += b;
		if (isDead) {
			dangerDiff += a - b;
			dangerCount++;
			log("Danger Tile:");
		}
		else {
			safeDiff += a - b;
			safeCount++;
		}
		log(getTileName(ownHand[i]) + " old: " + b + " new: " + a + "(" + getWaitScoreForTileAndPlayer(1, ownHand[i]) + ", " + getWaitScoreForTileAndPlayer(2, ownHand[i]) + ", " + getWaitScoreForTileAndPlayer(3, ownHand[i]) + ")");
	}
	avgA /= ownHand.length;
	avgB /= ownHand.length;
	dangerDiff /= dangerCount;
	safeDiff /= safeCount;
	dangerDiff += avgB - avgA;
	safeDiff += avgB - avgA;
	log("Average Old: " + avgB);
	log("Average New: " + avgA);
	log("Safe Tile Difference (- good): " + safeDiff);
	log("Danger Tile Difference (+ good): " + dangerDiff);
}

//Pretty simple (all 0), but should work in case of crash -> count intelligently upwards
function initialDiscardedTilesSafety() {
	for (var k = 1; k < 4; k++) { //For all other players
		for (var i = 0; i < 4; i++) { //For all discard ponds
			for (var j = 0; j < discards[i].length; j++) { //For every tile in it
				if (typeof (discards[i][j].numberOfPlayerHandChanges) == "undefined") {
					discards[i][j].numberOfPlayerHandChanges = [0, 0, 0, 0];
				}
				var bonus = 0;
				if (k < i) {
					bonus = 1;
				}
				discards[i][j].numberOfPlayerHandChanges[k] = discards[i].length - j - bonus;
			}
		}
	}
}

//################################
// AI OFFENSE
// Offensive part of the AI
//################################

//Look at Hand etc. and decide for a strategy.
//TODO: Thirteen Orphans
function determineStrategy() {

	if (strategy != STRATEGIES.FOLD) {

		var handTriples = parseInt(getTriplesInHand(getHandWithCalls(ownHand)).length / 3);

		if (getPairsInHand(ownHand).length / 2 >= CHIITOITSU && handTriples < 2 && isClosed) { //Check for Chiitoitsu
			strategy = STRATEGIES.CHIITOITSU;
			strategyAllowsCalls = false;
		}
		else {
			strategy = STRATEGIES.GENERAL;
			strategyAllowsCalls = true;
		}
	}
	log("Strategy: " + strategy);
}

//Call a Chi/Pon
//combination example: Array ["6s|7s", "7s|9s"]
function callTriple(combinations, tileForCall) {

	log("Consider call on " + getTileName(tileForCall));

	var handValue = getHandValues(ownHand);
	var newHand = ownHand.concat([tileForCall]);

	var currentHandTriples = getTriplesAndPairsInHand(ownHand);
	var newHandTriples = getTriplesAndPairsInHand(newHand);

	//Find best Combination
	var comb = -1;
	var newTriple = getHandWithoutTriples(newHandTriples.triples, currentHandTriples.triples.concat(tileForCall));
	newTriple = sortHand(newTriple);

	if (newHandTriples.triples.length <= currentHandTriples.triples.length || typeof newTriple[0] == undefined || typeof newTriple[1] == undefined) { //No new triple
		log("Call would form no new triple! Declined!");
		return -1
	}

	for (var i = 0; i < combinations.length; i++) {
		if (combinations[i] == getTileName(newTriple[0]) + "|" + getTileName(newTriple[1]) || combinations[i] == getTileName(newTriple[1]) + "|" + getTileName(newTriple[0])) {

			calls[0].push(newTriple[0]); //Simulate "Call" for hand value calculation
			calls[0].push(newTriple[1]);
			calls[0].push(tileForCall);
			newHand = getHandWithoutTriples(ownHand, [newTriple[0], newTriple[1]]); //Remove called tiles from hand
			var nextDiscard = getDiscardTile(getTilePriorities(newHand)); //Calculate next discard
			newHand = getHandWithoutTriples(newHand, [nextDiscard]); //Remove discard from hand
			var newHandValue = getHandValues(newHand); //Get Value of that hand
			newHandValue.tile = nextDiscard;
			newHandTriples = getTriplesAndPairsInHand(newHand); //Get Triples, to see if discard would make the hand worse
			calls[0].pop();
			calls[0].pop();
			calls[0].pop();

			log("Combination found: " + combinations[i]);
			comb = i;
		}
	}

	if (comb == -1) {
		log("Could not find combination. Call declined!");
		return -1;
	}

	if (shouldFold([newHandValue])) {
		strategyAllowsCalls = false;
	}

	if (!strategyAllowsCalls) { //No Calls allowed
		log("Strategy allows no calls! Declined!");
		return -1;
	}

	// if (newHandValue.yaku.open < CALL_YAKU_THRESHOLD) { //Yaku chance is too bad
	if (newHandValue.yaku.open < 0) { //yaku 番的意思，改为广东牌，无视番
		log("Not enough Yaku! Declined! " + newHandValue.yaku.open + "<" + CALL_YAKU_THRESHOLD);
		return -1;
	}

	if (newHandTriples.triples.length < currentHandTriples.triples.length) { //Destroys triple next turn
		log("Next discard would destroy a triple. Declined!");
		return -1;
	}

	if (parseInt(currentHandTriples.triples.length / 3) == 3 && parseInt(currentHandTriples.pairs.length / 2) == 1) { //New Triple destroys the last pair
		log("Call would destroy last pair! Declined!");
		return -1;
	}

	// if (handValue.efficiency < EFFICIENCY_THRESHOLD && seatWind == 1) { //Low hand efficiency & dealer? -> Go for a fast win
	if (handValue.efficiency < EFFICIENCY_THRESHOLD) {//无视风位
		log("Call accepted because of bad hand and dealer position!");
	}
	else if (newHandValue.yaku.open + getNumberOfDorasInHand(ownHand) >= CALL_CONSTANT && handValue.yaku.open + handValue.dora > newHandValue.yaku.open + newHandValue.dora * 0.7) { //High value hand? -> Go for a fast win
		log("Call accepted because of high value hand!");
	}
	else if (getTileDoraValue(tileForCall) + newHandValue.yaku.open >= handValue.yaku.closed + 0.9) { //Call gives additional value to hand
		log("Call accepted because it boosts the value of the hand!");
	}
	else if (!isClosed && (newHandValue.yaku.open + newHandValue.dora) >= (handValue.yaku.open + handValue.dora) * 0.9) { //Hand is already open and not much value is lost
		log("Call accepted because hand is already open!");
	}
	else { //Decline
		log("Call declined because it does not benefit the hand!");
		return -1;
	}

	isClosed = false;
	return comb;

}

//Call Tile for Kan
function callDaiminkan() {
	if (!isClosed) {
		callKan(getOperations().ming_gang, getTileForCall());
	}
	else {
		declineCall(getOperations().ming_gang);
	}
}

//Add from Hand to existing Pon
function callShouminkan() {
	if (!isClosed) {
		callKan(getOperations().add_gang, getTileForCall());
	}
	else {
		declineCall(getOperations().add_gang);
	}
}

//Closed Kan
function callAnkan(combination) {
	callKan(getOperations().an_gang, getTileFromString(combination[0]));
}

//Needs a semi good hand to call Kans and other players are not dangerous
function callKan(tileForCall) {
	log("Consider Kan.");
	var tiles = getHandValues(getHandWithCalls(ownHand));

	var newTiles = getHandValues(getHandWithCalls(getHandWithoutTriples(ownHand, [tileForCall]))); //Check if efficiency goes down without additional tile

	if (strategyAllowsCalls && tiles.efficiency >= 4 - (tilesLeft / 30) - (1 - (CALL_KAN_CONSTANT / 50)) && getCurrentDangerLevel() < 100 - CALL_KAN_CONSTANT && (tiles.efficiency * 0.95) < newTiles.efficiency) {
		log("Kan accepted!");
		return true
	} else {
		log("Kan declined!");
	}
	return false
}

function callRon() {
	makeCall(getOperations().rong);
}

function callTsumo() {
	makeCall(getOperations().zimo);
}

function callRiichi(tiles) {
	var operations = getOperationList();
	var combination = [];
	for (var i = 0; i < operations.length; i++) {
		if (operations[i].type == getOperations().liqi) { //Get possible tiles for discard in riichi
			combination = operations[i].combination;
		}
	}
	log(JSON.stringify(combination)); //Sometimes throws dora before normal tile
	for (var i = 0; i < tiles.length; i++) {
		for (var j = 0; j < combination.length; j++) {
			if (combination[j].charAt(0) == "0") { //Fix for Dora Tiles
				combination.push("5" + combination[j].charAt(1));
			}
			if (getTileName(tiles[i].tile) == combination[j] && shouldRiichi(tiles[i].waits, tiles[i].yaku)) {
				var moqie = false;
				if (getTileName(tiles[i].tile) == getTileName(ownHand[ownHand.length - 1])) { //Is last tile?
					moqie = true;
				}
				log("Call Riichi!");
				sendRiichiCall(combination[j], moqie);
				return;
			}
		}
	}
	log("Riichi declined!");
	discardTile(tiles[0].tile); //In case we are furiten(?)/no tiles available
}

//Discard the safest tile in hand
function discardFold() {
	var tileDangers = getHandDanger(ownHand);
	var tile;
	var maxDanger = 1000;
	log("Danger Levels:");
	for (var i = 0; i < tileDangers.length; i++) {
		log(getTileName(tileDangers[i].tile) + " : " + tileDangers[i].danger);
		if (tileDangers[i].danger < maxDanger) {
			tile = tileDangers[i].tile;
			maxDanger = tileDangers[i].danger;
		}
	}
	discardTile(tile);
	return tile;
}

//Remove the given Tile from Hand
function discardTile(tile) {
	log("Discard: " + getTileName(tile));
	for (var i = 0; i < ownHand.length; i++) {
		if (ownHand[i].index == tile.index && ownHand[i].type == tile.type && ownHand[i].dora == tile.dora) {
			discards[0].push(ownHand[i]);
			if (!isDebug()) {
				callDiscard(i);
			}
			else {
				ownHand.splice(i, 1);
			}
			break;
		}
	}
}

//Simulates discarding every tile and calculates hand value
function getTilePriorities(inputHand) {
	if (isDebug()) {
		// log("Dora: " + getTileName(dora[0]));
		printHand(inputHand);
	}

	if (strategy == STRATEGIES.CHIITOITSU) {
		return chiitoitsuPriorities();
	}

	var tiles = [];
	for (var i = 0; i < inputHand.length; i++) { //Create 13 Tile hands

		var hand = [...inputHand];
		hand.splice(i, 1);

		tiles.push(getHandValues(hand, inputHand[i]));

	}

	tiles = tiles.sort(function (p1, p2) {
		return p2.value - p1.value;
	});
	return tiles;
}

//Calculates Priorities for all tiles in the hand. "Bottleneck" of the AI, can take quite long with more recursion.
function getHandValues(hand, tile) {
	var newTiles1 = getUsefulTilesForDouble(hand); //For all single tiles: Find tiles that make them doubles

	var combinations = getTriplesAndPairsInHand(hand);
	var triples = combinations.triples;
	var pairs = combinations.pairs;


	var callTriples = parseInt(getTriplesInHand(calls[0]).length / 3);
	var baseEfficiency = parseInt((triples.length / 3)) + callTriples;
	baseEfficiency = baseEfficiency > 3.5 ? 3.5 : baseEfficiency;
	baseEfficiency += (pairs.length / 2) > 0 ? PAIR_VALUE : 0;
	efficiency = baseEfficiency;
	var baseDora = getNumberOfDorasInHand(triples.concat(pairs, calls[0]));
	var doraValue = baseDora;
	var baseYaku = getYaku(hand, calls[0]);
	var yaku = baseYaku;
	var waits = 0;

	//More accurat but slower with triples in hand
	var newHand = hand;//getHandWithoutTriples(hand, triples);

	var valueForTile = []; //List of tiles and their value, for second step
	var tileCombinations = []; //List of combinations for second step
	for (var j = 0; j < newTiles1.length; j++) { //TODO: Ignore Pairs in second step?

		var numberOfTiles1 = getNumberOfNonFuritenTilesAvailable(newTiles1[j].index, newTiles1[j].type, getHandWithoutTriples(newHand, triples.concat(pairs)));
		if (numberOfTiles1 <= 0) {
			continue;
		}

		newHand.push(newTiles1[j]);

		var combinations2 = getTriplesAndPairsInHand(newHand);
		var triples2 = combinations2.triples;
		var pairs2 = combinations2.pairs;

		var e2 = parseInt((triples2.length / 3)) + callTriples;
		e2 = e2 > 3.5 ? 3.5 : e2;
		e2 += (pairs2.length / 2) > 0 ? PAIR_VALUE : 0;

		e2 -= baseEfficiency; //Only additional triples
		var d2 = getNumberOfDorasInHand(triples2.concat(pairs2, calls[0])) - baseDora; //Check new triples and pairs for dora

		var newTiles2 = getUsefulTilesForTriple(newHand);
		for (var k = 0; k < newTiles2.length; k++) {
			if (newTiles1[j].type != newTiles2[k].type) { //Different sorts make no sense
				continue;
			}
			if (tileCombinations.some(t => (getTileName(t.tile1) == getTileName(newTiles2[k]) && getTileName(t.tile2) == getTileName(newTiles1[j])) || (getTileName(t.tile1) == getTileName(newTiles1[j]) && getTileName(t.tile2) == getTileName(newTiles2[k])))) { //Don't calculate combinations multiple times
				continue;
			}
			tileCombinations.push({ tile1: newTiles1[j], tile2: newTiles2[k] });
		}

		var chance = (numberOfTiles1 / availableTiles.length);

		if (!isClosed && getNumberOfTilesInHand(newHand, newTiles1[j].index, newTiles1[j].type) == 3) {
			chance *= 2; //More value to possible triples when hand is open (can call pons from all players)
		}


		if (d2 > 0) { //If this tile incorporates a new dora into the hand. Either by forming a triple or by extending a straight etc.
			doraValue += d2 * chance;
		}

		var y2 = baseYaku;
		if (e2 > 0) { //If this tile forms a new triple
			efficiency += e2 * chance;
			y2 = getYaku(newHand, calls[0]);
			y2.open -= baseYaku.open;
			y2.closed -= baseYaku.closed;
			if (y2.open > 0) {
				yaku.open += y2.open * chance;
			}
			if (y2.closed > 0) {
				yaku.closed += y2.closed * chance;
			}
			if (parseInt((triples2.length / 3)) + callTriples == 4 && pairs2.length == 2) {
				waits += numberOfTiles1 * ((3 - (getWaitScoreForTile(newTiles1[j]) / 90)) / 2); //Factor waits by "uselessness" for opponents
			}
		}

		valueForTile.push({ tile: newTiles1[j], efficiency: e2, dora: d2, yaku: y2 });

		newHand.pop();
	}

	//Second Recursion after drawing 2 pais
	for (var j = 0; j < tileCombinations.length; j++) {
		var numberOfTiles1 = getNumberOfNonFuritenTilesAvailable(tileCombinations[j].tile1.index, tileCombinations[j].tile1.type);
		var numberOfTiles2 = getNumberOfNonFuritenTilesAvailable(tileCombinations[j].tile2.index, tileCombinations[j].tile2.type);
		if (numberOfTiles1 <= 0 || numberOfTiles2 <= 0) {
			continue;
		}
		if (tileCombinations[j].tile1.index == tileCombinations[j].tile2.index && tileCombinations[j].tile1.type == tileCombinations[j].tile2.type) {
			if (numberOfTiles2 == 1) {
				continue;
			}
			var chance = binomialCoefficient(numberOfTiles1, 2) / binomialCoefficient(availableTiles.length, 2);
		}
		else {
			var chance = (binomialCoefficient(numberOfTiles1, 1) * binomialCoefficient(numberOfTiles2, 1)) / binomialCoefficient(availableTiles.length, 2);
		}
		//Old (wrong) formula
		//var chance = ((numberOfTiles1 + numberOfTiles2) / availableTiles.length) * ((numberOfTiles1 + numberOfTiles2) / (availableTiles.length - 1));

		newHand.push(tileCombinations[j].tile1);
		newHand.push(tileCombinations[j].tile2);

		tile1Value = valueForTile.find(t => getTileName(t.tile) == getTileName(tileCombinations[j].tile1));
		tile2Value = valueForTile.find(t => getTileName(t.tile) == getTileName(tileCombinations[j].tile2));

		tile2Value == undefined ? tile2Value = { efficiency: 0, dora: 0, yaku: { open: 0, closed: 0 } } : tile2Value;

		var oldEfficiency = tile1Value.efficiency + tile2Value.efficiency;
		var oldDora = tile1Value.dora + tile2Value.dora;
		var oldYaku = { open: tile1Value.yaku.open + tile2Value.yaku.open, closed: tile1Value.yaku.closed + tile2Value.yaku.closed };

		var combinations3 = getTriplesAndPairsInHand(newHand);
		var triples3 = combinations3.triples;
		var pairs3 = combinations3.pairs;

		var e3 = parseInt((triples3.length / 3)) + callTriples;
		e3 = e3 > 3.5 ? 3.5 : e3;
		e3 += (pairs3.length / 2) > 0 ? PAIR_VALUE : 0;

		e3 -= baseEfficiency + oldEfficiency; //Only additional triples
		var d3 = getNumberOfDorasInHand(triples3.concat(pairs3, calls[0])) - (baseDora + oldDora); //Check new triples and pairs for dora


		if (d3 > 0) {
			doraValue += d3 * chance;
		}

		if (e3 > 0) { //If this tile forms a new triple
			efficiency += e3 * chance;
			var y3 = getYaku(newHand, calls[0]);
			y3.open -= (baseYaku.open + oldYaku.open);
			y3.closed -= (baseYaku.closed + oldYaku.closed);
			if (y3.open > 0) {
				yaku.open += y3.open * chance;
			}
			if (y3.closed > 0) {
				yaku.closed += y3.closed * chance;
			}
		}

		newHand.pop();
		newHand.pop();
	}
	var value = getTileValue(hand, tile, efficiency, yaku, doraValue, waits);
	return { tile: tile, value: value, efficiency: efficiency, dora: doraValue, yaku: yaku, waits: waits };
}

function getTileValue(hand, tile, efficiency, yakus, doraValue, waits) {
	if (typeof tile != "undefined") { //In case only the hand value is evaluated and no discard simulated
		var safety = getTileSafety(tile);
	}
	else {
		var safety = 1;
	}
	if (isClosed) {
		var yaku = yakus.closed;
	}
	else {
		var yaku = yakus.open;
	}

	//If Tenpai: Add number of waits to efficiency
	var triplesAndPairs = getTriplesAndPairsInHand(hand.concat(calls[0]));
	handWithoutTriplesAndPairs = getHandWithoutTriples(hand, triplesAndPairs.triples.concat(triplesAndPairs.pairs));
	var doubles = getDoublesInHand(handWithoutTriplesAndPairs);
	if (isTenpai(triplesAndPairs, doubles, efficiency)) {
		efficiency += (waits / (11 - (WAIT_VALUE * 10)));
	}

	return ((efficiency * EFFICIENCY_VALUE) + (yaku * YAKU_VALUE) + (doraValue * DORA_VALUE) + (safety * SAFETY_VALUE)) / (EFFICIENCY_VALUE + YAKU_VALUE + DORA_VALUE + SAFETY_VALUE);
}

//Get Chiitoitsu Priorities -> Look for Pairs
function chiitoitsuPriorities() {

	var tiles = [];

	for (var i = 0; i < ownHand.length; i++) { //Create 13 Tile hands, check for pairs
		var newHand = [...ownHand];
		newHand.splice(i, 1);
		var pairs = getPairsInHand(newHand);
		var pairsValue = pairs.length / 2;
		var handWithoutPairs = getHandWithoutTriples(newHand, pairs);
		var doraValue = getNumberOfDorasInHand(pairs);
		var waits = 0;

		var efficiency = pairsValue / 2;
		var dora2 = 0;

		var yaku = getYaku(newHand, calls[0]);
		var baseYaku = yaku;

		//Possible Value, Yaku and Dora after Draw
		var oldTile = { index: 9, type: 9, dora: false };
		availableTiles.forEach(function (tile) {
			if (tile.index != oldTile.index || tile.type != oldTile.type) {
				var currentHand = [...handWithoutPairs];
				currentHand.push(tile);
				var numberOfTiles = getNumberOfNonFuritenTilesAvailable(tile.index, tile.type);
				var chance = (numberOfTiles / availableTiles.length);
				var pairs2 = getPairsInHand(currentHand);
				if (pairs2.length > 0) {
					efficiency += chance / 2;
					doraValue += getNumberOfDorasInHand(pairs2) * chance;
					var y2 = getYaku(newHand, calls[0]);
					y2.open -= yaku.open;
					y2.closed -= baseYaku.closed;
					if (y2.open > 0) {
						yaku.open += y2.open * chance;
					}
					if (y2.closed > 0) {
						yaku.closed += y2.closed * chance;
					}
					waits += numberOfTiles * ((3 - (getWaitScoreForTile(tile) / 90)) / 2); //Factor waits by "uselessness" for opponents
				}
			}
			oldTile = tile;
		});
		var value = getTileValue(newHand, ownHand[i], efficiency, yaku, doraValue, waits);
		tiles.push({ tile: ownHand[i], value: value, efficiency: efficiency, dora: doraValue, yaku: yaku, waits: waits });
	}
	tiles = tiles.sort(function (p1, p2) {
		return p2.value - p1.value;
	});
	return tiles;
}


//Parameter: Tiles with information (efficiency, yaku, dora)
//Discards the "best" tile
function discard() {

	var tiles = getTilePriorities(ownHand);

	if (strategy == STRATEGIES.FOLD || shouldFold(tiles)) {
		//strategy = STRATEGIES.FOLD;
		//strategyAllowsCalls = false;
		return discardFold();
	}

	log("Tile Priorities: ");
	printTilePriority(tiles);

	tile = getDiscardTile(tiles);

	if (canRiichi() && tilesLeft > RIICHI_TILES_LEFT) {
		callRiichi(tiles);
	}
	else {
		discardTile(tile);
	}

	return tile;
}

function getDiscardTile(tiles) {
	var tile = tiles[0].tile;

	if (!isClosed) { //Keep Yaku with open hand
		var highestYaku = -1;
		for (var i = 0; i < tiles.length; i++) {
			if (tiles[i].yaku.open > highestYaku + 0.01) {
				tile = tiles[i].tile;
				highestYaku = tiles[i].yaku.open;
				if (tiles[i].yaku.open >= 1) {
					break;
				}
			}
		}
	}
	return tile;
}

//################################
// LOGGING
// Contains logging functions
//################################

//Print string to HTML or console
function log(t) {
	console.log(t);
}

//Print all tiles in hand
function printHand(hand) {
	var handString = "";
	var oldType = "";
	hand.forEach(function (tile) {
		if (getNameForType(tile.type) != oldType) {
			handString += oldType + " ";
			oldType = getNameForType(tile.type);
		}
		handString += tile.index;
		if (tile.dora == 1) {
			handString += "!";
		}
	});
	handString += oldType;
	log("Hand:" + handString);
}

//Print tile name
function printTile(tile) {
	log(getTileName(tile));
}

//Print given tile priorities
function printTilePriority(tiles) {
	for (var i = 0; i < tiles.length && i < LOG_AMOUNT; i++) {
		log(getTileName(tiles[i].tile) + ": Value: <" + Number(tiles[i].value).toFixed(3) + "> Efficiency: <" + Number(tiles[i].efficiency).toFixed(3) + "> Yakus Open: <" + Number(tiles[i].yaku.open).toFixed(3) + "> Yakus Closed: <" + Number(tiles[i].yaku.closed).toFixed(3) + "> Dora: <" + Number(tiles[i].dora).toFixed(3) + "> Waits: <" + Number(tiles[i].waits).toFixed(3) + "> Safety: " + Number(getTileSafety(tiles[i].tile)).toFixed(2));
	}
}

//Input string to get an array of tiles (e.g. "123m456p789s1z")
function getHandFromString(inputString) {
	var numbers = [];
	var tiles = [];
	for (var i = 0; i < inputString.length; i++) {
		var type = 4;
		switch (inputString[i]) {
			case "p":
				type = 0;
				break;
			case "m":
				type = 1;
				break;
			case "s":
				type = 2;
				break;
			case "z":
				type = 3;
				break;
			default:
				numbers.push(inputString[i]);
				break;
		}
		if (type != "4") {
			for (var j = 0; j < numbers.length; j++) {
				tiles.push({ index: parseInt(numbers[j]), type: type, dora: false, doraValue: 0 });
			}
			numbers = [];
		}
	}
	return tiles;
}

//Input string to get a tiles (e.g. "1m")
function getTileFromString(inputString) {
	var type = 4;
	var dr = false;
	switch (inputString[1]) {
		case "p"://万
			type = 0;
			break;
		case "m"://筒
			type = 1;
			break;
		case "s"://条
			type = 2;
			break;
		case "z"://字？
			type = 3;
			break;
	}
	if (inputString[0] == "0") {
		inputString[0] = 5;
		dr = true;
	}
	if (type != "4") {
		var tile = { index: parseInt(inputString[0]), type: type, dora: dr };
		tile.doraValue = getTileDoraValue(tile);
		return tile;
	}
	return null;
}

//Returns the name for a tile
function getTileName(tile) {
	if (tile.dora == true) {
		return "0" + getNameForType(tile.type);
	}
	return tile.index + getNameForType(tile.type);
}

//Returns the corresponding char for a type
function getNameForType(type) {
	switch (type) {
		case 0:
			return "p"
			break;
		case 1:
			return "m"
			break;
		case 2:
			return "s"
			break;
		case 3:
			return "z"
			break;
	}
}


//### GLOBAL VARIABLES DO NOT CHANGE ###
var run = false; //Is the bot running
const STRATEGIES = { //ENUM of strategies
	GENERAL: 'General',
	CHIITOITSU: 'Chiitoitsu',
	FOLD: 'Fold'
}
var strategy = STRATEGIES.GENERAL; //Current strategy
var strategyAllowsCalls = true; //Does the current strategy allow calls?
var isClosed = true; //Is own hand closed?
var dora = []; //Array of Tiles (index, type, dora)
var ownHand = [];  //index, type, dora
var discards = []; //Later: Change to array for each player
var calls = []; //Calls/Melds of each player
var availableTiles = []; //Tiles that are available
var seatWind = 1; //1: East,... 4: North
var roundWind = 1; //1: East,... 4: North
var tilesLeft = 0; //tileCounter
var visibleTiles = []; //Tiles that are visible
var errorCounter = 0; //Counter to check if bot is working
var lastTilesLeft = 0; //Counter to check if bot is working
var isConsideringCall = false;

//TEST
var testRunning = false;
var currentTest = 0;
var passes = 0;
var startTime = 0;
var winValues = [];
var TEST_DANGER_LEVEL = 50;
var testCallTile = {};

//Factorials for chance of tile draw calculation. Pre calculated to save time
var facts = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000, 121645100408832000, 2432902008176640000, 51090942171709440000, 1.1240007277776077e+21, 2.585201673888498e+22, 6.204484017332394e+23, 1.5511210043330986e+25, 4.0329146112660565e+26, 1.0888869450418352e+28, 3.0488834461171384e+29, 8.841761993739701e+30, 2.6525285981219103e+32, 8.222838654177922e+33, 2.631308369336935e+35, 8.683317618811886e+36, 2.9523279903960412e+38, 1.0333147966386144e+40, 3.719933267899012e+41, 1.3763753091226343e+43, 5.23022617466601e+44, 2.0397882081197442e+46, 8.159152832478977e+47, 3.3452526613163803e+49, 1.4050061177528798e+51, 6.041526306337383e+52, 2.6582715747884485e+54, 1.1962222086548019e+56, 5.5026221598120885e+57, 2.5862324151116818e+59, 1.2413915592536073e+61, 6.082818640342675e+62, 3.0414093201713376e+64, 1.5511187532873822e+66, 8.065817517094388e+67, 4.2748832840600255e+69, 2.308436973392414e+71, 1.2696403353658276e+73, 7.109985878048635e+74, 4.052691950487722e+76, 2.350561331282879e+78, 1.3868311854568986e+80, 8.320987112741392e+81, 5.075802138772248e+83, 3.146997326038794e+85, 1.98260831540444e+87, 1.2688693218588417e+89, 8.247650592082472e+90, 5.443449390774431e+92, 3.647111091818868e+94, 2.4800355424368305e+96, 1.711224524281413e+98, 1.197857166996989e+100, 8.504785885678622e+101, 6.123445837688608e+103, 4.4701154615126834e+105, 3.3078854415193856e+107, 2.480914081139539e+109, 1.8854947016660498e+111, 1.4518309202828584e+113, 1.1324281178206295e+115, 8.946182130782973e+116, 7.156945704626378e+118, 5.797126020747366e+120, 4.75364333701284e+122, 3.945523969720657e+124, 3.314240134565352e+126, 2.8171041143805494e+128, 2.4227095383672724e+130, 2.107757298379527e+132, 1.8548264225739836e+134, 1.6507955160908452e+136, 1.4857159644817607e+138, 1.3520015276784023e+140, 1.24384140546413e+142, 1.1567725070816409e+144, 1.0873661566567424e+146, 1.0329978488239052e+148, 9.916779348709491e+149, 9.619275968248206e+151, 9.426890448883242e+153, 9.33262154439441e+155, 9.33262154439441e+157, 9.425947759838354e+159, 9.614466715035121e+161, 9.902900716486175e+163, 1.0299016745145622e+166, 1.0813967582402903e+168, 1.1462805637347078e+170, 1.2265202031961373e+172, 1.3246418194518284e+174, 1.4438595832024928e+176, 1.5882455415227421e+178, 1.7629525510902437e+180, 1.9745068572210728e+182, 2.2311927486598123e+184, 2.543559733472186e+186, 2.925093693493014e+188, 3.3931086844518965e+190, 3.969937160808719e+192, 4.6845258497542883e+194, 5.574585761207603e+196, 6.689502913449124e+198, 8.09429852527344e+200, 9.875044200833598e+202, 1.2146304367025325e+205, 1.5061417415111404e+207, 1.8826771768889254e+209, 2.372173242880046e+211, 3.012660018457658e+213, 3.8562048236258025e+215, 4.9745042224772855e+217, 6.466855489220472e+219, 8.471580690878817e+221, 1.118248651196004e+224, 1.4872707060906852e+226, 1.992942746161518e+228];

//################################
// UTILS
// Contains utility functions
//################################

//Return number of doras in hand
function getNumberOfDorasInHand(hand) {
	var dr = 0;
	for (var i = 0; i < hand.length; i++) {
		dr += hand[i].doraValue;
	}
	return dr;
}

//Return a hand with only tiles of a specific type
function getHandOfType(inputHand, type) {
	var hand = [...inputHand];
	if (type >= 0 && type <= 3) {
		return hand.filter(tile => tile.type == type);
	}
	return hand;
}

//Pairs in hand
function getPairsInHand(hand) {
	var hand = sortHand(hand);

	var pairs = [];
	var oldIndex = 0;
	var oldType = 0;
	hand.forEach(function (tile) {
		if (oldIndex != tile.index || oldType != tile.type) {
			var tiles = getTilesInHand(hand, tile.index, tile.type);
			if ((tiles.length >= 2)) {
				pairs.push(tiles[0]); //Grabs highest dora tiles first
				pairs.push(tiles[1]);
			}
			oldIndex = tile.index;
			oldType = tile.type;
		}
	});
	return pairs;
}

//Return doubles in hand
function getDoublesInHand(hand) {
	var doubles = [];
	hand.forEach(function (tile) {
		if (isDouble(hand, tile)) {
			doubles.push(tile);
		}
	});
	return doubles;
}


//Tile twice or 2 sequence or "bridge". Might even be triple
function isDouble(hand, tile) {
	var tileNumber = getNumberOfTilesInHand(hand, tile.index, tile.type);
	if (tile.type == 3) {
		return tileNumber == 2;
	}
	return ((tileNumber == 2) ||
		(((getNumberOfTilesInHand(hand, tile.index - 1, tile.type) >= 1) ||
			(getNumberOfTilesInHand(hand, tile.index + 1, tile.type) >= 1) ||
			(getNumberOfTilesInHand(hand, tile.index - 2, tile.type) >= 1) ||
			(getNumberOfTilesInHand(hand, tile.index + 2, tile.type) >= 1)) && tileNumber >= 1));
}

//Return all triples/3-sequences in hand
function getTriplesInHand(inputHand) {
	var hand = sortHand(inputHand);

	var trip = [];
	var pa = [];
	var lastTileIndex = 0;
	for (var i = 0; i < hand.length; i++) {
		if (i != hand.length - 1 && (hand[i].index >= hand[i + 1].index - 1 && hand[i].type == hand[i + 1].type)) { //Split if there is a gap between numbers
			continue;
		}
		var currentHand = hand.slice(lastTileIndex, i + 1);

		var triples = getPonsInHand(currentHand);
		currentHand = getHandWithoutTriples(currentHand, triples);
		var straights = getBestChisInHand(currentHand);

		var currentHand = hand.slice(lastTileIndex, i + 1);

		var straights2 = getBestChisInHand(currentHand);
		currentHand = getHandWithoutTriples(currentHand, straights2);
		var triples2 = getPonsInHand(currentHand);

		var t1 = triples.concat(straights);
		var t2 = triples2.concat(straights2);

		if (t1.length > t2.length || (t1.length == t2.length && getNumberOfDorasInHand(t1) > getNumberOfDorasInHand(t2))) {
			t2 = t1;
		}
		trip = trip.concat(t2);

		lastTileIndex = i + 1;
	}

	return trip;
}

//Return all triples/3-sequences and pairs in hand -> 4 and 1 result: winning hand
function getTriplesAndPairsInHand(inputHand) {
	var hand = sortHand(inputHand);

	var trip = [];
	var pa = [];
	var lastTileIndex = 0;
	for (var i = 0; i < hand.length; i++) {
		if (i != hand.length - 1 && (hand[i].index >= hand[i + 1].index - 1 && hand[i].type == hand[i + 1].type)) { //Split if there is a gap between numbers
			continue;
		}

		var currentHand = hand.slice(lastTileIndex, i + 1);
		var triples = getPonsInHand(currentHand);
		currentHand = getHandWithoutTriples(currentHand, triples);
		var p1 = getPairsInHand(currentHand);
		currentHand = getHandWithoutTriples(currentHand, p1);
		var straights = getBestChisInHand(currentHand);

		var currentHand = hand.slice(lastTileIndex, i + 1);

		var straights2 = getBestChisInHand(currentHand);
		currentHand = getHandWithoutTriples(currentHand, straights2);
		var triples2 = getPonsInHand(currentHand);
		currentHand = getHandWithoutTriples(currentHand, triples2);
		var p2 = getPairsInHand(currentHand);

		var t1 = triples.concat(straights);
		var t2 = triples2.concat(straights2);

		//If same: Priorize Chis -> Still double in hand. TODO: Sometimes priorize Pon is better
		if (t1.length > t2.length || (t1.length == t2.length && p1.length > p2.length) || (t1.length == t2.length && p1.length == p2.length && getNumberOfDorasInHand(t1) > getNumberOfDorasInHand(t2))) {
			t2 = t1;
			p2 = p1;
		}
		trip = trip.concat(t2);
		pa = pa.concat(p2);

		lastTileIndex = i + 1;
	}

	return { triples: trip, pairs: pa };
}

//Return hand without given tiles
function getHandWithoutTriples(inputHand, triples) {
	var hand = [...inputHand];

	for (var i = 0; i < triples.length; i++) {
		for (var j = 0; j < hand.length; j++) {
			if (triples[i].index == hand[j].index && triples[i].type == hand[j].type && triples[i].dora == hand[j].dora) {
				hand.splice(j, 1);
				break;
			}
		}
	}

	return hand;
}

//Return hand without given tile
function getHandWithoutTile(inputHand, tile) {
	var hand = [...inputHand];

	for (var j = 0; j < hand.length; j++) {
		if (tile.index == hand[j].index && tile.type == hand[j].type && tile.dora == hand[j].dora) {
			hand.splice(j, 1);
			break;
		}
	}

	return hand;
}

//Return all triples in hand
function getPonsInHand(input_hand) {
	var hand = [...input_hand];
	hand = sortHand(hand);

	var triples = [];
	var oldIndex = 0;
	var oldType = 0;
	hand.forEach(function (tile) {
		if (oldIndex != tile.index || oldType != tile.type) {
			var tiles = getTilesInHand(hand, tile.index, tile.type);
			if ((tiles.length >= 3)) {
				triples.push(tiles[0]); //Grabs highest dora tiles first because of sorting
				triples.push(tiles[1]);
				triples.push(tiles[2]);
			}
			oldIndex = tile.index;
			oldType = tile.type;
		}
	});
	return triples;
}

//Tries to find the best sequences with most dora
function getBestChisInHand(inputHand) {
	var straights = getChisInHand(inputHand, []);
	var straightsB = getChisInHandDownward(inputHand, []);
	if (getNumberOfDorasInHand(straightsB) > getNumberOfDorasInHand(straights)) {
		straights = straightsB;
	}
	return straights;
}

//Return all 3-sequences in hand
function getChisInHand(inputHand, sequences) {

	var hand = [...inputHand];
	hand = sortHand(hand);

	if (hand.length <= 2 || hand[0].type == 3) {
		return sequences;
	}
	var index = hand[0].index;
	var type = hand[0].type;

	var tiles2 = getTilesInHand(hand, index + 1, type);
	var tiles3 = getTilesInHand(hand, index + 2, type);

	if (tiles2.length >= 1 && tiles3.length >= 1) {
		sequences.push(hand[0]);
		sequences.push(tiles2[0]);
		sequences.push(tiles3[0]);

		for (var i = 0; i < hand.length; i++) {
			if (hand[i].index == index + 1 && hand[i].type == type) {
				hand.splice(i, 1);
				break;
			}
		}
		for (var i = 0; i < hand.length; i++) {
			if (hand[i].index == index + 2 && hand[i].type == type) {
				hand.splice(i, 1);
				break;
			}
		}
		hand.splice(0, 1);
		return getChisInHand(hand, sequences);
	}
	else {
		hand.splice(0, 1);
		return getChisInHand(hand, sequences);
	}
}

//Return all 3-sequences in hand
function getChisInHandDownward(inputHand, sequences) {

	var hand = [...inputHand];
	hand = sortHandBackwards(hand);

	if (hand.length <= 2 || hand[0].type == 3) {
		return sequences;
	}
	var index = hand[0].index;
	var type = hand[0].type;

	var tiles2 = getTilesInHand(hand, index - 1, type);
	var tiles3 = getTilesInHand(hand, index - 2, type);

	if (tiles2.length >= 1 && tiles3.length >= 1) {
		sequences.push(hand[0]);
		sequences.push(tiles2[0]);
		sequences.push(tiles3[0]);

		for (var i = 0; i < hand.length; i++) {
			if (hand[i].index == index - 1 && hand[i].type == type) {
				hand.splice(i, 1);
				break;
			}
		}
		for (var i = 0; i < hand.length; i++) {
			if (hand[i].index == index - 2 && hand[i].type == type) {
				hand.splice(i, 1);
				break;
			}
		}
		hand.splice(0, 1);
		return getChisInHand(hand, sequences);
	}
	else {
		hand.splice(0, 1);
		return getChisInHand(hand, sequences);
	}
}

//Sort hand
function sortHand(inputHand) {
	var hand = [...inputHand];
	hand = hand.sort(function (p1, p2) { //Sort dora value descending
		return p2.doraValue - p1.doraValue;
	});
	hand = hand.sort(function (p1, p2) { //Sort index ascending
		return p1.index - p2.index;
	});
	hand = hand.sort(function (p1, p2) { //Sort type ascending
		return p1.type - p2.type;
	});
	return hand;
}

//Sort hand backwards (For 3-sequences search)
function sortHandBackwards(inputHand) {
	var hand = [...inputHand];
	hand = hand.sort(function (p1, p2) { //Sort dora value descending
		return p2.doraValue - p1.doraValue;
	});
	hand = hand.sort(function (p1, p2) { //Sort index ascending
		return p2.index - p1.index;
	});
	hand = hand.sort(function (p1, p2) { //Sort type ascending
		return p1.type - p2.type;
	});
	return hand;
}

//Return number of specific tiles available
function getNumberOfTilesAvailable(index, type) {
	if (index < 1 || index > 9) {
		return 0;
	}

	return 4 - visibleTiles.filter(tile => tile.index == index && tile.type == type).length;
}

//Return number of specific non furiten tiles available
function getNumberOfNonFuritenTilesAvailable(index, type, lastTiles) {
	if (typeof lastTiles != "undefined" && lastTiles.length == 2) { // Sequence furiten
		lastTiles = sortHand(lastTiles);
		if (lastTiles[0].type == lastTiles[1].type && lastTiles[1].index - lastTiles[0].index == 1) { //Is it a 2-tile sequence
			if (index == lastTiles[1].index + 1 && type == lastTiles[1].type) { //Upper Tile -> Check if lower tile is furiten
				if (discards[0].some(tile => tile.index == lastTiles[0].index - 1 && tile.type == type)) {
					return 0;
				}
			}
			else if (index == lastTiles[0].index - 1 && type == lastTiles[0].type) { //Upper Tile -> Check if lower tile is furiten
				if (discards[0].some(tile => tile.index == lastTiles[1].index + 1 && tile.type == type)) {
					return 0;
				}
			}
		}
	}
	if (discards[0].some(tile => tile.index == index && tile.type == type)) { //Same tile furiten
		return 0;
	}
	return getNumberOfTilesAvailable(index, type);
}

//Return number of specific tile in hand
function getNumberOfTilesInHand(hand, index, type) {
	return hand.filter(tile => tile.index == index && tile.type == type).length;
}

//Return specific tiles in hand
function getTilesInHand(inputHand, index, type) {
	var hand = [...inputHand];
	return hand.filter(tile => tile.index == index && tile.type == type);
}

//Update the available tile pool
function updateAvailableTiles() {
	visibleTiles = dora.concat(ownHand, discards[0], discards[1], discards[2], discards[3], calls[0], calls[1], calls[2], calls[3]);
	availableTiles = [];
	for (var i = 0; i <= 3; i++) {
		for (var j = 1; j <= 9; j++) {
			if (i == 3 && j == 8) {
				break;
			}
			for (var k = 1; k <= getNumberOfTilesAvailable(j, i); k++) {
				availableTiles.push({
					index: j,
					type: i,
					dora: false,
					doraValue: getTileDoraValue({ index: j, type: i, dora: false })
				});
			}
		}
	}
	for (var i = 0; i < visibleTiles.length; i++) {
		visibleTiles[i].doraValue = getTileDoraValue(visibleTiles[i]);
	}
}

//Return sum of red dora/dora indicators for tile
function getTileDoraValue(tile) {
	var dr = 0;

	for (var i = 0; i < dora.length; i++) {
		if (dora[i].type == tile.type && getHigherTileIndex(dora[i]) == tile.index) {
			dr++;
		}
	}

	if (!tile.dora) {
		return dr;
	}
	else {
		return dr + 1;
	}
}

//Helper function for dora indicators
function getHigherTileIndex(tile) {
	if (tile.type == 3) {
		if (tile.index == 4) {
			return 1;
		}
		return tile.index == 7 ? 5 : tile.index + 1;
	}
	else {
		return tile.index == 9 ? 1 : tile.index + 1;
	}
}

//Returns 0 if not winning hand. Returns value of yaku/dora otherwise.
//Only used for benchmark
function checkWin(hand) {
	var win = getTriplesAndPairsInHand(hand);
	if (parseInt((win.triples.length / 3)) >= 4 && parseInt((win.pairs.length / 2)) >= 1) {
		if (isClosed) {
			return getNumberOfDorasInHand(hand) + getYaku(hand).closed;
		}
		else {
			return getNumberOfDorasInHand(hand) + getYaku(hand).open;
		}
	}
	return 0;
}

//Returns true if DEBUG flag is set
function isDebug() {
	return typeof DEBUG != "undefined";
}

//Adds calls of player 0 to the hand
function getHandWithCalls(inputHand) {
	var hand = inputHand.concat(calls[0]);
	return hand;
}

//Adds a tile if not in array
function pushTileIfNotExists(tiles, index, type) {
	if (tiles.findIndex(t => t.index == index && t.type == type) === -1) {
		var tile = { index: index, type: type, dora: false };
		tile.doraValue = getTileDoraValue(tile);
		tiles.push(tile);
	}
}

//Returns true if player can call riichi
function canRiichi() {
	if (!isDebug()) {
		var operations = getOperationList();
		for (var i = 0; i < operations.length; i++) {
			if (operations[i].type == getOperations().liqi) {
				return true;
			}
		}
	}
	return false;
}

//Returns tiles that can form a triple in one turn for a given hand
function getUsefulTilesForTriple(hand) {
	var tiles = [];
	for (var i = 0; i < hand.length; i++) {

		var amount = getNumberOfTilesInHand(hand, hand[i].index, hand[i].type);
		if (hand[i].type == 3 && amount >= 2) {
			pushTileIfNotExists(tiles, hand[i].index, hand[i].type);
			continue;
		}

		if (amount >= 2) {
			pushTileIfNotExists(tiles, hand[i].index, hand[i].type);
		}

		var amountLower = getNumberOfTilesInHand(hand, hand[i].index - 1, hand[i].type);
		var amountLower2 = getNumberOfTilesInHand(hand, hand[i].index - 2, hand[i].type);
		var amountUpper = getNumberOfTilesInHand(hand, hand[i].index + 1, hand[i].type);
		var amountUpper2 = getNumberOfTilesInHand(hand, hand[i].index + 2, hand[i].type);
		if (hand[i].index - 1 >= 1 && (amount == amountLower + 1 && (amountUpper > 0 || amountLower2 == amount))) { //No need to check if index in bounds
			pushTileIfNotExists(tiles, hand[i].index - 1, hand[i].type);
		}

		if (hand[i].index + 1 <= 9 && (amount == amountUpper + 1 && (amountLower > 0 || amountUpper2 == amount))) {
			pushTileIfNotExists(tiles, hand[i].index + 1, hand[i].type);
		}
	}
	return tiles;
}

//Returns tiles that can form at least a double in one turn for a given hand
function getUsefulTilesForDouble(hand) {
	var tiles = [];
	for (var i = 0; i < hand.length; i++) {
		pushTileIfNotExists(tiles, hand[i].index, hand[i].type);
		if (hand[i].type == 3) {
			continue;
		}

		var amount = getNumberOfTilesInHand(hand, hand[i].index, hand[i].type);

		var amountLower = getNumberOfTilesInHand(hand, hand[i].index - 1, hand[i].type);
		var amountUpper = getNumberOfTilesInHand(hand, hand[i].index + 1, hand[i].type);
		if (amountLower == 0 && hand[i].index - 1 >= 1) {
			pushTileIfNotExists(tiles, hand[i].index - 1, hand[i].type);
		}

		if (amountUpper == 0 && hand[i].index + 1 <= 9) {
			pushTileIfNotExists(tiles, hand[i].index + 1, hand[i].type);
		}
	}
	return tiles;
}

//Returns true if triples, pairs and doubles are valid for tenpai
//Not 100% accurate -> EDIT: efficiency helps, but (probably) still not accurate
function isTenpai(triplesAndPairs, doubles, efficiency) {
	if (strategy == STRATEGIES.CHIITOITSU) {
		return parseInt(triplesAndPairs.pairs.length / 2) >= 6; //Should be enough
	}
	//PROBLEM: If Double & Pair overlap (3 tripels + 1667 -> thinks its tenpai)
	var tenpai = (efficiency >= 3.5 && ((parseInt(triplesAndPairs.triples.length / 3) == 3 && parseInt(triplesAndPairs.pairs.length / 2) >= 1 && ((parseInt(doubles.length / 2) >= 1) || parseInt(triplesAndPairs.pairs.length / 2) >= 2)) || parseInt(triplesAndPairs.triples.length / 3) == 4));
	//if(tenpai) {
	//TODO: Check for Furiten
	//}
	return tenpai;
}

//Return true if: Not last place and the danger level is too high
function shouldFold(tiles) {
	var factor = FOLD_CONSTANT;
	if (isLastGame()) { //Fold earlier when first/later when last in last game
		if (getDistanceToLast() > 0) {
			factor *= 1.5; //Last Place -> Later Fold
		}
		else if (getDistanceToFirst() < 0) {
			var dist = (getDistanceToFirst() / 30000) > -0.5 ? getDistanceToFirst() / 30000 : -0.5;
			factor *= 1 + dist; //First Place -> Easier Fold
		}
	}
	factor *= seatWind == 1 ? 1.1 : 1; //Fold later as dealer
	log("Would fold this hand below " + Number((1 - (((tiles[0].value * tiles[0].value * factor) + (factor / 3)) / 100))).toFixed(2) + " safety.");
	if (typeof tiles[2] != "undefined") {
		var top3Safety = (getTileSafety(tiles[0].tile) + getTileSafety(tiles[1].tile) + getTileSafety(tiles[2].tile)) / 3;
	}
	else {
		var top3Safety = -1;
	}
	var valueFactor = 1 - ((tiles[0].value * tiles[0].value * factor) + (factor / 3)) / 100;
	if (valueFactor > getTileSafety(tiles[0].tile) && valueFactor > top3Safety) {
		log("Tile Safety " + getTileSafety(tiles[0].tile) + " of " + getTileName(tiles[0].tile) + " is too dangerous. FOLD!");
		return true;
	}
	return false;
}

//Only Call Riichi if enough waits and not first with yaku
function shouldRiichi(waits, yaku) {
	if (waits < WAITS_FOR_RIICHI - (2 - (tilesLeft / 35))) { //Not enough waits? -> No Riichi
		return false;
	}
	if (yaku.closed >= 1 && isLastGame() && (getDistanceToFirst() < 0 || (getDistanceToLast() < 0 && getDistanceToLast() >= -1000))) { //First place (or < 1000 before last) and other yaku? -> No Riichi
		return false;
	}
	return true;
}

//Negative number: Distance to second
//Positive number: Distance to first
function getDistanceToFirst() {
	return Math.max(getPlayerScore(1), getPlayerScore(2), getPlayerScore(3)) - getPlayerScore(0);
}

//Negative number: Distance to last
//Positive number: Distance to third
function getDistanceToLast() {
	return Math.min(getPlayerScore(1), getPlayerScore(2), getPlayerScore(3)) - getPlayerScore(0);
}

function isLastGame() {
	// if (ROOM % 3 == 2) { // Hanchan (East Round)
	// 	return getRound() == 3 || getRoundWind() > 1; //East 4 or South X
	// }
	// else { // South Game
	// 	return (getRound() == 3 && getRoundWind() > 1) || getRoundWind() > 2; //South 4 or West X
	// }
	return false; //TODO: South Round
}

//Returns the binomialCoefficient for two numbers. Needed for chance to draw tile calculation. Fails if a faculty of > 134 is needed (should not be the case since there are 134 tiles)
function binomialCoefficient(a, b) {
	numerator = facts[a];
	denominator = facts[a - b] * facts[b];
	return numerator / denominator;
}

//################################
// YAKU
// Contains the yaku calculations
//################################

//Returns the closed and open yaku value of the hand
function getYaku(inputHand, inputCalls) {

	var hand = inputHand.concat(inputCalls); //Add calls to hand

	var yakuOpen = 0;
	var yakuClosed = 0;

	// ### 1 Han ###

	var triplesAndPairs = getTriplesAndPairsInHand(hand);
	//handWithoutTriples = getHandWithoutTriples(hand, triplesAndPairs.triples);
	handWithoutTriplesAndPairs = getHandWithoutTriples(hand, triplesAndPairs.triples.concat(triplesAndPairs.pairs));
	var doubles = getDoublesInHand(handWithoutTriplesAndPairs);
	//var tenpai = isTenpai(triplesAndPairs, doubles);
	var pons = getPonsInHand(hand);
	var chis = getBestChisInHand(hand);

	//Yakuhai
	//Wind/Dragon Triples
	//Open
	if (strategy != STRATEGIES.CHIITOITSU) {
		var yakuhai = getYakuhai(triplesAndPairs.triples);
		yakuOpen += yakuhai.open;
		yakuClosed += yakuhai.closed;
	}

	//Riichi (Bot has better results without additional value for Riichi)
	//Closed
	//var riichi = getRiichi(tenpai);
	//yakuOpen += riichi.open;
	//yakuClosed += riichi.closed;

	//Tanyao
	//Open
	var tanyao = getTanyao(hand, inputCalls);
	yakuOpen += tanyao.open;
	yakuClosed += tanyao.closed;

	//Pinfu (Bot has better results without additional value for Pinfu)
	//Closed
	//var pinfu = getPinfu(triplesAndPairs, doubles, tenpai);
	//yakuOpen += pinfu.open;
	//yakuClosed += pinfu.closed;

	//Iipeikou (Identical Sequences in same type)
	//Closed
	var iipeikou = getIipeikou(triplesAndPairs.triples);
	yakuOpen += iipeikou.open;
	yakuClosed += iipeikou.closed;

	// ### 2 Han ###

	//Chiitoitsu
	//7 Pairs
	//Closed
	// -> Not necessary, because own strategy

	//Sanankou
	//3 concealed triplets
	//Open*
	var sanankou = getSanankou(inputHand);
	yakuOpen += sanankou.open;
	yakuClosed += sanankou.closed;

	//Sankantsu
	//3 Kans
	//Open
	//-> TODO: Should not influence score, but Kan calling.

	//Toitoi
	//All Triplets
	//Open
	var toitoi = getToitoi(hand);
	yakuOpen += toitoi.open;
	yakuClosed += toitoi.closed;

	//Sanshoku Doukou
	//3 same index triplets in all 3 types
	//Open
	var sanshokuDouko = getSanshokuDouko(pons);
	yakuOpen += sanshokuDouko.open;
	yakuClosed += sanshokuDouko.closed;

	//Sanshoku
	//3 same index straights in all types
	//Open/-1 Han after call
	var sanshoku = getSanshoku(chis);
	yakuOpen += sanshoku.open;
	yakuClosed += sanshoku.closed;

	//Shousangen
	//Little 3 Dragons (2 Triplets + Pair)
	//Open
	var shousangen = getShousangen(pons, triplesAndPairs.pairs);
	yakuOpen += shousangen.open;
	yakuClosed += shousangen.closed;

	//Chanta
	//Half outside Hand (including terminals)
	//Open/-1 Han after call
	var chanta = getChanta(pons, chis, triplesAndPairs.pairs);
	yakuOpen += chanta.open;
	yakuClosed += chanta.closed;

	//Honrou
	//All Terminals and Honors (means: Also 4 triplets)
	//Open
	var honrou = getHonrou(hand);
	yakuOpen += honrou.open;
	yakuClosed += honrou.closed;

	//Ittsuu
	//Pure Straight
	//Open/-1 Han after call
	var ittsuu = getIttsuu(triplesAndPairs.triples);
	yakuOpen += ittsuu.open;
	yakuClosed += ittsuu.closed;

	//3 Han

	//Ryanpeikou
	//2 times identical sequences (2 Iipeikou)
	//Closed

	//Junchan
	//All Terminals
	//Open/-1 Han after call
	var junchan = getJunchan(pons, chis, triplesAndPairs.pairs);
	yakuOpen += junchan.open;
	yakuClosed += junchan.closed;

	//Honitsu
	//Half Flush
	//Open/-1 Han after call
	var honitsu = getHonitsu(hand);
	yakuOpen += honitsu.open;
	yakuClosed += honitsu.closed;

	//6 Han

	//Chinitsu
	//Full Flush
	//Open/-1 Han after call
	var chinitsu = getChinitsu(hand);
	yakuOpen += chinitsu.open;
	yakuClosed += chinitsu.closed;

	//Yakuman

	//Daisangen
	//Big Three Dragons
	//Open
	var daisangen = getDaisangen(pons);
	yakuOpen += daisangen.open;
	yakuClosed += daisangen.closed;

	//4 Concealed Triplets
	//Closed

	//All Honours
	//Open

	//All Green
	//Open

	//All Terminals
	//Open

	//Four Little Winds
	//Open

	//4 Kans
	//Open

	//9 Gates
	//Closed

	//Thirteen Orphans
	//Closed

	//Double Yakuman

	//4 Concealed Triplets Single Wait
	//Closed

	//13 Wait Thirteen Orphans
	//Closed

	//True Nine Gates
	//Closed

	//Four Big Winds
	//Open

	return { open: yakuOpen, closed: yakuClosed };
}

//Yakuhai
function getYakuhai(triples) {
	var yakuhai = 0;
	yakuhai = triples.filter(tile => tile.type == 3 && (tile.index > 4 || tile.index == seatWind || tile.index == roundWind)).length / 3;
	yakuhai += triples.filter(tile => tile.type == 3 && tile.index == seatWind && tile.index == roundWind).length / 3;
	return { open: yakuhai, closed: yakuhai };
}

//Riichi
function getRiichi(tenpai) {
	if (tenpai) {
		return { open: 0, closed: 1 };
	}
	return { open: 0, closed: 0 };
}

//Tanyao
function getTanyao(hand, inputCalls) {
	if (hand.filter(tile => tile.type != 3 && tile.index > 1 && tile.index < 9).length >= 13 && inputCalls.filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length == 0) {
		return { open: 1, closed: 1 };
	}
	return { open: 0, closed: 0 };
}

//Pinfu (Does not detect all Pinfu)
function getPinfu(triplesAndPairs, doubles, tenpai) {

	if (isClosed && tenpai && parseInt(triplesAndPairs.triples.length / 3) == 3 && parseInt(triplesAndPairs.pairs.length / 2) == 1 && getPonsInHand(triplesAndPairs.triples).length == 0) {
		doubles = sortHand(doubles);
		for (var i = 0; i < doubles.length - 1; i++) {
			if (doubles[i].index > 1 && doubles[i + 1].index < 9 && Math.abs(doubles[0].index - doubles[1].index) == 1) {
				return { open: 1, closed: 1 };
				break;
			}
		}
	}
	return { open: 0, closed: 0 };
}

//Iipeikou
function getIipeikou(triples) {
	for (var i = 0; i < triples.length; i++) {
		var tiles1 = getNumberOfTilesInHand(triples, triples[i].index, triples[i].type);
		var tiles2 = getNumberOfTilesInHand(triples, triples[i].index + 1, triples[i].type);
		var tiles3 = getNumberOfTilesInHand(triples, triples[i].index + 2, triples[i].type);
		if (tiles1 == 2 && tiles2 == 2 && tiles3 == 2) {
			return { open: 0, closed: 1 };
		}
	}
	return { open: 0, closed: 0 };
}

//Sanankou
function getSanankou(hand) {
	if (!isConsideringCall) {
		var concealedTriples = getPonsInHand(hand);
		if (parseInt(concealedTriples.length / 3) >= 3) {
			return { open: 2, closed: 2 };
		}
	}

	return { open: 0, closed: 0 };
}

//Toitoi
function getToitoi(hand) {
	var pons = getPonsInHand(hand);
	if (parseInt(pons.length / 3) >= 4) {
		return { open: 2, closed: 2 };
	}

	return { open: 0, closed: 0 };
}

//Sanshoku Douko
function getSanshokuDouko(triples) {
	for (var i = 1; i <= 9; i++) {
		if (triples.filter(tile => tile.index == i && tile.type < 3).length >= 9) {
			return { open: 2, closed: 2 };
		}
	}
	return { open: 0, closed: 0 };
}

//Sanshoku Douko
function getSanshoku(chis) {
	for (var i = 1; i <= 7; i++) {
		if (chis.filter(tile => tile.index == i || tile.index == i + 1 || tile.index == i + 2).length >= 9) {
			return { open: 2, closed: 1 };
		}
	}
	return { open: 0, closed: 0 };
}

//Shousangen - TODO: Check for Kans
function getShousangen(hand) {
	if (hand.filter(tile => tile.type == 3 && tile.index >= 5).length == 8) {
		return { open: 2, closed: 2 };
	}
	return { open: 0, closed: 0 };
}

//Daisangen - TODO: Check for Kans
function getDaisangen(hand) {
	if (hand.filter(tile => tile.type == 3 && tile.index >= 5).length >= 9) {
		return { open: 10, closed: 10 }; //Yakuman -> 10?
	}
	return { open: 0, closed: 0 };
}

//Chanta - poor detection
function getChanta(pons, chis, pairs) {
	if ((pons.concat(pairs)).filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length + (chis.filter(tile => tile.index == 1 || tile.index == 9).length * 3) >= 13) {
		return { open: 1, closed: 2 };
	}
	return { open: 0, closed: 0 };
}

//Honrou
function getHonrou(hand) {
	if (hand.filter(tile => tile.type == 3 || tile.index == 1 || tile.index == 9).length >= 13) {
		return { open: 3, closed: 2 }; // - Added to Chanta
	}
	return { open: 0, closed: 0 };
}

//Junchan
function getJunchan(pons, chis, pairs) {
	if ((pons.concat(pairs)).filter(tile => tile.type != 3 && (tile.index == 1 || tile.index == 9)).length + (chis.filter(tile => tile.index == 1 || tile.index == 9).length * 3) >= 13) {
		return { open: 1, closed: 1 }; // - Added to Chanta
	}
	return { open: 0, closed: 0 };
}

//Ittsuu
function getIttsuu(triples) {
	for (var j = 0; j <= 2; j++) {
		for (var i = 1; i <= 9; i++) {
			if (!triples.some(tile => tile.type == j && tile.index == i)) {
				i = 10;
				continue;
			}
			if (i == 9) {
				return { open: 1, closed: 2 };
			}
		}
	}
	return { open: 0, closed: 0 };
}

//Honitsu
function getHonitsu(hand) {
	if (hand.filter(tile => tile.type == 3 || tile.type == 0).length >= 13 || hand.filter(tile => tile.type == 3 || tile.type == 1).length >= 13 || hand.filter(tile => tile.type == 3 || tile.type == 2).length >= 13) { //&& tenpai ?
		return { open: 2, closed: 3 };
	}
	return { open: 0, closed: 0 };
}

//Chinitsu
function getChinitsu(hand) {
	if (hand.filter(tile => tile.type == 0).length >= 13 || hand.filter(tile => tile.type == 1).length >= 13 || hand.filter(tile => tile.type == 2).length >= 13) { //&& tenpai ?
		return { open: 3, closed: 3 }; //Score gets added to honitsu -> 5/6 han
	}
	return { open: 0, closed: 0 };
}


//Ban
//Set testdata for benchmark
function setTestData() {
	discards = [[], [], [], []];
	calls = [[], [], [], []];
	ownHand = [];
	dora = [];

	availableTiles = []; //Tiles that are available
	visibleTiles = []; //Tiles that are visible

	seatWind = 2;
	roundWind = 1;
	tilesLeft = 70;
	strategy = STRATEGIES.GENERAL;
	EFFICIENCY_VALUE = 1;
	YAKU_VALUE = 2;
	DORA_VALUE = 1;
	SAFETY_VALUE = 0.5;
	PAIR_VALUE = 0.5;
	WAIT_VALUE = 0.3;
	FOLD_CONSTANT = 1000;

	tilesLeft = 68;
}

function getNumberOfPlayerHand(index) {
	return Number_Of_Player_Hand[index]
}

var Number_Of_Player_Hand = []

class AIJong {
	constructor(name) {
		this.my_id = name
	}

	/**
	 * 
	 * @param {服务器返回的用户信息} info 
	 */
	thinkingDraw(info) {//上一个玩家出完牌，可吃，可杠，可胡，可摸牌
		log("==========" + this.my_id + " thinkingDraw==========");
		this.__setInfo(info)
		//能不能胡
		const playInfo = info.player_info
		const hand = playInfo[this.my_id].hand.slice()
		const lastCard = Object.values(info.public_cards[info.public_cards.length - 1])[0]
		let newHand = hand.concat(lastCard)////我的格式，数字面
		if (this.__juggHu(newHand)) {
			return { command: "hu", cards: [] }
		}
		//能不能明杠
		const gangTile = this.__findGang(newHand)
		if (gangTile !== 0) {//可以明杠
			if (callKan(this.__mySingleCardToJongStyleString(gangTile))) {
				const cards = []
				for (let i = 0; i < 3; i++) {
					cards.push(gangTile)
				}
				return { command: "play", cards: cards }
			}
		}
		//要不要吃碰
		const lastTile = getTileFromString(this.__mySingleCardToJongStyleString(lastCard))
		newHand = ownHand.concat(lastTile)
		const tp = this.__myGetAllTriplesAndPairsInHand(newHand)
		const combination = this.__findCombinations(tp, lastTile, 3)
		if (combination.length !== 0) {
			console.log(this.my_id + " 吃碰：" + combination)
			const combIndex = callTriple(combination, lastTile);
			if (combIndex !== -1) {
				const cs = combination[combIndex].split("|")
				const cards = []
				cards.push(this.__tileToMyStyle(getTileFromString(cs[0])))
				cards.push(this.__tileToMyStyle(getTileFromString(cs[1])))
				return { command: "play", cards: cards }
			}
		}
		return { command: "draw", cards: [] }
	}

	/**
	 * 自己回合
	 * @param {*} info 
	 */
	thinking(info) {
		log("==========" + this.my_id + " thinking==========");
		this.__setInfo(info)
		//能不能胡
		const playInfo = info.player_info
		const hand = playInfo[this.my_id].hand.slice()
		const draw = playInfo[this.my_id].draw
		let newHand = hand
		if (draw !== null) {
			newHand = hand.concat(draw)
		}
		if (this.__juggHu(newHand)) {
			return { command: "hu", cards: [] }
		}
		//能不能加杠，能加必加
		if (draw !== null) {
			const jiaGangHand = playInfo[this.my_id].show.slice().concat(draw)
			const jiaTile = this.__findGang(jiaGangHand)
			if (draw === jiaTile && jiaTile !== 0) {//可以补杠
				const cards = [jiaTile | 0x40]
				return { command: "play", cards: cards }
			}
		}
		//能不能暗杠
		const gangTile = this.__findGang(newHand)
		if (gangTile !== 0) {//可以暗杠
			if (callKan(this.__mySingleCardToJongStyleString(gangTile))) {
				const cards = []
				for (let i = 0; i < 4; i++) {
					cards.push(gangTile | 0x40)//第七位，暗杠位
				}
				return { command: "play", cards: cards }
			}
		}
		if (draw !== null) {
			ownHand.push(getTileFromString(this.__mySingleCardToJongStyleString(playInfo[this.my_id].draw)))
		}
		const tile = discard();
		//出什么牌
		return { command: "play", cards: [this.__tileToMyStyle(tile)] }
	}

	looking(info) {
		log("==========" + this.my_id + " looking==========");
		if (info.public_cards.length === 0) {
			log("public card null");
			return null
		}
		const last = info.public_cards[info.public_cards.length - 1]
		if (last === undefined) return null
		const lastCard = Object.values(last)[0]//牌的值
		if (Object.keys(last)[0] === this.my_id) {//牌的key
			console.log("自己刚出的牌，不做判定")
			return null
		}
		this.__setInfo(info)
		//能不能胡
		const playInfo = info.player_info
		const hand = playInfo[this.my_id].hand.slice()
		let newHand = hand.concat(lastCard)
		if (this.__juggHu(newHand)) {
			return { command: "hu", cards: [] }
		}
		//能不能明杠
		const gangTile = this.__findGang(newHand)
		if (gangTile !== 0) {//可以明杠
			if (callKan(this.__mySingleCardToJongStyleString(gangTile))) {
				const cards = []
				for (let i = 0; i < 3; i++) {
					cards.push(gangTile)
				}
				return { command: "play", cards: cards }
			}
		}
		//要不要吃碰
		const lastTile = getTileFromString(this.__mySingleCardToJongStyleString(lastCard))
		newHand = ownHand.concat(lastTile)
		const tp = this.__myGetAllTriplesAndPairsInHand(newHand)
		const combination = this.__findCombinations(tp, lastTile, 2)
		if (combination.length !== 0) {
			console.log(this.my_id + " 吃碰：" + combination)
			const combIndex = callTriple(combination, lastTile);
			if (combIndex !== -1) {
				const cs = combination[combIndex].split("|")
				const cards = []
				cards.push(this.__tileToMyStyle(getTileFromString(cs[0])))
				cards.push(this.__tileToMyStyle(getTileFromString(cs[1])))
				return { command: "play", cards: cards }
			}
		}
		return null
	}

	ting(info, isDraw, isTurn) {
		log("==========" + this.my_id + " ting==========");
		this.__setInfo(info)
		//能不能胡
		const playInfo = info.player_info
		const hand = playInfo[this.my_id].hand.slice()
		const draw = playInfo[this.my_id].draw
		const last = info.public_cards[info.public_cards.length - 1]
		if (last === undefined) {
			return null
		}
		let lastTile = Object.values(last)[0]
		if (draw !== null) {
			lastTile = draw
		}
		if (lastTile === undefined) {
			lastTile = null
		}

		let newHand = hand
		if (lastTile !== null) {
			newHand = hand.concat(lastTile)
		}
		if (this.__juggHu(newHand)) {
			return { command: "hu", cards: [] }
		}
		if (isDraw) {
			return { command: "draw", cards: [] }
		} else if (isTurn) {
			return { command: "play", cards: [draw] }
		}
		return null
	}

	__myGetAllTriplesAndPairsInHand(hand) {
		let newHand = sortHand(hand.slice())
		const pong = getPonsInHand(newHand)
		let chi = []
		for (let i = 0; i < newHand.length - 3; i++) {
			chi = chi.concat(getTriplesInHand(newHand.slice(i)))
		}
		return pong.concat(chi)
	}
	/**
	 * 找对子
	 * 
	 * @param {*} tp 系统给出的判定顺子，刻子
	 * @param {*} lastTile 要判定的牌
	 * @param {*} opecation 第一位为吃，第二位为碰
	 */
	//combination example: Array ["6s|7s", "7s|9s"]
	__findCombinations(tp, lastTile, opecation) {
		const combination = []
		for (let i = 0; i < tp.length; i += 3) {
			if ((tp[i].index === lastTile.index && tp[i].type === lastTile.type) ||
				(tp[i + 1].index === lastTile.index && tp[i + 1].type === lastTile.type) ||
				(tp[i + 2].index === lastTile.index && tp[i + 2].type === lastTile.type)) {
				if ((opecation & 1) !== 1 && tp[i].index !== tp[i + 1].index) {//不能吃的情况
					continue
				}
				if ((opecation & 2) !== 2 && tp[i].index === tp[i + 1].index) {//不能碰的情况
					continue
				}
				const c = []
				if ((opecation & 1) === 1) {//吃的算法
					for (let j = 0; j < 3; j++) {
						if (tp[i + j].index !== lastTile.index) {
							c.push(getTileName(tp[i + j]))
						}
					}
				}
				if ((opecation & 2) === 2) {//碰的算法
					c.push(getTileName(tp[i]))
					c.push(getTileName(tp[i]))
				}

				const s = c[0] + "|" + c[1]
				if (combination.indexOf(s) === -1) {
					combination.push(s)
				}
			}
		}
		return combination
	}

	/**
	 * 
	 * @param {要检查的牌} checkCards 
	 */
	__findGang(checkCards) {
		let tile = 0;
		for (let i in checkCards) {
			tile = checkCards[i]
			let has = 0
			for (let j of checkCards) {
				if (tile === j) {
					has++
				}
			}
			if (has === 4) {
				return tile
			}
		}
		return 0
	}

	__setInfo(info) {
		setTestData()//清空数据
		const playInfo = info.player_info
		const playerKey = Object.keys(playInfo)
		const playerCount = playerKey.length
		const myIdIndex = playerKey.indexOf(this.my_id)
		const nameOfIndex = {}
		let direction = 0
		for (let i = myIdIndex; i < myIdIndex + playerCount; i++) {
			const playerName = playerKey[i % playerCount]
			nameOfIndex[playerName] = direction
			Number_Of_Player_Hand[direction] = playInfo[playerName].hand.length
			direction++
		}
		// ownHand = [];
		const myHand = playInfo[this.my_id].hand.slice()
		if (playInfo[this.my_id].draw != null) {
			myHand.push(playInfo[this.my_id].draw)
		}
		ownHand = getHandFromString(this.__myCardsToJongStyleString(myHand))
		// calls = [[], [], [], []];
		for (let n of playerKey) {
			const show = playInfo[n].show
			calls[nameOfIndex[n]] = getHandFromString(this.__myCardsToJongStyleString(show))
		}
		// discards = [[], [], [], []];
		const publicC = info.public_cards
		for (let c of publicC) {
			const cardName = Object.keys(c)[0]
			const cc = getHandFromString(this.__mySingleCardToJongStyleString(c[cardName]))[0]
			discards[nameOfIndex[cardName]].push(cc)
		}

		updateAvailableTiles();
		initialDiscardedTilesSafety()
	}
	/**
	 * 判定是否胡牌
	 */
	__juggHu(cards) {
		const jongString = this.__myCardsToJongStyleString(cards)
		const tp = getTriplesAndPairsInHand(getHandFromString(jongString))
		if (tp.pairs.length === 2 || tp.pairs.length === 2 * 7) {//单将，或七小对
			return cards.length === tp.triples.length + tp.pairs.length
		}
		return false
	}

	__mySingleCardToJongStyleString(c) {
		let p = ""
		let m = ""
		let s = ""
		let z = ""
		const card = c & 0x3F//去除暗杠标记
		const type = card >> 4
		const number = card & 0xF
		switch (type) {
			case 0:
				p += number
				break;
			case 1:
				m += number
				break;
			case 2:
				s += number
				break;
			case 3:
				z += number
				break;
		}
		let r = ""
		if (p !== "") {
			r += p + "p"
		}
		if (m !== "") {
			r += m + "m"
		}
		if (s !== "") {
			r += s + "s"
		}
		if (z !== "") {
			r += z + "z"
		}
		return r
	}

	__myCardsToJongStyleString(cards) {
		// case "p"://万
		// case "m"://筒
		// case "s"://条
		// case "z"://字？
		const cardSet = cards.slice()
		cardSet.sort((a, b) => { return a > b ? 1 : -1 })
		let p = ""
		let m = ""
		let s = ""
		let z = ""
		for (let c of cards) {
			const card = c & 0x3F//去除暗杠标记
			const type = card >> 4
			const number = card & 0xF
			switch (type) {
				case 0:
					p += number
					break;
				case 1:
					m += number
					break;
				case 2:
					s += number
					break;
				case 3:
					z += number
					break;
			}
		}
		let r = ""
		if (p !== "") {
			r += p + "p"
		}
		if (m !== "") {
			r += m + "m"
		}
		if (s !== "") {
			r += s + "s"
		}
		if (z !== "") {
			r += z + "z"
		}

		return r
	}

	/**
	 * 从jong的格式变回我自己的
	 * @param {*} tile 
	 */
	__tileToMyStyle(tile) {
		return (tile.type << 4) | tile.index
	}
}

module.exports = AIJong