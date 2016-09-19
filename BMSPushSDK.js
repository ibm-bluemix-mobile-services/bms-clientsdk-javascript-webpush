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
var _BMSPushappId = "";
var _BMSPushClientSecret = "";
var _BMSPushAppRegion = "";
var _BMSPushDevId = "";
var _BMSPushUserId = "";
var isBMSPushInitialized = false;
var isBMSPushDebug = true; /* Enable for debuging*/
var _isBMSPushUserIdEnabled = false;
var BMSPushResponse = {};
var _BMSPushPlatform = "";

function BMSPush(){
  /**
  * Initialize the Push
  *
  * @param appGUID - The push service App Id value
  * @param appRegion - The region of the push service you hosted. Eg: .ng.bluemix.net, .eu-gb.bluemix.net or .au-syd.bluemix.net
  * @param clientSecret - The push service client secret value -- optional
  */
  this.initialize = function(params, callback ) {
    printResults("started initialize");
    _BMSPushappId = params.appGUID ? params.appGUID : "";
    _BMSPushAppRegion = params.appRegion ? params.appRegion : "";
    _BMSPushClientSecret = params.clientSecret ? params.clientSecret : "";
    if (validateInput(_BMSPushappId) && validateInput(_BMSPushAppRegion)) {
      setRewriteDomain(_BMSPushAppRegion);
      if (validateInput(_BMSPushClientSecret)) {
        printResults("provided a valid client Secret")
      }
      checkNotificationsupport(initializePush,callback);
    } else {
      printResults("Please provide a valid  appGUID or/and appRegion");
      BMSPushResponseSet("Please provide a valid  appGUID or/and appRegion",404,"Error")
      callback (PushResponse);
    }
  };

  /**
  * Registers the device on to the BMSPush Notification Server
  *
  */
  this.register = function (callbackM){
    _BMSPushUserId = "";
    registerPush(_BMSPushUserId,callbackM)
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
    printResults("started Un-registration");
    navigator.serviceWorker.ready.then(function(bmsPushSWReg) {
      bmsPushSWReg.pushManager.getSubscription().then(
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
              BMSPushResponseSet("Insufficient Scope. Error in Unregistration",403,"Error")
              callbackM(BMSPushResponse)
            })
          },3000);
        }).catch(function(e) {
          printResults('Error thrown while unsubscribing from push messaging :', e);
          callback("Error in Unregistration")
          var error = "Error thrown while unsubscribing from push messaging :"+e;
          BMSPushResponseSet(error,403,"Error");
          callbackM(BMSPushResponse)
        });
      });
    };

    /**
    * Subscribes to a particular backend mobile application Tag(s)
    *
    * @param tags - The Tag array to subscribe to. Eg; ["tag1","tag2"]
    */
    this.subscribe = function(bmsPushTagArray,callbackM){

      printResults("started Subscribing tags");
      if (bmsPushTagArray.length > 0) {
        callback(subscribeTags(bmsPushTagArray,callbackM));
      } else {
        printResults("Error.  Tag array cannot be null. Create tags in your Bluemix App");
        BMSPushResponseSet("Error.  Tag array cannot be null. Create tags in your Bluemix App",403,"Error");
        callbackM(BMSPushResponse)
      }
    };

    /**
    * Unsubscribes from an backend mobile application Tag(s)
    *
    * @param  tags - The Tag name array to unsubscribe from. Eg: ["tag1","tag2"]
    */
    this.unSubscribe = function(bmsPushTagArray,callbackM){
      printResults("started UnSubscribing tags");
      if (bmsPushTagArray.length > 0) {
        callback(unSubscribeTags(bmsPushTagArray,callbackM));
      } else {
        printResults("Error.  Tag array cannot be null.");
        BMSPushResponseSet("Error.  Tag array cannot be null.",403,"Error");
        callbackM(BMSPushResponse)
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
    var BMSPushResponseSet = function(response, statusCode, error) {

      BMSPushResponse.response = response;
      BMSPushResponse.error = error;
      BMSPushResponse.statusCode = statusCode;
    }

    this.pushResponse = function(){
      return BMSPushResponse;
    };
    this.isBMSPushDebugEnable = function(value) {
      if(typeof(value) === "boolean"){
        isBMSPushDebug = value;
      }
    };

    /*
    Internal functions start here..
    */

    function registerPush(userId,callbackM) {
      if (validateInput(userId)) {
        printResults("set userId registration")
        _isBMSPushUserIdEnabled = true;
        _BMSPushUserId = userId;
      }
      printResults("started registration");
      navigator.serviceWorker.ready.then(function(bmsPushSWReg) {
        bmsPushSWReg.pushManager.getSubscription().then(
          function(subscription) {
            if (subscription) {
              registerUsingToken(subscription,callbackM);
            } else {
              bmsPushSWReg.pushManager.subscribe({
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
                  BMSPushResponseSet("Notifications aren\'t supported on service workers.",401,"Error");
                } else {
                  // A problem occurred with the subscription, this can
                  // often be down to an issue or lack of the gcm_sender_id
                  // and / or gcm_user_visible_only
                  printResults('Unable to subscribe to push.', error);
                  BMSPushResponseSet("Notifications aren\'t supported on service workers.",401,"Error");
                }
                callback("Error in registration")
                callbackM(BMSPushResponse)
              });
            }
          }).catch(function(e) {
            printResults('Error thrown while subscribing from ' +
            'push messaging.', e);
            BMSPushResponseSet(e,401,"Error");
            callbackM(BMSPushResponse)
          });
        });
      }
      function update () {

        function callback(response) {
          printResults("updation is done :", response);
        }
        registerPush(_BMSPushUserId, callback);
      }
      function initializePush(value, callbackM) {
        if (value === true) {
          BMSPushResponseSet("Successfully initialized Push",200, "")
          printResults("Successfully Initialized")
          isBMSPushInitialized = true;
          callbackM(BMSPushResponse)
        } else {
          printResults("Error in Initializing push");
          isBMSPushInitialized = false;
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

      function checkNotificationsupport(initializePushM,callbackM) {
        printResults("Started checking the notification compatibility");
        if ('serviceWorker' in navigator) {
          if(navigator.userAgent.indexOf("Firefox") != -1 )
          {
            sendMessage("Set Update Port")
          }
          navigator.serviceWorker.register('BMSPushServiceWorker.js').then(function(bmsPushSWReg) {
            if(bmsPushSWReg.installing) {
              printResults('Service worker installing');
            } else if(bmsPushSWReg.waiting) {
              printResults('Service worker installed');
            } else if(bmsPushSWReg.active) {
              printResults('Service worker active');
            }
            if (!(bmsPushSWReg.showNotification)) {
              printResults('Notifications aren\'t supported on service workers.');
              callback("Error in initialize. Notifications aren\'t supported on service workers.")
              BMSPushResponseSet("Notifications aren\'t supported on service workers.",401,"Error");
              initializePushM(false,callbackM);
            }

            // Check the current Notification permission.
            // If its denied, it's a permanent block until the
            // user changes the permission
            if (Notification.permission === 'denied') {
              printResults('The user has blocked notifications.');
              //return false;
              callback("Error in initialize. The user has blocked notifications.")
              BMSPushResponseSet("The user has blocked notifications",401,"Error");
              initializePushM(false,callbackM);
            }

            // Check if push messaging is supported
            if (!('PushManager' in window)) {
              printResults('Push messaging isn\'t supported.');
              callback("Error in registration. Push messaging isn\'t supported.")
              BMSPushResponseSet("Push messaging isn\'t supported.",401,"Error")
              initializePushMcallback(false,callbackM);
            }
            initializePushM(true,callbackM);
          })
        }else {
          printResults('Service workers aren\'t supported in this browser.');
          callback("Service workers aren\'t supported in this browser.")
          BMSPushResponseSet("Service workers aren\'t supported in this browser.",401,"Error")
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

        _BMSPushDevId = bmsPushgenerateUUID(subscription);
        localStorage.setItem("token",subscription);

        var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
        var key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
        var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
        var authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';

        var bmsPushToken = {
          "endpoint": subscription.endpoint,
          "userPublicKey": key,
          "userAuth": authSecret,
        }

        if (_isBMSPushUserIdEnabled == true){
          var device = {
            "deviceId": _BMSPushDevId,
            "token": JSON.stringify(bmsPushToken),
            "platform": _BMSPushPlatform,
            "userId":_BMSPushUserId
          };
          callback(registerDeviceWithUserId(device,callbackM));
        } else{
          var device = {
            "deviceId": _BMSPushDevId,
            "token": JSON.stringify(bmsPushToken),
            "platform": _BMSPushPlatform
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
          var BMSPushResponseStatus = res.status ;
          if(BMSPushResponseStatus == 404){
            printResults('Starting New Device Registration  without userid:');
            post("/devices", function ( res ) {
              BMSPushResponseStatus = res.status ;

              printResults('New Device Registration without userid: Result :', res);
              if (BMSPushResponseStatus == 201) {
                printResults("Successfully registered device");
                printResults("The response is ,",res);
                BMSPushResponseSet(res,201,"");
                callbackM(BMSPushResponse)
              } else{
                printResults("Error in registering device");
                printResults("The response is ,",res);
                BMSPushResponseSet(res,BMSPushResponseStatus,"Error in registering device");
                callbackM(BMSPushResponse)
              }
              return res;
            },device,null);
          }else if ((BMSPushResponseStatus == 406) || (BMSPushResponseStatus == 500)) {
            printResults("Error while verifying previuos device registration without userid:");
            printResults("The response is ,",res);
            BMSPushResponseSet(res,BMSPushResponseStatus,"Error while verifying previuos device registration");
            callbackM(BMSPushResponse)
            return res;
          } else  {

            var resp = JSON.parse(res.responseText);
            var rToken = resp.token;
            var rDevId = resp.deviceId;
            if ( !(rToken === device.token) ||  !(rDevId === device.deviceId)){
              put("/devices/"+devId, function ( res ) {

                var BMSPushResponseStatus = res.status;
                if (BMSPushResponseStatus == 201) {
                  printResults("Successfully registered device without userid:");
                  printResults("The response is ,",res);
                  BMSPushResponseSet(res,201,"");
                  callbackM(BMSPushResponse)
                } else{
                  printResults("Error in registering device without userid:");
                  printResults("The response is ,",res);
                  BMSPushResponseSet(res,BMSPushResponseStatus,"Error in registering device");
                  callbackM(BMSPushResponse)
                }
                return res;
              },device,null);
            } else{
              printResults("Device is already registered and device registration parameters not changed. without userid:");
              BMSPushResponseSet(res,201,"");
              callbackM(BMSPushResponse)
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
        _BMSPushUserId = device.userId;
        if (validateInput(_BMSPushClientSecret) && validateInput(_BMSPushUserId)) {
          get("/devices/"+devId,function ( res ) {
            printResults('previous Device Registration Result :', res);
            var BMSPushResponseStatus = res.status ;
            if(BMSPushResponseStatus == 404){
              printResults('Starting New Device Registration ');
              post("/devices", function ( res ) {

                BMSPushResponseStatus = res.status ;

                printResults('New Device Registration Result :', res);
                if (BMSPushResponseStatus == 201) {
                  printResults("Successfully registered device");
                  printResults("The response is ,",res);
                  BMSPushResponseSet(res.responseText,201,"");
                  callbackM(BMSPushResponse)
                } else{
                  printResults("Erron in registering device");
                  printResults("The response is ,",res);
                  BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"Error in registering device");
                  callbackM(BMSPushResponse)
                }
                return res;
              },device,{
                "clientSecret": _BMSPushClientSecret
              });
            }else if ((BMSPushResponseStatus == 406) || (BMSPushResponseStatus == 500)) {
              printResults("The response is ,",res);
              BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"Error while verifying previuos device registration");
              callbackM(BMSPushResponse)
              return res;
            } else  {

              var resp = JSON.parse(res.responseText);
              var rToken = resp.token;
              var rDevId = resp.deviceId;
              var userId = resp.userId;
              if ( !(rToken === device.token) ||  !(rDevId === device.deviceId) || !(userId == _BMSPushUserId)){
                put("/devices/"+devId, function ( res ) {
                  var BMSPushResponseStatus = res.status;
                  if (BMSPushResponseStatus == 201) {
                    printResults("The response is ,",res);
                    BMSPushResponseSet(res.responseText,201,"");
                    callbackM(BMSPushResponse)
                  } else{
                    printResults("The response is ,",res);
                    BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"Error in registering device");
                    callbackM(BMSPushResponse)
                  }
                  return res;
                },device,{
                  "clientSecret": _BMSPushClientSecret
                });
              } else{
                printResults("Device is already registered and device registration parameters not changed.");
                BMSPushResponseSet(res.responseText,201,"");
                callbackM(BMSPushResponse)
                return res;
              }
            }
          }, device,{
            "clientSecret": _BMSPushClientSecret
          });
        } else {
          printResults("Please provide valid userId and clientSecret.")
          BMSPushResponseSet("Please provide valid userId and clientSecret.",401,"Error")
          callbackM(BMSPushResponse)
        }
      }

      function unRegisterDevice (callbackM){
        printResults("Entering the unregister device");
        var devId = localStorage.getItem("deviceId");
        deletes("/devices/"+devId, function ( response ) {

          var BMSPushResponseStatus = response.status;
          if (BMSPushResponseStatus == 204) {
            printResults("Successfully unregistered the device");
            BMSPushResponseSet(response.responseText,204,"");
            localStorage.setItem("deviceId","");
            callbackM(BMSPushResponse)
            return response;
          } else{
            printResults("Error in  unregistering the device");
            BMSPushResponseSet(response.responseText,BMSPushResponseStatus,"Error")
            callbackM(BMSPushResponse)
            return response;
          }
        },null);
      }

      function subscribeTags(bmsPushTagArray,callbackM) {
        printResults("Entering the subscribe tags");
        var devId = localStorage.getItem("deviceId");
        var tags = {
          "deviceId": devId,
          "tagNames": bmsPushTagArray
        };
        post("/subscriptions", function ( res ) {
          var BMSPushResponseStatus = res.status ;
          printResults('Tag Subscription Result :', res);
          if (BMSPushResponseStatus >= 200 && BMSPushResponseStatus <= 300)  {
            printResults("Successfully subscribed to tags -");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"");
            callbackM(BMSPushResponse)
          } else{
            printResults("Error while subscribing to tags :");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"Error while subscribing to tags :");
            callbackM(BMSPushResponse)
          }
          return res;
        },tags,null);
      }

      function unSubscribeTags(bmsPushTagArray,callbackM) {
        printResults("Entering the Un-subscribe tags");
        var devId = localStorage.getItem("deviceId");
        var tags = {
          "deviceId": devId,
          "tagNames": bmsPushTagArray
        };
        post("/subscriptions?action=delete", function ( res ) {
          var BMSPushResponseStatus = res.status ;
          printResults('Tag un-subscription Result :', res);
          if (BMSPushResponseStatus >= 200 && BMSPushResponseStatus <= 300)  {
            printResults("Successfully Un-subscribed to tags -");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"");
            callbackM(BMSPushResponse)
          } else{
            printResults("Error while Un-subscribing to tags :");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"Error while Un-subscribing to tags :");
            callbackM(BMSPushResponse)
          }
          return res;
        },tags,null);
      }

      function retrieveTagsSubscriptions(callbackM) {
        printResults("Entering the Retrieve subscriptions of tags");
        var devId = localStorage.getItem("deviceId");

        get("/subscriptions?deviceId="+devId,function ( res ) {
          var BMSPushResponseStatus = res.status ;
          printResults('Retrieve subscription Result :', res);
          if (BMSPushResponseStatus >= 200 && BMSPushResponseStatus <= 300)  {
            printResults("Successfully retrieved subscribed tags");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"");
            callbackM(BMSPushResponse)
          } else{
            printResults("Error while retrieve subscribed tags :");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"Error while retrieve subscribed tags :");
            callbackM(BMSPushResponse)
          }
          return res;
        },null);
      }

      function retrieveTagsAvailable(callbackM) {
        printResults("Entering the Retrieve available tags");
        printResults("Entering the Retrieve subscriptions of tags");
        get("/tags",function ( res ) {
          var BMSPushResponseStatus = res.status ;
          printResults('Retrieve available tags Result :', res);
          if (BMSPushResponseStatus >= 200 && BMSPushResponseStatus <= 300)  {
            printResults("Successfully retrieved available tags");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"");
            callbackM(BMSPushResponse)
          } else{
            printResults("Error while retrieve available tags :");
            printResults("The response is ,",res);
            BMSPushResponseSet(res.responseText,BMSPushResponseStatus,"Error while retrieve available tags :");
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

        var url = 'https://imfpush'+_BMSPushAppRegion+'/imfpush/v1/apps/'+_BMSPushappId;
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
          if (xmlHttp.readyState == 4 )
          callback(xmlHttp);
        }
        xmlHttp.open(method, url+action, true); // true for asynchronous
        xmlHttp.setRequestHeader('Content-Type', 'application/json; charset = UTF-8');
        if (headers) {
          for (let key of Object.keys(headers)) {
            xmlHttp.setRequestHeader(key, headers[key]);
          }
        }
        xmlHttp.send(JSON.stringify(data));
      }

      function setRewriteDomain(appReg) {
        var a = appReg.split(".");
        if(appReg.includes("stage1-dev")){
          _BMSPushAppRegion = ".stage1-dev."+a[2]+".bluemix.net"
        } else if (appReg.includes("stage1-test")) {
          _BMSPushAppRegion = ".stage1-test."+a[2]+".bluemix.net"
        }else if (appReg.includes("stage1")) {
          _BMSPushAppRegion = ".stage1."+a[2]+".bluemix.net"
        }else if (appReg.includes("ng")) {
          _BMSPushAppRegion = ".ng.bluemix.net"
        }else if (appReg.includes("eu-gb")) {
          _BMSPushAppRegion = ".eu-gb.bluemix.net"
        }else if (appReg.includes("au-syd")) {
          _BMSPushAppRegion = ".au-syd.bluemix.net"
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
      function bmsPushgenerateUUID (token){

        if(navigator.userAgent.indexOf("Firefox") != -1 ){
          _BMSPushPlatform = "WEB_FIREFOX"
        } else if(navigator.userAgent.indexOf("Chrome") != -1 ){
          _BMSPushPlatform = "WEB_CHROME"
        }

        if (localStorage.getItem("deviceId") == "" || localStorage.getItem("deviceId") == null) {
          var dateTime = new Date().getTime();
          if(window.performance && typeof window.performance.now === "function"){
            dateTime += performance.now(); //use high-precision timer if available
          }
          var hostname = window.location.hostname
          var arrayData = [];
          arrayData.push(String(dateTime).hashCode())
          arrayData.push(String(token).hashCode())
          arrayData.push(String(hostname).hashCode())
          arrayData.push(String(_BMSPushPlatform).hashCode())

          var finalString = arrayData.join("").replace(/[-.]/g , '').replace(/[,.]/g , '')
          var uuid = "";
          for( var i=0; i < 32; i++ ){
            uuid += finalString.charAt(Math.floor(Math.random() * finalString.length));
          }
          localStorage.setItem("deviceId", uuid);
          _BMSPushDevId = uuid;
          return _BMSPushDevId;
        }else {
          _BMSPushDevId = localStorage.getItem("deviceId");
          return _BMSPushDevId;
        }
      }

      function validateInput(stringValue) {
        return (stringValue === undefined) || (stringValue == null) || (stringValue.length <= 0) || (stringValue == '') ? false:true;
      }

      function printResults (Result,a){
        if (isBMSPushDebug == true) {
          if (validateInput(a) && validateInput(Result)){
            console.log("Response : ",Result," ",a);
          }
        }
      }
    }
