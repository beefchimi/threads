// Environment Setup
// -----------------------------------------------------------------------------
import gulp from 'gulp';
import babelify from 'babelify';
import browserify from 'browserify';
import browsersync from 'browser-sync';
import vinylbuffer from 'vinyl-buffer';
import vinylsource from 'vinyl-source-stream';
import sequence from 'run-sequence';
import pngcrush from 'imagemin-pngcrush';
import plugins from 'gulp-load-plugins';
import watchify from 'watchify';

// initialize constants for convienent prefixes
const BS = browsersync.create();
const GLP = plugins();

// source / destination paths
const PATHS = {
  ROOT: {
    SRC: 'dev/root/',
    DEST: 'build/',
  },
  VIEWS: {
    SRC: 'dev/views/',
    DEST: 'build/',
    PARTIALS: 'dev/views/partials/',
    INCLUDE_PREFIX: '@@',
  },
  STYLES: {
    SRC: 'dev/styles/',
    DEST: 'build/assets/css/',
    INDEX: 'dev/styles/index.scss',
  },
  SCRIPTS: {
    SRC: 'dev/scripts/',
    DEST: 'build/assets/js/',
    VENDOR: {
      SRC: 'dev/scripts/vendor/*.js',
      DEST: 'build/assets/js/vendor/',
    },
  },
  FONTS: {
    SRC: 'dev/extra/fonts/*',
    DEST: 'build/assets/fonts/',
  },
  FAVICONS: {
    SRC: 'dev/media/favicon/favicon.png',
    DEST: 'build/assets/favicons/',
    ABS_PATH: 'assets/favicons/',
    PARTIAL: 'favicons.html',
    START_TAG: '<!-- inject:head:{{ext}} -->',
  },
  SVG: {
    SRC: 'dev/media/svg/*.svg',
    FILENAME: 'symbols.svg',
  },
  IMAGES: {
    SRC: 'dev/media/images/*.{png,jpg,gif}',
    DEST: 'build/assets/img/',
  },
  AUDIO: {
    SRC: 'dev/media/audio/*.*',
    DEST: 'build/assets/audio/',
  },
  VIDEO: {
    SRC: 'dev/media/video/*.*',
    DEST: 'build/assets/video/',
  },
};

// File contents helper
// -----------------------------------------------------------------------------
function fileContents(filePath, file) {
  return file.contents.toString();
}

// Error handling
// -----------------------------------------------------------------------------
function handleErrors(...args) {
  GLP.notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>',
  }).apply(this, args);
  // keep gulp from hanging on this task
  this.emit('end');
}

// Javascript building
// -----------------------------------------------------------------------------
function buildScript(file, watch) {
  const props = {
    entries: `${PATHS.SCRIPTS.SRC}${file}`,
    debug: true,
    cache: {},
    packageCache: {},
    transform: [babelify.configure({
      presets: ['es2015', 'stage-0'],
    })],
  };

  // watchify() if watch requested, otherwise run browserify() once
  const bundler = watch ? watchify(browserify(props), {poll: true}) : browserify(props);

  function rebundle() {
    const stream = bundler.bundle();

    return stream
      .on('error', handleErrors)
      .pipe(vinylsource(file))
      .pipe(vinylbuffer())
      .pipe(GLP.sourcemaps.init({loadMaps: true}))
      .pipe(GLP.uglify()) // Sourcemaps: FF doesn't play nice, but Chrome is fine
      // .pipe(GLP.streamify(GLP.uglify()).on('error', GLP.util.log))
      .pipe(GLP.rename({
        suffix: '.min',
      }))
      .pipe(GLP.sourcemaps.write('../maps'))
      .pipe(gulp.dest(PATHS.SCRIPTS.DEST));
  }

  // listen for an update and run rebundle
  bundler.on('update', () => {
    rebundle();
    GLP.util.log('Rebundle...');
  });

  // run it once the first time buildScript is called
  return rebundle();
}

// Copy (if changed) all of our root files to the build folder
// -----------------------------------------------------------------------------
gulp.task('root', () => {
  return gulp.src([`${PATHS.ROOT.SRC}*`, `${PATHS.ROOT.SRC}.htaccess`])
    .pipe(GLP.changed(PATHS.ROOT.DEST))
    .pipe(gulp.dest(PATHS.ROOT.DEST));
});

// Compile only main HTML files (ignore partials), then inject SVG sprite
// -----------------------------------------------------------------------------
gulp.task('views', () => {
  const faviconSource = gulp.src(`${PATHS.FAVICONS.DEST}${PATHS.FAVICONS.PARTIAL}`);
  const symbolsSource = gulp.src(`${PATHS.IMAGES.DEST}${PATHS.SVG.FILENAME}`);

  return gulp.src([`${PATHS.VIEWS.SRC}*.html`])
    .pipe(GLP.fileInclude({
      prefix: PATHS.VIEWS.INCLUDE_PREFIX,
      basepath: PATHS.VIEWS.PARTIALS,
    }))
    .pipe(GLP.inject(faviconSource, {
      starttag: PATHS.FAVICONS.START_TAG,
      transform: fileContents,
    }))
    .pipe(GLP.inject(symbolsSource, {
      transform: fileContents,
    }))
    .pipe(gulp.dest(PATHS.VIEWS.DEST));
});

// Watch over HTML files and reload the browser upon compilation
// -----------------------------------------------------------------------------
gulp.task('views-watch', ['views'], () => {
  // recommended method only works once:
  // gulp.task('views-watch', ['html'], BS.reload);
  BS.reload();
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

// Compile ES2015 javascript
// -----------------------------------------------------------------------------
gulp.task('scripts', ['scripts-vendor'], () => {
  // this will run once because we set watch to false
  return buildScript('scripts.js', false);
});

// Watch over Javascript files and reload the browser upon compilation
// this can be refactored in gulp v4
// -----------------------------------------------------------------------------
gulp.task('scripts-watch', ['scripts'], () => {
  // recommended method only works once:
  // gulp.task('scripts-watch', ['scripts'], BS.reload);
  BS.reload();
});

// Copy (if changed) all of our vendor JS files to the build folder
// -----------------------------------------------------------------------------
gulp.task('scripts-vendor', () => {
  return gulp.src(PATHS.SCRIPTS.VENDOR.SRC)
    .pipe(GLP.changed(PATHS.SCRIPTS.VENDOR.DEST))
    .pipe(gulp.dest(PATHS.SCRIPTS.VENDOR.DEST));
});

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
    .pipe(GLP.rename(PATHS.SVG.FILENAME))
    .pipe(gulp.dest(PATHS.IMAGES.DEST));
});

// Build favicons from a single file
// * figure out how to get it working with a SVG
// * are all of the generated files really necessary?
// * make sure to test that everything is working
// -----------------------------------------------------------------------------
gulp.task('favicons', () => {
  return gulp.src(PATHS.FAVICONS.SRC)
    .pipe(GLP.favicons({
      appName: 'Threads',
      appDescription: 'A lightweight, modular, SCSS foundation.',
      developerName: 'Curtis Dulmage',
      developerURL: 'http://dulmage.me/',
      background: '#0042FF',
      path: PATHS.FAVICONS.ABS_PATH,
      url: 'http://threads.io/',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/?homescreen=1',
      version: 1.0,
      logging: true,
      online: false,
      html: PATHS.FAVICONS.PARTIAL,
      pipeHTML: true,
      replace: true,
    }))
    .on('error', GLP.util.log)
    .pipe(gulp.dest(PATHS.FAVICONS.DEST));
});

// Copy (if changed) all of our fonts to build/assets/fonts
// -----------------------------------------------------------------------------
gulp.task('fonts', () => {
  return gulp.src(PATHS.FONTS.SRC)
    .pipe(GLP.changed(PATHS.FONTS.DEST))
    .pipe(gulp.dest(PATHS.FONTS.DEST));
});

// Copy (if changed) all of our audio to build/assets/aud
// -----------------------------------------------------------------------------
gulp.task('audio', () => {
  return gulp.src(PATHS.AUDIO.SRC)
    .pipe(GLP.changed(PATHS.AUDIO.DEST))
    .pipe(gulp.dest(PATHS.AUDIO.DEST));
});

// Copy (if changed) all of our videos to build/assets/vid
// -----------------------------------------------------------------------------
gulp.task('video', () => {
  return gulp.src(PATHS.VIDEO.SRC)
    .pipe(GLP.changed(PATHS.VIDEO.DEST))
    .pipe(gulp.dest(PATHS.VIDEO.DEST));
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
  // reload browser on .js changes
  gulp.watch(`${PATHS.SCRIPTS.SRC}**/*.js`, ['scripts-watch']);
  // reload browser on .html changes (multiple files, so wait until all have been compiled)
  gulp.watch(`${PATHS.VIEWS.SRC}**/*.html`, ['views-watch']);
});

// Default gulp task
// -----------------------------------------------------------------------------
gulp.task('default', () => {
  // consider deleting all files first using npm del
  // both `favicons` and `images` are omitted as they take longer
  sequence('svg', ['root', 'views', 'styles', 'scripts', 'fonts', 'audio', 'video'], 'watch');
});
