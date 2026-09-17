# Maintenance policy

Read this before opening an issue or a pull request. It tells you, honestly, what
to expect — so you never have to chase anyone to find out.

## The short version

This project is **community-driven and deliberately low-maintenance**.

It was built as an internal tool for live show production. That production activity
has wound down, so the original author no longer uses the tool daily and has very
little time for it. Rather than let it rot in a private repository, it has been
opened up so that anyone who needs it can use it, fork it and improve it.

**The project is not abandoned, and it is not actively developed either.** It works,
it is tested, and it will keep working. What it will not do is move quickly.

## What you can expect

| You do this             | You get this                                                               |
| ----------------------- | -------------------------------------------------------------------------- |
| Open a pull request     | A review, typically within a month. Green CI and a clear description help. |
| Open a bug report       | It stays open. It will be fixed when someone sends a fix — possibly you.   |
| Open a feature request  | It is labelled and added to the roadmap. Nobody is assigned to build it.   |
| Ask a usage question    | Other users may answer. There is no guaranteed response.                   |
| Report a security issue | See [SECURITY.md](../SECURITY.md). These are looked at first.              |

**An issue without a pull request may stay open for a very long time.** That is not
rudeness or neglect — it is the honest consequence of the time available. If a bug
blocks you, the fastest route by far is to send the fix yourself.

## What gets merged

A pull request is merged when all of these hold:

1. CI is green — `npm run verify` passes.
2. It does one thing, and the description says which thing and why.
3. It does not add a runtime dependency without justifying it.
4. It does not add a backend, an account system, telemetry or any network call.
   **The app runs entirely in the browser and stays that way.** This is the single
   hard constraint, because it is what keeps the project free to run and free to
   maintain.
5. Behaviour changes come with tests.
6. It does not narrow the tool back down to one industry — see
   [the roadmap](../ROADMAP.md) on staying generic.

A pull request that meets all six will be merged even if the maintainer would have
written it differently. Style preferences are not a blocking reason.

## Becoming a maintainer

This is the intended path, not a courtesy. The project is meant to outlive its
original author's involvement.

**Have three pull requests merged, then ask.** Open an issue titled
"Maintainer request" and you will be given commit access. No interview, no probation.

Maintainers may merge pull requests from others, triage issues, cut releases and
update the roadmap. Maintainers may not change the licence, and may not break the
"no backend, no accounts, no telemetry" rule — those two need the original author.

If you would rather not wait, **fork it**. The MIT licence exists precisely so you
do not need anybody's permission. A well-maintained fork is a good outcome, and a
link to it will be added to this file on request.

## Automation

As much as possible is automated, so that nothing waits on one person:

- **CI** runs typecheck, lint, format check, tests and build on every pull request,
  on Node 20 and 22.
- **Dependabot** proposes grouped dependency updates monthly.
- **The demo** is redeployed on every push to `main`.

If you find yourself waiting on a human for something a machine could decide, that
is a bug in this policy. Open an issue about it.
