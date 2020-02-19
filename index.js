const core = require('@actions/core');
const git = require('simple-git')('.');

console.log('hello world');

git.tag(
    ["--merged", process.env.GITHUB_REF],
    (tags) => console.log(tags)
);
