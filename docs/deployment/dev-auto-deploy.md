# Automatic Dev Deployment

Every push to `dev` follows one guarded path:

1. GitHub checks out the exact commit.
2. GitHub installs dependencies, builds, tests, and lints.
3. A failed check stops the workflow before SSH is used.
4. A successful check connects to the German Debian server.
5. The server checkout is pinned to the exact commit GitHub tested.
6. The server installs dependencies and builds again in its real environment.
7. `thehowlingwhispers-dev.service` restarts.
8. The workflow checks `https://sandbox.thehowlingwhispers.com` for HTTP 200 and confirms its referenced JavaScript bundle is available.
9. Any server build, restart, page, or bundle failure restores the previous commit and restarts it.

The workflow never updates `main`, the live checkout, or `thehowlingwhispers.service`.

## Required GitHub repository secrets

Configure these under repository Settings, Secrets and variables, Actions:

| Secret | Value |
|---|---|
| `HW_DEV_SSH_HOST` | German server hostname or IP address |
| `HW_DEV_SSH_USER` | Restricted deployment SSH user |
| `HW_DEV_SSH_PRIVATE_KEY` | Private half of the deployment key |
| `HW_DEV_SSH_KNOWN_HOSTS` | Optional trusted `known_hosts` line for this server |
| `HW_DEV_SSH_PORT` | Optional SSH port. Port 22 is used when omitted. |

The application directory, service, branch, and health URL are intentionally fixed in the workflow:

- `/var/www/hw/dev`
- `thehowlingwhispers-dev.service`
- `dev`
- `https://sandbox.thehowlingwhispers.com`

## Server requirements

- The deployment user can read and update `/var/www/hw/dev`.
- The checkout can run `git fetch origin dev` without interactive credentials.
- Node 22, npm, Git, and curl are installed.
- The deployment user may run only these service commands without an interactive sudo password:
  - `systemctl restart thehowlingwhispers-dev.service`
  - `systemctl is-active --quiet thehowlingwhispers-dev.service`

Do not grant unrestricted passwordless sudo to the deployment user.

## Trusted host key

Generate the `HW_DEV_SSH_KNOWN_HOSTS` value from a trusted computer that has already verified the server identity:

```bash
ssh-keyscan -H SERVER_HOST
```

For a custom SSH port:

```bash
ssh-keyscan -p SERVER_PORT -H SERVER_HOST
```

Compare the fingerprint with the server before saving it as a GitHub secret. When this optional secret is absent, the workflow falls back to `ssh-keyscan` so an existing deployment setup continues to work.

## Verification

The next commit pushed to `dev` should show two jobs in `Howling Whispers CI`:

- `Build and test`
- `Refresh German dev server`

The second job must show the approved commit SHA, service restart, HTTP 200 result, and served bundle name.
