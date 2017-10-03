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
import LessAutoprefix from 'less-plugin-autoprefix'
import ora from 'ora'
import del from 'del'
import path from 'path'
import fs from 'fs'
import commander from 'commander'
import server from 'browser-sync'
import handlebars from 'handlebars'
import gulpHandlebars from 'gulp-handlebars-html'

/*
 * SETUP SCRIPT RUNTIME ENVIRONMENT
 */

// parse program commands
commander.version(pkg.version).option('--silent').parse(process.argv)

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
// path to ditribution direcory
const DIST = 'dist'

// read modules
const aApps = pkg.ui5.apps || []
const aThemes = pkg.ui5.themes || []
const aLibs = pkg.ui5.libraries || []
const aAssets = pkg.ui5.assets || []
const aModules = aApps.concat(aThemes).concat(aLibs).concat(aAssets)

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
  gulp.parallel(gulp.series(downloadOpenUI5, buildOpenUI5), clean),
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

// log start statistics and stop spinner
function logStats(done) {
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sUI5Version = oSource.version
  const sOnlineUI5State =
    !oSource.isArchive && oSource.isPrebuild ? '(remote)' : ''
  const sUI5Details = !oSource.isPrebuild ? '(custom build)' : sOnlineUI5State

  const iApps = (pkg.ui5.apps || []).length
  const iThemes = (pkg.ui5.themes || []).length
  const iLibs = (pkg.ui5.libraries || []).length

  // print success message
  spinner
    .succeed(
      'Development server started, use Ctrl+C to stop and go back to the console...'
    )
    .print(' ')
    .print(`UI5 Version: ${sUI5Version} ${sUI5Details}`)
    .print(' ')
    .print('UI5 assets:')
    .print(`\u{25FB}  ${iApps} app${iApps !== 1 ? 's' : ''}`)
    .print(`\u{25FB}  ${iThemes} theme${iThemes !== 1 ? 's' : ''}`)
    .print(`\u{25FB}  ${iLibs} librar${iLibs !== 1 ? 'ies' : 'y'}`)
    .print(' ')
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
  gulp.parallel(gulp.series(downloadOpenUI5, buildOpenUI5), cleanDist),
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
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sUI5Version = oSource.version
  const sOnlineUI5State =
    !oSource.isArchive && oSource.isPrebuild ? '(remote)' : ''
  const sUI5Details = !oSource.isPrebuild ? '(custom build)' : sOnlineUI5State

  const iApps = (pkg.ui5.apps || []).length
  const iThemes = (pkg.ui5.themes || []).length
  const iLibs = (pkg.ui5.libraries || []).length

  // print success message
  spinner
    .succeed('Build successfull.')
    .print(' ')
    .print(`Build entry: ${pkg.main}`)
    .print(`Build output: ${path.resolve(__dirname, DIST)}`)
    .print(' ')
    .print(`UI5 Version: ${sUI5Version} ${sUI5Details}`)
    .print(' ')
    .print('UI5 assets created:')
    .print(`\u{25FB}  ${iApps} app${iApps !== 1 ? 's' : ''}`)
    .print(`\u{25FB}  ${iThemes} theme${iThemes !== 1 ? 's' : ''}`)
    .print(`\u{25FB}  ${iLibs} librar${iLibs !== 1 ? 'ies' : 'y'}`)
    .print(' ')
  done()
}
export { build }

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
        '/ui5': './ui5'
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
        '/ui5': './ui5'
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
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sUI5Version = oSource.version
  const sCompiledURL = handlebars.compile(oSource.url)(oSource)
  const isRemoteLink = sCompiledURL.startsWith('http')

  // if UI5 download link is marked as prebuild,
  // we can extract it directly into '/ui5' target directory
  const sDownloadPath = !oSource.isPrebuild
    ? path.resolve(__dirname, './.download')
    : path.resolve(__dirname, `./ui5`)
  // const sUI5TargetPath = path.resolve(__dirname, `./ui5/${sUI5Version}`)
  const isDownloadRequired =
    oSource.isArchive &&
    isRemoteLink &&
    // !fs.existsSync(sUI5TargetPath) &&
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
}

// [development & production build]
export function buildOpenUI5() {
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sUI5Version = oSource.version
  // const sCompiledURL = handlebars.compile(oSource.url)(oSource)
  // const isRemoteLink = sCompiledURL.startsWith('http')

  const sDownloadPath = path.resolve(__dirname, './.download')
  const sUI5TargetPath = path.resolve(__dirname, `./ui5/${sUI5Version}`)
  const isBuildRequired =
    oSource.isPrebuild === false && !fs.existsSync(sUI5TargetPath)
  const oBuildOptions = {
    onProgress(iStep, iTotalSteps, oStepDetails) {
      // update spinner state
      spinner.text = `Build UI5... [${iStep}/${iTotalSteps}] (${oStepDetails.name})`
    }
  }

  if (isBuildRequired) {
    // update spinner state
    spinner.text =
      'Build UI5... (this task can take several minutes, please be patient)'
  }

  // define build Promise
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
}

/* ----------------------------------------------------------- *
 * clean development directory
 * ----------------------------------------------------------- */

// [development build]
function clean() {
  return del(`${DEV}/**/*`)
}

// [production build]
function cleanDist() {
  return del(`${DIST}/**/*`)
}

/* ----------------------------------------------------------- *
 * optimize and compile app entry (src/index.handlebars)
 * ----------------------------------------------------------- */

// [helper function]
function getHandlebarsProps() {
  const aResourceRootsSrc = []
    .concat(pkg.ui5.apps)
    .concat(pkg.ui5.libraries)
    .concat(pkg.ui5.assets)

  return {
    indexTitle: pkg.ui5.indexTitle,
    src: getRelativeUI5SrcURL(),
    theme: pkg.ui5.theme,
    // create resource roots string
    resourceroots: JSON.stringify(
      aResourceRootsSrc.reduce(
        (oResult, oModule) =>
          Object.assign(oResult, {
            [oModule.name]: path.relative(
              path.parse(pkg.main).dir,
              oModule.path
            )
          }),
        {}
      )
    ),
    // create custom theme roots string
    themeroots: JSON.stringify(
      pkg.ui5.themes.reduce(
        (oResult, oTheme) =>
          Object.assign(oResult, {
            [oTheme.name]: path.relative(
              path.parse(pkg.main).dir,
              `${oTheme.path}/UI5`
            )
          }),
        {}
      )
    )
  }
}

// [helper function]
function getRelativeUI5SrcURL() {
  const sEntryHTMLPath = pkg.main
  const sSourceID = pkg.ui5.src
  const oSource = pkg.ui5.srcLinks[sSourceID]
  const sCompiledURL = handlebars.compile(oSource.url)(oSource)
  const isRemoteLink = sCompiledURL.startsWith('http')

  let sOpenUI5Path = ''
  let sRelativeUI5Path = ''

  if (oSource.isArchive && isRemoteLink && !oSource.isPrebuild) {
    // ui5/version/sap-ui-core.js
    sOpenUI5Path = `ui5/${oSource.version}/sap-ui-core.js`
    sRelativeUI5Path = path.relative(path.dirname(sEntryHTMLPath), sOpenUI5Path)
  } else if (oSource.isArchive && isRemoteLink && oSource.isPrebuild) {
    // ui5/version/resources/sap-ui-core.js
    sOpenUI5Path = `ui5/${oSource.version}/resources/sap-ui-core.js`
    sRelativeUI5Path = path.relative(path.dirname(sEntryHTMLPath), sOpenUI5Path)
  } else if (!oSource.isArchive && isRemoteLink) {
    // direct link
    sRelativeUI5Path = sCompiledURL
  } else if (!isRemoteLink) {
    // direct link
    sOpenUI5Path = sCompiledURL
    sRelativeUI5Path = path.relative(path.dirname(sEntryHTMLPath), sOpenUI5Path)
  }

  return sRelativeUI5Path
}

// [development build]
function entry() {
  return paths.entry.src.length === 0
    ? Promise.resolve()
    : gulp
        .src(
          paths.entry.src,
          // filter out unchanged files between runs
          { since: gulp.lastRun(entry) }
        )
        // don't exit the running watcher task on errors
        .pipe(plumber())
        // compile handlebars to HTML
        .pipe(hdlbars(getHandlebarsProps()))
        .pipe(rename({ extname: '.html' }))
        .pipe(gulp.dest(DEV))
}

// [production build]
function entryDist() {
  // update spinner state
  spinner.text = 'Compiling project resources...'

  return paths.entry.src.length === 0
    ? Promise.resolve()
    : gulp
        .src(paths.entry.src)
        // compile handlebars to HTML
        .pipe(hdlbars(getHandlebarsProps()))
        // minify HTML (disabled, cause data-sap-ui-theme-roots gets removed)
        // .pipe(htmlmin())
        .pipe(rename({ extname: '.html' }))
        .pipe(gulp.dest(DIST))
}

/* ----------------------------------------------------------- *
 * copy assets to destination folder (.png, .jpg, .json, ...)
 * ----------------------------------------------------------- */

// [development build]
function assets() {
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
        .pipe(gulp.dest(DEV))
}

// [production build]
function assetsDist() {
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
        // minify HTML
        .pipe(gulpif(/.*\.html$/, htmlmin()))
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
        // minify JS
        .pipe(gulpif(/.*\.js$/, uglify()))
        .pipe(gulp.dest(DIST))
}

/* ----------------------------------------------------------- *
 * process scripts and transpiles ES2015 code to ES5 (.js, ...)
 * ----------------------------------------------------------- */

// [development build]
function scripts() {
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
}

// [production build]
function scriptsDist() {
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
}

/* ----------------------------------------------------------- *
 * compile and automatically prefix stylesheets (.less, ...)
 * ----------------------------------------------------------- */

// [development build]
function ui5AppStyles() {
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
}

// [production build]
function ui5AppStylesDist() {
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
            inline: ['none'],
            level: 2
          })
        )
        .pipe(gulp.dest(DIST))
}

/* ----------------------------------------------------------- *
 * bundle app resources in Component-preload.js file
 * ----------------------------------------------------------- */

// [production build]
function ui5preloads() {
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
}

/* ----------------------------------------------------------- *
 * bundle library resources in library-preload.js file
 * ----------------------------------------------------------- */

// [production build]
function ui5LibPreloads() {
  const aLibraries = pkg.ui5.libraries || []
  const aPreloadPromise = aLibraries.map(oLibrary => {
    const sDistLibraryPath = oLibrary.path.replace(new RegExp(`^${SRC}`), DIST)
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
}

/* ----------------------------------------------------------- *
 * bundle theme styles in library.css file
 * ----------------------------------------------------------- */

// [development build]
function ui5LibStyles() {
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
}

// [production build]
function ui5LibStylesDist() {
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
                    inline: ['none'],
                    level: 2
                  })
                )
                .pipe(gulp.dest(DIST))
                .on('end', resolve)
                .on('error', reject)
            )
        )
}

/* ----------------------------------------------------------- *
 * bundle theme styles in library.css file
 * ----------------------------------------------------------- */

// [development build]
function ui5ThemeStyles() {
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
}

// [production build]
function ui5ThemeStylesDist() {
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
                    inline: ['none'],
                    level: 2
                  })
                )
                .pipe(gulp.dest(DIST))
                .on('end', resolve)
                .on('error', reject)
            )
        )
}

/* ----------------------------------------------------------- *
 * hash module paths (content based) to enable cache buster
 * ----------------------------------------------------------- */

// [production build]
function ui5cacheBust() {
  // update spinner state
  spinner.text = 'Run cache buster...'

  return paths.cacheBuster.src.length === 0
    ? Promise.resolve()
    : gulp
        .src(paths.cacheBuster.src)
        // rename UI5 module (app component) paths and update index.html
        .pipe(tap(oFile => ui5Bust(oFile)))
        .pipe(gulp.dest(DIST))
}
