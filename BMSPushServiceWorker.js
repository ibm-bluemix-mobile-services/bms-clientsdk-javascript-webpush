/*
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
*/
'use strict'
/*
The variables for SDK to work. Need to be figured out how to set them globally
*/
var _appId;
var _pushClientSecret;
var _appRegion;
var _deviceId;
var _userId;
var isPushInitialized = false;
var isDebugEnabled = false; /* Enable for debugging*/
var _isUserIdEnabled = false;
var _isExtension = false;
var _gcmSenderId;
var reWriteDomain;
var BMSPushResponse = {};
var _platform;
var _websitePushIDSafari;

function BMSPush(){
  /**
  * Initialize the BMS Push SDK
  *
  * @param appGUID - The push service App Id value
  * @param appRegion - The region of the push service you hosted. Eg: .ng.bluemix.net, .eu-gb.bluemix.net or .au-syd.bluemix.net
  * @param clientSecret - The push service client secret value.
  */
  this.initialize = function(params, callback ) {
    printLog("Enter - initialize");

    _appId = params.appGUID ? params.appGUID : "";
    _appRegion = params.appRegion ? params.appRegion : "";
    _pushClientSecret = params.clientSecret ? params.clientSecret : "";
    _websitePushIDSafari = params.websitePushIDSafari ? params.websitePushIDSafari : "";
    
    if (validateInput(_appId) && validateInput(_appRegion)) {
      setRewriteDomain(_appRegion);

      if (validateInput(_pushClientSecret)) {
        printLog("User has provided a valid client secret");
      }
      else {
        printLog("User has not provided a valid client secret");
      }

      if(window.navigator.userAgent.indexOf("Chrome") != -1  && chrome.runtime.getManifest){
        _isExtension = true;
      }

      if (_isExtension) {
        chrome.storage.local.get('deviceId', function (result) {
          _deviceId = result.deviceId;
          if (_deviceId == "" || _deviceId == null || _deviceId == undefined) {
            _deviceId = generateUUID();
          }
          initializePush(true,callback);
        });

      } else{
        if (!localStorage.getItem("deviceId")) {
          _deviceId = generateUUID();
        }else {
          _deviceId = localStorage.getItem("deviceId");
        }
        checkNotificationSupport(initializePush,callback);
      }
    } else {
      printLog("Please provide a valid  appGUID or/and appRegion");
      setPushResponse("Please provide a valid  appGUID or/and appRegion",404,"Error")
      callback (PushResponse);
    }
    printLog("Exit - initialize");
  };

  /**
  * Registers the device on to the BMSPush Notification Server
  *
  */
  this.register = function (callbackM){
    _userId = "";
    registerPush(_userId,callbackM)
  };

  /**
  * Registers the device on to the BMSPush Notification Server
  *
  * @param userId: the User ID value.
  */
  this.registerWithUserId = function (userId, callbackM){
    registerPush(userId,callbackM)
  };

  /**
  * Unregisters the device from the BMSPush Notification Server
  *
  */
  this.unRegisterDevice = function(callbackM){
    printLog("Enter - unRegisterDevice");

    navigator.serviceWorker.ready.then(function(reg) {

      reg.pushManager.getSubscription().then(
        function(subscription) {
          setTimeout(function() {
            // We have a subcription, so call unsubscribe on it
            subscription.unsubscribe().then(function(successful) {
              printLog('Successfully unRegistered from GCM push notification');
              printLog('Start Unregistering from the Bluemix Push')
              callback (unRegisterDevice(callbackM));
            }).catch(function(e) {
              // We failed to unsubscribe, this can lead to
              // an unusual state, so may be best to remove
              // the subscription id from your data store and
              // inform the user that you disabled push
              printLog('Unsubscription error: ', e);
              callback("Error in Unregistration")
              setPushResponse("Insufficient Scope. Error in Unregistration",401,"Error")
              callbackM(BMSPushResponse)
            })
          },3000);
        }).catch(function(e) {
          printLog('Error thrown while unsubscribing from push messaging :', e);
          callback("Error in Unregistration")
          var error = "Error thrown while unsubscribing from push messaging :"+e;
          setPushResponse(error,401,"Error");
          callbackM(BMSPushResponse)
        });
      });
      printLog("Exit - unRegisterDevice");
    };

    /**
    * Subscribes to a particular backend mobile application Tag(s)
    *
    * @param tags - The Tag array to subscribe to. Eg; ["tag1","tag2"]
    */
    this.subscribe = function(tagArray,callbackM){

      printLog("Enter - Subscribing tags");
      if (tagArray.length > 0) {
        callback(subscribeTags(tagArray,callbackM));
      } else {
        printLog("Error - Tag array cannot be null. Create tags in your Bluemix App");
        setPushResponse("Error - Tag array cannot be null. Create tags in your Bluemix App",401,"Error");
        callbackM(BMSPushResponse)
      }
      printLog("Exit - Subscribing tags");
    };

    /**
    * Unsubscribes from an backend mobile application Tag(s)
    *
    * @param  tags - The Tag name array to unsubscribe from. Eg: ["tag1","tag2"]
    */
    this.unSubscribe = function(tagArray,callbackM){
      printLog("Enter - UnSubscribing tags");
      if (tagArray.length > 0) {
        callback(unSubscribeTags(tagArray,callbackM));
      } else {
        printLog("Error - Tag array cannot be null");
        setPushResponse("Error - Tag array cannot be null",401,"Error");
        callbackM(BMSPushResponse)
      }
      printLog("Exit - UnSubscribing tags");
    };

    /**
    * Gets the Tags that are subscribed by the device
    *
    */
    this.retrieveSubscriptions = function(callbackM){
      printLog("Enter - retrieveSubscriptions");
      callback(retrieveTagsSubscriptions(callbackM));
      printLog("Exit - retrieveSubscriptions");
    };

    /**
    * Gets all the available Tags for the backend mobile application
    *
    */
    this.retrieveAvailableTags = function(callbackM){
      printLog("Enter - retrieveAvailableTags");
      callback(retrieveTagsAvailable(callbackM));
      printLog("Exit - retrieveAvailableTags");
    };

    var setPushResponse = function(response, statusCode, error) {
      BMSPushResponse.response = response;
      BMSPushResponse.error = error;
      BMSPushResponse.statusCode = statusCode;
    }

    this.pushResponse = function(){
      return BMSPushResponse;
    };

    /*
      Enable debug mode to print the logs on the browser console
    */
    this.enableDebug = function() {
      isDebugEnabled = true;
    }

    /*
      Disable debug mode
    */
    this.disableDebug = function() {
      isDebugEnabled = false;
    }

    /*
      @Deprecated Use enableDebug or disableDebug
    */
    this.isDebugEnable = function(value) {
      if(typeof(value) === "boolean"){
        isDebugEnabled = value;
      }
    };

    /*
      Internal functions for the SDK
    */

    function registerPush(userId,callbackM) {
      if (validateInput(userId)) {
        printLog("set userId registration")
        _isUserIdEnabled = true;
        _userId = userId;
      }
      if (!_isExtension) {
        var userAgentOfBrowser = navigator.userAgent.toLowerCase();
        printLog("started registration for the browser " + userAgentOfBrowser);
        if(userAgentOfBrowser.indexOf('safari') >= 0) {
        	var resultSafariPermission = window.safari.pushNotification.permission(_websitePushIDSafari);
        	if(resultSafariPermission.permission === "default") {
        		//User never asked before for permission
        		var base_url = "https://imfpushsafariwebpush" + _appRegion +  "/imfpush/v1/apps/" + _appId + "/settings/safariWebConf";
        		printLog("Request user for permission to receive notification for base URL " + base_url + " and websitepushID " + _websitePushIDSafari );
        		window.safari.pushNotification.requestPermission(base_url,
        				_websitePushIDSafari,
        				{},
        				function(resultRequestPermission){
        					if(resultRequestPermission.permission === "granted") {
        						printLog("The user has granted the permission to receive notifications");
        						registerUsingToken(resultRequestPermission.deviceToken, callbackM);
        					}
        				});
        		
        	}
        	else if(resultSafariPermission.permission === "denied") {
        		// The user denied the notification permission which
                // means we failed to subscribe and the user will need
                // to manually change the notification permission to
                // subscribe to push messages
                printLog('Permission for Notifications was denied');
                setPushResponse("Notifications aren\'t supported on service workers.",401,"Error");
                callback("Error in registration");
                callbackM(BMSPushResponse);
        	}
        	else {
        		//Already granted the permission
        		registerUsingToken(resultSafariPermission.deviceToken, callbackM);
        	}
        }
        else {
        	navigator.serviceWorker.ready.then(function(reg) {
                reg.pushManager.getSubscription().then(
                  function(subscription) {
                    if (subscription) {
                      registerUsingToken(subscription,callbackM);
                    } else {
                      reg.pushManager.subscribe({
                        userVisibleOnly: true
                      }).then(function(subscription) {
                        registerUsingToken(subscription,callbackM);
                      }).catch(function(error) {
                        if (Notification.permission === 'denied') {
                          // The user denied the notification permission which
                          // means we failed to subscribe and the user will need
                          // to manually change the notification permission to
                          // subscribe to push messages
                          printLog('Permission for Notifications was denied');
                          setPushResponse("Notifications aren\'t supported on service workers.",401,"Error");
                        } else {
                          // A problem occurred with the subscription, this can
                          // often be down to an issue or lack of the gcm_sender_id
                          // and / or gcm_user_visible_only
                          printLog('Unable to subscribe to push.', error);
                          setPushResponse("Notifications aren\'t supported on service workers.",401,"Error");
                        }
                        callback("Error in registration")
                        callbackM(BMSPushResponse)
                      });
                    }
                  }).catch(function(e) {
                    printLog('Error thrown while subscribing from ' +
                    'push messaging.', e);
                    setPushResponse(e,401,"Error");
                    callbackM(BMSPushResponse)
                  });
                });
        }
        		
        
      }else{
          get("/settings/chromeAppExtConfPublic",function ( res ) {
            printLog('previous Device Registration Result :', res);
            var status = res.status ;
            if (status == 200){
              var json = JSON.parse(res.response);
              _gcmSenderId = json.senderId
              var senderIds = [_gcmSenderId];
              chrome.gcm.register(senderIds, function(registrationId){
                if (chrome.runtime.lastError) {
                  setPushResponse(chrome.runtime.lastError,401,"Error");
                  callbackM(MFPPushResponse)
                  return;
                }
                registerUsingToken(registrationId,callbackM);
                printLog("The response is : ",registrationId);
              });
            } else{
              printLog("The response is ,",res);
              setPushResponse(res.responseText,status,"Error while retrieving the Chrome App/Ext configuration");
              callbackM(BMSPushResponse)
            }
          },null);
        }
      }

      function update () {

        function callback(response) {
          printLog("updation is done :", response);
        }
        registerPush(_userId, callback);
      }

      function initializePush(value, callbackM) {
        if (value === true) {
          setPushResponse("Successfully initialized Push",200, "")
          printLog("Successfully Initialized")
          isPushInitialized = true;
          callbackM(BMSPushResponse)
        } else {
          printLog("Error in Initializing push");
          isPushInitialized = false;
          callbackM(BMSPushResponse)
        }
      }

      function sendMessage(message) {
        return new Promise(function(resolve, reject) {
          var messageChannel = new MessageChannel();
          messageChannel.port1.onmessage = function(event) {
            if (event.data.error) {
              reject(event.data.error);
            } else {
              resolve(event.data);
              update();
            }
          };
          navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
        });
      }

      function checkNotificationSupport(initializePushM,callbackM) {
        printLog("Started checking the notification compatibility");
        var userAgentOfBrowser = navigator.userAgent.toLowerCase();
        if ('serviceWorker' in navigator) {
          if(userAgentOfBrowser.indexOf("firefox") != -1 )
          {
            sendMessage("Set Update Port")
          }
          navigator.serviceWorker.register('BMSPushServiceWorker.js').then(function(reg) {
            if(reg.installing) {
              printLog('Service worker installing');
            } else if(reg.waiting) {
              printLog('Service worker installed');
            } else if(reg.active) {
              printLog('Service worker active');
            }
            if (!(reg.showNotification)) {
              printLog('Notifications aren\'t supported on service workers.');
              callback("Error in initialize. Notifications aren\'t supported on service workers.")
              setPushResponse("Notifications aren\'t supported on service workers.",401,"Error");
              initializePushM(false,callbackM);
            }

            // Check the current Notification permission.
            // If its denied, it's a permanent block until the
            // user changes the permission
            if (Notification.permission === 'denied') {
              printLog('The user has blocked notifications.');
              //return false;
              callback("Error in initialize. The user has blocked notifications.")
              setPushResponse("The user has blocked notifications",401,"Error");
              initializePushM(false,callbackM);
            }

            // Check if push messaging is supported
            if (!('PushManager' in window)) {
              printLog('Push messaging isn\'t supported.');
              callback("Error in registration. Push messaging isn\'t supported.")
              setPushResponse("Push messaging isn\'t supported.",401,"Error")
              initializePushMcallback(false,callbackM);
            }
            initializePushM(true,callbackM);
          })
        }
        else if(userAgentOfBrowser.indexOf('safari') != -1) {
        	//Service workers are not supported by Safari
        	//TODO: Check for safari version
        	initializePushM(false,callbackM);
        }
        else {
          printLog('Service workers aren\'t supported in this browser.');
          callback("Service workers aren\'t supported in this browser.")
          setPushResponse("Service workers aren\'t supported in this browser.",401,"Error")
          initializePushM(false,callbackM);
        }
      }

      function callback (response){
        printLog("Response from Bluemix Push Notification Service");
        printLog(response);
      }

      /*Get subscription details*/

      function registerUsingToken(subscription, callbackM) {

        // Update status to subscribe current user on server, and to let
        // other users know this user has subscribed
        printLog('Subscription data is : ', JSON.stringify(subscription));
        printLog('endpoint:', subscription.endpoint);
        var subscriptionStr = JSON.stringify(subscription).replace(/"/g,"\\\"");
        printLog('subscription as string: ', subscriptionStr);

        _platform = "";
        var token;
        if (!_isExtension) {
          _deviceId = localStorage.getItem("deviceId");
          localStorage.setItem("token",subscription);

          var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
          var key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
          var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
          var authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';

          
          var userAgentOfBrowser = navigator.userAgent.toLowerCase();
          if(userAgentOfBrowser.indexOf('safari')) {
        	  _platform = "WEB_SAFARI";
        	  token = subscription; // This is a string value;
        	  printLog('The device token from safari is ' + token);
          }
          else {
        	  var tokenValue = {
        	            "endpoint": subscription.endpoint,
        	            "userPublicKey": key,
        	            "userAuth": authSecret,
        	          };
        	  token = JSON.stringify(tokenValue);
          }
          
          if(userAgentOfBrowser.indexOf("firefox") != -1 ){

            _platform = "WEB_FIREFOX";

          } else if(userAgentOfBrowser.indexOf("chrome") != -1 ){

            _platform = "WEB_CHROME";
          }
          var device = {}
          if (_isUserIdEnabled == true){
            device = {
              "deviceId": _deviceId,
              "token": token,
              "platform": _platform,
              "userId":_userId
            };
          } else{
            device = {
              "deviceId": _deviceId,
              "token": token,
              "platform": _platform
            };
          }
          //Safari browser calls register on push ... No need to call it explicitly
          if(_platform === "WEB_SAFARI") {
        	  setPushResponse("", 201);
        	  callbackM(BMSPushResponse);
          }
          else {
        	  callRegister(device,callbackM);
          }
          
        }else{
          token = subscription;
          _platform = "APPEXT_CHROME"
          var device = {};
          chrome.storage.local.get('deviceId', function (result) {
            _deviceId = result.deviceId;

            if (_isUserIdEnabled == true){
              device = {
                "deviceId": _deviceId,
                "token": token,
                "platform": _platform,
                "userId":_userId
              };
            } else{
              device = {
                "deviceId": _deviceId,
                "token": token,
                "platform": _platform
              };
            }
            callRegister(device,callbackM);
          });
          chrome.storage.local.set({'token':subscription})
          BMSPushBackground.init();
        }
      }

      function callRegister (device,callbackM){
        if (_isUserIdEnabled){
          callback(registerDeviceWithUserId(device,callbackM));
        } else{
          callback(registerDevice(device, callbackM));
        }
      }
      /* Register Device without userId*/
      function registerDevice(device,callbackM) {

        printLog("Got device details without userid:", device);
        printLog("Checking the previous registration :", device);
        var devId = device.deviceId;
        get("/devices/"+devId,function ( res ) {

          printLog('previous Device Registration Result :', res);
          var status = res.status ;
          if(status == 404){
            printLog('Starting New Device Registration  without userid:');
            post("/devices", function ( res ) {
              status = res.status ;
              printLog('New Device Registration without userid: Result :', res);
              if (status == 201) {
                printLog("Successfully registered device");
                printLog("The response is ,",res);
                setPushResponse(res,201,"");
                callbackM(BMSPushResponse)
              } else{
                printLog("Error in registering device");
                printLog("The response is ,",res);
                setPushResponse(res,status,"Error in registering device");
                callbackM(BMSPushResponse)
              }
              return res;
            },device,null);
          }else if ((status == 406) || (status == 500)) {
            printLog("Error while verifying previuos device registration without userid:");
            printLog("The response is ,",res);
            setPushResponse(res,status,"Error while verifying previuos device registration");
            callbackM(BMSPushResponse)
            return res;
          } else  {

            var resp = JSON.parse(res.responseText);
            var rToken = resp.token;
            var rDevId = resp.deviceId;
            if ( !(rToken === device.token) ||  !(rDevId === device.deviceId)){
              put("/devices/"+devId, function ( res ) {

                var status = res.status;
                if (status == 201) {
                  printLog("Successfully registered device without userid:");
                  printLog("The response is ,",res);
                  setPushResponse(res,201,"");
                  callbackM(BMSPushResponse)
                } else{
                  printLog("Error in registering device without userid:");
                  printLog("The response is ,",res);
                  setPushResponse(res,status,"Error in registering device");
                  callbackM(BMSPushResponse)
                }
                return res;
              },device,null);
            } else{
              printLog("Device is already registered and device registration parameters not changed. without userid:");
              setPushResponse(res,201,"");
              callbackM(BMSPushResponse)
              return res;
            }
          }
        }, device,null);
      }

      /* Register Device with userId*/

      function registerDeviceWithUserId(device,callbackM) {

        printLog("Got device details with userid:", device);
        printLog("Checking the previous registration :", device);
        var devId = device.deviceId;
        _userId = device.userId;
        if (validateInput(_pushClientSecret) && validateInput(_userId)) {
          get("/devices/"+devId,function ( res ) {
            printLog('previous Device Registration Result :', res);
            var status = res.status ;
            if(status == 404){
              printLog('Starting New Device Registration ');
              post("/devices", function ( res ) {

                status = res.status ;

                printLog('New Device Registration Result :', res);
                if (status == 201) {
                  printLog("Successfully registered device");
                  printLog("The response is ,",res);
                  setPushResponse(res.responseText,201,"");
                  callbackM(BMSPushResponse)
                } else{
                  printLog("Erron in registering device");
                  printLog("The response is ,",res);
                  setPushResponse(res.responseText,status,"Error in registering device");
                  callbackM(BMSPushResponse)
                }
                return res;
              },device,null);
            }else if ((status == 406) || (status == 500)) {
              printLog("The response is ,",res);
              setPushResponse(res.responseText,status,"Error while verifying previuos device registration");
              callbackM(BMSPushResponse)
              return res;
            } else  {

              var resp = JSON.parse(res.responseText);
              var rToken = resp.token;
              var rDevId = resp.deviceId;
              var userId = resp.userId;
              if ( !(rToken === device.token) ||  !(rDevId === device.deviceId) || !(userId == _userId)){
                put("/devices/"+devId, function ( res ) {
                  var status = res.status;
                  if (status == 201) {
                    printLog("The response is ,",res);
                    setPushResponse(res.responseText,201,"");
                    callbackM(BMSPushResponse)
                  } else{
                    printLog("The response is ,",res);
                    setPushResponse(res.responseText,status,"Error in registering device");
                    callbackM(BMSPushResponse)
                  }
                  return res;
                },device,null);
              } else{
                printLog("Device is already registered and device registration parameters not changed.");
                setPushResponse(res.responseText,201,"");
                callbackM(BMSPushResponse)
                return res;
              }
            }
          }, device,null);
        } else {
          printLog("Please provide valid userId and clientSecret.")
          setPushResponse("Please provide valid userId and clientSecret.",401,"Error")
          callbackM(BMSPushResponse)
        }
      }

      function unRegisterDevice (callbackM){
        printLog("Entering the unregister device");
        var devId = localStorage.getItem("deviceId");
        deletes("/devices/"+devId, function ( response ) {

          var status = response.status;
          if (status == 204) {
            printLog("Successfully unregistered the device");
            setPushResponse(response.responseText,204,"");
            localStorage.setItem("deviceId","");
            callbackM(BMSPushResponse)
            return response;
          } else{
            printLog("Error in  unregistering the device");
            setPushResponse(response.responseText,status,"Error")
            callbackM(BMSPushResponse)
            return response;
          }
        },null);
      }

      function subscribeTags(tagArray,callbackM) {
        printLog("Entering the subscribe tags");
        var devId = localStorage.getItem("deviceId");
        var tags = {
          "deviceId": devId,
          "tagNames": tagArray
        };
        post("/subscriptions", function ( res ) {
          var status = res.status ;
          printLog('Tag Subscription Result :', res);
          if (status >= 200 && status <= 300)  {
            printLog("Successfully subscribed to tags -");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"");
            callbackM(BMSPushResponse)
          } else{
            printLog("Error while subscribing to tags :");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"Error while subscribing to tags :");
            callbackM(BMSPushResponse)
          }
          return res;
        },tags,null);
      }

      function unSubscribeTags(tagArray,callbackM) {
        printLog("Entering the Un-subscribe tags");
        var devId = localStorage.getItem("deviceId");
        var tags = {
          "deviceId": devId,
          "tagNames": tagArray
        };
        post("/subscriptions?action=delete", function ( res ) {
          var status = res.status ;
          printLog('Tag un-subscription Result :', res);
          if (status >= 200 && status <= 300)  {
            printLog("Successfully Un-subscribed to tags -");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"");
            callbackM(BMSPushResponse)
          } else{
            printLog("Error while Un-subscribing to tags :");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"Error while Un-subscribing to tags :");
            callbackM(BMSPushResponse)
          }
          return res;
        },tags,null);
      }

      function retrieveTagsSubscriptions(callbackM) {
        printLog("Entering the Retrieve subscriptions of tags");
        var devId = localStorage.getItem("deviceId");

        get("/subscriptions?deviceId="+devId,function ( res ) {
          var status = res.status ;
          printLog('Retrieve subscription Result :', res);
          if (status >= 200 && status <= 300)  {
            printLog("Successfully retrieved subscribed tags");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"");
            callbackM(BMSPushResponse)
          } else{
            printLog("Error while retrieve subscribed tags :");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"Error while retrieve subscribed tags :");
            callbackM(BMSPushResponse)
          }
          return res;
        },null);
      }

      function retrieveTagsAvailable(callbackM) {
        printLog("Entering the Retrieve available tags");
        printLog("Entering the Retrieve subscriptions of tags");
        get("/tags",function ( res ) {
          var status = res.status ;
          printLog('Retrieve available tags Result :', res);
          if (status >= 200 && status <= 300)  {
            printLog("Successfully retrieved available tags");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"");
            callbackM(BMSPushResponse)
          } else{
            printLog("Error while retrieve available tags :");
            printLog("The response is ,",res);
            setPushResponse(res.responseText,status,"Error while retrieve available tags :");
            callbackM(BMSPushResponse)
          }
          return res;
        },null);
      }

      /*
      API calls start here
      */
      function get (action, callback, data, headers) {
        return callPushRest('GET', callback, action, data, headers);
      }

      function post (action, callback, data, headers) {
        return callPushRest('POST', callback, action, data, headers);
      }

      function put (action, callback, data, headers) {
        return callPushRest('PUT', callback, action, data, headers);
      }

      function deletes (action,callback, data, headers) {
        return callPushRest('DELETE', callback, action, data, headers);
      }


      function callPushRest(method, callback, action, data, headers)
      {
        var url = 'https://imfpushsafariwebpush' + _appRegion + '/imfpush/v1/apps/' + _appId;
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
          if (xmlHttp.readyState == 4 )
          callback(xmlHttp);
        }
        xmlHttp.open(method, url + action, true); // true for asynchronous
        xmlHttp.setRequestHeader('Content-Type', 'application/json; charset = UTF-8');
        if (validateInput(_pushClientSecret)) {
          xmlHttp.setRequestHeader('clientSecret', _pushClientSecret);
        }
        xmlHttp.send(JSON.stringify(data));
      }

      function setRewriteDomain(appReg) {
        var a = appReg.split(".");
        if(appReg.includes("stage1-dev")){
          _appRegion = ".stage1-dev."+a[2]+".bluemix.net"
        } else if (appReg.includes("stage1-test")) {
          _appRegion = ".stage1-test."+a[2]+".bluemix.net"
        }else if (appReg.includes("stage1")) {
          _appRegion = ".stage1."+a[2]+".bluemix.net"
        }else if (appReg.includes("ng")) {
          _appRegion = ".ng.bluemix.net"
        }else if (appReg.includes("eu-gb")) {
          _appRegion = ".eu-gb.bluemix.net"
        }else if (appReg.includes("au-syd")) {
          _appRegion = ".au-syd.bluemix.net"
        }
      }

      String.prototype.hashCode = function() {
        var hash = 0, i, chr, len;
        if (this.length === 0) return hash;
        for (i = 0, len = this.length; i < len; i++) {
          chr   = this.charCodeAt(i);
          hash  = ((hash << 5) - hash) + chr;
          hash |= 0; // Convert to 32bit integer
        }
        return hash;
      };
      function generateUUID (token){

        var dateTime = new Date().getTime();
        if(window.performance && typeof window.performance.now === "function"){
          dateTime += performance.now(); //use high-precision timer if available
        }

        var hostname = window.location.hostname
        var arrayData = [];
        arrayData.push(String(dateTime).hashCode())
        arrayData.push(String(token).hashCode())
        arrayData.push(String(hostname).hashCode())
        arrayData.push(String(_platform).hashCode())

        var finalString = arrayData.join("").replace(/[-.]/g , '').replace(/[,.]/g , '')
        var uuid = "";
        for( var i=0; i < 32; i++ ){
          uuid += finalString.charAt(Math.floor(Math.random() * finalString.length));
        }
        if(_isExtension){
          chrome.storage.local.set({'deviceId':uuid})
        }else{
          localStorage.setItem("deviceId", uuid);
        }
        _deviceId = uuid;
        return _deviceId;
      }

      function validateInput(stringValue) {
        return (stringValue === undefined) || (stringValue == null) || (stringValue.length <= 0) || (stringValue == '') ? false:true;
      }

      function printLog (Result,data){
        if (isDebugEnabled == true) {
          var resultString = Result ? Result : " ";
          var additionalData = data ? data : "";
          console.log("Response : ",resultString," ",additionalData);
        }
      }
    }

    var BMSPushBackground = {
      init:function () {},
      onMessageReceived: function(message) {
        var messageString = JSON.stringify(message, null, 4);
        BMSPushBackground.printLogExt("Notification Received:" + messageString);
        var msgtitle = message.data.title ? message.data.title : chrome.runtime.getManifest().name;
        var mshIconUrl = message.data.iconUrl;
        if (message.data.iconUrl == null) {
          var icons = chrome.runtime.getManifest().icons;
          mshIconUrl = icons["128"];
          if (mshIconUrl == null) {
            mshIconUrl = icons["48"];
            if (mshIconUrl == null){
              mshIconUrl = icons["16"];
            }
          }
        }
        var messageUrl =  message.data.url ? message.data.url : ""
        chrome.storage.local.set({'messageUrl':messageUrl})
        var notification = {
          title: msgtitle,
          iconUrl: mshIconUrl,
          type: 'basic',
          message: message.data.alert
        };
        chrome.notifications.create(BMSPushBackground.getNotificationId(), notification, function(){});
      },
      getNotificationId:function() {
        var id = Math.floor(Math.random() * 9007199254740992) + 1;
        return id.toString();
      },

      notificationOpened:function(notifiationId) {
        chrome.notifications.clear(notifiationId, function(){});
        chrome.storage.local.get('messageUrl', function (result) {
          var openUrl = result.url? result.url : "";
          var urlObject = {url: openUrl};
          if (chrome.browser){
            chrome.browser.openTab(urlObject);
          }
          else{
            chrome.tabs.create(urlObject);
          }
          return true;
        });
      },

      notification_onClicked:function(notifiationId) {
        BMSPushBackground.printLogExt("Closing Notification with Id :",notifiationId);
        BMSPushBackground.notificationOpened(notifiationId);
      },

      notifiation_buttonClicked:function(notifiationId, buttonIndex) {
        BMSPushBackground.printLogExt("Clicked notifications button with index: ",buttonIndex);
        BMSPushBackground.notificationOpened(notifiationId);
      },
      printLogExt:function (Result,data){
        if (isDebugEnabled) {
          var resultString = Result ? Result : " ";
          var additionalData = data ? data : "";
          console.log("Response : ",resultString," ",additionalData);
        }
      }
    };
