/**
 * Copyright: Scheer E2E AG
 * @author: Jakub Zakrzewski <jakub.zakrzewski@scheer-group.com>
 */

"use strict";


/**
 * Known endpoints.
 * We provide specific functionality and we have to able to easily
 * bail out if someone tries something not
 *
 * Format:
 * <serviceType>: {
 *   <resource>: [<HTTP_VERB>, ...]
 * }
 *
 */
const ENDPOINTS = {
    "xUML": {
        "preferences": ["GET", "PUT"],
        "settings": ["GET", "PUT"],
        "start": ["PUT"],
        "stop": ["PUT"],
        "kill": ["PUT"],
    },
    "node": {
        "preferences": ["GET", "PUT"],
        "settings": ["GET", "PUT"],
        "start": ["PUT"],
        "stop": ["PUT"],
    },
    "java": {
        "preferences": ["GET", "PUT"],
        "settings": ["GET", "PUT"],
        "start": ["PUT"],
        "stop": ["PUT"],
    }
};

/**
 * Map between the service type used in library interface and the one used in Bridge API
 *
 * Format:
 * <name in interface>: <Bridge API resource name>
 */
const MAP = {
    "xUML": "xuml",
    "node": "nodejs",
    "java": "java"
};

/**
 * Construct Bridge API endpoint relative to the base URI.
 * @param {!string} serviceType valid service type: 'xUML', 'node'...
 * @param {!string} name Name of the service.
 * @param {!string} resource The name of the resource of the service (e.g. 'preferences' or 'start')
 * @param {!string} method Valid HTTP verb (GET, POST, PUT...)
 * @returns {*}
 */
function getEndpoint(serviceType, name, resource, method) {

    let endpoint = null;
    let serviceEndpoints = ENDPOINTS[serviceType];
    if(serviceEndpoints) {
        let potentialEndpoint = serviceEndpoints[resource];
        if(potentialEndpoint) {
            if(potentialEndpoint.indexOf(method) > -1) {
                endpoint = '/services/' + MAP[serviceType] + '/' + encodeURIComponent(name) + '/' + resource;
            }
        }
    }

    if(!endpoint) {
        // this is programming error, bail out immediately
        throw new TypeError(serviceType + ' services do not support ' + method + ' on "' + resource + '" resource');
    }

    return endpoint;
}

module.exports.ENDPOINTS = ENDPOINTS;
module.exports.getEndpoint = getEndpoint;