# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.2](https://github.com/toto-castaldi/lumio/compare/v0.1.1...v0.1.2) (2025-12-30)


### Features

* **auth:** complete Phase 2 - Onboarding with OAuth and API Keys ([dee008e](https://github.com/toto-castaldi/lumio/commit/dee008e89a194bc4f5be1e63b8353ecd990a8254))
* **mobile:** add Sentry DSN to EAS build ([34bdc36](https://github.com/toto-castaldi/lumio/commit/34bdc364a18657da9f5f801cfe1f340b8862dad4))
* **web:** add logout button to setup API keys page ([bcf1d54](https://github.com/toto-castaldi/lumio/commit/bcf1d545cc6e8686167b88e661b6bf340a32ee02))


### Bug Fixes

* **api-keys:** handle HTTP errors in testApiKey function ([44a73f7](https://github.com/toto-castaldi/lumio/commit/44a73f739dcb7a3b7149b150c4c05e491a5985e5))
* **auth:** always refresh session before getting access token ([8bd0251](https://github.com/toto-castaldi/lumio/commit/8bd0251cde4cb36947d094d15d5d5be071f39e48))
* **auth:** auto-refresh expired access tokens ([ccfde1f](https://github.com/toto-castaldi/lumio/commit/ccfde1f748299952221dcccd0f6ef05a7e156220))
* **auth:** handle OAuth PKCE flow in callback page ([0c8af07](https://github.com/toto-castaldi/lumio/commit/0c8af07e63d3898b550f9dc601f372f1225df0a1))
* **auth:** initialize Supabase client synchronously ([6da4bc6](https://github.com/toto-castaldi/lumio/commit/6da4bc64f4ccea17a3f9eb7ee229e2d48c4f5c60))
* **ci:** add database migrations to deploy pipeline ([5b62191](https://github.com/toto-castaldi/lumio/commit/5b62191f888163ee0921b9bf0d27e93355143791))
* **ci:** deploy llm-proxy with --no-verify-jwt flag ([6374f67](https://github.com/toto-castaldi/lumio/commit/6374f675a1340e1203713ee439b59bc733e10782))
* **ci:** improve release check to avoid no-op releases ([294d5be](https://github.com/toto-castaldi/lumio/commit/294d5beec403f0f53401cfd18f409f866ce71cf3))
* **core:** prevent rate limiting on session refresh ([f3108c4](https://github.com/toto-castaldi/lumio/commit/f3108c473c5f46bea1593107e02789d122b99a7b))
* **edge-functions:** disable gateway JWT verification for llm-proxy ([1a84af9](https://github.com/toto-castaldi/lumio/commit/1a84af93d22430cda60cb59ba8e225276b47f5bb))
* **llm-proxy:** disable gateway JWT verification ([65a4682](https://github.com/toto-castaldi/lumio/commit/65a4682392a9da093bdb771e456b2b4fc64ad4cd))
* **mobile:** add Supabase env vars and Sentry crash reporting ([24d7247](https://github.com/toto-castaldi/lumio/commit/24d7247295e9e0b5eb2651f6bcbe1659d6fae894))
* **mobile:** disable Sentry auto upload in EAS builds ([0a5c734](https://github.com/toto-castaldi/lumio/commit/0a5c734da60472b338a0c5946993c2f3fe0f0ac2))
* **mobile:** disable Sentry sourcemap upload ([e6d0030](https://github.com/toto-castaldi/lumio/commit/e6d00307491d2ec04e1b3e8f759318ee3304ccff))
* sync package.json version to 0.1.1 ([773d2e5](https://github.com/toto-castaldi/lumio/commit/773d2e5152fc999a18a0961faa1a57c3bc2775ef))
* update lockfile after removing picker dependency ([1bab5f6](https://github.com/toto-castaldi/lumio/commit/1bab5f6191722a70398bc711cf7f07f1f27832bb))

### [0.1.3](https://github.com/toto-castaldi/lumio/compare/v0.1.2...v0.1.3) (2025-12-30)


### Features

* **mobile:** add Sentry DSN to EAS build ([34bdc36](https://github.com/toto-castaldi/lumio/commit/34bdc364a18657da9f5f801cfe1f340b8862dad4))
* **web:** add logout button to setup API keys page ([bcf1d54](https://github.com/toto-castaldi/lumio/commit/bcf1d545cc6e8686167b88e661b6bf340a32ee02))


### Bug Fixes

* **api-keys:** handle HTTP errors in testApiKey function ([44a73f7](https://github.com/toto-castaldi/lumio/commit/44a73f739dcb7a3b7149b150c4c05e491a5985e5))
* **auth:** always refresh session before getting access token ([8bd0251](https://github.com/toto-castaldi/lumio/commit/8bd0251cde4cb36947d094d15d5d5be071f39e48))
* **auth:** auto-refresh expired access tokens ([ccfde1f](https://github.com/toto-castaldi/lumio/commit/ccfde1f748299952221dcccd0f6ef05a7e156220))
* **auth:** handle OAuth PKCE flow in callback page ([0c8af07](https://github.com/toto-castaldi/lumio/commit/0c8af07e63d3898b550f9dc601f372f1225df0a1))
* **auth:** initialize Supabase client synchronously ([6da4bc6](https://github.com/toto-castaldi/lumio/commit/6da4bc64f4ccea17a3f9eb7ee229e2d48c4f5c60))
* **ci:** add database migrations to deploy pipeline ([5b62191](https://github.com/toto-castaldi/lumio/commit/5b62191f888163ee0921b9bf0d27e93355143791))
* **ci:** deploy llm-proxy with --no-verify-jwt flag ([6374f67](https://github.com/toto-castaldi/lumio/commit/6374f675a1340e1203713ee439b59bc733e10782))
* **ci:** improve release check to avoid no-op releases ([294d5be](https://github.com/toto-castaldi/lumio/commit/294d5beec403f0f53401cfd18f409f866ce71cf3))
* **core:** prevent rate limiting on session refresh ([f3108c4](https://github.com/toto-castaldi/lumio/commit/f3108c473c5f46bea1593107e02789d122b99a7b))
* **edge-functions:** disable gateway JWT verification for llm-proxy ([1a84af9](https://github.com/toto-castaldi/lumio/commit/1a84af93d22430cda60cb59ba8e225276b47f5bb))
* **llm-proxy:** disable gateway JWT verification ([65a4682](https://github.com/toto-castaldi/lumio/commit/65a4682392a9da093bdb771e456b2b4fc64ad4cd))
* **mobile:** add Supabase env vars and Sentry crash reporting ([24d7247](https://github.com/toto-castaldi/lumio/commit/24d7247295e9e0b5eb2651f6bcbe1659d6fae894))
* **mobile:** disable Sentry sourcemap upload ([e6d0030](https://github.com/toto-castaldi/lumio/commit/e6d00307491d2ec04e1b3e8f759318ee3304ccff))

### [0.1.2](https://github.com/toto-castaldi/lumio/compare/v0.1.1...v0.1.2) (2025-12-29)


### Features

* **auth:** complete Phase 2 - Onboarding with OAuth and API Keys ([dee008e](https://github.com/toto-castaldi/lumio/commit/dee008e89a194bc4f5be1e63b8353ecd990a8254))


### Bug Fixes

* sync package.json version to 0.1.1 ([773d2e5](https://github.com/toto-castaldi/lumio/commit/773d2e5152fc999a18a0961faa1a57c3bc2775ef))
* update lockfile after removing picker dependency ([1bab5f6](https://github.com/toto-castaldi/lumio/commit/1bab5f6191722a70398bc711cf7f07f1f27832bb))

### 0.1.1 (2025-12-29)


### Features

* **ci:** add automatic release on push to main ([303a726](https://github.com/toto-castaldi/lumio/commit/303a7262ca106c98580e9b436449a6d2d35e0d52))
* **versioning:** add version identifier system ([cac7030](https://github.com/toto-castaldi/lumio/commit/cac70303cca28c6258ade5fedc7f3da83936aaa4))
