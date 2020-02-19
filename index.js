const core = require('@actions/core');
const git = require('simple-git/promise')();

(async () => {

    if (!process.env.GITHUB_REF) {
        core.error("No branch given via process.env.GITHUB_REF");
        process.exit(1);
    }

    const branch = process.env.GITHUB_REF.replace(/^refs\/heads\//, '');
    const normalisedBranch = branch.replace(/[\W]+/, '-').toUpperCase();
    const versionTagPrefix = 'VERSION-' + normalisedBranch + '-';
    const currentCommit = await git.show(['--pretty=format:%H', '-s', process.env.GITHUB_REF]);

    const tagsString = await git.tag(
        [
            '--merged', process.env.GITHUB_REF, // Only list tags on the current branch...
            '-l', versionTagPrefix + '*', // ...that start with our version prefix...
            '--sort', '-v:refname' // ...and sort them in reverse
        ]
    );

    let currentVersion=0;
    let taggedCommit;
    let nextVersion;

    if (tagsString.length > 0) {
        const tags = tagsString.split('\n');
        currentVersion=parseInt(tags[0].replace(versionTagPrefix, ''));

        taggedCommit = await git.show(['--pretty=format:%H', '-s', tags[0]]);
    }

    if (taggedCommit == currentCommit) {
        core.info("Current commit is already tagged with version " + currentVersion);
        nextVersion = currentVersion;
    } else {
        nextVersion=currentVersion + 1;
        core.info("Next version on branch " + branch + " is " + nextVersion);
        await git.tag([versionTagPrefix + nextVersion, process.env.GITHUB_REF]);
        await git.pushTags();
    }

})();
