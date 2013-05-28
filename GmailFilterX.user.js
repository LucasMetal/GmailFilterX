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

/*
Notes:
- Works only when Gmail is in English (must say "edit" to edit a filter)
- Filters that should be included in the dropDownList, must include the following string (including the quotes)
	in the "Doesn't have" field:
		"filterName:<FilterName>"
		
	<FilterName>: should be replaced by the wanted filter name, can contain spaces. 
		E.g.: "filterName:Friends Emails"
*/

//Patch jQuery
this.$ = this.jQuery = jQuery.noConflict(true);

// Inject the script environment in the window object, just for testing
window.top.GmailFilterX = this; 

var that = this; //Closure
this.gmailApi = new USO.Gmail(); //Initialize Gmail API

//TODO: Refactor this stolen shit
//Recursion is fun! We do not like for loops anymore
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

// When the Gmail API finish loading we configure the script
this.gmailApi.on('loaded:api', function (api) {
	
	//console.log ("GmailAPI Loaded");	
	
	//Load the gmail parameters needed to the POST for the settings
	that.set_gmail_params();
	
	//console.log ( that.gmail_params);
	
	var filterNames = [], 
		settingsRequestUrl = 	window.top.location.origin + window.top.location.pathname + "?ik=" +
								that.gmail_params["GMAIL_IK"] + "&view=pu&rt=j";
	
	//console.log(settingsRequestUrl);
	
	// Make a post to the settings URL, to get the config and be able to parse the filters names
	$.post(settingsRequestUrl, function (data){
		
		console.log ("Success getting Settings!");
		//console.log (data);
				
		// Regex vars, to match the filter names
		var filterMatch = null,
			filterRegex = /-{\\\"filterName:([\w\s]+)\\\"}/g;			
		
		// Execute the Regex and save the configured filters names (the ones that have "filterName")
		while ( filterMatch = filterRegex.exec(data)){
			filterNames.push (filterMatch[1]); //filterMatch[0]: full text, filterMatch[1]: group match
		}
					
		//console.log (filterNames);
		
	// Must indicate that server returns "text", otherwise it tris to parse as Json and explodes
	}, "text").fail(function(error, jqXHR ) { 
		console.log ("Error getting Settings!");
		console.log(error); 
		console.log(jqXHR ); 		
	});
	
	// Attach to the "viewing a message" event
	that.gmailApi.on("message:view", function (message){
			
		//console.log ("message:view");
		//console.log ($(gmailApi.view));		
		// From the message object we could get more data, maybe to locate the dropDownList in another place
		//console.log(message);
		
		// Get the "from" address from the message object that we received from the Gmail API
		var fromEmailAddress = message.getFromAddress();
				
		// Create a dropDownList in the email header, filled with the filters names
		var selectHtml = "<select style='font-size:80%'><option value=''>Add to filter...</option>";
		for (var i=0; i< filterNames.length; i++){
			selectHtml+= "<option value='" + filterNames[i] + "'>" + filterNames[i] + "</option>";
		}
		selectHtml+= "</select>";

		// Create the SELECT object and insert it in the DOM (right beside the labels of the email)
		// TODO: Validate not to insert it more than once (happens now when the conversation has more than one email)
		var $selectHtml = $(selectHtml);
		$(that.gmailApi.view).find("h1.ha").append($selectHtml);
				
		// Attach an eventHandler to the select change event, to fire there the edition of the filter
		$selectHtml.on("change", function (event){
			if (filterName = $(this).val()){
				that.editFilter (filterName, fromEmailAddress);
			}
		});
		
	});
});

// In case of an error when loading the Gmail API
this.gmailApi.on('error', function (error) {

	console.log ("GmailAPI Error:");
	console.log (error);
});

this.editFilter = function (filterName, valueToAdd){

	//console.log ("editFilter: " + filterName + ": " + valueToAdd);

	var	$fromTxt = null;
	
	// Navigate to the settings page
	window.top.location.hash = "settings/filters";

	// Wait for the settings HTML to load
	setTimeout ( function(){
		// Click in the "Edit" link of the corresponding filter (depending on the value received from the user selection)
		// TODO: Find a way to make it international, now works only in english (because of the "edit" text)
		$(window.top.document).find("tr:contains('filterName:" + filterName + "') span:contains('edit')").click();
			
		// Wait for the filter editor HTML to load
		setTimeout ( function(){
			// Get the "from" field using the CSS class (there is no other way :( )
			var $fromTxt = $(window.top.document).find(".ZH.nr.aQa");
			
			// Generate the value to add and add it			
			var completeValueToAdd = " OR " + valueToAdd; // Add an OR to the condition too
			$fromTxt.val( $fromTxt.val() + completeValueToAdd);			
			
			// Select the text we have just added to the textbox			
			$fromTxt[0].selectionStart = $fromTxt.val().length - completeValueToAdd.length;
			$fromTxt[0].selectionEnd = $fromTxt.val().length;
			$fromTxt.focus();
						
			//console.log ("filterEdited!");
			
			//TODO: Return to Inbox (or to the email that the user was viewing)
			
		}, 3 * 1000);	
	}, 3 * 1000);
	//*/
};	
	
console.log ("Gmail FilterX Loaded from: " + window.location);
