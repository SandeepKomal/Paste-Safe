# Security

## Reporting a problem

If Paste-Safe **misses a kind of secret**, open an issue with a description of the format and a **fake** example. Never post a real secret, even an expired one.

If you find a way for the page to **leak data** (send a request, run pasted content as code, or bypass the Content-Security-Policy), please report it privately through GitHub's **Security → Report a vulnerability** on this repository instead of opening a public issue.

## What Paste-Safe protects against

- Accidentally pasting known secret formats, IPs, emails and internal hostnames into an AI chat.

## What it does not protect against

- Secrets in formats no rule recognises and that don't look random.
- Business-sensitive text that isn't a credential, such as customer names or internal project names.
- A compromised browser or browser extension, which can read anything on the page.

Always read the safe text before sharing it.
