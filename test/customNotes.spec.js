let helper = require('./helper');
let nock = require('nock');
const path = require('path');

describe("Custom notes", function() {
    let scope;

    function endpoint() {
        return `/bridge/rest/services/xuml/${helper.xUmlServiceInstance}/customnotes`;
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

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

    afterAll(function() {
        nock.cleanAll();
    });

    const referenceNotes = "<h1>This model is awesome!</h1>";

    it("can upload and download", function(done) {

        scope.put(endpoint(), referenceNotes)
            .reply(200, undefined);

        helper.makeBridgeInstance().setXUMLCustomNotes(
            helper.xUmlServiceInstance,
            referenceNotes,
            function(err) {
                expect(err).toBeFalsy();

                scope.get(endpoint())
                    .reply(200, referenceNotes);

                helper.makeBridgeInstance().getXUMLCustomNotes(
                    helper.xUmlServiceInstance,
                    function(err, notes) {
                        expect(err).toBeFalsy();
                        expect(notes).toEqual(referenceNotes);
                        scope.done();
                        done();
                    });
            });

    });
});
