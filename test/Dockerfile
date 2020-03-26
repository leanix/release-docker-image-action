# syntax=docker/dockerfile:experimental

FROM ubuntu

RUN echo "Building a test image..."
RUN apt-get update -y && apt-get install git -y
RUN --mount=type=ssh ssh-add -l
RUN mkdir -p ~/.ssh && ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts
RUN --mount=type=ssh git clone git@github.com:leanix/leanix-shared-libs-js.git