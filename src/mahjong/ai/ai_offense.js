//################################
// AI OFFENSE
// Offensive part of the AI
//################################

//Look at Hand etc. and decide for a strategy.
//TODO: Thirteen Orphans
function determineStrategy() {
	
	if(strategy != STRATEGIES.FOLD) {
	
		var handTriples = parseInt(getTriplesInHand(getHandWithCalls(ownHand)).length/3);

		if(getPairsInHand(ownHand).length/2 >= CHIITOITSU && handTriples < 2 && isClosed) { //Check for Chiitoitsu
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
function callTriple(combinations, operation) {
	
	log("Consider call on " + getTileName(getTileForCall()));

	var handValue = getHandValues(ownHand);
	var newHand = ownHand.concat([getTileForCall()]);
	
	var currentHandTriples = getTriplesAndPairsInHand(ownHand);
	var newHandTriples = getTriplesAndPairsInHand(newHand);
	
	//Find best Combination
	var comb = -1;
	var newTriple = getHandWithoutTriples(newHandTriples.triples, currentHandTriples.triples.concat(getTileForCall())); 
	newTriple = sortHand(newTriple);
	
	if(newHandTriples.triples.length <= currentHandTriples.triples.length || typeof newTriple[0] == undefined || typeof newTriple[1] == undefined) { //No new triple
		log("Call would form no new triple! Declined!");
		declineCall(operation); 
		return false;
	}
	
	for(var i = 0; i < combinations.length; i++) {
		if(combinations[i] == getTileName(newTriple[0]) + "|" + getTileName(newTriple[1]) || combinations[i] == getTileName(newTriple[1]) + "|" + getTileName(newTriple[0])) {
			
			calls[0].push(newTriple[0]); //Simulate "Call" for hand value calculation
			calls[0].push(newTriple[1]);
			calls[0].push(getTileForCall());
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
	
	if(comb == -1) {
		declineCall(operation); 
		log("Could not find combination. Call declined!");
		return false;
	}
	
	if(shouldFold([newHandValue])) {
		strategyAllowsCalls = false;
	}
	
	if(!strategyAllowsCalls) { //No Calls allowed
		log("Strategy allows no calls! Declined!");
		declineCall(operation); 
		return false;
	}
	
	if(newHandValue.yaku.open < CALL_YAKU_THRESHOLD) { //Yaku chance is too bad
		log("Not enough Yaku! Declined! " + newHandValue.yaku.open + "<" + CALL_YAKU_THRESHOLD);
		declineCall(operation); 
		return false;
	}
	
	if(newHandTriples.triples.length < currentHandTriples.triples.length) { //Destroys triple next turn
		log("Next discard would destroy a triple. Declined!");
		declineCall(operation); 
		return false;
	}
	
	if(parseInt(currentHandTriples.triples.length/3) == 3 && parseInt(currentHandTriples.pairs.length/2) == 1) { //New Triple destroys the last pair
		log("Call would destroy last pair! Declined!");
		declineCall(operation); 
		return false;
	}
	
	if(handValue.efficiency < EFFICIENCY_THRESHOLD && seatWind == 1) { //Low hand efficiency & dealer? -> Go for a fast win
		log("Call accepted because of bad hand and dealer position!");
	}
	else if(newHandValue.yaku.open + getNumberOfDorasInHand(ownHand) >= CALL_CONSTANT && handValue.yaku.open + handValue.dora > newHandValue.yaku.open + newHandValue.dora * 0.7) { //High value hand? -> Go for a fast win
		log("Call accepted because of high value hand!");
	}
	else if(getTileDoraValue(getTileForCall()) + newHandValue.yaku.open >= handValue.yaku.closed + 0.9) { //Call gives additional value to hand
		log("Call accepted because it boosts the value of the hand!");
	}
	else if(!isClosed && (newHandValue.yaku.open + newHandValue.dora) >= (handValue.yaku.open + handValue.dora) * 0.9) { //Hand is already open and not much value is lost
		log("Call accepted because hand is already open!");
	}
	else { //Decline
		declineCall(operation);
		log("Call declined because it does not benefit the hand!");
		return false;
	}
	
	makeCallWithOption(operation, comb);
	isClosed = false;
	return true;
	
}

//Call Tile for Kan
function callDaiminkan() {
	if(!isClosed) {
		callKan(getOperations().ming_gang, getTileForCall());
	}
	else {
		declineCall(getOperations().ming_gang);
	}
}

//Add from Hand to existing Pon
function callShouminkan() {
	if(!isClosed) {
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
function callKan(operation, tileForCall) {
	log("Consider Kan.");
	var tiles = getHandValues(getHandWithCalls(ownHand));
	
	var newTiles = getHandValues(getHandWithCalls(getHandWithoutTriples(ownHand, [tileForCall]))); //Check if efficiency goes down without additional tile

	if(strategyAllowsCalls && tiles.efficiency >= 4 - (tilesLeft/30) - (1 - (CALL_KAN_CONSTANT/50)) && getCurrentDangerLevel() < 100 - CALL_KAN_CONSTANT && (tiles.efficiency * 0.95) < newTiles.efficiency) {
		makeCall(operation);
		log("Kan accepted!");
	}
	else {
		declineCall(operation);
		log("Kan declined!");
	}
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
	for(var i = 0; i < operations.length; i++) {
		if(operations[i].type == getOperations().liqi) { //Get possible tiles for discard in riichi
			combination = operations[i].combination;
		}
	}
	log(JSON.stringify(combination)); //Sometimes throws dora before normal tile
	for(var i = 0; i < tiles.length; i++) {
		for(var j = 0; j < combination.length; j++) {
			if(combination[j].charAt(0) == "0") { //Fix for Dora Tiles
				combination.push("5" + combination[j].charAt(1));
			}
			if(getTileName(tiles[i].tile) == combination[j] && shouldRiichi(tiles[i].waits, tiles[i].yaku)) {
				var moqie = false;
				if(getTileName(tiles[i].tile) == getTileName(ownHand[ownHand.length - 1])) { //Is last tile?
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
	for(var i = 0; i < tileDangers.length; i++) {
		log(getTileName(tileDangers[i].tile) + " : " + tileDangers[i].danger);
		if(tileDangers[i].danger < maxDanger) {
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
	for(var i = 0; i < ownHand.length; i++) {
		if(ownHand[i].index == tile.index && ownHand[i].type == tile.type && ownHand[i].dora == tile.dora) {
			discards[0].push(ownHand[i]);
			if(!isDebug()) {
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
	
	if(isDebug()) {
		log("Dora: " + getTileName(dora[0]));
		printHand(inputHand);
	}
	
	if(strategy == STRATEGIES.CHIITOITSU) {
		return chiitoitsuPriorities();
	}
	
	var tiles = [];
	for (var i = 0; i < inputHand.length; i++){ //Create 13 Tile hands

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


	var callTriples = parseInt(getTriplesInHand(calls[0]).length/3);
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
	for(var j = 0; j < newTiles1.length; j++) { //TODO: Ignore Pairs in second step?

		var numberOfTiles1 = getNumberOfNonFuritenTilesAvailable(newTiles1[j].index, newTiles1[j].type, getHandWithoutTriples(newHand, triples.concat(pairs)));
		if(numberOfTiles1 <= 0) {
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
		for(var k = 0; k < newTiles2.length; k++) {
			if(newTiles1[j].type != newTiles2[k].type) { //Different sorts make no sense
				continue;
			}
			if(tileCombinations.some(t => (getTileName(t.tile1) == getTileName(newTiles2[k]) && getTileName(t.tile2) == getTileName(newTiles1[j])) || (getTileName(t.tile1) == getTileName(newTiles1[j]) && getTileName(t.tile2) == getTileName(newTiles2[k])))) { //Don't calculate combinations multiple times
				continue;
			}
			tileCombinations.push({tile1: newTiles1[j], tile2: newTiles2[k]});
		}
		
		var chance = (numberOfTiles1 / availableTiles.length);
		
		if(!isClosed && getNumberOfTilesInHand(newHand, newTiles1[j].index, newTiles1[j].type) == 3) {
			chance *= 2; //More value to possible triples when hand is open (can call pons from all players)
		}
		
		
		if(d2 > 0) { //If this tile incorporates a new dora into the hand. Either by forming a triple or by extending a straight etc.
			doraValue += d2 * chance;
		}
		
		var y2 = baseYaku;
		if(e2 > 0) { //If this tile forms a new triple
			efficiency += e2 * chance;
			y2 = getYaku(newHand, calls[0]);
			y2.open -= baseYaku.open;
			y2.closed -= baseYaku.closed;
			if(y2.open > 0) {
				yaku.open += y2.open * chance;
			}
			if(y2.closed > 0) {
				yaku.closed += y2.closed * chance;
			}
			if(parseInt((triples2.length / 3)) + callTriples == 4 && pairs2.length == 2) {
				waits += numberOfTiles1 * ((3 - (getWaitScoreForTile(newTiles1[j]) / 90)) / 2); //Factor waits by "uselessness" for opponents
			}
		}
		
		valueForTile.push({tile: newTiles1[j], efficiency: e2, dora: d2, yaku: y2});
		
		newHand.pop();
	}	
	
	//Second Recursion after drawing 2 pais
	for(var j = 0; j < tileCombinations.length; j++) {
		var numberOfTiles1 = getNumberOfNonFuritenTilesAvailable(tileCombinations[j].tile1.index, tileCombinations[j].tile1.type);
		var numberOfTiles2 = getNumberOfNonFuritenTilesAvailable(tileCombinations[j].tile2.index, tileCombinations[j].tile2.type);
		if(numberOfTiles1 <= 0 || numberOfTiles2 <= 0) {
			continue;
		}		
		if(tileCombinations[j].tile1.index == tileCombinations[j].tile2.index && tileCombinations[j].tile1.type == tileCombinations[j].tile2.type) {
			if(numberOfTiles2 == 1) {
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
		
		tile2Value == undefined ? tile2Value = {efficiency: 0, dora: 0, yaku: {open: 0, closed: 0}} : tile2Value;
		
		var oldEfficiency = tile1Value.efficiency + tile2Value.efficiency;
		var oldDora = tile1Value.dora + tile2Value.dora;
		var oldYaku = {open : tile1Value.yaku.open + tile2Value.yaku.open, closed: tile1Value.yaku.closed + tile2Value.yaku.closed};

		var combinations3 = getTriplesAndPairsInHand(newHand);
		var triples3 = combinations3.triples;
		var pairs3 = combinations3.pairs;
		
		var e3 = parseInt((triples3.length / 3)) + callTriples;
		e3 = e3 > 3.5 ? 3.5 : e3;
		e3 += (pairs3.length / 2) > 0 ? PAIR_VALUE : 0;
		
		e3 -= baseEfficiency + oldEfficiency; //Only additional triples
		var d3 = getNumberOfDorasInHand(triples3.concat(pairs3, calls[0])) - (baseDora + oldDora); //Check new triples and pairs for dora
		
		
		if(d3 > 0) {
			doraValue += d3 * chance;
		}
		
		if(e3 > 0) { //If this tile forms a new triple
			efficiency += e3 * chance;
			var y3 = getYaku(newHand, calls[0]);
			y3.open -= (baseYaku.open + oldYaku.open);
			y3.closed -= (baseYaku.closed + oldYaku.closed);
			if(y3.open > 0) {
				yaku.open += y3.open * chance;
			}
			if(y3.closed > 0) {
				yaku.closed += y3.closed * chance;
			}
		}
		
		newHand.pop();
		newHand.pop();
	}
	var value = getTileValue(hand, tile, efficiency, yaku, doraValue, waits);
	return{tile : tile, value: value, efficiency : efficiency, dora: doraValue, yaku: yaku, waits: waits};
}

function getTileValue(hand, tile, efficiency, yakus, doraValue, waits) {
	if(typeof tile != "undefined") { //In case only the hand value is evaluated and no discard simulated
		var safety = getTileSafety(tile);
	}
	else {
		var safety = 1;
	}
	if(isClosed) {
		var yaku = yakus.closed;
	}
	else {
		var yaku = yakus.open;
	}
	
	//If Tenpai: Add number of waits to efficiency
	var triplesAndPairs = getTriplesAndPairsInHand(hand.concat(calls[0]));
	handWithoutTriplesAndPairs = getHandWithoutTriples(hand, triplesAndPairs.triples.concat(triplesAndPairs.pairs));
	var doubles = getDoublesInHand(handWithoutTriplesAndPairs);
	if(isTenpai(triplesAndPairs, doubles, efficiency)) {
		efficiency += (waits / (11 - (WAIT_VALUE*10)));
	}
	
	return ((efficiency * EFFICIENCY_VALUE) + (yaku * YAKU_VALUE) + (doraValue * DORA_VALUE) + (safety * SAFETY_VALUE))/(EFFICIENCY_VALUE + YAKU_VALUE + DORA_VALUE + SAFETY_VALUE);
}

//Get Chiitoitsu Priorities -> Look for Pairs
function chiitoitsuPriorities() {
	
	var tiles = [];
	
	for (var i = 0; i < ownHand.length; i++){ //Create 13 Tile hands, check for pairs
		var newHand = [...ownHand];
		newHand.splice(i, 1);
		var pairs = getPairsInHand(newHand);
		var pairsValue = pairs.length/2;
		var handWithoutPairs = getHandWithoutTriples(newHand, pairs);
		var doraValue = getNumberOfDorasInHand(pairs);
		var waits = 0;
		
		var efficiency = pairsValue/2;
		var dora2 = 0;

		var yaku = getYaku(newHand, calls[0]);
		var baseYaku = yaku;
	
		//Possible Value, Yaku and Dora after Draw
		var oldTile = {index: 9, type: 9, dora: false};
		availableTiles.forEach(function(tile) {
			if(tile.index != oldTile.index || tile.type != oldTile.type) {
				var currentHand = [...handWithoutPairs];
				currentHand.push(tile);
				var numberOfTiles = getNumberOfNonFuritenTilesAvailable(tile.index, tile.type);
				var chance = (numberOfTiles / availableTiles.length);
				var pairs2 = getPairsInHand(currentHand);
				if(pairs2.length > 0) {
					efficiency += chance/2;
					doraValue += getNumberOfDorasInHand(pairs2) * chance;
					var y2 = getYaku(newHand, calls[0]);
					y2.open -= yaku.open;
					y2.closed -= baseYaku.closed;
					if(y2.open > 0) {
						yaku.open += y2.open * chance;
					}
					if(y2.closed > 0) {
						yaku.closed += y2.closed * chance;
					}
					waits += numberOfTiles * ((3 - (getWaitScoreForTile(tile) / 90)) / 2); //Factor waits by "uselessness" for opponents
				}
			}
			oldTile = tile;
		});
		var value = getTileValue(newHand, ownHand[i], efficiency, yaku, doraValue, waits);
		tiles.push({tile : ownHand[i], value:value, efficiency : efficiency, dora: doraValue, yaku: yaku, waits: waits});
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
	
	if(strategy == STRATEGIES.FOLD || shouldFold(tiles)) {
		//strategy = STRATEGIES.FOLD;
		//strategyAllowsCalls = false;
		return discardFold();
	}
	
	log("Tile Priorities: ");
	printTilePriority(tiles);
	
	tile = getDiscardTile(tiles);
	
	if(canRiichi() && tilesLeft > RIICHI_TILES_LEFT) {
		callRiichi(tiles);
	}
	else {
		discardTile(tile);
	}
	
	return tile;
}

function getDiscardTile(tiles) {
	var tile = tiles[0].tile;
	
	if(!isClosed) { //Keep Yaku with open hand
		var highestYaku = -1;
		for(var i = 0; i < tiles.length; i++) {
			if(tiles[i].yaku.open > highestYaku + 0.01) {	
				tile = tiles[i].tile;
				highestYaku = tiles[i].yaku.open;
				if(tiles[i].yaku.open >= 1) {
					break;
				}
			}
		}
	}
	return tile;
}