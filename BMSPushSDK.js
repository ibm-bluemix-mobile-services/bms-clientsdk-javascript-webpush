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
'use strict';
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
var _getMethod;
var _ibmCloudDeviceId;
var _pushVaribales;
var _pushBaseUrl;
var _pushVapID;
var _overrideServerHost;
/**
 * Push SDK class for handling the Web device requests
 * @module BMSPush
 */

function BMSPush() {

  this.REGION_US_SOUTH = "us-south";
  this.REGION_UK = "eu-gb";
  this.REGION_SYDNEY = "au-syd";
  this.REGION_GERMANY = "eu-de";
  this.REGION_US_EAST = "us-east";
  this.REGION_JP_TOK = "jp-tok";


  /**
  * Initialize the BMS Push SDK
  * @method module:BMSPush#initialize
  * @param {string} appGUID - The push service App Id value
  * @param {string} appRegion - The region of the push service you hosted. Eg: us-south , eu-gb or au-syd
  * @param {string} clientSecret - The push service client secret value.
  * @param {string} websitePushIDSafari - Optional parameter for safari push notifications only. The value should match the website Push ID provided during the server side configuration.
  * @param {string} deviceId - Optional parameter for deviceId.
  * @param {Object} callback - A callback function
  */
  this.initialize = function(params, callback) {
    printLog("Enter - initialize");

    _appId = params.appGUID ? params.appGUID : "";
    _appRegion = params.appRegion ? params.appRegion : "";
    _pushClientSecret = params.clientSecret ? params.clientSecret : "";
    _websitePushIDSafari = params.websitePushIDSafari ? params.websitePushIDSafari : "";
    _ibmCloudDeviceId = params.deviceId ? params.deviceId : "";
    _pushVaribales = params.pushVaribales ? params.pushVaribales : "";
    _pushVapID = params.applicationServerKey ? params.applicationServerKey : "";
    _overrideServerHost = params.overrideServerHost ? params.overrideServerHost : "";

    if (validateInput(_appId) && validateInput(_appRegion)) {
      getBaseUrl(_appRegion);

      if (validateInput(_pushClientSecret)) {
        printLog("User has provided a valid client secret");
      } else {
        printLog("User has not provided a valid client secret");
      }

      if (getBrowser() === CHROME_EXTENSION) {
        _isExtension = true;
        if (validateInput(_ibmCloudDeviceId)) {
          chrome.storage.local.set({
            'deviceId': _ibmCloudDeviceId
          });
        }
        if (validateInput(_pushVaribales)) {
          chrome.storage.local.set({
            'pushVaribales': _pushVaribales
          });
        }
      }else {
        if (validateInput(_ibmCloudDeviceId)) {
          localStorage.setItem("deviceId", _ibmCloudDeviceId);
        }
        if (validateInput(_pushVaribales)) {
          localStorage.setItem("pushVaribales", _pushVaribales);
        }  
      }

      if (_isExtension) {
        chrome.storage.local.get('deviceId', function(result) {
          _deviceId = result.deviceId;
          if (_deviceId == "" || _deviceId == null || _deviceId == undefined) {
            _deviceId = generateUUID();
          }
          isPushInitialized = true;
          callback(getBMSPushResponse("Successfully initialized Push", 200, ""));
        });
        chrome.storage.local.set({
          '_push_url': _pushBaseUrl + '/imfpush/v1/apps/' + _appId,
          '_pushClientSecret': _pushClientSecret
        });

      } else {
        if (!localStorage.getItem("deviceId")) {
          _deviceId = generateUUID();
        } else {
          _deviceId = localStorage.getItem("deviceId");
        }
        checkNotificationSupport().then(() => {
          isPushInitialized = true;
          callback(getBMSPushResponse("Successfully initialized Push", 200, ""));
        }).catch(error => {
          isPushInitialized = false;
          callback(error);
        });
        if (getBrowser() != SAFARI_BROWSER) {
          sendMessage(_pushVaribales);
        }
      }
    } else {
      printLog("Please provide a valid  appGUID or/and appRegion");
      setPushResponse("Please provide a valid  appGUID or/and appRegion", 404, "Error");
      callback(PushResponse);
    }
    printLog("Exit - initialize");
  };

  /**
  * Registers the device on to the BMSPush Notification Server
  * @param {Object} callback - A callback function
  * @method module:BMSPush#register 
  */
  this.register = function(callbackM) {
    _userId = "";
    registerPush(_userId, callbackM);
  };

  /**
  * Registers the device on to the BMSPush Notification Server
  *
  * @param {string} userId: the User ID value.
  * @param {Object} callback - A callback function
  * @method module:BMSPush#registerWithUserId
  */
  this.registerWithUserId = function(userId, callbackM) {
    registerPush(userId, callbackM);
  };

  /**
  * Unregisters the device from the BMSPush Notification Server
  * @param {Object} callback - A callback function
  * @method module:BMSPush#unRegisterDevice
  */
  this.unRegisterDevice = function(callbackM) {
    printLog("Enter - unRegisterDevice");

    if (getBrowser() === SAFARI_BROWSER) {
      callback(unRegisterDevice(callbackM));
    } else {
      navigator.serviceWorker.ready.then(function(reg) {

        reg.pushManager.getSubscription().then(
          function(subscription) {
            if (!subscription) {
              // We aren’t subscribed to push, so set UI
              // to allow the user to enable push
              setPushResponse("The device is not enabled for push notifications", 0, "Error");
              callbackM(BMSPushResponse);
              printLog("Exit - unRegisterDevice");
              return;
            }

            setTimeout(function() {
              // We have a subcription, so call unsubscribe on it
              subscription.unsubscribe().then(function(successful) {
                printLog('Successfully unRegistered from GCM push notification');
                callback(unRegisterDevice(callbackM));
              }).catch(function(e) {
                // We failed to unsubscribe, this can lead to
                // an unusual state, so may be best to remove
                // the subscription id from your data store and
                // inform the user that you disabled push
                printLog('Unsubscription error: ', e);
                callback("Error in Unregistration");
                setPushResponse("Insufficient Scope. Error in Unregistration", 401, "Error");
                callbackM(BMSPushResponse);
              })
            }, 3000);
          }).catch(function(e) {
            printLog('Error thrown while unsubscribing from push messaging :', e);
            callback("Error in Unregistration");
            var error = "Error thrown while unsubscribing from push messaging :" + e;
            setPushResponse(error, 401, "Error");
            callbackM(BMSPushResponse);
          });
        });
      }

      printLog("Exit - unRegisterDevice");
    };

    /**
    * Subscribes to a particular backend mobile application Tag(s)
    *
    * @param {string[]} tags - The Tag array to subscribe to. Eg; ["tag1","tag2"]
    * @param {Object} callback - A callback function
    * @method module:BMSPush#subscribe
    */
    this.subscribe = function(tagArray, callbackM) {

      printLog("Enter - Subscribing tags");
      if (!isPushInitialized) {
        setPushResponse("Initialize before using this function", 0, "Not initialized");
        callbackM(BMSPushResponse);
        printLog("Exit - Subscribing tags");
        return;
      }
      if (tagArray.length > 0) {
        callback(subscribeTags(tagArray, callbackM));
      } else {
        printLog("Error - Tag array cannot be null. Create tags in your IBM Cloud App");
        setPushResponse("Error - Tag array cannot be null. Create tags in your IBM Cloud App", 401, "Error");
        callbackM(BMSPushResponse);
      }
      printLog("Exit - Subscribing tags");
    };

    /**
    * Unsubscribes from an backend mobile application Tag(s)
    *
    * @param {string[]} tags - The Tag name array to unsubscribe from. Eg: ["tag1","tag2"]
    * @param {Object} callback - A callback function
    * @method module:BMSPush#unSubscribe
    */
    this.unSubscribe = function(tagArray, callbackM) {
      printLog("Enter - UnSubscribing tags");
      if (!isPushInitialized) {
        setPushResponse("Initialize before using this function", 0, "Not initialized");
        callbackM(BMSPushResponse);
        printLog("Exit - UnSubscribing tags");
        return;
      }

      if (tagArray.length > 0) {
        callback(unSubscribeTags(tagArray, callbackM));
      } else {
        printLog("Error - Tag array cannot be null");
        setPushResponse("Error - Tag array cannot be null", 401, "Error");
        callbackM(BMSPushResponse);
      }
      printLog("Exit - UnSubscribing tags");
    };

    /**
    * Gets the Tags that are subscribed by the device
    * @param {Object} callback - A callback function
    * @method module:BMSPush#retrieveSubscriptions
    */
    this.retrieveSubscriptions = function(callbackM) {
      printLog("Enter - retrieveSubscriptions");
      callback(retrieveTagsSubscriptions(callbackM));
      printLog("Exit - retrieveSubscriptions");
    };

    /**
    * Gets all the available Tags for the backend mobile application
    * @param {Object} callback - A callback function
    * @method module:BMSPush#retrieveAvailableTags
    */
    this.retrieveAvailableTags = function(callbackM) {
      printLog("Enter - retrieveAvailableTags");
      callback(retrieveTagsAvailable(callbackM));
      printLog("Exit - retrieveAvailableTags");
    };

    var setPushResponse = function(response, statusCode, error) {
      BMSPushResponse.response = response;
      BMSPushResponse.error = error;
      BMSPushResponse.statusCode = statusCode;
    }

    this.pushResponse = function() {
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
      if (typeof(value) === "boolean") {
        isDebugEnabled = value;
      }
    };

    /*
    Internal functions for the SDK
    */

    const CHROME_EXTENSION = 'ChromeExtension';
    const SAFARI_BROWSER = 'Safari';
    const FIREFOX_BROWSER = 'Firefox';
    const CHROME_BROWSER = 'Chrome';
    const SERVICE_WORKER = 'BMSPushServiceWorker.js';
    const PUSH_API_ENDPOINT = ".imfpush.cloud.ibm.com";
    function getBrowser() {
      if (window.navigator.userAgent.indexOf("Chrome") != -1 && chrome.runtime && chrome.runtime.getManifest) {
        return CHROME_EXTENSION;
      }
      let userAgentOfBrowser = navigator.userAgent.toLowerCase();
      if ((userAgentOfBrowser.indexOf('safari') >= 0) && (userAgentOfBrowser.indexOf('chrome') == -1)) {
        return SAFARI_BROWSER;
      } else if (userAgentOfBrowser.indexOf("firefox") != -1) {
        return FIREFOX_BROWSER;
      } else {
        return CHROME_BROWSER;
      }
    }

    function registerPush(userId, callbackM) {
      if (validateInput(userId)) {
        printLog("userId based registration with userId " + userId);
        _isUserIdEnabled = true;
        _userId = userId;
      }
      if (!_isExtension) {

        if (getBrowser() === SAFARI_BROWSER) {
          let resultSafariPermission = window.safari.pushNotification.permission(_websitePushIDSafari);
          if (resultSafariPermission.permission === "default") {
            //User never asked before for permission
            let baseUrl = _pushBaseUrl + "/imfpush/v1/apps/" + _appId + "/settings/safariWebConf";
            printLog("Request user for permission to receive notification for base URL " + baseUrl + " and websitepushID " + _websitePushIDSafari);
            window.safari.pushNotification.requestPermission(baseUrl,
              _websitePushIDSafari, {
                "deviceId": localStorage.getItem("deviceId"),
                "userId": userId
              },
              function(resultRequestPermission) {
                if (resultRequestPermission.permission === "granted") {
                  printLog("The user has granted the permission to receive notifications");
                  registerUsingToken(resultRequestPermission.deviceToken, callbackM);
                }
              });

            } else if (resultSafariPermission.permission === "denied") {
              // The user denied the notification permission which
              // means we failed to subscribe and the user will need
              // to manually change the notification permission to
              // subscribe to push messages
              printLog('Permission for Notifications was denied');
              setPushResponse("The user denied permission for Safari Push Notifications.", 401, "Error");
              callback("Error in registration");
              callbackM(BMSPushResponse);
            } else {
              //Already granted the permission
              registerUsingToken(resultSafariPermission.deviceToken, callbackM);
            }
          } else {

            var subscribeOptions = { userVisibleOnly: true};
            if (validateInput(_pushVapID) && getBrowser() === CHROME_BROWSER) {
              const convertedVapidKey = urlBase64ToUint8Array(_pushVapID);
              subscribeOptions.applicationServerKey = convertedVapidKey;
            }
            navigator.serviceWorker.ready.then(function(reg) {
              reg.pushManager.getSubscription().then(
                function(subscription) {
                  if (subscription) {
                    registerUsingToken(subscription, callbackM);
                  } else {
                    reg.pushManager.subscribe(subscribeOptions).then(function(subscription) {
                      registerUsingToken(subscription, callbackM);
                    }).catch(function(error) {
                      if (Notification.permission === 'denied') {
                        // The user denied the notification permission which
                        // means we failed to subscribe and the user will need
                        // to manually change the notification permission to
                        // subscribe to push messages
                        printLog('Permission for Notifications was denied');
                        setPushResponse("Notifications aren\'t supported on service workers.", 401, "Error");
                      } else {
                        // A problem occurred with the subscription, this can
                        // often be down to an issue or lack of the gcm_sender_id
                        // and / or gcm_user_visible_only
                        printLog('Unable to subscribe to push.', error);
                        setPushResponse("Notifications aren\'t supported on service workers.", 401, "Error");
                      }
                      callback("Error in registration");
                      callbackM(BMSPushResponse);
                    });
                  }
                }).catch(function(e) {
                  printLog('Error thrown while subscribing from ' +
                  'push messaging.', e);
                  setPushResponse(e, 401, "Error");
                  callbackM(BMSPushResponse)
                });
              });
            }


          } else {
            get("/settings/chromeAppExtConfPublic", function(res) {
              printLog('previous Device Registration Result :', res);
              var status = res.status;
              if (status == 200) {
                var json = JSON.parse(res.response);
                _gcmSenderId = json.senderId;
                var senderIds = [_gcmSenderId];
                chrome.gcm.register(senderIds, function(registrationId) {
                  if (chrome.runtime.lastError) {
                    setPushResponse(chrome.runtime.lastError, 401, "Error");
                    callbackM(MFPPushResponse);
                    return;
                  }
                  registerUsingToken(registrationId, callbackM);
                  printLog("The response is : ", registrationId);
                });
              } else {
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "Error while retrieving the Chrome App/Ext configuration");
                callbackM(BMSPushResponse);
              }
            }, null);
          }
        }

        function urlBase64ToUint8Array(base64String) {
          const padding = '='.repeat((4 - base64String.length % 4) % 4);
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
          const rawData = window.atob(base64);
          const outputArray = new Uint8Array(rawData.length);
        
          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
          }
          return outputArray;
        }

        function update() {

          function callback(response) {
            printLog("updation is done :", response);
          }
          registerPush(_userId, callback);
        }

        function getBMSPushResponse(response, statusCode, error) {
          return {
            'response': response,
            'error': error,
            'statusCode': statusCode
          };
        }

        function initializePush(value, callbackM) {
          if (value === true) {
            setPushResponse("Successfully initialized Push", 200, "");
            printLog("Successfully Initialized");
            isPushInitialized = true;
            callbackM(BMSPushResponse);
          } else {
            printLog("Error in Initializing push");
            isPushInitialized = false;
            callbackM(BMSPushResponse);
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
              }
            };
            navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
          });
        }

        function checkNotificationSupport() {
          return new Promise((resolve, reject) => {
            printLog("Started checking the notification compatibility");
            if (navigator.serviceWorker &&
              window.location.protocol === 'https:') { //Only HTTPS is supported
                navigator.serviceWorker.addEventListener('message', function(event){
                  console.log("Client 1 Received Message: " + event.data);
                  //event.ports[0].postMessage("Client 1 Says 'Hello back!'");
                  let eventData = event.data;
                  printLog("The response from the service worker is " + eventData);
                  let command = eventData.substr(0, eventData.indexOf(':'));
                  let msg = eventData.substr(eventData.indexOf(':') + 1);
                  let statusStr = '';
                  let nid = '';
                  if(command === 'msgEventOpen' ) {
                    statusStr = 'OPEN';
                    let jsonPayload =JSON.parse(msg);
                    nid = jsonPayload.nid;
                  }
                  else if(command === 'msgEventSeen') {
                    statusStr = 'SEEN';
                    let jsonMsg = JSON.parse(msg);
                    let strPayload = jsonMsg.payload;
                    let jsonPayload = JSON.parse(jsonMsg.payload);
                    nid = jsonPayload.nid;
                  }

                  if(command === 'msgEventOpen' || command === 'msgEventSeen') {
                    let statusObj = {'deviceId': _deviceId, 'status': statusStr};
                    put('/messages/' + nid, function(res) {
                      if (res.status == 200 || res.status == 201) {
                        printLog('message status is reported');
                      } else {
                        printLog('failure reporting message' + res.responseText);
                      }
                    },statusObj, null);
                  }
                  else {
                    update();
                  }
                  //update();
                });
                navigator.serviceWorker.register(SERVICE_WORKER).then(function(reg) {

                  if (reg.installing) {
                    printLog('Service worker installing');
                  } else if (reg.waiting) {
                    printLog('Service worker installed');
                  } else if (reg.active) {
                    printLog('Service worker active');
                  }

                  if (getBrowser() === SAFARI_BROWSER) {
                    resolve();
                  }

                  if (!(reg.showNotification)) {
                    printLog('Notifications aren\'t supported on service workers.');
                    reject(getBMSPushResponse("Notifications aren\'t supported on service workers.", 401, "Error"));
                  }

                  // Check the current Notification permission.
                  // If its denied, it's a permanent block until the
                  // user changes the permission
                  if (Notification.permission === 'denied') {
                    printLog('The user has blocked notifications.');
                    reject(getBMSPushResponse("The user has blocked notifications", 401, "Error"));
                  }

                  // Check if push messaging is supported
                  if (!('PushManager' in window)) {
                    printLog('Push messaging isn\'t supported.');
                    reject(getBMSPushResponse("Push messaging isn\'t supported.", 401, "Error"));
                  }
                  resolve();
                });
              } else if (getBrowser() === SAFARI_BROWSER) {
                //Service workers are not supported by Safari
                //TODO: Check for safari version
                resolve();
              } else {
                printLog('Service workers aren\'t supported in this browser.');
                reject(getBMSPushResponse("Service workers aren\'t supported in this browser.", 401, "Error"));
              }

            });
          }

          function callback(response) {
            printLog("Response from IBM Cloud Push Notification Service");
            printLog(response);
          }

          /*Get subscription details*/

          function registerUsingToken(subscription, callbackM) {

            //    	  Promise.all([localStorage.getItem("deviceId"), getTokenFromSubscription(subscription), getPlatformFromBrowser()]).
            //    	  	then(([deviceId, token, platform]) => {});
            // Update status to subscribe current user on server, and to let
            // other users know this user has subscribed
            printLog('Subscription data is : ', JSON.stringify(subscription));
            var subscriptionStr = JSON.stringify(subscription).replace(/"/g, "\\\"");

            _platform = "";
            var token;
            if (!_isExtension) {
              _deviceId = localStorage.getItem("deviceId");
              localStorage.setItem("token", subscription);
             
              if (getBrowser() === SAFARI_BROWSER) {
                _platform = "WEB_SAFARI";
                token = subscription; // This is a string value;
                printLog('The device token from safari is ' + token);
              } else {
                var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
                var key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
                var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
                var authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';

                if (!validateInput(subscription.endpoint) || !validateInput(key) || !validateInput(authSecret)) {
                  printLog("Error while getting token values");
                  callbackM(getBMSPushResponse("Error while getting token values", 500, "Error"));
                  return;
                }
                var tokenValue = {
                  "endpoint": subscription.endpoint,
                  "userPublicKey": key,
                  "userAuth": authSecret,
                };
                token = JSON.stringify(tokenValue);
              }

              if (getBrowser() === FIREFOX_BROWSER) {

                _platform = "WEB_FIREFOX";

              } else if (getBrowser() === CHROME_BROWSER) {

                _platform = "WEB_CHROME";
              }
              var device = {};
              if (_isUserIdEnabled == true) {
                if (validateInput(_pushClientSecret)) {
                  registerDevice({
                    "deviceId": _deviceId,
                    "token": token,
                    "platform": _platform,
                    "userId": _userId
                  }, callbackM);
                }else {
                  printLog("Please provide valid userId or clientSecret.");
                  callbackM(getBMSPushResponse("Please provide valid userId or clientSecret.", 401, "Error"));
                }
              } else {
                registerDevice({
                  "deviceId": _deviceId,
                  "token": token,
                  "platform": _platform
                }, callbackM);
              }

            } else {
              token = subscription;
              _platform = "APPEXT_CHROME";
              chrome.storage.local.get('deviceId', function(result) {
                _deviceId = result.deviceId;

                if (_isUserIdEnabled == true) {
                  if (validateInput(_pushClientSecret)) {
                    registerDevice({
                      "deviceId": _deviceId,
                      "token": token,
                      "platform": _platform,
                      "userId": _userId
                    }, callbackM);
                  }else {
                    printLog("Please provide valid userId or clientSecret.");
                    callbackM(getBMSPushResponse("Please provide valid userId or clientSecret.", 401, "Error"));
                  }
                } else {
                  registerDevice({
                    "deviceId": _deviceId,
                    "token": token,
                    "platform": _platform
                  }, callbackM);
                }
              });
              chrome.storage.local.set({
                'token': subscription
              })
              BMSPushBackground.init();
            }
          }


          function getDevice(deviceId) {
            printLog('Request for get device for the deviceId :' + deviceId);
            return new Promise(function(resolve, reject) {
              get("/devices/" + deviceId, function(res) {
                printLog('previous Device Registration Result :', res);
                if (res.status == 200) {
                  resolve(JSON.parse(res.responseText));
                } else {
                  reject(res);
                }
              });

            });
          }

          function updateDevice(device, put) {
            return new Promise((resolve, reject) => {
              put("/devices/" + device.deviceId, function(res) {
                if (res.status == 200 || res.status == 201) {
                  resolve(JSON.parse(res.responseText));
                } else {
                  reject(res);
                }
              }, device);
            });
          }

          function registerNewDevice(device, post) {
            return new Promise((resolve, reject) => {
              post("/devices", function(res) {
                if (res.status == 201) {
                  resolve(JSON.parse(res.responseText));
                } else {
                  reject(res);
                }
              }, device);
            });
          }

          /* Register Device with/ without userId*/

          function registerDevice(deviceJSON, callbackM) {

            var device = deviceJSON;
            if (validateInput(_pushVapID) && getBrowser() === CHROME_BROWSER) {
              device.vapidRegistration = true;
            }
            printLog("registerDevice: Checking the previous registration :", device);
            _userId = device.userId;

            getDevice(device.deviceId, get).then(existingDevice => {
              if (existingDevice.token != device.token || existingDevice.deviceId != device.deviceId || (device.hasOwnProperty('userId') && (existingDevice.userId != device.userId))) {
                updateDevice(device, put).then((updatedDevice) => {
                  printLog("Successfully updated device");
                  callbackM(getBMSPushResponse(updatedDevice, 200, ""));
                }).catch((res) => {
                  printLog("Error in udpating device and the response is " + res);
                  callbackM(getBMSPushResponse(res, status, "Error"));
                });
              } else {
                printLog("Device is already registered and device registration parameters not changed.");
                callbackM(getBMSPushResponse(JSON.stringify(existingDevice), 201, ""));
              }
            }, errorObj => {
              if (errorObj.status == 404) {
                printLog('Starting New Device Registration');
                registerNewDevice(device, post).then((updatedDevice) => {
                  printLog("Successfully registered device");
                  callbackM(getBMSPushResponse(updatedDevice, 201, ""));
                }).catch((res) => {
                  printLog("Error in registering device and the response is " + res);
                  callbackM(getBMSPushResponse(res, status, "Error"));
                });
              } else if ((errorObj.status == 406) || (errorObj.status == 500)) {
                printLog("Error while verifying previous device registration and the response is ,", errorObj);
                callbackM(getBMSPushResponse(errorObj, status, "Error"));
              } else if(errorObj.status == 0) {
                //OPTIONS failed... Possible incorrect appId
                printLog("Error while verifying previous device registration and the response is ,", errorObj);
                callbackM(getBMSPushResponse(errorObj, status, "Error"));
              }
            });
          }

          function unRegisterDevice(callbackM) {
            printLog("Entering the unregister device");
            var devId = localStorage.getItem("deviceId");
            deletes("/devices/" + devId, function(response) {

              var status = response.status;
              if (status == 204) {
                printLog("Successfully unregistered the device");
                setPushResponse(response.responseText, 204, "");
                localStorage.setItem("deviceId", "");
                callbackM(BMSPushResponse);
                return response;
              } else {
                printLog("Error in  unregistering the device");
                setPushResponse(response.responseText, status, "Error");
                callbackM(BMSPushResponse);
                return response;
              }
            }, null);
          }

          function subscribeTags(tagArray, callbackM) {
            printLog("Entering the subscribe tags");
            var devId = localStorage.getItem("deviceId");
            var tags = {
              "deviceId": devId,
              "tagNames": tagArray
            };
            post("/subscriptions", function(res) {
              var status = res.status;
              printLog('Tag Subscription Result :', res);
              if (status >= 200 && status <= 300) {
                printLog("Successfully subscribed to tags -");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "");
                callbackM(BMSPushResponse)
              } else {
                printLog("Error while subscribing to tags :");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "Error while subscribing to tags :");
                callbackM(BMSPushResponse)
              }
              return res;
            }, tags, null);
          }

          function unSubscribeTags(tagArray, callbackM) {
            printLog("Entering the Un-subscribe tags");
            var devId = localStorage.getItem("deviceId");
            var tags = {
              "deviceId": devId,
              "tagNames": tagArray
            };
            post("/subscriptions?action=delete", function(res) {
              var status = res.status;
              printLog('Tag un-subscription Result :', res);
              if (status >= 200 && status <= 300) {
                printLog("Successfully Un-subscribed to tags -");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "");
                callbackM(BMSPushResponse)
              } else {
                printLog("Error while Un-subscribing to tags :");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "Error while Un-subscribing to tags :");
                callbackM(BMSPushResponse)
              }
              return res;
            }, tags, null);
          }

          function retrieveTagsSubscriptions(callbackM) {
            printLog("Entering the Retrieve subscriptions of tags");
            var devId = localStorage.getItem("deviceId");

            get("/subscriptions?deviceId=" + devId, function(res) {
              var status = res.status;
              printLog('Retrieve subscription Result :', res);
              if (status >= 200 && status <= 300) {
                printLog("Successfully retrieved subscribed tags");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "");
                callbackM(BMSPushResponse)
              } else {
                printLog("Error while retrieve subscribed tags :");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "Error while retrieve subscribed tags :");
                callbackM(BMSPushResponse)
              }
              return res;
            }, null);
          }

          function retrieveTagsAvailable(callbackM) {
            printLog("Entering the Retrieve available tags");
            printLog("Entering the Retrieve subscriptions of tags");
            get("/tags", function(res) {
              var status = res.status;
              printLog('Retrieve available tags Result :', res);
              if (status >= 200 && status <= 300) {
                printLog("Successfully retrieved available tags");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "");
                callbackM(BMSPushResponse)
              } else {
                printLog("Error while retrieve available tags :");
                printLog("The response is ,", res);
                setPushResponse(res.responseText, status, "Error while retrieve available tags :");
                callbackM(BMSPushResponse);
              }
              return res;
            }, null);
          }


          /*
          API calls start here
          */
          function get(action, callback, data, headers) {
            return callPushRest('GET', callback, action, data, headers);
          }

          function post(action, callback, data, headers) {
            return callPushRest('POST', callback, action, data, headers);
          }

          function put(action, callback, data, headers) {
            return callPushRest('PUT', callback, action, data, headers);
          }

          function deletes(action, callback, data, headers) {
            return callPushRest('DELETE', callback, action, data, headers);
          }


          function callPushRest(method, callback, action, data, headers) {

            var url = _pushBaseUrl + '/imfpush/v1/apps/' + _appId;
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() {
              if (xmlHttp.readyState == 4) {
                callback(xmlHttp);
              }
            }
            xmlHttp.open(method, url + action, true); // true for asynchronous
            xmlHttp.setRequestHeader('Content-Type', 'application/json; charset = UTF-8');
            if (validateInput(_pushClientSecret)) {
              xmlHttp.setRequestHeader('clientSecret', _pushClientSecret);
            }
            xmlHttp.send(JSON.stringify(data));
          }

          function getBaseUrl(appReg) {
            if (_overrideServerHost) {
                _pushBaseUrl = _overrideServerHost;
            } else {
                _pushBaseUrl  = "https://"+appReg+PUSH_API_ENDPOINT;
            }
          }

          String.prototype.hashCode = function() {
            var hash = 0,
            i, chr, len;
            if (this.length === 0) return hash;
            for (i = 0, len = this.length; i < len; i++) {
              chr = this.charCodeAt(i);
              hash = ((hash << 5) - hash) + chr;
              hash |= 0; // Convert to 32bit integer
            }
            return hash;
          };

          function generateUUID(token) {

            var dateTime = new Date().getTime();
            if (window.performance && typeof window.performance.now === "function") {
              dateTime += performance.now(); //use high-precision timer if available
            }

            var hostname = window.location.hostname;
            var arrayData = [];
            arrayData.push(String(dateTime).hashCode());
            arrayData.push(String(token).hashCode());
            arrayData.push(String(hostname).hashCode());
            arrayData.push(String(_platform).hashCode());

            var finalString = arrayData.join("").replace(/[-.]/g, '').replace(/[,.]/g, '');
            var uuid = "";
            for (var i = 0; i < 32; i++) {
              uuid += finalString.charAt(Math.floor(Math.random() * finalString.length));
            }
            if (_isExtension) {
              chrome.storage.local.set({
                'deviceId': uuid
              });
            } else {
              localStorage.setItem("deviceId", uuid);
            }
            _deviceId = uuid;
            return _deviceId;
          }

          function validateInput(stringValue) {
            return (stringValue === undefined) || (stringValue == null) || (stringValue.length <= 0) || (stringValue == '') ? false : true;
          }

          function isDeviceUpdated() {

          }
          function printLog(Result, data) {
            if (isDebugEnabled == true) {
              var resultString = Result ? Result : " ";
              var additionalData = data ? data : "";
              console.log("Response : ", resultString, " ", additionalData);
            }
          }
        }

        var BMSPushBackground = {
          init: function() {},
          onMessageReceived: function(message) {
            var messageString = JSON.stringify(message, null, 4);
            BMSPushBackground.printLogExt("Notification Received:" + messageString);
            var msgtitle = message.data.title ? message.data.title : chrome.runtime.getManifest().name;
            var messageData = message.data.alert;
            var mshIconUrl = message.data.iconUrl;
            if (message.data.iconUrl == null) {
              var icons = chrome.runtime.getManifest().icons;
              mshIconUrl = icons["128"];
              if (mshIconUrl == null) {
                mshIconUrl = icons["48"];
                if (mshIconUrl == null) {
                  mshIconUrl = icons["16"];
                }
              }
            } else {
              //Download the image as BLOB and create a BLOB URL
              var xhr = new XMLHttpRequest();
              xhr.open("GET", message.data.iconUrl);
              xhr.responseType = "blob";
              xhr.onload = function(e) {
                var urlCreator = window.URL || window.webkitURL;
                var imageUrl = urlCreator.createObjectURL(this.response);
              };
              xhr.send();
            }
            const regex = /{{\s*([^}]+)\s*}}/g;
            let messageTemp;

            function interpolate(str) {
              return function interpolate(o) {
                  return str.replace(regex, function (a, b) {
                      var r = o[b];
                      return typeof r === 'string' || typeof r === 'number' ? r : a;
                  });
              };
            }
            function createTemplateMessage() {
              chrome.storage.local.get('pushVaribales', function(result) {
                _pushVaribales = result.pushVaribales;
                if (Object.keys(_pushVaribales).length > 0 ) {
                  messageData = interpolate(messageData)(_pushVaribales);
                  createChromeNotification(mshIconUrl);
                }
              });              
            }
            if ((messageTemp = regex.exec(messageData)) !== null) {
              createTemplateMessage();
            } else {
              createChromeNotification(mshIconUrl);
            }

            function createChromeNotification(msgIconUrl) {
              var messageUrl = message.data.url ? message.data.url : "";
              chrome.storage.local.set({
                'messageUrl': messageUrl
              });
              var notification = {
                title: msgtitle,
                iconUrl: msgIconUrl,
                type: 'basic',
                message: messageData
              };
              BMSPushBackground.printLogExt(message.data.payload);
              let jsonPayload =JSON.parse(message.data.payload);
              BMSPushBackground.printLogExt(jsonPayload);
              let nid = jsonPayload.nid;

              chrome.notifications.create(nid, notification, function(notificationId) {
                chrome.storage.local.get('deviceId', function(result) {
                  _deviceId = result.deviceId;
                  let statusObj = {'deviceId': _deviceId, 'status': 'SEEN'};
                  BMSPushBackground.put('/messages/' + notificationId, function(res) {
                    if (res.status == 200 || res.status == 201) {
                      BMSPushBackground.printLogExt('message status is reported');
                    } else {
                      BMSPushBackground.printLogExt('failure reporting message' + res.responseText);
                    }
                  },statusObj, null);
                });

              });
            }

            
          },

          notificationOpened: function(notificationId) {
            chrome.notifications.clear(notificationId, function() {});
            chrome.storage.local.get('deviceId', function(result) {
              _deviceId = result.deviceId;
              let statusObj = {'deviceId': _deviceId, 'status': 'OPEN'};
              BMSPushBackground.put('/messages/' + notificationId, function(res) {
                if (res.status == 200 || res.status == 201) {
                  BMSPushBackground.printLogExt('message status is reported');
                } else {
                  BMSPushBackground.printLogExt('failure reporting message' + res.responseText);
                }
              },statusObj, null);
            });
            chrome.storage.local.get('messageUrl', function(result) {
              var openUrl = result.url ? result.url : "";
              var urlObject = {
                url: openUrl
              };
              if (chrome.browser) {
                chrome.browser.openTab(urlObject);
              } else {
                chrome.tabs.create(urlObject);
              }
              return true;
            });
          },

          notification_onClicked: function(notifiationId) {
            BMSPushBackground.printLogExt("Closing Notification with Id :", notifiationId);
            BMSPushBackground.notificationOpened(notifiationId);
          },

          notifiation_buttonClicked: function(notifiationId, buttonIndex) {
            BMSPushBackground.printLogExt("Clicked notifications button with index: ", buttonIndex);
            BMSPushBackground.notificationOpened(notifiationId);
          },
          printLogExt: function(Result, data) {
            var resultString = Result ? Result : " ";
            var additionalData = data ? data : "";
            console.log("Response : ", resultString, " ", additionalData);
          },
          put: function(action, callback, data, headers) {
            return BMSPushBackground.callPushRest('PUT', callback, action, data, headers);
          },
          callPushRest: function(method, callback, action, data, headers) {
            chrome.storage.local.get('_push_url', function(result){
              var url = result._push_url;
              var xmlHttp = new XMLHttpRequest();
              xmlHttp.onreadystatechange = function() {
                if (xmlHttp.readyState == 4) {
                  callback(xmlHttp);
                }
              };
              xmlHttp.open(method, url + action, true); // true for asynchronous
              xmlHttp.setRequestHeader('Content-Type', 'application/json; charset = UTF-8');
              chrome.storage.local.get('_pushClientSecret', function(result){
                _pushClientSecret = result._pushClientSecret;
                if (BMSPushBackground.validateInput(_pushClientSecret)) {
                  xmlHttp.setRequestHeader('clientSecret', _pushClientSecret);
                }
                xmlHttp.send(JSON.stringify(data));
              });

            });

          },
          validateInput: function(stringValue) {
            return (stringValue === undefined) || (stringValue == null) || (stringValue.length <= 0) || (stringValue == '') ? false : true;
          }
        };
