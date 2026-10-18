# Gitea provider (self-hosted)

The `gitea` provider uses the instance REST API and Git directly. It needs no
separate platform CLI. Configure the full instance URL before joining a team:

```bash
export GITEA_URL=https://gitea.example.com
teamai init https://gitea.example.com/your-org/team.git --scope user
```

An unknown HTTP(S) host can be probed anonymously for a compatible version
endpoint. This only prints a configuration hint; it never authorizes sending a
token to that host. Set `GITEA_URL` and retry. This build does not map gitea.com
globally or claim Forgejo compatibility without a separate live verification.

## Authentication and URLs

Set `GITEA_TOKEN` to a Personal Access Token, or paste one at the hidden terminal
prompt during `init`. The token is verified with `GET /api/v1/user` before it is
saved to `~/.netrc` with mode `0600`. Non-interactive initialization requires an
existing env/netrc token and fails immediately when none is configured. An invalid
configured token fails with an actionable error rather than restarting login.

The token needs access to the repository, PRs/reviewers/comments, the user profile,
and any organization operations you use. Token scopes vary by server version:
verify them against that instance's API documentation. An administrator should
create the organization and team repository before member onboarding; a private
repository's ambiguous 404 is not treated as permission to create another one.

`GITEA_URL` preserves its HTTP(S) scheme, port and reverse-proxy subpath. HTTP
repository/PR URLs must match that complete origin and base path. Optional
`TEAMAI_GITEA_HOST` must name the same host, with the same HTTP port when supplied.
The SSH port may differ, but SSH aliases with a different hostname are not supported:

```bash
export GITEA_URL=https://gitea.example.com/sub/path
teamai init ssh://git@gitea.example.com:2222/your-org/team.git --scope user
```

SSH initialization still uses the PAT for platform identity; the clone and later
Git operations keep the SSH URL and use your key. For shallow imports with `--ssh`,
provide an explicit SSH URL including the port, rather than an HTTP URL whose SSH
port the CLI would have to guess.

REST uses `Authorization: token <PAT>`. HTTP Git uses Basic authentication with
the verified login and the token as password. The private team clone persists
those credentials in its origin URL so later bare `git push` works. Treat that
clone as credential-bearing. Shallow source clones use a one-off header instead.
Changing the env/netrc token does not replace a token already embedded in an
origin: update that private clone's credentials and verify both API and Git access.
TLS migration also requires updating saved remotes, not just `GITEA_URL`.

Netrc matches hostname, not port. Separate user directories or explicit credentials
are needed when several authenticated services share a hostname. Do not let test
instances overwrite another service's netrc entry.

## Sharing, import and permissions

`teamai push --all` pushes a branch, creates a PR, and requests the configured
reviewers by Gitea login. An existing PR is recovered using both repositories
and both branch refs, not only the head branch. Reviewers are requested separately:
a bad login prints a warning but does not discard the PR or other valid requests.

For a protected default branch, an administrator first initializes the TeamAI
skeleton and reviewer configuration, then enables protection. Members need write
access to their push branches and the reports/learnings branches, plus PR access;
ordinary membership does not need permission to push directly to main.

The 0.27 backport supports `teamai import --from-mr <instance>/org/repo/pulls/N`
for PR metadata, paginated commits and a bounded diff. A diff over 50 KiB is marked
incomplete. Required evidence failures stop import rather than yielding an empty
diff. Review discussions require the newer main-line implementation. Review generated learning drafts before sharing; successful generation does not prove the conclusions are supported by the source evidence. Gitea CI
extraction/comment commands and Gitea Actions templates are outside this provider.

Anonymous public repositories can be shallow-cloned and fetched. This does not
provide anonymous `teamai init`, member registration or push. `teamai doctor`
checks the configured URL and presence of a token; an actual API request verifies
whether the token is accepted.

## Migrating a generic Git team

Install a Gitea-capable build for all members before changing the shared manifest
to `provider: gitea`. A member can try the new provider first with
`teamai init <url> --provider gitea` while the team still uses `provider: git`.
An explicit local provider choice outranks the team manifest; reinitialize members
that previously opted into `--provider git`. Merge the team configuration change
through a PR and verify a regular member can create and update a PR automatically.

See [中文说明](gitea-provider.zh-CN.md).
