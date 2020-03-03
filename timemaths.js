window.addEventListener("popstate", function(e){
	if(e.state){
		if(e.state.start){
			showResults(e.state.start, e.state.end, true);
		}
		else if(e.state.query){
		searchfor(e.state.query, {preventDefault:new Function()});
		searchinput.value = e.state.query;
		}
	}
}, false);
data = [];
datao = {}
ready = false;
var lastResults = [];
function call(o){
	data = o.articles;
	var start = +new Date();
	for(var i=0;i<data.length;i++){
		var el = data[i], number = el.number;
		datao[number] = el;
		el.index = i;
		el.cnumber = parseFloat(number, 10) || parseInt(number,10);
		el.position = el.position.replace(/section([^,]+)/, function(a,b){
			return "section"+b.toUpperCase();
		}).replace(/(section[^,]+,[^,]+,)([^,]+)/, function(a,b,c){
			return b + c.toUpperCase();
		}).replace(/\_(\d+)/g, ".$1");
	}
	ready = true;

	var r = /[^a-z]q=([^&?#]+)/i;
	if(r.test(location.search)){
		var q = decodeURIComponent(r.exec(location.search)[1]);
		searchinput.value = q;
		searchfor(q, {preventDefault:new Function()}, true);
	}
	var start = /[^a-z]start=([^&?#]+)/i.exec(location.search),
	end = /[^a-z]start=([^&?#]+)/i.exec(location.search)
	if(r && start){
		start = +start[1];
		end = +(end ? end[1] : start+99);
		if(start && end){
			showResults(start, end, true);
		}
	}
}
function keyarticle(e){
	if(e.keyCode === 40 || e.keyCode === 39){ // Down or Right key
		if(this.nextSibling){
			this.nextSibling.focus();
		}
	}
	else if(e.keyCode == 38 || e.keyCode === 37){ // Up or Left key
		if(this.previousSibling){
			this.previousSibling.focus();
		}
	}
}
function setHTML(selector, html){
	var q = document.querySelectorAll(selector);
	for(var i=0;i<selector.length;i++){
		q[i] ? q[i].innerHTML = html : null;
	}
}
function buildResults(term){
	var results = [];
	term = (term || "").trim();
	if(!ready || !term){return results}
	var terms = [];
	term = term.replace(/(?:^|\s)("([^"]*|")")(?:\s|$)/g, function(a,b){
		terms.push(b);
		return " ";
	}).trim();
	term = term.split(/\s+/);
	terms = terms.concat(term);	
	for(var i=0;i<terms.length;i++){
		var result = search(terms[i]);
		if(result && result.length > 0){
			results.push.apply(results, result);
		}
	}
	return results;
}
function search(term){
	if(!ready){return;}
	term = (term || "").trim();
	if(!term){return;}

	if(/^[0-9.]+$/.test(term)){
		term = term.replace(/^0+/, "");
		if(/^(([0-9]+)|([0-9]+[0-9.]+[0-9]+))$/.test(term)){
			return [datao[term]];
		}
		return [];
	}
	if(/^([0-9.]+)\s*\-\s*([0-9.]+)$/.test(term)){
		var t = /^([0-9.]+)\s*\-\s*([0-9.]+)$/.exec(term);
		var first = parseFloat(t[1]);
		var second = parseFloat(t[2]);
		if(first && second){
			var fr = datao[first.toString()]
			if(fr){
				var results = [];
				for(var i=fr.index;i<data.length;i++){
					var d = data[i]
					if(d.cnumber >= first && d.cnumber <= second){
						results.push(d)
					}
					else{
						break;
					}
				}
				return results;
			}
		}
		return []
	}
	else if(/^[0-9\?\*\.]+$/.test(term)){
		// We create a reg
		var results = [];
		var t = new RegExp("^"+term.replace(/\./g, "\\.").replace(/\?/g,"\\d").replace(/\*/g,"[\\d.]*")+"$", "i");
		for(var i=0;i<data.length;i++){
			var datai = data[i], number = datai.number;
			if(t.test(number)){
				results.push(datai);
			}
		}
		return results;
		
	}
	else if(/^(lastdate|date)\s*[<>=\:]\s*\d{4}/.test(term)){
		var results = []
		var date = /^(?:lastdate|date)\s*([<>=\:])\s*(\d{4})/.exec(term);
		var eq = date[1];
		date = date[2];

		for(var i=0;i<data.length;i++){
			var h = (/(\d{4})[^;]*$/.exec(data[i].historical)||[])[1];
			if(eq == "<" && h<date){
				results.push(data[i]);
			}
			else if(eq == ">" && h>date){
				results.push(data[i]);
			}
			else if((eq == "=" || eq == ":") && h == date){
				results.push(data[i]);
			}
		}
		return results
	}
	else if(/^[^-\?\*'’\^]+$/.test(term)){
		var results = [];
		term = term.replace(/^"(.*)"$/g, "$1").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
		if(term){
			for(var i=0;i<data.length;i++){
				var d = data[i];
				if(!d.normalizedText){
					d.normalizedText = d.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
				}
				if(d.normalizedText.indexOf(term) > -1){
					results.push(d);
				}
			}
		}
		return results
	}
	else{
		var results = [];
		term = term.replace(/^"(.*)"$/g, "$1").trim();
		if(term){
			var regexp = buildRegExpFromTerm(term);
			window.last=regexp;
			for(var i=0;i<data.length;i++){
				var d = data[i];
				if(regexp.test(d.text.normalize("NFD"))){
					results.push(d);
				}
			}
		}
		return results;
	}
}
var el = (function(){
})();
function buildElement(){
}
function buildRegExpFromTerm(term){
	var regexp = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	console.log(regexp);
	var s = "";
	regexp=regexp.replace(/./g,function(char){
		if(char == "*"){
			return "\w*"
		}
		else if(char == "’" || char == "'"){
			return "[’']";
		}
		else if(char == "-"){
			return "\-*";
		}
		else if(char == "^"){
			return "\\b";
		}
		var v =char.charCodeAt(0).toString(16);
		if(v.length === 1){v = "000"+v}
		else if(v.length === 2){v = "00"+v}
		else if(v.length === 3){v = "0"+v}
		return "[\\u0300-\\u036f]*\\u"+v;
	});
	return new RegExp(regexp, "i");
}
function showResults(start, end, ignore){
if(start.preventDefault){start.preventDefault();scrollTo(0,0)}

		var results = lastResults;
if(!results){return;}
		var active = pages.querySelector(".active");
		if(active){active.classList.remove("active");}
		if(this && this.tagName){
			start = +this.getAttribute("data-start");
			end = +this.getAttribute("data-end");
			this.classList.add("active");
		}
		if(!ignore){
			history.pushState({start:start,end:end},"Recherche", "?q="+encodeURIComponent(searchinput.value)+"&start="+encodeURIComponent(start)+"&end="+encodeURIComponent(end))
		}
		var main = document.createElement("div");
		main.id = "main";
		var todelete = document.getElementById("main");
		var resultslength = results.length;
		for(var i=start, result;i<Math.min(results.length, end+1);i++){
			result = results[i];
			if(!result){resultslength--;continue;}
			var div = document.createElement("div"),
			text = document.createTextNode(result.text),
			subdiv = document.createElement("div");
			div.addEventListener("keydown", keyarticle, false);
			div.className = "article";
			div.tabIndex="0";
			div.setAttribute("data-number", result.number);

			var div2 = document.createElement("div");
			div2.className="position";
			div2.innerText = result.position;
			var div3 = document.createElement("div");
			div3.className = "artnumber";
			div3.innerText = result.number+". ";
			subdiv.appendChild(div3);
			div.appendChild(div2);
			subdiv.appendChild(text);
			subdiv.className = "arttext";
			div.appendChild(subdiv);
			div2 = document.createElement("div");
			div2.className = "historical";
			div2.innerText = result.historical;
			var div3 = document.createElement("div");
			div2.appendChild(div3);
			div3.innerHTML='<a href="https://legisquebec.gouv.qc.ca/fr/showdoc/cs/CCQ-1991#se:'+result.number.replace(/\./g,'_')+'">Voir sur LégisQuébec</a>|<a href="https://ccq.lexum.com/w/ccq/fr#!fragment/art'+result.number+'/">Voir sur Qweri</a>';
			div.appendChild(div2);
			main.appendChild(div);
		}
		if(todelete){
			todelete.parentNode.replaceChild(main,todelete);
		}
		else{
			document.getElementById("main-container").appendChild(main);
		}
	
}
function isOperator(c){
	return c == "-" || c == "+" || c == "/" || c == "*" || c == "%" || c == "~" || c == "(";
}
function searchfor(term,e, ignore){
	if(e){e.preventDefault();}
	if(!ignore){
		history.pushState({query:term},"Recherche", "?q="+encodeURIComponent(term))
	}
	var start = performance.now();
	var results = [];
	
	// TODO : Implement comments

	// TODO : Correct parentheses

	// Remove whitespaces
	term = term.replace(/[\s=]+/g,"");

	printResult(calculateExpression(term));
	var end = performance.now();
	console.info("Calculated in "+(end-start)+"ms");
}
function calculateExpression(term){
	var terms = [], actualterm = "", parentheseCount = 0;
	for(var i=0;i<term.length;i++){
		var c = term[i];
		if(parentheseCount > 0){
			if(c == ")"){
				parentheseCount--;
			}
			else if(c == "("){ parentheseCount++ }
			actualterm += c; continue;
		}
		if(c == "("){
			parentheseCount++;
		}
		else if(c == ")"){
			// Should not happen
			// TODO : ERROR
		}
		else if(c == "+" || c == "-"){
			if(i > 0 && !isOperator(term[i-1])){
				terms.push(actualterm, c);
				actualterm = "";continue;
			}
		}
		actualterm += c;
	}
	terms.push(actualterm);
	console.log(terms);console.log("----");
	for(var i=0;i<terms.length;i+=2){
		terms[i] = calculateTerm(terms[i]);
	}

	// Calculate
	var leftResult = terms[0]
	for(var i=1;i<terms.length;i+=2){
		var right = terms[i+1];
		if(!right){alert('ERROR')}
		if(terms[i] == "+"){
			if(leftResult.type == right.type){
				if(leftResult.type == 1){
					leftResult.value += right.value;
				}
				else if(leftResult.type == 2){
					if(leftResult.u != right.u){alert("ERROR : Exponent")}
					leftResult.m += right.m;
					leftResult.s += right.s;
				}
			}
			else{alert("ERROR : Wrongful type")}
		}
		else if(terms[i] == "-"){
			if(leftResult.type == right.type){
				if(leftResult.type == 1){
					leftResult.value -= right.value;
				}
				else if(leftResult.type == 2){
					if(leftResult.u != right.u){alert("ERROR : Exponent")}
					leftResult.m -= right.m;
					leftResult.s -= right.s;
				}
			}
			else{alert("ERROR : Wrongful type")}
		}
	}
	return (leftResult);
}
function printResult(result){
	html = "";
	if(result.type == 1){
		
		document.querySelector(".timetable").style.display = "none";
		document.querySelector(".timeerror").style.display = "none";
		document.querySelector(".timenumber").style.display = "block";
		html = result.value;
		document.querySelector(".timenumber").innerHTML = html;
	}
	else if(result.type == 2){

		document.querySelector(".timetable").style.display = "block";
		document.querySelector(".timeerror").style.display = "none";
		document.querySelector(".timenumber").style.display = "none";

		var exp = (result.u!=1) ? "<sup>" + result.u  + "</sup>" : "";
		if(result.m != 0){html+= result.m +" m"+exp+" "}
		if(result.s != 0){html+= result.s +" s"+exp+" "}
setHTML(".dtimeexp", result.u === 1 ? "" : result.u);
		if(result.u===1){
			html += " (";
			var day = Math.floor(result.s/(3600*24)),html2="";
			result.s%=3600*24;

setHTML("#dtimeday", day ? day : "000");
			var h = Math.floor(result.s/3600);
			result.s%=3600;
setHTML("#dtimehour", h ? h < 10 ? "0"+""+h : h : "00");
			var min = Math.floor(result.s/60);
setHTML("#dtimemin", min ? min < 10 ? "0"+""+min :min : "00");
			result.s=Math.round((result.s%60)*100)/100
setHTML("#dtimesec", result.s ? result.s < 10 ? "0"+""+result.s : result.s : "00");
			if(day){
				html2+=day + " day"+(day>1) ? "s " : " ";
			}
			if(h){
				html2+=h + "h ";
			}
			if(min){
				html2 += min + "min ";
			}
			if(result.s){
				html2+=result.s + "s"; 
			}
			html += html2.trim() + ")";
		}
		
	}
}
function inputtext(e){

	if(e.data == "=" || e.key == "="){
		e.preventDefault();
		searchfor(document.getElementById("searchinput").value);
	}
}
function calculateTerm(term){
	var result = "",terms=[];
	var actualterm = "", parentheseCount = 0, type = 0;
	/* Types :
		1 : Scalar
		2 : Date
		3 : Expression (parentheses)
		4 : Function
	*/
	for(var i=0;i<term.length;i++){
		var c = term[i];
		if(parentheseCount > 0){
			if(c == "("){
				parentheseCount++;
				actualterm += c;
			}
			else if(c == ")"){
				parentheseCount--;
				if(parentheseCount > 0 || type != 3){
					actualterm += c;
				}
			}
		}
		if(c == "("){
			if(actualterm.length === 0){
				type = 3;
				parentheseCount++;
			}
			else if(/^[A-Za-z]+$/.test(actualterm)){
				type = 4;
				parentheseCount++;
				actualterm += c;
			}
			else { // It's a multiplication
				if(/^[+-]?(([0-9]+)|([0-9]*\.[0-9]+))$/.test(actualterm)){
					type = 1;
				}
				else{
					type = 2;
				}
				terms.push({value:actualterm,type:type},"*");
				actualterm = ""; type = 3;
			}
		}
		else if(c == ")"){
		}
		else if(isOperator(c) && (c != "+" && c != "-")){
			if(type === 0){
				if(/(^[-+]?[0-9]+$)|(^[-+]?[0-9]*\.[0-9]+)/.test(actualterm)){
					type = 1;
				}
				else{
					type = 2;
				}
			}
			terms.push({value:actualterm,type:type},c);
			actualterm = ""; type = 0;
		}
		else{
			actualterm += c;
		}
				
	}
	if(actualterm){
		if(type === 0){
			if(/(^[-+]?[0-9]+$)|(^[-+]?[0-9]*\.[0-9]+)/.test(actualterm)){
				type = 1;
			}
			else{
				type = 2;
			}
		}
		terms.push({value:actualterm,type:type});
	}
	// Calculate each term

	for(var i=0;i<terms.length;i+=2){
		var type = terms[i].type;
		if(type == 1){
			terms[i] = {value:eval(terms[i].value),type:1};
		}
		else if(type == 2){
			terms[i] = evaluateDate(terms[i])
		}
		else if(type == 3){
			terms[i] = calculateExpression(terms[i].value);
			
		}
		else if(type == 4){
			// TODO : Admit functions
			terms[i] = {value:1,type:1}
		}
	}

	// Then calculate together
	var leftResult = terms[0];
	for(var i=1;i<terms.length;i+=2){
		var right = terms[i+1];
		if(!right){alert('ERROR');}
		if(terms[i] == "*"){
			if(leftResult.type == right.type){
				if(leftResult.type == 1){
					leftResult = {type:1,value:leftResult.value*right.value}
				}
				else if(leftResult.type == 2){
					leftResult = { type:2,
							m:leftResult.m*right.m,
							s:leftResult.s*right.s,
							u:leftResult.u+right.u}
				}
			}
			else if( (leftResult.type == 1 && right.type == 2) || 
				 (leftResult.type == 2 && right.type == 1)){
				if(leftResult.type == 1){
					var temp = leftResult;leftResult = right;right=temp;
				}
				leftResult.m*=right.value;
				leftResult.s*=right.value;
			}
		}
		else if(terms[i] == "/"){
			if(leftResult.type == right.type){
				if(leftResult.type == 1){
					leftResult = {type:1,value:leftResult.value*right.value}
				}
				else if(leftResult.type == 2){
					leftResult = { type:2,
							m:(leftResult.m/right.m) || 0,
							s:(leftResult.s/right.s) || 0,
							u:leftResult.u-right.u}
				}
			}
			else if( (leftResult.type == 1 && right.type == 2) || 
				 (leftResult.type == 2 && right.type == 1)){
				if(leftResult.type == 1){
					var temp = leftResult;leftResult = right;right=leftResult;
				}
				leftResult.m/=right.value;
				leftResult.s/=right.value;
			}
		}
		if("u" in leftResult && leftResult.u === 0){
			if(leftResult.s && leftResult.m){
				alert("ERROR : Division and multiplication not allowed when seconds and month in some scenario");
			}
			else{
				leftResult = {type:1, value:leftResult.m||leftResult.s}
			}
		}
	}
	console.log(leftResult);
	return leftResult;
}

var regSecs = /^([0-9]+(?:|\.[0-9]+))(?:s|sec|)$/i,
regMins = /^([0-9]+)(?:\:|min)([0-9]+(?:|\.[0-9]+))(?:s|sec|)$/i,
regHours = /^([0-9]+)(?:\:|hours?|h)(?:([0-9]+)(?:\:|min|minutes?)|)(?:([0-9]+(?:|\.[0-9]+))(?:s|sec|)|)$/i,
regUnique = /^([0-9]+(?:|\.[0-9]+))(s|sec|d|min|h|w|mon|j|days?|minutes?|months?|year?s|y)$/i
function evaluateDate(term){
term = term.value || term;
	var result;
	if(regSecs.test(term)){
		var result;
		term.replace(regSecs, function(a,sec){
			result = eval(sec);
			
		})
		return {type:2,m:0,s:result, u:1}
	}
	else if(regMins.test(term)){
		var result;
		term.replace(regMins, function(a,min,sec){
			min = min || 0;
			result = eval(min) * 60 + eval(sec);
			
		})
		return {type:2,m:0,s:result, u:1}
	}
	else if(regUnique.test(term)){
		var result,type;
		term.replace(regUnique, function(a,value,typo){
			result = value;type=typo;
			
		})
		if(type == "sec" || type == "s"){
			return {type:2,m:0,s:result, u:1}
		}
		else if(type == "min" || type == "minute" || type == "minutes"){
			return {type:2,m:0,s:result*60, u:1}			
		}
		else if(type == "hour" || type == "h" || type == "hours"){
			return {type:2,m:0,s:result*3600, u:1}			
		}
		else if(type == "day" || type == "d" || type == "days" || type == "j"){
			return {type:2,m:0,s:result*3600*24, u:1}			
		}
		else if(type == "w" || type == "week" || type == "weeks"){
			return {type:2,m:0,s:result*3600*24*7, u:1}			
		}
		else if(type == "mon" || type == "month" || type == "months"){
			return {type:2,m:result,s:0, u:1}			
		}
		else if(type == "y" || type == "year" || type == "years"){
			return {type:2,m:result*12,s:0, u:1}			
		}
		else{
			alert("ERROR : error in unique date format. Please report to developer.");
		}
	}
	else if(regHours.test(term)){
		var result;
		term.replace(regHours, function(a,hour,min,sec){
			result = (eval(hour)||0) * 3600 + (eval(min)||0) * 60 + (eval(sec)||0);
			
		})
		return {type:2,m:0,s:result, u:1}
	}
	for(var i=0;i<term.length;i++){
		
	}
	printError("ERR : Unknown format date ("+term+")");
}

// https://stackoverflow.com/a/11077016
function insertAtCursor(myField, myValue) {
    //IE support
    if (document.selection && !"selectionStart" in myField) {
        myField.focus();
        sel = document.selection.createRange();
        sel.text = myValue;
    }
    //MOZILLA and others
    else if (myField.selectionStart || myField.selectionStart == '0') {
        var startPos = myField.selectionStart;
        var endPos = myField.selectionEnd;
        myField.value = myField.value.substring(0, startPos)
            + myValue
            + myField.value.substring(endPos, myField.value.length);
	myField.selectionStart = startPos + myValue.length;
	myField.selectionEnd = startPos + myValue.length;
    } else {
        myField.value += myValue;
    }
}


function insertText(text){
	insertAtCursor(document.getElementById("searchinput"),text);
}
function handleButton(text){
	text = (text || "").toLowerCase();
	var searchinput = document.getElementById("searchinput");
	if(!text){console.log("Wrong button");return}
	if(/^[.0-9+\-\(\)]$/.test(text)){
		insertText(text);
	}
	else if(text == "÷"){
		insertText("/");
	}
	else if(text == "×"){
		insertText("*");
	}
	else if(text == "day"){
		insertText("d");
	}
	else if(text == "h"){
		insertText("h");
	}
	else if(text == "min"){
		insertText("min");
	}
	else if(text == "sec"){
		insertText("s");
	}
	else if(text == "ce"){
		searchinput.value = "";
	}
	else if(text == "="){
		searchfor(searchinput.value);
	}
	else{
		var d = document.createElement("div");
		d.innerHTML = "&larr;";
		if(d.innerText == text){
			var startPos = searchinput.selectionStart;
       			var endPos = searchinput.selectionEnd;
        		searchinput.value = searchinput.value.substring(0, startPos-1)
			+ searchinput.value.substring(endPos, searchinput.value.length);
	searchinput.selectionStart = Math.max(startPos-1,0);
	searchinput.selectionEnd = Math.max(startPos-1,0);
		}
	}
}
function printError(err){
	document.querySelector(".timetable").style.display = "none";
	document.querySelector(".timeerror").style.display = "block";
	document.querySelector(".timenumber").style.display = "none";
document.querySelector(".timeerror").innerHTML = err;
}
var passiveSupported = false;

try {
  window.addEventListener("test", null, Object.defineProperty({}, "passive", { get: function() { passiveSupported = true; } }));
} catch(err) {}
function load(){
	var t = document.querySelectorAll("button.calculator-button");
	for(var i=0;i<t.length;i++){
		t[i].addEventListener("click", function(e){
			handleButton((e || window.event).target.innerText)
		}, passiveSupported ? { passive: false } : false)
	}
	var searchinput = document.getElementById("searchinput");
	if("selectionstart" in searchinput && searchinput.value != ""){
		searchinput.selectionEnd = searchinput.selectionStart = searchinput.value.length-1
	}
	t = document.querySelector(".calculator-results");
	t.style.height = (t.offsetHeight-20) + "px";
}