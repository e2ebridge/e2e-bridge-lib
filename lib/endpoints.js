/**
 * Copyright: Scheer E2E AG
 * @author: Jakub Zakrzewski <jakub.zakrzewski@scheer-group.com>
 */

"use strict";


/**
 * Known endpoints.
 * We provide specific functionality and we have to able to easily
 * bail out if someone tries something unknown
 *
 * Format:
 * <path part>: {
 *   <path part> | "*": { ... }
 *   |
 *   <resource>: [<HTTP_VERB>, ...]
 * }
 *
 */
const ENDPOINTS = Object.freeze({
    "services": {
        "xuml": {
            "*": {
                "preferences": ["GET", "PUT"],
                "settings": ["GET", "PUT"],
                "start": ["PUT"],
                "stop": ["PUT"],
                "kill": ["PUT"],
                "": ["DELETE"],
            }
        },
        "nodejs": {
            "*": {
                "preferences": ["GET", "PUT"],
                "settings": ["GET", "PUT"],
                "start": ["PUT"],
                "stop": ["PUT"],
                "": ["DELETE"],
            }
        },
        "java": {
            "*": {
                "preferences": ["GET", "PUT"],
                "settings": ["GET", "PUT"],
                "start": ["PUT"],
                "stop": ["PUT"],
                "": ["DELETE"],
            }
        }
    }
});

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
 * @private
 * @param {!Object} endpointCollection valid endpoints descriptor
 * @param {!string} method Valid HTTP verb (GET, POST, PUT...)
 * @param {string} parts The parts to construct the endpoint from.
 * @returns {string}
 */
function _getEndpoint(endpointCollection, method, ...parts) {

    const part = parts.shift();
    let endpoint = null;
    let currentEndpoints = endpointCollection[part];

    if(!currentEndpoints && part) {
        currentEndpoints = endpointCollection['*'];
    }

    if(currentEndpoints && parts.length === 0) {
        if(!Array.isArray(currentEndpoints)) {
            currentEndpoints = currentEndpoints[''];
        }

        if(currentEndpoints) {
            if(currentEndpoints.indexOf(method) > -1) {
                return part ? '/' + encodeURIComponent(part) : '';
            }
        }
    } else if(currentEndpoints) {
        endpoint = _getEndpoint(currentEndpoints, method, ...parts);
        if(endpoint || endpoint === '') {
            return (part ? '/' + encodeURIComponent(part) : '') + endpoint;
        }
    }

    return endpoint;
}

/**
 * Construct Bridge API endpoint relative to the base URI.
 * @param {!string} method Valid HTTP verb (GET, POST, PUT...)
 * @param {?string} parts Resource as path parts.
 * @returns {string}
 */
function getEndpoint(method, ...parts) {

    let endpoint = _getEndpoint(ENDPOINTS, method, ...parts);

    if(!endpoint) {
        // this is programming error, bail out
        throw new TypeError( `${method} is not supported on /${parts.join('/')}`);
    }

    return endpoint;
}

/**
 * Construct Bridge API endpoint relative to the base URI.
 * @param {!string} method Valid HTTP verb (GET, POST, PUT...)
 * @param {?string} tail Subresource as path parts.
 * @returns {string}
 */
function getServicesEndpoint(method, ...tail) {
    return getEndpoint(method, 'services', ...tail);
}

/**
 * Construct Bridge API endpoint relative to the base URI.
 * @param {!string} method Valid HTTP verb (GET, POST, PUT...)
 * @param {!string} serviceType valid service type: 'xUML', 'node'...
 * @param {?string} serviceName Name of the service.
 * @param {?string} tail Subresource of the service as path parts.
 * @returns {string}
 */
function getServiceEndpoint(method, serviceType, serviceName, ...tail) {
    if(serviceName) {
        tail.unshift(serviceName);
    }
    return getServicesEndpoint(method, MAP[serviceType], ...tail);
}

module.exports.ENDPOINTS = ENDPOINTS;
module.exports.getEndpoint = getEndpoint;
module.exports.getServiceEndpoint = getServiceEndpoint;
module.exports.getServicesEndpoint = getServicesEndpoint;