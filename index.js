/**
 * Copyright: E2E Technologies Ltd
 */

/*global define require */
"use strict";

var request = require('request');
var util = require('util');
var xml2js = require('xml2js-expat');
var fs = require('fs');
var path = require('path');

//fixme: When CON-879 is done
var ERROR_UNAUTHENTICATED = "The user is not authenticated";
var CONSOLE_BASE = '/admin/Console';
var FIRMWARE_DEPLOY_ENDPOINT = '/Deploy';


function _defaultCallback(err) {
    if(err) {
        console.log(err);
    }
}

function _executeRequest( paramObject, form, callback){

    if(!form.$isUpload) {
        paramObject.form = form;
    }

    var requestObject = request.post( paramObject,
        function(error, response, body) {
            console.log(error, response, body);
            if (!error && response.statusCode == 200) {
                var parser = new xml2js.Parser(function(result, err) {
                    if (!err) {
                        if(result.Status === 'OK'){
                            callback();
                        } else {
                            callback({ errorType: "Console error", error: result});
                        }
                    }
                    else {
                        callback({ errorType: "SAX error", error: err});
                    }
                });
                parser.parseBuffer(body, true);
            } else {
                callback({ errorType: "HTTP error", error: { details: error, response: response}});
            }
        });

    if(form.$isUpload){
        var requestForm = requestObject.form();

        Object.keys(form).forEach(function(key){
            if(key.substr(0,1) === '$'){
                return;
            }

            if( form[key].fieldOptions ){
                requestForm.append(key, form[key].value, form[key].fieldOptions);
            } else {
                requestForm.append(key, form[key]);
            }
        })
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

Console.prototype._composeRequestObject = function(endpoint, getParams) {

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

    var ret = {
        "url": uri,
        "headers": {
            "X-Bridge": "return-xml"
        },
        "strictSSL": false, //because console uses self-signed certificate
        "jar": self._coockieJar,
        "followAllRedirects": true
    }

    return ret;
}

Console.prototype._ensureLogin = function(cb) {

    var self = this;

    if( self._loggedIn){
        return cb();
    }

    _executeRequest(self._composeRequestObject( '/Welcome'), {
            "j_username": self._user,
            "j_password": self._password,
            "action_SUBMIT": "Login"
        }, cb);
}

Console.prototype._logInAndPerform = function( operation, callback){
    var self = this;

    self._ensureLogin(function(err){
        if(err){
            return callback(err);
        }

        operation( function(error){
            if(error && error.errorType === 'Console error' && error.error.Message === ERROR_UNAUTHENTICATED) {
                // this may happen after long period of inactivity. We have to re-login
                self._loggedIn = false;
                self._ensureLogin(function(er){
                    if(er){
                        return callback(er);
                    }

                    operation( function(e){
                        if(e){
                            return callback(e);
                        };

                        return callback();
                    });
                });
            } else if(error) {
                return callback(error);
            } else {
                return callback();
            }
        });
    });
}

Console.prototype._setServiceStatus = function( newStatus, serviceType, node, name, callback) {

    var self = this;

    var form = null;
    if(newStatus === 'start'){
        form = { "action_START": "Start" };
    } else if(newStatus === 'stop'){
        form = { "action_STOP": "Stop" };
    } else if(newStatus === 'kill'){
        form = { "action_KILL": "Kill" };
    }

    var endpoint = null;
    if(serviceType === 'bridge') {
        endpoint = '/BridgeInstanceConfiguration';
    } else if(serviceType === 'node') {
        endpoint = '/nodejs/service/Configuration';
    } else {
        // this is programming error, bail out immediately
        throw new TypeError('"serviceType" is expected to be "node" or "bridge". Got "' + serviceType + '"');
    }

    _executeRequest(self._composeRequestObject( endpoint, { "node": node, "instance": name}), form, callback);
}

Console.prototype.setServiceStatus = function(status, name, type, node, cb){
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

    self._logInAndPerform(function(innerCallback) {
        self._setServiceStatus(status, type, node, name, innerCallback);
    }, cb);
}

Console.prototype._removeService = function(serviceType, node, name, callback) {

    var self = this;

    var form = null;

    var endpoint = null;
    if(serviceType === 'bridge') {
        endpoint = '/BridgeInstanceDelete';
        form = { "action_DELETE": "Delete Composite Service"};
    } else if(serviceType === 'node') {
        endpoint = '/nodejs/service/Delete';
        form = { "action_DELETE": "Delete Node.js Service"};
    } else {
        // this is programming error, bail out immediately
        throw new TypeError('"serviceType" is expected to be "node" or "bridge". Got "' + serviceType + '"');
    }

    _executeRequest(self._composeRequestObject( endpoint, { "node": node, "instance": name}), form, callback);
}

Console.prototype.removeService = function(name, type, node, cb){
    var self = this;

    if(!cb) {
        cb = node;
        node = self._host;
    }
    if(!cb) {
        cb = _defaultCallback;
    }

    self._logInAndPerform(function(innerCallback) {
        self._removeService(type, node, name, innerCallback);
    }, cb);
}

Console.prototype.startBridgeService = function( name, node, cb) {
    this.setServiceStatus("start", name, 'bridge', node, cb);
}

Console.prototype.stopBridgeService = function( name, node, cb) {
    this.setServiceStatus("stop", name, 'bridge', node, cb);
}

Console.prototype.killBridgeService = function( name, node, cb) {
    this.setServiceStatus("kill", name, 'bridge', node, cb);
}

Console.prototype.removeBridgeService = function( name, node, cb) {
    this.removeService(name, 'bridge', node, cb);
}

Console.prototype.startNodeService = function( name, node, cb) {
    this.setServiceStatus("start", name, 'node', node, cb);
}

Console.prototype.stopNodeService = function( name, node, cb) {
    this.setServiceStatus("stop", name, 'node', node, cb);
}

Console.prototype.removeNodeService = function( name, node, cb) {
    this.removeService(name, 'node', node, cb);
}

Console.prototype.deployService = function( file, options, cb) {

    var self = this;

    if( typeof options === 'function'){
        cb = options;
        options = {};
    }

    if( Buffer.isBuffer(file)){
        self._logInAndPerform(function(innerCallback) {
            self._deployService('repository.zip', file, options, innerCallback);
        }, cb);
    } else {
        fs.readFile(file, function(err, data){
            if( err){
                return cb({ errorType: "Filesystem error", error: err});
            }

            self._logInAndPerform(function(innerCallback) {
                self._deployService(path.basename(file), data, options, innerCallback);
            }, cb);
        });
    }
}

/**
 * Does the real deployment work.
 *
 * @remarks: This function is a bit hackish, but it's the only way I could get console into accepting file upload.
 * In ideal world we would stream it, but then Transfer-Encoding: chunked made console unhappy. Also different way of
 * creating form is here for a reason - in this version we'll get proper multipart/form-data so the console is happy.
 *
 * @param {string} filename The name of the file we're uploading
 * @param {Buffer} data     Content of the file.
 * @param {Object} options  Options regarding startup, overwriting and settings overwriting.
 * @param {function} cb     Call it after done.
 * @private
 */
Console.prototype._deployService = function(filename, data, options, cb) {

    var self = this;

    if( !Buffer.isBuffer( data)){
        throw new TypeError('Data is expected to be a Buffer, "' + (typeof data) + '" given');
    }

    var form = {
        $isUpload: true,
        input_repository: {
            value: data,
            fieldOptions: {
                filename: filename,
                contentType: 'application/octet-stream'
            }
        },
        action_UPLOAD: 'UPLOAD'
    };

    if( options.startup){
        form.input_startup = 'true';
    }
    if( options.overwrite){
        form.input_overwrite = 'true';
    }
    if( options.settings){
        form.input_overwrite_settings = 'true';
    }

    _executeRequest(self._composeRequestObject( FIRMWARE_DEPLOY_ENDPOINT), form, cb);
}

module.exports = Console;
