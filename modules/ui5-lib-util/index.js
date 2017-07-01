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
import lessOpenUI5 from 'less-openui5'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

// create a builder instance
const builder = new lessOpenUI5.Builder()

// export functions
export { downloadUI5, buildUI5 }

/**
 * Download OpenUI5 repository from external URL and unzip.
 *
 * @param {sDownloadURL} [string] Download URL of required archive.
 * @param {sDownloadPath} [string] Destination path for the download archive and extracted files.
 * @param {sUI5Version} [string] Version number of UI5 to create at <code>sDownloadPath</code> a subdirectory named <code>/{{sUI5Version}}</code>.
 * @returns {Promise} Promise without return value.
 */
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
  if (!fs.existsSync(`${sDownloadPath}/${sUI5Version}`)) {
    // download and unzip sources
    return new Promise(resolve => {
      download(sDownloadURL)
        .pipe(unzip())
        .pipe(gulp.dest(`${sDownloadPath}/${sUI5Version}`))
        .on('end', () => {
          // log finished msg
          logEnd(`download UI5 ${sUI5Version}`, iTimestamp, [
            '(download available at',
            gutil.colors.cyan(`${sDownloadPath}/${sUI5Version}`),
            ')'
          ])
          resolve()
        })
    })
  }

  // download is already available
  logEnd(`download UI5 ${sUI5Version}`, iTimestamp, [
    '(directory',
    gutil.colors.cyan(`${sDownloadPath}/${sUI5Version}`),
    'already exist)'
  ])
  return Promise.resolve()
}

/**
 * Use PulseShifts own build tools to build OpenUI5 library.
 *
 * @param {sUI5SrcPath} [string] Source path of the OpenUI5 source code..
 * @param {sUI5TargetPath} [string] Destination path for the build library.
 * @param {sUI5Version} [string] Version number of UI5 to create at <code>sUI5TargetPath</code> a subdirectory named <code>/{{sUI5Version}}</code>.
 * @returns {Promise} Promise without return value.
 */
function buildUI5(sUI5SrcPath, sUI5TargetPath, sUI5Version) {
  // check params
  if (!sUI5SrcPath) {
    gutil.log('gulp-lib-util', gutil.colors.red('No UI5 source path provided'))
  }
  if (!fs.existsSync(sUI5SrcPath)) {
    gutil.log(
      'gulp-lib-util',
      gutil.colors.red(`UI5 source path ${sUI5SrcPath} does not eist`)
    )
  }
  if (!sUI5TargetPath) {
    gutil.log('gulp-lib-util', gutil.colors.red('No UI5 target path provided'))
  }
  if (!sUI5Version) {
    gutil.log('gulp-lib-util', gutil.colors.red('No UI5 version provided'))
  }

  // if ui5 target location already exist, cancel to prevent unwanted overrides
  if (fs.existsSync(sUI5TargetPath)) {
    gutil.log(
      'UI5 target directory',
      gutil.colors.cyan(sUI5TargetPath),
      'already exist. Please clean target location for rebuild (directory will be created automatically).'
    )
    return Promise.resolve()
  }

  const isSrcInDownloadRoot = fs.existsSync(`${sUI5SrcPath}/src`)
  const isSrcInDownloadSubDir = fs
    .readdirSync(sUI5SrcPath)
    .some(sPath => fs.existsSync(`${path.join(sUI5SrcPath, sPath)}/src`))

  // cancel if UI5 source code location ('/src' directory) could not be found
  if (!isSrcInDownloadRoot && !isSrcInDownloadSubDir) {
    gutil.log(
      'UI5 source code not found in given directory',
      gutil.colors.cyan(sUI5SrcPath),
      ', please check if the given path contains the correct OpenUI5 source code structure.'
    )
    return Promise.resolve()
  }

  // update UI5 source path if '/src' directory was found in a sub directory
  if (isSrcInDownloadSubDir) {
    sUI5SrcPath = fs
      .readdirSync(sUI5SrcPath)
      .reduce(
        (sFinalPath, sPath) =>
          fs.existsSync(`${path.join(sUI5SrcPath, sPath)}/src`)
            ? path.join(sUI5SrcPath, sPath)
            : sFinalPath,
        sUI5SrcPath
      )
  }

  const NOW = new Date()
  const sBuildTime = [NOW.toDateString(), NOW.toTimeString()].join(' - ')

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
          // filter for directories that only starts with 'themelib'
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
              .src([
                // copy UI5 theme libraries (e.g. sap_belize, sap_bluecrystal, etc.)
                ...aUI5Themes.map(sThemePath => `${sThemePath}/src/**/*`),
                // copy UI5 base and high contrast theme from module paths
                ...aUI5Modules.map(
                  oModule => `${oModule.path}/src/**/themes/**/*`
                )
              ])
              // update path of base and high contrast theme
              .pipe(
                rename(path => {
                  // normal path: sap/m/themes/sap_belize
                  // update path: sap.m/src/sap/m/themes/base => sap/m/themes/base
                  const aPathChain = path.dirname.split('/')
                  path.dirname =
                    aPathChain.length > 1 && aPathChain[1] === 'src'
                      ? aPathChain.slice(2, aPathChain.length - 1).join('/')
                      : path.dirname
                })
              )
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
          logStart('compile themes')
          oStartTimes['compile themes'] = Date.now()
          gutil.log(
            "'File not found' errors are fixed automatically, therefore, they can be ignored."
          )
          return (
            gulp
              .src([`${sUI5TargetPath}/**/themes/**/library.source.less`])
              // create library.css
              .pipe(
                tap(oFile => {
                  // TODO: tap into library.source.less files to customize ui5 bundle
                  compileUI5LessLib(oFile)
                })
              )
              // save at target location
              .pipe(gulp.dest(sUI5TargetPath))
              .on('end', () => {
                logEnd('compile themes', oStartTimes['compile themes'])
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

/**
 * Log a gulp like 'task starting' message.
 *
 * @param {sTaskName} [string] Task name to create following result pattern <code>Starting {{sTaskName}} ...</code>.
 * @param {aPostLogs} [Array] Additional strings pasted as parameters to <code>gulp-util.log</code>.
 */
function logStart(sTaskName = '', aPostLogs = []) {
  gutil.log('Starting', gutil.colors.cyan(sTaskName), '...', ...aPostLogs)
}

/**
 * Log a gulp like 'task finished' message.
 *
 * @param {sTaskName} [string] Task name to create following result pattern <code>Finished {{sTaskName}} after 4s</code>.
 * @param {iTimestampStart} [number] Timestamp of task start time as UTC time in ms.
 * @param {aPostLogs} [Array] Additional strings pasted as parameters to <code>gulp-util.log</code>.
 */
function logEnd(sTaskName = '', iTimestampStart = Date.now(), aPostLogs = []) {
  gutil.log(
    'Finished',
    gutil.colors.cyan(sTaskName),
    'after',
    gutil.colors.magenta(
      `${Math.round((Date.now() - iTimestampStart) / 100) / 10} s`
    ),
    ...aPostLogs
  )
}

function compileUI5LessLib(oFile) {
  const sDestDir = path.dirname(oFile.path)
  const sFileName = oFile.path.split('/').pop()
  const sLessFileContent = oFile.contents.toString('utf8')

  // options for less-openui5
  const oOptions = {
    lessInput: sLessFileContent,
    rootPaths: [sDestDir],
    rtl: true,
    parser: {
      filename: sFileName,
      paths: [sDestDir]
    },
    compiler: { compress: false }
  }

  // build a theme
  const oBuildThemePromise = builder
    .build(oOptions)
    .catch(oError => {
      // CSS build fails in 99% of all cases, because of a missing .less file
      // create empty LESS file and try again if build failed

      // try to parse error message to find out which missing LESS file caused the failed build
      const sMissingFileName = (oError.message.match(
        /((\.*?\/?)*\w.*\.\w+)/g
      ) || [''])[0]
      const sSourceFileName = oError.filename
      const sMissingFilePath = path.resolve(
        sDestDir,
        sSourceFileName.replace('library.source.less', ''),
        sMissingFileName
      )
      let isIssueFixed = false

      // create missing .less file (with empty content), else the library.css can't be created
      if (!fs.existsSync(sMissingFilePath)) {
        try {
          fs.writeFileSync(sMissingFilePath, '')
          isIssueFixed = true
        } catch (e) {
          isIssueFixed = false
        }
      }

      if (!isIssueFixed) {
        // if this error message raises up, the build failed due to the other 1% cases
        gutil.log(gutil.colors.red('Compile UI5 less lib: '), oError.message)
      }

      // if missing file could be created, try theme build again
      return isIssueFixed ? compileUI5LessLib(oFile) : Promise.reject()
    })
    .then(oResult => {
      // build css content was successfull >> save result
      const aTargetFiles = [
        {
          path: `${sDestDir}/library.css`,
          content: oResult.css
        },
        {
          path: `${sDestDir}/library-RTL.css`,
          content: oResult.cssRtl
        },
        {
          path: `${sDestDir}/library-parameters.json`,
          content:
            JSON.stringify(
              oResult.variables,
              null,
              oOptions.compiler.compress ? 0 : 4
            ) || ''
        }
      ]

      const aWriteFilesPromises = aTargetFiles.map(oFile => {
        return new Promise((resolve, reject) =>
          fs.writeFile(
            oFile.path,
            oFile.content,
            oError => (oError ? reject() : resolve())
          )
        )
      })

      // return promise
      return Promise.all(aWriteFilesPromises)
    })
    .then(() => {
      // clear builder cache when finished to cleanup memory
      builder.clearCache()
    })

  return oBuildThemePromise
}

/**
 * Transform library-preload.json content.
 *
 * @param {oFile} [Vinyl] Vinyl file object of library-preload.json.
 * @returns {Vinyl} Transformed library-preload.json.
 */
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

/**
 * Compose sap-ui-*.js files.
 *
 * @param {oFile} [Vinyl] Vinyl file object sap-ui-*.js.
 * @returns {Vinyl} Composed sap-ui-*.js file.
 */
function composeSAPUiCore(oFile) {
  // parse sap-ui-*.js file
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
