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

            // Setup ssh...
            const home = process.env['HOME'];
            const homeSsh = home + '/.ssh';
            fs.mkdirSync(homeSsh, { recursive: true });
            fs.appendFileSync(homeSsh + '/known_hosts', '\ngithub.com ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==\n');
            fs.appendFileSync(homeSsh + '/known_hosts', '\ngithub.com ssh-dss AAAAB3NzaC1kc3MAAACBANGFW2P9xlGU3zWrymJgI/lKo//ZW2WfVtmbsUZJ5uyKArtlQOT2+WRhcg4979aFxgKdcsqAYW3/LS1T2km3jYW/vr4Uzn+dXWODVk5VlUiZ1HFOHf6s6ITcZvjvdbp6ZbpM+DuJT7Bw+h5Fx8Qt8I16oCZYmAPJRtu46o9C2zk1AAAAFQC4gdFGcSbp5Gr0Wd5Ay/jtcldMewAAAIATTgn4sY4Nem/FQE+XJlyUQptPWMem5fwOcWtSXiTKaaN0lkk2p2snz+EJvAGXGq9dTSWHyLJSM2W6ZdQDqWJ1k+cL8CARAqL+UMwF84CR0m3hj+wtVGD/J4G5kW2DBAf4/bqzP4469lT+dF2FRQ2L9JKXrCWcnhMtJUvua8dvnwAAAIB6C4nQfAA7x8oLta6tT+oCk2WQcydNsyugE8vLrHlogoWEicla6cWPk7oXSspbzUcfkjN3Qa6e74PhRkc7JdSdAlFzU3m7LMkXo1MHgkqNX8glxWNVqBSc0YRdbFdTkL0C6gtpklilhvuHQCdbgB3LBAikcRkDp+FCVkUgPC/7Rw==\n');

            // Now build the docker image tagged with the correct version and push it
            const options = {stdout: (data) => core.info(data.toString()), stderror: (data) => core.error(data.toString())};
            core.info("Will now build Dockerfile at " + path + " as " + nameWithVersion);
            dockerfile_param = ((dockerfile == "")? []: ["-f", dockerfile])
            await exec.exec('docker', ['build', '--ssh', 'default', '-t', nameWithVersion, ...dockerfile_param, path], options);
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
