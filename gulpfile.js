const gulp = require('gulp');
const prefix = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass')(require('sass'));

/* ----------------------------------------- */
/*  Compile Sass
/* ----------------------------------------- */

// Small error handler helper function.
function handleError(err) {
    console.log(err.toString());
    this.emit('end');
}

const SYSTEM_SCSS = ['scss/**/*.scss'];
function compileScss() {
    // Configure options for sass output. For example, 'expanded' or 'nested'
    let options = {
        outputStyle: 'expanded',
    };
    return gulp
        .src(SYSTEM_SCSS)
        .pipe(sourcemaps.init())
        .pipe(sass(options).on('error', handleError))
        .pipe(
            prefix({
                cascade: false,
            })
        )
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./css'));
}
const css = gulp.series(compileScss);

async function packAll() {
    const fvtt = await import('@foundryvtt/foundryvtt-cli');
    // Compile LevelDB compendium packs.
    await fvtt.compilePack('packs/src/abilities', 'packs/abilities');
    await fvtt.compilePack('packs/src/specialties', 'packs/specialties');
    await fvtt.compilePack('packs/src/roles', 'packs/roles');
    await fvtt.compilePack('packs/src/gear', 'packs/gear');
    await fvtt.compilePack('packs/src/manual', 'packs/manual');
}

async function unpackAll() {
    const fvtt = await import('@foundryvtt/foundryvtt-cli');
    // Decompile LevelDB compendium packs.
    await fvtt.extractPack('packs/abilities', 'packs/src/abilities');
    await fvtt.extractPack('packs/specialties', 'packs/src/specialties');
    await fvtt.extractPack('packs/roles', 'packs/src/roles');
    await fvtt.extractPack('packs/gear', 'packs/src/gear');
    await fvtt.extractPack('packs/manual', 'packs/src/manual');
}

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
    gulp.watch(SYSTEM_SCSS, css);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(compileScss, watchUpdates);
exports.build = gulp.series(compileScss);
exports.pack = gulp.series(packAll);
exports.unpack = gulp.series(unpackAll);
exports.css = css;
