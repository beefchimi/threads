// Environment Setup
// -----------------------------------------------------------------------------
import gulp from 'gulp';
import babelify from 'babelify';
import browsersync from 'browser-sync';
import sequence from 'run-sequence';
import pngcrush from 'imagemin-pngcrush';
import plugins from 'gulp-load-plugins';

// initialize constants for convienent prefixes
const BS = browsersync.create();
const GLP = plugins();

// source / destination paths
const PATHS = {
  HTML: {
    SRC: 'dev/html/',
    DEST: 'build/',
    PARTIALS: 'dev/html/partials/',
  },
  STYLES: {
    SRC: 'dev/styles/',
    DEST: 'build/assets/css/',
    INDEX: 'dev/styles/index.scss',
  },
  IMAGES: {
    SRC: 'dev/media/images/*.{png,jpg,gif}',
    DEST: 'build/assets/img/',
  },
  SVG: {
    SRC: 'dev/media/svg/*.svg',
    DEST: 'build/assets/img/svg.svg',
  },
  MISC: {
    ROOT: 'dev/extra/root/',
    DEST: 'build/',
  },
  FONTS: {
    SRC: 'dev/extra/fonts/*',
    DEST: 'build/assets/fonts/',
  },
};

// Compress (if changed) all of our images
// -----------------------------------------------------------------------------
gulp.task('images', () => {
  return gulp.src(PATHS.IMAGES.SRC)
    .pipe(GLP.changed(PATHS.IMAGES.DEST))
    .pipe(GLP.imagemin({
      optimizationLevel: 7,
      progressive: true,
      use: [pngcrush()],
    }))
    .pipe(gulp.dest(PATHS.IMAGES.DEST));
});

// Compress and build SVG sprite (make ready for injection)
// -----------------------------------------------------------------------------
gulp.task('svg', () => {
  return gulp.src(PATHS.SVG.SRC)
    .pipe(GLP.imagemin({
      svgoPlugins: [{
        removeViewBox: false,
        removeUselessStrokeAndFill: false,
      }],
    }))
    .pipe(GLP.rename((path) => {
      const name = path.basename.split('-').map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      });
      path.basename = `SVG${name.join('')}`;
    }))
    .pipe(GLP.svgstore({
      inlineSvg: true,
    }))
    .pipe(gulp.dest(PATHS.IMAGES.DEST));
});

// Compile only main HTML files (ignore partials), then inject SVG sprite
// -----------------------------------------------------------------------------
gulp.task('html', () => {
  // would be ideal to only inject / compile changed files
  const srcSVG = gulp.src(PATHS.SVG.DEST);

  function fileContents(filePath, file) {
    return file.contents.toString();
  }

  return gulp.src([`${PATHS.HTML.SRC}*.html`])
    .pipe(GLP.fileInclude({
      prefix: '@@',
      basepath: PATHS.HTML.PARTIALS,
    }))
    .pipe(GLP.inject(srcSVG, {
      transform: fileContents,
    }))
    .pipe(gulp.dest(PATHS.HTML.DEST));
});

// Watch over HTML files and reload the browser upon compilation
// -----------------------------------------------------------------------------
gulp.task('watch-html', ['html'], () => {
  // recommended method only works once:
  // gulp.task('watch-html', ['html'], BS.reload);
  BS.reload();
});

// Copy (if changed) all of our fonts to build/assets/fonts
// -----------------------------------------------------------------------------
gulp.task('fonts', () => {
  return gulp.src(PATHS.FONTS.SRC)
    .pipe(GLP.changed(PATHS.FONTS.DEST))
    .pipe(gulp.dest(PATHS.FONTS.DEST));
});

// Compile and output styles
// -----------------------------------------------------------------------------
gulp.task('styles', () => {
  return gulp.src(PATHS.STYLES.INDEX)
    .pipe(GLP.sourcemaps.init())
    .pipe(GLP.sass({
      outputStyle: 'compact',
    }).on('error', GLP.sass.logError))
    .pipe(GLP.autoprefixer({
      browsers: ['last 3 version', 'ios 6', 'android 4'],
    }))
    .pipe(GLP.cssnano())
    .pipe(GLP.rename({
      basename: 'styles',
      suffix: '.min',
    }))
    .pipe(GLP.sourcemaps.write('../maps'))
    .pipe(gulp.dest(PATHS.STYLES.DEST))
    .pipe(BS.stream({match: '**/*.css'}));
});

// Spin up a Browser Sync server in our build folder and watch dev files
// -----------------------------------------------------------------------------
gulp.task('watch', () => {
  // configure browserSync
  BS.init({
    open: false,
    server: 'build',
    ghostMode: {
      clicks: false,
      forms: false,
      scroll: false,
    },
  });

  // inject updated styles into browser
  gulp.watch(`${PATHS.STYLES.SRC}**/*.scss`, ['styles']);
  // reload browser on .html changes (multiple files, so wait until all have been compiled)
  gulp.watch(`${PATHS.HTML.SRC}**/*.html`, ['watch-html']);
});

// Default gulp task
// -----------------------------------------------------------------------------
gulp.task('default', () => {
  sequence('svg', ['styles', 'html'], 'watch');
});
