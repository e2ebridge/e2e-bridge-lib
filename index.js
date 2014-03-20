/**
 * Copyright: E2E Technologies Ltd
 */

/*global define require */
"use strict";

var request = require('request');
var util = require('util');
var xml2js = require('xml2js-expat');

//fixme: When CON-879 is done
var ERROR_UNAUTHENTICATED = "The user is not authenticated";
var CONSOLE_BASE = '/admin/Console';


function _defaultCallback(err) {
    if(err) {
        console.log(err);
    }
}

function Console(user, password, host, port) {
    this._host = host || 'localhost';
    this._port = port || 8080;
    this._user = user;
    this._password = password;
    this._coockieJar = request.jar();
    this._loggedIn = false;
}

Console.prototype.login = function( user, password, cb) {
    var self = this;

    if(user) {
        self._user = user;
    }
    if(password) {
        self._password = password;
    }

    self._ensureLogin(cb);

}

Console.prototype._composeRequestObject = function(endpoint, form, getParams) {

    var self = this;

    var getString = '';
    if(getParams){
        Object.keys(getParams).forEach(function(name){
            getString += encodeURIComponent(name) + '=' + encodeURIComponent(getParams[name]) + '&';
        });
    }

    var uri = 'https://' + self._host + ':' + self._port + CONSOLE_BASE + endpoint;
    if( getString != '') {
        uri += '?' + getString;
    }

    return {
        "url": uri,
        "form": form,
        "headers": {
            "X-Bridge": "return-xml"
        },
        "strictSSL": false, //because console uses self-signed certificate
        "jar": self._coockieJar,
        "followAllRedirects": true
    }
}

Console.prototype._ensureLogin = function(cb) {

    var self = this;

    if( self._loggedIn){
        return cb();
    }

    request.post( self._composeRequestObject( '/Welcome', {
            "j_username": self._user,
            "j_password": self._password,
            "action_SUBMIT": "Login"
        }), function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var parser = new xml2js.Parser(function(result, err) {
                if (!err) {
                    console.log('Log In: ', util.inspect(result));
                    if(result.Status === 'OK'){
                        self._loggedIn = true;
                        cb();
                    } else {
                        cb({ errorType: "Console error", error: result});
                    }
                }
                else {
                    console.warn(err);
                    cb({ errorType: "SAX error", error: err});
                }
            });
            parser.parseBuffer(body, true);
        } else {
            cb({ errorType: "HTTP error", error: { details: error, response: response}});
        }
    });
}

Console.prototype._setServiceStatus = function(status, name, node, cb){
    var self = this;

    if(!cb) {
        cb = node;
        node = self._host;
    }
    if(!cb) {
        cb = _defaultCallback;
    }

    if(status !== 'start' && status !== 'stop' && status !== 'kill'){
        // this is programming error, bail out immediately
        throw new TypeError('"status" is expected to be "start", "stop" or "kill". Got "' + status + '"');
    }

    function doSetServiceStatus( newStatus, callback){

        var form = null;
        if(newStatus === 'start'){
            form = { "action_START": "Start" };
        } else if(newStatus === 'stop'){
            form = { "action_STOP": "Stop" };
        } else if(newStatus === 'kill'){
            form = { "action_KILL": "Kill" };
        }

        request.post( self._composeRequestObject('/BridgeInstanceConfiguration', form, { "node": node, "instance": name}),
            function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var parser = new xml2js.Parser(function(result, err) {
                        if (!err) {
                            console.log(newStatus + ' service ' + name + ': ', util.inspect(result));
                            if(result.Status === 'OK'){
                                callback();
                            } else {
                                callback({ errorType: "Console error", error: result});
                            }
                        }
                        else {
                            console.warn(err);
                            callback({ errorType: "SAX error", error: err});
                        }
                    });
                    parser.parseBuffer(body, true);
                } else {
                    callback({ errorType: "HTTP error", error: { details: error, response: response}});
                }
        });
    }

    self._ensureLogin(function(err){
        if(err){
            return cb(err);
        }

        doSetServiceStatus(status, function(error){
            if(error && error.errorType === 'Console error' && error.error.Message === ERROR_UNAUTHENTICATED) {
                // this may happen after long period of inactivity. We have to re-login
                self._loggedIn = false;
                self._ensureLogin(function(er){
                    if(er){
                        return cb(er);
                    }

                    doSetServiceStatus(status, function(e){
                        if(e){
                            return cb(e);
                        };

                        return cb();
                    });
                });
            } else if(error) {
                return cb(error);
            } else {
                return cb();
            }
        });
    });
}

Console.prototype.startService = function( name, node, cb) {
    this._setServiceStatus("start", name, node, cb);
}

Console.prototype.stopService = function( name, node, cb) {
    this._setServiceStatus("stop", name, node, cb);
}

Console.prototype.killService = function( name, node, cb) {
    this._setServiceStatus("kill", name, node, cb);
}

module.exports = Console;
