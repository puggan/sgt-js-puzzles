"use strict";

const gulp = require("gulp");
const plug = {
	chmod: require("gulp-chmod"),
	concat: require("gulp-concat"),
	debug: require('gulp-debug'),
	flatmap: require("gulp-flatmap"),
	htmlmin: require("gulp-htmlmin"),
	ignore: require("gulp-ignore"),
	imagemin: require("gulp-imagemin"),
	less: require("gulp-less"),
	plumber: require("gulp-plumber"),
	pngquant: require("imagemin-pngquant"),
	rename: require("gulp-rename"),
	sourcemaps: require("gulp-sourcemaps"),
	typescript: require("gulp-typescript"),
	uglifycss: require("gulp-clean-css"),
	uglifyjs: require("gulp-uglify-es"),
	watch: require("gulp-watch"),
};
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
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"))
	.pipe(plug.ignore.exclude("*.map"))

	.pipe(plug.uglifycss({level: 2}))
	.pipe(plug.rename({extname: ".min.css"}))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"));
gulp.task("css", css_task);

const css_watch_task = () => plug
	.watch("src/less/*.less")
	.pipe(plug.plumber())
	.pipe(plug.debug({title: 'watch-css'}))
	.pipe(plug.sourcemaps.init())

	.pipe(plug.less())
	// sourceRoot dosn't work with dual write, use mapSources instead
	.pipe(plug.sourcemaps.mapSources(p => "../src/less/" + p))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"))
	.pipe(plug.ignore.exclude("*.map"))

	.pipe(plug.uglifycss({level: 2}))
	.pipe(plug.rename({extname: ".min.css"}))
	.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"));
gulp.task("watch-css", css_watch_task);
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

const ts_watch_task = () => plug
	.watch(["src/ts/*.ts", "!src/ts/*.d.ts"])
	.pipe(plug.plumber())
	.pipe(plug.debug({title: 'watch-ts'}))
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

gulp.task("watch-ts", ts_watch_task);

const ts_test_task = () => gulp
	.src(["src/ts/*.ts", "!src/ts/*.d.ts"])
	.pipe(plug.plumber())
	.pipe(plug.debug({title: 'ts-test'}))
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
	//.pipe(plug.sourcemaps.init())

	.pipe(plug.htmlmin({
		collapseWhitespace: true,
		removeComments: true
	}))
	// sourceRoot dosn't work with dual write, use mapSources instead
	//.pipe(plug.sourcemaps.mapSources(p => "../src/html/" + p))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false, sourceRoot: "src/less/"}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"));
gulp.task("html", html_task);
const html_watch_task = () => plug
	.watch("src/html/*.html")
	.pipe(plug.debug({title: 'watch-html'}))
	.pipe(plug.plumber())
	//.pipe(plug.sourcemaps.init())

	.pipe(plug.htmlmin({
		collapseWhitespace: true,
		removeComments: true
	}))
	// sourceRoot dosn't work with dual write, use mapSources instead
	//.pipe(plug.sourcemaps.mapSources(p => "../src/html/" + p))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false}))
	//.pipe(plug.sourcemaps.write("./", {includeContent: false, sourceRoot: "src/less/"}))
	.pipe(plug.chmod(0o644))
	.pipe(gulp.dest("games/"));
gulp.task("watch-html", html_watch_task);
//</editor-fold>

//<editor-fold desc="Task IMG">
const img_task = () => gulp
	.src('src/i/*.{jpeg,jpg,png}')
	.pipe(plug.debug({title: 'watch-img'}))
	.pipe(plug.imagemin({
		progressive: true,
		use: [plug.pngquant()]
	}))
	.pipe(gulp.dest('games/i/'));
gulp.task("img", img_task);

const img_watch_task = () => plug
	.watch('src/i/*.{jpeg,jpg,png}')
	.pipe(plug.imagemin({
		progressive: true,
		use: [plug.pngquant()]
	}))
	.pipe(gulp.dest('games/i/'));
gulp.task("watch-img", img_watch_task);
//</editor-fold>

gulp.task("default", gulp.parallel("css", "ts", "html", "img"));
gulp.task("test", gulp.parallel("ts-test"));
gulp.task("watch", gulp.series("default", gulp.parallel("watch-css", "watch-ts", "watch-html", "watch-img")));
