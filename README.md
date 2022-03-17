# EcoLabeler

This action automatically applies labels to pull requests according to the Eco QA process

## Inputs
 
`repo-token`: The repo token [**Required**]

## Example usage

```
uses: bswaidner/EcoLabeler@v1
with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
```
