[![GitHub release](https://img.shields.io/github/tag/pulseshift/openui5-gulp-starter-kit.svg?style=flat)]()
<!-- [![Github All Releases](https://img.shields.io/github/downloads/pulseshift/openui5-gulp-starter-kit/total.svg?style=flat)]() -->
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat)](#badge)
[![made with love](https://img.shields.io/badge/made%20with%20love-❤-FF1744.svg?style=flat)]()

![OpenUI5 Starter Kit](https://github.com/pulseshift/openui5-gulp-starter-kit/raw/master/UI5StarterKit.png)

## Overview

*OpenUI5 Starter Kit* is an opinionated to-do app example as template for OpenUI5 web development. Containing a modern build infrastructure, tools and a bunch of best practices for building a great experience across many devices and helping you to stay productive.

> A solid starting point for both professionals and newcomers to OpenUI5.

## Quickstart

[Download](https://github.com/pulseshift/openui5-gulp-starter-kit/archive/master.zip) the kit or even better, clone this repository.

Please ensure that you have installed [node](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/en/docs/install) before you continue.

Install:
```
$ yarn
```
Start developing:
_Will build all resources start watcher task and start a HTTP server_
```
$ yarn build
```
App should open in your browser automatically: `http://localhost:3000`



### Features

| Feature                                | Summary                                                                                                                                                                                                                                                     |
|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Embracing diverse dev environments                     | tbd                                                                                                                                              |
| ❤ ES6/ES7 via Babel 6.0 | Compile [ES6/ES7](https://babeljs.io) into ES5 (supported by most browsers) with ease, bringing support for next generation JavaScript, today.                          |
| Less support                           | Compile [Less](http://lesscss.org) into CSS with ease, bringing support for variables, mixins and more.                                                                                                    |
| Consistent code formatting               | [Prettier](https://github.com/prettier/prettier) is an awesome opinionated code formatter used in many well known projects like Webpack, Babel or React. In this starter kit prettier re-formats your files that are marked as "staged" via git add before you commit. We recommend to [add also prettier as integration to your Editor](https://github.com/prettier/prettier) during development.                                                                                               |
| Built-in HTTP Server                   | An extendable [built-in server](https://www.browsersync.io) for previewing your site locally while you develop and iterate and the option to add API endpoints via a proxy to get around Access-Control-Allow-Origin (CORS) errors.                                                                                                                                                                            |
| Live Browser Reloading                 | Reload the browser in real-time anytime an edit is made without the need for an extension. (Run `yarn start` and edit your files)                                                                                                                           |
| Cross-device Synchronization           | Synchronize clicks, scrolls, forms and live-reload across multiple devices as you edit your project. Powered by [BrowserSync](http://browsersync.io). (Run `yarn start` and open up the IP provided on other devices on your network)                       |
| Production ready builds                     | tbd (gulp etc.what is the min. supported UI5 version = 1.40)                                                                                                                                              |
| Reliable UI5 Cache-Buster                     | tbd                                                                                                                                              |
| A Hackable UI5 Build Process                     | tbd                                                                                                                                              |

<!-- | Code Linting               | JavaScript code linting is done using [ESLint](http://eslint.org) - a pluggable linter tool for identifying and reporting on patterns in JavaScript. Run `yarn test` to lint your repository.                                                                         | -->

### Browser Support

At present, we officially aim to support the last two versions of the following browsers:

* Chrome
* Edge
* Firefox
* Safari
* Opera
* Internet Explorer 10+

This is not to say that OpenUI5 Starter Kit cannot be used in browsers older than those reflected, but merely that our focus will be on ensuring our build settings work great in the above.

### Contributing & Troubleshooting

Contributions, questions and comments are all welcome and encouraged.

This project is not yet polished and perfect, but it will be extended from time to time and anyone can contribute and make it better. Check our [current issues](https://github.com/pulseshift/openui5-gulp-starter-kit/issues) or, if you have something in mind how to make it better, [create your own issue](https://github.com/pulseshift/openui5-gulp-starter-kit/issues/new). We would be happy to discuss how they can be solved.

### Outlook

Here is a brief overview on what we are working right know and what will follow, soon. We are interested to hear your whishes and preferations, what should follow next.
- Add a further project based on Webpack instead of Gulp 4.0
- Add Facebooks flow type system with help of vagrant to support Windows machines, too
- Unit test and browser test framework
- Build process for custom UI5 control libraries
- Build process for custom UI5 themes
- Auto-documentation features via JSDoc
- Optimized OpenUI5 library modules (containing only these controls you used)
- Add ESLint best practice rule set for OpenUI5 compatible to prettier

### Credits

Rocket logo created by Hopkins from the Noun Project [CC BY 3.0 US](https://creativecommons.org/licenses/by/3.0/us/).

### License

This project is licensed under the MIT license.
Copyright 2017 [PulseShift GmbH](https://pulseshift.com/en/index.html)
