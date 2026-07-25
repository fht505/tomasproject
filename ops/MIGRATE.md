# Moving this into its own repo

This currently lives inside `fht505/fht` as `station/`. It is a separate
business and belongs in its own repository. Everything needed to do that is
below — it takes about two minutes and keeps the full commit history.

## 1. Make the empty repo

On GitHub: **New repository** → name it (e.g. `perpetua-orbital`) → Private is
fine → **no** README, **no** .gitignore, **no** license. It must be empty, or
step 3 needs an extra merge.

## 2. Split `station/` out, with its history

From the root of the `fht` clone:

```bash
git subtree split --prefix=station -b perpetua-only
```

That produces a branch whose root is `station/` — every commit that touched
this project, with paths rewritten, and nothing else from `fht`.

## 3. Push it

```bash
git push git@github.com:<you>/perpetua-orbital.git perpetua-only:main
```

## 4. Clone it fresh and fix the paths

```bash
git clone git@github.com:<you>/perpetua-orbital.git
cd perpetua-orbital
node ops/worker/fix-paths.mjs    # rewrites .gitignore for the new root
cd ops/worker && npm install
node ops.mjs doctor
```

`fix-paths.mjs` exists because `.gitignore` currently names paths like
`station/ops/state/*`, which stop matching once `station/` is the root. It
rewrites them and tells you what it changed. Run it once, commit, delete it if
you like.

## 5. Remove it from the fht repo

Only after the new repo is confirmed working:

```bash
cd ../fht
git rm -r --cached station
rm -rf station
git commit -m "Move the Perpetua Orbital project to its own repository"
git push
```

The history stays in `fht`'s past commits, which is fine — the working tree is
what matters.

---

## If `git subtree` is unavailable

History is not load-bearing here. A clean start is acceptable:

```bash
cp -r station ../perpetua-orbital
cd ../perpetua-orbital
node ops/worker/fix-paths.mjs
rm -rf ops/art ops/state/*.json ops/BATCH-01.listings.json ops/worker/node_modules
git init && git add -A && git commit -m "Perpetua Orbital — initial import"
git remote add origin git@github.com:<you>/perpetua-orbital.git
git push -u origin main
```

Check `git status` before that first commit and confirm `.env` is **not**
listed. It is gitignored, but it holds the Printify token and this is the one
moment the ignore rules are being rewritten.
