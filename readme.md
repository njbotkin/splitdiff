![splitdiff](splitdiff.png)

Pretty split (side-by-side) diffs in your terminal!

## install

`npm i splitdiff`

## usage

Can be used via CLI or API.  Two different patterns: 

- `git --no-pager diff HEAD~2 HEAD~1 | splitdiff`
- `splitdiff a b`

git diffs generally produce better results than the [built-in diff implementation](https://www.npmjs.com/package/diff).