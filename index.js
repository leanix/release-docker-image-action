const core = require('@actions/core');
const exec = require('@actions/exec');
const git = require('simple-git/promise')();
const fs = require('fs');

(async () => {
    try {

        // Fail fast, we can only handle pushes to branches
        if (!process.env.GITHUB_REF || !process.env.GITHUB_REF.match(/^refs\/heads\//)) {
            throw new Exception("No branch given via process.env.GITHUB_REF");
        }

        // Define some parameters
        let name = core.getInput('name');
        if (name == "") {
            name = process.env.GITHUB_REPOSITORY;
        }
        const branch = process.env.GITHUB_REF.replace(/^refs\/heads\//, '');
        const normalisedBranch = branch.replace(/[\W]+/, '-');
        const versionTagPrefix = 'VERSION-' + normalisedBranch.toUpperCase() + '-';
        const currentCommit = process.env.GITHUB_SHA;
        let latestTag = normalisedBranch + "-latest";
        if (normalisedBranch == "master") {
            latestTag = "latest";
        }
        const nameWithLatestTag = name + ":" + latestTag;
        let currentVersion=0;
        let taggedCommit;
        let nextVersion;
        let path = core.getInput('path');
        let onlyOutputTags = core.getInput('only-output-tags') == 'true'
        let dockerfile = core.getInput('dockerfile');

        // Fetch tags and look for existing one matching the current versionTagPrefix
        await git.fetch(['--tags']);
        const tagsString = await git.tag(
            [
                '-l', versionTagPrefix + '*', // Only list tags that start with our version prefix...
                '--sort', '-v:refname' // ...and sort them in reverse
            ]
        );

        // If we found one, use it to update the current version and set the tagged commit
        if (tagsString.length > 0) {
            const tags = tagsString.split('\n');
            currentVersion=parseInt(tags[0].replace(versionTagPrefix, ''));
            taggedCommit = await git.show(['--pretty=format:%H', '-s', tags[0]]);
        }

        // If we found a tagged commit and it equals the current one, just reuse the version, otherwise tag a new version and push the tag
        if (taggedCommit == currentCommit) {
            core.info("Current commit is already tagged with version " + currentVersion);
            nextVersion = currentVersion;
        } else {
            if (onlyOutputTags) {
                throw new Error("only-output-tags mode can only be used if there has already been released an image for this commit.")
            }
            nextVersion = currentVersion + 1;
            core.info("Next version on branch " + branch + " is " + nextVersion);
            await git.tag([versionTagPrefix + nextVersion, process.env.GITHUB_REF]);
            await git.pushTags();
        }
        const versionTag = normalisedBranch + "-" + nextVersion
        const nameWithVersion = name + ":" + versionTag;

        if (!onlyOutputTags) {
            // Configure docker
            const dockerConfigDirectory = process.env.RUNNER_TEMP + "/docker_config_" + Date.now();
            fs.mkdirSync(dockerConfigDirectory);
            fs.writeFileSync(dockerConfigDirectory + "/config.json", JSON.stringify({
                auths: {
                    "https://index.docker.io/v1/": {
                        auth: Buffer.from(process.env.DOCKER_HUB_USERNAME + ':' + process.env.DOCKER_HUB_PASSWORD).toString('base64')
                    }
                }
            }));
            core.exportVariable('DOCKER_CONFIG', dockerConfigDirectory);

            // Now build the docker image tagged with the correct version and push it
            const options = {stdout: (data) => core.info(data.toString()), stderror: (data) => core.error(data.toString())};
            core.info("Will now build Dockerfile at " + path + " as " + nameWithVersion);
            dockerfile_param = ((dockerfile == "")? []: ["-f", dockerfile])
            await exec.exec('docker', ['build', '-t', nameWithVersion, ...dockerfile_param, path], options);
            await exec.exec('docker', ['push', nameWithVersion], options);

            // Also push a "latest" tag
            await exec.exec('docker', ['tag', nameWithVersion, nameWithLatestTag], options);
            await exec.exec('docker', ['push', nameWithLatestTag], options);
        }

        core.setOutput('tag', versionTag);
        core.setOutput('latest_tag', latestTag);
    } catch (e) {
        core.setFailed(e.message);
    }
})();
