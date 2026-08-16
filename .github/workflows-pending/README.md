# Pending workflow

`ci.yml` belongs at `.github/workflows/ci.yml`. It is parked here because the
token used to push this branch lacks GitHub's `workflow` scope, and GitHub
rejects any push that creates or edits a file under `.github/workflows/`
without it.

To activate it:

```bash
gh auth refresh -s workflow          # one-time, opens a browser
mkdir -p .github/workflows
git mv .github/workflows-pending/ci.yml .github/workflows/ci.yml
rmdir .github/workflows-pending 2>/dev/null || rm -rf .github/workflows-pending
git commit -am "Activate CI workflow"
git push
```

Nothing else depends on its location — the workflow only runs `npm run build`
and `npm run check`, both of which work locally today.
