#!/usr/bin/env
/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

require('dotenv').config({silent: true});

var server = require('./app');
var port = process.env.PORT || 3000;

// Lines 26-28 are needed to run the app on the cloud. In this scenario, you must comment out all remaining lines after line 28
server.listen(port, function() {
 console.log('Server running on port: %d', port);
});

// Lines 31-40 are needed to run the app on localhost. In this scenario, you must comment out lines 26-28.
// var fs = require('fs')
// var https = require('https')
//
// https.createServer({
//   key: fs.readFileSync('certs/server.key'),
//   cert: fs.readFileSync('certs/server.cert')
// }, server)
// .listen(port, function () {
//   console.log(`Server running. Run the app using SSL: https://localhost:${port}`);
// });
