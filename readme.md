![splitdiff](splitdiff.png)

Pretty split (side-by-side) diffs in your terminal!

## install

`npm i -g splitdiff`

## usage

Can be used via CLI or API.  Two different patterns: 

- `git diff HEAD~2 HEAD~1 | splitdiff`
- `splitdiff a b`

git diffs generally produce better results than the [built-in diff implementation](https://www.npmjs.com/package/diff).