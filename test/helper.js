'use strict';

let E2EBridge = require('../index');

const BRIDGE_HOST = process.env.BRIDGE_HOST || "bridge.local";
const BRIDGE_PORT = (process.env.BRIDGE_PORT && parseInt(process.env.BRIDGE_PORT)) || 8080;
const BRIDGE_USER = process.env.BRIDGE_USER || "user";
const BRIDGE_PW = process.env.BRIDGE_PW || "secret";

const BRIDGE_BASE = `https://${BRIDGE_HOST}:${BRIDGE_PORT}`;

module.exports = {
    host: BRIDGE_HOST,
    port: BRIDGE_PORT,
    user: BRIDGE_USER,
    password: BRIDGE_PW,
    xUmlServiceInstance: 'Ticker',
    nodeJsServiceInstance: 'NodeService',
    javaServiceInstance: 'helloworld',
    base: BRIDGE_BASE,

    makeBridgeInstance() {
        return E2EBridge.createInstance(BRIDGE_HOST, BRIDGE_PORT, BRIDGE_USER, BRIDGE_PW);
    },

    integrationEnabled() {
        return process.env.NOCK_OFF === 'true';
    }
};
