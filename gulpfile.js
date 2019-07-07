"use strict";

const gulp = require("gulp");
const plug = require("gulp-load-plugins")({
	rename: {
		"gulp-clean-css": "uglifycss",
		"gulp-uglify-es": "uglifyjs",
	},
});
plug.pngquant = require("imagemin-pngquant");
//<editor-fold desc="IDE help only">
// noinspection ConstantIfStatementJS,PointlessBooleanExpressionJS just here for ide inspection help
if(false)
{
	// noinspection UnreachableCodeJS just here for ide inspection help
	plug.chmod = require("gulp-chmod");
	plug.concat = require("gulp-concat");
	plug.flatmap = require("gulp-flatmap");
	plug.htmlmin = require("gulp-htmlmin");
	plug.ignore = require("gulp-ignore");
	plug.imagemin = require("gulp-imagemin");
	plug.less = require("gulp-less");
	plug.plumber = require("gulp-plumber");
	plug.rename = require("gulp-rename");
	plug.sourcemaps = require("gulp-sourcemaps");
	plug.typescript = require("gulp-typescript");
	plug.uglifycss = require("gulp-clean-css");
	plug.uglifyjs = require("gulp-uglify-es");
}
//</editor-fold>

//<editor-fold desc="Task Less/CSS">
const css_task = () => gulp
	.src("src/less/*.less")
	.pipe(plug.plumber())
	.pipe(plug.sourcemaps.init())

	.pipe(plug.less())
	// sourceRoot dosn't work with dual write, use mapSources instead
	.pipe(plug.sourcemaps.mapSources(p => "../src/less/" + p))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false, sourceRoot: "src/less/"}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"))
	.pipe(plug.ignore.exclude("*.map"))

	.pipe(plug.concat("all.css"))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false, sourceRoot: "src/less/"}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"))
	.pipe(plug.ignore.exclude("*.map"))

	.pipe(plug.uglifycss({level: 2}))
	.pipe(plug.rename("all.min.css"))
	// sourceRoot dosn't work with dual write, use mapSources instead
	.pipe(plug.sourcemaps.mapSources())
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false, sourceRoot: "src/less/"}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"));
gulp.task("css", css_task);
//</editor-fold>

//<editor-fold desc="Task Typescript">
const ts_task = () => gulp
	.src(["src/ts/*.ts", "!src/ts/*.d.ts"])
	.pipe(plug.plumber())
	.pipe(plug.sourcemaps.init())
	.pipe(plug.flatmap(
		(stream /*, file */) => stream.pipe(
			// ESNext: require a updated browser, downgrade to ES6, ES5 or ES3 depending on how old browsers you want to support
			plug.typescript.createProject({"target": "ESNext"})(),
		),
	))
	// sourceRoot dosn't work with dual write, use mapSources instead
	.pipe(plug.sourcemaps.mapSources(p => "../src/ts/" + p))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"))

	.pipe(plug.ignore.exclude("*.map"))
	.pipe(plug.uglifyjs.default())
	.pipe(plug.rename({suffix: ".min"}))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"));

gulp.task("ts", ts_task);

const ts_test_task = () => gulp
	.src(["src/ts/*.ts", "!src/ts/*.d.ts"])
	.pipe(plug.plumber())
	.pipe(plug.flatmap(
		(stream /*, file */) => stream.pipe(
			plug.typescript.createProject({"target": "ESNext", "noImplicitAny": true})(),
		),
	));
gulp.task("ts-test", ts_test_task);
//</editor-fold>

//<editor-fold desc="Task HTML">
const html_task = () => gulp
	.src("src/html/*.html")
	.pipe(plug.plumber())
	.pipe(plug.sourcemaps.init())

	.pipe(plug.htmlmin({
		collapseWhitespace: true,
		removeComments: true
	}))
	// sourceRoot dosn't work with dual write, use mapSources instead
	.pipe(plug.sourcemaps.mapSources(p => "../src/html/" + p))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false, sourceRoot: "src/less/"}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"));
gulp.task("html", html_task);
//</editor-fold>

//<editor-fold desc="Task IMG">
const img_task = () => gulp
	.src('src/i/*.{jpeg,jpg,png}')
	.pipe(plug.imagemin({
		progressive: true,
		use: [plug.pngquant()]
	}))
	.pipe(gulp.dest('games/i/'));
gulp.task("img", img_task);
//</editor-fold>

gulp.task("default", gulp.parallel("css", "ts", "html", "img"));
gulp.task("test", gulp.parallel("ts-test"));
