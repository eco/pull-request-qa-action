# autolabel

Github action for the ECO QA Process

This action automates:
- Adding labels to pull requests
- Sending messages to JIRA when PRs are ready for QA

## Inputs
 
`repo-token`: The repo token [**Required**]

## Example usage

```
uses: bswaidner/autolabel@v1
with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

## Deploy & Release

This repo uses [vercel](https://github.com/vercel/ncc) `ncc`  to compile build pre-compiled files for distribution.

1. Run `sh build.sh` to generate a new build.

2. Tag the latest build
```
git tag v1.x.x
git push --tags
```

3. Add a new release in [Github Releases](https://github.com/bswaidner/autolabel/releases)

4. Update the base release tag
```
git tag v1
git push --tags
```