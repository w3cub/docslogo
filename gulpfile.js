'use strict';

const gulp = require('gulp');
const gm = require('gulp-gm');
const fs = require('fs');
const path = require("path");
const mkdirp = require('mkdirp');
const async = require('async');
const spritesmith = require('gulp.spritesmith');
const { inspect } = require('util');
const inspectStyle = Symbol.for('nodejs.util.inspect.custom');
const { 
  orginalSize, fullBackground, maskDist, normalDist,
  maskOut, beautyTarget, beautyDist, spriteDist 
} = require('./config');

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

function getSize(size) {
  size || (size = 72);
  return size + "x" + size;
}

function getArgSize() {
  var argv = process.argv.slice(3);
  if (argv[0] == "-s" && argv[1]) {
    return argv[1];
  } else {
    return 72
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


function normalSize() {
  return gulp.src('logo/*.png')
    .pipe(gm(function (gmfile) {
      return gmfile
        .alpha('remove')
        .resize(getSize())
    }, {
      imageMagick: true
    }))
    .pipe(gulp.dest(normalDist + getSize()));
}

function makeMask() {
  return gulp.src('mask/*.png')
    .pipe(gm(function (gmfile) {
      return gmfile
        .resize(orginalSize);
    }, {
      imageMagick: true
    }))
    .pipe(gulp.dest(maskDist));
}

function makeBeauty(done) {
  const targetpath = beautyTarget;
  const size = getArgSize();
  const distpath = beautyDist;
  const mask = maskOut.prettier;
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
}

function makeSprite() {
  var spriteData = gulp.src(beautyDist +'*.png').pipe(spritesmith({
    imgName: 'sprite.png',
    cssName: 'sprite.json'
  }));
  return spriteData.pipe(gulp.dest(spriteDist));
}


function cssSprite(done) {
  var spriteData = fs.readFileSync(spriteDist + 'sprite.json')
  var manifest = JSON.parse(spriteData);
  var css = '';
  for (const key in manifest) {
    if (Object.hasOwnProperty.call(manifest, key)) {
      const element = manifest[key];
      css += `._icon-${key}.loaded{background-position:${element.px.offset_x} ${element.px.offset_y};}`;
    }
  }
  fs.writeFileSync(spriteDist + 'sprite.css', css);
  fs.unlinkSync(spriteDist + 'sprite.json');
  done()
}

exports.default = normalSize

exports.mask = makeMask

exports.cssSprite = cssSprite;

exports.beauty = gulp.series(normalSize, makeMask, makeBeauty)

exports.sprite = gulp.series(normalSize, makeMask, makeBeauty, makeSprite, cssSprite)
