'use strict';

const gulp = require('gulp');
const gm = require('gulp-gm');
const fs = require('fs');
const path = require("path");
const mkdirp = require('mkdirp');
const async = require('async');
const { inspect } = require('util');
const inspectStyle = Symbol.for('nodejs.util.inspect.custom');

const processlog = function (msg) {
  const obj = {
    [inspectStyle]() {
      return "\u001b[33m " + msg + "\u001b[39m";
    }
  };
  if (msg == "end") {
    process.stdout.write("\n");
  } else {
    process.stdout.write(inspect(obj));

  }
};

const orginalSize = "72x72";

const fullBackground = ["tcl_tk", "react", "react_native", 'd',
  "typescript", "javascript", "gcc", "dojo", "rethinkdb", "gnu_fortran", "fish", "statsmodels"
];

function getSize(size) {
  size || (size = 72);
  return size + "x" + size;
}

function getArgSize() {
  var argv = process.argv.slice(3);
  if (argv[0] == "-s" && argv[1]) {
    return argv[1];
  }
}

function handleImage(item, targetpath, distpath, size, mask, callback) {
  const spawn = require('child_process').spawn;
  mask = mask || "./dist/mask/" + orginalSize + "/mask-1.png";
  const ps = spawn("convert", [
    "-alpha", "set",
    targetpath + item,
    "-resize", (!~fullBackground.indexOf(item.replace(".png", "")) ? "80%" : "100%"),
    "-gravity", "center",
    "-extent", orginalSize,
    "background/1.png", "-compose", "DstOver", "-composite",
    mask, "-compose", "DstIn", "-composite",
    "-resize", getSize(size),
    distpath + path.basename(item)
  ]);
  // ps.stdin.end();
  ps.on('error', function (e) {
    console.info("please install imageMagick");
  })
  ps.on('exit', function () {
    callback();
  })
}


function defaultTask() {
  return gulp.src('logo/*.png')
    .pipe(gm(function (gmfile) {
      return gmfile
        .alpha('remove')
        .resize(getSize())
    }, {
      imageMagick: true
    }))
    .pipe(gulp.dest('./dist/default/' + getSize()));
}


function maskTask() {
  return gulp.src('mask/*.png')
    .pipe(gm(function (gmfile) {
      return gmfile
        .resize(orginalSize);
    }, {
      imageMagick: true
    }))
    .pipe(gulp.dest('./dist/mask/' + orginalSize));
}

exports.default = defaultTask

exports.mask = maskTask


exports.beauty = gulp.series(defaultTask, maskTask, function (done) {
  const targetpath = "dist/default/72x72/";
  const size = getArgSize() || 72;
  const distpath = "./dist/beauty/" + getSize(size) + "/";
  const mask = "./dist/mask/" + orginalSize + "/mask-1.png";
  mkdirp.sync(distpath);
  fs.readdir(targetpath, function (err, items) {
    async.eachSeries(items, function iterator(item, callback) {
      handleImage(item, targetpath, distpath, size, mask, callback);
      processlog("...");
    }, function asyncdone() {
      processlog("end");
      done();
    });
  });
})

