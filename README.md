# Pull Request QA Action
Github action for the ECO QA Process

This action currently automates:
- Adding labels to pull requests
- Sending messages to JIRA when PRs are ready for QA

TODO: Update repo name

## Inputs
 
`repo-token`: The repo token [**Required**]

## Example usage

```
name: "Pull Request Action"
on:
  pull_request_target:
    types: [opened, reopened, ready_for_review, converted_to_draft, closed, synchronize]
  pull_request_review:
    types: [submitted, dismissed]

jobs:
  pr-qa:
    runs-on: ubuntu-latest
    steps:
      - name: "Pull Request QA"
        uses: eco/autolabel@v1
        with:
          repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

## Contributing 

1. Clone the repo: `git clone https://github.com/bswaidner/autolabel`

2. Install dependencies:
`npm i` or `npm install`

## Deploy & Release

This repo uses [vercel](https://github.com/vercel/ncc) `ncc`  to build pre-compiled files for distribution.

1. Run `sh build.sh` to generate a new build.

2. Tag the latest build
```
git tag v1.x.x
git push --tags
```

3. Add a new release in [Github Releases](https://github.com/bswaidner/autolabel/releases)

4. Update the base release tag
```
git tag -d v1
git tag v1
git push -f --tags
```
