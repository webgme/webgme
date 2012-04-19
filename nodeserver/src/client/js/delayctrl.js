define([],function(){
	var DelayCtrl = function(delayablesocket,div){
		/*set self style ;)*/
		/*div.style.backgroundColor="#ee0000";
		div.style.cssFloat = "left";
		div.style.height="80px";
		div.style.width="342px";*/

        div.innerHTML = "";
		
		/*inblock button*/
		var inblockbutton = document.createElement('input');
		inblockbutton.type = "button";
		inblockbutton.value = "block incoming messages";
		div.appendChild(inblockbutton);
		inblockbutton.onclick = function(){
			if(inblockbutton.value === "block incoming messages"){
				inblockbutton.value = "allow incoming messages";
				delayablesocket.configUpdate({inblock:true});
			}
			else{
				inblockbutton.value = "block incoming messages";
				delayablesocket.configUpdate({inblock:false});
			}
		}
		
		/*outblock button*/
		var outblockbutton = document.createElement('input');
		outblockbutton.type = "button";
		outblockbutton.value = "block outgoing messages";
		div.appendChild(outblockbutton);
		outblockbutton.onclick = function(){
			if(outblockbutton.value === "block outgoing messages"){
				outblockbutton.value = "allow outgoing messages";
				delayablesocket.configUpdate({outblock:true});
			}
			else{
				outblockbutton.value = "block outgoing messages";
				delayablesocket.configUpdate({outblock:false});
			}
		}

		/*newline*/
		div.appendChild(document.createElement('br'));
		
		/*outdelay*/ 
		div.appendChild(document.createTextNode("Delay for outgoing messages:"));
		var outdelay = document.createElement('input');
		outdelay.value = 0;
		outdelay.size = 5;
		div.appendChild(outdelay);
        div.appendChild(document.createTextNode("milliseconds"));
		outdelay.onkeyup = function(){
			delayablesocket.configUpdate({outlatency:outdelay.value});
		};

		/*newline*/
		div.appendChild(document.createElement('br'));

		/*indelay*/ 
		div.appendChild(document.createTextNode("Delay for incoming messages:"));
		var indelay = document.createElement('input');
		indelay.value = 0;
		indelay.size = 5;
		div.appendChild(indelay);
        div.appendChild(document.createTextNode("milliseconds"));
		indelay.onkeyup = function(){
			delayablesocket.configUpdate({inlatency:indelay.value});
		};

	};
	
	return DelayCtrl;
});
