# LeanIX Release Docker Image Action

This very opinionated Github Action helps you to build a versioned docker image.

# Usage

```
uses: leanix/release-docker-image-action@master
id: build-image
with:
  name: leanix/foo # Optional, by default the name of the Github repository is used
  path: docker/    # Optional, path to a folder containing a Dockerfile, by default . is used
```

This action requires that you also use the "leanix/secrets-action@master".

# Details

The action will use *git tags* to manage a version that is used to tag the docker image. It will search for tags called "VERSION-BRANCH-NUMBER" on the current branch, where BRANCH is the name of the branch and NUMBER is a version. If it does not find one, it will start with version 1.
If it finds tags, it will use the highest version to determain the next version. It only does that though, if the highest tag is not already pointing to the changeset currently build.

```
$ git tags
VERSION-MASTER-1
VERSION-MASTER-2
VERSION-MASTER-3
VERSION-FEATURE-HOOK-1333-ADD-ACTION-1
VERSION-FEATURE-HOOK-1333-ADD-ACTION-2
```

In addition the action will also push/update a docker tag for the latest version of each branch:
* feature/HOOK-1333-ADD-ACTION => feature-hook-1333-add-action-latest
* master => latest

To use the generated image tags in one of the following steps, use the output variables "tag" or "latest_tag":

```
run: echo ${{ steps.build-image.outputs.tag }} ${{ steps.build-image.outputs.latest_tag }}
```


# Update Action

When you change the action code, use the script *update-dist.sh* to generate a compiled version of index.js containing all dependencies.

