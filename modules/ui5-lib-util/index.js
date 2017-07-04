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
import gulpif from 'gulp-if'
import rename from 'gulp-rename'
import tap from 'gulp-tap'
import uglify from 'gulp-uglify'
import cleanCSS from 'gulp-clean-css'
import ui5preload from 'gulp-ui5-preload'
import lessOpenUI5 from 'less-openui5'
import request from 'request'
import progress from 'request-progress'
import Zip from 'adm-zip'
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
 * @param {string} [sDownloadURL] Download URL of required archive.
 * @param {string} [sDownloadPath] Destination path for the download archive and extracted files.
 * @param {string} [sUI5Version] Version number of UI5 to create at <code>sDownloadPath</code> a subdirectory named <code>/{{sUI5Version}}</code>.
 * @param {Object} [oOptions] Download options.
 * @param {function(number,number,{ name: string, progress: number|null}):void} [oOptions.onProgress] Callback function to track download progress taking as params: current step number, total step number and if available, step details (object with name and progress in percent).
 * @returns {Promise.string} Promise which resolves to a success or error message.
 */
function downloadUI5(sDownloadURL, sDownloadPath, sUI5Version, oOptions = {}) {
  // check params
  if (!sDownloadURL) {
    return Promise.reject('No download URL provided')
  }
  if (!sDownloadPath) {
    return Promise.reject('No download path provided')
  }
  if (!sUI5Version) {
    return Promise.reject('No UI5 version provided')
  }

  const oSteps = {
    download: {
      number: 1,
      details: { name: 'download' }
    },
    unzip: {
      number: 2,
      details: { name: 'unzip' }
    }
  }
  const iTotalSteps = Object.keys(oSteps).length
  const sTargetPath = `${sDownloadPath}/${sUI5Version}`
  const sSuccessMessage = `UI5 download (${sUI5Version}) already exist at ${sDownloadPath}/${sUI5Version}`
  const fnProgressCallback =
    typeof oOptions.onProgress === 'function' ? oOptions.onProgress : () => {}

  // check if ui5 library was already downloaded and ectracted
  return fs.existsSync(sTargetPath)
    ? // download is already available
      Promise.resolve(sSuccessMessage)
    : // download and unzip sources
      new Promise((resolve, reject) => {
        progress(
          request.get(
            sDownloadURL,
            { encoding: null },
            (oError, oResponse, oData) => {
              if (oError) {
                // reject promise
                return reject(oError)
              }

              // update progress information (start step 2)
              const oStep = oSteps['unzip']
              fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

              // Do something after request finishes
              const oBuffer = new Buffer(oData, 'binary')
              const zip = new Zip(oBuffer)
              const overwrite = true

              // extracts everything
              zip.extractAllTo(sTargetPath, overwrite)

              // resolve promise
              return resolve(`UI5 download successful: ${sTargetPath}`)
            }
          )
        ).on('progress', oProgressDetails => {
          // update progress information
          const oStep = oSteps['download']
          fnProgressCallback(oStep.number, iTotalSteps, {
            ...oStep.details,
            progress: oProgressDetails.percent * 100
          })
        })
      })
}

/**
 * Use PulseShifts own build tools to build OpenUI5 library.
 *
 * @param {string} [sUI5SrcPath] Source path of the OpenUI5 source code..
 * @param {string} [sUI5TargetPath] Destination path for the build library.
 * @param {string} [sUI5Version] Version number of UI5 to create at <code>sUI5TargetPath</code> a subdirectory named <code>/{{sUI5Version}}</code>.
 * @param {Object} [oOptions] Build options.
 * @param {function(number,number,{ name: string, progress: number|null}):void} [oOptions.onProgress] Callback function to track build progress taking as params: current step number, total step number and if available, step details (object with name and progress in percent).
 * @returns {Promise.string} Promise which resolves to a success or error message.
 */
function buildUI5(sUI5SrcPath, sUI5TargetPath, sUI5Version, oOptions = {}) {
  // check params
  if (!sUI5SrcPath) {
    return Promise.reject('No UI5 source path provided')
  }
  if (!fs.existsSync(sUI5SrcPath)) {
    return Promise.reject(`UI5 source path ${sUI5SrcPath} does not eist`)
  }
  if (!sUI5TargetPath) {
    return Promise.reject('No UI5 target path provided')
  }
  if (!sUI5Version) {
    return Promise.reject('No UI5 version provided')
  }

  // if ui5 target location already exist, cancel to prevent unwanted overrides
  if (fs.existsSync(sUI5TargetPath)) {
    return Promise.resolve(
      `UI5 target directory ${sUI5TargetPath} already exist. Please clean target location for rebuild (directory will be created automatically).`
    )
  }

  const isSrcInDownloadRoot = fs.existsSync(`${sUI5SrcPath}/src`)
  const isSrcInDownloadSubDir = fs
    .readdirSync(sUI5SrcPath)
    .some(sPath => fs.existsSync(`${path.join(sUI5SrcPath, sPath)}/src`))
  const fnProgressCallback =
    typeof oOptions.onProgress === 'function' ? oOptions.onProgress : () => {}

  // cancel if UI5 source code location ('/src' directory) could not be found
  if (!isSrcInDownloadRoot && !isSrcInDownloadSubDir) {
    return Promise.reject(
      `UI5 source code not found in given directory ${sUI5SrcPath}, please check if the given path contains the correct OpenUI5 source code structure.`
    )
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

  // define steps for progress information
  const oSteps = {
    'read modules': { number: 1, details: { name: 'read modules' } },
    'copy debug resources': {
      number: 2,
      details: { name: 'copy debug scripts' }
    },
    'copy minified scripts and other resources': {
      number: 3,
      details: { name: 'minify scripts and copy resources' }
    },
    'compose sap-ui-*.js resources': {
      number: 4,
      details: { name: 'compose sap-ui-*.js resources' }
    },
    'bundle modules': {
      number: 5,
      details: { name: 'bundle modules' }
    },
    'copy themes': {
      number: 6,
      details: { name: 'copy themes' }
    },
    'compile themes': {
      number: 7,
      details: { name: 'compile themes' }
    },
    'post-process CSS': {
      number: 8,
      details: { name: 'minify CSS' }
    },
    'compose sap-ui-version.json': {
      number: 9,
      details: { name: 'compose sap-ui-version.json' }
    }
  }
  const iTotalSteps = Object.keys(oSteps).length

  // initialize build time
  const NOW = new Date()
  const sBuildTime = NOW.toLocaleDateString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: 'numeric'
  })

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

  // 1. collect all module and theme paths of OpenUI5 project
  const oBuildPromiseChain = new Promise((resolve, reject) => {
    // update progress information
    const oStep = oSteps['read modules']
    fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

    // read all directories in 'src'
    return fs.readdir(
      `${sUI5SrcPath}/src/`,
      // TODO: add error message
      (oError, aPaths) => (oError ? reject() : resolve(aPaths))
    )
  })
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
          // update progress information
          const oStep = oSteps['copy debug resources']
          fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

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
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )
    // 3. copy all other resources of modules in target directory and this time minify JS
    .then(
      () =>
        new Promise((resolve, reject) => {
          // update progress information
          const oStep = oSteps['copy minified scripts and other resources']
          fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

          return (
            gulp
              .src([
                `${sUI5SrcPath}/LICENSE.txt`,
                `${sUI5SrcPath}/NOTICE.txt`,
                `${sUI5SrcPath}/README.md`,
                // module files
                ...aUI5Modules.map(oModule => `${oModule.path}/src/**/*`)
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
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )
    // 4. build and concat sap-ui-*.js resources in target location
    .then(
      () =>
        new Promise((resolve, reject) => {
          // update progress information
          const oStep = oSteps['compose sap-ui-*.js resources']
          fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

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
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )
    // 5. create preload bundle files for all modules (except sap.ui.core, because guess why: it has special requirements) and save them at target directory
    .then(() => {
      // update progress information
      const oStep = oSteps['bundle modules']
      fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

      return Promise.all(
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
    }) // end Promise.all
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
          // update progress information
          const oStep = oSteps['copy themes']
          fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

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
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )
    // 8. build css libraries for all themes of all modules
    .then(
      () =>
        new Promise((resolve, reject) => {
          // update progress information
          const oStep = oSteps['compile themes']
          fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

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
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )
    // 9. minify and clean up css resources
    .then(
      () =>
        new Promise((resolve, reject) => {
          // update progress information
          const oStep = oSteps['post-process CSS']
          fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

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
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )
    // 10. [FINAL STEP] last but not least: write sap-ui-version.json
    .then(
      () =>
        new Promise((resolve, reject) => {
          // update progress information
          const oStep = oSteps['compose sap-ui-version.json']
          fnProgressCallback(oStep.number, iTotalSteps, oStep.details)

          const oVersionJSON = {
            buildTimestamp: sBuildTime,
            name: 'openui5-sdk-dist-pulseshift-custom',
            version: sUI5Version,
            librares: aUI5Modules.map(oModule => ({
              buildTimestamp: sBuildTime,
              name: oModule.name,
              version: sUI5Version
            }))
          }
          const sVersionJSONString = JSON.stringify(oVersionJSON, null, 2)
          const sSuccessMessage = `UI5 build successful: ${sUI5Version}`

          // write JSON file
          fs.writeFile(
            `${sUI5TargetPath}/sap-ui-version.json`,
            sVersionJSONString,
            oError => (oError ? reject() : resolve(sSuccessMessage))
          )
        })
    )

  // return promise
  return oBuildPromiseChain
}

/**
 * Compile library.source.less and dependencies to library.css.
 *
 * @param {Vinyl} [oFile] Vinyl file object of library-preload.json.
 * @returns {Vinyl} Transformed library-preload.json.
 */
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
        return Promise.reject('Compile UI5 less lib: ')
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
      return Promise.resolve()
    })

  return oBuildThemePromise
}

/**
 * Transform library-preload.json content.
 *
 * @param {Vinyl} [oFile] Vinyl file object of library-preload.json.
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
 * @param {Vinyl} [oFile] Vinyl file object sap-ui-*.js.
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
