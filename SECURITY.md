# Security policy

## Threat model

Timeline Manager is a **static, client-side application**. It has no backend, no
database, no user accounts and makes no network requests. There is no server to
attack and no service to take down.

Concretely:

- Project data is held in the browser's `localStorage` and in JSON files the user
  saves locally. Nothing is transmitted anywhere.
- No credentials, no API keys, no personal data are collected or stored.
- The only outbound request the page makes is to Google Fonts, for the Inter
  typeface, at load time.

The realistic risk surface is therefore:

1. **Malicious project files.** A `.json` file from an untrusted source is parsed
   and rendered. Input validation bugs matter here.
2. **Supply chain.** A compromised npm dependency shipped in the build.
3. **Cross-site scripting** through project content rendered into the page.
4. **A compromised deployment** of the hosted demo.

## Supported versions

Only the current `main` branch is supported. There are no maintained release
branches and no backports.

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private reporting:
[**Report a vulnerability**](https://github.com/ElProton/timeLineManager/security/advisories/new)

Include what you found, how to reproduce it, and what an attacker gains. A minimal
project file or a short sequence of steps is worth more than a scanner report.

## What to expect

Security reports are looked at ahead of everything else. That said, please read
[the maintenance policy](docs/MAINTENANCE.md): this is a low-maintenance project
with no dedicated security team and no guaranteed response time.

- If the report is valid and the fix is small, expect a patch.
- If the fix is large, expect the issue to be made public with a description of the
  risk and a workaround, so users can decide for themselves.

A fix you send yourself will always be faster than one you wait for.

## Out of scope

- Anything requiring physical or remote access to the user's own machine or browser
  profile. `localStorage` is readable by anyone with access to the browser: that is
  how browsers work, and the tool stores nothing sensitive.
- Missing security headers on the hosted demo, unless you can show real impact.
- Automated dependency scanner output with no demonstrated exploit path. Dependabot
  already tracks this.
