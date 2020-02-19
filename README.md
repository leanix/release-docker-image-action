# LeanIX Release Docker Image Action

This very opinionated Github Action helps you to build a versioned docker image.

# Usage

```
uses: leanix/release-docker-image-action@master
with:
  name: leanix/foo # Optional, by default the name of the Github repository is used
  path: docker/    # Optional, path to a folder containing a Dockerfile, by default . is used
```

# Details

The action will use *git tags* to manage a version that is used to tag the docker image. It will search for tags called "VERSION-<BRANCH>-<NUMBER>" on the current branch, where <BRANCH> is the name of the branch and <NUMBER> is a version. If it does not find one, it will start with version 1.
If it finds tags, it will use the highest version to determain the next version. It only does that though, if the highest tag is not already pointing to the changeset currently build.

```
$ git tags
VERSION-MASTER-1
VERSION-MASTER-2
VERSION-MASTER-3
VERSION-FEATURE-HOOK-1333-ADD-ACTION-1
VERSION-FEATURE-HOOK-1333-ADD-ACTION-2
```

# Update Action

When you change the action code, use the script *update-dist.sh* to generate a compiled version of index.js containing all dependencies.

