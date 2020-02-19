const core = require('@actions/core');
const git = require('simple-git/promise')();
const docker = require('dockerode')();

(async () => {

    if (!process.env.GITHUB_REF || !process.env.GITHUB_REF.match(/^refs\/heads\//)) {
        core.error("No branch given via process.env.GITHUB_REF");
        process.exit(1);
    }

    const branch = process.env.GITHUB_REF.replace(/^refs\/heads\//, '');
    const normalisedBranch = branch.replace(/[\W]+/, '-');
    const versionTagPrefix = 'VERSION-' + normalisedBranch.toUpperCase() + '-';
    const currentCommit = process.env.GITHUB_SHA;

    await git.fetch(['--tags']);

    const tagsString = await git.tag(
        [
            '-l', versionTagPrefix + '*', // Only list tags that start with our version prefix...
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

    let path = core.getInput('path');
    let name = core.getInput('name');
    if (name == "") {
        name = process.env.GITHUB_REPOSITORY;
    }

    core.info("Will build Dockerfile at " + path + " as " + name + ":" + normalisedBranch + "-" + nextVersion);

})();
