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
import gulpif from 'gulp-if'
import plumber from 'gulp-plumber'
import babel from 'gulp-babel'
import uglify from 'gulp-uglify'
import htmlmin from 'gulp-htmlmin'
import imagemin from 'gulp-imagemin'
import cleanCSS from 'gulp-clean-css'
import less from 'gulp-less'
import LessAutoprefix from 'less-plugin-autoprefix'
import del from 'del'
import server from 'browser-sync'
import pkg from './package.json'

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
      `${SRC}/**/*.{jpg,jpeg,png}`
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
 * watch files for changes
 * ----------------------------------------------------------- */

// [development build]
function watch() {
  const sSuccessMessage =
    '(Server started, use Ctrl+C to stop and go back to the console...)'

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
      .pipe(gulp.dest(paths.assets.dest.dev))
  )
}

// [production build]
function assetsDist() {
  return gulp.src(paths.assets.src).pipe(gulp.dest(paths.assets.dest.dist))
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
      .pipe(gulp.dest(paths.scripts.dest.dev))
  )
}

// [production build]
function scriptsDist() {
  return (
    gulp
      .src(paths.scripts.src)
      // babel will run with the settings defined in `.babelrc` file
      .pipe(babel())
      .pipe(uglify())
      .pipe(gulp.dest(paths.scripts.dest.dist))
  )
}

/* ----------------------------------------------------------- *
 * optimize HTML (.html, ...)
 * ----------------------------------------------------------- */

// [development build]
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

// [production build]
function htmlDist() {
  return gulp
    .src(paths.html.src)
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
    .pipe(gulp.dest(paths.html.dest.dist))
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
      .pipe(
        less({
          plugins: [autoprefix]
        })
      )
      .pipe(gulp.dest(paths.styles.dest.dev))
  )
}

// [production build]
function stylesDist() {
  const autoprefix = new LessAutoprefix({ browsers: ['last 2 versions'] })
  return gulp
    .src(paths.styles.src)
    .pipe(
      less({
        plugins: [autoprefix]
      })
    )
    .pipe(
      cleanCSS({
        level: 2
      })
    )
    .pipe(gulp.dest(paths.styles.dest.dist))
}
