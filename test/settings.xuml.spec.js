let helper = require('./helper');
let nock = require('nock');
const path = require('path');

function makeChangedSettings(settings, changes) {
    // this will crash beautifully if setting not found. It's OK in test.
    const result = JSON.parse(JSON.stringify(settings)); // deep copy
    Object.keys(changes).forEach(c => {
        result.find(s => s.id === c).currentValue = '' + changes[c];
    });
    return result;
}

describe('xUML settings', function() {
    let scope;

    function serviceUriPath(serviceType, serviceName, tail) {
        return `/bridge/rest/services/${serviceType}/${serviceName}${tail}`;
    }

    const settings = [
        {
            "id": "ALIAS_SendTicks_RepeatInterval",
            "label": "SendTicks: RepeatInterval: ",
            "section": "Timer / Event Observer Service",
            "currentValue": "PT5S",
            "originalValueInModel": "PT5S"
        },
        {
            "id": "addOn_Timer_Switch",
            "label": "Switched Off (true/false)",
            "section": "Timer / Event Observer Service",
            "currentValue": "false",
            "originalValueInModel": "false"
        },
        {
            "id": "ALIAS_SendTicks_QueuedEvents",
            "label": "SendTicks: QueuedEvents: ",
            "section": "Timer / Event Observer Service",
            "currentValue": "1",
            "originalValueInModel": "1"
        }
    ];

    function compareSettings(received, required) {
        const transform = (dst, src) => {
            dst[src['id']] = src;
            return dst;
        };
        const req = required.reduce(transform, {});
        const rec = received.filter(r => req[r['id']]).reduce(transform, {});
        expect(rec).toEqual(req);
    }

    function endpoint() {
        return serviceUriPath('xuml', helper.xUmlServiceInstance, '/settings');
    }

    beforeAll(function(done) {
        if(!helper.integrationEnabled()) {
            return done();
        }

        const repository = path.resolve(__dirname, `data/${helper.xUmlServiceInstance}.rep`);
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

        const changes = settings.reduce((acc, s) => {
            acc[s['id']] = s['originalValueInModel'];
            return acc;
        }, {});

        helper.makeBridgeInstance().setXUMLServiceSettings(
            helper.xUmlServiceInstance,
            changes,
            (/*err, res*/) => done());
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it('can query', function(done) {

        scope.get(endpoint())
            .reply(200, {
                setting: settings
            });

        helper.makeBridgeInstance().getXUMLServiceSettings(helper.xUmlServiceInstance, function(err, res) {
            expect(err).toBeFalsy();
            compareSettings(res['setting'], settings);
            scope.done();
            done();
        });
    });

    it("can change string value", function(done) {

        const changes = {"ALIAS_SendTicks_RepeatInterval": "PT10S"};
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(endpoint())
            .reply(200, {
                setting: settings
            });

        scope.put(endpoint(), {
            setting: [{id: "ALIAS_SendTicks_RepeatInterval", currentValue: "PT10S"}]
        })
            .reply(200, undefined);

        scope.get(endpoint())
            .reply(200, {
                setting: settingsAfter
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();
                compareSettings(res['setting'], settingsAfter);
                scope.done();
                done();
            }
        );
    });

    it('can change boolean value', function(done) {

        const changes = {"addOn_Timer_Switch": "true"};
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(endpoint())
            .reply(200, {
                setting: settings
            });

        scope.put(endpoint(), {
            setting: [{id: "addOn_Timer_Switch", currentValue: "true"}]
        })
            .reply(200, undefined);

        scope.get(endpoint())
            .reply(200, {
                setting: settingsAfter
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();
                compareSettings(res['setting'], settingsAfter);
                scope.done();
                done();
            }
        );
    });

    it('can change number value', function(done) {

        const changes = {"ALIAS_SendTicks_QueuedEvents": "5"};
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(endpoint())
            .reply(200, {
                setting: settings
            });

        scope.put(endpoint(), {
            setting: [{id: "ALIAS_SendTicks_QueuedEvents", currentValue: "5"}]
        })
            .reply(200, undefined);

        scope.get(endpoint())
            .reply(200, {
                setting: settingsAfter
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();
                compareSettings(res['setting'], settingsAfter);
                scope.done();
                done();
            }
        );
    });

    it('can change multiple values', function(done) {
        const changes = {
            "addOn_Timer_Switch": "false",
            "ALIAS_SendTicks_QueuedEvents": "128",
            "ALIAS_SendTicks_RepeatInterval": "PT128S"
        };
        const settingsAfter = makeChangedSettings(settings, changes);

        scope.get(endpoint())
            .reply(200, {
                setting: settings
            });

        scope.put(endpoint(), {
            setting: [
                {id: "addOn_Timer_Switch", currentValue: "false"},
                {id: "ALIAS_SendTicks_QueuedEvents", currentValue: "128"},
                {id: "ALIAS_SendTicks_RepeatInterval", currentValue: "PT128S"}
            ]
        })
            .reply(200, undefined);

        scope.get(endpoint())
            .reply(200, {
                setting: settingsAfter
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeFalsy();
                compareSettings(res['setting'], settingsAfter);

                scope.done();
                done();
            }
        );
    });

    it('can\'t change unknown setting', function(done) {

        const changes = {"gugus": "whatever"};

        scope.get(endpoint())
            .reply(200, {
                setting: settings
            });

        helper.makeBridgeInstance().setXUMLServiceSettings(helper.xUmlServiceInstance,
            changes,
            function(err, res) {
                expect(err).toBeTruthy();
                expect(err['errorType']).toEqual('Usage error');
                scope.done();
                done();
            }
        );
    });
});
