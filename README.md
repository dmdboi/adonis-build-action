# Adonis Build Action

A Github Action for building Adonis projects and optionally pushing it to a different branch

## Usage

```
name: Build
on:
    push:
        branches:
            - main
jobs:
    build:
        runs-on: ubuntu-latest
        steps:
            - name: Checkout project
              uses: actions/checkout@v3
            - name: Build and push
              uses: dmdboi/adonis-build-action
              with:
                pushToBranch: true # optional; can either be true or false | defaults to false
                branch: 'dist' # optional; the name of the branch the action should push the compiled code to | defaults to dist
                githubToken: ${{ secrets.GITHUB_TOKEN }} # required if you use the pushToBranch option
```

## Credit

Inspired by @alexthemasters [action-build-typescript](https://github.com/alexthemaster/action-build-typescript)
