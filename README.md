IBM Bluemix Push Notifications Web SDK
===================================================

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/d969042f957a4e78a6e4ea88937c6305)](https://www.codacy.com/app/ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush&amp;utm_campaign=Badge_Grade)
[![](https://img.shields.io/badge/bluemix-powered-blue.svg)](https://bluemix.net)

The [Bluemix Push Notifications service](https://console.ng.bluemix.net/catalog/services/push-notifications) provides a unified push service to send real-time notifications to mobile and web applications. The SDK enables Safari, Chrome,  Firefox browsers and Chrome Apps & Extensions to receive push notifications sent from the service. 

Ensure that you go through [Bluemix Push Notifications service documentation](https://console.ng.bluemix.net/docs/services/mobilepush/index.html#gettingstartedtemplate) before you start.

## Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Initialize SDK](#initialize-sdk)
	- [Initialize client Push SDK](#initialize-client-push-sdk)
	- [Initialize web Push SDK](#initialize-web-push-sdk)
- [Register for notifications](#register-for-notifications)
	- [Unregistering from notifications](#unregistering-from-notifications)
- [Push Notifications service tags](#push-notification-service-tags)
    - [Retrieve available tags](#retrieve-available-tags)
    - [Subscribe to tags](#subscribe-to-tags)
    - [Retrieve subscribed tags](#retrieve-subscribed-tags)
    - [Unsubscribing from tags](#unsubscribing-from-tags)
- [Samples and Videos](#samples-and-videos)



## Prerequisites

* Firefox 49.0 or later
* Chrome 54.0 or later
* Safari 9.1 or later

## Installation

Download the [Push Notifications Web Client SDK package](https://codeload.github.com/ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush/zip/master).

## Initilaize SDK

Complete the following steps to initialize the SDK.

### Initialize client Push SDK

Complete the following steps:

Ensure that you go through [service configuration](https://console.ng.bluemix.net/docs/services/mobilepush/push_step_1.html#configure-credential-for-browsers) before starting the client configuration. 

Choose any of the following options, based on your browser:

- Chrome and Firefox web browsers

	Ensure that you go through [service configuration](https://console.ng.bluemix.net/docs/services/mobilepush/push_step_1.html#configure-credential-for-browsers) before starting the client configuration. To install the Javascript SDK in Chrome and Firefox, complete the following steps:

	1. Add the `BMSPushSDK.js`,`BMSPushServiceWorker.js` and `manifest_Website.json` files to your project root folder.

	2. Edit the `manifest_Website.json` file.

		- For Chrome browser:
			```			
					{
						"name": "YOUR_WEBSITE_NAME",
						"gcm_sender_id": "GCM_Sender_Id"
					}
					```

			Change the `name` to your website's name and update the  `gcm_sender_id` to your Firebase Cloud Messaging (FCM) [sender ID] (https://console.ng.bluemix.net/docs/services/mobilepush/push_step_1.html#push_step_1_android). Note that the `gcm_sender_id` value contains only numbers.
					

		- For Firefox browser, add the following values in `manifest_Website.json` file.
			```
				 {
      				"name": "YOUR_WEBSITE_NAME"
				}
      		```

			Change `name` to your website's name.

      
	3. Change the `manifest_Website.json` file name to `manifest.json`.        

	4. Include the `manifest.json` in `<head>` tag of your html file .
		```
		   <link rel="manifest" href="manifest.json">
		```
	5. Include Bluemix Web push SDK to the script ,
		```
    	<script src="BMSPushSDK.js" async></script>
		```


- Safari web browsers

	For Safari web browsers, add the `BMSPushSDK.js` in the `html` file:
	  ```
	   	<script src="BMSPushSDK.js" async></script>
	  ```


- Chrome Apps

	For installing the Javascript SDK in Chrome Apps, complete the following steps:

	1. Add the `BMSPushSDK.js` and  `manifest_Chrome_App.json` .
	2. Configure the manifest file:

    	1. For `Chrome App` in the `manifest_Chrome_App.json` file provide `name`, `description` , and `icons`.
    	2. Add the `BMSPushSDK.js` in the `app.background.scripts`.
    	3. Change the `manifest_Chrome_App.json` to `manifest.json`.


	3. In your `Javascript` file (background.js), add the following to receive push notifications:
	   ```
	   chrome.gcm.onMessage.addListener(BMSPushBackground.onMessageReceived)chrome.notifications.onClicked.addListener(BMSPushBackground.notification_onClicked);
		chrome.notifications.onButtonClicked.addListener(BMSPushBackground.notifiation_buttonClicked);
	   ```

- Chrome Extensions
	
	Add the `BMSPushSDK.js` and `manifest_Chrome_Ext.json` .

	1. Configure the manifest file:
	    * For `Chrome Extensions` in the `manifest_Chrome_Ext.json` file, provide `name`, `description` , and `icons`.
    	* Add the `BMSPushSDK.js` in the `background.scripts`.
    	* Change the `manifest_Chrome_Ext.json` to `manifest.json`.
	2. In your `Javascript` file, add the following to receive notifications:
	 ```
	chrome.gcm.onMessage.addListener(BMSPushBackground.onMessageReceived)
	chrome.notifications.onClicked.addListener(BMSPushBackground.notification_onClicked);
	chrome.notifications.onButtonClicked.addListener(BMSPushBackground.notifiation_buttonClicked);
   ```

### Initialize web Push SDK

Initialise the web push SDK with Bluemix Push Notifications service `app GUID`,`clientSecret`,`websitePushIDSafari`,`deviceId` and `app Region`.  

```
var bmsPush = new BMSPush()
function callback(response) {
alert(response.response)
    }
    var initParams = {
        "appGUID":"push app GUID",
        "appRegion":"Region where service hosted",
        "clientSecret":"push app client secret", // optional parameter. This value is needed for userId based notifications registration.
	      "websitePushIDSafari": "website Push ID for safari" // Optional parameter for Safari web push,
        "deviceId":"Optional deviceId for device registration"
    }
    bmsPush.initialize(params, callback)
```

The `App Region` specifies the location where the Push service is hosted. You can use one of the following three values:

- For US Dallas - `.ng.bluemix.net`
- For UK - `.eu-gb.bluemix.net`
- For Sydney - `.au-syd.bluemix.net`



>**Note**:For debugging, use `bmsPush.isDebugEnable(true)`.


## Register for notifications

Use the `register()` or `registerWithUserId()` API to register the device with Bluemix Push Notifications service. Choose either of the following options:

- Register without UserId

	To register without userId use the following pattern
	```
		var bmsPush = new BMSPush()
		function callback(response) {
		alert(response.response)
		}
		var initParams = {
			"appGUID":"push app GUID",
			"appRegion":"Region where service hosted",
    	"clientSecret":"push app client secret"
		}
		bmsPush.initialize(initParams, callback)
		bmsPush.register(function(response) {
			alert(response.response)
		})
	```

- Register with UserId

	For `UserId` based registration, use the following code snippet,
	```	
	var bmsPush = new BMSPush()
	function callback(response) {
    alert(response.response)
	}	
	var initParams = {
    	"appGUID":"push app GUID",
    	"appRegion":"Region where service hosted",
    	"clientSecret":"push app client secret"
	}
	bmsPush.initialize(initParams, callback)
	  bmsPush.registerWithUserId("your UserId",function(response) {
    	alert(response.response)
	})
	```

`WithUserId` is the user identifier value with which you want to register devices in the push service instance.

>**Note**: If `userId` is provided, the client secret value must be provided.


### Un-registering from notifications

- To un-register from receiving notifications, add the following `unRegisterDevice()` method:
	```
	bmsPush.unRegisterDevice(function(response) {
	alert(response.response)
	}
	```

- To un-register the device from `UserId` based registration, you have to call the registration method. See the `Register without userId option` in [Register for notifications](#registering-web-application).


## Push Notifications service tags

### Retrieve available tags

To retrieve all the available tags, use the `retrieveAvailableTags()` method.

```
 bmsPush.retrieveAvailableTags(function(response) { //Retrieve available tags
    var jsonResponse = JSON.parse(response.response)
    var tagsArray = []
    for (i in jsonResponse.tags){
      tagsArray.push(jsonResponse.tags[i].name)
    }
    alert(tagsArray)
 })
```

### Subscribe to tags

The `subscribe()` API will subscribe the web application for a list of given tags. After the device is subscribed to a particular tag, the device can receive push notifications that are targeted to an audience who have subscribed to that tag.

Use the following code snippet in your application to subscribe a list of tags.

```
  bmsPush.subscribe(tagsArray,function(response) {
    alert(response.response)
  })
```

### Retrieve subscribed tags

The `retrieveSubscriptions` API will return the list of tags to which a website is subscribed. 

Use the following code snippet in your application to get a subscription list.

```
bmsPush.retrieveSubscriptions(function(response){
   alert(response.response);
 })
```

### Unsubscribing from tags

To unsubscribe to a tag or tags, use the `unSubscribe()` method. Pass the array of tag names as parameter.

```
 bmsPush.unSubscribe(tagsArray,function(response) {
    alert(response.response)
  }
```

## Samples & videos

* For samples, visit - [Github Sample](https://github.com/ibm-bluemix-push-notifications/Web_HelloPush)

* For video tutorials, visit- [Bluemix Push Notifications](https://www.youtube.com/channel/UCRr2Wou-z91fD6QOYtZiHGA)

### Learning More

* Visit the **[Bluemix Developers Community](https://developer.ibm.com/bluemix/)**.

* [Getting started with IBM MobileFirst Platform for iOS](https://www.ng.bluemix.net/docs/mobile/index.html)

### Connect with Bluemix

[Twitter](https://twitter.com/ibmbluemix) |
[YouTube](https://www.youtube.com/playlist?list=PLzpeuWUENMK2d3L5qCITo2GQEt-7r0oqm) |
[Blog](https://developer.ibm.com/bluemix/blog/) |
[Facebook](https://www.facebook.com/ibmbluemix) |
[Meetup](http://www.meetup.com/bluemix/)


=======================

Copyright 2016-17 IBM Corp.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
