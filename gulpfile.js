/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Karl STEIN
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const gulp = require("gulp");
const babel = require("gulp-babel");
const concat = require("gulp-concat");
const pump = require("pump");
const rename = require("gulp-rename");
const uglify = require("gulp-uglify");
const watch = require("gulp-watch");

const pkg = require("./package.json");
const distDir = "dist";
const docsDir = "docs";
const distFile = `${pkg.name}`;

// Compile JavaScript files
gulp.task("build:js", function () {
    return gulp.src(["src/js/*.js"])
        .pipe(concat(`${distFile}.js`))
        .pipe(babel({presets: ["es2015"]}))
        .pipe(gulp.dest(`${distDir}/js`));
});

// Compress JavaScript files
gulp.task("compress:js", function (cb) {
    pump([
            gulp.src(`${distDir}/js/${distFile}.js`),
            uglify(),
            rename({suffix: ".min"}),
            gulp.dest(`${distDir}/js`)
        ],
        cb
    );
});

// Copy compiled JavaScript files to docs
gulp.task("doc:js", function () {
    return gulp.src(`${distDir}/js/*.min.js`)
        .pipe(gulp.dest(`${docsDir}/js`));
});

// Concat + compile files
gulp.task("build", ["build:js"]);

// Compress files
gulp.task("compress", ["compress:js"]);

// Add compiled files to docs
gulp.task("doc", ["doc:js"]);

// Concat + compress files
gulp.task("default", ["build", "compress", "doc"]);

// Automatic rebuild
gulp.task("watch", function () {
    gulp.watch(["src/**/*.js"], ["build:js"]);
    gulp.watch([`${distDir}/**/*.js`, `!${distDir}/**/*.min.js`], ["compress:js", "doc:js"]);
});
