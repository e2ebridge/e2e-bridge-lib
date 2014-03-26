/**
 * Copyright: E2E Technologies Ltd
 * @author: Jakub Zakrzewski <jzakrzewski@e2e.ch>
 */

/*global define require */
"use strict";

var request = require('request');
var util = require('util');
var xml2js = require('xml2js-expat');
var fs = require('fs');
var path = require('path');

//fixme: When CON-879 is done
/** @const */ var ERROR_UNAUTHENTICATED = "The user is not authenticated";
/** @const */ var CONSOLE_BASE = '/admin/Console';
/** @const */ var FIRMWARE_DEPLOY_ENDPOINT = '/Deploy';
/** @const */ var LOGIN_ENDPOINT = '/Welcome';
/** @const */ var BRIDGE_SERVICE_STATUS_ENDPOINT = '/BridgeInstanceConfiguration';
/** @const */ var NODE_SERVICE_STATUS_ENDPOINT = '/nodejs/service/Configuration';
/** @const */ var BRIDGE_SERVICE_REMOVE_ENDPOINT = '/BridgeInstanceDelete';
/** @const */ var NODE_SERVICE_REMOVE_ENDPOINT = '/nodejs/service/Delete';
/** @const */ var REPOSITORY_CONTENT_TYPE = 'application/octet-stream';


function _defaultCallback(err) {
    if(err) {
        console.log(err);
    }
}

/**
 * Executes the request.
 *
 * At this point most of the request is already composed. The only tricky thing is form. E2E Console is very
 * sensitive on those forms, encoding and transfer. Therefore we have to use two different ways of attaching form
 * to request as they result in two different way of encoding and transferring the form.
 *
 * @param paramObject Prepared object for the request library.
 * @param form Form object.
 * @param {function(?Object=)} callback Param will be null if everything goes smoothly
 * @private
 */
function _executeRequest( paramObject, form, callback){

    if(!form.$isUpload) {
        paramObject.form = form;
    }

    var requestObject = request.post( paramObject,
        function(error, response, body) {
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

/**
 * Console object
 * @param {string} host
 * @param {integer} port
 * @param {?string} user
 * @param {?string} password
 * @constructor
 */
function Console(host, port, user, password) {
    this._host = host || 'localhost';
    this._port = port || 8080;
    this._user = user;
    this._password = password;
    this._coockieJar = request.jar();
    this._loggedIn = false;
}

/**
 * Log in to the console instance.
 * Can be used to establish login session. Must be used before other operations if
 * no user/password given to the constructor.
 *
 * @param {string} user
 * @param {string} password
 * @param {function(Object)} callback Called after login. Parameter will be null if login is successful
 */
Console.prototype.login = function( user, password, callback) {
    var self = this;

    if( typeof user === 'function') {
        callback = user;
        user = null;
    } else if( typeof password === 'function') {
        callback = password;
        password = null;
    }

    if(user) {
        self._user = user;
    }
    if(password) {
        self._password = password;
    }

    self._ensureLogin(callback);

}

/**
 * Prepare settings for request module.
 * @param {!string} endpoint Console endpoint, we intend to call
 * @param {?Object} getParams URI GET parameters to attach to endpoint (key-value pairs)
 * @returns {Object}
 * @private
 */
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

/**
 * Calls the callback after checking if login session is active.
 * If session is inactive, try to establish one.
 * @param {function(?Object=)} callback Param will be null if everything goes smoothly
 * @private
 */
Console.prototype._ensureLogin = function(callback) {

    var self = this;

    if( self._loggedIn){
        return callback();
    }

    _executeRequest(self._composeRequestObject( LOGIN_ENDPOINT), {
            "j_username": self._user,
            "j_password": self._password,
            "action_SUBMIT": "Login"
        }, callback);
}

/**
 * Be sure, that operation will be called only with active login session.
 * Because it is possible for login session to expire and we may not know this,
 * if we get authentication error with first trial, we will force re-login
 * and try again.
 *
 * @param {function(?Object=)} operation Whatever should be called on login session.
 * @param {function(?Object=)} callback What to call when done. This is separated from operation,
 * because we may be forced to call it ourselves.
 * @private
 */
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

/**
 * Change service status.
 * Also start, stop or kill a service. Either node or bridge.
 *
 * @param {!string} change 'start', 'stop' or 'kill'. Note, that 'kill' will not work for node.js services
 * @param {!string} serviceType 'bridge' or 'node'
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 * @private
 */
Console.prototype._setServiceStatus = function( change, serviceType, name, node, callback) {

    var self = this;

    if(typeof node === 'function') {
        callback = node;
        node = self._host;
    }
    if(!callback) {
        callback = _defaultCallback;
    }

    var form = null;
    if(change === 'start'){
        form = { "action_START": "Start" };
    } else if(change === 'stop'){
        form = { "action_STOP": "Stop" };
    } else if(change === 'kill'){
        form = { "action_KILL": "Kill" };
    }

    var endpoint = '';
    if(serviceType === 'bridge') {
        endpoint = BRIDGE_SERVICE_STATUS_ENDPOINT;
    } else if(serviceType === 'node') {
        endpoint = NODE_SERVICE_STATUS_ENDPOINT;
    } else {
        // this is programming error, bail out immediately
        throw new TypeError('"serviceType" is expected to be "node" or "bridge". Got "' + serviceType + '"');
    }

    _executeRequest(self._composeRequestObject( endpoint, { "node": node, "instance": name}), form, callback);
}

/**
 * Start, stop or kill services.
 * @param {!string} status 'start', 'stop' or 'kill'. Note, that 'kill' will not work for node.js services
 * @param {!string} name Name of the service.
 * @param {!string} type 'bridge' or 'node'
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.setServiceStatus = function(status, name, type, node, callback){
    var self = this;

    if(status !== 'start' && status !== 'stop' && status !== 'kill'){
        // this is programming error, bail out immediately
        throw new TypeError('"status" is expected to be "start", "stop" or "kill". Got "' + status + '"');
    }

    self._logInAndPerform(function(innerCallback) {
        self._setServiceStatus(status, type, name, node, innerCallback);
    }, callback);
}

/**
 * Remove service from console
 * @param {!string} serviceType 'bridge' or 'node'
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 * @private
 */
Console.prototype._removeService = function(serviceType, name, node, callback) {

    var self = this;

    if(typeof node === 'function') {
        callback = node;
        node = self._host;
    }
    if(!callback) {
        callback = _defaultCallback;
    }

    var form = null;

    var endpoint = '';
    if(serviceType === 'bridge') {
        endpoint = BRIDGE_SERVICE_REMOVE_ENDPOINT;
        form = { "action_DELETE": "Delete Composite Service"};
    } else if(serviceType === 'node') {
        endpoint = NODE_SERVICE_REMOVE_ENDPOINT;
        form = { "action_DELETE": "Delete Node.js Service"};
    } else {
        // this is programming error, bail out immediately
        throw new TypeError('"serviceType" is expected to be "node" or "bridge". Got "' + serviceType + '"');
    }

    _executeRequest(self._composeRequestObject( endpoint, { "node": node, "instance": name}), form, callback);
}

/**
 * Remove service from console
 * @param {!string} name Name of the service.
 * @param {!string} type 'bridge' or 'node'
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.removeService = function(name, type, node, callback){
    var self = this;

    self._logInAndPerform(function(innerCallback) {
        self._removeService(type, node, name, innerCallback);
    }, callback);
}

/**
 * Starts bridge service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.startBridgeService = function( name, node, callback) {
    this.setServiceStatus("start", name, 'bridge', node, callback);
}

/**
 * Stops bridge service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.stopBridgeService = function( name, node, callback) {
    this.setServiceStatus("stop", name, 'bridge', node, callback);
}

/**
 * Kills bridge service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.killBridgeService = function( name, node, callback) {
    this.setServiceStatus("kill", name, 'bridge', node, callback);
}

/**
 * Removes bridge service from given node
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.removeBridgeService = function( name, node, callback) {
    this.removeService(name, 'bridge', node, callback);
}

/**
 * Starts Node.js service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.startNodeService = function( name, node, callback) {
    this.setServiceStatus("start", name, 'node', node, callback);
}

/**
 * Stops Node.js service
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.stopNodeService = function( name, node, callback) {
    this.setServiceStatus("stop", name, 'node', node, callback);
}

/**
 * Removes Node.js service from given node
 *
 * @param {!string} name Name of the service.
 * @param {(string|function(?Object=))} node Name of the console node. If function type, will be used
 * instead of callback parameter. If null or function, will default to host.
 * @param {?function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.removeNodeService = function( name, node, callback) {
    this.removeService(name, 'node', node, callback);
}

/**
 * Deploys service to the console
 * @param {(string|Buffer)} file The absolute file path to the repository (Node.js or bridge) or a Buffer with repository content.
 * @param {{startup: boolean, overwrite: boolean, overwrite_settings: boolean}} options Deployment options
 * @param {function(?Object=)} callback Called when done. If everything goes smoothly, parameter will be null.
 */
Console.prototype.deployService = function( file, options, callback) {

    var self = this;

    if( typeof options === 'function'){
        callback = options;
        options = {};
    }

    if( Buffer.isBuffer(file)){
        self._logInAndPerform(function(innerCallback) {
            self._deployService('repository.zip', file, options, innerCallback);
        }, callback);
    } else {
        fs.readFile(file, function(err, data){
            if( err){
                return callback({ errorType: "Filesystem error", error: err});
            }

            self._logInAndPerform(function(innerCallback) {
                self._deployService(path.basename(file), data, options, innerCallback);
            }, callback);
        });
    }
}

/**
 * Does the real deployment work.
 *
 * @param {string} filename The name of the file we're uploading
 * @param {Buffer} data     Content of the file.
 * @param {{startup: boolean, overwrite: boolean, overwrite_settings: boolean}} options  Options regarding startup,
 * overwriting and settings overwriting.
 * @param {function(?Object=)} callback  Called when done. If everything goes smoothly, parameter will be null.
 * @private
 */
Console.prototype._deployService = function(filename, data, options, callback) {

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
                contentType: REPOSITORY_CONTENT_TYPE
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
    if( options.overwrite_settings){
        form.input_overwrite_settings = 'true';
    }

    _executeRequest(self._composeRequestObject( FIRMWARE_DEPLOY_ENDPOINT), form, callback);
}

module.exports = Console;
