
const gulp = require('gulp');
const del = require('del');
const LessAutoprefix = require('less-plugin-autoprefix');
const less = require('gulp-less');
const uglify = require('gulp-uglify');
const path = require('path');
const runSequence = require('run-sequence');
const gulpif = require('gulp-if');
const cssmin = require('gulp-cssmin');
const rename = require('gulp-rename');
const babel = require('gulp-babel');
const cache = require('gulp-cached');

const SRC_ROOT = './src/redux-ui5-app';
const DEV_ROOT = './dev/redux-ui5-app';
const DIST_ROOT = './dist/redux-ui5-app';


/* =========================================================== */
/* gulp main task                                              */
/* =========================================================== */

// call update and start watcher
gulp.task('default', ['update', 'watch'], () => {});


/* =========================================================== */
/* gulp update task                                            */
/* =========================================================== */

// build the complete sensum app to run in productive environment
gulp.task('update', cb => {
  runSequence(
      'clean',
      ['less', 'js', 'assets'],
      cb
  );
});


/* =========================================================== */
/* gulp watch task                                             */
/* =========================================================== */

// watch Files For Changes
gulp.task('watch', () => {
    gulp.watch([
        `${SRC_ROOT}/**/*.js`
    ], ['js']);
    gulp.watch([
        `${SRC_ROOT}/**/*.less`
    ], ['less']);
    gulp.watch([
        `${SRC_ROOT}/**/*`,
        `!${SRC_ROOT}/**/*.less`,
        `!${SRC_ROOT}/**/*.js`
    ], ['assets']);
});


/* =========================================================== */
/* gulp clean task                                             */
/* =========================================================== */

// clean dev directory
gulp.task('clean', cb => {
    del(DEV_ROOT).then(() => {
        cb();
    }, reason => {
        cb(reason);
    });
});


/* =========================================================== */
/* gulp less task                                              */
/* =========================================================== */

// compile less files into css files
gulp.task('less', () => {
    var autoprefix = new LessAutoprefix({ browsers: ['last 2 versions'] });

    return gulp.src([
              `${SRC_ROOT}/**/*.less`
          ])
          .pipe(cache('less'))
          .pipe(less({
              paths: [path.join(__dirname, 'less', 'includes')],
              plugins: [autoprefix]
          }))
          .pipe(cssmin())
          .pipe(gulp.dest(DEV_ROOT));
});


/* =========================================================== */
/* gulp javascript task                                        */
/* =========================================================== */

gulp.task('js', ['babel', 'babel-dbg'], () => {});

// lint task to compile babel es2016 to es2015 and save them minified
gulp.task('babel', () => {
    return  gulp.src([
                `${SRC_ROOT}/**/*.js`
            ])
            .pipe(cache('babel'))
            .pipe(babel())
            .pipe(uglify())
            .pipe(gulp.dest(DEV_ROOT));
});

// lint task to compile babel es2016 to es2015 and save them as '*-dbg.js' resources
gulp.task('babel-dbg', () => {
    return  gulp.src([
                `${SRC_ROOT}/**/*.js`
            ])
            .pipe(cache('babel-dbg'))
            .pipe(babel())
            .pipe(gulpif('!**/*.controller.js', rename({ suffix: '-dbg' })))
            .pipe(gulpif('**/*.controller.js', rename(path => {
                path.basename = `${path.basename.split('.')[0]}-dbg.${path.basename.split('.')[1]}`;
            })))
            .pipe(gulp.dest(DEV_ROOT));
});


/* =========================================================== */
/* gulp copy assets to target folder                           */
/* =========================================================== */

// build the complete sensum app to run in productive environment
gulp.task('assets', () => {
    // copy source files into destination folder
    return gulp.src([
            `${SRC_ROOT}/**/*`,
            `!${SRC_ROOT}/**/*.less`,
            `!${SRC_ROOT}/**/*.js`
        ], { base: SRC_ROOT })
        .pipe(cache('assets'))
        .pipe(gulp.dest(DEV_ROOT));
});
