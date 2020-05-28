// Player enters lobby name and game starts once two players are in the same lobby

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

;(function() {
    var player = {
        name: '',
	loaded:false
    }
    var game = {
	turn : null,
	hasConnected : true,
	players:{}
    }
	window.player = player;
    function Deck(){
	var d = [];
	this.reset = function(){
		d = [];
		for(var i=0;i<13;i++){
			for(var j=0;j<4;j++){
				d.push({number:i,type:j});
			}
		}
		d = shuffle(d);
	}
	this.draw = function(){
		var card = d[d.length-1];
		d.pop();
		return card;
	}
    }
    var deck = new Deck();
    function $(id) { 
        return document.getElementById(id); 
    }


    // PubNub
    let lobby = location.hash.substr(2);
    let name = "Xavier";
	player.name = localStorage.getItem("player-name") || "user"+Math.floor(Math.random()*10000);
    if(player.name.length > 15){
	player.name = player.name.substring(0,15);
     }
    localStorage.setItem("player-name",player.name)
    lobby = lobby + 'Lobby'; // separate channel for lobby
    var newUUID = window.localStorage.getItem("uuid");
     if(!newUUID){
        	var newUUID = PubNub.generateUUID();
		window.localStorage.setItem("uuid",newUUID);
	}
    let isHost = false;
    let ChatEngine = '';
    let GuessWordChatEngine = '';

    const PN = new PubNub({
        uuid: newUUID,
        publish_key: 'pub-c-fbbc3d2a-1ffe-4682-932b-433b232c5419',
        subscribe_key: 'sub-c-011aa188-92e6-11ea-8504-ea59babdc551',
        ssl: true
    });
	function printCards(){
		var f = document.createDocumentFragment();
		for(var i=0;i<arguments.length;i++){
			var src = "";
			var type = arguments[i].type;
			var nb = arguments[i].number+1;
			if(nb == 1){
				src = "A";
			}
			else if(nb == 11){
				src = "J";
			}
			else if(nb == 12){
				src = "Q";
			}
			else if(nb == 13){
				src = "K";
			}
			else{
				src = nb;
			}
			src+= ["C","D","H","S"][type];
			src = "cards/"+src+".png";
			var title = "";
			if(nb == 1){
				title = "Ace";
			}
			else if(nb == 11){
				title = "Jack";
			}
			else if(nb == 12){
				title = "Queen";
			}
			else if(nb == 13){
				title = "King";
			}
			else{
				title = nb;
			}
			title += " of "+["clubs","diamonds","hearts","spades"][type]
			var img = document.createElement("img");
			img.className = "card";
			img.title = title;
			img.src = src;
			f.appendChild(img);
		}
		return f;
	}
	function msg(ms){
		PN.publish({
       		 message: ms,
   	         channel: lobby,
       		 sendByPost: true});
	}
	var sendMsg = msg;
	var players = [];
	function updatePlayerStatus(then){
		PN.hereNow({channels:[lobby], includeState:true}, function(status, response){
			var t = response.channels[lobby];
			if(t.occupants.length>1 && !game.turn){
				document.getElementById("status").innerHTML = "You can start when you want";
				document.getElementById("start").style.display = "block";
				document.getElementById("start").addEventListener("click",function(e){startTurn()},false);
			}
			var playerList = [];
			for(var i=0;i<t.occupants.length;i++){
				if(t.occupants[i].state && t.occupants[i].state.name){
					playerList.push(t.occupants[i]);
				}
			}
			players = playerList.sort(function(a,b){return (a.uuid > b.uuid) ? 1 : -1})
			for(var i=0;i<8;i++){
				var td = document.getElementById("player"+(i+1));
				td.querySelector(".player-label").innerText=((playerList[i]||{}).state||{}).name||"";
				if(playerList[i] && playerList[i].uuid){
					td.dataset.uuid = playerList[i].uuid;
					if(playerList[i].uuid == newUUID){
						td.classList.add("self-player")
					}
					else{
						td.classList.remove("self-player")
					}
				}
				else{
					td.removeAttribute("data-uuid");
					td.classList.remove("self-player")
				}
			}
			if(then){then.call(this)}
		});
	}
	window.updatePlayerStatus = updatePlayerStatus;
	function toHand(card){
		var nb = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'][card.number],
		type = ["c","d","h","s"][card.type]
		return nb+type;
	}
        function log(msg,html,classList){
		var t = document.createElement("li");
		if(classList){
			t.className = classList;
		}
		if(html){t.innerHTML = msg}
		else{
		t.innerText = msg;}
		var div = document.getElementById("messages");
		div.appendChild(t);
		div.scrollTop = div.scrollHeight;
	}
	function startTurn(uuid){
		uuid = uuid || newUUID
		deck.reset();
		var turn = {players:{},state:0};
		turn.host = [deck.draw(),deck.draw(),deck.draw(),deck.draw(),deck.draw()];
		for(var i=0;i<players.length;i++){
			turn.players[players[i].uuid] = {};
			var player = turn.players[players[i].uuid];
			player.cards = [deck.draw(), deck.draw()]
			player.bet = 0;
			if(players[i].uuid == uuid){
				player.dealer = true;
			}
			player.fold = false;
			player.score = cardValue([
				turn.host[0],
				turn.host[1],
				turn.host[2],
				turn.host[3],
				turn.host[4],
				player.cards[0],
				player.cards[1],
			])
			player.type = player.score.type
			player.score = player.score.score;
		}
		turn.dealer = uuid;
		var smallBlind = nextUUID(uuid);
		turn.players[smallBlind].smallBlind = true;
		turn.players[smallBlind].bet = 25;
		turn.smallBlind = smallBlind;
		var bigBlind = nextUUID(smallBlind);
		turn.players[bigBlind].bigBlind = true;
		turn.players[bigBlind].bet = 50;
		turn.bigBlind = bigBlind;
		turn.turnUUID = nextUUID(bigBlind);
		msg({
			type:"start_turn",
			turn:turn,
			unique:true
		});
	}
    var lastUniqueMessageType = null;
function isMyTurn(){
	return game.turn.turnUUID == newUUID;
}
function nextUUID(uuid, nonfolded){
		for(var i=0;i<players.length;i++){
			if(players[i].uuid == (uuid||game.turn.turnUUID)){
				if(nonfolded){
					for(var j=i+1;j<players.length;j++){
						if(!game.turn.players[players[j].uuid].fold && game.players[players[j].uuid].money>=25){
							return players[j].uuid;
						}
					}
					for(var j=0;j<i;j++){
						if(!game.turn.players[players[j].uuid].fold && game.players[players[j].uuid].money>=25){
							return players[j].uuid;
						}
					}
					return players[i].uuid;
				}
				else{
					return (players[i+1]||players[0]).uuid
				}
			}
		}
		return null;	
}
function isLastPlayer(uuid){
	var maxBet = 0;
	var everyonePlayed=true;
	forEachPlayer(function(){
		maxBet = Math.max(maxBet, Math.abs(this.bet));
		if(!this.alreadyPlayed){
			everyonePlayed = false;
			return false;
		}
	},true)
	if(!everyonePlayed){return false;}
	forEachPlayer(function(){
		if(this.bet>0 && maxBet != this.bet){
			everyonePlayed = false;
			return false;
		}
	}, true);
	if(!everyonePlayed){return false;}
	return true;
}
function check(){
	if(isMyTurn()){
		msg({
			type:"end_turn",
			action:"check",
			uuid:newUUID,
			next:nextUUID(null,true)
		});
	}
}
function raiseRange(e){
	if(!game.turn){return}
	var money = game.players[newUUID].money;
	var value = document.getElementById("raise-range").value;
	if(value == 100){
		document.getElementById("raise-value").value = money;
	}
	else{
		document.getElementById("raise-value").value = Math.floor(money/25/100)*value*25;
	}
}
function checkRaise(e){
	if(!game.turn){
		document.getElementById("raise-value").value = Math.max(0,Math.floor(document.getElementById("raise-value").value/25)*25);
		return;
	}
	var money = game.players[newUUID].money,
	maxBet = 0;
	forEachPlayer(function(){maxBet = Math.max(maxBet,Math.abs(this.bet))});
	money -= (maxBet - Math.abs(game.turn.players[newUUID].bet))
	if(isNaN(Number(document.getElementById("raise-value").value))){
		document.getElementById("raise-value").value = 0;
	}
	else if(document.getElementById("raise-value").value < money){
		document.getElementById("raise-value").value = Math.max(0,Math.floor(document.getElementById("raise-value").value/25)*25);
	}
	else{
		document.getElementById("raise-value").value = money
	}
	if(document.getElementById("raise-value").value == 0){
		document.getElementById("raise-button").disabled = "disabled"
	}
	else{
		document.getElementById("raise-button").disabled = ""
	}
}
function raise(){
	if(isMyTurn()){
		checkRaise();
		msg({
			type:"end_turn",
			action:"raise",
			amount: document.getElementById("raise-value").value,
			uuid:newUUID,
			next:nextUUID(null,true)
		});
	}
}
function fold(){
	if(isMyTurn()){
		msg({
			type:"end_turn",
			action:"fold",
			uuid:newUUID,
			next:nextUUID(null,true)
		});
	}
}
window.raiseValue = function(val){
	if(isMyTurn()){
		document.getElementById("raise-value").value = Number(document.getElementById("raise-value").value) + Number(val);
		checkRaise();
	};
}
function setName(name){
	name = (name && typeof name == "string") ? name : document.getElementById("player-name").value;
	if(name.length > 15){name = name.substring(0,15);}
	player.name = name;
			PN.setState({
   				state: player,
   				channels: [lobby]
  			});
	localStorage.setItem("player-name",name);
	
}
function buildInterface(){
document.getElementById("check-button").addEventListener("click",check,false);	
document.getElementById("raise-range").addEventListener("input",raiseRange,false);
document.getElementById("raise-value").addEventListener("change",checkRaise,false);
document.getElementById("raise-button").addEventListener("click",raise,false);
document.getElementById("fold-button").addEventListener("click",fold,false);	
document.getElementById("name-button").addEventListener("click",function(){setName()}, false);
document.getElementById("player-name").value = localStorage.getItem("player-name") || "";
}
function buildTurn(){
	clearInterval(prepareInterval);
	requestedReconnect = false;
	if(!game.turn){return;}
	var cards = printCards.apply(this,game.turn.players[newUUID].cards),
	span = getTDbyUUID(newUUID).querySelector(".player-cards");
	while(span.firstChild){
		span.firstChild.parentNode.removeChild(span.firstChild);
	}
	span.appendChild(cards.cloneNode(true));
	var span = document.getElementById("cards");
	while(span.firstChild){
		span.firstChild.parentNode.removeChild(span.firstChild);
	}
	span.appendChild(cards);
	var card = document.createElement("img");
	card.className = "card";
	card.src = "cards/back.png";
	forEachPlayer(function(uuid){
		if(uuid == newUUID){return true;}
		var span = getTDbyUUID(uuid).querySelector(".player-cards");
		while(span.firstChild){
			span.firstChild.parentNode.removeChild(span.firstChild);
		}
		span.appendChild(card.cloneNode());
		span.appendChild(card.cloneNode());
	});
	if(game.turn.turnUUID == newUUID){
		showMyTurn();
	}
	else{
		showNotMyTurn(game.turn.turnUUID);
	}
	refreshBets();
	showGameState();
	if(document.getElementById("messages").firstElementChild){
		log("Turn started",true,"log-turn");
	}

}
function refreshBets(){
	if(game.turn){document.getElementById("start").style.display = "none";}
	forEachPlayer(function(uuid){
		if(game.players[uuid]){
			var td = getTDbyUUID(uuid);
			td.querySelector(".money-label").innerHTML = Number(Math.abs(this.bet));
			if(this.bet<0){
				td.querySelector(".total-money").innerHTML = "All in";
				td.classList.add("all-in");
			}
			else{
				td.querySelector(".total-money").innerHTML = game.players[uuid].money+"$";
				td.classList.remove("all-in");
			}
			if(this.dealer){
				td.classList.add("dealer");
			}
			else{
				td.classList.remove("dealer");
			}
			if(this.fold){
				td.classList.add("fold");
			}
			else{
				td.classList.remove("fold");
			}
			if(uuid == game.turn.turnUUID){
				td.classList.add("turn");
			}
			else{
				td.classList.remove("turn");
			}
		}
	});
	for(var i=1;i<9;i++){
		var td = document.getElementById("player"+i);
		var uuid = td.dataset.uuid;
		if(uuid && game && game.turn && game.turn.players && game.turn.players[uuid]){
			td.classList.add("in-game");
		}
		else{
			td.classList.remove("in-game");
			td.classList.remove("fold");
		}
	}
}
function getPlayerName(uuid,html){
	var name = null;
	for(var i=0;i<players.length;i++){
		if(players[i].uuid == uuid){name = (players[i].state||{}).name}
	}
	if(html){
		var div = document.createElement("div");
		div.innerText = name;
		return div.innerHTML;
	}
	return name;
}
function cardValue(cards){
	cards = cards.sort(function(a,b){
		return a.number > b.number ? 1 : -1
	});
	var isFlush = false, isStraight = false,isStraightFlush=false, isRoyal = false, score = 0;

	// isFlush
	var types=[0,0,0,0];
	for(var i=0;i<cards.length;i++){
		types[cards[i].type]++;
	}
	var flushtype = -1,flushnumber = -1;
	for(var i=0;i<types.length;i++){
		if(types[i]>=5){
			flushtype = i;
			isFlush = true;
			break;
		}
	}
	if(isFlush){
		for(var i = cards.length-1;i>=0;i--){
			if(cards[i].type == flushtype){
				if(cards[i].number == 0 || flushnumber == -1){
					flushnumber = cards[i].number;
				}
			}
		}
	}
	var straight = cards[0].number, nb = 1;
	if(straight == 0 && cards[3].number == 10 && cards[4].number == 11 && cards[5].number == 12 && cards[6].number == 13){
		isRoyal = true;
		isStraight = true;
	}
	else{
		for(var i=1;i<cards.length;i++){
			if(cards[i].number == straight+1){
				straight = cards[i].number;
				nb++;
			}
			else{
				if(nb>=5){break;}
				else{
					straight = cards[i].number;
					nb = 1;
				}
			}
		}
		if(nb>=5){isStraight = true}
	}
	if(isStraight && isFlush && !isRoyal){
		var flstraight = -1,nb=0;
		for(var i=0;i<cards.length;i++){
			if(cards[i].type!=flushtype){
				flstraight = -1, nb = 0;
			}
			else {
				if(flstraight == -1){
					flstraight = cards[i].number;
					nb = 1;
				}
				else if(flstraight+1==cards[i].number){
					flstraight++;
					nb++;
					if(nb>=5){
						isStraightFlush = true;
					}
				}
				else if(nb<5){
					flstraight = -1;
					nb = 0;
				}
				else{
					break;
				}
			}
		}
	}
	if(isRoyal && isFlush){
		if(cards[0].type == cards[3].type &&
		   cards[0].type == cards[4].type &&
		   cards[0].type == cards[5].type &&
		   cards[0].type == cards[6].type){
			isStraightFlush = true;
		}
	}
	cards = cards.sort(function(a,b){
		if(a.number == 0){return 1}
		if(b.number == 0){return -1}
		return a.number > b.number ? 1 : -1
	});
	if(isFlush || isStraightFlush || isStraight){
		if(isStraightFlush){
			if(isRoyal){
				return {type:9,score:200000}
			}
			else{
				return {type:8,score:182000+flstraight}
			}
		}
		else if(isFlush && !isStraight){
			return {type:5,high:flushnumber==0?14:flushnumber,score:166000+(flushnumber==0?14:flushnumber)}
		}
		else if(isStraight){
			score = 169500;
			if(isRoyal){
				score += 14;
			}
			else{
				score += straight;
			}
			return {type:4,high:isRoyal?0:straight,score:score}
		}
	}
	else{
		var values = {},isFour=false,what=-1,isThree=false,pairs=[];
		for(var i=0;i<cards.length;i++){
			if(!values[cards[i].number]){values[cards[i].number]=1}
			else{values[cards[i].number]++}
		}
		for(var i in values){
			if(values.hasOwnProperty(i)){
				if(values[i]>=4){
					isFour = true;what = i;break;
				}
				else if(values[i]==3){
					if(isThree){
						if(what > i){
							pairs.push(i);
						}
						else{
							pairs.push(what);
							what = i;
						}
					}
					else{
						isThree = true;what = i;
					}
				}
				else if(values[i]==2){
					pairs.push(i);
				}
			}
		}
		if(isFour){
			var max = -1
			for(var i = cards.length-1;i>=0;i--){
				if(cards[i].number != what){
					max = cards[i].number;
					break;
				}
			}
			score = 175000;
			score += max;
			score += (what==0?14:what)*100;
			return {type:7,what:what,score:score,hc:max}
		}
		pairs = pairs.sort(function(a,b){
			if(a == 0){return 1}
			if(b == 0){return -1}
			return a > b ? 1 : -1
		});
		if(isThree){
			if(pairs.length>0){
				// Full house
				var score = 170000;
				score += pairs[pairs.length-1];
				score += what*10;
				return {type:6,what:what,pair:pairs[pairs.length-1],score:score}
			}
			else{
				var max = []
				for(var i = cards.length-1;i>=0;i--){
					if(cards[i].number != what){
						max.push(cards[i].number === 0 ? 14 : cards[i].number);
						if(max.length>1){break;}
					}
				}
				var score = 160000;
				score += max[1]
				score += max[2]*10
				score += (what==0?14:what)*100;
				return {type:3, what:what,hc:max, score:score}
			}
		}
		else if(pairs.length>0){
			if(pairs.length==1){
				var max = []
				for(var i = cards.length-1;i>=0;i--){
					if(cards[i].number != pairs[0]){
						max.push(cards[i].number === 0 ? 14 : cards[i].number);
						if(max.length>2){break;}
					}
				}
				score = 130100;
				score += max[2];
				score += max[1]*10
				score += max[0] * 100
				score += (pairs[0]==0?14:pairs[0]) * 1000
				return {type:1, pair:pairs[0],hc:max, score:score}
			}
			else{
				var max = -1
				for(var i = cards.length-1;i>=0;i--){
					if(cards[i].number != pairs[pairs.length-1] && cards[i].number != pairs[pairs.length-2]){
						max = cards[i].number;
						break;
					}
				}
				score = 140300;
				score += (pairs[pairs.length-1]==0?14:pairs[pairs.length-1])*100;
				score += pairs[pairs.length-2]*10;
				score += max;	
				return {type:2,pairs:[pairs[pairs.length-1],pairs[pairs.length-2]],hc:max,score:score}			
			}
		}
		else{
			for(var i = 0;i<5;i++){
				var nb = cards[cards.length-1-i].number
				if(nb == 0){score+=14}
				if(i==0){score+=nb}
				else if(i==1){score+=nb*10}
				else if(i==2){score+=nb*100}
				else if(i==3){score+=nb*1000}
				else if(i==4){score+=nb*10000}
			}
			return {
				type:0,hc:cards[cards.length-1].number,score:score
			}
		}
	}

}
window.calc = function(a){
	var a = a.toLowerCase().split(/\s*,\s*/g), k=[];
	for(var i=0;i<a.length;i++){
		var t = {number:0,type:0};
		if(a[i][0] == "a"){
			t.number=0;
		}
		else if(a[i][0] =="t"){
			t.number=9
		}
		else if(a[i][0] =="j"){
			t.number=10
		}
		else if(a[i][0] =="q"){
			t.number=11
		}
		else if(a[i][0] =="k"){
			t.number=12
		}
		else{t.number = Number(a[i][0])-1} // ["c","d","h","s"]
		if(a[i][1] == "c"){t.type=0}
		else if(a[i][1] == "d"){t.type=1}
		else if(a[i][1] == "h"){t.type=2}
		else if(a[i][1] == "s"){t.type=3}
		k.push(t);
	}
	return cardValue(k);
}
function forEachPlayer(fn, unfolded){
	var ans = true;
	for(var i in game.turn.players){
		if(game.turn.players.hasOwnProperty(i) && (!unfolded || !game.turn.players[i].fold)){
			ans = fn.call(game.turn.players[i], i);
			if(ans === false || ans === 0){
				return;
			}
		}
	}
}
function getTDbyUUID(uuid){
	return document.querySelector("TD[data-uuid=\""+uuid+"\"");
}
function cardText(card,html){
	var txt = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'][card.number] +
		["♣","♦","♥","♠"][card.type];
	if(html & (card.type == 1 || card.type == 2)){
		return "<font color=\"red\">"+txt+"</font>";
	}
	return txt;
}
var requestedReconnect = false;
function showGameState(hide){
	if(!game.turn){return;}
	if(!hide){
		document.getElementById("table").innerHTML="";
	}
	if(!game.turn.state){return;}
	var host = game.turn.host,
	state = game.turn.state;
	var types = ["High card","Pair", "Two Pairs", "Three Of A Kind", "Straight", "Flush", "Full House", "Four Of A Kind", "Straight Flush","Royal Flush"],
	card1 = game.turn.players[newUUID].cards[0],
	card2 = game.turn.players[newUUID].cards[1];
	if(state == 1){
		document.getElementById("table").appendChild(printCards(host[0],host[1],host[2]));
		document.getElementById("cards-label").innerHTML = types[cardValue([host[0],host[1],host[2],card1,card2]).type];
		log("<b>Flop</b> ("+cardText(host[0], true)+", "+cardText(host[1],true)+" and "+cardText(host[2], true)+")", true);
	}
	else if(state == 2){
		document.getElementById("table").appendChild(printCards(host[0],host[1],host[2],host[3]))
		document.getElementById("cards-label").innerHTML = types[cardValue([host[0],host[1],host[2],host[3],card1,card2]).type];
		log("<b>Turn</b> ("+cardText(host[3],true)+")", true);
	}
	else if(state == 3){
		document.getElementById("table").appendChild(printCards(host[0],host[1],host[2],host[3],host[4]))
		document.getElementById("cards-label").innerHTML = types[cardValue([host[0],host[1],host[2],host[3],host[4],card1,card2]).type];
		log("<b>River</b> ("+cardText(host[4],true)+")", true);
	}
	else if(state = 4){
		if(!hide){
			document.getElementById("table").appendChild(printCards(host[0],host[1],host[2],host[3],host[4]))
		}
		for(var i in game.turn.players){
			if(game.turn.players.hasOwnProperty(i) && !game.turn.players[i].fold){
				var player = game.turn.players[i];
				var type = types[player.type]
				if(!hide){
					log("Player <b>"+getPlayerName(i,true)+"</b> reveals "+cardText(player.cards[0],true)+" and "+cardText(player.cards[1],true) + " ("+type+").",true);
					if(i !== newUUID){
						var span = getTDbyUUID(i).querySelector(".player-cards"),
						cards = printCards.apply(this,player.cards);
						while(span.firstChild){
							span.firstChild.parentNode.removeChild(span.firstChild);
						}
						span.appendChild(cards);
					}
				}
				showNotMyTurn();
			}
		}
		// What was the bet
		var keepLooking = true,nbInit=0,
		money = {};
		while(keepLooking){
			keepLooking = false,
			maxScore = 0, uuid = [],isAllIn = false;
			nbInit++;
			if(nbInit>7){break;}
			forEachPlayer(function(id){
				if(!this.ignored){
					if(this.score > maxScore){
						maxScore = this.score;
						uuid = [id];
						if(this.bet<0){isAllIn = true}
						else{isAllIn = false;}
					}
					else if(this.score == maxScore){
						uuid.push(id);
						if(this.bet<0){isAllIn = true}
					}
				}
			},true);
			if(isAllIn){
				// Super complicated
				// With sidepots
				var players = [];
				forEachPlayer(function(i){if(!("removed" in this)){this.removed = 0};this.uuid = i;players.push(this)});
				players = players.sort(function(a, b) {
   						 return parseFloat(Math.abs(a.bet)) - parseFloat(Math.abs(b.bet));
					  });
				var objUUID = {},
				fixedRemoved = [];
				for(var i=0;i<uuid.length;i++){
					objUUID[uuid[i]] = true;
					fixedRemoved.push(Math.abs(game.turn.players[uuid[i]].bet));
				}
				for(var i=0;i<uuid.length;i++){	
					var activated = false,
					amount = 0,
					fixedRemoved = [];
					nbInGame = uuid.length;
					insidePlayer: for(var j=0;j<players.length;j++){
						var portion = (Math.abs(players[j].bet)-players[j].removed)/nbInGame,
						totalfx = 0;
						fx: for(var k=0;k<fixedRemoved.length;k++){
							if(fixedRemoved[k]<=portion){
								break fx;
							}
							else{
								totalfx += fixedRemoved[k];
								portion = (Math.abs(players[j].bet) - players[j].removed - totalfx)/(nbInGame-(k+1));
							}
						}
						if(portion > Math.abs(game.turn.players[uuid[i]].bet)){
							amount += Math.abs(game.turn.players[uuid[i]].bet);
							players[j].removed += Math.abs(game.turn.players[uuid[i]].bet);
						}
						else{
							amount += portion;
							players[j].removed += portion;
						}
					}
					amount = Math.floor(amount/25)*25;
					log("Player <b>"+getPlayerName(uuid[i],true)+"</b> wins "+amount+".",true);
					game.players[uuid[i]].money += amount;
					game.turn.players[uuid[i]].ignored = true;					
				}
				forEachPlayer(function(){
					var rest = Math.abs(this.bet) - this.removed;
					if(rest>1){keepLooking = true;}
				});
			}
			else{
				var total = 0;
				forEachPlayer(function(){total+=Math.abs(this.bet)});
				var win = Math.floor(total/uuid.length/25)*25;
				for(var i=0;i<uuid.length;i++){
					game.players[uuid[i]].money += win;
					log("Player <b>"+getPlayerName(uuid[i],true)+"</b> wins "+win+".",true);
				}
			}
		}
		prepareForNextRound();
		refreshBets();
	}
}
    listener = {
	message:function(msg){
		if(msg.message.unique){
			if(lastUniqueMessageType == msg.message.type){
				return
			}
		}
		lastUniqueMessageType = msg.message.type;
		if(msg.message.type == "resp_reconnect" && requestedReconnect){
				game = msg.message.game || {
								turn : null,
								hasConnected : true,
								players:[]
							    };
				buildTurn();
		}
		else if(msg.message.type == "end_turn"){
			game.turn.turnUUID = msg.message.next;
			// Check for highest bet live
			var maxBet = 0;
			forEachPlayer(function(uuid){
				maxBet = Math.max(maxBet, Math.abs(this.bet));
			});
			var oldPlayer = game.turn.players[msg.message.uuid];
			oldPlayer.alreadyPlayed = true;
			if(msg.message.action == "check"){
				// This handles 'check' and 'call' because 'check' is just a call of 0.
				if(maxBet == Math.abs(oldPlayer.bet)){
					log("<b>"+getPlayerName(msg.message.uuid,true)+"</b> checks.",true);
				}
				else{
					log("<b>"+getPlayerName(msg.message.uuid,true)+"</b> calls.",true);
				}
				if(maxBet >= game.players[msg.message.uuid].money){
					// All in

					oldPlayer.bet = (-game.players[msg.message.uuid].money)-Math.abs(oldPlayer.bet);
					game.players[msg.message.uuid].money = 0;
				}
				else{
					game.players[msg.message.uuid].money -= maxBet - Math.abs(oldPlayer.bet);
					oldPlayer.bet = maxBet;
				}
				refreshBets();
			}
			else if(msg.message.action == "raise"){
				var amount = msg.message.amount;
				amount = Math.max(0,Math.min(amount, game.players[msg.message.uuid].money - (maxBet - Math.abs(oldPlayer.bet))));
				if(amount + (maxBet - Math.abs(oldPlayer.bet)) < game.players[msg.message.uuid].money){
					amount = Math.floor(amount/25)*25;
					game.players[msg.message.uuid].money -= (maxBet - Math.abs(oldPlayer.bet)) + amount;
					oldPlayer.bet = Number(maxBet) + Number(amount);
					log("<b>"+getPlayerName(msg.message.uuid,true)+"</b> raises by "+amount+".",true);
				}
				else{
					oldPlayer.bet = - Number(maxBet) - Number(game.players[msg.message.uuid].money) + Math.abs(oldPlayer.bet);
					game.players[msg.message.uuid].money = 0;
					log("<b>"+getPlayerName(msg.message.uuid,true)+"</b> raises by "+amount+".",true);
				}
				refreshBets();
			}
			else if(msg.message.action == "fold"){
				game.turn.players[msg.message.uuid].fold = true;
				var nbInGame = 0;
				log("<b>"+getPlayerName(msg.message.uuid,true)+"</b> fold.",true);
				forEachPlayer(function(uuid){nbInGame++;},true);
				if(nbInGame<=1){
					game.turn.state = 4;
					showGameState(true);
					forEachPlayer(function(){
						this.alreadyPlayed = false;
					});
					refreshBets();
					return;
				}
				refreshBets();
			}
			if(msg.message.next == newUUID){
				showMyTurn();

			}
			else{showNotMyTurn(msg.message.next)}
			// Are All Player all in ?
			var allin = true;
			forEachPlayer(function(uuid){
				if(game.players[uuid].money >= 25){
					allin = false;return false;
				}
			});
			if(allin){
				game.turn.state = 4;
				showGameState();
				forEachPlayer(function(){
					this.alreadyPlayed = false;
				});
				refreshBets();
			}
			else if(isLastPlayer(msg.message.uuid)){
				game.turn.state++;
				showGameState();
				forEachPlayer(function(){
					this.alreadyPlayed = false;
				});
			}
		}
		if(msg.message.type == "reconnect" && !requestedReconnect){
			sendMsg({
				type: "resp_reconnect",
				unique: true,
				game: game
			});
		}
		else if(msg.message.type == "status"){
			document.getElementById("status").innerHTML = "Game started!";
		}
		else if(msg.message.type == "start_turn"){
			document.getElementById("start").style.display = "none";
			for(var i=0;i<players.length;i++){
				if(!game.players[players[i].uuid]){
					game.players[players[i].uuid] = {money:10000};
				}
			}
			game.players[msg.message.turn.smallBlind].money -= 25;
			game.players[msg.message.turn.bigBlind].money -= 50;
			game.turn = msg.message.turn;
			console.dir(game.turn);
			buildTurn();
		}
	},
        presence: function(response) {
		updatePlayerStatus();
        }, 
        status: function(event) {
	   console.info(event.category);
            if (event.category == 'PNConnectedCategory') {
                if(event.subscribedChannels[0] == lobby){
			PN.setState({
   				state: player,
   				channels: [lobby]
  			},
  			function (status, response) {
				updatePlayerStatus();
    			});
		}
            } 
        }   
    }
function newRound(){
	startTurn(game.turn.smallBlind);
}
var prepareInterval = null;
function prepareForNextRound(){
	var ten = 10;
	prepareInterval = window.setInterval(function(){
		document.getElementById("status").innerHTML = "New turn in "+ten+"s";
		ten--;
		if(ten <= 0){
			clearInterval(prepareInterval);
			newRound();
		}
	},1000);
}
function showMyTurn(){
	document.querySelector("html").classList.add("self-turn");
	document.getElementById("status").innerHTML="Your turn !"
	document.getElementById("raise-value").value = document.getElementById("raise-range").value = 0;
	var all = document.getElementById("controls").querySelectorAll("button,input");
	for(var i=0;i<all.length;i++){
		all[i].disabled = "";
	}
	document.getElementById("raise-button").disabled = "disabled"
	var maxBet = 0;
	forEachPlayer(function(){maxBet = Math.max(maxBet,Math.abs(this.bet))});
	if(maxBet > Math.abs(game.turn.players[newUUID].bet)){
		if(maxBet >= game.players[newUUID].money){
			document.getElementById("check-button").value = "Call All-in";
		}
		else{
			document.getElementById("check-button").value = "Call "+(maxBet-game.turn.players[newUUID].bet);
		}
	}
	else{
		document.getElementById("check-button").value = "Check";
	}
}
function showNotMyTurn(uuid){
	document.querySelector("html").classList.remove("self-turn");
	if(uuid){
		document.getElementById("status").innerHTML="Waiting for "+getPlayerName(uuid)+".";
	}
	var all = document.getElementById("controls").querySelectorAll("button,input");
	for(var i=0;i<all.length;i++){
		all[i].disabled = "disabled";
	}
	document.getElementById("check-button").value = "Check";
}
window.loadGame = function(){
var alreadyhere=false
PN.whereNow({
        uuid: newUUID
    },function(status,response){
	for(var i=0;i<response.channels.length;i++){
		if(response.channels[i] == lobby){
			alreadyhere = true;
		}
	}
	buildInterface();
	if(alreadyhere){
		PN.getState({
        		uuid: newUUID,
        		channels: [lobby],
    		},function (status, response) {
        		if(response && response.channels && response.channels[lobby]){
				player = response.channels[lobby];
				updatePlayerStatus(function(){
					requestedReconnect = true;
					msg({type:"reconnect"});
					
				});
			}
    		});
	}
	else{
		PN.setState({
        		state: player,
        		channels: [lobby],
    		},function (status, response) {
        		updatePlayerStatus();
    		});
	}});
	PN.hereNow({channels:[lobby]},function(status,response){
		if(response.totalOccupancy>=8){
			alert("This game is already full !");
		}
		else{
			PN.subscribe({
				channels: [lobby],
				withPresence: true
			});
		}
	});
    PN.addListener(listener);
}

window.load= function(){
	var hash = location.hash.substr(2);
	var td = document.querySelectorAll('.table-table td[id^="player"]');
	for(var i=0;i<td.length;i++){
		var type = ["top","top","top","left","right","bottom","bottom","bottom"][i];
		td[i].classList.add("cell-"+type);
		td[i].innerHTML = '<div class="td-container"><span class="money-label">0</span><div class="player-cards"></div><div class="player-container"><span class="player-label"></span><span class="total-money"></span></div></div>'
	}
	if(!hash){
		document.getElementById("create-game").style.display = "block";
	}
	else{
		document.getElementById("create-game").style.display = "none";
		document.getElementById("game-interface").style.display = "block";
		log("Share this game : <ins>"+location.href+"</ins>",true);
		loadGame();
	}
	window.onhashchange=function(){location.reload();}
}
})();
function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
function createGame(){
	location.hash="#/"+makeid(12);
	load();
}
  
function showRaise(){
	var btn = document.getElement
}