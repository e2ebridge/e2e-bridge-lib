'use strict';

let E2EBridge = require('../index');

const BRIDGE_HOST = process.env.BRIDGE_HOST || "bridge.local";
const BRIDGE_PORT = (process.env.BRIDGE_PORT && parseInt(process.env.BRIDGE_PORT)) || 8080;
const BRIDGE_USER = process.env.BRIDGE_USER || "user";
const BRIDGE_PW = process.env.BRIDGE_PW || "secret";
const XUML_SERVICE_INSTANCE = process.env.XUML_SERVICE_INSTANCE || "xUMLTestService";
const NODEJS_SERVICE_INSTANCE = process.env.NODEJS_SERVICE_INSTANCE || "NodeTestService";
const JAVA_SERVICE_INSTANCE = process.env.JAVA_SERVICE_INSTANCE || "JavaTestService";

const BRIDGE_BASE = `https://${BRIDGE_HOST}:${BRIDGE_PORT}`;

module.exports = {
    host: BRIDGE_HOST,
    port: BRIDGE_PORT,
    user: BRIDGE_USER,
    password: BRIDGE_PW,
    xUmlServiceInstance: XUML_SERVICE_INSTANCE,
    nodeJsServiceInstance: NODEJS_SERVICE_INSTANCE,
    javaServiceInstance: JAVA_SERVICE_INSTANCE,
    base: BRIDGE_BASE,

    makeBridgeInstance: function() {
        return new E2EBridge(BRIDGE_HOST, BRIDGE_PORT, BRIDGE_USER, BRIDGE_PW);
    },

    skipIntegration: function() {
        if(process.env.NOCK_OFF === 'true') {
            pending("This integration test do not work (yet)");
        }
    }
};