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

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests

var app = express();

//SSO implementation
var passport = require('passport');
app.use(require('express-session')({ secret: 'DEG-CEE-Chatbot', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

//read environment variables
var services = JSON.parse(process.env.SSO || "{}");
var ssoConfig = services.SingleSignOn[0];
var client_id = ssoConfig.credentials.clientId;
var client_secret = ssoConfig.credentials.secret;
var authorization_url = ssoConfig.credentials.authorizationEndpointUrl;
var token_url = ssoConfig.credentials.tokenEndpointUrl;
var issuer_id = ssoConfig.credentials.issuerIdentifier;
var callback_url = ssoConfig.callback_url;

var certlist;
if (process.env.BLUEMIX_REGION === undefined) {
  certlist = [ '/certs/DigiCertGlobalRootCA.crt', '/certs/DigiCertSHA2SecureServerCA.crt', '/certs/oidc_w3id_staging.cer' ];
}
else {
  certlist = [ '../../../app/certs/DigiCertGlobalRootCA.crt', '../../../app/certs/DigiCertSHA2SecureServerCA.crt', '../../../app/certs/oidc_w3id_staging.cer' ];
}

//specify SSO strategy
var OpenIDConnectStrategy = require('passport-idaas-openidconnect').IDaaSOIDCStrategy;
var Strategy = new OpenIDConnectStrategy({
                authorizationURL : authorization_url,
                tokenURL : token_url,
                clientID : client_id,
                scope : 'email',
                response_type : 'code',
                clientSecret : client_secret,
                callbackURL : callback_url,
                addCACert: true,
                CACertPathList: certlist,
                skipUserProfile : true,
                issuer : issuer_id },
      function(iss, sub, profile, accessToken, refreshToken, params, done) {
        process.nextTick(function() {
            profile.accessToken = accessToken;
            profile.refreshToken = refreshToken;
            done(null, profile);
        })
      }
)
passport.use(Strategy);

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// this is our callback URL !
app.get('/sso',function(req,res,next) {
        passport.authenticate('openidconnect', {
                successRedirect: '/index.html',
                failureRedirect: '/failure',
        })(req,res,next);
    });

app.get('/failure', function(req, res) {
             res.send('login failed'); });

app.get('/login', passport.authenticate('openidconnect', {}));

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect(issuer_id + "/idaas/mtfim/sps/idaas/logout");
});

//middleware function to restrict usage for authenticated users only
function ensureAuthenticated(req, res, next) {
  if(!req.isAuthenticated()) {
              req.session.originalUrl = req.originalUrl;
    res.redirect('/login');
  } else {
    return next();
  }
}
app.use(ensureAuthenticated);



// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());



// Create Assistant
const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');

const assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
const assistantUrl = process.env.ASSISTANT_URL || '<assistant-url>';
const assistantApiKey = process.env.ASSISTANT_IAM_APIKEY || '<apikey>';

// console.log("Assitant ID: " + assistantId);
// console.log("Assitant URL: " + assistantUrl);
// console.log("Assitant ApiKey: " + assistantApiKey);

const assistant = new AssistantV2({
  version: '2020-02-05',
  authenticator: new IamAuthenticator({
    apikey: assistantApiKey
  }),
  url: assistantUrl
});



var newContext = {
  global : {
    system : {
      turn_count : 1
    }
  }
};

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  if (!assistantId || assistantId === '<assistant-id>>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  var contextWithAcc = (req.body.context) ? req.body.context : newContext;

  if (req.body.context) {
    contextWithAcc.global.system.turn_count += 1;
  }

  //console.log(JSON.stringify(contextWithAcc, null, 2));

  var textIn = '';

  if(req.body.input) {
    textIn = req.body.input.text;
  }

  assistant.message({
    assistantId: assistantId,
    sessionId: req.body.session_id,
    input: {
        message_type: 'text',
        text : textIn,
        options : {
          return_context : true
        }
      }
    })
    .then(ares => {
//      console.log(JSON.stringify(ares.result, null, 2));
      return res.send(JSON.stringify(ares.result, null, 2));
    })
    .catch(err => {
      console.log(err);
      return res.status(err.code || 500).json(err);
    });

});



app.get('/api/session', function (req, res) {

  assistant.createSession({
    assistantId: assistantId
  })
  .then(sres => {
//    console.log(JSON.stringify(sres.result, null, 2));
    return res.send(JSON.stringify(sres.result, null, 2));
  })
  .catch(err => {
    console.log(err);
    return res.status(err.code || 500).json(err);
  });

});

module.exports = app;
