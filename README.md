![OpenUI5 Starter Kit](https://github.com/pulseshift/openui5-gulp-starter-kit/raw/master/UI5StarterKit.png)

## Branch `nwabap`

`nwabap` is the *OpenUI5 Starter Kit* branch which allows a developer to upload SAPUI5/OpenUI5 sources into a SAP NetWeaver ABAP system as part of the Gulp task chain.

The upload functionality is powered by [gulp-nwabap-ui5uploader](https://github.com/ilcgmbh/gulp-nwabap-ui5uploader).

**Attention: In this exampple we use the `package.json` to store the user credentials for the SAP NetWeaver ABAP server. We recommend not to store any real credentials in any textfile of this repository. Hope this point is obvious.**

Info: The cache buster is not supported in combination with SAP NetWeaver upload, yet.

### How to use `nwabap` upload

In the `package.json` you will find the connection and authorization configuration for the SAP NetWeaver ABAP system:
```json
"ui5": {
    "cacheBuster": false,
    "nwabapUpload": {
      "conn": {
        "server": "http://myserver:8000"
      },
      "auth": {
        "user": "username",
        "pwd": "password"
      }
    }
}
```

Furthermore you can configure for each OpenUI5 app component an own BSP Destination (where to host the app on the SAP NetWeaver). Also this is done in the `ui5` section of the `packag.json`:
```json
"apps": [
      {
        "name": "app.todo",
        "path": "src/openui5-todo-app",
        "nwabapDestination": {
          "package": "$TMP",
          "bspcontainer": "ZZ_UI5_LOCAL",
          "bspcontainer_text": "UI5 upload local objects",
          "langauage": "EN"
        }
      }
    ]
```

## Quickstart

[![Greenkeeper badge](https://badges.greenkeeper.io/pulseshift/openui5-gulp-starter-kit.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/pulseshift/openui5-gulp-starter-kit.svg?branch=master)](https://travis-ci.org/pulseshift/ui5-lib-visualization)

[Download](https://github.com/pulseshift/openui5-gulp-starter-kit/archive/master.zip) or clone this repository:

```
git clone git@github.com:pulseshift/openui5-gulp-starter-kit.git
```

Please ensure that you have installed [node](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/en/docs/install) before you continue.

Install dependencies:

```
yarn
```

Start developing:
_Will build all resources start watcher task and start a HTTP server_

```
yarn start
```

The app should open in your browser automatically, otherwise open: `http://localhost:3000`

Info: To get a more detailed logging, just use `yarn start:verbose` instead.

## Overview

_OpenUI5 Starter Kit_ is an opinionated to-do app example as template for OpenUI5 web development. Containing a modern build infrastructure, tools and a set of best practices for building a great development experience and helping you to stay productive.

> A solid starting point for both professionals and newcomers to OpenUI5.

## Other branches

Please see also the seperated branches of this project, at the time these are:
* [nwabap](https://github.com/pulseshift/openui5-gulp-starter-kit/tree/nwabap) is the OpenUI5 Starter Kit branch which allows a developer to upload SAPUI5/OpenUI5 sources into a SAP NetWeaver ABAP system as part of the Gulp task chain

### Features

| Feature                                | Summary                                                                                                                                                                                                                                                     |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ❤ ES6/ES7 via Babel 6.0 | Compile [ES6/ES7](https://babeljs.io) into ES5 (supported by most browsers) with ease, bringing support for next generation JavaScript, today.                          |
| Less support                           | Compile [Less](http://lesscss.org) into CSS with ease, bringing support for variables, mixins and more.                                                                                                    |
| Consistent code formatting               | [Prettier](https://github.com/prettier/prettier) is an awesome opinionated code formatter used in many well known projects like Webpack, Babel or React. In this starter kit prettier re-formats your files that are marked as "staged" via git add before you commit. We recommend to [add also prettier as integration to your Editor](https://github.com/prettier/prettier) during development.                                                                                               |
| Built-in HTTP Server                   | An extendable [built-in server](https://www.browsersync.io) for previewing your site locally while you develop and iterate and the option to add API endpoints via a proxy to get around Access-Control-Allow-Origin (CORS) errors.                                                                                                                                                                            |
| Live Browser Reloading                 | Reload the browser in real-time anytime an edit is made without the need for an extension. (Run `yarn start` and edit your files)                                                                                                                           |
| Cross-device Synchronization           | Synchronize clicks, scrolls, forms and live-reload across multiple devices as you edit your project. Powered by [BrowserSync](http://browsersync.io). (Run `yarn start` and open up the IP provided on other devices on your network)                       |
| Production ready builds                     | Pre-configured build pipeline to create optimized assets, UI5 pre-loads etc. just as you would expect from a state of the art build process. All kind of UI5 asets are supported: App Components, Custom Themes, Control Libraries and non-UI5 assets roots. The structure of your project can be configured in your `package.json` in section `ui5`. _A detailed documentation of all options will follow soon._                                                                                                                                               |
| ⚡️ Reliable UI5 Cache-Buster                     | Ensure your users are always enjoying the latest version of your app. OpenUI5 provides only [solutions proprietary for SAP Gateway and SAP Cloud Platform](https://openui5.hana.ondemand.com/#docs/guide/91f080966f4d1014b6dd926db0e91070.html). In this project, we added a more reliable mechanism that is open source and available for any environment. But much more important, with our Gulp build script, it works right out of the box.                                                                                                                                              |
| A Hackable UI5 Build Process                     | Define in your `package.json` the source of your OpenUI5 library. Supported options are online CDN link, download URL of a prebuild library or a GitHub release link of OpenUI5. In all cases, the build process will handle the download, unzip and OpenUI5 build task by its own. Lean back and wait relaxed.                                                                                                                                            |
| Pre-configured linter (ESLint)                     | [ESLint](https://eslint.org) is a pluggable linting utility for JavaScript. It is pre-configured to work reliable and hand in hand with babel and prettier.                                                                                                                                           |

<!-- | Code Linting               | JavaScript code linting is done using [ESLint](http://eslint.org) - a pluggable linter tool for identifying and reporting on patterns in JavaScript. Run `yarn test` to lint your repository.                                                                         | -->

## Distribution

Start build:
_Will create a `dist` directory in your project root._

```
yarn build
```

Afterwards, the production app build can be tested by run `yarn start:dist`. The app should open in your browser automatically, otherwise open: `http://localhost:3000`

Info: To get a more detailed logging, just use `yarn build:verbose` instead.

### Contributing & Troubleshooting

Contributions, questions and comments are all welcome and encouraged.

Check our [current issues](https://github.com/pulseshift/openui5-gulp-starter-kit/issues) or, if you have something in mind how to make it better, [create your own issue](https://github.com/pulseshift/openui5-gulp-starter-kit/issues/new). We would be happy to discuss how they can be solved.

### Outlook

Here is a brief overview on what we are working right know and what will follow, soon. We are interested to hear your opinion on what should follow next.

Current idea backlog (unordered):

* Add a further project based on Webpack
* Add Facebooks flow type system with help of vagrant to support Windows machines, too
* Unit test and browser test framework
* Documentation generation via JSDoc
* Optimized OpenUI5 library modules (containing only these controls you used)
* I18N helper integration
* Detailed README for all package.json (section ui5) configuration options

### Credits

Rocket logo created by Hopkins from the Noun Project [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).

### License

This project is licensed under the MIT license.
Copyright 2017 [PulseShift GmbH](https://pulseshift.com/en/index.html)
