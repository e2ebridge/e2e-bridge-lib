const helper = require('./helper');
const E2EBridge = require("../index");

describe("bridge-lib", function() {
    it("throws exception in case of unsupported protocol", function () {
        expect(() => E2EBridge.createInstance("gugus", helper.host, helper.port, helper.user, helper.password))
            .toThrow(new Error("Unsupported protocol 'gugus'. Allowed protocols: 'http' or 'https'"));
    });

    it("has default protocol https", function () {
        let bridge = E2EBridge.createInstance(undefined, helper.host, helper.port, helper.user, helper.password);
        expect(bridge._protocol).toBe("https")
    });
});
