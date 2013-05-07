// ==UserScript==
// @name        Gmail FilterX
// @namespace   www.lucasmetal.com.ar
// @description Allows to quickly add an email to the "from" field of an existing filter.
// @include     https://mail.google.com/*
// @version     0.1
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require    	http://userscripts.org/scripts/source/56812.user.js
// @grant       none
// ==/UserScript==

//Patch jQuery
this.$ = this.jQuery = jQuery.noConflict(true);

window.top.lucas = this; //Just for testing
var that = this; //Closure
this.gmailApi = new USO.Gmail();

//Recursion is fun! We do not like for loops anymore
//TODO: Refactor this stolen shit
function get_useremail_pos(index, user_email) {
	if(window.top.GLOBALS[index] == user_email) {
	   return index; 
	}
	if(index >= (window.top.GLOBALS.length - 1) )//Failsafe
	{
		return -1;
	}
	else {
		return get_useremail_pos(index+1, user_email);
	}
}

//TODO: Refactor this stolen shit
this.set_gmail_params = function() {
	var gmail_params = {};

	// //Parse out Base Url
	// var regex = new RegExp("https://mail.google.com/(a/(.+?)/|(mail(.+?)#))");
	// var matches = document.location.href.match(regex);
	// m = matches[0]
	// gmail_params['GMAIL_BASE_URL'] = m.substring(0, m.length-1) + '?'

	//Parse out gmailchat value
	var regex = new RegExp("gmailchat=(.+?)/(.+?);");
	var matches = window.top.document.cookie.match(regex);
	gmail_params['USER_EMAIL'] = matches[1];

	// //Parse out gmail_at value
	// var regex = new RegExp("GMAIL_AT=(.+?);")
	// var matches = document.cookie.match(regex)
	// gmail_params['GMAIL_AT'] = matches[1]
	
	//Parse out Gmail_ik value from GLOBALS
	var ik_index = get_useremail_pos(0,  gmail_params['USER_EMAIL']);
	if(ik_index == -1) {
		
		console.log("Could not find ik");
	}
	else{
		gmail_params['GMAIL_IK'] = window.top.GLOBALS[ik_index -1];
	}
	
	this.gmail_params = gmail_params;        
};

this.gmailApi.on('loaded:api', function (api) {
	
	//console.log ("GmailAPI Loaded");	
	
	//Load the gmail parameters needed to the POST for the settings
	that.set_gmail_params();
	
	//console.log ( that.gmail_params);
	
	var filterNames = [], 
		settingsRequestUrl = 	window.top.location.origin + window.top.location.pathname + "?ik=" +
								that.gmail_params["GMAIL_IK"] + "&view=pu&rt=j";
	
	//console.log(settingsRequestUrl);
	
	//Hago un post a la URL de las settings, para traer la config y poder parsear los nombres de los filtros
	$.post(settingsRequestUrl, function (data){
		
		console.log ("Success getting Settings!");
		//console.log (data);
				
		var filterMatch = null,
			filterRegex = /-{\\\"filterTitle:([\w\s]+)\\\"}/g;			
		
		//Ejecuto la regular expression y me guardo los nombres de los filtros configurados (que tengan filterTitle)
		while ( filterMatch = filterRegex.exec(data)){
			filterNames.push (filterMatch[1]); //filterMatch[0]: texto completo, filterMatch[1]: group match
		}
					
		//console.log (filterNames);
		
	//Debo indicar que el server retorna "text" porque sino intenta parsearlo como Json y explota
	}, "text").fail(function(error, jqXHR ) { 
		console.log ("Error getting Settings!");
		console.log(error); 
		console.log(jqXHR ); 		
	});
	
	//Me attacho al momento de ver un mail
	that.gmailApi.on("message:view", function (message){
			
		//console.log ("message:view");
		//console.log ($(gmailApi.view));		
		//De acá podemos sacar más datos, tal vez para meter el botón en otro lado
		//console.log(message);
		
		//Obtengo la dirección del from del objeto message que vino de la API de Gmail
		var fromEmailAddress = message.getFromAddress();
				
		//Creo un combo en el header con todos los nombres de los filtros
		var selectHtml = "<select style='font-size:80%'><option value=''>Add to filter...</option>";
		for (var i=0; i< filterNames.length; i++){
			selectHtml+= "<option value='" + filterNames[i] + "'>" + filterNames[i] + "</option>";
		}
		selectHtml+= "</select>";

		//Creo el objeto SELECT y lo inserto en el DOM al lado de los labels del mensaje
		//TODO: Validar no insertarlo más de una vez (ahora sucede cuando la conversación tiene varios mails)
		var $selectHtml = $(selectHtml);
		$(that.gmailApi.view).find("h1.ha").append($selectHtml);
				
		//Attacho un eventHandler al change del select, para disparar ahí la edición del filtro
		$selectHtml.on("change", function (event){
			if (filterName = $(this).val()){
				that.editFilter (filterName, fromEmailAddress);
			}
		});
		
	});
});


this.gmailApi.on('error', function (error) {

	console.log ("GmailAPI Error:");
	console.log (error);
});

/*
this.test = function (){
	
	//this.editFilter ("JSL", "TEST@TEST.com");
	//console.log($("h1.ha").text());
	
	//console.log (gmailApi.gmail.api);
};
//*/

this.editFilter = function (filterName, valueToAdd){

	console.log ("editFilter: " + filterName + ": " + valueToAdd);

	var	$fromTxt = null;
	
	//Vamos a las settings
	window.top.location.hash = "settings/filters";

	//Esperamos que cargue el HTML de las settings
	setTimeout ( function(){
		//Clickeamos en "Edit" del filtro correspondiente (según el valor recibido de la selección del user)		
		$(window.top.document).find("tr:contains('filterTitle:" + filterName + "') span:contains('edit')").click();
			
		//Esperamos que cargue el HTML del editor de filtros	
		setTimeout ( function(){
			//Obtenemos el campo correspondiente (usando la class, no hay otra forma)
			var $fromTxt = $(window.top.document).find(".ZH.nr.aQa");
			
			//Formo el valor a insertar y lo inserto
			var completeValueToAdd = " OR " + valueToAdd; //Agrego un OR a la condición también
			$fromTxt.val( $fromTxt.val() + completeValueToAdd);			
			
			//Selecciono el valor agregado en el textbox
			$fromTxt[0].selectionStart = $fromTxt.val().length - completeValueToAdd.length;
			$fromTxt[0].selectionEnd = $fromTxt.val().length;
			$fromTxt.focus();
						
			console.log ("filterEdited!");
			
			//TODO: Return to Inbox (or to the email that the user was viewing)
			
		}, 3 * 1000);	
	}, 3 * 1000);
	//*/
};	
	
console.log ("LucasMetal Test Loaded from: " + window.location);
