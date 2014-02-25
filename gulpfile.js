var gulp = require('gulp');
var path = require('path');
var jshint = require('gulp-jshint');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var clean = require('gulp-clean');
var debug = require('gulp-debug');
var shell = require('gulp-shell');

var outFolder = 'build';

gulp.task('clean', function () {
    gulp.src(outFolder, {read: false})
        .pipe(clean());
});

// Concat & Minify JS
gulp.task('minify', function(){
    return gulp.src(['src/vesper.js', 'src/*.js', '!src/DWCAZipParseDB.js'])
        .pipe(concat('vesper.js'))
        .pipe(gulp.dest(outFolder))
        .pipe(rename('vesper.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(outFolder));
});

gulp.task('minifycss', function(){
    return gulp.src(['src/*.css'])
        .pipe(concat('vesper.css'))
        .pipe(gulp.dest(outFolder))
        .pipe(rename('vesper.min.css'))
        .pipe(cssmin())
        .pipe(gulp.dest(outFolder));
});


// Nice idea, but crunching leaflet means losing image path info: https://github.com/Leaflet/Leaflet/issues/766
gulp.task('concatlibs', function (){
    // leaflet doesn't call minified stuff 'min', instead adds '-src' onto unminified code
    // jquery has to be first as other stuff depends on it
    return gulp.src(['jquery/*.min.js', '**/*.min.js', 'leafletjs/**/*.js', '!leafletjs/**/*-src.js', '!leafletjs/**/test/**/*.js'], {cwd:'lib'})
        //.pipe (shell (['echo yo', 'echo <%= file.path %>']))
        .pipe (concat('libs.min.js'))
        .pipe (gulp.dest(outFolder))
    ;
});

gulp.task('copyres', function(){
    var filesToCopy = ['src/dwca.xsd', 'src/demoNew*.html', 'src/demoControlBlock.html', 'src/instructions.html', 'src/credits.html', 'src/background.html', '*.md'];
    return gulp.src (filesToCopy)
        .pipe (gulp.dest(outFolder))
    ;
});

gulp.task('copylocales', function(){
    return gulp.src ('locales/**', {cwd:'src'})
        .pipe (gulp.dest(outFolder+"/locales"))
    ;
});

// Watch Our Files
gulp.task('watch', function() {
    gulp.watch('src/*.js', ['minify', 'minifycss', 'copyres', 'copylocales']);
});

// Default
gulp.task('default', ['clean', 'minify', 'minifycss', 'copyres', 'copylocales']);