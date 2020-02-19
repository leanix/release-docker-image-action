const core = require('@actions/core');
const git = require('simple-git')('.');

core.info('hello world');

git.tag(
    ["--merged", process.env.GITHUB_REF],
    (tags) => core.info(tags)
);
