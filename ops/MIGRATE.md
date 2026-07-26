# Repository move — record, and the one step still open

This project used to live inside `fht505/fht` as `station/`. It now has its
own repository, `fht505/tomasproject`, with the full commit history.

## What was done

```bash
# in the fht clone
git subtree split --prefix=station -b perpetua-only
git push https://github.com/fht505/tomasproject perpetua-only:main
```

`git subtree split` rewrites every commit that touched `station/` so that
directory becomes the repository root, and drops everything else. 17 commits
came across. `ops/`, `js/`, `css/`, `index.html`, `README.md` and
`START-HERE.md` now sit at the top level.

**The root `.gitignore` did not come with it** — it lived at `fht/.gitignore`,
one level *above* `station/`, so it was outside the split. That mattered: with
no ignore rules at the new root, the first `git add -A` here would have
committed `ops/worker/.env` (the Printify token), `ops/state/orders.json`
(redacted, but still per-shop runtime data) and every print master in
`ops/art/`. A `.gitignore` was written for the new root and verified against
real files — ten checks, five that must be ignored and five that must stay
tracked.

If you ever split another subdirectory out of a repo, that is the trap: ignore
rules living above the split prefix are silently left behind.

## Still open: remove it from `fht`

Do this only once you have confirmed this repo works on your machine —
`npm install`, `node ops.mjs doctor`, `npm test`.

```bash
cd <your fht clone>
git rm -r --cached station
rm -rf station
git commit -m "Move the Perpetua Orbital project to its own repository"
git push
```

The history stays in `fht`'s past commits, which is fine — the working tree is
what matters, and the full history lives here now.

## First run here

```bash
cd ops/worker
npm install
node ops.mjs doctor
node ops.mjs
```
