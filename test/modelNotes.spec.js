let helper = require('./helper');
let nock = require('nock');

describe( "Model notes", function() {
    let scope;
    function endpoint(tail) {
        return `/bridge/rest/services/xuml/${helper.xUmlServiceInstance}${tail}`;
    }

    beforeEach(function() {
        scope = nock(helper.base);
    });

    afterAll(function() {
        nock.cleanAll();
    });

    it("can be listed", function (done) {

        const response = {
            "notes": [
                {
                    "name": helper.xUmlServiceInstance,
                    "href": `${helper.base}/bridge/rest/services/xuml/${helper.xUmlServiceInstance}/modelnotes/Model_119091974.txt`
                }
            ]
        };

        scope.get(endpoint('/modelnotes'))
            .reply(200, response);

        helper.makeBridgeInstance().getXUMLModelNotesList(helper.xUmlServiceInstance, function (err, list) {
            expect(err).toBeFalsy();
            expect(list.notes[0].name).toEqual(helper.xUmlServiceInstance);
            expect(list.notes[0].href).toMatch(`${helper.base}/bridge/rest/services/xuml/${helper.xUmlServiceInstance}/modelnotes/.*\\.((txt)|(html))`);
            scope.done();
            done();
        });
    });
});
