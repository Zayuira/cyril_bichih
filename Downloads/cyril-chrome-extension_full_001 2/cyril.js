(function() {
	var cyril;
	cyril = cyril || {};
	cyril.tmpText = "";
	var port = chrome.runtime.connect({name: "cyrillic_open_port"});
	port.onMessage.addListener(function(msg) {
		if(msg.searchResults){
			var results = msg.searchResults;
			autocomplete.suggests_results(results);
		}else if(msg.savedFullText){
			if(cyril.textArea){
				cyril.textArea.value = msg.savedFullText;
			}
		}
	});

	port.onDisconnect.addListener(function() {
    console.error("Port disconnected");
    });
	function sendMessageThroughPort(message) {
    if (port) {
        try {
            port.postMessage(message);
        } catch (error) {
            console.error("Error sending message through port: ", error);
        }
    }
}

// Send a message to get the full text
	sendMessageThroughPort({getFullText: "get"});

	//helpers
	function hasClass(el, className){ return el.classList ? el.classList.contains(className) : new RegExp('\\b'+ className+'\\b').test(el.className); };

	function addEvent(el, type, handler){
		if (el.attachEvent) el.attachEvent('on'+type, handler); else el.addEventListener(type, handler);
	};
	function removeEvent(el, type, handler){
		if (el.detachEvent) el.detachEvent('on'+type, handler); else el.removeEventListener(type, handler);
	};
	function addClass(el, className){
		if( !hasClass(el, className) ){
			el.classList.add(className);
		}
	};
	function removeClass(el, className){
		if( hasClass(el, className) ){
			el.classList.remove(className);
		}
	};
	function live(elClass, event, callback, context){
		addEvent(context || document, event, function(e){
			var found, el = e.target || e.srcElement;
			while (el && !(found = hasClass(el, elClass))) el = el.parentElement;
			if (found) callback.call(el, e);
		});
	};
	function getElByClassName(name){
		return document.getElementsByClassName(name);
	};


	var autocomplete = {};
	autocomplete.options = {
		minChars: 3,
		offsetLeft: -10,
		offsetTop: 15,
		relativeOffset: 0,
		menuClass: '',
		className: 'autocomplete-suggestions',
		enabled: true,
		list_group : 'list-group',
		list_group_item : 'list-group-item',
	};
	autocomplete.suggests_results = function(results){
		autocomplete.suggestions.renderItem([]);
		if(results.length>0){
			var coords = window.getCaretCoordinates(cyril.textArea, cyril.textAreaContainer, cyril.textArea.selectionEnd);
			if(autocomplete.suggestions.getDisplayStatus()){
				autocomplete.suggestions.update(coords.left, coords.top);
				autocomplete.suggestions.renderItem(results);
			}else{
				autocomplete.suggestions.show();
				autocomplete.suggestions.update(coords.left, coords.top);
				autocomplete.suggestions.renderItem(results);
			}
		}else{
			autocomplete.suggestions.hide();
		}
	};


	autocomplete.suggestions = {
		container: {},
		isDisplayed: true,
		create: function(){
			this.container = document.createElement('div');
			this.container.className = autocomplete.options.className.concat(autocomplete.options.menuClass);
			this.container.style.display = 'block';
			cyril.textAreaContainer.appendChild(this.container);
		},
		update: function(x, y ){
			this.container.style.position = 'relative';
			this.container.style.left = x + autocomplete.options.offsetLeft + 'px';
			var top = y + autocomplete.options.offsetTop - autocomplete.options.relativeOffset;
			if(top < 0 ){
				this.container.style.top = top + 'px';
			}else{
				this.container.style.top = "0px";
			}
		},
		getListItem: function(item, options){
			return '<a href="#" class="'+ autocomplete.options.list_group_item + options +'">' + item + '</a>';
		},
		renderItem: function(data){
			var start = '<ul class="'+autocomplete.options.list_group+'">';
			var end = '</ul>';
			for (var i=0;i<data.length;i++){
				if(i == 0){
					start = start.concat(this.getListItem(data[i], " selected"));
				}else{
					start = start.concat(this.getListItem(data[i], ""));
				}
			}
			this.container.innerHTML = start.concat(end);
			// this.updateSC(0);
		},
		hide: function(){
			this.container.style.display = 'none';
			this.isDisplayed = false;
		},
		show: function(){
			this.container.style.display = 'block';
			this.isDisplayed = true;
		},
		getDisplayStatus: function(){
			return this.isDisplayed;
		},
		getSelectedWord: function(){
			var list = getElByClassName(autocomplete.options.list_group_item);
			for(var i = 0; i < list.length; i++){
				if(hasClass(list[i], "selected")){
					var text = list[i].innerText;
					return text;
				}
			}
		},
		setUpArrow: function(){
			var list = getElByClassName(autocomplete.options.list_group_item);
			for(var i = 0; i < list.length; i++){
				if(hasClass(list[i], "selected")){
					var text = list[i].innerText;
					removeClass(list[i], "selected");
					if(i != 0){
						addClass(list[i-1], "selected");
					}else{
						addClass(list[list.length-1], "selected");
					}
					break;
				}
			}
		},
		setDownArrow: function(){
			var list = getElByClassName(autocomplete.options.list_group_item);
			for(var i = 0; i < list.length; i++){
				if(hasClass(list[i], "selected")){
					var text = list[i].innerText;
					removeClass(list[i], "selected");
					if(i != list.length-1){
						addClass(list[i+1], "selected");
					}else{
						addClass(list[0], "selected");
					}
					break;
				}
			}
		},
		init: function(){
			live("list-group-item", 'mousedown', function(e){
				var text = this.innerText;
				var lastWord = cyril.text.getLastWord();
				text = text.substr(lastWord.length).concat(" ");
				cyril.text.insertText(text);
				autocomplete.suggestions.hide();
			}, this.container);
		}
	}


	var FixedQueue = function(size) {
		this.queue = [];
		this.size = size;
		this.position = 0;
		this.editable = true;
	};
	FixedQueue.prototype._trimHead = function() {
		if (this.queue.length <= this.size) {
			return;
		}
		this.queue = this.queue.splice(this.queue.length - this.size, this.queue.length);
	};
	FixedQueue.prototype.push = function(arg) {
		this.queue.push(arg);
		this._trimHead();
	};
	FixedQueue.prototype.getSize = function() {
		return this.queue.length;
	};
	FixedQueue.prototype.get = function(index) {
		if (index < this.queue.length - 1) {
			this.queue[index];
		}
	};
	FixedQueue.prototype.clear = function() {
		this.queue = [];
	};
	FixedQueue.prototype.toString = function() {
		var str = '';
		for (var i = 0; i < this.queue.length; i++) {
			str = str.concat(this.queue[i]);
		}
		return str;
	}
	;
	FixedQueue.prototype.toArray = function() {
		return this.queue;
	};
	FixedQueue.prototype.setEditable = function(flag) {
		this.editable = flag;
	};
	FixedQueue.prototype.isEditable = function() {
		return this.editable;
	};

	$id = function(id) {
		return document.getElementById(id);
	};

	cyril.getCharCode = function(event) {
		var keyCode;
		var charCode;
		if (typeof event !== 'undefined') {
			keyCode = event.keyCode;
			if(keyCode == 0){
				keyCode = event.which;
			}
		} else if (event) {
			keyCode = event.which;
		}
		charCode = String.fromCharCode(keyCode);
		return charCode;
	};

	cyril.isCyrillic = function(character) {
		var cyrChar = cyril.characters[character];
		if (cyrChar != null) {
			return true;
		}
		return false;
	};

	cyril.options = {
		textAreaId: "cyrillic-input-area",
		textAreaContainerId : "cyrillic-input-area-container",
		textAreaWidth: 150,
		inputMode: "On",
		fontSize: 14,
		lang: "Монгол",
	};


	// cyril
	cyril.text = {
		left: "",
		right: "",
		insert: "",
		cursor: 0,
		setInput: function() {
			var val = this.left.concat(this.insert).concat(this.right);
			cyril.textArea.value = val;
		},
		getText: function() {
			this.cursor = cyril.textArea.selectionStart;
			this.left = cyril.textArea.value.substr(0, cyril.text.cursor);
			this.right = cyril.textArea.value.substr(cyril.textArea.selectionEnd);
		},
		setCursor: function(offset) {
			var val = offset || 0;
			cyril.textArea.setSelectionRange(this.cursor + val + 1, this.cursor + val + 1);
		},
		getLastWord: function(){
			var lastWord;
			if(this.left.length > 0){
				var length = this.left.length;
				var lastSpaceIndex = 0;
				for(var i = length - 1; i >= 0; i--){
					//last blank space
					if( this.left[i].match(/^\s*$/g)){
						lastSpaceIndex = i + 1;
						break;
					}
				}
				lastWord = this.left.substr(lastSpaceIndex, length).concat(this.insert);
				return lastWord;
			}
			lastWord = this.insert;
			return lastWord;
		},
		insertText : function(text){
			cyril.text.getText();
			cyril.text.insert = text;
			cyril.text.setInput();
			cyril.text.setCursor(text.length);
		},
		saveBackgroundText : function(text){
			if(text){
				port.postMessage({fullText: text});
			}else{
				var text = cyril.textArea.value;
				port.postMessage({fullText: text});
			}
		}
	};

	Mousetrap.bind(['command+shift', 'shift+command', 'ctrl+alt', 'alt+ctrl'], function(e) {
		autocomplete.suggestions.hide();
		cyril.options.inputMode = !cyril.options.inputMode;
		if(cyril.menu.lang.value == 'eng'){
			cyril.menu.lang.value = 'mon';
		}else{
			cyril.menu.lang.value = 'eng';
		}
		cyril.queue.setEditable(true);
		cyril.queue.clear();
	});

	cyril.text.handlers = {
		textHandler: function(){
			var change = cyril.engToMon(cyril.queue);
			cyril.text.getText();
			if (cyril.queue.getSize() == change.length && change.length == 1) {
				cyril.text.insert = change;
			} else if (cyril.queue.getSize() == change.length && change.length == 2) {
				cyril.text.insert = change[1];
			} else if (cyril.queue.getSize() == 2 && change.length == 1) {
				cyril.text.left = cyril.text.left.substr(0, cyril.text.left.length - 1);
				cyril.text.cursor -= 1;
				cyril.text.insert = change;
			}
			cyril.text.setInput();
			cyril.text.setCursor();
		},
		keyPressHandler: function(event) {
			if (cyril.options.inputMode) {
				var charCode = cyril.getCharCode(event);
				if (!cyril.isCyrillic(charCode)) {
					cyril.queue.setEditable(true);
					cyril.queue.clear();
					autocomplete.suggestions.hide();
				} else {
					event.preventDefault();
					cyril.queue.push(charCode);
					cyril.text.handlers.textHandler();
					var word = cyril.text.getLastWord();
					if(autocomplete.options.enabled){
						if(word.length >= autocomplete.options.minChars){
							port.postMessage({searchWord: word});
						}
					}					
				}
			}
		},
		keyDownHandler: function(event) {
			var keyCode;
			if (typeof event !== 'undefined') {
				keyCode = event.keyCode;
				if(keyCode == 0){
					keyCode = event.which;
				}
			} else if (event) {
				keyCode = event.which;
			}
			
			if( keyCode == 9 || keyCode == 13){
				if(autocomplete.suggestions.getDisplayStatus()){
					cyril.queue.setEditable(true);
					cyril.queue.clear();
					var text = autocomplete.suggestions.getSelectedWord();
					var lastWord = cyril.text.getLastWord();
					text = text.substr(lastWord.length).concat(" ");
					cyril.text.insertText(text);
					autocomplete.suggestions.hide();
					event.preventDefault();
				}
			}
			// if (event.altKey && event.ctrlKey) {
			// 	autocomplete.suggestions.hide();
			// 	cyril.options.inputMode = !cyril.options.inputMode;
			// 	if(cyril.menu.lang.value == 'eng'){
			// 		cyril.menu.lang.value = 'mon';
			// 	}else{
			// 		cyril.menu.lang.value = 'eng';
			// 	}
			// 	cyril.queue.setEditable(true);
			// 	cyril.queue.clear();
			// }
			if( keyCode == 8 || keyCode == 45 || keyCode == 46 || keyCode==32){
				autocomplete.suggestions.hide();
				cyril.queue.setEditable(true);
				cyril.queue.clear();
			}
			//Up arrow
			if(keyCode == 38){
				autocomplete.suggestions.setUpArrow();
			}
			//Down arrow
			if(keyCode == 40){
				autocomplete.suggestions.setDownArrow();
			}
			if(keyCode == 37 ||  keyCode == 39){
				cyril.queue.setEditable(true);
				cyril.queue.clear();
				autocomplete.suggestions.hide();
			}
		},
		keyUpHandler: function(event){
			var keyCode;
			if (typeof event !== 'undefined') {
				keyCode = event.keyCode;
				if(keyCode == 0){
					keyCode = event.which;
				}
			} else if (event) {
				keyCode = event.which;
			}
			if( keyCode > 46 && keyCode < 91){
				cyril.text.saveBackgroundText();
			}
		},
		focusHandler: function(event) {
		}
	};

	cyril.menu = {
		onOff: $id("selector-on-off"),
		lang: $id("selector-language"),
		font: $id("selector-font-size"),
		tooltipBtn: $id("selector-tooltip"),
		tooltip: $id("container-tooltip"),
		btnTable: $id("selector-table"),
		btnEraser: $id("selector-eraser"),
		table:$id("container-table"),
	};

	cyril.menu.handlers = {
		toggleTable: function(){
			if(hasClass(cyril.menu.table, "hidden")){
				removeClass(cyril.menu.table, "hidden");
			}else{
				addClass(cyril.menu.table, "hidden");
			}
		},
		toggleTooltip: function(){
			if(hasClass(cyril.menu.tooltip, "hidden")){
				removeClass(cyril.menu.tooltip, "hidden");
			}else{
				addClass(cyril.menu.tooltip, "hidden");
			}
		},
		onOffHandler: function(event){
			autocomplete.suggestions.hide();
			if(cyril.menu.onOff.options[cyril.menu.onOff.selectedIndex].text == 'On'){
				autocomplete.options.enabled = true;
			}else{
				autocomplete.options.enabled = false;
			}
		},
		fontHandler: function(event){
			autocomplete.suggestions.hide();
			cyril.options.fontSize = parseInt(cyril.menu.font.options[cyril.menu.font.selectedIndex].text);
			cyril.textArea.style.fontSize = cyril.options.fontSize;
			autocomplete.options.offsetTop = cyril.options.fontSize;
		},
		langHandler: function(event){
			autocomplete.suggestions.hide();
			if(cyril.menu.lang.options[cyril.menu.lang.selectedIndex].text == 'English'){
				cyril.options.inputMode = false;
			}else{
				cyril.options.inputMode = true;
			}
			cyril.options.lang = cyril.menu.lang.options[cyril.menu.lang.selectedIndex].text;
		},
		eraseTextArea: function(event){
			cyril.textArea.value = "";
			cyril.text.saveBackgroundText("clear");
		}
	};

	cyril.engToMon = function(fque) {
		var monChar = cyril.Eng_to_Mon[fque.toString()];
		if (monChar != null) {
			if (fque.getSize() == 2) {
				fque.setEditable(false);
			}
			return monChar;
		}
		var strArray = fque.toArray();
		monChars = [];

		for (var i = 0; i < strArray.length; i++) {
			monChar = cyril.Eng_to_Mon[strArray[i]];
			if (monChar != null) {
				monChars.push(monChar);
			} else {
				monChars.push(strArray[i]);
			}
		}
		return monChars.join("");
	};

	cyril.setMenuOptions = function(){
		if(cyril.menu.onOff.options[cyril.menu.onOff.selectedIndex].text == 'English'){
			cyril.options.inputMode = false;
		}else{
			cyril.options.inputMode = true;
		}
		cyril.options.fontSize = parseInt(cyril.menu.font.options[cyril.menu.font.selectedIndex].text);
		cyril.options.lang = cyril.menu.lang.options[cyril.menu.lang.selectedIndex].text;
	}
	cyril.setMenuHandlers = function(){
		addEvent(cyril.menu.onOff, "change", cyril.menu.handlers.onOffHandler);
		addEvent(cyril.menu.font, "change", cyril.menu.handlers.fontHandler);
		addEvent(cyril.menu.lang, "change", cyril.menu.handlers.langHandler);
		addEvent(cyril.menu.tooltipBtn, "click", cyril.menu.handlers.toggleTooltip);
		addEvent(cyril.menu.btnTable, "click", cyril.menu.handlers.toggleTable);
		addEvent(cyril.menu.btnEraser, "click", cyril.menu.handlers.eraseTextArea);
	}

	cyril.init = function() {
		cyril.textArea = $id(cyril.options.textAreaId);
		cyril.textArea.style.height = cyril.options.textAreaWidth + "px";
		autocomplete.options.relativeOffset = cyril.options.textAreaWidth;
		cyril.textAreaContainer = $id(cyril.options.textAreaContainerId);
		addEvent(cyril.textArea, "keypress", cyril.text.handlers.keyPressHandler);
		addEvent(cyril.textArea, "keydown", cyril.text.handlers.keyDownHandler);
		addEvent(cyril.textArea, "keyup", cyril.text.handlers.keyUpHandler);
		addEvent(cyril.textArea, "focus", cyril.text.handlers.focusHandler);
		
		cyril.setMenuOptions();
		cyril.setMenuHandlers();

		autocomplete.suggestions.create();
		autocomplete.suggestions.init();
		cyril.queue = new FixedQueue(2);
	};

	cyril.characters = {
		a: "а",
		b: "б",
		v: "в",
		g: "г",
		d: "д",
		j: "ж",
		z: "з",
		i: "и",
		k: "к",
		l: "л",
		m: "м",
		n: "н",
		o: "о",
		q: "ө",
		p: "п",
		r: "р",
		s: "с",
		t: "т",
		u: "у",
		w: "ү",
		f: "ф",
		h: "х",
		c: "ц",
		x: "щ",
		'"': "ъ",
		y: "ы",
		"'": "ь",
		e: "э",
		A: "А",
		B: "Б",
		V: "В",
		G: "Г",
		D: "Д",
		J: "Ж",
		Z: "З",
		I: "И",
		K: "К",
		L: "Л",
		M: "М",
		N: "Н",
		O: "О",
		Q: "Ө",
		P: "П",
		R: "Р",
		S: "С",
		T: "Т",
		U: "У",
		W: "Ү",
		F: "Ф",
		H: "Х",
		C: "Ц",
		X: "Щ",
		Y: "Ы",
		E: "Э",
	};
	cyril.Eng_to_Mon = {
		ai: "ай",
		ei: "эй",
		ii: "ий",
		oi: "ой",
		ui: "уй",
		wi: "үй",
		qi: "өй",
		a: "а",
		b: "б",
		v: "в",
		g: "г",
		d: "д",
		ye: "е",
		yo: "ё",
		j: "ж",
		z: "з",
		i: "и",
		k: "к",
		l: "л",
		m: "м",
		n: "н",
		o: "о",
		q: "ө",
		p: "п",
		r: "р",
		s: "с",
		t: "т",
		u: "у",
		w: "ү",
		f: "ф",
		h: "х",
		c: "ц",
		ch: "ч",
		sh: "ш",
		x: "щ",
		'"': "ъ",
		y: "ы",
		"'": "ь",
		e: "э",
		yu: "ю",
		ya: "я",
		' ': ' ',
		A: "А",
		B: "Б",
		V: "В",
		G: "Г",
		D: "Д",
		J: "Ж",
		Z: "З",
		I: "И",
		K: "К",
		L: "Л",
		M: "М",
		N: "Н",
		O: "О",
		Q: "Ө",
		P: "П",
		R: "Р",
		S: "С",
		T: "Т",
		U: "У",
		W: "Ү",
		F: "Ф",
		H: "Х",
		C: "Ц",
		X: "Щ",
		Y: "Ы",
		E: "Э",
		Yu: "Ю",
		Ya: "Я",
		Ai: "Ай",
		Ei: "Эй",
		Ii: "Ий",
		Oi: "Ой",
		Ui: "Уй",
		Wi: "Үй",
		Qi: "Өй",
		Ye: "Е",
		Yo: "Ё",
		Ch: "Ч",
		Sh: "Ш",
		YU: "Ю",
		YA: "Я",
		II: "Ий",
		AI: "АЙ",
		EI: "ЭЙ",
		OI: "ОЙ",
		UI: "УЙ",
		WI: "ҮЙ",
		QI: "ӨЙ",
		YE: "Е",
		YO: "Ё",
		CH: "Ч",
		SH: "Ш",
		'""': "Ъ",
		"''": "Ь",
	};
	cyril.init();
})();
