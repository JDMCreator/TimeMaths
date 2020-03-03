(function(){
	var Tiny = new (function(){
		var document = window.document;
		this.loaded = false;
		this.load = function(){
			var toggleElements = document.querySelectorAll("[data-toggle]:not(.tiny-ignore)");
			for(var i=0;i<toggleElements.length;i++){
				this.applyToggle(toggleElements[i]);
			}
			var dialogs = document.querySelectorAll('.dialog:not(.tiny-ignore)'),
			backdrop = document.createElement("div");
			backdrop.className="dialog-backdrop";
			for(var i=0;i<dialogs.length;i++){
				var newbackdrop = backdrop.cloneNode();
				newbackdrop.addEventListener("click", function(){
					Tiny.dialog.close(this);
				}, false);
				dialogs[i].appendChild(newbackdrop);
			}
			var closeModals = document.querySelectorAll("[data-close-dialog]:not(.tiny-ignore)");
			for(var i=0;i<closeModals.length;i++){
				closeModals[i].addEventListener("click", function(){
					Tiny.dialog.close(this);
				});
			}
			this.loaded = true;
		}
		this.dialog = new (function(){
			var handleEscape = function(e){
				e = e || window.event;
				if(e.keyCode == 27 && !(e.altKey || e.shiftKey || e.ctrlKey)) {
					Tiny.dialog.close();
					e.stopPropagation();
				}
			}
			this.close = function(){
				var element = document.querySelector(".dialog.active");
				if(element){
					element.classList.remove("active");
					document.body.classList.remove("dialog-active");
					document.removeEventListener("keydown", handleEscape, false);
				}
			}
			this.open = function(element){
				this.close();
				if(typeof element == "string"){
					element = document.getElementById(element);
				}
				if(element){
					element.classList.add("active");
					document.body.classList.add("dialog-active");
					document.addEventListener("keydown", handleEscape, false);
				}
			}
			this.toggle = function(element){
				if(typeof element == "string"){
					element = document.getElementById(element);
				}
				if(element.classList.contains("active")){
					this.close();
				}
				else{
					this.open(element);
				}
			}
		})();
		this.applyToggle = function(element){
			var _this = this;
			element.addEventListener("click", function(){
				_this.handleToggle(this);
			}, false)
		}
		this.handleToggle = function(element){
			var data = element.getAttribute("data-toggle");	
			element = document.getElementById(data);
			if(element){
				if(element.classList.contains("dialog")){
					this.dialog.toggle(element);
				}
			}
		}
	})();
	if(/comp|inter|loaded/.test(document.readyState)){
		Tiny.load();
	}
	else{
		document.addEventListener("DOMContentLoaded", (function(){Tiny.load.call(Tiny)}), false);
	}
	self.Tiny = Tiny;
})();