/**
 *
 *  OpenUI5 Gulp Starter Kit
 *  Copyright 2017 PulseShift GmbH. All rights reserved.
 *
 *  Licensed under the MIT License.
 *
 *  This gulpfile makes use of new JavaScript features.
 *  Babel handles this without us having to do anything. It just works.
 *  You can read more about the new JavaScript features here:
 *  https://babeljs.io/docs/learn-es2015/
 *
 */

import gulp from 'gulp'
import gutil from 'gulp-util'
import plumber from 'gulp-plumber'
import babel from 'gulp-babel'
import del from 'del'

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
  assets: {
    src: [
      `${SRC}/**/*.properties`,
      `${SRC}/**/*.json`,
      `${SRC}/**/*.png`,
      `${SRC}/**/*.jpg`,
      `${SRC}/**/*.jpeg`
    ],
    dest: {
      dev: DEV,
      dist: DIST
    }
  },
  scripts: {
    src: [`${SRC}/**/*.js`],
    dest: {
      dev: DEV,
      dist: DIST
    }
  },
  html: {
    src: [`${SRC}/**/*.html`],
    dest: {
      dev: DEV,
      dist: DIST
    }
  },
  styles: {
    src: [`${SRC}/**/*.less`],
    dest: {
      dev: DEV,
      dist: DIST
    }
  }
}

/**
 * Gulp 'start' task (development mode).
 * @description Call update and start file watcher.
 * @public
 */
const start = gulp.series(
  clean,
  gulp.parallel(assets, scripts, html, styles),
  server,
  watch
)
export default start

/**
 * Gulp 'build' task (distribution mode).
 * @description Build the complete app to run in production environment.
 * @public
 */
const build = gulp.series(
  cleanDist,
  gulp.parallel(assetsDist, scriptsDist, htmlDist, stylesDist)
  // ui5preload,
  // ui5CacheBuster
)
export { build }

/* ----------------------------------------------------------- *
 * return success message that start task started
 * ----------------------------------------------------------- */

// task for development mode
function server(done) {
  const sSuccessMessage =
    '(Server started, use Ctrl+C to stop and go back to the console...)'
  gutil.log(gutil.colors.green(sSuccessMessage))
  done()
}

/* ----------------------------------------------------------- *
 * watch files for changes
 * ----------------------------------------------------------- */

// task for development mode
function watch() {
  gulp.watch(paths.assets.src, assets)
  gulp.watch(paths.scripts.src, scripts)
  gulp.watch(paths.html.src, html)
  gulp.watch(paths.styles.src, styles)
}

/* ----------------------------------------------------------- *
 * clean development directory
 * ----------------------------------------------------------- */

// task for development mode
function clean() {
  return del(`${DEV}/**/*`)
}

// enhanced or optimized distribution task
function cleanDist() {
  return del(`${DIST}/**/*`)
}

/* ----------------------------------------------------------- *
 * copy assets to destination folder (.png, .jpg, .json, ...)
 * ----------------------------------------------------------- */

// task for development mode
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
      .pipe(gulp.dest(paths.assets.dest.dev))
  )
}

// enhanced or optimized distribution task
function assetsDist() {
  return gulp.src(paths.assets.src).pipe(gulp.dest(paths.assets.dest.dist))
}

/* ----------------------------------------------------------- *
 * process scripts and transpiles ES2015 code to ES5 (.js, ...)
 * ----------------------------------------------------------- */

// task for development mode
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
      .pipe(gulp.dest(paths.scripts.dest.dev))
  )
}

// enhanced or optimized distribution task
function scriptsDist() {
  return (
    gulp
      .src(paths.scripts.src)
      // babel will run with the settings defined in `.babelrc` file
      .pipe(babel())
      .pipe(gulp.dest(paths.scripts.dest.dist))
  )
}

/* ----------------------------------------------------------- *
 * optimize HTML (.html, ...)
 * ----------------------------------------------------------- */

// task for development mode
function html() {
  return (
    gulp
      .src(
        paths.html.src,
        // filter out unchanged files between runs
        { since: gulp.lastRun(html) }
      )
      // don't exit the running watcher task on errors
      .pipe(plumber())
      .pipe(gulp.dest(paths.html.dest.dev))
  )
}

// enhanced or optimized distribution task
function htmlDist() {
  return gulp.src(paths.html.src).pipe(gulp.dest(paths.html.dest.dist))
}

/* ----------------------------------------------------------- *
 * compile and automatically prefix stylesheets (.less, ...)
 * ----------------------------------------------------------- */

// task for development mode
function styles() {
  return (
    gulp
      .src(
        paths.styles.src,
        // filter out unchanged files between runs
        { since: gulp.lastRun(styles) }
      )
      // don't exit the running watcher task on errors
      .pipe(plumber())
      .pipe(gulp.dest(paths.styles.dest.dev))
  )
}

// enhanced or optimized distribution task
function stylesDist() {
  return gulp.src(paths.styles.src).pipe(gulp.dest(paths.styles.dest.dist))
}
