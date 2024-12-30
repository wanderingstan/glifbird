var debugmode = false;

var states = Object.freeze({
    SplashScreen: 0,
    GameScreen: 1,
    ScoreScreen: 2
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $("#flyarea").height();

var score = 0;
var highscore = 0;

var pipeheight = 130; // 90;
var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;

//sounds

// buzz.defaults.preload = true;
// buzz.defaults.autoplay = true;

function iOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        // iPad on iOS 13 detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}


var volume = 30;
var soundJump = iOS() ? null : new buzz.sound("assets/sounds/sfx_wing.wav"); // iOS sucks on rapid sounds
var soundScore = new buzz.sound("assets/sounds/sfx_point.wav");
var soundHit = new buzz.sound("assets/sounds/sfx_hit.wav");
var soundDie = new buzz.sound("assets/sounds/sfx_die.wav");
var soundSwoosh = new buzz.sound("assets/sounds/sfx_swooshing.wav");


buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;


function loadPipeImage(pipeImageUrl) {
    // One liner css function:
    const addCSS = css => document.head.appendChild(document.createElement("style")).innerHTML = css;

    // canvas cropping function
    const cropCanvas = (sourceCanvas, left, top, width, height) => {
        let destCanvas = document.createElement('canvas');
        destCanvas.width = width;
        destCanvas.height = height;
        destCanvas.getContext("2d").drawImage(
            sourceCanvas,
            left, top, width, height,  // source rect with content to crop
            0, 0, width, height);      // newCanvas, same size as source rect
        return destCanvas;
    }


    // var canvas = document.createElement("canvas");
    var canvas = document.getElementById("pipe-bottom-canvas");
    var context = canvas.getContext('2d');
    var image = new Image();
    image.onload = function () {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(0,0,0,0.009)"; // RGBA // Freaks out if alpha is actually 0. :(
        context.fillFlood(50, 75, 50); // Kindofa guess as to start in top left corner and floodfill from there

        // Now do regular piping
        //var pipeCanvas = document.getElementById("pipe-bottom-canvas");
        pipeCanvas = cropCanvas(canvas, 0, 0, canvas.width, 100);

        addCSS(`
            .pipe_upper:after {
                background-image: url('${canvas.toDataURL("image/png")}');
                background-size: 70px;
                bottom: 0px;
                width: 70px;
                height: 56px;
                left: -9px;
            }

            .pipe_lower:after {
                background-image: url('${canvas.toDataURL("image/png")}');
                background-size: 70px;
                bottom: 0px;
                width: 70px;
                height: 56px;
                left: -9px;
                transform: scaleX(-1) rotate(180deg);
                -webkit-transform: scaleX(-1) rotate(180deg);
            }

            .pipe_upper {
                background-image: url('${pipeCanvas.toDataURL("image/png")}');
                background-size: 70px;
            }

            .pipe_lower {
                background-image: url('${pipeCanvas.toDataURL("image/png")}');
                background-size: 70px;
            }

        `);


        // $('#player').css({
        //    'background-size' : "34px;",
        //    'background-image' : "url(" + canvas.toDataURL("image/png")+ ")"
        // });
    };
    console.log(`Loading bird from ${pipeImageUrl}`)
    image.crossOrigin = `Anonymous`;
    if (pipeImageUrl) {
        image.src = pipeImageUrl;
    }
}


function loadBirdImage(birdImageUrl) {
    // var canvas = document.createElement("canvas");
    var canvas = document.getElementById("bird-canvas");
    var context = canvas.getContext('2d');
    var image = new Image();
    image.onload = function () {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        // Flood fill the circle starting at point (50, 75) using the color red (255, 0, 0)
        //var color = { r: 255, g: 0, b: 0, a: 255 };
        context.fillStyle = "rgba(0,0,0,0.009)"; // RGBA // Freaks out if alpha is actually 0. :(
        context.fillFlood(50, 75, 50); // Kindofa guess as to start in top left corner and floodfill from there
        $('#player').css({
            'background-size': "34px;",
            'background-image': "url(" + canvas.toDataURL("image/png") + ")"
        });
    };
    console.log(`Loading bird from ${birdImageUrl}`)
    image.crossOrigin = `Anonymous`;
    if (birdImageUrl)
        image.src = birdImageUrl;
    else
        image.src = `./assets/bird2.png`
}


function loadSkyImage(skyImageUrl) {

    // var canvas = document.createElement("canvas");
    var canvas = document.getElementById("sky-canvas");
    var context = canvas.getContext('2d');
    var image = new Image();
    image.onload = function () {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        $('#sky').css({
            'background-size': "34px;",
            'background-image': "url(" + canvas.toDataURL("image/png") + ")"
        });
    };
    console.log(`Loading sky from ${skyImageUrl}`)
    image.crossOrigin = `Anonymous`;
    if (skyImageUrl)
        image.src = skyImageUrl;
    else
        image.src = `./assets/sky2.png`

}

//
// Color functions
//

async function getAverageHueFromUrl(imageUrl) {
  const image = new Image();
  image.crossOrigin = "Anonymous"; // This is needed if the image is from a different origin
  image.src = imageUrl;

  await new Promise((resolve) => {
      image.onload = resolve;
  });

  return getAverageHue(image);
}

function getAverageHue(image) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0, image.width, image.height);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const data = imageData.data;

  let totalHue = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const hsv = rgbToHsv(r, g, b);
      totalHue += hsv[0];
      count++;
  }

  return totalHue / count;
}

function rgbToHsv(r, g, b) {
  r /= 255, g /= 255, b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;

  const d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
      h = 0; // achromatic
  } else {
      switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
  }

  return [h * 360, s, v];
}

function updateHueRotate(hueRotateValue, targetSelectorText) {
  const styleSheets = document.styleSheets;
  for (let i = 0; i < styleSheets.length; i++) {
      const rules = styleSheets[i].cssRules || styleSheets[i].rules;
      for (let j = 0; j < rules.length; j++) {
          if (rules[j].selectorText === targetSelectorText) {
              rules[j].style.filter = `hue-rotate(${hueRotateValue}deg)`;
              return;
          }
      }
  }
}



var gameIsRunning = false;

//parse glif images passed in
var searchParams = new URLSearchParams(window.location.search);
var gameJsonString = searchParams.get("j") // all game in one json

// legacy
var birdImageUrl = searchParams.get("animal-image")
var pipeImageUrl = searchParams.get("pipe-image")
var backgroundImageUrl = searchParams.get("background-image")
var gamename = searchParams.get("gamename") != null ? searchParams.get("gamename") : "Gliffy Bird"
var gamesummary = searchParams.get("gamesummary") != null ? searchParams.get("gamesummary") : ""


$(document).ready(async function () {
    console.log("Document is ready");

    if (gameJsonString) {
        // oh my could this be cleaned up...
        var gameJson = JSON.parse(gameJsonString);
        backgroundImageUrl = gameJson.backgroundImageUrl;
        birdImageUrl = gameJson.animalImageUrl;
        pipeImageUrl = gameJson.pipeBottomUrl;
        gameName = gameJson.gameName;
        gameSummary = gameJson.gameSummary;
        console.log({gameJson});
    }

    const imageSelectorPairs = [
      [birdImageUrl, '#bird'],
      ["./assets/land.png", "#land"],
      ["./assets/sky2.png", "#sky"],
      ["./assets/pipe.png", ".pipe"]
  ];

    try {
        for (const [imageUrl, selector] of imageSelectorPairs) {
            const sourceHue = await getAverageHueFromUrl(birdImageUrl);
            const targetHue = await getAverageHueFromUrl(imageUrl);
            console.log(`Source Hue for ${selector}:`, sourceHue);
            console.log(`Target Hue for ${selector}:`, targetHue);
            const hueRotateValue = targetHue - sourceHue;
            console.log(`Hue Rotate Value for ${selector}:`, hueRotateValue);

            // Update the hue-rotate filter for the element globally
            updateHueRotate(hueRotateValue, selector);
        }
    } catch (error) {
        console.error("Error calculating hues:", error);
    }


    $("#gamename").text(gamename);
    $("#gamesummary").text(gamesummary);

    if (!birdImageUrl || !backgroundImageUrl) {
       // Go to create interface if nothing specified
       window.location = "create.html"
    }

    if (searchParams.get("debug") != null)
        debugmode = true;
    if (searchParams.get("easy") != null)
        pipeheight = 200;


    //stan: load our new bird and sky
    loadBirdImage(birdImageUrl);
    loadSkyImage(backgroundImageUrl);
    loadPipeImage(pipeImageUrl);

    //get the highscore
    var savedscore = getCookie("highscore");
    if (savedscore != "")
        highscore = parseInt(savedscore);

    //start with the splash screen
    // showSplash();
});


// Wait for click at very start for sound
$(document).on('click', function (evt) {
    if (!gameIsRunning) {
        gameIsRunning = true;
        $("#startscreen").hide();
        showSplash();
    }
});

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toGMTString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

function showSplash() {
    currentstate = states.SplashScreen;

    //set the defaults (again)
    velocity = 0;
    position = 180;
    rotation = 0;
    score = 0;

    //update the player in preparation for the next game
    $("#player").css({ y: 0, x: 0 });
    updatePlayer($("#player"));

    soundSwoosh.stop();
    soundSwoosh.play();

    //clear out all the pipes if there are any
    $(".pipe").remove();
    pipes = new Array();

    //make everything animated again
    $(".animated").css('animation-play-state', 'running');
    $(".animated").css('-webkit-animation-play-state', 'running');

    //fade in the splash
    $("#splash").transition({ opacity: 1 }, 2000, 'ease');
}

function startGame() {
    currentstate = states.GameScreen;

    //fade out the splash
    $("#splash").stop();
    $("#splash").transition({ opacity: 0 }, 500, 'ease');

    //update the big score
    setBigScore();

    //debug mode?
    if (debugmode) {
        //show the bounding boxes
        $(".boundingbox").show();
    }

    //start up our loops
    var updaterate = 1000.0 / 60.0; //60 times a second
    loopGameloop = setInterval(gameloop, updaterate);
    loopPipeloop = setInterval(updatePipes, 1400);

    //jump from the start!
    playerJump();
}

function updatePlayer(player) {
    //rotation
    rotation = Math.min((velocity / 10) * 90, 90);

    //apply rotation and position
    $(player).css({ rotate: rotation, top: position });
}

function gameloop() {
    var player = $("#player");

    //update the player speed/position
    velocity += gravity;
    position += velocity;

    //update the player
    updatePlayer(player);

    //create the bounding box
    var box = document.getElementById('player').getBoundingClientRect();
    var origwidth = 34.0;
    var origheight = 24.0;

    var boxwidth = origwidth - (Math.sin(Math.abs(rotation) / 90) * 8);
    var boxheight = (origheight + box.height) / 2;
    var boxleft = ((box.width - boxwidth) / 2) + box.left;
    var boxtop = ((box.height - boxheight) / 2) + box.top;
    var boxright = boxleft + boxwidth;
    var boxbottom = boxtop + boxheight;

    //if we're in debug mode, draw the bounding box
    if (debugmode) {
        var boundingbox = $("#playerbox");
        boundingbox.css('left', boxleft);
        boundingbox.css('top', boxtop);
        boundingbox.css('height', boxheight);
        boundingbox.css('width', boxwidth);
    }

    //did we hit the ground?
    if (box.bottom >= $("#land").offset().top) {
        playerDead();
        return;
    }

    //have they tried to escape through the ceiling? :o
    var ceiling = $("#ceiling");
    if (boxtop <= (ceiling.offset().top + ceiling.height()))
        position = 0;

    //we can't go any further without a pipe
    if (pipes[0] == null)
        return;

    //determine the bounding box of the next pipes inner area
    var nextpipe = pipes[0];
    var nextpipeupper = nextpipe.children(".pipe_upper");

    var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
    var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
    var piperight = pipeleft + pipewidth;
    var pipebottom = pipetop + pipeheight;

    if (debugmode) {
        var boundingbox = $("#pipebox");
        boundingbox.css('left', pipeleft);
        boundingbox.css('top', pipetop);
        boundingbox.css('height', pipeheight);
        boundingbox.css('width', pipewidth);
    }

    //have we gotten inside the pipe yet?
    if (boxright > pipeleft) {
        //we're within the pipe, have we passed between upper and lower pipes?
        if (boxtop > pipetop && boxbottom < pipebottom) {
            //yeah! we're within bounds

        }
        else {
            //no! we touched the pipe
            playerDead();
            return;
        }
    }


    //have we passed the imminent danger?
    if (boxleft > piperight) {
        //yes, remove it
        pipes.splice(0, 1);

        //and score a point
        playerScore();
    }
}

//Handle space bar
$(document).keydown(function (e) {
    //space bar!
    if (e.keyCode == 32) {
        //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
        if (currentstate == states.ScoreScreen)
            $("#replay").click();
        else
            screenClick();
    }
});

//Handle mouse down OR touch start
if ("ontouchstart" in window)
    $(document).on("touchstart", screenClick);
else
    $(document).on("mousedown", screenClick);

function screenClick() {
    if (currentstate == states.GameScreen) {
        playerJump();
    }
    else if (currentstate == states.SplashScreen) {
        startGame();
    }
}

function playerJump() {
    velocity = jump;
    //play jump sound
    soundJump.stop();
    soundJump.play();
}

function setBigScore(erase) {
    var elemscore = $("#bigscore");
    elemscore.empty();

    if (erase)
        return;

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore() {
    var elemscore = $("#currentscore");
    elemscore.empty();

    var digits = score.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore() {
    var elemscore = $("#highscore");
    elemscore.empty();

    var digits = highscore.toString().split('');
    for (var i = 0; i < digits.length; i++)
        elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal() {
    var elemmedal = $("#medal");
    elemmedal.empty();

    if (score < 10)
        //signal that no medal has been won
        return false;

    if (score >= 10)
        medal = "bronze";
    if (score >= 20)
        medal = "silver";
    if (score >= 30)
        medal = "gold";
    if (score >= 40)
        medal = "platinum";

    elemmedal.append('<img src="assets/medal_' + medal + '.png" alt="' + medal + '">');

    //signal that a medal has been won
    return true;
}

function playerDead() {
    //stop animating everything!
    $(".animated").css('animation-play-state', 'paused');
    $(".animated").css('-webkit-animation-play-state', 'paused');

    //drop the bird to the floor
    var playerbottom = $("#player").position().top + $("#player").width(); //we use width because he'll be rotated 90 deg
    var floor = flyArea;
    var movey = Math.max(0, floor - playerbottom);
    $("#player").transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');

    //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
    currentstate = states.ScoreScreen;

    //destroy our gameloops
    clearInterval(loopGameloop);
    clearInterval(loopPipeloop);
    loopGameloop = null;
    loopPipeloop = null;

    //mobile browsers don't support buzz bindOnce event
    if (isIncompatible.any()) {
        //skip right to showing score
        showScore();
    }
    else {
        //play the hit sound (then the dead sound) and then show score
        soundHit.play().bindOnce("ended", function () {
            soundDie.play().bindOnce("ended", function () {
                showScore();
            });
        });
    }
}

function showScore() {
    //unhide us
    $("#scoreboard").css("display", "block");

    //remove the big score
    setBigScore(true);

    //have they beaten their high score?
    if (score > highscore) {
        //yeah!
        highscore = score;
        //save it!
        setCookie("highscore", highscore, 999);
    }

    //update the scoreboard
    setSmallScore();
    setHighScore();
    var wonmedal = setMedal();

    //SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();

    //show the scoreboard
    $("#scoreboard").css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
    $("#replay").css({ y: '40px', opacity: 0 });
    $("#share").css({ y: '40px', opacity: 0 });
    $("#create").css({ y: '40px', opacity: 0 });
    $("#scoreboard").transition({ y: '0px', opacity: 1 }, 600, 'ease', function () {
        //When the animation is done, animate in the replay button and SWOOSH!
        soundSwoosh.stop();
        soundSwoosh.play();
        $("#replay").transition({ y: '0px', opacity: 1 }, 600, 'ease');
        $("#create").transition({ y: '0px', opacity: 1 }, 1400, 'ease');

        if (navigator.canShare && navigator.canShare({
            title: "gameName",
            text: "message",
            url: `${window.location}`
        })
        ) {
            $("#share").transition({ y: '0px', opacity: 1 }, 1200, 'ease');
        } else {
            $("#share").hide();
        }

        //also animate in the MEDAL! WOO!
        if (wonmedal) {
            $("#medal").css({ scale: 2, opacity: 0 });
            $("#medal").transition({ opacity: 1, scale: 1 }, 1200, 'ease');
        }
    });

    //make the replay button clickable
    replayclickable = true;
}

$("#create").click(function () {
    window.location = "./create.html";
})

$("#share").click(async function () {
    console.log("share")
    const gameName = "Gliffy Bird";
    const message = "Sample game from glif";
    try {
        await navigator.share({
            title: gameName,
            text: message,
            url: `${window.location}`
        });
        console.log("Shared!");
    } catch (err) {
        window.alert("Did not share." + err.toString());
    }
});

$("#replay").click(function () {
    console.log("replay")
    //make sure we can only click once
    if (!replayclickable)
        return;
    else
        replayclickable = false;
    //SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();

    //fade out the scoreboard
    $("#scoreboard").transition({ y: '-40px', opacity: 0 }, 1000, 'ease', function () {
        //when that's done, display us back to nothing
        $("#scoreboard").css("display", "none");

        //start the game over!
        showSplash();
    });
});

function playerScore() {
    score += 1;
    //play score sound
    soundScore.stop();
    soundScore.play();
    setBigScore();
}

function updatePipes() {
    //Do any pipes need removal?
    $(".pipe").filter(function () { return $(this).position().left <= -100; }).remove()

    //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
    var padding = 80;
    var constraint = flyArea - pipeheight - (padding * 2); //double padding (for top and bottom)
    var topheight = Math.floor((Math.random() * constraint) + padding); //add lower padding
    var bottomheight = (flyArea - pipeheight) - topheight;
    var newpipe = $('<div class="pipe animated"><div class="pipe_upper" style="height: ' + topheight + 'px;"></div><div class="pipe_lower" style="height: ' + bottomheight + 'px;"></div></div>');
    $("#flyarea").append(newpipe);
    pipes.push(newpipe);
}

var isIncompatible = {
    Android: function () {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function () {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function () {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function () {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Safari: function () {
        return (navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/));
    },
    Windows: function () {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function () {
        return (isIncompatible.Android() || isIncompatible.BlackBerry() || isIncompatible.iOS() || isIncompatible.Opera() || isIncompatible.Safari() || isIncompatible.Windows());
    }
};
