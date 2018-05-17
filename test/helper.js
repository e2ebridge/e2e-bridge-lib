'use strict';

let E2EBridge = require('../index');

const BRIDGE_HOST = "bridge.local";
const BRIDGE_PORT = 8080;
const BRIDGE_USER = "user";
const BRIDGE_PW = "secret";
const BRIDGE_NODE = "localhost";
const SERVICE_INSTANCE = "TestService";

const BRIDGE_BASE = `https://${BRIDGE_HOST}:${BRIDGE_PORT}`;

const MSG_OK =
    `<?xml version="1.0" encoding="utf-8"?>
    <Result xmlns="http://e2e.ch/bridge">
        <Status>OK</Status>
        <Message>null</Message>
    </Result>`;

module.exports = {
    host: BRIDGE_HOST,
    port: BRIDGE_PORT,
    user: BRIDGE_USER,
    password: BRIDGE_PW,
    node: BRIDGE_NODE,
    serviceInstance: SERVICE_INSTANCE,
    base: BRIDGE_BASE,
    okMsg: MSG_OK,

    makeBridgeInstance: function() {
        return new E2EBridge(BRIDGE_HOST, BRIDGE_PORT, BRIDGE_USER, BRIDGE_PW);
    },
};