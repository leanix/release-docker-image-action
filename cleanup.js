const core = require('@actions/core');
const fs = require('fs');

(async () => {

    let dockerConfigDirectory = core.getState('dockerConfigDirectory');
    fs.rmdirSync(dockerConfigDirectory);

})();
