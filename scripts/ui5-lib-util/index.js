/* @flow */
/* eslint-env node */

const gulp = require('gulp')
const execSync = require('child_process').execSync
const download = require('gulp-download')
const unzip = require('gulp-unzip')
const fs = require('fs')
const path = require('path')
const minimatch = require('minimatch')
const ui5preload = require('gulp-ui5-preload')
const lessOpenUI5 = require('less-openui5')
const gulpif = require('gulp-if')
const rename = require('gulp-rename')
const tap = require('gulp-tap')
const uglify = require('gulp-uglify')
const cleanCSS = require('gulp-clean-css')
const gutil = require('gulp-util')
// const mkdirp = require('mkdirp');

/* =========================================================== */
/* checkout OpenUI5                                            */
/* =========================================================== */

// clone required ui5 version from git repository
exports.checkoutUI5 = function(
  sUi5Version = '1.40.0',
  sTargetPath = './ui5',
  cb
) {
  // timestamps
  let iTimestamp = Date.now()

  // start checkout
  gutil.log('Starting', gutil.colors.cyan(`checkout UI5 ${sUi5Version}`), '...')

  // check if ui5 library was already cloned from remote repository
  if (!fs.existsSync(`${sTargetPath}/${sUi5Version}`)) {
    // 1. clear old ui5 repo
    execSync(`rm -rf ${sUi5Version}`, { cwd: sTargetPath, stdio: [0, 0, 0] })

    // 2. git clone git@bitbucket.org:pulseshift/ui5.git in ~/pulseshift/git/sensum/resources
    execSync('git clone git@bitbucket.org:pulseshift/ui5.git', {
      cwd: sTargetPath,
      stdio: [0, 0, 0]
    })

    // 3. rename git repository folder to target ui5 version
    execSync(`mv ui5 ${sUi5Version}`, { cwd: sTargetPath, stdio: [0, 0, 0] })

    // 4. git checkout openui5-1.40.2 in ~/pulseshift/git/sensum/resources/ui5
    execSync(`git checkout openui5-${sUi5Version}`, {
      cwd: `${sTargetPath}/${sUi5Version}`,
      stdio: [0, 0, 0]
    })

    // log finished msg
    gutil.log(
      'Finished',
      gutil.colors.cyan(`checkout UI5 ${sUi5Version}`),
      'after',
      gutil.colors.magenta(
        `${Math.round((Date.now() - iTimestamp) / 100) / 10} s`
      )
    )

    // 5. call callback
    cb(true) // return true if UI5 lib have been checked out
  } else {
    gutil.log(
      'Finished',
      gutil.colors.cyan(`checkout UI5 ${sUi5Version}`),
      'after',
      gutil.colors.magenta(
        `${Math.round((Date.now() - iTimestamp) / 100) / 10} s`
      ),
      '(directory',
      gutil.colors.cyan(`${sTargetPath}/${sUi5Version}`),
      'already exist)'
    )
    cb(false)
  }
}

/* =========================================================== */
/* download OpenUI5                                            */
/* =========================================================== */

// download open ui5 repository from CDN and unzip
exports.downloadUI5 = function(
  sUi5Version = '1.40.0',
  sDownloadUrl,
  sTargetPath = './ui5',
  cb
) {
  // timestamps
  let iTimestamp = Date.now()

  // start download
  gutil.log(
    'Starting',
    gutil.colors.cyan(`download UI5 ${sUi5Version}`),
    '... (unzip could take a couple of minutes, so please be patient after download)'
  )

  // check if ui5 library was already downloaded and ectracted
  if (!fs.existsSync(`${sTargetPath}/download-${sUi5Version}`)) {
    // 1. remove existing downloads
    execSync(`rm -rf ${sUi5Version}.zip download-${sUi5Version}`, {
      cwd: sTargetPath,
      stdio: [0, 0, 0]
    })

    // 2. download and unzip sources
    download(sDownloadUrl)
      .pipe(unzip())
      .pipe(gulp.dest(sTargetPath))
      .on('end', () => {
        // 3. rename downloaded ui5 directory fro openui5-VERSION to download-VERSION
        try {
          execSync(`mv openui5-${sUi5Version} download-${sUi5Version}`, {
            cwd: sTargetPath,
            stdio: [0, 0, 0]
          })
        } catch (e) {
          // folder doesn't exist or was renamed manually
        }
        // log finished msg
        gutil.log(
          'Finished',
          gutil.colors.cyan(`download UI5 ${sUi5Version}`),
          'after',
          gutil.colors.magenta(
            `${Math.round((Date.now() - iTimestamp) / 100) / 10} s`
          )
        )
        cb()
      })
  } else {
    gutil.log(
      'Finished',
      gutil.colors.cyan(`download UI5 ${sUi5Version}`),
      'after',
      gutil.colors.magenta(
        `${Math.round((Date.now() - iTimestamp) / 100) / 10} s`
      ),
      '(directory',
      gutil.colors.cyan(`${sTargetPath}/download-${sUi5Version}`),
      'already exist)'
    )
    cb()
  }
}

/* =========================================================== */
/* build OpenUI5                                               */
/* =========================================================== */

// use PulseShifts own build tools to build downloaded OpenUI5 library
exports.buildUI5 = function(
  sUi5Version = '1.40.0',
  sUi5SourcePath = './ui5',
  sUi5TargetPath = './ui5/target',
  cb
) {
  const NOW = new Date()
  const sBuildTime = [NOW.toDateString(), NOW.toTimeString()].join(' - ')

  // if ui5 target location already exist, cancel to prevent unwanted overrides
  if (fs.existsSync(sUi5TargetPath)) {
    gutil.log(
      'UI5 target directory',
      gutil.colors.cyan(sUi5TargetPath),
      'already exist. Please clean target location, directory will be created automatically.'
    )
    cb()
    return
  }

  const sCopyrightBanner = `UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2017 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 * Build by PulseShift GmbH, OpenUI5 Version ${sUi5Version}, Buildtime ${sBuildTime}.`

  /*
   * These modules are predelivered with sap-ui-core.js.
   * TODO: modules in sap-ui-core.js. must be included with jQuery.registerPreloadedModules()...
   */
  const aSAPUiCorePreloadModules = []

  /*
   * These modules won't be added to OpenUI5 build.
   */
  // const aBlacklistModules = [];

  /*
   * Only these modules will be added to OpenUI5 build.
   */
  // const aWhitelistModules = [];

  // modules referenced in raw sap-ui-*.js directly
  let aSAPUiCoreAutoIncludedModules = []

  // found modules
  let aModules = []

  // found themes
  let aThemes = []

  // timestamps
  let mTimestamps = {}

  // 1. collect all module and theme paths of OpenUI5 project
  new Promise((resolve, reject) =>
    fs.readdir(
      `${sUi5SourcePath}/src/`,
      (oError, aPaths) => (oError ? reject() : resolve(aPaths))
    )
  )
    .then((aPaths = []) => {
      // extract modules
      aModules = aPaths
        .filter(sSrc => {
          // filter for directories only that starts with 'sap.'
          return (
            fs
              .statSync(path.join(`${sUi5SourcePath}/src/`, sSrc))
              .isDirectory() && sSrc.startsWith('sap.')
          )
        })
        .map(sDir => {
          // map to complete paths
          return {
            path: `${sUi5SourcePath}/src/${sDir}`,
            targetPath: `${sUi5TargetPath}/${sDir.split('.').join('/')}`,
            name: sDir
          }
        })

      // extract themes
      aThemes = aPaths
        .filter(sSrc => {
          // filter for directories only that starts with 'themelib'
          return (
            fs
              .statSync(path.join(`${sUi5SourcePath}/src/`, sSrc))
              .isDirectory() && sSrc.startsWith('themelib')
          )
        })
        .map(sDir => `${sUi5SourcePath}/src/${sDir}`)
    })
    // 2. create debug resources first (rename all javascript files and copy them as debug resources)
    .then(
      () =>
        new Promise((resolve, reject) => {
          gutil.log(
            'Starting',
            gutil.colors.cyan('copy debug resources'),
            '...'
          )
          mTimestamps['copy debug resources'] = Date.now()
          return (
            gulp
              .src([...aModules.map(oModule => `${oModule.path}/src/**/*.js`)])
              // A) add -dbg suffix
              .pipe(rename({ suffix: '-dbg' }))
              // B) update copyright of debug resources
              .pipe(
                tap(oFile =>
                  replaceFilePlaceholders(oFile, [
                    { identifier: '${copyright}', content: sCopyrightBanner }
                  ])
                )
              )
              // save at target location
              .pipe(gulp.dest(sUi5TargetPath))
              .on('end', () => {
                gutil.log(
                  'Finished',
                  gutil.colors.cyan('copy debug resources'),
                  'after',
                  gutil.colors.magenta(
                    `${Math.round((Date.now() - mTimestamps['copy debug resources']) / 100) / 10} s`
                  )
                )
                resolve()
              })
              .on('error', reject)
          )
        })
    )
    // 3. copy all other resources of modules in target directory and this time minify JS
    .then(
      () =>
        new Promise((resolve, reject) => {
          gutil.log(
            'Starting',
            gutil.colors.cyan('copy minified JS and all other resources'),
            '...'
          )
          mTimestamps['copy minified JS and all other resources'] = Date.now()
          return (
            gulp
              .src([
                `${sUi5SourcePath}/LICENSE.txt`,
                `${sUi5SourcePath}/NOTICE.txt`,
                `${sUi5SourcePath}/README.md`,
                ...aModules.map(oModule => `${oModule.path}/src/**/*`) // module files
              ])
              // minify all JS resources
              .pipe(gulpif('**/*.js', uglify()))
              // update copyright of library less sources
              .pipe(
                gulpif(
                  ['**/library.source.less'],
                  tap(oFile =>
                    replaceFilePlaceholders(oFile, [
                      { identifier: '${copyright}', content: sCopyrightBanner }
                    ])
                  )
                )
              )
              // save at target location
              .pipe(gulp.dest(sUi5TargetPath))
              .on('end', () => {
                gutil.log(
                  'Finished',
                  gutil.colors.cyan('copy minified JS and all other resources'),
                  'after',
                  gutil.colors.magenta(
                    `${Math.round((Date.now() - mTimestamps['copy minified JS and all other resources']) / 100) / 10} s`
                  )
                )
                resolve()
              })
              .on('error', reject)
          )
        })
    )
    // 4. build and concat sap-ui-*.js resources in target location
    .then(
      () =>
        new Promise((resolve, reject) => {
          gutil.log(
            'Starting',
            gutil.colors.cyan('compose sap-ui-*.js resources'),
            '...'
          )
          mTimestamps['compose sap-ui-*.js resources'] = Date.now()
          return (
            gulp
              .src([
                `${sUi5TargetPath}/sap-ui-core.js`,
                `${sUi5TargetPath}/sap-ui-core-nojQuery.js`,
                `${sUi5TargetPath}/sap-ui-core-dbg.js`,
                `${sUi5TargetPath}/sap-ui-core-nojQuery-dbg.js`
              ])
              .pipe(
                tap(oFile => {
                  // parse scripts to include
                  const aRawScriptIncludes = oFile.contents
                    .toString('utf8')
                    .match(/raw:([\w\.\/_-]*)/gm)

                  // continue without change if no import scripts have been found
                  if (!aRawScriptIncludes) return oFile

                  const aScriptIncludes = aRawScriptIncludes
                    .map(f => f.replace('raw:', ''))
                    .filter(f => f !== '')

                  // memorize included modules, so that we can exclude them when building library-preload for sap.ui.core
                  if (oFile.path.endsWith('sap-ui-core.js')) {
                    aSAPUiCoreAutoIncludedModules = aScriptIncludes
                  }

                  // create include scripts content
                  const sIncludedRawScripts = aScriptIncludes
                    // add preload modules for sap-ui-core.js
                    .concat(aSAPUiCorePreloadModules)
                    // request debug resources, if sap-ui-*-dbg is called
                    .map(
                      f =>
                        (oFile.path.endsWith('-dbg.js')
                          ? f.replace('.js', '-dbg.js')
                          : f)
                    )
                    // read file
                    .map(sScriptPath =>
                      fs.readFileSync(
                        `${sUi5TargetPath}/${sScriptPath}`,
                        'utf8'
                      )
                    )
                    // replace banner
                    .map(sScriptContent =>
                      sScriptContent.replace('${copyright}', sCopyrightBanner)
                    )
                    // join to single file content
                    .join('')

                  // HINT: sap-ui-core.js and sap-ui-core-nojQuery.js and there equivalent debug variants, will be postprocessed in target location, again

                  // write concatenated scripts into file
                  oFile.contents = new Buffer(sIncludedRawScripts)
                  return oFile
                })
              )
              // inject file by JS footer and header
              .pipe(tap(oFile => composeSAPUiCore(oFile)))
              // save at target location
              .pipe(gulp.dest(sUi5TargetPath))
              .on('end', () => {
                gutil.log(
                  'Finished',
                  gutil.colors.cyan('compose sap-ui-*.js resources'),
                  'after',
                  gutil.colors.magenta(
                    `${Math.round((Date.now() - mTimestamps['compose sap-ui-*.js resources']) / 100) / 10} s`
                  )
                )
                resolve()
              })
              .on('error', reject)
          )
        })
    )
    // 5. create preload bundle files for all modules (except sap.ui.core, because guess why: it has special requirements) and save them at target directory
    .then(() =>
      Promise.all(
        aModules.filter(oModule => oModule.name !== 'sap.ui.core').map(
          oModule =>
            new Promise((resolve, reject) =>
              gulp
                .src([
                  `${oModule.targetPath}/**/*.js`,
                  `!${oModule.targetPath}/**/library-preload.js`,
                  // don't bundle debug resources
                  `!${oModule.targetPath}/**/*-dbg.js`,
                  // exclude modules that are already bundled in sap-ui-core.js
                  ...aSAPUiCoreAutoIncludedModules
                    .concat(aSAPUiCorePreloadModules)
                    .map(sModule => `!${sUi5TargetPath}/${sModule}.js`)
                ])
                // TODO: tap into library.js files to customize ui5 bundle

                // create library-preload.json
                .pipe(
                  ui5preload({
                    base: oModule.targetPath,
                    namespace: oModule.name,
                    isLibrary: true // if set to true a library-preload.json file is emitted instead of a Component-preload.js file (default)
                  })
                )
                // transform all library-preload.json files to transform all library-preload.js (mandatory since OpenUI5 1.40)
                .pipe(
                  gulpif(
                    '**/library-preload.json',
                    tap(oFile => transformPreloadJson(oFile))
                  )
                )
                .pipe(
                  gulpif('**/library-preload.json', rename({ extname: '.js' }))
                )
                // save directly in target location
                .pipe(gulp.dest(oModule.targetPath))
                .on('end', resolve)
                .on('error', reject)
            ) // end Promise
        )
      )
    ) // end Promise.all
    // 6. now create preload bundle files sap.ui.core, too
    .then(
      () =>
        new Promise((resolve, reject) =>
          gulp
            .src([
              `${sUi5TargetPath}/jquery.sap.*.js`,
              `${sUi5TargetPath}/sap/ui/Global.js`,
              `${sUi5TargetPath}/sap/ui/base/**/*.js`,
              `${sUi5TargetPath}/sap/ui/core/**/*.js`,
              `${sUi5TargetPath}/sap/ui/model/**/*.js`,
              `!${sUi5TargetPath}/**/library-preload.js`,
              // don't bundle debug resources
              `!${sUi5TargetPath}/**/*-dbg.js`,
              // exclude modules that are already bundled in sap-ui-core.js
              ...aSAPUiCoreAutoIncludedModules
                .concat(aSAPUiCorePreloadModules)
                .map(sModule => `!${sUi5TargetPath}/${sModule}.js`)
            ])
            // TODO: tap into library.js files to customize ui5 bundle

            // create library-preload.json
            .pipe(
              ui5preload({
                base: sUi5TargetPath,
                namespace: '',
                isLibrary: true // if set to true a library-preload.json file is emitted instead of a Component-preload.js file (default)
              })
            )
            // transform all library-preload.json files to transform all library-preload.js (mandatory since OpenUI5 1.40)
            .pipe(
              gulpif(
                '**/library-preload.json',
                tap(oFile => transformPreloadJson(oFile))
              )
            )
            .pipe(gulpif('**/library-preload.json', rename({ extname: '.js' })))
            // save directly in target location
            .pipe(gulp.dest(`${sUi5TargetPath}/sap/ui/core`))
            .on('end', resolve)
            .on('error', reject)
        )
    )
    // NOW WE START TO UPDATE ALL THEME RESOURCES

    // 7. copy all themes into theme target path
    .then(
      () =>
        new Promise((resolve, reject) => {
          gutil.log('Starting', gutil.colors.cyan('copy themes'), '...')
          mTimestamps['copy themes'] = Date.now()
          return (
            gulp
              .src([...aThemes.map(sThemePath => `${sThemePath}/src/**/*`)])
              // update copyright of library less sources
              .pipe(
                gulpif(
                  '**/library.source.less',
                  tap(oFile =>
                    replaceFilePlaceholders(oFile, [
                      { identifier: '${copyright}', content: sCopyrightBanner }
                    ])
                  )
                )
              )
              // save at target location
              .pipe(gulp.dest(sUi5TargetPath))
              .on('end', () => {
                gutil.log(
                  'Finished',
                  gutil.colors.cyan('copy themes'),
                  'after',
                  gutil.colors.magenta(
                    `${Math.round((Date.now() - mTimestamps['copy themes']) / 100) / 10} s`
                  )
                )
                resolve()
              })
              .on('error', reject)
          )
        })
    )
    // 8. build css libraries for all themes of all modules
    .then(
      () =>
        new Promise((resolve, reject) => {
          gutil.log(
            'Starting',
            gutil.colors.cyan('compile themes library.source.less resources'),
            '...'
          )
          mTimestamps[
            'compile themes library.source.less resources'
          ] = Date.now()
          return (
            gulp
              .src([`${sUi5TargetPath}/**/themes/**/library.source.less`])
              // create library.css
              .pipe(
                tap(oFile => {
                  const sDestDir = /.*(?=library.source.less$)/.exec(
                    oFile.path
                  )[0]
                  const oRaw = oFile.contents.toString('utf8')

                  // TODO: tap into library.source.less files to customize ui5 bundle

                  compileUi5LessLib(sDestDir, oRaw, () => {}) // no callback required
                })
              )
              // save at target location
              .pipe(gulp.dest(sUi5TargetPath))
              .on('end', () => {
                gutil.log(
                  'Finished',
                  gutil.colors.cyan(
                    'compile themes library.source.less resources'
                  ),
                  'after',
                  gutil.colors.magenta(
                    `${Math.round((Date.now() - mTimestamps['compile themes library.source.less resources']) / 100) / 10} s`
                  )
                )
                resolve()
              })
              .on('error', reject)
          )
        })
    )
    // 9. minify and clean up css resources
    .then(
      () =>
        new Promise((resolve, reject) => {
          gutil.log('Starting', gutil.colors.cyan('postprocess CSS'), '...')
          mTimestamps['postprocess CSS'] = Date.now()
          return (
            gulp
              .src([`${sUi5TargetPath}/**/*.css`])
              // minify CSS as much as possible
              .pipe(
                cleanCSS({
                  inline: ['none'],
                  level: 2
                })
              )
              // save at target location
              .pipe(gulp.dest(sUi5TargetPath))
              .on('end', () => {
                gutil.log(
                  'Finished',
                  gutil.colors.cyan('postprocess CSS'),
                  'after',
                  gutil.colors.magenta(
                    `${Math.round((Date.now() - mTimestamps['postprocess CSS']) / 100) / 10} s`
                  )
                )
                resolve()
              })
              .on('error', reject)
          )
        })
    )
    // 10. [FINAL STEP] last but not least: write sap-ui-version.json
    .then(
      () =>
        new Promise((resolve, reject) => {
          gutil.log(
            'Starting',
            gutil.colors.cyan('compose sap-ui-version.json'),
            '...'
          )
          mTimestamps['compose sap-ui-version.json'] = Date.now()
          fs.writeFile(
            `${sUi5TargetPath}/sap-ui-version.json`,
            JSON.stringify(
              {
                buildTimestamp: sBuildTime,
                name: 'openui5-sdk-dist-pulseshift-custom',
                version: sUi5Version,
                librares: aModules.map(oModule => ({
                  buildTimestamp: sBuildTime,
                  name: oModule.name,
                  version: sUi5Version
                }))
              },
              null,
              2
            ),
            oError => {
              gutil.log(
                'Finished',
                gutil.colors.cyan('compose sap-ui-version.json'),
                'after',
                gutil.colors.magenta(
                  `${Math.round((Date.now() - mTimestamps['compose sap-ui-version.json']) / 100) / 10} s`
                )
              )
              return oError ? reject() : resolve()
            }
          )
        })
    )
    .then(cb)
    .catch(error => {
      console.error(error)
      cb()
    })
}

// use SAPs own build tools [NOT RECOMMENDED] to build downloaded OpenUI5 library
exports.buildUI5Deprecated = function(
  sUi5Version = '1.40.0',
  sUi5TargetPath = './ui5',
  cb
) {
  const sUi5LibPath = `${sUi5TargetPath}/download-${sUi5Version}`

  // files to keep from ui5 root directory
  const aKeepFiles = [
    sUi5LibPath,
    `${sUi5LibPath}/LICENSE.txt`,
    `${sUi5LibPath}/NOTICE.txt`,
    `${sUi5LibPath}/README.md`,
    `${sUi5LibPath}/target`
  ]

  // run SAPs OpenUI5 grunt build process
  // 1. install required node modules
  execSync('npm install --silent', { cwd: sUi5LibPath, stdio: [0, 0, 0] })

  // 2. build library with SAPs grunt file
  execSync('grunt build --force', { cwd: sUi5LibPath, stdio: [0, 0, 0] })

  // 3. delete obsolete OpenUI5 library files not required anymore after the build
  deleteWithWhitelist(sUi5LibPath, aKeepFiles)

  // 4. collect all module paths of OpenUI5 project
  const aModules = fs
    .readdirSync(`${sUi5LibPath}/target/`)
    .filter(sSrc => {
      // filter for directories only
      return fs
        .statSync(path.join(`${sUi5LibPath}/target/`, sSrc))
        .isDirectory()
    })
    .map(sDir => {
      // map to complete paths
      return `${sUi5LibPath}/target/${sDir}`
    })

  // 5. bundle all resources of a module (files and directories) into the root directory
  Promise.all(
    aModules.map(
      sModulePath =>
        new Promise((resolve, reject) =>
          gulp
            .src([`${sModulePath}/resources/**/*`], {
              base: `${sModulePath}/resources`
            })
            // A) transform all library-preload.json files
            .pipe(
              gulpif(
                '**/library-preload.json',
                tap(oFile => transformPreloadJson(oFile))
              )
            )
            .pipe(gulpif('**/library-preload.json', rename({ extname: '.js' })))
            // B) rename all javascript files and keep them as debug resources
            .pipe(
              gulpif(
                ['**/*.js', '!**/sap-ui-core*'],
                rename({ suffix: '-dbg' })
              )
            )
            .pipe(gulp.dest(sUi5LibPath))
            .on('end', resolve)
            .on('error', reject)
        ) // end Promise
    ) // end map Modules
  ) // end Promis.all
    // 6. continue when all files have been copied to root
    .then(() => {
      // 7. delete obsolete target folder
      deleteWithWhitelist(`${sUi5LibPath}/target`)

      // 8. minify all javascript files and create required css libs
      gulp
        .src([
          `${sUi5LibPath}/**/*-dbg.js`,
          `${sUi5LibPath}/**/themes/*/library.source.less`,
          `!${sUi5LibPath}/sap-ui-core*`,
          `!${sUi5LibPath}/target/**/*`
        ])
        // A) rename all javascript files and keep them as debug resources
        .pipe(gulpif('**/*.js', uglify()))
        .pipe(
          gulpif(
            '**/*.js',
            rename(sPath => {
              sPath.basename = `${sPath.basename.split('-dbg')[0]}${sPath.basename.split('-dbg')[1]}`
            })
          )
        )
        // B) create library.css files
        .pipe(
          gulpif(
            '**/themes/*/library.source.less',
            tap(oFile => {
              const sDestDir = /.*(?=library.source.less$)/.exec(oFile.path)[0]
              const oData = oFile.contents.toString('utf8')

              compileUi5LessLib(sDestDir, oData, () => {}) // no callback required
            })
          )
        )
        .pipe(gulp.dest(sUi5LibPath))
        .on('end', cb)
        .on('error', cb)
    })
    .catch(cb)
}

/* =========================================================== */
/* compile ui5 module less library to css                      */
/* =========================================================== */

// build a valid css library files for a ui5 module
exports.compileUi5LessLib = function(sDestDir, oData, cb) {
  compileUi5LessLib(sDestDir, oData, cb)
}

// build library-preload.js (from .json) file for a ui5 module
exports.transformPreloadJson = function(oFile) {
  return transformPreloadJson(oFile)
}

// ~~~ helper functions ~~~~~~~~~~~~~~~~~~~~~~~

// check if current path or directory is matching one of the exclude patterns
function check(sPath, aExcludes) {
  aExcludes = aExcludes || []
  return aExcludes.some(excludePath => {
    return minimatch(sPath, excludePath)
  })
}

// TODO: replace sync calls with async calls or with exec console statement
// delete all files of a directory recursively (whitelist can be handed over, returns number of deletet files)
function deleteWithWhitelist(sPath, aExcludes = []) {
  let iDeletedFiles = 0

  if (fs.existsSync(sPath)) {
    fs.readdirSync(sPath).forEach(file => {
      const sCurrentPath = `${sPath}/${file}`

      if (check(sCurrentPath, aExcludes)) {
        return
      } else if (fs.statSync(sCurrentPath).isDirectory()) {
        // recurse
        iDeletedFiles += deleteWithWhitelist(sCurrentPath, aExcludes)
      } else {
        // delete file
        fs.unlinkSync(sCurrentPath)
        iDeletedFiles++
      }
    })
    if (check(sPath, aExcludes)) {
      return
    }
    fs.rmdirSync(sPath)
  }

  return iDeletedFiles
}

// build a valid css library files
function compileUi5LessLib(sDestDir, oData, cb) {
  // options for less-openui5
  const oOptions = {
    rootPaths: [sDestDir],
    rtl: true,
    parser: { filename: `${sDestDir}library.source.less` },
    compiler: { compress: false }
  }

  // execute build css build process
  lessOpenUI5.build(oData, oOptions, (oLessError, result) => {
    if (oLessError) {
      // A) build css content failed >> create empty less file and try again if build failed

      // try to parse error message to find out which missing less file caused the failed build
      // const sErrorDir = (/.*(?=library.source.less$)/.exec(oLessError.filename) || [''])[0];
      // const sErrorFile = (/\w*\.\w*/.exec(oLessError.message) || [''])[0];

      // try to parse error message to find out which missing less file caused the failed build
      const sMissingFileName = (oLessError.message.match(
        /((\.*?\/?)*\w.*\.\w+)/g
      ) || [''])[0]
      const sSourceFileName = oLessError.filename
      const sMissingFilePath = path.resolve(
        sSourceFileName.replace('library.source.less', ''),
        sMissingFileName
      )

      const sNewFileContent = ''

      // NOTE: the following log statements are no errors
      // console.log('\x1b[31m', 'Compile UI5 less lib: ', oLessError) // eslint-disable-line
      // console.log(
      //   '\x1b[33m',
      //   `Compile UI5 less lib: Try to create mssing file '${sMissingFilePath}' with empty content then retry. (this warning can be ignored)`
      // ) // eslint-disable-line

      if (!fs.existsSync(sMissingFilePath)) {
        // create missing .less file (with empty content), else the library.css can not be created
        fs.writeFile(sMissingFilePath, sNewFileContent, oWriteFileError => {
          // if missing file could be created, try process, again
          if (oWriteFileError === null) {
            compileUi5LessLib(sDestDir, oData, () => cb)
            return
          }
          gutil.log(gutil.colors.red('Compile UI5 less lib: '), oWriteFileError)
          cb()
        })
      } else {
        cb()
      }
    } else {
      // B) build css content was successfull >> save result
      const aTargetFiles = [
        {
          path: `${sDestDir}library.css`,
          content: result.css
        },
        {
          path: `${sDestDir}library-RTL.css`,
          content: result.cssRtl
        },
        {
          path: `${sDestDir}library-parameters.json`,
          content: JSON.stringify(
            result.variables,
            null,
            oOptions.compiler.compress ? 0 : 4
          ) || ''
        }
      ]

      Promise.all(
        aTargetFiles.map(oFile => {
          return new Promise((resolve, reject) =>
            fs.writeFile(
              oFile.path,
              oFile.content,
              oError => (oError ? reject() : resolve())
            )
          )
        })
      )
        .then(cb)
        .catch(cb)
    }
  })
}

// transform library-preload.json content
function transformPreloadJson(oFile) {
  const oJSONRaw = oFile.contents.toString('utf8')
  oFile.contents = new Buffer(
    `jQuery.sap.registerPreloadedModules(${oJSONRaw});`
  )
  return oFile
}

// replace a list of placeholders with a list of string contents
function replaceFilePlaceholders(oFile, aReplacementRules) {
  // parse file
  let sRaw = oFile.contents.toString('utf8')

  aReplacementRules.forEach(oRule => {
    sRaw = sRaw.replace(oRule.identifier, oRule.content)
  })

  // update new raw content
  oFile.contents = new Buffer(sRaw)

  // return updated file
  return oFile
}

// compose sap-ui-*.js files
function composeSAPUiCore(oFile) {
  // parse library-preload.json
  let sRaw = oFile.contents.toString('utf8')

  if (oFile.path.endsWith('-dbg.js')) {
    // footer found in OpenUI5 build tools
    sRaw = `${sRaw}
if (!window["sap-ui-debug"]) { sap.ui.requireSync("sap/ui/core/library-preload"); }
sap.ui.requireSync("sap/ui/core/Core");
sap.ui.getCore().boot && sap.ui.getCore().boot();`
  } else {
    // footer found in OpenUI5 build tools
    sRaw = `window["sap-ui-optimized"] = true;
${sRaw}
if (!window["sap-ui-debug"]) { sap.ui.requireSync("sap/ui/core/library-preload"); }
sap.ui.requireSync("sap/ui/core/Core");
sap.ui.getCore().boot && sap.ui.getCore().boot();`
  }

  // update new raw content
  oFile.contents = new Buffer(sRaw)

  // return updated file
  return oFile
}
