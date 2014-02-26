var gulp = require('gulp');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var clean = require('gulp-clean');
//var shell = require('gulp-shell');

var outFolder = 'build';

gulp.task('clean', function () {
    return gulp.src(outFolder, {read: false})
        .pipe(clean());
});

// Concat & Minify JS
gulp.task('minify', ['clean'], function(){
    return gulp.src(['src/vesper.js', 'src/*.js', '!src/DWCAZipParseDB.js'])
        .pipe(concat('vesper.js'))
        .pipe(gulp.dest(outFolder))
        .pipe(rename('vesper.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest(outFolder));
});

// Concat & Minify CSS
gulp.task('minifycss', ['clean'], function(){
    return gulp.src(['src/*.css'])
        .pipe(concat('vesper.css'))
        .pipe(gulp.dest(outFolder))
        .pipe(rename('vesper.min.css'))
        .pipe(cssmin())
        .pipe(gulp.dest(outFolder));
});


// Nice idea, but crunching leaflet means losing image path info: https://github.com/Leaflet/Leaflet/issues/766
gulp.task('concatlibs', ['clean'], function (){
    // leaflet doesn't call minified stuff 'min', instead adds '-src' onto unminified code
    // jquery has to be first as other stuff depends on it
    return gulp.src(['jquery/*.min.js', '**/*.min.js', 'leafletjs/**/*.js', '!leafletjs/**/*-src.js', '!leafletjs/**/test/**/*.js'], {cwd:'lib'})
        //.pipe (shell (['echo yo', 'echo <%= file.path %>']))
        .pipe (concat('libs.min.js'))
        .pipe (gulp.dest(outFolder))
    ;
});

// here, I want to copy files from different folders (not including the relative paths) into the same folder
gulp.task('copyres', ['clean'], function(){
    return gulp.src (['src/dwca.xsd', 'src/dwc_occurrence.xml', 'src/demoNew*.html', 'src/demoControlBlock.html', 'src/instructions.html', 'src/credits.html', 'src/background.html', '*.md'])
        .pipe (gulp.dest(outFolder))
    ;
});

// here, I want to copy a tree structure (i.e. include the relative path from 'locales' onwards) into a folder
gulp.task('copylocales', ['clean'], function(){
    return gulp.src ('src/locales/**', {base:'src/'})
        .pipe (gulp.dest(outFolder))
    ;
});

// Watch Our Files
gulp.task('watch', function() {
    gulp.watch('src/*.js', ['minify', 'minifycss']);
});

// Default
gulp.task('default', ['minify', 'minifycss', 'copyres', 'copylocales']);