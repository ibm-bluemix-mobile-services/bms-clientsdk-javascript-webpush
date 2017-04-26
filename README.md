Bluemix Push Notifications Web SDK
===================================================

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/d969042f957a4e78a6e4ea88937c6305)](https://www.codacy.com/app/ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush&amp;utm_campaign=Badge_Grade)
[![](https://img.shields.io/badge/bluemix-powered-blue.svg)](https://bluemix.net)

The [Bluemix Push Notifications service](https://console.ng.bluemix.net/catalog/services/push-notifications) provides a unified push service to send real-time notifications to mobile and web applications. The SDK enables  Safari, Chrome & Firefox web browser applications to receive push notifications sent from the service.Before starting to configure Web SDK follow the [Bluemix Push service setup guide](https://console.ng.bluemix.net/docs/services/mobilepush/index.html#gettingstartedtemplate)

## Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Setup Client Application](#setup-client-application)
  - [Setup Chrome Firefox and Safari Websites](#setup-chrome-firefox-and-safari-websites)
    - [Chrome and Firefox Websites](#chrome-and-firefox-websites)
    - [Safari Websites](#safari-websites)
    - [Chrome App and Extensions](#chrome-app-and-extensions)
      - [Chrome App](#chrome-app)
      - [Chrome Extensions](#chrome-extensions)
  - [Initializing the Web Push SDK](#initializing-the-web-push-sdk)
  - [Registering Web application](#registering-web-application)
    - [Register Without UserId](#register-without-userid)
    - [Register With UserId](#register-with-userid)
    - [Unregistering the Device from Push Notification](#unregistering-the-device-from-push-notification)
    - [Unregistering the Device from UserId](#unregistering-the-device-from-userid)
  - [Push Notification service tags](#push-notification-service-tags)
    - [Retrieve Available tags](#retrieve-available-tags)
    - [Subscribe to Available tags](#subscribe-to-available-tags)
    - [Retrieve Subscribed tags](#retrieve-subscribed-tags)
    - [Unsubscribing from tags](#unsubscribing-from-tags)
- [Samples and Videos](#samples-and-videos)



## Requirements

* Firefox 49+
* Chrome 54+
* Safari 9.1+

## Installation

 Download the [bms-clientsdk-javascript-webpush](https://codeload.github.com/ibm-bluemix-mobile-services/bms-clientsdk-javascript-webpush/zip/master) files.

## Setup Client Application

### Setup Chrome Firefox and Safari Websites

Before going to the client configuration complete [service configuration](https://console.ng.bluemix.net/docs/services/mobilepush/t__main_push_config_provider.html#configure-credential-for-browsers) . For installing the Javascript SDK in Chrome Firefox and Safari Websites application follow the steps.

#### Chrome and Firefox Websites

Add the `BMSPushSDK.js`,`BMSPushServiceWorker.js` and `manifest_Website.json` files to your project root folder.

1. Edit the `manifest_Website.json` file

	For `Chrome browser` do the following,

	* Change `name` to your Website's name
	* Change `gcm_sender_id` to your Google Cloud Messaging (GCM) sender_ID ([How to get it ? Click here](https://console.ng.bluemix.net/docs/services/mobilepush/t_push_provider_android.html)). The `gcm_sender_id` value contains only numbers.

		```
		{
			"name": "YOUR_WEBSITE_NAME",
			"gcm_sender_id": "GCM_Sender_Id"
		}
		```

	For `Firefox browser` add the following values in `manifest_Website.json` file.

	* Change `name` to your Website's name.

      ```
      {
      	"name": "YOUR_WEBSITE_NAME"
      }
      ```
2. Change the `manifest_Website.json` file name to `manifest.json`.        

3. Include the `manifest.json` in `<head>` tag of your html file .

	```
	   <link rel="manifest" href="manifest.json">

	```

4. Include Bluemix Web push SDK to the script ,

	```
    <script src="BMSPushSDK.js" async></script>

	```

#### Safari Websites

  For safari you just have to add the `BMSPushSDK.js` in the `html` file

  ```
    <script src="BMSPushSDK.js" async></script>

  ```

#### Chrome App and Extensions

For installing the Javascript SDK in Chrome and Firefox Websites application follow the steps.

##### Chrome App

Add the `BMSPushSDK.js` and  `manifest_Chrome_App.json` .

1. Configure manifest file,

    * For `Chrome App` in the `manifest_Chrome_App.json` file provide `name`, `description` , and `icons`.
    * Add the `BMSPushSDK.js` in the `app.background.scripts`.
    * Change the `manifest_Chrome_App.json` to `manifest.json`.


2. In your `Javascript` file add the following to receive push notifications

   ```
   chrome.gcm.onMessage.addListener(BMSPushBackground.onMessageReceived)
   chrome.notifications.onClicked.addListener(BMSPushBackground.notification_onClicked);
   chrome.notifications.onButtonClicked.addListener(BMSPushBackground.notifiation_buttonClicked);

   ```

>**Note**: For <strong>Chrome App</strong> add the above ocde in <strong>background.js</strong>

##### Chrome Extensions

Add the `BMSPushSDK.js` and `manifest_Chrome_Ext.json` .

1. Configure manifest file,

    * For `Chrome Extensions` in the `manifest_Chrome_Ext.json` file provide `name`, `description` , and `icons`.
    * Add the `BMSPushSDK.js` in the `background.scripts`.
    * Change the `manifest_Chrome_Ext.json` to `manifest.json`.

2. In your `Javascript` file add the following to receive push notifications

   ```
   chrome.gcm.onMessage.addListener(BMSPushBackground.onMessageReceived)
   chrome.notifications.onClicked.addListener(BMSPushBackground.notification_onClicked);
   chrome.notifications.onButtonClicked.addListener(BMSPushBackground.notifiation_buttonClicked);

   ```

### Initializing the Web Push SDK

Initialise the push SDK with Bluemix push notifications service `app GUID`,`clientSecret`,`websitePushIDSafari`,`deviceId` and `app Region`.  


The `App Region` specifies the location where the Push service is hosted. You can use one of the following three values:

- For US Dallas - `.ng.bluemix.net`
- For UK - `.eu-gb.bluemix.net`
- For Sydney - `.au-syd.bluemix.net`

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

>**Note**:For Debugging use `bmsPush.isDebugEnable(true)`.


### Registering Web application

Use the `register()` or `registerWithUserId()` API to register the device with Bluemix Push Notifications service.

#### Register Without UserId

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

#### Register With UserId

For `UserId` based registration use the following code snippet,

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
##### WithUserId

- The user identifier value you want to register the device in the push service instance.

>**Note**: If userId is provided the client secret value must be provided


#### Unregistering the Device from Push Notification

To unregister the device from receiving push notification add the following `unRegisterDevice()` method.

```
  bmsPush.unRegisterDevice(function(response) {
    alert(response.response)
  }
```

#### Unregistering the Device from UserId

 To unregister from the `UserId` based registration you have to call the registration method [without userId](#register-without-userid).


### Push Notification service tags

#### Retrieve Available tags

To get the available tags use the `retrieveAvailableTags()` method.

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
#### Subscribe to tags

The `subscribe()` API will subscribe the Web application for the list of given tags. After the device is subscribed to a particular tag, the device can receive any push notifications
that are sent for that tag.

Use the following code snippets into your Swift mobile application to subscribe a list of tags.

```
  bmsPush.subscribe(tagsArray,function(response) {
    alert(response.response)
  })
```

#### Retrieve Subscribed tags

The `retrieveSubscriptions` API will return the list of tags to which the website is subscribed.

Use the following code snippets into your Swift mobile application to get the  subscription list.

```
bmsPush.retrieveSubscriptions(function(response){

   alert(response.response);

 })

 ```

#### Unsubscribing from tags

To Un-subscribe for a tag or tags use the `unSubscribe()` method. Pass the array of tag names as the parameter.

```
  bmsPush.unSubscribe(tagsArray,function(response) {
    alert(response.response)
  }

```

## Samples & videos

* Please visit for samples - [Github Sample](https://github.com/ibm-bluemix-push-notifications/Web_HelloPush)

* Video Tutorials Available here - [Bluemix Push Notifications](https://www.youtube.com/channel/UCRr2Wou-z91fD6QOYtZiHGA)

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
