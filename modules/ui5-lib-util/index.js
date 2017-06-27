/**
 *
 *  OpenUI5 Library Utilities
 *  Copyright 2017 PulseShift GmbH. All rights reserved.
 *
 *  Licensed under the MIT License.
 *
 *  This file makes use of new JavaScript features.
 *  Babel handles this without us having to do anything. It just works.
 *  You can read more about the new JavaScript features here:
 *  https://babeljs.io/docs/learn-es2015/
 *
 */

import gulp from 'gulp'
import download from 'gulp-download'
import unzip from 'gulp-unzip'
import gulpif from 'gulp-if'
import rename from 'gulp-rename'
import tap from 'gulp-tap'
import uglify from 'gulp-uglify'
import cleanCSS from 'gulp-clean-css'
import gutil from 'gulp-util'
import ui5preload from 'gulp-ui5-preload'
// TODO: upgrade to new 'less-openui5' module and refactore code
import lessOpenUI5 from 'less-openui5'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// export functions
export { downloadUI5, buildUI5 }

/* ----------------------------------------------------------- *
 * download OpenUI5
 * ----------------------------------------------------------- */

// download OpenUI5 repository from external URL and unzip
function downloadUI5(sDownloadURL, sDownloadPath, sUI5Version) {
  // check params
  if (!sDownloadURL) {
    gutil.log('gulp-lib-util', gutil.colors.red('No download URL provided'))
  }
  if (!sDownloadPath) {
    gutil.log('gulp-lib-util', gutil.colors.red('No download path provided'))
  }
  if (!sUI5Version) {
    gutil.log('gulp-lib-util', gutil.colors.red('No UI5 version provided'))
  }

  // timestamps
  let iTimestamp = Date.now()

  // start download
  logStart(`download UI5 ${sUI5Version}`, [
    '(unzip could take a couple of minutes, so please be patient after download)'
  ])

  // check if ui5 library was already downloaded and ectracted
  if (!fs.existsSync(`${sDownloadPath}/download-${sUI5Version}`)) {
    // download and unzip sources
    return new Promise(resolve => {
      download(sDownloadURL)
        .pipe(unzip())
        .pipe(gulp.dest(sDownloadPath))
        .on('end', () => {
          // 3. rename downloaded ui5 directory fro openui5-VERSION to download-VERSION
          try {
            execSync(`mv openui5-${sUI5Version} download-${sUI5Version}`, {
              cwd: sDownloadPath,
              stdio: [0, 0, 0]
            })
          } catch (e) {
            // folder doesn't exist or was renamed manually
          }
          // log finished msg
          logEnd(`download UI5 ${sUI5Version}`, iTimestamp, [
            '(download available at',
            gutil.colors.cyan(`${sDownloadPath}/download-${sUI5Version}`),
            ')'
          ])
          resolve()
        })
    })
  }

  // download is already available
  logEnd(`download UI5 ${sUI5Version}`, iTimestamp, [
    '(directory',
    gutil.colors.cyan(`${sDownloadPath}/download-${sUI5Version}`),
    'already exist)'
  ])
  return Promise.resolve()
}

/* ----------------------------------------------------------- *
 * build OpenUI5
 * ----------------------------------------------------------- */

// use PulseShifts own build tools to build OpenUI5 library
function buildUI5(sUI5SrcPath, sUI5TargetPath, sUI5Version) {
  // check params
  if (!sUI5SrcPath) {
    gutil.log('gulp-lib-util', gutil.colors.red('No UI5 source path provided'))
  }
  if (!sUI5TargetPath) {
    gutil.log('gulp-lib-util', gutil.colors.red('No UI5 target path provided'))
  }
  if (!sUI5Version) {
    gutil.log('gulp-lib-util', gutil.colors.red('No UI5 version provided'))
  }

  const NOW = new Date()
  const sBuildTime = [NOW.toDateString(), NOW.toTimeString()].join(' - ')

  // if ui5 target location already exist, cancel to prevent unwanted overrides
  if (fs.existsSync(sUI5TargetPath)) {
    gutil.log(
      'UI5 target directory',
      gutil.colors.cyan(sUI5TargetPath),
      'already exist. Please clean target location for rebuild (directory will be created automatically).'
    )
    return Promise.resolve()
  }

  const sCopyrightBanner = `UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2017 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 * Build by PulseShift GmbH, OpenUI5 Version ${sUI5Version}, Buildtime ${sBuildTime}.`

  /*
   * These modules (if defined) will be predelivered with sap-ui-core.js.
   */
  const aSAPUiCorePreloadModules = []

  // modules referenced in raw sap-ui-*.js directly
  let aSAPUiCoreAutoIncludedModules = []

  // found UI5 modules
  let aUI5Modules = []

  // found UI5 themes
  let aUI5Themes = []

  // task start timestamps
  let oStartTimes = {}

  // 1. collect all module and theme paths of OpenUI5 project
  const oBuildPromiseChain = new Promise((resolve, reject) =>
    fs.readdir(
      `${sUI5SrcPath}/src/`,
      (oError, aPaths) => (oError ? reject() : resolve(aPaths))
    )
  )
    .then((aPaths = []) => {
      // extract modules
      aUI5Modules = aPaths
        .filter(sSrc => {
          // filter for directories only that starts with 'sap.'
          return (
            fs.statSync(path.join(`${sUI5SrcPath}/src/`, sSrc)).isDirectory() &&
            sSrc.startsWith('sap.')
          )
        })
        .map(sDir => {
          // map to complete paths
          return {
            path: `${sUI5SrcPath}/src/${sDir}`,
            targetPath: `${sUI5TargetPath}/${sDir.split('.').join('/')}`,
            name: sDir
          }
        })

      // extract themes
      aUI5Themes = aPaths
        .filter(sSrc => {
          // filter for directories only that starts with 'themelib'
          return (
            fs.statSync(path.join(`${sUI5SrcPath}/src/`, sSrc)).isDirectory() &&
            sSrc.startsWith('themelib')
          )
        })
        .map(sDir => `${sUI5SrcPath}/src/${sDir}`)
    })
    // 2. create debug resources first (rename all javascript files and copy them as debug resources)
    .then(
      () =>
        new Promise((resolve, reject) => {
          logStart('copy debug resources')
          oStartTimes['copy debug resources'] = Date.now()
          return (
            gulp
              .src([
                ...aUI5Modules.map(oModule => `${oModule.path}/src/**/*.js`)
              ])
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
              .pipe(gulp.dest(sUI5TargetPath))
              .on('end', () => {
                logEnd(
                  'copy debug resources',
                  oStartTimes['copy debug resources']
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
          logStart('copy minified JS and all other resources')
          oStartTimes['copy minified JS and all other resources'] = Date.now()
          return (
            gulp
              .src([
                `${sUI5SrcPath}/LICENSE.txt`,
                `${sUI5SrcPath}/NOTICE.txt`,
                `${sUI5SrcPath}/README.md`,
                ...aUI5Modules.map(oModule => `${oModule.path}/src/**/*`) // module files
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
              .pipe(gulp.dest(sUI5TargetPath))
              .on('end', () => {
                logEnd(
                  'copy minified JS and all other resources',
                  oStartTimes['copy minified JS and all other resources']
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
          logStart('compose sap-ui-*.js resources')
          oStartTimes['compose sap-ui-*.js resources'] = Date.now()
          return (
            gulp
              .src([
                `${sUI5TargetPath}/sap-ui-core.js`,
                `${sUI5TargetPath}/sap-ui-core-nojQuery.js`,
                `${sUI5TargetPath}/sap-ui-core-dbg.js`,
                `${sUI5TargetPath}/sap-ui-core-nojQuery-dbg.js`
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
                        oFile.path.endsWith('-dbg.js')
                          ? f.replace('.js', '-dbg.js')
                          : f
                    )
                    // read file
                    .map(sScriptPath =>
                      fs.readFileSync(
                        `${sUI5TargetPath}/${sScriptPath}`,
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
              .pipe(gulp.dest(sUI5TargetPath))
              .on('end', () => {
                logEnd(
                  'compose sap-ui-*.js resources',
                  oStartTimes['compose sap-ui-*.js resources']
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
        aUI5Modules.filter(oModule => oModule.name !== 'sap.ui.core').map(
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
                    .map(sModule => `!${sUI5TargetPath}/${sModule}.js`)
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
                    tap(oFile => transformPreloadJSON(oFile))
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
              `${sUI5TargetPath}/jquery.sap.*.js`,
              `${sUI5TargetPath}/sap/ui/Global.js`,
              `${sUI5TargetPath}/sap/ui/base/**/*.js`,
              `${sUI5TargetPath}/sap/ui/core/**/*.js`,
              `${sUI5TargetPath}/sap/ui/model/**/*.js`,
              `!${sUI5TargetPath}/**/library-preload.js`,
              // don't bundle debug resources
              `!${sUI5TargetPath}/**/*-dbg.js`,
              // exclude modules that are already bundled in sap-ui-core.js
              ...aSAPUiCoreAutoIncludedModules
                .concat(aSAPUiCorePreloadModules)
                .map(sModule => `!${sUI5TargetPath}/${sModule}.js`)
            ])
            // TODO: tap into library.js files to customize ui5 bundle

            // create library-preload.json
            .pipe(
              ui5preload({
                base: sUI5TargetPath,
                namespace: '',
                isLibrary: true // if set to true a library-preload.json file is emitted instead of a Component-preload.js file (default)
              })
            )
            // transform all library-preload.json files to transform all library-preload.js (mandatory since OpenUI5 1.40)
            .pipe(
              gulpif(
                '**/library-preload.json',
                tap(oFile => transformPreloadJSON(oFile))
              )
            )
            .pipe(gulpif('**/library-preload.json', rename({ extname: '.js' })))
            // save directly in target location
            .pipe(gulp.dest(`${sUI5TargetPath}/sap/ui/core`))
            .on('end', resolve)
            .on('error', reject)
        )
    )
    // NOW WE START TO UPDATE ALL THEME RESOURCES

    // 7. copy all themes into theme target path
    .then(
      () =>
        new Promise((resolve, reject) => {
          logStart('copy themes')
          oStartTimes['copy themes'] = Date.now()
          return (
            gulp
              .src([...aUI5Themes.map(sThemePath => `${sThemePath}/src/**/*`)])
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
              .pipe(gulp.dest(sUI5TargetPath))
              .on('end', () => {
                logEnd('copy themes', oStartTimes['copy themes'])
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
          logStart('compile themes library.source.less resources')
          oStartTimes[
            'compile themes library.source.less resources'
          ] = Date.now()
          return (
            gulp
              .src([`${sUI5TargetPath}/**/themes/**/library.source.less`])
              // create library.css
              .pipe(
                tap(oFile => {
                  const sDestDir = /.*(?=library.source.less$)/.exec(
                    oFile.path
                  )[0]
                  const oRaw = oFile.contents.toString('utf8')

                  // TODO: tap into library.source.less files to customize ui5 bundle

                  compileUI5LessLib(sDestDir, oRaw, () => {}) // no callback required
                })
              )
              // save at target location
              .pipe(gulp.dest(sUI5TargetPath))
              .on('end', () => {
                logEnd(
                  'compile themes library.source.less resources',
                  oStartTimes['compile themes library.source.less resources']
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
          logStart('postprocess CSS')
          oStartTimes['postprocess CSS'] = Date.now()
          return (
            gulp
              .src([`${sUI5TargetPath}/**/*.css`])
              // minify CSS as much as possible
              .pipe(
                cleanCSS({
                  inline: ['none'],
                  level: 2
                })
              )
              // save at target location
              .pipe(gulp.dest(sUI5TargetPath))
              .on('end', () => {
                logEnd('postprocess CSS', oStartTimes['postprocess CSS'])
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
          logStart('compose sap-ui-version.json')
          oStartTimes['compose sap-ui-version.json'] = Date.now()
          fs.writeFile(
            `${sUI5TargetPath}/sap-ui-version.json`,
            JSON.stringify(
              {
                buildTimestamp: sBuildTime,
                name: 'openui5-sdk-dist-pulseshift-custom',
                version: sUI5Version,
                librares: aUI5Modules.map(oModule => ({
                  buildTimestamp: sBuildTime,
                  name: oModule.name,
                  version: sUI5Version
                }))
              },
              null,
              2
            ),
            oError => {
              logEnd(
                'compose sap-ui-version.json',
                oStartTimes['compose sap-ui-version.json']
              )
              return oError ? reject() : resolve()
            }
          )
        })
    )

  // return promise
  return oBuildPromiseChain
}

// log a gulp like 'task starting' message
function logStart(sTaskName = '', aPostLogs = []) {
  gutil.log('Starting', gutil.colors.cyan(sTaskName), '...', ...aPostLogs)
}

// log a gulp like 'task finished' message
function logEnd(sTaskName = '', iImestampStart = Date.now(), aPostLogs = []) {
  gutil.log(
    'Finished',
    gutil.colors.cyan(sTaskName),
    'after',
    gutil.colors.magenta(
      `${Math.round((Date.now() - iImestampStart) / 100) / 10} s`
    ),
    ...aPostLogs
  )
}

// build a valid css library files
function compileUI5LessLib(sDestDir, oData, cb) {
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
      // build css content failed (in 99% of the cases, because of a missing .less file)
      // create empty less file and try again if build failed

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

      if (!fs.existsSync(sMissingFilePath)) {
        // create missing .less file (with empty content), else the library.css can't be created
        fs.writeFile(sMissingFilePath, sNewFileContent, oWriteFileError => {
          // if missing file could be created, rebuild, again
          if (oWriteFileError === null) {
            compileUI5LessLib(sDestDir, oData, () => cb)
            return
          }
          // if this error message raises up, the build failed due to the other 1% cases
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
          content:
            JSON.stringify(
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
function transformPreloadJSON(oFile) {
  const oJSONRaw = oFile.contents.toString('utf8')
  const sPrelaodJSON = `jQuery.sap.registerPreloadedModules(${oJSONRaw});`
  oFile.contents = new Buffer(sPrelaodJSON)
  return oFile
}

// replace a list of placeholders with a list of string contents
function replaceFilePlaceholders(oFile, aReplacementRules) {
  // parse file
  const sRaw = oFile.contents.toString('utf8')
  const sUpdatedFile = aReplacementRules.reduce((oResult, oRule) => {
    return oResult.replace(oRule.identifier, oRule.content)
  }, sRaw)

  // update new raw content
  oFile.contents = new Buffer(sUpdatedFile)

  // return updated file
  return oFile
}

// compose sap-ui-*.js files
function composeSAPUiCore(oFile) {
  // parse library-preload.json
  const sRaw = oFile.contents.toString('utf8')

  // footer used in original OpenUI5 builds
  const sComposedCore = oFile.path.endsWith('-dbg.js')
    ? `${sRaw}
if (!window["sap-ui-debug"]) { sap.ui.requireSync("sap/ui/core/library-preload"); }
sap.ui.requireSync("sap/ui/core/Core");
sap.ui.getCore().boot && sap.ui.getCore().boot();`
    : `window["sap-ui-optimized"] = true;
${sRaw}
if (!window["sap-ui-debug"]) { sap.ui.requireSync("sap/ui/core/library-preload"); }
sap.ui.requireSync("sap/ui/core/Core");
sap.ui.getCore().boot && sap.ui.getCore().boot();`

  // update new raw content
  oFile.contents = new Buffer(sComposedCore)

  // return updated file
  return oFile
}
