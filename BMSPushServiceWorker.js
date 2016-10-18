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
var ports;
var i = 0;
self.addEventListener('install', function(event) {
  self.skipWaiting();
  console.log('Installed Service Worker : ', event);
  //event.postMessage("SW Says 'Hello back!'");
});

self.addEventListener('message', function(event) {
  console.log(event.data);
  ports =  event.ports[0];
});

self.addEventListener('activate', function(event) {
  console.log('Activated Service Worker : ', event);
});

self.addEventListener('push', function(event) {
  console.log('Push message received : ', event);
  if (event.data) {
    console.log('Event data is : ', event.data.text());
  }
  var messageJson = event.data.json();
  var title = messageJson.title ? messageJson.title : "New message";
  var imageUrl = messageJson.iconUrl ? messageJson.iconUrl : "images/icon.png";
  var tagJson = messageJson.payload;
  var tag = tagJson.tag ? tagJson.tag : "";
  var bodyAlert = messageJson.alert ? messageJson.alert : "Example message"
  var payloadData = messageJson.payload ? messageJson.payload : "Example message"
  event.waitUntil(
    self.registration.showNotification(title, {
      body: bodyAlert,
      icon: imageUrl,
      data:payloadData,
      tag: tag
    }));
  });

  self.addEventListener('notificationclick', function(event) {
    console.log('Notification click: tag ', event.notification.tag);
    event.notification.close();
  });

  self.addEventListener('pushsubscriptionchange', function() {
  ports.postMessage("Update the registration")
});
