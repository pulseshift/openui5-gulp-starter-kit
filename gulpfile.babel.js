/* eslint-env node */

/**
 *
 *  OpenUI5 Gulp Starter Kit
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

import pkg from './package.json'
import gulp from 'gulp'
import gutil from 'gulp-util'
import gulpif from 'gulp-if'
import rename from 'gulp-rename'
import plumber from 'gulp-plumber'
import babel from 'gulp-babel'
import uglify from 'gulp-uglify'
import htmlmin from 'gulp-htmlmin'
import prettydata from 'gulp-pretty-data'
import imagemin from 'gulp-imagemin'
import cleanCSS from 'gulp-clean-css'
import less from 'gulp-less'
import tap from 'gulp-tap'
import sourcemaps from 'gulp-sourcemaps'
import ui5preload from 'gulp-ui5-preload'
import ui5Bust from 'ui5-cache-buster'
import { ui5Download, ui5Build, ui5CompileLessLib } from 'ui5-lib-util'
import ui5uploader from 'gulp-nwabap-ui5uploader'
import LessAutoprefix from 'less-plugin-autoprefix'
import ora from 'ora'
import del from 'del'
import path from 'path'
import fs from 'fs'
import commander from 'commander'
import server from 'browser-sync'
import handlebars from 'handlebars'
import gulpHandlebars from 'gulp-handlebars-html'
import browserify from 'browserify'
import mainNpmFiles from 'gulp-main-npm-files'
import source from 'vinyl-source-stream'
import buffer from 'vinyl-buffer'
import babelify from 'babelify'

/*
 * SETUP SCRIPT RUNTIME ENVIRONMENT
 */

// parse program commands
commander
  .version(pkg.version)
  .option('--silent')
  .parse(process.argv)

const hdlbars = gulpHandlebars(handlebars)
const spinner = ora()

// register handlebars helper function
handlebars.registerHelper('secure', function(str) {
  return new handlebars.SafeString(str)
})

// switch between gulp log and custom log
spinner.enabled = commander.silent
spinner.print = sText => spinner.stopAndPersist({ text: sText })

/*
 * CONFIGURATION
 */

// path to source directory
const SRC = 'src'
// path to development directory
const DEV = '.tmp'
// path to ditribution directory
const DIST = 'dist'
// path to ui5 repository
const UI5 = process.env.NODE_ENV === 'development' ? 'ui5' : 'ui5'

// read modules
const aApps = pkg.ui5.apps || []
const aThemes = pkg.ui5.themes || []
const aLibs = pkg.ui5.libraries || []
const aAssets = pkg.ui5.assets || []
const aModules = []
  .concat(aApps)
  .concat(aThemes)
  .concat(aLibs)
  .concat(aAssets)

// paths used in our app
const paths = {
  entry: {
    src: [pkg.main]
  },
  assets: {
    src: aModules
      .reduce(
        (aSrc, oModule) =>
          aSrc.concat([
            `${oModule.path}/**/*.properties`,
            `${oModule.path}/**/*.json`,
            `${oModule.path}/**/*.{xml,html}`,
            `${oModule.path}/**/*.css`,
            `${oModule.path}/**/*.{jpg,jpeg,png,svg,ico}`
          ]),
        []
      )
      // take into account .js files only for asset roots
      .concat(aAssets.map(oAsset => `${oAsset.path}/**/*.js`))
  },
  scripts: {
    src: aApps.concat(aLibs).map(oModule => `${oModule.path}/**/*.js`)
  },
  appStyles: {
    src: aApps.concat(aAssets).map(oModule => `${oModule.path}/**/*.less`)
  },
  libStyles: {
    src: aLibs.map(oLibrary => `${oLibrary.path}/**/*.less`)
  },
  themeStyles: {
    src: aThemes.map(oTheme => `${oTheme.path}/**/*.less`)
  },
  cacheBuster: {
    // this should be the result file of task 'entryDist'
    src: [`${DIST}/index.html`]
  }
}

/**
 * Gulp 'start' task (development mode).
 * @description Call update and start file watcher.
 * @public
 */
const start = gulp.series(
  logStart,
  clean,
  gulp.parallel(gulp.series(downloadOpenUI5, buildOpenUI5), loadDependencies),
  copyUi5Theme,
  gulp.parallel(
    entry,
    assets,
    scripts,
    ui5AppStyles,
    ui5LibStyles,
    ui5ThemeStyles
  ),
  logStats,
  watch
)

// log start message and start spinner
function logStart(done) {
  spinner.print(' ')
  spinner.start('Start development server...')
  done()
}

// log common statistics
function logStatsCommons() {
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sUI5Version = oSource.version
  const sOnlineUI5State =
    !oSource.isArchive && oSource.isPrebuild ? '(remote)' : ''
  const sUI5Details = !oSource.isPrebuild ? '(custom build)' : sOnlineUI5State

  const iApps = (pkg.ui5.apps || []).length
  const iThemes = (pkg.ui5.themes || []).length
  const iLibs = (pkg.ui5.libraries || []).length

  const sVendorLibsPath = pkg.ui5.vendor ? pkg.ui5.vendor.path : ''
  const aVendorLibs = mainNpmFiles()

  if (aVendorLibs.length > 0) {
    spinner
      .print(' ')
      .succeed(
        `Dependencies (vendor libraries) loaded into: ${sVendorLibsPath}`
      )

    aVendorLibs.forEach(sEntry => {
      const sModuleName = sEntry.split('/node_modules/')[1].split('/')[0]
      spinner.print(`• ${sModuleName} as ${getExposedModuleName(sModuleName)}`)
    })
  }

  // print success message
  spinner.print(' ')
  spinner.succeed(`UI5 Version: ${sUI5Version} ${sUI5Details}`).print(' ')
  spinner
    .succeed('UI5 assets created:')
    .print(`• ${iApps} app${iApps !== 1 ? 's' : ''}`)
    .print(`• ${iThemes} theme${iThemes !== 1 ? 's' : ''}`)
    .print(`• ${iLibs} librar${iLibs !== 1 ? 'ies' : 'y'}`)
    .print(' ')
}

// log start statistics and stop spinner
function logStats(done) {
  // print success message
  spinner.succeed(
    'Development server started, use Ctrl+C to stop and go back to the console...'
  )
  logStatsCommons()
  done()
}
export default start

/**
 * Gulp 'build' task (distribution mode).
 * @description Build the complete app to run in production environment.
 * @public
 */
const build = gulp.series(
  logStartDist,
  cleanDist,
  gulp.parallel(
    gulp.series(downloadOpenUI5, buildOpenUI5),
    loadDependenciesDist
  ),
  copyUi5Theme,
  gulp.parallel(
    entryDist,
    assetsDist,
    scriptsDist,
    ui5AppStylesDist,
    ui5LibStylesDist,
    ui5ThemeStylesDist
  ),
  gulp.parallel(ui5preloads, ui5LibPreloads),
  ui5cacheBust,
  logStatsDist
)

// log start build message and start spinner
function logStartDist(done) {
  spinner.print(' ')
  spinner.start('Build start...')
  done()
}

// log build statistics and stop spinner
function logStatsDist(done) {
  // print success message
  spinner
    .succeed('Build successfull.')
    .print(' ')
    .print(`Build entry:  ${pkg.main}`)
    .print(`Build output: ${path.resolve(__dirname, DIST)}`)
  logStatsCommons()
  done()
}
export { build }

/**
 * Gulp 'deploy' task (distribution mode).
 * @description Deploy the complete app to run in production environment.
 * @public
 */
const deploy = gulp.series(
  logStartDeploy,
  // TODO: add test task to run qunit and opa5 tests
  build,
  ui5Upload,
  logStatsDeploy
)

// log start deploy message and start spinner
function logStartDeploy(done) {
  spinner.print(' ')
  spinner.start('Deployment start...')
  done()
}

// log deploy statistics and stop spinner
function logStatsDeploy(done) {
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sUI5Version = oSource.version
  const sBackendServer = pkg.ui5.nwabapUpload.conn.server
  const sOnlineUI5State =
    !oSource.isArchive && oSource.isPrebuild ? '(remote)' : ''
  const sUI5Details = !oSource.isPrebuild ? '(custom build)' : sOnlineUI5State

  const aApps = pkg.ui5.apps || []
  const iApps = aApps.length
  const iThemes = (pkg.ui5.themes || []).length
  const iLibs = (pkg.ui5.libraries || []).length

  // print success message
  spinner
    .succeed('Deployment successfull.')
    .print(' ')
    .print(`Deployed entry:    ${pkg.main}`)
    .print(`ABAP Server:       ${sBackendServer}`)
    .print(' ')
    .print('Apps uploaded:')
    .print(' ')

  aApps.forEach(oApp => {
    const sDevPackage = oApp.nwabapDestination.package
    const sBspContainer = oApp.nwabapDestination.bspcontainer
    const sBspContainerText = oApp.nwabapDestination.bspcontainer_text
    const sTransportNo = oApp.nwabapDestination.transportno

    spinner
      .print(`App name:          ${oApp.name}`)
      .print(`ABAP Package:      ${sDevPackage}`)
      .print(`BSP Container:     ${sBspContainer}`)
      .print(`BSP Description:   ${sBspContainerText}`)
      .print(`Transport Request: ${sTransportNo}`)
      .print(' ')
  })

  spinner
    .print(`UI5 Version: ${sUI5Version} ${sUI5Details}`)
    .print(' ')
    .print('UI5 assets created:')
    .print(`\u{25FB}  ${iApps} app${iApps !== 1 ? 's' : ''}`)
    .print(`\u{25FB}  ${iThemes} theme${iThemes !== 1 ? 's' : ''}`)
    .print(`\u{25FB}  ${iLibs} librar${iLibs !== 1 ? 'ies' : 'y'}`)
    .print(' ')
  done()
}
export { deploy }

/* ----------------------------------------------------------- *
 * watch files for changes
 * ----------------------------------------------------------- */

// [development build]
function watch() {
  const sSuccessMessage =
    '\u{1F64C}  (Server started, use Ctrl+C to stop and go back to the console...)'

  // start watchers
  gulp.watch(paths.entry.src, gulp.series(entry, reload))
  gulp.watch(paths.assets.src, gulp.series(assets, reload))
  gulp.watch(paths.scripts.src, gulp.series(scripts, reload))
  gulp.watch(paths.appStyles.src, gulp.series(ui5AppStyles, reload))
  gulp.watch(paths.libStyles.src, gulp.series(ui5LibStyles, reload))
  gulp.watch(paths.themeStyles.src, gulp.series(ui5ThemeStyles, reload))

  // start HTTP server
  server.init({
    // learn more about the powerful options (proxy, middleware, etc.) here:
    // https://www.browsersync.io/docs/options
    port: 3000,
    server: {
      baseDir: `./${DEV}`,
      routes: {
        '/ui5': `./${UI5}`
      }
    }
  })

  // log success message
  gutil.log(gutil.colors.green(sSuccessMessage))
}

// [production build]
export function testDist() {
  const sSuccessMessage =
    '\u{1F64C}  (Server started, use Ctrl+C to stop and go back to the console...)'

  // start HTTP server
  server.init({
    port: 3000,
    server: {
      baseDir: `./${DIST}`,
      routes: {
        '/ui5': `./${UI5}`
      }
    }
  })

  // log success message
  gutil.log(gutil.colors.green(sSuccessMessage))
}

/* ----------------------------------------------------------- *
 * reload browser
 * ----------------------------------------------------------- */

// [development build]
function reload(done) {
  server.reload()
  done()
}

/* ----------------------------------------------------------- *
 * if required: download and build OpenUI5 library
 * ----------------------------------------------------------- */

// [development & production build]
export function downloadOpenUI5() {
  try {
    const sSourceID = pkg.ui5.src
    const oSource = pkg.ui5.srcLinks[sSourceID]
    const sUI5Version = oSource.version
    const sCompiledURL = handlebars.compile(oSource.url)(oSource)
    const isRemoteLink = sCompiledURL.startsWith('http')

    // if UI5 download link is marked as prebuild,
    // we can extract it directly into '/ui5' target directory
    const sDownloadPath = !oSource.isPrebuild
      ? path.resolve(__dirname, './.download')
      : path.resolve(__dirname, `./${UI5}`)
    const isDownloadRequired =
      oSource.isArchive &&
      isRemoteLink &&
      !fs.existsSync(`${sDownloadPath}/${sUI5Version}`)
    const oDownloadOptions = {
      onProgress(iStep, iTotalSteps, oStepDetails) {
        // update spinner state
        spinner.text = `Downloading UI5... [${iStep}/${iTotalSteps}] ${Math.round(
          oStepDetails.progress || 0
        )}% (${oStepDetails.name})`
      }
    }

    if (isDownloadRequired) {
      // update spinner state
      spinner.text =
        'Downloading UI5... (this task can take several minutes, please be patient)'
    }

    // return promise
    return isDownloadRequired
      ? ui5Download(sCompiledURL, sDownloadPath, sUI5Version, oDownloadOptions)
          .then(sSuccessMessage => {
            spinner.succeed(sSuccessMessage)
            spinner.start('')
          })
          .catch(sErrorMessage => {
            spinner.fail(sErrorMessage)
            spinner.start('')
          })
      : Promise.resolve()
  } catch (error) {
    spinner.fail(error)
  }
}

// [development & production build]
export function buildOpenUI5() {
  try {
    // define build Promise
    const sSourceID = pkg.ui5.src
    const oSource = pkg.ui5.srcLinks[sSourceID]
    const sUI5Version = oSource.version

    const sDownloadPath = path.resolve(__dirname, './.download')
    const sUI5TargetPath = path.resolve(__dirname, `./${UI5}/${sUI5Version}`)
    const isBuildRequired =
      oSource.isPrebuild === false && !fs.existsSync(sUI5TargetPath)
    const oBuildOptions = {
      onProgress(iStep, iTotalSteps, oStepDetails) {
        // update spinner state
        spinner.text = `Build UI5... [${iStep}/${iTotalSteps}] (${
          oStepDetails.name
        })`
      }
    }

    if (isBuildRequired) {
      // update spinner state
      spinner.text =
        'Build UI5... (this task can take several minutes, please be patient)'
    }

    return isBuildRequired
      ? ui5Build(
          `${sDownloadPath}/${sUI5Version}`,
          sUI5TargetPath,
          sUI5Version,
          oBuildOptions
        )
          .then(sSuccessMessage => {
            spinner.succeed(sSuccessMessage)
            spinner.start('')
          })
          .catch(sErrorMessage => {
            spinner.fail(sErrorMessage)
            spinner.start('')
          })
      : Promise.resolve()
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * clean development directory
 * ----------------------------------------------------------- */

// [development build]
function clean() {
  try {
    return del([`${DEV}/**/*`, `!${UI5}/**/*`])
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function cleanDist() {
  try {
    return del([`${DIST}/**/*`, `!${UI5}/**/*`])
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * optimize and compile app entry (src/index.handlebars)
 * ----------------------------------------------------------- */

// [helper function]
function getHandlebarsProps(sEntryHTMLPath) {
  const aResourceRootsSrc = []
    .concat(pkg.ui5.apps)
    .concat(pkg.ui5.vendor ? [pkg.ui5.vendor] : [])
    .concat(pkg.ui5.libraries)
    .concat(pkg.ui5.assets)

  return {
    indexTitle: pkg.ui5.indexTitle,
    src: getRelativeUI5SrcURL(sEntryHTMLPath),
    theme: pkg.ui5.theme,
    // create resource roots string
    resourceroots: JSON.stringify(
      aResourceRootsSrc.reduce((oResult, oModule) => {
        const sModulePath = oModule.path.replace(
          new RegExp(`^${SRC}`),
          process.env.NODE_ENV === 'development' ? DEV : DIST
        )
        // create path to theme relative to entry HTML
        return Object.assign(oResult, {
          [oModule.name]: path.relative(
            path.parse(sEntryHTMLPath).dir,
            sModulePath
          )
        })
      }, {})
    ),
    // create custom theme roots string
    themeroots: JSON.stringify(
      pkg.ui5.themes.reduce((oResult, oTheme) => {
        const sThemePath = oTheme.path.replace(
          new RegExp(`^${SRC}`),
          process.env.NODE_ENV === 'development' ? DEV : DIST
        )
        // create path to theme relative to entry HTML
        return Object.assign(oResult, {
          [oTheme.name]: path.relative(
            path.parse(sEntryHTMLPath).dir,
            `${sThemePath}/UI5`
          )
        })
      }, {})
    )
  }
}

// [helper function]
function getRelativeUI5SrcURL(sEntryHTMLPath) {
  const sEntryPath = path.dirname(sEntryHTMLPath)
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sCompiledURL = handlebars.compile(oSource.url)(oSource)
  const isRemoteLink = sCompiledURL.startsWith('http')

  const sOpenUI5PathNaked = path.resolve(
    __dirname,
    `${UI5}/${oSource.version}/sap-ui-core.js`
  )
  const sOpenUI5PathWrapped = path.resolve(
    __dirname,
    `${UI5}/${oSource.version}/resources/sap-ui-core.js`
  )

  let sRelativeUI5Path = ''

  if (oSource.isArchive && isRemoteLink && !oSource.isPrebuild) {
    // ui5/version/sap-ui-core.js
    sRelativeUI5Path = path.relative(sEntryPath, sOpenUI5PathNaked)
  } else if (oSource.isArchive && isRemoteLink && oSource.isPrebuild) {
    // ui5/version/resources/sap-ui-core.js (wrapped) OR ui5/version/sap-ui-core.js (naked)
    sRelativeUI5Path = path.relative(
      sEntryPath,
      fs.existsSync(sOpenUI5PathWrapped)
        ? sOpenUI5PathWrapped
        : sOpenUI5PathNaked
    )
  } else if (!oSource.isArchive && isRemoteLink) {
    // direct remote link
    sRelativeUI5Path = sCompiledURL
  } else if (!isRemoteLink) {
    // direct local link
    sRelativeUI5Path = path.relative(sEntryPath, sCompiledURL)
  }

  return sRelativeUI5Path
}

// [development build]
function entry() {
  try {
    // update spinner state
    spinner.text = 'Compiling project resources...'

    const aEntries = paths.entry.src.map(
      sEntry =>
        new Promise((resolve, reject) =>
          gulp
            .src(
              [sEntry],
              // filter out unchanged files between runs
              { base: SRC, since: gulp.lastRun(entry) }
            )
            // don't exit the running watcher task on errors
            .pipe(plumber())
            // compile handlebars to HTML
            .pipe(
              hdlbars(
                getHandlebarsProps(
                  path.resolve(
                    __dirname,
                    sEntry.replace(new RegExp(`^${SRC}`), DEV)
                  )
                )
              )
            )
            .pipe(rename({ extname: '.html' }))
            .on('error', reject)
            .pipe(gulp.dest(DEV))
            .on('end', resolve)
        )
    )

    return Promise.all(aEntries)
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function entryDist() {
  try {
    // update spinner state
    spinner.text = 'Compiling project resources...'

    const aEntries = paths.entry.src.map(
      sEntry =>
        new Promise((resolve, reject) =>
          gulp
            .src(
              [sEntry],
              // filter out unchanged files between runs
              { base: SRC, since: gulp.lastRun(entry) }
            )
            // don't exit the running watcher task on errors
            .pipe(plumber())
            // compile handlebars to HTML
            .pipe(
              hdlbars(
                getHandlebarsProps(
                  path.resolve(
                    __dirname,
                    sEntry.replace(new RegExp(`^${SRC}`), DIST)
                  )
                )
              )
            )
            // minify HTML (disabled, cause data-sap-ui-theme-roots gets removed)
            // .pipe(htmlmin())
            .pipe(rename({ extname: '.html' }))
            .on('error', reject)
            .pipe(gulp.dest(DIST))
            .on('end', resolve)
        )
    )

    return Promise.all(aEntries)
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * copy assets to destination folder (.png, .jpg, .json, ...)
 * ----------------------------------------------------------- */

// [development build]
function assets() {
  try {
    return paths.assets.src.length === 0
      ? Promise.resolve()
      : gulp
          .src(
            paths.assets.src,
            // filter out unchanged files between runs
            { base: SRC, since: gulp.lastRun(assets) }
          )
          // don't exit the running watcher task on errors
          .pipe(plumber())
          // do not optimize size and quality of images in dev mode

          // transpile JS: babel will run with the settings defined in `.babelrc` file
          .pipe(gulpif(/.*\.js$/, sourcemaps.init()))
          .pipe(gulpif(/.*\.js$/, babel()))
          .pipe(gulpif(/.*\.js$/, sourcemaps.write('../.maps')))
          .pipe(gulp.dest(DEV))
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function assetsDist() {
  try {
    return paths.assets.src.length === 0
      ? Promise.resolve()
      : gulp
          .src(paths.assets.src, { base: SRC })
          // optimize size and quality of images
          .pipe(
            gulpif(
              /.*\.(jpg|jpeg|png)$/,
              imagemin({
                progressive: true,
                interlaced: true
              })
            )
          )
          // minify XML, SVG and JSON
          .pipe(
            gulpif(
              /.*\.(xml|json|svg)$/,
              prettydata({
                type: 'minify',
                extensions: {
                  svg: 'xml'
                }
              })
            )
          )
          // minify HTML
          .pipe(gulpif(/.*\.html$/, htmlmin()))
          // minify CSS
          .pipe(
            gulpif(
              /.*\.css$/,
              cleanCSS({
                // do not resolve inline imports of assets
                inline: false,
                level: 2
              })
            )
          )
          // transpile JS: babel will run with the settings defined in `.babelrc` file
          .pipe(gulpif(/.*\.js$/, babel()))
          // minify JS
          .pipe(gulpif(/.*\.js$/, uglify()))
          .pipe(gulp.dest(DIST))
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * process scripts and transpiles ES2015 code to ES5 (.js, ...)
 * ----------------------------------------------------------- */

// [development build]
function scripts() {
  try {
    return paths.scripts.src.length === 0
      ? Promise.resolve()
      : gulp
          .src(
            paths.scripts.src,
            // filter out unchanged files between runs
            { base: SRC, since: gulp.lastRun(scripts) }
          )
          // don't exit the running watcher task on errors
          .pipe(plumber())
          .pipe(sourcemaps.init())
          // babel will run with the settings defined in `.babelrc` file
          .pipe(babel())
          .pipe(sourcemaps.write('../.maps'))
          .pipe(gulp.dest(DEV))
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function scriptsDist() {
  try {
    return paths.scripts.src.length === 0
      ? Promise.resolve()
      : gulp
          .src(paths.scripts.src, { base: SRC })
          // babel will run with the settings defined in `.babelrc` file
          .pipe(babel())
          // save non-minified copies with debug duffix
          .pipe(rename({ suffix: '-dbg' }))
          .pipe(gulp.dest(DIST))
          // process copies without suffix
          .pipe(
            rename(oFile => {
              oFile.basename = oFile.basename.replace(/-dbg$/, '')
              return oFile
            })
          )

          // minify scripts
          .pipe(uglify())
          .pipe(gulp.dest(DIST))
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * compile and automatically prefix stylesheets (.less, ...)
 * ----------------------------------------------------------- */

// [development build]
function ui5AppStyles() {
  try {
    const autoprefix = new LessAutoprefix({ browsers: ['last 2 versions'] })
    return paths.appStyles.src.length === 0
      ? Promise.resolve()
      : gulp
          .src(
            paths.appStyles.src,
            // filter out unchanged files between runs
            { base: SRC, since: gulp.lastRun(ui5AppStyles) }
          )
          // don't exit the running watcher task on errors
          .pipe(plumber())
          .pipe(sourcemaps.init())
          // compile LESS to CSS
          .pipe(
            less({
              plugins: [autoprefix]
            })
          )
          .pipe(sourcemaps.write('../.maps'))
          .pipe(gulp.dest(DEV))
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function ui5AppStylesDist() {
  try {
    const autoprefix = new LessAutoprefix({ browsers: ['last 2 versions'] })
    return paths.appStyles.src.length === 0
      ? Promise.resolve()
      : gulp
          .src(paths.appStyles.src, { base: SRC })
          // compile LESS to CSS
          .pipe(
            less({
              plugins: [autoprefix]
            })
          )
          // minify CSS
          .pipe(
            cleanCSS({
              level: 2
            })
          )
          .pipe(gulp.dest(DIST))
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * bundle app resources in Component-preload.js file
 * ----------------------------------------------------------- */

// [production build]
function ui5preloads() {
  try {
    // update spinner state
    spinner.text = 'Bundling modules...'

    const aPreloadPromise = pkg.ui5.apps.map(oApp => {
      const sDistAppPath = oApp.path.replace(new RegExp(`^${SRC}`), DIST)
      return new Promise(function(resolve, reject) {
        gulp
          .src([
            // bundle all app resources supported by OpenUI5
            `${sDistAppPath}/**/*.js`,
            `${sDistAppPath}/**/*.view.xml`,
            `${sDistAppPath}/**/*.fragment.xml`,
            `${sDistAppPath}/**/manifest.json`,
            // don't bundle debug resources
            `!${sDistAppPath}/**/*-dbg.js`
          ])
          .pipe(
            ui5preload({
              base: sDistAppPath,
              namespace: oApp.name,
              isLibrary: false
            })
          )
          .on('error', reject)
          .pipe(gulp.dest(sDistAppPath))
          .on('end', resolve)
      })
    })
    return Promise.all(aPreloadPromise)
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * bundle library resources in library-preload.js file
 * ----------------------------------------------------------- */

// [production build]
function ui5LibPreloads() {
  try {
    const aLibraries = pkg.ui5.libraries || []
    const aPreloadPromise = aLibraries.map(oLibrary => {
      const sDistLibraryPath = oLibrary.path.replace(
        new RegExp(`^${SRC}`),
        DIST
      )
      return new Promise(function(resolve, reject) {
        gulp
          .src([
            // bundle all library resources
            `${sDistLibraryPath}/**/*.js`,
            `${sDistLibraryPath}/**/*.json`,
            // don't bundle debug or peload resources
            `!${sDistLibraryPath}/**/*-dbg.js`,
            `!${sDistLibraryPath}/**/*-preload.js`
          ])
          .pipe(
            ui5preload({
              base: sDistLibraryPath,
              namespace: oLibrary.name,
              // if set to true a library-preload.json file is emitted
              isLibrary: true
            })
          )
          // transform all library-preload.json files into library-preload.js (mandatory since OpenUI5 1.40)
          .pipe(
            gulpif(
              '**/library-preload.json',
              tap(oFile => {
                const oJSONRaw = oFile.contents.toString('utf8')
                oFile.contents = new Buffer(
                  `jQuery.sap.registerPreloadedModules(${oJSONRaw});`
                )
                return oFile
              })
            )
          )
          .pipe(gulpif('**/library-preload.json', rename({ extname: '.js' })))
          .on('error', reject)
          .pipe(gulp.dest(sDistLibraryPath))
          .on('end', resolve)
      })
    })
    return Promise.all(aPreloadPromise)
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * bundle theme styles in library.css file
 * ----------------------------------------------------------- */

// [development build]
function ui5LibStyles() {
  try {
    const aLibraries = pkg.ui5.libraries || []
    const mapPathToDev = sPath => sPath.replace(new RegExp(`^${SRC}`), DEV)
    const aSelectLibrarySources = aLibraries.map(
      oLibrary => `${mapPathToDev(oLibrary.path)}/**/library.source.less`
    )

    return paths.libStyles.src.length === 0
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          // 1. copy theme resources (assets) to DEV
          gulp
            .src(paths.libStyles.src, {
              base: SRC,
              // filter out unchanged files between runs
              since: gulp.lastRun(ui5LibStyles)
            })
            // don't exit the running watcher task on errors
            .pipe(plumber())
            .pipe(gulp.dest(DEV))
            .on('error', reject)
            .on('end', resolve)
        }).then(
          () =>
            new Promise((resolve, reject) => {
              // 2. compile library.css
              gulp
                .src(aSelectLibrarySources, {
                  base: DEV,
                  read: true,
                  // filter out unchanged files between runs
                  since: gulp.lastRun(ui5LibStyles)
                })
                // don't exit the running watcher task on errors
                .pipe(plumber())
                .pipe(
                  tap(oFile => {
                    ui5CompileLessLib(oFile)
                  })
                )
                .pipe(gulp.dest(DEV))
                .on('error', reject)
                .on('end', resolve)
            })
        )
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function ui5LibStylesDist() {
  try {
    const aLibraries = pkg.ui5.libraries || []
    const mapPathToDist = sPath => sPath.replace(new RegExp(`^${SRC}`), DIST)
    const aSelectLibrarySources = aLibraries.map(
      oLibrary => `${mapPathToDist(oLibrary.path)}/**/library.source.less`
    )
    const aSelectLibraryBundles = aLibraries.reduce(
      (aBundles, oLibrary) =>
        aBundles.concat([
          `${mapPathToDist(oLibrary.path)}/**/library.css`,
          `${mapPathToDist(oLibrary.path)}/**/library-RTL.css`
        ]),
      []
    )

    return paths.libStyles.src.length === 0
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          // 1. copy theme resources (assets) to DEV
          gulp
            .src(paths.libStyles.src, {
              base: SRC
            })
            .pipe(gulp.dest(DIST))
            .on('error', reject)
            .on('end', resolve)
        })
          .then(
            () =>
              new Promise((resolve, reject) => {
                // 2. compile library.css
                gulp
                  .src(aSelectLibrarySources, {
                    read: true,
                    base: DIST
                  })
                  .pipe(
                    tap(oFile => {
                      ui5CompileLessLib(oFile)
                    })
                  )
                  .pipe(gulp.dest(DIST))
                  .on('error', reject)
                  .on('end', resolve)
              })
          )
          .then(
            () =>
              new Promise((resolve, reject) =>
                // 3. minify css after creation
                gulp
                  .src(aSelectLibraryBundles, {
                    base: DIST
                  })
                  // minify CSS
                  .pipe(
                    cleanCSS({
                      level: 2
                    })
                  )
                  .pipe(gulp.dest(DIST))
                  .on('end', resolve)
                  .on('error', reject)
              )
          )
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * bundle theme styles in library.css file
 * ----------------------------------------------------------- */

// [development & production build]
function copyUi5Theme() {
  try {
    const aThemes = pkg.ui5.themes || []
    const sSourceID = pkg.ui5.src
    const oSource = pkg.ui5.srcLinks[sSourceID]
    const sUI5Version = oSource.version
    const sCompiledURL = handlebars.compile(oSource.url)(oSource)
    const isPrebuild = oSource.isPrebuild
    const isArchive = oSource.isArchive
    const isRemoteLibrary =
      sCompiledURL.startsWith('http') && !isArchive && isPrebuild

    const sOpenUI5PathNaked = `${UI5}/${sUI5Version}/sap-ui-core.js`
    const sOpenUI5PathWrapped = `${UI5}/${sUI5Version}/resources/sap-ui-core.js`

    const sUI5Path = fs.existsSync(path.resolve(__dirname, sOpenUI5PathWrapped))
      ? sOpenUI5PathWrapped.replace(/\/sap-ui-core\.js$/, '')
      : sOpenUI5PathNaked.replace(/\/sap-ui-core\.js$/, '')

    if (aThemes.length === 0) {
      return Promise.resolve()
    }

    if (isRemoteLibrary) {
      throw 'Custom UI5 theme build can only be used with a local UI5 library (remote UI5 libs are not supported).'
    }

    // copy UI5 theme resources to path/to/my/theme/UI5 [one-time after building ui5]
    const aThemeUpdates = aThemes.map(
      oTheme =>
        new Promise((resolve, reject) =>
          gulp
            .src(
              [
                `${sUI5Path}/**/*.css`,
                `${sUI5Path}/**/themes/**/*`,
                `!${sUI5Path}/**/themes/**/library.css`,
                `!${sUI5Path}/**/themes/**/library-*.css`,
                `!${sUI5Path}/**/themes/**/*.json`
              ],
              {
                base: `${sUI5Path}`
              }
            )
            .pipe(gulp.dest(`${oTheme.path}/UI5`))
            .on('error', reject)
            .on('end', resolve)
        )
    )

    return Promise.all(aThemeUpdates)
  } catch (error) {
    spinner.fail(error)
  }
}

// [development build]
function ui5ThemeStyles() {
  try {
    const sTargetTheme = pkg.ui5.theme
    const aThemes = pkg.ui5.themes || []
    const mapPathToDev = sPath => sPath.replace(new RegExp(`^${SRC}`), DEV)
    const aSelectLibrarySources = aThemes.map(
      oTheme =>
        `${mapPathToDev(
          oTheme.path
        )}/**/themes/${sTargetTheme}/library.source.less`
    )

    return paths.themeStyles.src.length === 0
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          // 1. copy theme resources (assets) to DEV
          gulp
            .src(paths.themeStyles.src, {
              base: SRC,
              // filter out unchanged files between runs
              since: gulp.lastRun(ui5ThemeStyles)
            })
            // don't exit the running watcher task on errors
            .pipe(plumber())
            .pipe(gulp.dest(DEV))
            .on('error', reject)
            .on('end', resolve)
        }).then(
          () =>
            new Promise((resolve, reject) => {
              // 2. compile library.css
              gulp
                .src(aSelectLibrarySources, {
                  base: DEV,
                  read: true,
                  // filter out unchanged files between runs
                  since: gulp.lastRun(ui5ThemeStyles)
                })
                // don't exit the running watcher task on errors
                .pipe(plumber())
                .pipe(
                  tap(oFile => {
                    ui5CompileLessLib(oFile)
                  })
                )
                .pipe(gulp.dest(DEV))
                .on('error', reject)
                .on('end', resolve)
            })
        )
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function ui5ThemeStylesDist() {
  try {
    const sTargetTheme = pkg.ui5.theme
    const aThemes = pkg.ui5.themes || []
    const mapPathToDist = sPath => sPath.replace(new RegExp(`^${SRC}`), DIST)
    const aSelectLibrarySources = aThemes.map(
      oTheme =>
        `${mapPathToDist(
          oTheme.path
        )}/**/themes/${sTargetTheme}/library.source.less`
    )
    const aSelectLibraryBundles = aThemes.reduce(
      (aBundles, oTheme) =>
        aBundles.concat([
          `${mapPathToDist(oTheme.path)}/**/themes/${sTargetTheme}/library.css`,
          `${mapPathToDist(
            oTheme.path
          )}/**/themes/${sTargetTheme}/library-RTL.css`
        ]),
      []
    )

    return paths.themeStyles.src.length === 0
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          // 1. copy theme resources (assets) to DEV
          gulp
            .src(paths.themeStyles.src, {
              base: SRC
            })
            .pipe(gulp.dest(DIST))
            .on('error', reject)
            .on('end', resolve)
        })
          .then(
            () =>
              new Promise((resolve, reject) => {
                // 2. compile library.css
                gulp
                  .src(aSelectLibrarySources, {
                    read: true,
                    base: DIST
                  })
                  .pipe(
                    tap(oFile => {
                      ui5CompileLessLib(oFile)
                    })
                  )
                  .pipe(gulp.dest(DIST))
                  .on('error', reject)
                  .on('end', resolve)
              })
          )
          .then(
            () =>
              new Promise((resolve, reject) =>
                // 3. minify css after creation
                gulp
                  .src(aSelectLibraryBundles, {
                    base: DIST,
                    // select only files that have changed since the last run
                    since: gulp.lastRun(ui5LibStylesDist)
                  })
                  // minify CSS
                  .pipe(
                    cleanCSS({
                      level: 2
                    })
                  )
                  .pipe(gulp.dest(DIST))
                  .on('end', resolve)
                  .on('error', reject)
              )
          )
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * load dependencies
 * ----------------------------------------------------------- */

// [helper function]
function getExposedModuleName(sModule) {
  switch (sModule) {
    // define exceptions here
    case 'lodash':
      return '_'
    default:
      // turn to camel case (e.g. "ok js", "ok-js", "ok_js" become all "okJs")
      return sModule
        .replace(/[\s-_](.)/g, $1 => $1.toUpperCase())
        .replace(/[\s-_]/g, '')
        .replace(/^(.)/, $1 => $1.toLowerCase())
  }
}

// [development build]
function loadDependencies() {
  try {
    if (
      !pkg.ui5.vendor ||
      !pkg.ui5.vendor.path ||
      pkg.ui5.vendor.path.length === 0
    ) {
      return Promise.resolve()
    }

    const aDependencies = mainNpmFiles()
    const sVendorLibsPath = (pkg.ui5.vendor ? pkg.ui5.vendor.path : '').replace(
      new RegExp(`^${SRC}`),
      DEV
    )

    const aEntryBuilds = aDependencies.map(
      sEntry =>
        new Promise((resolve, reject) => {
          const sModuleName = sEntry.split('/node_modules/')[1].split('/')[0]
          const sGlobalname = getExposedModuleName(sModuleName)
          return (
            browserify({
              entries: sEntry,
              standalone: sGlobalname
            })
              // babel will run with the settings defined in `.babelrc` file
              .transform(babelify)
              .bundle()
              .pipe(source('module.js'))
              .pipe(buffer())
              // save dependency based on module name (axios -> axios.js)
              .pipe(
                rename(oPath => {
                  oPath.basename = sModuleName
                })
              )
              .pipe(gulp.dest(sVendorLibsPath))
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )

    const aStyleCopy = aDependencies.map(
      sEntry =>
        new Promise((resolve, reject) => {
          const sStylesheetName = sEntry.replace(/\.js$/, '.css')
          return fs.existsSync(path.resolve(__dirname, sStylesheetName))
            ? gulp
                .src([sStylesheetName])
                .pipe(gulp.dest(sVendorLibsPath))
                .on('end', resolve)
                .on('error', reject)
            : resolve()
        })
    )

    return Promise.all([].concat(aEntryBuilds).concat(aStyleCopy))
  } catch (error) {
    spinner.fail(error)
  }
}

// [production build]
function loadDependenciesDist() {
  try {
    if (
      !pkg.ui5.vendor ||
      !pkg.ui5.vendor.path ||
      pkg.ui5.vendor.path.length === 0
    ) {
      return Promise.resolve()
    }

    const aDependencies = mainNpmFiles()
    const sVendorLibsPath = (pkg.ui5.vendor ? pkg.ui5.vendor.path : '').replace(
      new RegExp(`^${SRC}`),
      DIST
    )

    const aEntryBuilds = aDependencies.map(
      sEntry =>
        new Promise((resolve, reject) => {
          const sModuleName = sEntry.split('/node_modules/')[1].split('/')[0]
          const sGlobalname = getExposedModuleName(sModuleName)
          return (
            browserify({
              entries: sEntry,
              standalone: sGlobalname
            })
              // babel will run with the settings defined in `.babelrc` file
              .transform(babelify)
              .bundle()
              .pipe(source('module.js'))
              .pipe(buffer())
              // save dependency based on module name (axios -> axios.js)
              .pipe(
                rename(oPath => {
                  oPath.basename = sModuleName
                })
              )
              // minify scripts
              .pipe(uglify())
              .pipe(gulp.dest(sVendorLibsPath))
              .on('end', resolve)
              .on('error', reject)
          )
        })
    )

    const aStyleCopy = aDependencies.map(
      sEntry =>
        new Promise((resolve, reject) => {
          const sStylesheetName = sEntry.replace(/\.js$/, '.css')
          return fs.existsSync(path.resolve(__dirname, sStylesheetName))
            ? gulp
                .src([sStylesheetName])
                // minify CSS
                .pipe(
                  cleanCSS({
                    level: 2
                  })
                )
                .pipe(gulp.dest(sVendorLibsPath))
                .on('end', resolve)
                .on('error', reject)
            : resolve()
        })
    )

    return Promise.all([].concat(aEntryBuilds).concat(aStyleCopy))
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * hash module paths (content based) to enable cache buster
 * ----------------------------------------------------------- */

// [production build]
function ui5cacheBust() {
  try {
    // update spinner state
    spinner.text = 'Run cache buster...'

    if (pkg.ui5.cacheBuster === false) {
      return Promise.resolve('Cache buster is deactivated.')
    }

    return paths.cacheBuster.src.length === 0
      ? Promise.resolve()
      : gulp
          .src(paths.cacheBuster.src)
          // rename UI5 module (app component) paths and update index.html
          .pipe(tap(oFile => ui5Bust(oFile)))
          .pipe(gulp.dest(DIST))
  } catch (error) {
    spinner.fail(error)
  }
}

/* ----------------------------------------------------------- *
 * SAP NetWeaver ABAP System UI5 app upload
 * ----------------------------------------------------------- */

// [production build]
function ui5Upload() {
  try {
    // update spinner state
    spinner.text = 'Uploading to SAP NetWeaver ABAP System...'

    // check if cache buster is deactivated
    if (pkg.ui5.cacheBuster === true) {
      return Promise.reject(
        `Cache buster is not supported in combination with nwabap upload, yet.`
      )
    }

    // check if nwabap config is maintained
    if (!pkg.ui5.nwabapUpload) {
      return Promise.reject(
        `Option 'ui5.nwabapUpload' config was not found in package.json`
      )
    }

    const mapPathToDist = sPath => sPath.replace(new RegExp(`^${SRC}`), DIST)
    const aDeployPromise = pkg.ui5.apps.map(oApp => {
      // check if nwabap config is maintained
      if (!oApp.nwabapDestination) {
        return Promise.reject(
          `Option 'nwabapDestination' config was not found for app ${
            oApp.name
          } in package.json`
        )
      }
      const sAppDistPath = mapPathToDist(oApp.path)

      return new Promise((resolve, reject) => {
        gulp
          .src([`${sAppDistPath}/**`])
          .pipe(
            ui5uploader({
              root: sAppDistPath,
              // pass conn and auth config
              ...pkg.ui5.nwabapUpload,
              // pass nwabap bsp destination
              ui5: oApp.nwabapDestination
            })
          )
          .pipe(gulp.dest(sAppDistPath))
          .on('error', reject)
          .on('end', resolve)
      })
    })
    return Promise.all(aDeployPromise)
  } catch (error) {
    spinner.fail(error)
  }
}
