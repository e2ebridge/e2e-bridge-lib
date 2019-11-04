const bridge = require('../index');
const path = require('path');
const tmp = require('tmp');
const fs = require('fs');
const unzip = require('unzipper');

describe('Pack', function() {

    it('can git archive', function(done) {

        const outFile = tmp.fileSync().name;

        const expectedEntries = [
            'config/default/config.json',
            'index.js',
            'package.json'
        ];
        const actualEntries = [];

        bridge.pack(
            path.resolve(__dirname, 'data/NodeService'),
            {output: outFile, git: true},
            function(err) {
                expect(err).toBeFalsy();
                fs.createReadStream(outFile).pipe(unzip.Parse())
                    .on('entry', entry => {
                        if(entry.type === 'File') { // directories are not interesting
                            actualEntries.push(entry.path);
                        }
                        entry.autodrain();
                    })
                    .on('close', () => {
                        expect(actualEntries.sort()).toEqual(expectedEntries);
                        done();
                    });
            });
    });
});
