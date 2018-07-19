let helper = require('./helper');
let nock = require('nock');
const path = require('path');
const _ = require('lodash');

function makeChangedSettings(settings, changes) {
    // this will crash beautifully if setting not found. It's OK in test.
    const result = JSON.parse(JSON.stringify(settings)); // deep copy
    Object.keys(changes).forEach(c => {
        result.find(s => s.id === c).currentValue = '' + changes[c];
    });
    return result;
}

describe('Node.js settings', function() {
    let scope;

    function serviceUriPath(serviceType, serviceName, tail) {
        return `/bridge/rest/services/${serviceType}/${serviceName}${tail}`;
    }

    const settings = {
        "aString": "default value",
        "aNumber": 1234,
        "anArray": [
            "jeden",
            "dwa",
            "trzy"
        ],
        "anObject": {
            "aString": "default value",
            "aNumber": 1234,
            "anArray": [
                "jeden",
                "dwa",
                "trzy"
            ]
        }
    };

    function endpoint() {
        return serviceUriPath('nodejs', helper.nodeJsServiceInstance, '/settings');
    }

    beforeAll(function(done) {
        if(!helper.integrationEnabled()) {
            return done();
        }

        const repository = path.resolve(__dirname, `data/${helper.nodeJsServiceInstance}.zip`);
        helper
            .makeBridgeInstance()
            .deployService(
                repository,
                {overwrite: true, overwritePrefs: true},
                function(err) {
                    expect(err).toBeFalsy();
                    done();
                });
    });

    beforeEach(function(done) {
        scope = nock(helper.base);

        if(!helper.integrationEnabled()) {
            return done();
        }

        helper.makeBridgeInstance().setNodeServiceSettings(
            helper.nodeJsServiceInstance,
            settings,
            (/*err, res*/) => done());
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it('can query', function(done) {

        scope.get(endpoint())
            .reply(200, settings);

        helper.makeBridgeInstance().getNodeServiceSettings(
            helper.nodeJsServiceInstance,
            function(err, res) {
                expect(err).toBeFalsy();
                expect(res).toEqual(settings);
                scope.done();
                done();
            });
    });

    it("can change string value", function(done) {

        const changes = {"aString": "gugus"};
        const settingsAfter = _.merge({}, settings, changes);

        scope.get(endpoint())
            .reply(200, settings);

        scope.put(endpoint(), settingsAfter)
            .reply(200, undefined);

        scope.get(endpoint())
            .reply(200, settingsAfter);

        helper.makeBridgeInstance().setNodeServiceSettings(
            helper.nodeJsServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();
                expect(res).toEqual(settingsAfter);
                scope.done();
                done();
            }
        );
    });

    it("can change few values", function(done) {

        const changes = {
            "aString": "gugus",
            "aNumber": 1234,
            "anObject": {
                "anArray": [
                    "one",
                    "two",
                    "three"
                ]
            }
        };
        const settingsAfter = _.merge({}, settings, changes);

        scope.get(endpoint())
            .reply(200, settings);

        scope.put(endpoint(), settingsAfter)
            .reply(200, undefined);

        scope.get(endpoint())
            .reply(200, settingsAfter);

        helper.makeBridgeInstance().setNodeServiceSettings(
            helper.nodeJsServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();
                expect(res).toEqual(settingsAfter);
                scope.done();
                done();
            }
        );
    });
});
