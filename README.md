IBM Cloud Push Notifications Web SDK
===================================================

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/366d7ce833db40c3bc86f7103ca2950e)](https://www.codacy.com/gh/ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush&amp;utm_campaign=Badge_Grade)

The [IBM Cloud Push Notifications service](https://cloud.ibm.com/catalog/services/push-notifications) provides a unified push service to send real-time notifications to mobile and web applications. The SDK enables Safari, Chrome,  Firefox browsers and Chrome Apps & Extensions to receive push notifications sent from the service. 

Ensure that you go through [IBM Cloud Push Notifications service documentation](https://cloud.ibm.com/docs/services/mobilepush?topic=mobile-pushnotification-gettingstartedtemplate#gettingstartedtemplate) before you start.

## Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Initialize SDK](#initialize-sdk)
	- [Initialize client Push SDK](#initialize-client-push-sdk)
	- [Initialize web Push SDK](#initialize-web-push-sdk)
- [Register for notifications](#register-for-notifications)
	- [Unregistering from notifications](#unregistering-from-notifications)
- [Push Notifications service tags](#push-notifications-service-tags)
    - [Retrieve available tags](#retrieve-available-tags)
    - [Subscribe to tags](#subscribe-to-tags)
    - [Retrieve subscribed tags](#retrieve-subscribed-tags)
    - [Unsubscribing from tags](#unsubscribing-from-tags)
- [Parameterize Push Notifications](#parameterize-push-notifications)
- [Samples and videos](#samples-and-videos)


## Prerequisites

* Firefox 49.0 or later
* Chrome 54.0 or later
* Safari 9.1 or later

## Installation

Download the [Push Notifications Web Client SDK package](https://codeload.github.com/ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush/zip/master).

## Initialize SDK

Complete the following steps to initialize the SDK.

### Initialize client Push SDK

Complete the following steps:

Ensure that you go through [service configuration](https://cloud.ibm.com/docs/services/mobilepush/push_step_1.html#configure-credential-for-browsers) before starting the client configuration. 

Choose any of the following options, based on your browser:

- Chrome and Firefox web browsers

	Ensure that you go through [service configuration](https://cloud.ibm.com/docs/services/mobilepush/push_step_1.html#configure-credential-for-browsers) before starting the client configuration. To install the Javascript SDK in Chrome and Firefox, complete the following steps:

	1. Add the `BMSPushSDK.js`,`BMSPushServiceWorker.js` and `manifest_Website.json` files to your project root folder.

	2. Edit the `manifest_Website.json` file.

		- For Chrome browser:
			```JSON
			{
				"name": "YOUR_WEBSITE_NAME",
				"gcm_sender_id": "GCM_Sender_Id"
			}
			```

			Change the `name` to your website's name and update the  `gcm_sender_id` to your Firebase Cloud Messaging (FCM) [sender ID] (https://cloud.ibm.com/docs/services/mobilepush/push_step_1.html#push_step_1_android). Note that the `gcm_sender_id` value contains only numbers.
			>**Note**: `gcm_sender_id` is not required if you are using the applicationServerKey in BMS push init method.

		- For Firefox browser, add the following values in `manifest_Website.json` file.
			```JSON
			{
      		"name": "YOUR_WEBSITE_NAME"
			}
      		```

			Change `name` to your website's name.

      
	3. Change the `manifest_Website.json` file name to `manifest.json`.      

	4. Include the `manifest.json` in `<head>` tag of your html file .
		```HTML
		 <link rel="manifest" href="manifest.json">
		```
	5. Include IBM Cloud Web push SDK to the script ,
		```HTML
    	<script src="BMSPushSDK.js" async></script>
		```


- Safari web browsers

	For Safari web browsers, add the `BMSPushSDK.js` in the `html` file:
	  ```HTML
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
	   ```JS
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
	 ```JS
	chrome.gcm.onMessage.addListener(BMSPushBackground.onMessageReceived)
	chrome.notifications.onClicked.addListener(BMSPushBackground.notification_onClicked);
	chrome.notifications.onButtonClicked.addListener(BMSPushBackground.notifiation_buttonClicked);
   ```

### Initialize web Push SDK

Initialise the web push SDK with IBM Cloud Push Notifications service `app GUID`,`clientSecret`,`websitePushIDSafari`,`deviceId` and `app Region`.  
If you are using dedicated service, use `overrideServerHost` and add any of the IBM Cloud region value.

```JS
var bmsPush = new BMSPush()
function callback(response) {
	alert(response.response)
}
var initParams = {
    "appGUID":"push app GUID",
    "appRegion":"Region where service hosted",
    "clientSecret":"push app client secret", 
    "websitePushIDSafari": "website Push ID for safari" // Optional parameter for Safari web push,
    "deviceId":"Optional deviceId for device registration" // optional parameter.
    "applicationServerKey":"VAPID key" // Get this value from swagger , under appliactions -> webpushServerKey,
    "overrideServerHost": "YOUR_SERVICE_HOST" // optional parameter
    
}
bmsPush.initialize(params, callback)
```

The `App Region` specifies the location where the Push service is hosted. You can use one of the following three values:

- For US Dallas - `us-south`
- For UK - `eu-gb`
- For Sydney - `au-syd`
- For Germany -  `eu-de`
- For US East - `us-east`
- For Tokyo - `jp-tok`

`applicationServerKey` is the VAPID implementaion for Chrome. This is required for new versions of Chrome. Get this value from the [Push service swagger](https://cloud.ibm.com/apidocs/push-notifications), under the `applications -> webpushServerKey` section.

>**Note**:For debugging, use `bmsPush.isDebugEnable(true)`.

## Register for notifications

Use the `register()` or `registerWithUserId()` API to register the device with IBM Cloud Push Notifications service. Choose either of the following options:

- Register without UserId

	To register without userId use the following pattern
	```JS
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
	```JS
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


### Unregistering from notifications

- To unregister from receiving notifications, add the following `unRegisterDevice()` method:
	```JS
	bmsPush.unRegisterDevice(function(response) {
		alert(response.response)
	}
	```

- To unregister the device from `UserId` based registration, you have to call the registration method. See the `Register without userId option` in [Register for notifications](#registering-web-application).


## Push Notifications service tags

### Retrieve available tags

To retrieve all the available tags, use the `retrieveAvailableTags()` method.

```JS
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

```JS
bmsPush.subscribe(tagsArray,function(response) {
  alert(response.response)
})
```

### Retrieve subscribed tags

The `retrieveSubscriptions` API will return the list of tags to which a website is subscribed. 

Use the following code snippet in your application to get a subscription list.

```JS
bmsPush.retrieveSubscriptions(function(response){
   alert(response.response);
})
```

### Unsubscribing from tags

To unsubscribe to a tag or tags, use the `unSubscribe()` method. Pass the array of tag names as parameter.

```JS
bmsPush.unSubscribe(tagsArray,function(response) {
	alert(response.response)
}
```
## Parameterize Push Notifications

  Add the variables in the Push initialize params values.

  ```JS
  var templateValues = {
    "userName":"testname",
    "accountNumber":"3564758697057869"
  }

  var initParams = {
    "appGUID":"push app GUID",
    "appRegion":"Region where service hosted",
    "clientSecret":"push app client secret",
    "pushVaribales":templateValues
  }

  bmsPush.initialize(initParams, callback)
  ```
While registering the device IBM Cloud Push Notifications Web SDK will pass these variables to IBM Cloud Push Notifications service. 

While sending push notification add the varibale key in `{{}}`

  ```JSON

    {
        "message": {
            "alert": "hello {{username}} , balance on your account {{accountNumber}} is $1200"
        }
    }

  ```

## Samples and videos

* For samples, visit - [Github Sample](https://github.com/ibm-bluemix-mobile-services/bms-samples-swift-hellopush)

* For video tutorials visit - [IBM Cloud Push Notifications](https://www.youtube.com/playlist?list=PLTroxxTPN9dIZYn9IU-IOcQePO-u5r0r4)

### Learning more

* Visit the **[IBM Cloud Developers Community](https://developer.ibm.com/depmodels/cloud/)**.

* [Getting started with IBM MobileFirst Platform for iOS](https://cloud.ibm.com/docs/mobile)

### Connect with IBM Cloud

[Twitter](https://twitter.com/IBMCloud) |
[YouTube](https://www.youtube.com/watch?v=AVPoBWScRQc) |
[Blog](https://developer.ibm.com/depmodels/cloud/) |
[Facebook](https://www.facebook.com/ibmcloud) |


=======================
Copyright 2020-21 IBM Corp.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
