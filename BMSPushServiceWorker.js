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
//import "bmsutils";

/**
 * Push SDK class for handling the Web device requests
 * @module BMSPushServiceWorker
 */

const regex = /{{\s*([^}]+)\s*}}/g;
var _pushVaribales = "";

function interpolate(messageData) {
    return function interpolate(o) {
        return messageData.replace(regex, function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        });
    };
}

function createTemplateMessage(messageData) {
    if (Object.keys(_pushVaribales).length > 0 ) {
        var message = interpolate(messageData)(_pushVaribales);
        return message;
    } else {
        return messageData;
    }
}
/**
  * Methos to show the notifications when an event arrives
  * @method module:BMSPushServiceWorker#displayNotification
  * @param {Object} event - The push event from browser
  */
function displayNotification(event) {
    var messageJson = event.data.json();
    var title = messageJson.title ? messageJson.title : "New message";
    var imageUrl = messageJson.iconUrl ? messageJson.iconUrl : "images/icon.png";
    var tagJson = messageJson.payload;
    var tag = tagJson.tag ? tagJson.tag : "";
    var bodyAlert = messageJson.alert ? messageJson.alert : "Example message";
    var payloadData = messageJson.payload ? messageJson.payload : "Example message";
    let messageTemp;
    if ((messageTemp = regex.exec(bodyAlert)) !== null) {
        bodyAlert = createTemplateMessage(bodyAlert);
    }
    self.registration.showNotification(title, {
        body: bodyAlert,
        icon: imageUrl,
        data: payloadData,
        tag: tag
    });  
    return Promise.resolve();
}


function triggerSeenEvent(strMsg) {
    sendMessageToAllClients("msgEventSeen:" + strMsg);
}

function triggerOpenEvent(strMsg) {
    sendMessageToAllClients("msgEventOpen:" + strMsg);
}

function onPushNotificationReceived(event) {
    console.log('Push notification received : ', event);
    if (event.data) {
        console.log('Event data is : ', event.data.text());
    }
    event.waitUntil(displayNotification(event).then(() => triggerSeenEvent(event.data.text())));
}

self.addEventListener('push', onPushNotificationReceived);

function sendMessageToClient(client, msg) {
    return new Promise(function (resolve, reject) {
        var msgChan = new MessageChannel();

        msgChan.port1.onmessage = function (event) {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };

        client.postMessage(msg, [msgChan.port2]);
    });
}

function sendMessageToAllClients(msg) {
    clients.matchAll().then(clients => {
        clients.forEach(client => {
            sendMessageToClient(client, msg);
        });
    });
}

self.addEventListener('install', function (event) {
    self.skipWaiting();
    console.log('Installed Service Worker : ', event);
    //event.postMessage("SW Says 'Hello back!'");
});

self.addEventListener('message', function (event) {
    replyPort = event.ports[0];
    _pushVaribales = event.data;
});

self.addEventListener('activate', function (event) {
    console.log('Activated Service Worker : ', event);
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', function (event) {
    console.log('Notification clicked with tag' + event.notification.tag + " and data " + event.notification.data);
    let nidjson = event.notification.data;
    event.notification.close();
    event.waitUntil(triggerOpenEvent(nidjson));
});

self.addEventListener('pushsubscriptionchange', function () {
    console.log('Push Subscription change');
    sendMessageToAllClients("updateRegistration:");
});