let helper = require('./helper');
let nock = require('nock');

describe("Model notes", function() {
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

    it("can be listed", function(done) {

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

        helper.makeBridgeInstance().getXUMLModelNotesList(helper.xUmlServiceInstance, function(err, list) {
            expect(err).toBeFalsy();
            expect(list.notes[0].name).toEqual(helper.xUmlServiceInstance);
            expect(list.notes[0].href).toMatch(`${helper.base}/bridge/rest/services/xuml/${helper.xUmlServiceInstance}/modelnotes/.*\\.((txt)|(html))`);
            scope.done();
            done();
        });
    });

    it("can be downloaded", function(done) {

        helper.skipIntegration();

        const response =
            "Author:e2e.example.user.\n" +
            "Created:8/12/16 8:57 AM.\n" +
            "Title:.\n" +
            "Comment:.\n";

        scope.get(endpoint('/modelnotes/Model_119091974.txt'))
            .reply(200, response);

        helper.makeBridgeInstance().getXUMLModelNotes(helper.xUmlServiceInstance, 'Model_119091974.txt', function(err, notes) {
            expect(err).toBeFalsy();
            expect(notes).toEqual(response);
            scope.done();
            done();
        });

    });
});
