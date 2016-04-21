'use strict';

var gulp = require('gulp');
var gm = require('gulp-gm');
var fs = require('fs');
var path = require("path");
var mkdirp = require('mkdirp');
var async = require('async');

var processlog = function(msg) {
    var util = require('util');
    var obj = {};
    obj.inspect = function(depth) {
        return "\u001b[33m " + msg + "\u001b[39m";
    };
    if (msg == "end") {
        process.stdout.write("\n");
    } else {
        process.stdout.write(util.inspect(obj));

    }
};

var orginalSize = "72x72";

var fullBackground = ["react", "react_native", "typescript", "javascript","gcc", "dojo","rethinkdb","gnu_fortran"];

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
    var spawn = require('child_process').spawn;
    mask = mask || "./dist/mask/" + orginalSize + "/mask-1.png";
    var ps = spawn("convert", [
        "-alpha", "set",
        targetpath + item,
        "-resize", (!~fullBackground.indexOf(item.replace(".png","")) ? "80%" : "100%"),
        "-gravity", "center",
        "-extent", orginalSize,
        "background/1.png", "-compose", "DstOver", "-composite",
        mask, "-compose", "DstIn", "-composite",
        "-resize", getSize(size),
        distpath + path.basename(item)
    ]);
    // ps.stdin.end();
    ps.on('error', function() {
        console.info('error');
    })
    ps.on('exit', function() {
        callback();
    })
}


gulp.task('default', function() {
    return gulp.src('logo/*.png')
        .pipe(gm(function(gmfile) {
            return gmfile
                .alpha('remove')
                .resize(getSize())
        }, {
            imageMagick: true
        }))
        .pipe(gulp.dest('./dist/default/' + getSize()));
});

gulp.task('mask', function() {
    return gulp.src('mask/*.png')
        .pipe(gm(function(gmfile) {
            return gmfile
                .resize(orginalSize);
        }, {
            imageMagick: true
        }))
        .pipe(gulp.dest('./dist/mask/' + orginalSize));
});


gulp.task('beauty', ["default", "mask"], function(done) {
    var targetpath = "dist/default/72x72/";
    var size = getArgSize() || 72;
    var distpath = "./dist/beauty/" + getSize(size) + "/";
    var mask = "./dist/mask/" + orginalSize + "/mask-1.png";
    mkdirp.sync(distpath);
    fs.readdir(targetpath, function(err, items) {
        async.eachSeries(items, function iterator(item, callback) {
            handleImage(item, targetpath, distpath, size, mask, callback);
            processlog("...");
        }, function asyncdone() {
            processlog("end");
            done();
        });
    });
});
