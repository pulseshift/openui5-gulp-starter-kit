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
import ui5preload from 'gulp-ui5-preload'
import ui5Bust from './scripts/ui5-cache-buster'
// import ui5LibUtil from './scripts/ui5-lib-util'
import LessAutoprefix from 'less-plugin-autoprefix'
import del from 'del'
import path from 'path'
import server from 'browser-sync'
import handlebars from 'handlebars'
import gulpHandlebars from 'gulp-handlebars-html'

const hdlbars = gulpHandlebars(handlebars)

// register handlebars helper function
handlebars.registerHelper('secure', function(str) {
  return new handlebars.SafeString(str)
})

/*
 * CONFIGURATION
 */

// path to source directory
const SRC = 'src'
// path to development directory
const DEV = 'dev'
// path to ditribution direcory
const DIST = 'dist'

// paths used in our app
const paths = {
  entry: {
    src: [pkg.main]
  },
  assets: {
    src: [
      `${SRC}/**/*.properties`,
      `${SRC}/**/*.json`,
      `${SRC}/**/*.xml`,
      `${SRC}/**/*.{jpg,jpeg,png,svg,ico}`
    ]
  },
  scripts: {
    src: [`${SRC}/**/*.js`]
  },
  styles: {
    src: [`${SRC}/**/*.less`]
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
  gulp.parallel(loadOpenUI5, clean),
  gulp.parallel(entry, assets, scripts, styles),
  watch
)
export default start

/**
 * Gulp 'build' task (distribution mode).
 * @description Build the complete app to run in production environment.
 * @public
 */
const build = gulp.series(
  gulp.parallel(loadOpenUI5, cleanDist),
  gulp.parallel(entryDist, assetsDist, scriptsDist, stylesDist),
  ui5preloads,
  ui5CacheBuster
)
export { build }

/* ----------------------------------------------------------- *
 * watch files for changes
 * ----------------------------------------------------------- */

// [development build]
function watch() {
  const sSuccessMessage =
    '(Server started, use Ctrl+C to stop and go back to the console...)'

  // start watchers
  gulp.watch(paths.assets.src, gulp.series(assets, reload))
  gulp.watch(paths.scripts.src, gulp.series(scripts, reload))
  gulp.watch(paths.html.src, gulp.series(html, reload))
  gulp.watch(paths.styles.src, gulp.series(styles, reload))

  // start HTTP server
  server.init({
    // learn more about the powerful options (proxy, middleware, etc.) here:
    // https://www.browsersync.io/docs/options
    server: {
      baseDir: `./${DEV}`
    }
    // proxy: 'yourlocal.dev'
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
 * if required: download and build OpenUI5 library from GitHub
 * ----------------------------------------------------------- */

// [development & production build]
function loadOpenUI5(done) {
  done()
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
  return {
    indexTitle: pkg.ui5.indexTitle,
    // create resource roots string
    resourceroots: JSON.stringify(
      pkg.ui5.apps.reduce(
        (oResult, oApp) =>
          Object.assign(oResult, {
            [oApp.name]: path.relative(path.parse(pkg.main).dir, oApp.path)
          }),
        {}
      )
    )
  }
}

// [development build]
function entry() {
  return (
    gulp
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
  )
}

// [production build]
function entryDist() {
  return (
    gulp
      .src(paths.entry.src)
      // compile handlebars to HTML
      .pipe(hdlbars(getHandlebarsProps()))
      // minify HTML
      .pipe(
        htmlmin({
          removeComments: true,
          collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
          removeEmptyAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          removeOptionalTags: true
        })
      )
      .pipe(rename({ extname: '.html' }))
      .pipe(gulp.dest(DIST))
  )
}

/* ----------------------------------------------------------- *
 * copy assets to destination folder (.png, .jpg, .json, ...)
 * ----------------------------------------------------------- */

// [development build]
function assets() {
  return (
    gulp
      .src(
        paths.assets.src,
        // filter out unchanged files between runs
        { since: gulp.lastRun(assets) }
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
  )
}

// [production build]
function assetsDist() {
  return (
    gulp
      .src(paths.assets.src)
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
      .pipe(gulp.dest(DIST))
  )
}

/* ----------------------------------------------------------- *
 * process scripts and transpiles ES2015 code to ES5 (.js, ...)
 * ----------------------------------------------------------- */

// [development build]
function scripts() {
  return (
    gulp
      .src(
        paths.scripts.src,
        // filter out unchanged files between runs
        { since: gulp.lastRun(scripts) }
      )
      // don't exit the running watcher task on errors
      .pipe(plumber())
      // babel will run with the settings defined in `.babelrc` file
      .pipe(babel())
      .pipe(gulp.dest(DEV))
  )
}

// [production build]
function scriptsDist() {
  return (
    gulp
      .src(paths.scripts.src)
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
  )
}

/* ----------------------------------------------------------- *
 * compile and automatically prefix stylesheets (.less, ...)
 * ----------------------------------------------------------- */

// [development build]
function styles() {
  const autoprefix = new LessAutoprefix({ browsers: ['last 2 versions'] })
  return (
    gulp
      .src(
        paths.styles.src,
        // filter out unchanged files between runs
        { since: gulp.lastRun(styles) }
      )
      // don't exit the running watcher task on errors
      .pipe(plumber())
      // compile LESS to CSS
      .pipe(
        less({
          plugins: [autoprefix]
        })
      )
      .pipe(gulp.dest(DEV))
  )
}

// [production build]
function stylesDist() {
  const autoprefix = new LessAutoprefix({ browsers: ['last 2 versions'] })
  return (
    gulp
      .src(paths.styles.src)
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
  )
}

/* ----------------------------------------------------------- *
 * bundle app resources in Component-preload.js file
 * ----------------------------------------------------------- */

// [production build]
function ui5preloads() {
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
 * hash module paths (content based) to enable cache buster
 * ----------------------------------------------------------- */

// [production build]
function ui5CacheBuster(done) {
  return (
    gulp
      .src(paths.cacheBuster.src)
      // rename UI5 module (app component) paths and update index.html
      .pipe(tap(oFile => ui5Bust(oFile)))
      .pipe(gulp.dest(DIST))
  )
}
