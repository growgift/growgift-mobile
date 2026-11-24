# Git Workflow

GrowGift uses three long-lived branches, promoted in one direction:

```
local  →  develop  →  staging  →  main
```

| Branch    | Purpose                                   |
|-----------|-------------------------------------------|
| `develop` | Day-to-day work. All changes land here.   |
| `staging` | Pre-production testing.                   |
| `main`    | Production code. Released only from `staging`. |

Never commit directly to `staging` or `main`. Code reaches them only through pull requests.

---

## 1. Clone the repo (first time only)

```bash
cd ~/Projects                  # or wherever you keep code
git clone https://github.com/growgift/growgift-mobile.git
cd growgift-mobile
```

## 2. Switch to `develop` and get the latest code

```bash
git checkout develop
git pull origin develop
```

If `main` has changes that `develop` doesn't (for example after a hotfix), bring them in too:

```bash
git pull origin main
```

## 3. Make your changes, then commit

```bash
git status                     # see what changed
git add -A
git commit -m "Describe the change"
```

## 4. Push to `develop`

```bash
git push origin develop
```

## 5. Promote on GitHub with pull requests

1. Open a pull request **`develop` → `staging`**. Merging it runs CI; a staging build is made with EAS (`eas build --profile staging`).
2. After testing on staging, open a pull request **`staging` → `main`**. Merging it is the production release; store builds are made from `main` with EAS (`eas build --profile production`).

---

## Every time you start work

```bash
git checkout develop
git pull origin develop
```

Always start from the latest `develop` before changing anything.

## Recommended branch protection

In **Settings → Branches** on GitHub, protect `staging` and `main`:

- Require a pull request before merging
- Require CI status checks to pass
- Block force pushes and deletions

## Pushing workflow files

Pushing changes under `.github/workflows/` needs a token with the **`workflow`** scope
(classic token) or **Workflows: Read and write** permission (fine-grained token).
With the GitHub CLI: `gh auth refresh -s workflow`.
