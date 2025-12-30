# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [0.1.7](https://github.com/toto-castaldi/lumio/compare/lumio-v0.1.6...lumio-v0.1.7) (2025-12-30)


### Features

* **auth:** complete Phase 2 - Onboarding with OAuth and API Keys ([dee008e](https://github.com/toto-castaldi/lumio/commit/dee008e89a194bc4f5be1e63b8353ecd990a8254))
* cambia modello tra una carta e l'altra. vedi carta ([bd2b9e2](https://github.com/toto-castaldi/lumio/commit/bd2b9e22c04d815cbb7be6d14b0a4c089895b0ce))
* **ci:** add automatic release on push to main ([303a726](https://github.com/toto-castaldi/lumio/commit/303a7262ca106c98580e9b436449a6d2d35e0d52))
* continuos API key configuration ([4d9c7a5](https://github.com/toto-castaldi/lumio/commit/4d9c7a5847409ce4775a767f2935f12194fcc02b))
* first study flow. Random card ([035c842](https://github.com/toto-castaldi/lumio/commit/035c84224f835a04aa357767378c91d42e519bb4))
* github release-please introduction ([6ce3274](https://github.com/toto-castaldi/lumio/commit/6ce3274cdefc2bae10fbc7da1ad5553eeb37ce1b))
* mobile as PWA ([ba1ad8d](https://github.com/toto-castaldi/lumio/commit/ba1ad8de209aa021504f88f5bba561583fa57d38))
* **mobile:** add Google OAhth on PWA ([1877891](https://github.com/toto-castaldi/lumio/commit/1877891a98ed67f1d168801dd720fb9d4146127f))
* **mobile:** add Sentry DSN to EAS build ([34bdc36](https://github.com/toto-castaldi/lumio/commit/34bdc364a18657da9f5f801cfe1f340b8862dad4))
* **pwa auto update:** pwa auto update ([e1b2491](https://github.com/toto-castaldi/lumio/commit/e1b2491369ab3bf6e120969a28d5433abeea65d0))
* reload of card deks. Triggered via external n8n service ([8d9bfb3](https://github.com/toto-castaldi/lumio/commit/8d9bfb3fb56ab9d7e9cf1e16abae7537d3065ad6))
* **versioning:** add version identifier system ([cac7030](https://github.com/toto-castaldi/lumio/commit/cac70303cca28c6258ade5fedc7f3da83936aaa4))
* **web:** add logout button to setup API keys page ([bcf1d54](https://github.com/toto-castaldi/lumio/commit/bcf1d545cc6e8686167b88e661b6bf340a32ee02))
* **web:** implement Phase 3 - public repositories and cards management ([baa3c12](https://github.com/toto-castaldi/lumio/commit/baa3c12a9f019e9ad913fa0a48f623788db79346))


### Bug Fixes

* **api-keys:** handle HTTP errors in testApiKey function ([44a73f7](https://github.com/toto-castaldi/lumio/commit/44a73f739dcb7a3b7149b150c4c05e491a5985e5))
* **auth:** always refresh session before getting access token ([8bd0251](https://github.com/toto-castaldi/lumio/commit/8bd0251cde4cb36947d094d15d5d5be071f39e48))
* **auth:** auto-refresh expired access tokens ([ccfde1f](https://github.com/toto-castaldi/lumio/commit/ccfde1f748299952221dcccd0f6ef05a7e156220))
* **auth:** handle OAuth PKCE flow in callback page ([0c8af07](https://github.com/toto-castaldi/lumio/commit/0c8af07e63d3898b550f9dc601f372f1225df0a1))
* **auth:** initialize Supabase client synchronously ([6da4bc6](https://github.com/toto-castaldi/lumio/commit/6da4bc64f4ccea17a3f9eb7ee229e2d48c4f5c60))
* **ci:** add database migrations to deploy pipeline ([5b62191](https://github.com/toto-castaldi/lumio/commit/5b62191f888163ee0921b9bf0d27e93355143791))
* **ci:** deploy git-sync with --no-verify-jwt flag ([016ae36](https://github.com/toto-castaldi/lumio/commit/016ae3640263d227fc3394dbdd97f1fc558edc11))
* **ci:** deploy llm-proxy with --no-verify-jwt flag ([6374f67](https://github.com/toto-castaldi/lumio/commit/6374f675a1340e1203713ee439b59bc733e10782))
* **ci:** improve release check to avoid no-op releases ([294d5be](https://github.com/toto-castaldi/lumio/commit/294d5beec403f0f53401cfd18f409f866ce71cf3))
* **ci:** use repository variable for DB backup condition ([0418069](https://github.com/toto-castaldi/lumio/commit/0418069f9a73b34c24f3f1557a448d20a2f71a82))
* **ci:** use supabase db dump instead of pg_dump ([047d395](https://github.com/toto-castaldi/lumio/commit/047d395f589c026b9efb5f6949bbc8324dbd54ad))
* **core:** add apikey header to edge function calls ([2ad457d](https://github.com/toto-castaldi/lumio/commit/2ad457dcadeb178779b4d3a1776f16c935c666b1))
* **core:** prevent rate limiting on session refresh ([f3108c4](https://github.com/toto-castaldi/lumio/commit/f3108c473c5f46bea1593107e02789d122b99a7b))
* **edge-functions:** disable gateway JWT verification for llm-proxy ([1a84af9](https://github.com/toto-castaldi/lumio/commit/1a84af93d22430cda60cb59ba8e225276b47f5bb))
* **llm-proxy:** disable gateway JWT verification ([65a4682](https://github.com/toto-castaldi/lumio/commit/65a4682392a9da093bdb771e456b2b4fc64ad4cd))
* mobile login ([b3d000f](https://github.com/toto-castaldi/lumio/commit/b3d000fbd2ea866aa6aa199e4d7dbd8b33ee059f))
* mobile login debug ([de83b72](https://github.com/toto-castaldi/lumio/commit/de83b72308f109bdeabf688c726673b8bcc41404))
* mobile login debug - 01 ([35b8684](https://github.com/toto-castaldi/lumio/commit/35b8684b326b2712507239baae044ccca9df7136))
* mobile login debug - 02 ([bd0d55d](https://github.com/toto-castaldi/lumio/commit/bd0d55da9ecbd36109673eeef88f20776012a7ea))
* mobile login debug - 03 ([aa914e3](https://github.com/toto-castaldi/lumio/commit/aa914e39fa3a72cb968e903b85383ed92400f084))
* **mobile:** add Supabase env vars and Sentry crash reporting ([24d7247](https://github.com/toto-castaldi/lumio/commit/24d7247295e9e0b5eb2651f6bcbe1659d6fae894))
* **mobile:** disable Sentry auto upload in EAS builds ([0a5c734](https://github.com/toto-castaldi/lumio/commit/0a5c734da60472b338a0c5946993c2f3fe0f0ac2))
* **mobile:** disable Sentry sourcemap upload ([e6d0030](https://github.com/toto-castaldi/lumio/commit/e6d00307491d2ec04e1b3e8f759318ee3304ccff))
* rerun ([c112594](https://github.com/toto-castaldi/lumio/commit/c1125943ab01da191db8fa6fe01867163a1902ac))
* sync package.json version to 0.1.1 ([773d2e5](https://github.com/toto-castaldi/lumio/commit/773d2e5152fc999a18a0961faa1a57c3bc2775ef))
* try to have a correct version bump system ([2cb982c](https://github.com/toto-castaldi/lumio/commit/2cb982c25ed8eb8c9e8abffca3aabc900611b49d))
* una fix ([a361596](https://github.com/toto-castaldi/lumio/commit/a3615969077e1afe19cb0032a5d0b20278ede211))
* update lockfile after removing picker dependency ([1bab5f6](https://github.com/toto-castaldi/lumio/commit/1bab5f6191722a70398bc711cf7f07f1f27832bb))
* **version system:** version system reset ([b3ab1f3](https://github.com/toto-castaldi/lumio/commit/b3ab1f3c59f22e98ef2aac0029e3053cffdcb72d))

### [0.1.7](https://github.com/toto-castaldi/lumio/compare/v0.1.6...v0.1.7) (2025-12-30)


### Features

* cambia modello tra una carta e l'altra. vedi carta ([bd2b9e2](https://github.com/toto-castaldi/lumio/commit/bd2b9e22c04d815cbb7be6d14b0a4c089895b0ce))

### [0.1.6](https://github.com/toto-castaldi/lumio/compare/v0.1.5...v0.1.6) (2025-12-30)


### Features

* first study flow. Random card ([035c842](https://github.com/toto-castaldi/lumio/commit/035c84224f835a04aa357767378c91d42e519bb4))

### [0.1.5](https://github.com/toto-castaldi/lumio/compare/v0.1.4...v0.1.5) (2025-12-30)


### Features

* **mobile:** add Google OAhth on PWA ([1877891](https://github.com/toto-castaldi/lumio/commit/1877891a98ed67f1d168801dd720fb9d4146127f))

### [0.1.4](https://github.com/toto-castaldi/lumio/compare/v0.1.3...v0.1.4) (2025-12-30)


### Bug Fixes

* try to have a correct version bump system ([2cb982c](https://github.com/toto-castaldi/lumio/commit/2cb982c25ed8eb8c9e8abffca3aabc900611b49d))

### [0.1.3](https://github.com/toto-castaldi/lumio/compare/v0.1.2...v0.1.3) (2025-12-30)


### Features

* reload of card deks. Triggered via external n8n service ([8d9bfb3](https://github.com/toto-castaldi/lumio/commit/8d9bfb3fb56ab9d7e9cf1e16abae7537d3065ad6))

### [0.1.2](https://github.com/toto-castaldi/lumio/compare/v0.1.1...v0.1.2) (2025-12-30)


### Features

* **pwa auto update:** pwa auto update ([e1b2491](https://github.com/toto-castaldi/lumio/commit/e1b2491369ab3bf6e120969a28d5433abeea65d0))

### [0.1.1](https://github.com/toto-castaldi/lumio/compare/v0.1.0...v0.1.1) (2025-12-30)


### Bug Fixes

* **version system:** version system reset ([b3ab1f3](https://github.com/toto-castaldi/lumio/commit/b3ab1f3c59f22e98ef2aac0029e3053cffdcb72d))
