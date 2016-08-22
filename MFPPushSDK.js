/*
    Copyright 2016 IBM Corp.
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
window.console = window.console || {};
window.console.log = this.console.log || function() {};

/*
The variables for SDK to work. Need to be figured out how to set them globally
*/
var _appId = "";
var _pushClientSecret = "";
var _appRegion = "";
var _devId = "";
var _userId = "";
var isPushInitialized = false;
var isDebug = true; /* Enable for debuging*/
var _isUserIdEnabled = false;
var reWriteDomain = "";
var MFPPushResponse = {};

function MFPPush(){
  /**
  * Initialize the Push
  *
  * @param appGUID - The push service App Id value
  * @param appRegion - The region of the push service you hosted. Eg: .ng.bluemix.net, .eu-gb.bluemix.net or .au-syd.bluemix.net
  * @param clientSecret - The push service client secret value -- optional
  */
  this.initialize = function(params, callback ) {
    printResults("started initialize");
    _appId = params.appGUID ? params.appGUID : "";
    _appRegion = params.appRegion ? params.appRegion : "";
    _pushClientSecret = params.clientSecret ? params.clientSecret : "";
    if (validateInput(_appId) && validateInput(_appRegion)) {
      setRewriteDomain(_appRegion);
      if (validateInput(_pushClientSecret)) {
        printResults("provided a valid client Secret")
      }
      if (localStorage.getItem("deviceId") == "" || localStorage.getItem("deviceId") == null) {
        _devId = generateUUID();
        localStorage.setItem("deviceId",_devId);
      }else {
        _devId = localStorage.getItem("deviceId");
      }
      checkNotificationsupport(initializePush,callback);
    } else {
      printResults("Please provide a valid  appGUID or/and appRegion");
      MFPPushResponseSet("Please provide a valid  appGUID or/and appRegion",404,"Error")
      callback (MFPPushResponse);
    }
  };

  /**
  * Registers the device on to the IMFPush Notification Server
  *
  * @param userId: the User ID value. -- optional
  */
  this.register = function (userId, callbackM){
    registerPush(userId,callbackM)
  };

  /**
  * Unregisters the device from the IMFPush Notification Server
  *
  */
  this.unRegisterDevice = function(callbackM){
    printResults("started Un-registration");
    navigator.serviceWorker.ready.then(function(reg) {
      reg.pushManager.getSubscription().then(
        function(subscription) {

          setTimeout(function() {
            // We have a subcription, so call unsubscribe on it
            subscription.unsubscribe().then(function(successful) {
              printResults('Successfully unRegistered from GCM push notification');
              printResults('Start Unregistering from the Bluemix Push')
              callback (unRegisterDevice(callbackM));
            }).catch(function(e) {
              // We failed to unsubscribe, this can lead to
              // an unusual state, so may be best to remove
              // the subscription id from your data store and
              // inform the user that you disabled push
              printResults('Unsubscription error: ', e);
              callback("Error in Unregistration")
              MFPPushResponseSet("Insufficient Scope. Error in Unregistration",403,"Error")
              callbackM(MFPPushResponse)
            })
          },3000);
        }).catch(function(e) {
          printResults('Error thrown while unsubscribing from push messaging :', e);
          callback("Error in Unregistration")
          var error = "Error thrown while unsubscribing from push messaging :"+e;
          MFPPushResponseSet(error,403,"Error");
          callbackM(MFPPushResponse)
        });
      });
    };

    /**
    * Subscribes to a particular backend mobile application Tag(s)
    *
    * @param tags - The Tag array to subscribe to. Eg; ["tag1","tag2"]
    */
    this.subscribe = function(tagArray,callbackM){

      printResults("started Subscribing tags");
      if (tagArray.length > 0) {
        callback(subscribeTags(tagArray,callbackM));
      } else {
        printResults("Error.  Tag array cannot be null. Create tags in your Bluemix App");
        MFPPushResponseSet("Error.  Tag array cannot be null. Create tags in your Bluemix App",403,"Error");
        callbackM(MFPPushResponse)
      }
    };

    /**
    * Unsubscribes from an backend mobile application Tag(s)
    *
    * @param  tags - The Tag name array to unsubscribe from. Eg: ["tag1","tag2"]
    */
    this.unSubscribe = function(tagArray,callbackM){
      printResults("started UnSubscribing tags");
      if (tagArray.length > 0) {
        callback(unSubscribeTags(tagArray,callbackM));
      } else {
        printResults("Error.  Tag array cannot be null.");
        MFPPushResponseSet("Error.  Tag array cannot be null.",403,"Error");
        callbackM(MFPPushResponse)
      }
    };

    /**
    * Gets the Tags that are subscribed by the device
    *
    */
    this.retrieveSubscriptions = function(callbackM){
      printResults("Started retrieve Subscription tags");
      callback(retrieveTagsSubscriptions(callbackM));
    };

    /**
    * Gets all the available Tags for the backend mobile application
    *
    */
    this.retrieveAvailableTags = function(callbackM){
      printResults("started retrieve available tags");
      callback(retrieveTagsAvailable(callbackM));
    };
    var MFPPushResponseSet = function(response, statusCode, error) {

      MFPPushResponse.response = response;
      MFPPushResponse.error = error;
      MFPPushResponse.statusCode = statusCode;
    }

    this.pushResponse = function(){
      return MFPPushResponse;
    };
    this.isDebugEnable = function(value) {
      if(typeof(value) === "boolean"){
        isDebug = value;
      }
    };

    /*
    Internal functions start here..
    */

    function registerPush(userId,callbackM) {
      if (validateInput(userId)) {
        printResults("set userId registration")
        _isUserIdEnabled = true;
        _userId = userId;
      }
      printResults("started registration");
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
                  printResults('Permission for Notifications was denied');
                  MFPPushResponseSet("Notifications aren\'t supported on service workers.",401,"Error");
                } else {
                  // A problem occurred with the subscription, this can
                  // often be down to an issue or lack of the gcm_sender_id
                  // and / or gcm_user_visible_only
                  console.log('Unable to subscribe to push.', error);
                  MFPPushResponseSet("Notifications aren\'t supported on service workers.",401,"Error");
                }
                callback("Error in registration")
                callbackM(MFPPushResponse)
              });
            }
          }).catch(function(e) {
            console.log('Error thrown while subscribing from ' +
            'push messaging.', e);
            MFPPushResponseSet(e,401,"Error");
            callbackM(MFPPushResponse)
          });
        });
      }
    function update () {

      function callback(response) {
        console.log("updation is done :", response);
      }
      registerPush(_userId, callback);
    }
    function initializePush(value, callbackM) {
      if (value === true) {
        MFPPushResponseSet("Successfully initialized Push",200, "")
        printResults("Successfully Initialized")
        isPushInitialized = true;
        callbackM(MFPPushResponse)
      } else {
        printResults("Error in Initializing push");
        isPushInitialized = false;
        callbackM(MFPPushResponse)
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

    function checkNotificationsupport(initializePushM,callbackM) {
      printResults("Started checking the notification compatibility");
      if ('serviceWorker' in navigator) {
        if(navigator.userAgent.indexOf("Firefox") != -1 )
        {
          sendMessage("Set Update Port")
        }
        navigator.serviceWorker.register('MFPPushServiceWorker.js').then(function(reg) {
          if(reg.installing) {
            printResults('Service worker installing');
          } else if(reg.waiting) {
            printResults('Service worker installed');
          } else if(reg.active) {
            printResults('Service worker active');
          }
          if (!(reg.showNotification)) {
            printResults('Notifications aren\'t supported on service workers.');
            callback("Error in initialize. Notifications aren\'t supported on service workers.")
            MFPPushResponseSet("Notifications aren\'t supported on service workers.",401,"Error");
            initializePushM(false,callbackM);
          }

          // Check the current Notification permission.
          // If its denied, it's a permanent block until the
          // user changes the permission
          if (Notification.permission === 'denied') {
            printResults('The user has blocked notifications.');
            //return false;
            callback("Error in initialize. The user has blocked notifications.")
            MFPPushResponseSet("The user has blocked notifications",401,"Error");
            initializePushM(false,callbackM);
          }

          // Check if push messaging is supported
          if (!('PushManager' in window)) {
            printResults('Push messaging isn\'t supported.');
            callback("Error in registration. Push messaging isn\'t supported.")
            MFPPushResponseSet("Push messaging isn\'t supported.",401,"Error")
            initializePushMcallback(false,callbackM);
          }
          initializePushM(true,callbackM);
        })
      }else {
        printResults('Service workers aren\'t supported in this browser.');
        callback("Service workers aren\'t supported in this browser.")
        MFPPushResponseSet("Service workers aren\'t supported in this browser.",401,"Error")
        initializePushM(false,callbackM);
      }
    }

    function callback (response){
      printResults("Response from Bluemix Push Notification Service");
      printResults(response);
    }

    /*Get subscription details*/

    function registerUsingToken(subscription, callbackM) {

      // Update status to subscribe current user on server, and to let
      // other users know this user has subscribed
      printResults('Subscription data is : ', JSON.stringify(subscription));
      printResults('endpoint:', subscription.endpoint);
      var subscriptionStr = JSON.stringify(subscription).replace(/"/g,"\\\"");
      printResults('subscription as string: ', subscriptionStr);
      _devId = localStorage.getItem("deviceId");
      localStorage.setItem("token",subscription);

      var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
      var key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
      var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
      var authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';

      var token = {
        "endpoint": subscription.endpoint,
        "userPublicKey": key,
        "userAuth": authSecret,
      }
      var platform = ""
      if(navigator.userAgent.indexOf("Firefox") != -1 ){
          
           platform = "WEB_FIREFOX"
        
        } else if(navigator.userAgent.indexOf("Chrome") != -1 ){

          platform = "WEB_CHROME"

        }
      if (_isUserIdEnabled == true){
        var device = {
          "deviceId": _devId,
          "token": JSON.stringify(token),
          "platform": platform,
          "userAgent":navigator.userAgent,
          "userId":_userId
        };
        callback(registerDeviceWithUserId(device,callbackM));
      } else{
        var device = {
          "deviceId": _devId,
          "token": JSON.stringify(token),
          "platform": platform,
          "userAgent":navigator.userAgent
        };
        callback(registerDevice(device, callbackM));
      }

    }
    /* Register Device without userId*/
    function registerDevice(device,callbackM) {

      printResults("Got device details without userid:", device);
      printResults("Checking the previous registration :", device);
      var devId = device.deviceId;
      get("/devices/"+devId,function ( res ) {

        printResults('previous Device Registration Result :', res);
        status = res.status ;
        if(status == 404){
          printResults('Starting New Device Registration  without userid:');
          post("/devices", function ( res ) {
            status = res.status ;

            printResults('New Device Registration without userid: Result :', res);
            if (status == 201) {
              printResults("Successfully registered device");
              printResults("The response is ,",res);
              MFPPushResponseSet(res,201,"");
              callbackM(MFPPushResponse)
            } else{
              printResults("Error in registering device");
              printResults("The response is ,",res);
              MFPPushResponseSet(res,status,"Error in registering device");
              callbackM(MFPPushResponse)
            }
            return res;
          },device,null);
        }else if ((status == 406) || (status == 500)) {
          printResults("Error while verifying previuos device registration without userid:");
          printResults("The response is ,",res);
          MFPPushResponseSet(res,status,"Error while verifying previuos device registration");
          callbackM(MFPPushResponse)
          return res;
        } else  {

          var resp = JSON.parse(res.responseText);
          var rToken = resp.token;
          var rDevId = resp.deviceId;
          if ( !(rToken === device.token) ||  !(rDevId === device.deviceId)){
            put("/devices/"+devId, function ( res ) {

              status = res.status;
              if (status == 201) {
                printResults("Successfully registered device without userid:");
                printResults("The response is ,",res);
                MFPPushResponseSet(res,201,"");
                callbackM(MFPPushResponse)
              } else{
                printResults("Error in registering device without userid:");
                printResults("The response is ,",res);
                MFPPushResponseSet(res,status,"Error in registering device");
                callbackM(MFPPushResponse)
              }
              return res;
            },device,null);
          } else{
            printResults("Device is already registered and device registration parameters not changed. without userid:");
            MFPPushResponseSet(res,201,"");
            callbackM(MFPPushResponse)
            return res;
          }
        }
      }, device,null);
    }

    /* Register Device with userId*/

    function registerDeviceWithUserId(device,callbackM) {

      printResults("Got device details with userid:", device);
      printResults("Checking the previous registration :", device);
      var devId = device.deviceId;
      _userId = device.userId;
      if (validateInput(_pushClientSecret) && validateInput(_userId)) {
        get("/devices/"+devId,function ( res ) {
          printResults('previous Device Registration Result :', res);
          status = res.status ;
          if(status == 404){
            printResults('Starting New Device Registration ');
            post("/devices", function ( res ) {

              status = res.status ;

              printResults('New Device Registration Result :', res);
              if (status == 201) {
                printResults("Successfully registered device");
                printResults("The response is ,",res);
                MFPPushResponseSet(res.responseText,201,"");
                callbackM(MFPPushResponse)
              } else{
                printResults("Erron in registering device");
                printResults("The response is ,",res);
                MFPPushResponseSet(res.responseText,status,"Error in registering device");
                callbackM(MFPPushResponse)
              }
              return res;
            },device,{
              "clientSecret": _pushClientSecret
            });
          }else if ((status == 406) || (status == 500)) {
            printResults("The response is ,",res);
            MFPPushResponseSet(res.responseText,status,"Error while verifying previuos device registration");
            callbackM(MFPPushResponse)
            return res;
          } else  {

            var resp = JSON.parse(res.responseText);
            var rToken = resp.token;
            var rDevId = resp.deviceId;
            var userId = resp.userId;
            if ( !(rToken === device.token) ||  !(rDevId === device.deviceId) || !(userId == _userId)){
              put("/devices/"+devId, function ( res ) {
                status = res.status;
                if (status == 201) {
                  printResults("The response is ,",res);
                  MFPPushResponseSet(res.responseText,201,"");
                  callbackM(MFPPushResponse)
                } else{
                  printResults("The response is ,",res);
                  MFPPushResponseSet(res.responseText,status,"Error in registering device");
                  callbackM(MFPPushResponse)
                }
                return res;
              },device,{
                "clientSecret": _pushClientSecret
              });
            } else{
              printResults("Device is already registered and device registration parameters not changed.");
              MFPPushResponseSet(res.responseText,201,"");
              callbackM(MFPPushResponse)
              return res;
            }
          }
        }, device,{
          "clientSecret": _pushClientSecret
        });
      } else {
        printResults("Please provide valid userId and clientSecret.")
        MFPPushResponseSet("Please provide valid userId and clientSecret.",401,"Error")
        callbackM(MFPPushResponse)
      }
    }

    function unRegisterDevice (callbackM){
      printResults("Entering the unregister device");
      var devId = localStorage.getItem("deviceId");
      deletes("/devices"+devId, function ( response ) {

        status = response.status;
        if (status == 204) {
          printResults("Successfully unregistered the device");
          MFPPushResponseSet(response.responseText,204,"");
          localStorage.setItem("deviceId","");
          callbackM(MFPPushResponse)
          return response;
        } else{
          printResults("Error in  unregistering the device");
          MFPPushResponseSet(response.responseText,status,"Error")
          callbackM(MFPPushResponse)
          return response;
        }
      },null);
    }

    function subscribeTags(tagArray,callbackM) {
      printResults("Entering the subscribe tags");
      var devId = localStorage.getItem("deviceId");
      var tags = {
        "deviceId": devId,
        "tagNames": tagArray
      };
      post("/subscriptions", function ( res ) {
        status = res.status ;
        printResults('Tag Subscription Result :', res);
        if (status >= 200 && status <= 300)  {
          printResults("Successfully subscribed to tags -");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"");
          callbackM(MFPPushResponse)
        } else{
          printResults("Error while subscribing to tags :");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"Error while subscribing to tags :");
          callbackM(MFPPushResponse)
        }
        return res;
      },tags,null);
    }

    function unSubscribeTags(tagArray,callbackM) {
      printResults("Entering the Un-subscribe tags");
      var devId = localStorage.getItem("deviceId");
      var tags = {
        "deviceId": devId,
        "tagNames": tagArray
      };
      post("/subscriptions?action=delete", function ( res ) {
        status = res.status ;
        printResults('Tag un-subscription Result :', res);
        if (status >= 200 && status <= 300)  {
          printResults("Successfully Un-subscribed to tags -");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"");
          callbackM(MFPPushResponse)
        } else{
          printResults("Error while Un-subscribing to tags :");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"Error while Un-subscribing to tags :");
          callbackM(MFPPushResponse)
        }
        return res;
      },tags,null);
    }

    function retrieveTagsSubscriptions(callbackM) {
      printResults("Entering the Retrieve subscriptions of tags");
      var devId = localStorage.getItem("deviceId");

      get("/subscriptions?deviceId="+devId,function ( res ) {
        status = res.status ;
        printResults('Retrieve subscription Result :', res);
        if (status >= 200 && status <= 300)  {
          printResults("Successfully retrieved subscribed tags");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"");
          callbackM(MFPPushResponse)
        } else{
          printResults("Error while retrieve subscribed tags :");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"Error while retrieve subscribed tags :");
          callbackM(MFPPushResponse)
        }
        return res;
      },null);
    }

    function retrieveTagsAvailable(callbackM) {
      printResults("Entering the Retrieve available tags");
      printResults("Entering the Retrieve subscriptions of tags");
      get("/tags",function ( res ) {
        status = res.status ;
        printResults('Retrieve available tags Result :', res);
        if (status >= 200 && status <= 300)  {
          printResults("Successfully retrieved available tags");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"");
          callbackM(MFPPushResponse)
        } else{
          printResults("Error while retrieve available tags :");
          printResults("The response is ,",res);
          MFPPushResponseSet(res.responseText,status,"Error while retrieve available tags :");
          callbackM(MFPPushResponse)
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
      // _appRegion = localStorage.getItem("appRegion");
      // _appId = localStorage.getItem("appId");

      //var url = 'https://imfpush'+_appRegion+'/imfpush/v1/apps/'+_appId;
      var url = 'https://imfpush'+_appRegion+'/imfpush/v1/apps/'+_appId;
      var xmlHttp = new XMLHttpRequest();
      xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 )
        callback(xmlHttp);
      }
      xmlHttp.open(method, url+action, true); // true for asynchronous
      xmlHttp.setRequestHeader('Content-Type', 'application/json; charset = UTF-8');
      //  xmlHttp.setRequestHeader('X-Rewrite-Domain',"stage1-dev.ng.bluemix.net");
      if (headers) {
        for ( key in Object.keys(headers)) {
          xmlHttp.setRequestHeader(key, headers[key]);
        }
      }
      xmlHttp.send(JSON.stringify(data));
    }

    function setRewriteDomain(appReg) {
      var a = appReg.split(".");
      if(appReg.includes("stage1-dev")){
        _appRegion = ".stage1-dev."+a[1]+".bluemix.net"
        reWriteDomain = "stage1-dev."+a[1]+".bluemix.net"
      } else if (appReg.includes("stage1-test")) {
        _appRegion = ".stage1."+a[1]+".bluemix.net"
        reWriteDomain = "stage1-test."+a[1]+".bluemix.net"
      }else if (appReg.includes("stage1")) {
        _appRegion = ".stage1."+a[1]+".bluemix.net"
        reWriteDomain = "stage1."+a[1]+".bluemix.net"
      }else if (appReg.includes("ng")) {
        _appRegion = ".ng.bluemix.net"
        reWriteDomain = "ng."+a[1]+".bluemix.net"
      }else if (appReg.includes("eu-gb")) {
        _appRegion = ".eu-gb.bluemix.net"
        reWriteDomain = "eu-gb."+a[1]+".bluemix.net"
      }else if (appReg.includes("au-syd")) {
        _appRegion = ".au-syd.bluemix.net"
        reWriteDomain = "au-syd."+a[1]+".bluemix.net"
      }
    }
    function generateUUID (){
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    }

    function validateInput(stringValue) {

      return ((stringValue === undefined) || (stringValue == null) || (stringValue.length <= 0) || (stringValue == '')) ? false:true;
    }

    function printResults (Result,a){
      if (isDebug == true) {
        console.log("Response : ",Result," ",a);
      }
    }

  }
  if (typeof window.sdkAsyncInit === "function") {
    sdkAsyncInit();
  }
