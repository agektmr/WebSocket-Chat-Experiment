/*
Copyright 2012 Eiji Kitamura

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Author: Eiji Kitamura (agektmr@gmail.com)
*/
'use strict';

var WS_HOST = window.location.href.replace(/(http|https)(:\/\/.*?)\//, 'ws$2');

var WebSocketChatCtrl = function($scope) {
  $scope.session_standby = true;
  $scope.session_button = 'connect';
  $scope.name = '';
  $scope.attendees = [];
  $scope.message = '';
  $scope.messages = [];
  $scope.notification = '';
  $scope.notification_type = 'info';

  var send = function(msg) {
    binarize.pack(msg, function(binary) {
      $scope.chat.send(binary);
    });
  };

  $scope.toggle_session = function toggle_session() {
    if (!$scope.session_standby) {
      $scope.chat.close();
      $scope.chat = null;
    } else {
      $scope.chat = new WebSocket(WS_HOST);
      $scope.chat.onopen = $scope.onopen;
      $scope.chat.onmessage = $scope.onmessage;
      $scope.chat.onclose = $scope.onclose;
      $scope.chat.onerror = $scope.onerror;
      $scope.chat.binaryType = 'arraybuffer';
      $scope.session_standby = false;
      $scope.session_button = 'disconnect';
    }
  };
  $scope.onopen = function() {
    $scope.name = $scope.name || 'No name';
    var msg = {
      type: 'connection',
      data: $scope.name
    };
    send(msg);
    $scope.notify('Welcome, '+$scope.name+'!', 'success');
  };
  $scope.onclose = function() {
    $scope.attendees = [];
    $scope.session_standby = true;
    $scope.session_button = 'connect';
    $scope.notify('You are disconnected', 'success');
    $scope.$apply();
  };
  $scope.onerror = function() {

  };
  $scope.onmessage = function(req) {
    binarize.unpack(req.data, function(msg) {
      switch (msg.type) {
        case 'connection':
          $scope.attendees = msg.data;
          break;
        case 'message':
          // set local time
          msg.datetime = msg.datetime - ((new Date(msg.datetime)).getTimezoneOffset()*60*1000);
          msg.imgsrc = '';
          msg.audiosrc = '';
          msg.videosrc = '';
          if (msg.data instanceof Blob) {
            if (msg.data.type.indexOf('image') === 0) {
              msg.imgsrc = URL.createObjectURL(msg.data);
              msg.data = 'received an image';
            } else if (msg.data.type.indexOf('audio') === 0) {
              msg.audiosrc = URL.createObjectURL(msg.data);
              msg.data = 'received an audio';
            } else if (msg.data.type.indexOf('video') === 0) {
              msg.videosrc = URL.createObjectURL(msg.data);
              msg.data = 'received a video';
            }
          }
          $scope.messages.unshift(msg);
          break;
        default:
          return;
      }
      $scope.$apply();
    });
  };
  $scope.send_message = function() {
    var message = $scope.message;
    if (message.length > 0) {
      var msg = {
        type: 'message',
        data: message
      };
      send(msg);
      $scope.message = '';
      $scope.$apply();
    }
  };
  $scope.send_image = function(e) {
    chat_area.style.backgroundColor = '';
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    if (file.type.indexOf('image') === 0 ||
        file.type.indexOf('audio') === 0 ||
        file.type.indexOf('video') === 0) {
      var msg = {
        type: 'message',
        data: file
      };
      send(msg);
      $scope.message = '';
      $scope.$apply();
    }
  };
  $scope.notify = function(message, type, sticky) {
    sticky = sticky || false;
    type = type || 'info';
    $scope.notification = message;
    $scope.notification_type = type;
    if (!sticky) {
      setTimeout(function interval() {
        $scope.notification = '';
        $scope.$apply();
      }, 3000);
    }
  };

  var chat_area = document.querySelector('#chat_area');
  chat_area.ondragenter = function(e) {
    if ($scope.session_standby) return;
    chat_area.style.backgroundColor = '#eee';
    e.preventDefault();
  };
  chat_area.ondragleave = function(e) {
    if ($scope.session_standby) return;
    chat_area.style.backgroundColor = '';
    e.preventDefault();
  };
  chat_area.ondragover = function(e) {
    if ($scope.session_standby) return;
    chat_area.style.backgroundColor = '#eee';
    e.preventDefault();
  };
  chat_area.ondrop = $scope.send_image;

  document.querySelector('#text').onkeydown = function(e) {
    if (e.keyCode == 13) {
      $scope.send_message();
      e.stopPropagation();
      e.preventDefault();
    }
  };
};