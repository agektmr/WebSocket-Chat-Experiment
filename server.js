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

var express = require('express'),
    routes  = require('./routes'),
    binarize = require('binarize.js'),
    WebSocketServer = require('ws').Server;

var app = module.exports = express.createServer();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

app.get('/', routes.index);

var SessionManager = function() {
  this.connections = [];
};
SessionManager.prototype = {
  addUser: function(name, socket) {
    // Check if name is conflicting
    this.connections.forEach(function(user) {
      // If name is conflicting, append "_"
      if (name === user.name) name = name+'_';
    });
    var user = {
      name: name,
      socket: socket
    };
    this.connections.push(user);
    return true;
  },
  getUser: function(socket) {
    for (var i = 0; i < this.connections.length; i++) {
      if (socket == this.connections[i].socket)
        return this.connections[i];
    }
    return null;
  },
  removeUser: function(socket) {
    for (var i = 0; i < this.connections.length; i++) {
      var user = this.connections[i];
      if (user.socket == socket) {
        this.connections.splice(i, 1);
        return true;
      }
    }
    return false;
  },
  getUserList: function() {
    var list = [];
    this.connections.forEach(function(user) {
      list.push(user.name);
    });
    return list;
  }
};

app.listen(3010, function() {
  var ws = new WebSocketServer({server:app}),
      session = new SessionManager();

  // Start accepting WebSocket connection
  ws.on('connection', function(socket) {
    var interval = null;

    // When a message is received
    socket.on('message', function(req) {
      binarize.unpack(req, function(msg) {
        switch (msg.type) {
          // If message type is "connection"
          case 'connection':
            // add the user to session list
            session.addUser(msg.data, socket);
            // prepare to broadcast attendee list
            var list = session.getUserList();
            msg = {
              type: 'connection',
              data: list
            };
            break;
          // If message type is "message"
          case 'message':
            // get user information
            var user = session.getUser(socket);
            // append username
            msg.name = user.name;
            // set UTC time
            var now = new Date();
            msg.datetime = now.getTime() + (now.getTimezoneOffset()*60*1000);
            break;
          default:
            break;
        }
        broadcast(msg);
      });
    });

    // When the connection is closed
    socket.on('close', function() {
      clearInterval(interval);
      interval = null;

      // remove session
      session.removeUser(socket);
      var list = session.getUserList();
      var msg = {
        type: 'connection',
        data: list
      };
      broadcast(msg);
    });

    // When an error occurred
    socket.on('error', function(e) {
      console.log('Error: '+e.message);
    });

    interval = setInterval(function() {
      console.log('sending heartbeat.');
      socket.ping();
    }, 30*1000);
  });

  // Broadcast a message
  var broadcast = function(msg) {
    binarize.pack(msg, function(binary) {
      session.connections.forEach(function(user) {
        user.socket.send(binary, {binary:true, mask:false});
      });
    });
  };
});

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
