const core = require('@actions/core');
const git = require('simple-git')('.');

git.tag(
    ["--merged", process.env.GITHUB_REF],
    (tags) => core.debug(tags)
);
