# Release Checklist

1. `git pull` to get latest in `master`
2. Look at `git log PREVIOUS_VERSION..origin/master`
  a. Determine whether the release has breaking changes or not
  b. update CHANGELOG as appropriate
3. Bump package.json version
4. Make a commit with the message `vVERSION`
5. Tag this commit as `vVERSION` (eg `v0.6.0`)
6. `npm publish --otp 2FA_TOKEN`
7. `git push && git push --tags`
