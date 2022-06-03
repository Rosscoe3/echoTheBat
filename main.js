import "./style.css";
//import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.127.0/build/three.module.js';
import * as TWEEN from "https://cdn.skypack.dev/@tweenjs/tween.js";
//import * as TWEEN from '@tweenjs/tween.js'
import { MapControls } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/loaders/RGBELoader.js';
import { DragControls } from "./DragControls";
import * as dat from "dat.gui";
import { mapLinear } from "https://cdn.jsdelivr.net/npm/three@0.139.0/src/math/MathUtils.js";

//** LOAD MANAGER */
const manager = new THREE.LoadingManager();
manager.onStart = function (url, itemsLoaded, itemsTotal) {
  console.log(
    "Started loading file: " +
      url +
      ".\nLoaded " +
      itemsLoaded +
      " of " +
      itemsTotal +
      " files."
  );
};
manager.onLoad = function () {
  console.log("Loading complete!");
  RESOURCES_LOADED = true;
  startButton.classList.toggle("disabled");
  document.querySelector(".progress").classList.toggle("disabled");
};
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  // console.log(
  //   "Loading file: " +
  //     url +
  //     ".\nLoaded " +
  //     itemsLoaded +
  //     " of " +
  //     itemsTotal +
  //     " files."
  // );

  var progress = (itemsTotal / itemsLoaded) * 100;
  //console.log("Progress: " + progress);

  //Prevent from going over 100%
  if (progress > 100.0) {
    progress = 100.0;
  }

  document.querySelector(".progress__fill").style.width = progress + "%";
};
manager.onError = function (url) {
  console.log("There was an error loading " + url);
};

//** CONTROLS AND SCENE SETUP */
const loader = new GLTFLoader(manager);
const lessonSceneRaycast = new THREE.Scene();
const mapScene = new THREE.Scene();
const lessonScene = new THREE.Scene();
const canvas = document.querySelector("#c");
const mainCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const lessonCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
let renderer = new THREE.WebGLRenderer({ canvas, antalias: true });
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
let labelRenderer;
const controls = new MapControls(mainCamera, renderer.domElement);
const uiMinheight = 0.1;
var mouse, raycaster;
const gui = new dat.GUI();

//**LIGHTS */
const pointLight = new THREE.PointLight("#ff8400", 10);
const pointLight2 = new THREE.PointLight("#ffffff", 1);
const pointLight3 = new THREE.PointLight("#ff2a00", 10);
const pointLight4 = new THREE.PointLight("#ffffff", 2);
const hemisphereLight = new THREE.HemisphereLight("#ff4000", "#ff7300", 1);
const dirLight = new THREE.DirectionalLight(0xffffff, 5);
const ambientLight = new THREE.AmbientLight(0xffffff, 5);
const dirLightLesson = new THREE.DirectionalLight(0xffffff, 1);
const shadowOffset = 50;
//Used to automatically scale the screen when resized
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const sceneA = new FXScene(mapScene, mainCamera);
const sceneB = new FXScene(lessonScene, lessonCamera);

//transition = new Transition( mapScene, lessonScene );
const clock = new THREE.Clock();

//** MISC GLOBAL VARIABLES */
let line;
let pathIndex = 1;
let points;
let togglePopupOpen = false;
let toggleTowerPopupOpen = false;
let toggleLessonPopupOpen = false;
let cameraPos = new THREE.Vector3(0, 5, 0);
let transition;
let transitioning = false;
let isTweening = false;
let cameraMoving = false;
let currentSceneNumber = 0;
let currentScene = mapScene;
let currentCamera;
var intersectObject;
var intersected = false;
var audioPlaying = true;
var bugAmount = 0;
const pingWrldPosTemp = new THREE.Vector3();
var maxSpriteSize = 0.2;
var minSpriteSize = 0.15;
var elem;
var gameStarted = false;
var tutorial = false;
var tutorialIndex = 0;
var videoPlaying = false;
var currentLessonSceneIndex = 0;
var currentLessonIndex = 0;

var lessonSequences;
var lesson1Sequence, lesson2Sequence, lesson3Sequence, lesson4Sequence;

//** SOUNDS AND MUSIC */
const listener = new THREE.AudioListener();
mainCamera.add(listener);
const audioLoader = new THREE.AudioLoader(manager);

const music = new THREE.Audio(listener);
const uiHoverOnSound = new THREE.Audio(listener);
const uiHoverOffSound = new THREE.Audio(listener);
const clickSound = new THREE.Audio(listener);
const transitionSound = new THREE.Audio(listener);

const music_volume = 1.0;
const sfx_volume = 1.0;

//MUSIC
audioLoader.load(
  "/resources/sounds/music/flute-guitar.mp3",
  function (buffer) {
    music.setBuffer(buffer);
    music.setLoop(true);
    music.setVolume(0.0);
  }
);
//HOVER ON SOUND
audioLoader.load("/resources/sounds/fx/woosh-1.mp3", function (buffer) {
  uiHoverOnSound.setBuffer(buffer);
  uiHoverOnSound.setLoop(false);
  uiHoverOnSound.setVolume(0.5);
  //uiHoverOnSound.stop();
});
//HOVER OFF SOUND
audioLoader.load("/resources/sounds/fx/woosh-deep.wav", function (buffer) {
  uiHoverOffSound.setBuffer(buffer);
  uiHoverOffSound.setLoop(false);
  uiHoverOffSound.setVolume(0.25);
  //uiHoverOffSound.stop();
});
//CLICK SOUND
audioLoader.load("/resources/sounds/fx/lightClick.wav", function (buffer) {
  clickSound.setBuffer(buffer);
  clickSound.setLoop(false);
  clickSound.setVolume(0.75);
  //clickSound.stop();
});
//TRANSITION SOUND
audioLoader.load(
  "/resources/sounds/fx/woosh-deep-3.wav",
  function (buffer) {
    transitionSound.setBuffer(buffer);
    transitionSound.setLoop(false);
    transitionSound.setVolume(0.5);
    //transitionSound.stop();
  }
);

//** USED TO CONTROL TRANSITION */
const transitionParams = {
  useTexture: true,
  transition: 0,
  texture: 5,
  cycle: true,
  animate: true,
  threshold: 0.3,
};
//** MAIN CAMERA VIEW BOUNDS */
var minPan = new THREE.Vector3(-4.25, 1, -5.5);
var maxPan = new THREE.Vector3(4.15, 3, 5.5);

/** SPRITES */
const map = new THREE.TextureLoader(manager).load(
  "/resources/images/echobook.jpg"
);
const towerIconTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/towericon.png"
);
const glowTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/yellow-glow.png"
);


const casaGrandeTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/casa-grande.png"
);
const deathValleyTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/death-valley.jpg"
);
const grandCanyonTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/grandCanyon.jpg"
);
const coloradoRiverTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/colorado-river.jpg"
);
const phoenixTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/phoenix.jpg"
);
const phoenix2Texture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/phoenix2.jpg"
);
const tempeTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/tempe.jpg"
);
const tusconTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/tuscon.jpg"
);
const catalinaMountainsTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/catalina-mountains.jpg"
);
const sonoranDesertTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/sonoran-desert.jpg"
);
const rooseveltLakeTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/roosevelt-lake.jpg"
);
const yumaTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/yuma.jpg"
);
const saltRiverTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/salt-river.jpg"
);
const cathedralRockTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/cathedralRock.jpg"
);
const fatmansLoopTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/fatmansLoop.jpg"
);
const horseshoeBendTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/horseshoeBend.jpg"
);
const micaViewTrailTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/micaViewTrail.jpg"
);
const navajoPointTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/navajoPoint.jpg"
);
const paintedDesertTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/paintedDesert.jpg"
);
const peoriaTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/peoria.jpg"
);
const petrifiedForestTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/petrifiedForest.jpg"
);
const pinalCountyTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/pinalCounty.jpg"
);
const saguaroNatParkTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/saguaroNatPark.jpg"
);
const sanSimonRestAreaTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/sanSimonRestArea.jpg"
);
const scaddanWashTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/scaddanWash.jpg"
);
const tanqueVerdeTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/tanqueVerde.jpg"
);
const wymolaTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/wymola.jpg"
);
const petrifiedForestTexture2 = new THREE.TextureLoader(manager).load(
  "/resources/images/location/petrifiedForest-2.png"
);


const arizona_road_texture = new THREE.TextureLoader(manager).load(
  "/resources/images/arizona-road.png"
);
let arizona_mosaic_texture;

let butTexture_green;
const bugTexture_yellow = new THREE.TextureLoader().load(
  "/resources/models/textures/bug-yellow.png"
);
const bugTexture_blue = new THREE.TextureLoader().load(
  "/resources/models/textures/bug-blue.png"
);
const bugTexture_red = new THREE.TextureLoader().load(
  "/resources/models/textures/bug-red.png"
);

const material = new THREE.SpriteMaterial({ map: map });
const towerIconMaterial = new THREE.SpriteMaterial({ map: towerIconTexture });
const glowMaterial = new THREE.SpriteMaterial({map: glowTexture});

const casaGrandeMaterial = new THREE.SpriteMaterial({ map: casaGrandeTexture });
const deathValleyMaterial = new THREE.SpriteMaterial({
  map: deathValleyTexture,
});
const grandCanyonMaterial = new THREE.SpriteMaterial({
  map: grandCanyonTexture,
});
const coloradoRiverMaterial = new THREE.SpriteMaterial({
  map: coloradoRiverTexture,
});
const phoenixMaterial = new THREE.SpriteMaterial({ map: phoenixTexture });
const phoenix2Material = new THREE.SpriteMaterial({ map: phoenix2Texture });
const tempeMaterial = new THREE.SpriteMaterial({ map: tempeTexture });
const tusconMaterial = new THREE.SpriteMaterial({ map: tusconTexture });
const catalinaMountainsMaterial = new THREE.SpriteMaterial({
  map: catalinaMountainsTexture,
});
const sonoranDesertMaterial = new THREE.SpriteMaterial({
  map: sonoranDesertTexture,
});
const rooseveltLakeMaterial = new THREE.SpriteMaterial({
  map: rooseveltLakeTexture,
});
const yumaMaterial = new THREE.SpriteMaterial({ map: yumaTexture });
const saltRiverMaterial = new THREE.SpriteMaterial({ map: saltRiverTexture });

const cathedralRockMaterial = new THREE.SpriteMaterial({ map: cathedralRockTexture});
const fatmansLoopMaterial = new THREE.SpriteMaterial({ map: fatmansLoopTexture});
const horseshoeBendMaterial = new THREE.SpriteMaterial({ map: horseshoeBendTexture});
const micaViewTrailMaterial = new THREE.SpriteMaterial({ map: micaViewTrailTexture});
const navajoPointMaterial = new THREE.SpriteMaterial({ map: navajoPointTexture});
const paintedDesertMaterial = new THREE.SpriteMaterial({ map: paintedDesertTexture});
const peoriaMaterial = new THREE.SpriteMaterial({ map: peoriaTexture});
const petrifiedForestMaterial = new THREE.SpriteMaterial({ map: petrifiedForestTexture});
const petrifiedForest2Material = new THREE.SpriteMaterial({ map: petrifiedForestTexture2});
const pinalCountyMaterial = new THREE.SpriteMaterial({ map: pinalCountyTexture});
const saguaroNatParkMaterial = new THREE.SpriteMaterial({ map: saguaroNatParkTexture});
const sanSimonRestAreaMaterial = new THREE.SpriteMaterial({ map: sanSimonRestAreaTexture});
const scaddanWashMaterial = new THREE.SpriteMaterial({ map: scaddanWashTexture});
const tanqueVerdeMaterial = new THREE.SpriteMaterial({ map: tanqueVerdeTexture});
const wymolaMaterial = new THREE.SpriteMaterial({ map: wymolaTexture});

const towerIcon = new THREE.Sprite(towerIconMaterial);
const towerIcon2 = new THREE.Sprite(towerIconMaterial);
const towerIcon3 = new THREE.Sprite(towerIconMaterial);
const towerIcon4 = new THREE.Sprite(towerIconMaterial);
const towerIcon5 = new THREE.Sprite(towerIconMaterial);

const towerIcons = [towerIcon, towerIcon2, towerIcon3, towerIcon4, towerIcon5];

const mapImages = [sprite, sprite2, towerIcon];
var sprite,
  sprite2,
  sprite3,
  sprite4,
  sprite5,
  sprite6,
  sprite7,
  sprite8,
  sprite9,
  sprite10,
  sprite11,
  sprite12,
  sprite13,
  sprite14,
  sprite15,
  sprite16,
  sprite17,
  sprite18,
  sprite19,
  sprite20,
  sprite21,
  sprite22,
  sprite23,
  sprite24,
  sprite25,
  sprite26,
  sprite27,
  sprite28,
  sprite29, 
  glowSprite;
var uiLocationSprites, labelSprites, uiLocationPositions, sceneTransitionSprites;

/** 3D OBJECTS */
const geometry = new THREE.BoxGeometry();
const focusCube = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: false,
    transparent: true,
  })
);
// let outlineBug = new THREE.Mesh(geometry, 
//   new THREE.MeshBasicMaterial({
//     color: 0x00ff00,
//     wireframe: false,
//     transparent: true,
//   })
// );

let outlineBug = new THREE.Group();
let phoenixModel = new THREE.Group();

//Load Arizona Map Model
let arizona = new THREE.Group();
let cave = new THREE.Group();
let grandCanyonModel = new THREE.Group();
let walkieTalkie = new THREE.Group();

/** HTML ELEMENTS */
let startButton = document.getElementById("startBtn");
const labelContainerElem = document.querySelector("#labels");
const locationNameElem = document.createElement("div");
let audioButton = document.getElementById("audioToggle");
let xButton = document.getElementById("close-btn");
let xButton2 = document.getElementById("close-btn2");
let xButton3 = document.getElementById("close-btn3");
let xButton4 = document.getElementById("mapPopupCloseBtn");
let xButton5 = document.getElementById("creditsCloseBtn");
let mapButton = document.getElementById("mapIcon");
let mapPopup = document.getElementById("mapPopup");
let hamburger = document.getElementById("dropdown");
let roadButton = document.getElementById("roadBtn");
let mosaicButton = document.getElementById("mosaicBtn");
let geographyButton = document.getElementById("geographyBtn");
let backButton = document.getElementById("backButton");
let youtubePlayButton = document.getElementById("playPauseBtn");
let tutorialHighlight = document.getElementById("tutorialHighlight");
let highlightText = document.getElementById("highlightText");
let mouseIcon = document.getElementById("mouseICON");

let bugIcon = document.getElementById("bugIcon1");
let bugIcon2 = document.getElementById("bugIcon2");
let bugIcon3 = document.getElementById("bugIcon3");
let bugIcon4 = document.getElementById("bugIcon4");

let helpButton = document.getElementById("helpButton");
let creditsButton = document.getElementById("creditsButton");
let creditsContainer = document.getElementById("creditsContainer");

let youAreHereIcon = document.getElementById("youAreHere");

let lessonButton_right = document.getElementById("talkie-button-right");
let lessonButton_left = document.getElementById("talkie-button-left");
let lessonButton_middle = document.getElementById("talkie-button-middle");
let youtubePlayer = document.getElementById("youtubePlayer");

let lesson1ResetBtn = document.getElementById("lesson1Reset");
let lesson1Container = document.getElementById("lesson1Activity");
let lessonDoneBtn = document.getElementById("doneButton");

let draggableElements = document.querySelectorAll(".drag");
let droppableElements = document.querySelectorAll(".droppable");

locationNameElem.textContent = "";
var echoPingLocation;

init();
initLessonScene();

//** USED FOR LOADING YOUTUBE VIDEO AND API */
function loadVideo() {
  //console.info(`loadVideo called`);

  (function loadYoutubeIFrameApiScript() {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";

    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    tag.onload = setupPlayer;
  })();

  let player = null;
  function setupPlayer() {
    /**
     * THIS FAILS!!!!!
     */
    // player = new YT.Player("player", {
    //   height: "390",
    //   width: "640",
    //   videoId: "M7lc1UVf-VE",
    //   events: {
    //     onReady: onPlayerReady,
    //     onStateChange: onPlayerStateChange
    //   }
    // });

    /**
     * Need to wait until Youtube Player is ready!
     *
     * YT.ready is not documented in https://developers.google.com/youtube/iframe_api_reference
     * but found from https://codesandbox.io/s/youtube-iframe-api-tpjwj
     */
    window.YT.ready(function () {
      player = new window.YT.Player("youtubePlayer", {
        height: "390",
        width: "640",
        videoId: "yrs9IkbkfQE",
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    });
  }

  function onPlayerReady(event) {
    //event.target.playVideo();
    console.log("PLAYER READY");
  }

  function onPlayerStateChange(event) {
    var videoStatuses = Object.entries(window.YT.PlayerState);
    console.log(videoStatuses.find((status) => status[1] === event.data)[0]);
  }
}
if (document.readyState !== "loading") {
  console.info(`document.readyState ==>`, document.readyState);
  loadVideo();
} else {
  document.addEventListener("DOMContentLoaded", function () {
    console.info(`DOMContentLoaded ==>`, document.readyState);
    loadVideo();
  });
}

var RESOURCES_LOADED = false;
var loadingScreen = {
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  ),
  box: new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshBasicMaterial({ color: 0x444ff })
  ),
};

function init() {
  //** LOADING SCREEN STUFF */
  startButton.classList.toggle("active");
  startButton.classList.toggle("disabled");
  audioButton.classList.toggle("disabled");
  mapButton.classList.toggle("disabled");
  hamburger.classList.toggle("disabled");
  backButton.classList.toggle("disabled");
  bugIcon.classList.toggle("disabled");
  bugIcon2.classList.toggle("disabled");
  bugIcon3.classList.toggle("disabled");
  bugIcon4.classList.toggle("disabled");

  mapScene.background = new THREE.Color(0xd4d2d2);
  mapScene.fog = new THREE.Fog(0xd4d2d2, 0.015, 10);

  /** RENDERER & CAMERA SETUP */
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.physicallyCorrectLights = true;
  renderer.setSize(window.innerWidth, window.innerHeight);

  mainCamera.rotation.x = Math.PI / -2;
  mainCamera.position.setX(1.64);
  mainCamera.position.setZ(2);
  mainCamera.position.setY(cameraPos.y);
  currentCamera = mainCamera;

  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

  //** DIRECT LIGHT SETUP */
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -shadowOffset;
  dirLight.shadow.camera.right = shadowOffset;
  dirLight.shadow.camera.top = shadowOffset;
  dirLight.shadow.camera.bottom = -shadowOffset;
  dirLight.shadow.camera.far = 3500;
  dirLight.shadow.bias = -0.0001;
  mapScene.add(dirLight);
  //mapScene.add(ambientLight);

  /** SPRITE INSTANTIATION */

  glowSprite = new THREE.Sprite(glowMaterial);

  sprite = new THREE.Sprite(material);
  sprite2 = new THREE.Sprite(casaGrandeMaterial);
  sprite3 = new THREE.Sprite(deathValleyMaterial);
  sprite4 = new THREE.Sprite(grandCanyonMaterial);
  sprite5 = new THREE.Sprite(coloradoRiverMaterial);
  sprite6 = new THREE.Sprite(phoenixMaterial);
  sprite7 = new THREE.Sprite(phoenix2Material);
  sprite8 = new THREE.Sprite(tempeMaterial);
  sprite9 = new THREE.Sprite(tusconMaterial);
  sprite10 = new THREE.Sprite(catalinaMountainsMaterial);
  sprite11 = new THREE.Sprite(sonoranDesertMaterial);
  sprite12 = new THREE.Sprite(rooseveltLakeMaterial);
  sprite13 = new THREE.Sprite(yumaMaterial);
  sprite14 = new THREE.Sprite(saltRiverMaterial);
  sprite15 = new THREE.Sprite(cathedralRockMaterial);
  sprite16 = new THREE.Sprite(fatmansLoopMaterial);
  sprite17 = new THREE.Sprite(horseshoeBendMaterial);
  sprite18 = new THREE.Sprite(micaViewTrailMaterial);
  sprite19 = new THREE.Sprite(navajoPointMaterial);
  sprite20 = new THREE.Sprite(paintedDesertMaterial);
  sprite21 = new THREE.Sprite(peoriaMaterial);
  sprite22 = new THREE.Sprite(petrifiedForestMaterial);
  sprite23 = new THREE.Sprite(petrifiedForest2Material);
  sprite24 = new THREE.Sprite(pinalCountyMaterial);
  sprite25 = new THREE.Sprite(saguaroNatParkMaterial);
  sprite26 = new THREE.Sprite(sanSimonRestAreaMaterial);
  sprite27 = new THREE.Sprite(scaddanWashMaterial);
  sprite28 = new THREE.Sprite(tanqueVerdeMaterial);
  sprite29 = new THREE.Sprite(wymolaMaterial);

  locationSpriteSetup();
  lessonSequenceSetup();

  uiLocationSprites = [
    sprite2,
    sprite3,
    sprite4,
    sprite5,
    sprite6,
    sprite7,
    sprite8,
    sprite9,
    sprite10,
    sprite11,
    sprite12,
    sprite13,
    sprite14,
    sprite15,
    sprite16,
    sprite17,
    sprite18,
    sprite19,
    sprite20,
    sprite21,
    sprite22,
    sprite23,
    sprite24,
    sprite25,
    sprite26,
    sprite27,
    sprite28,
    sprite29,
  ];
  uiLocationPositions = [
    new THREE.Vector3(3, 1, 4),
    new THREE.Vector3(-4, 1, 2),
    new THREE.Vector3(3, 1, 5),
    new THREE.Vector3(1, 1, 2),
    new THREE.Vector3(-2, 1, 2),
    new THREE.Vector3(-3, 1, 3),
    new THREE.Vector3(2, 1, 1),
    new THREE.Vector3(-5, 1, 3),
    new THREE.Vector3(2, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
    new THREE.Vector3(-4, 1, 5),
  ];

  sceneTransitionSprites = [
    sprite2,
    sprite4,
    sprite6,
    sprite8
  ];

  //** Adds all the sprites with their given positions */
  for (var i = 0; i < uiLocationSprites.length; i++) {
    uiLocationSprites[i].position.setX(uiLocationPositions[i].x);
    uiLocationSprites[i].position.setY(uiMinheight);
    uiLocationSprites[i].position.setZ(uiLocationPositions[i].z);

    uiLocationSprites[i].userData.name = "locationUI";
    uiLocationSprites[i].userData.scaling = false;
    uiLocationSprites[i].scale.set(minSpriteSize, minSpriteSize, minSpriteSize);
    lessonSceneRaycast.add(uiLocationSprites[i]);

    //console.log("CURRENT INDEX: " + i);
  }

  sprite2.position.set(0.1, sprite2.position.y, 3.59);
  sprite4.position.set(-0.2, sprite4.position.y, -5.66);
  sprite5.position.set(-1.56, sprite5.position.y, -6.2697);
  sprite6.position.set(-0.65, sprite6.position.y, 1.7);
  sprite7.position.set(0.4, sprite7.position.y, 1.62);
  sprite8.position.set(-0.04, sprite8.position.y, 2.07);
  sprite9.position.set(1.772, sprite9.position.y, 5.41);
  sprite10.position.set(2.227, sprite10.position.y, 5.26);
  sprite11.position.set(-2.02, sprite11.position.y, 5.07);
  sprite12.position.set(1.77, sprite12.position.y, 1.16);
  sprite13.position.set(-5.207, sprite13.position.y, 3.44);
  sprite14.position.set(1.2, sprite14.position.y, 1.46);
  sprite15.position.set(0.29, sprite15.position.y, -1.9);
  sprite16.position.set(0.72, sprite16.position.y, -3.1);
  sprite17.position.set(1.25, sprite17.position.y, -7.65);
  sprite18.position.set(2.45, sprite18.position.y, 5.65);
  sprite19.position.set(0.45, sprite19.position.y, -5.35);
  sprite20.position.set(4.3, sprite20.position.y, -3.8);
  sprite21.position.set(-1, sprite21.position.y, 0.79);
  sprite22.position.set(4.95, sprite22.position.y, -2.45);
  sprite23.position.set(5, sprite22.position.y, -2.67);
  sprite24.position.set(0.94, sprite22.position.y, 4.26);
  sprite25.position.set(1.26, sprite22.position.y, 5.2);
  sprite26.position.set(6.3, sprite22.position.y, 5.56);
  sprite27.position.set(-5.5, sprite22.position.y, 1.01);
  sprite28.position.set(2.53, sprite22.position.y, 5.34);
  sprite29.position.set(0.71, sprite22.position.y, 4.04);

  glowSprite.position.set(sprite12.position.x, uiMinheight, sprite12.position.z);
  //lessonSceneRaycast.add(glowSprite);

  //** HTML LABEL CONTENT */
  elem = locationNameElem;
  elem.textContent = "";
  labelContainerElem.appendChild(elem);

  //** LABEL INSTANTIATION */
  var sprite2Label = makeTextSprite("  Casa Grande", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite2Label.scale.set(0.4, 0.2, 0.4);
  sprite2Label.position.set(
    sprite2.position.x + 0.035,
    uiMinheight + 0.01,
    sprite2.position.z + 0.06
  );
  sprite2Label.userData.hover = false;
  sprite2Label.material.opacity = 0.0;
  mapScene.add(sprite2Label);

  var sprite3Label = makeTextSprite("  Death Valley", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite3Label.scale.set(0.4, 0.2, 0.4);
  sprite3Label.position.set(
    sprite3.position.x + 0.0375,
    uiMinheight + 0.01,
    sprite3.position.z + 0.07
  );
  sprite3Label.userData.hover = false;
  sprite3Label.material.opacity = 0.0;
  mapScene.add(sprite3Label);

  var sprite4Label = makeTextSprite("  Grand Canyon", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite4Label.scale.set(0.5, 0.25, 0.5);
  sprite4Label.position.set(
    sprite4.position.x + 0.01,
    uiMinheight + 0.01,
    sprite4.position.z + 0.075
  );
  sprite4Label.userData.hover = false;
  sprite4Label.material.opacity = 0.0;
  mapScene.add(sprite4Label);

  var sprite5Label = makeTextSprite("  Colorado River", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite5Label.scale.set(0.5, 0.25, 0.5);
  sprite5Label.position.set(
    sprite5.position.x + 0.01,
    uiMinheight + 0.01,
    sprite5.position.z + 0.075
  );
  sprite5Label.userData.hover = false;
  sprite5Label.material.opacity = 0.0;
  mapScene.add(sprite5Label);

  var sprite6Label = makeTextSprite("  Phoenix", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite6Label.scale.set(0.5, 0.25, 0.5);
  sprite6Label.position.set(
    sprite6.position.x + 0.1,
    uiMinheight + 0.01,
    sprite6.position.z + 0.075
  );
  sprite6Label.userData.hover = false;
  sprite6Label.material.opacity = 0.0;
  mapScene.add(sprite6Label);

  var sprite7Label = makeTextSprite("  Phoenix", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite7Label.scale.set(0.5, 0.25, 0.5);
  sprite7Label.position.set(
    sprite7.position.x + 0.1,
    uiMinheight + 0.01,
    sprite7.position.z + 0.075
  );
  sprite7Label.userData.hover = false;
  sprite7Label.material.opacity = 0.0;
  mapScene.add(sprite7Label);

  var sprite8Label = makeTextSprite("  Tempe", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite8Label.scale.set(0.5, 0.25, 0.5);
  sprite8Label.position.set(
    sprite8.position.x + 0.12,
    uiMinheight + 0.01,
    sprite8.position.z + 0.075
  );
  sprite8Label.userData.hover = false;
  sprite8Label.material.opacity = 0.0;
  mapScene.add(sprite8Label);

  var sprite9Label = makeTextSprite("Tuscon", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite9Label.scale.set(0.5, 0.25, 0.5);
  sprite9Label.position.set(
    sprite9.position.x + 0.1425,
    uiMinheight + 0.01,
    sprite9.position.z + 0.075
  );
  sprite9Label.userData.hover = false;
  sprite9Label.material.opacity = 0.0;
  mapScene.add(sprite9Label);

  var sprite10Label = makeTextSprite("Catalina Mts.", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite10Label.scale.set(0.5, 0.25, 0.5);
  sprite10Label.position.set(
    sprite10.position.x + 0.075,
    uiMinheight + 0.01,
    sprite10.position.z + 0.075
  );
  sprite10Label.userData.hover = false;
  sprite10Label.material.opacity = 0.0;
  mapScene.add(sprite10Label);

  var sprite11Label = makeTextSprite("Sonoran Desert", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite11Label.scale.set(0.5, 0.25, 0.5);
  sprite11Label.position.set(
    sprite11.position.x + 0.035,
    uiMinheight + 0.01,
    sprite11.position.z + 0.075
  );
  sprite11Label.userData.hover = false;
  sprite11Label.material.opacity = 0.0;
  mapScene.add(sprite11Label);

  var sprite12Label = makeTextSprite("Roosevelt Lake", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite12Label.scale.set(0.5, 0.25, 0.5);
  sprite12Label.position.set(
    sprite12.position.x + 0.04,
    uiMinheight + 0.01,
    sprite12.position.z + 0.075
  );
  sprite12Label.userData.hover = false;
  sprite12Label.material.opacity = 0.0;
  mapScene.add(sprite12Label);

  var sprite13Label = makeTextSprite("Gila River", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite13Label.scale.set(0.5, 0.25, 0.5);
  sprite13Label.position.set(
    sprite13.position.x + 0.12,
    uiMinheight + 0.01,
    sprite13.position.z + 0.075
  );
  sprite13Label.userData.hover = false;
  sprite13Label.material.opacity = 0.0;
  mapScene.add(sprite13Label);

  var sprite14Label = makeTextSprite("Salt River", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite14Label.scale.set(0.5, 0.25, 0.5);
  sprite14Label.position.set(
    sprite14.position.x + 0.12,
    uiMinheight + 0.01,
    sprite14.position.z + 0.075
  );
  sprite14Label.userData.hover = false;
  sprite14Label.material.opacity = 0.0;
  mapScene.add(sprite14Label);

  var sprite15Label = makeTextSprite("Cathedral Rock", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite15Label.scale.set(0.5, 0.25, 0.5);
  sprite15Label.position.set(
    sprite15.position.x + 0.05,
    uiMinheight + 0.01,
    sprite15.position.z + 0.075
  );
  sprite15Label.userData.hover = false;
  sprite15Label.material.opacity = 0.0;
  mapScene.add(sprite15Label);

  var sprite16Label = makeTextSprite("Fatman's Loop", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite16Label.scale.set(0.5, 0.25, 0.5);
  sprite16Label.position.set(
    sprite16.position.x + 0.05,
    uiMinheight + 0.01,
    sprite16.position.z + 0.075
  );
  sprite16Label.userData.hover = false;
  sprite16Label.material.opacity = 0.0;
  mapScene.add(sprite16Label);

  var sprite17Label = makeTextSprite("Horseshoe Bend", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite17Label.scale.set(0.5, 0.25, 0.5);
  sprite17Label.position.set(
    sprite17.position.x + 0.05,
    uiMinheight + 0.01,
    sprite17.position.z + 0.075
  );
  sprite17Label.userData.hover = false;
  sprite17Label.material.opacity = 0.0;
  mapScene.add(sprite17Label);

  var sprite18Label = makeTextSprite("Mica View Trail", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite18Label.scale.set(0.5, 0.25, 0.5);
  sprite18Label.position.set(
    sprite18.position.x + 0.05,
    uiMinheight + 0.01,
    sprite18.position.z + 0.075
  );
  sprite18Label.userData.hover = false;
  sprite18Label.material.opacity = 0.0;
  mapScene.add(sprite18Label);

  var sprite19Label = makeTextSprite("Navajo Point", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite19Label.scale.set(0.5, 0.25, 0.5);
  sprite19Label.position.set(
    sprite19.position.x + 0.075,
    uiMinheight + 0.01,
    sprite19.position.z + 0.075
  );
  sprite19Label.userData.hover = false;
  sprite19Label.material.opacity = 0.0;
  mapScene.add(sprite19Label);

  var sprite20Label = makeTextSprite("Painted Desert", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite20Label.scale.set(0.5, 0.25, 0.5);
  sprite20Label.position.set(
    sprite20.position.x + 0.05,
    uiMinheight + 0.01,
    sprite20.position.z + 0.075
  );
  sprite20Label.userData.hover = false;
  sprite20Label.material.opacity = 0.0;
  mapScene.add(sprite20Label);

  var sprite21Label = makeTextSprite("Peoria", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite21Label.scale.set(0.5, 0.25, 0.5);
  sprite21Label.position.set(
    sprite21.position.x + 0.16,
    uiMinheight + 0.01,
    sprite21.position.z + 0.075
  );
  sprite21Label.userData.hover = false;
  sprite21Label.material.opacity = 0.0;
  mapScene.add(sprite21Label);

  var sprite22Label = makeTextSprite("Petrified Forest", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite22Label.scale.set(0.5, 0.25, 0.5);
  sprite22Label.position.set(
    sprite22.position.x + 0.05,
    uiMinheight + 0.01,
    sprite22.position.z + 0.075
  );
  sprite22Label.userData.hover = false;
  sprite22Label.material.opacity = 0.0;
  mapScene.add(sprite22Label);

  var sprite23Label = makeTextSprite("Petrified Forest 2", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite23Label.scale.set(0.5, 0.25, 0.5);
  sprite23Label.position.set(
    sprite23.position.x + 0.05,
    uiMinheight + 0.01,
    sprite23.position.z + 0.075
  );
  sprite23Label.userData.hover = false;
  sprite23Label.material.opacity = 0.0;
  mapScene.add(sprite23Label);

  var sprite24Label = makeTextSprite("Pinal County", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite24Label.scale.set(0.5, 0.25, 0.5);
  sprite24Label.position.set(
    sprite24.position.x + 0.075,
    uiMinheight + 0.01,
    sprite24.position.z + 0.075
  );
  sprite24Label.userData.hover = false;
  sprite24Label.material.opacity = 0.0;
  mapScene.add(sprite24Label);

  var sprite25Label = makeTextSprite("Saguaro Nat Park", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite25Label.scale.set(0.5, 0.25, 0.5);
  sprite25Label.position.set(
    sprite25.position.x + 0.035,
    uiMinheight + 0.01,
    sprite25.position.z + 0.075
  );
  sprite25Label.userData.hover = false;
  sprite25Label.material.opacity = 0.0;
  mapScene.add(sprite25Label);

  var sprite26Label = makeTextSprite("San Simon", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite26Label.scale.set(0.5, 0.25, 0.5);
  sprite26Label.position.set(
    sprite26.position.x + 0.1,
    uiMinheight + 0.01,
    sprite26.position.z + 0.075
  );
  sprite26Label.userData.hover = false;
  sprite26Label.material.opacity = 0.0;
  mapScene.add(sprite26Label);

  var sprite27Label = makeTextSprite("Scaddan Wash", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite27Label.scale.set(0.5, 0.25, 0.5);
  sprite27Label.position.set(
    sprite27.position.x + 0.05,
    uiMinheight + 0.01,
    sprite27.position.z + 0.075
  );
  sprite27Label.userData.hover = false;
  sprite27Label.material.opacity = 0.0;
  mapScene.add(sprite27Label);

  var sprite28Label = makeTextSprite("Tanque Verde", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite28Label.scale.set(0.5, 0.25, 0.5);
  sprite28Label.position.set(
    sprite28.position.x + 0.05,
    uiMinheight + 0.01,
    sprite28.position.z + 0.075
  );
  sprite28Label.userData.hover = false;
  sprite28Label.material.opacity = 0.0;
  mapScene.add(sprite28Label);

  var sprite29Label = makeTextSprite("Wymola", {
    fontsize: 40,
    fontface: "roboto-condensed",
    borderColor: { r: 0, g: 0, b: 255, a: 0.0 },
  });
  sprite29Label.scale.set(0.5, 0.25, 0.5);
  sprite29Label.position.set(
    sprite29.position.x + 0.14,
    uiMinheight + 0.01,
    sprite29.position.z + 0.075
  );
  sprite29Label.userData.hover = false;
  sprite29Label.material.opacity = 0.0;
  mapScene.add(sprite29Label);

  labelSprites = [
    sprite2Label,
    sprite2Label,
    sprite3Label,
    sprite4Label,
    sprite5Label,
    sprite6Label,
    sprite7Label,
    sprite8Label,
    sprite9Label,
    sprite10Label,
    sprite11Label,
    sprite12Label,
    sprite13Label,
    sprite14Label,
    sprite15Label,
    sprite16Label,
    sprite17Label,
    sprite18Label,
    sprite19Label,
    sprite20Label,
    sprite21Label,
    sprite22Label,
    sprite23Label,
    sprite24Label,
    sprite25Label,
    sprite26Label,
    sprite27Label,
    sprite28Label,
    sprite29Label,
  ];

  //** SETUP FOR USING DAT GUI CONTROLS */
  const guiWorld = {
    xPos: {
      x: 0,
      y: 0,
      z: 0,
    },
    rotPos:{
      x: 0,
      y: 0, 
      z: 0,
    }
  };
  gui.add(guiWorld.xPos, "x", -7, 7).onChange(() => {
    phoenixModel.position.set(
      guiWorld.xPos.x,
      phoenixModel.position.y,
      phoenixModel.position.z
    );
    console.log(phoenixModel.position);
  });

  gui.add(guiWorld.xPos, "y", -10, 10).onChange(() => {
    phoenixModel.position.set(
      phoenixModel.position.x,
      guiWorld.xPos.y,
      phoenixModel.position.z
    );
    console.log(phoenixModel.position);
  });

  gui.add(guiWorld.xPos, "z", -10, 10).onChange(() => {
    phoenixModel.position.set(
      phoenixModel.position.x,
      phoenixModel.position.y,
      guiWorld.xPos.z
    );
    console.log(phoenixModel.position);
  });

  //** TOWER ICON INSTANTIATIONS */
  towerSpriteSetup();

  //** 3D Objects Instantiation */
  focusCube.scale.set(0.1, 0.1, 0.1);
  focusCube.visible = true;
  //mapScene.add(focusCube);
  //Loads arizona Map
  loader.load("/resources/models/arizona-map.glb", function (gltf) {
    //landsat = gltf.scene;
    arizona.userData.name = "Arizona";
    arizona.scale.setY(1);
    arizona.castShadow = true;
    arizona.rotation.y = Math.PI / -2.15;
    //arizona.material.normal = .01;

    // gltf.parser.getDependencies( 'material' ).then( ( materials ) => {

    //   console.log( materials );
    //   var material = materials
    //   materials.normalScale = {x: 0, y: 0};
    //   console.log("MATERIALS");

    // } );

    var model = gltf.scene;
    var newMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    model.traverse((o) => {
      if (o.isMesh) {
        o.material.normalScale = { x: 0.000001, y: 0.000001 };
        o.material.bumpscale = 0.1;
        o.material.normalMapType = 0;
        console.log(o.material);
        o.material.map.anisotropy = 10;
        // o.material.map = arizona_height_texture;
        // o.material.map.flipY = false;
        // console.log( o.material );

        //o.material.needsUpdate = true;
      }
    });

    arizona.add(gltf.scene);
    lessonSceneRaycast.add(arizona);
    arizona_mosaic_texture = arizona.children[0].children[0].material.map;
    //mapScene.add(arizona);
  });

  // arizonaModel.material.map = arizona_height_texture;
  // arizonaModel.material.map.flipY = false;
  // arizonaModel.material.needsUpdate = true;

  // arizonaModel.traverse((m) => {
  //   if (m.isMesh)
  //   {
  //     m.material.map = arizona_height_texture;
  //     m.material.map.flipY = false;
  //     console.log( m.material );

  //     m.material.needsUpdate = true;
  //   }
  // });

  //console.log("YES: " + arizonaModel);

  transition = new Transition(sceneB, sceneA);

  //** INITIALIZING FUNCTIONS */
  makeCameraControls();
  makeEchoLinePath();

  //towerIcon.userData.ping = true;
  echoPingLocation = makeEchoPing(towerIcon.position.x, towerIcon.position.z);
  mapScene.add(lessonSceneRaycast);
}

function tutorialSequence()
{
  console.log("TUTORIAL: " + tutorialIndex);
  tutorial = true;
  
  if(tutorialIndex == 0)
  {
    // tutorialHighlight.style = "top: 50%";
    tutorialHighlight.style.top = "50%";
    tutorialHighlight.style.left = "50%";
    highlightText.innerHTML = "Click and drag to move around the map";
    tutorialIndex++;
  }
  else if(tutorialIndex == 1)
  {
    tutorialHighlight.style.top = "50%";
    tutorialHighlight.style.left = "50%";
    tutorialHighlight.style.opacity = "0%";
    highlightText.innerHTML = "Look for Echo by clicking each map icon";
    lessonSceneRaycast.add(glowSprite);
    mouseIcon.classList.toggle("active");
    tutorialIndex++;
  }
  else if(tutorialIndex == 2)
  {
    glowSprite.position.set(towerIcon.position.x, uiMinheight - 0.01, towerIcon.position.z);
    highlightText.innerHTML = "Clicking towers will give you hints to Echo's location";
    tutorialIndex++;
  }
  else if(tutorialIndex == 3)
  {
    tutorialHighlight.style.top = "97.5%";
    tutorialHighlight.style.left = "97.5%";
    tutorialHighlight.style.opacity = "50%";
    lessonSceneRaycast.remove(glowSprite);
    highlightText.innerHTML = "Use the map to get your bearings";
    tutorialIndex++;
  }
  else if(tutorialIndex == 4)
  {
    tutorialIndex = 0;
    tutorial = false;
    tutorialHighlight.style.opacity = "0%";
    tutorialHighlight.classList.toggle("active");
    highlightText.classList.toggle("active");
  }
}

function tutorialReset()
{
  tutorialHighlight.style.top = "50%";
  tutorialHighlight.style.left = "50%";
  tutorialHighlight.style.opacity = "50%";
  highlightText.innerHTML = "Click and drag to move around the map";
  tutorialIndex++;

  glowSprite.position.set(sprite12.position.x, uiMinheight - 0.01, sprite12.position.z);

  tutorialIndex = 0;
  tutorial = true;

  mouseIcon.classList.toggle("active");
  tutorialHighlight.classList.toggle("active");
  highlightText.classList.toggle("active");
}

function initLessonScene() {
  lessonScene.background = new THREE.Color(0x000000);
  //lessonScene.add(hemisphereLight);

  //** LIGHTS */
  pointLight.position.set(-20, 0, 12);
  pointLight2.position.set(0, 0, 0);
  pointLight3.position.set(-12, 0, -10);
  pointLight4.position.set(2, -1.1, -0.6);
  lessonScene.add(pointLight);
  lessonScene.add(pointLight2);
  lessonScene.add(pointLight3);
  lessonScene.add(pointLight4);

  lessonScene.fog = new THREE.Fog(0x66000f, 0.015, 25);

  var lightTween = new TWEEN.Tween(pointLight)
    .to({ intensity: 1 }, 2000)
    .yoyo(true)
    .repeat(Infinity);
  //.delay (1000)
  lightTween.easing(TWEEN.Easing.Quadratic.InOut);
  lightTween.start();

  var lightTween2 = new TWEEN.Tween(pointLight3)
    .to({ intensity: 1 }, 2000)
    .yoyo(true)
    .repeat(Infinity)
    .delay(1000);
  lightTween2.easing(TWEEN.Easing.Quadratic.InOut);
  lightTween2.start();

  //** 3D MODELS  */
  //Loads Cave model
  loader.load("/resources/models/cave.glb", function (gltf) {
    //landsat = gltf.scene;
    cave.userData.name = "Cave";
    cave.scale.set(0.5, 0.5, 0.5);
    cave.add(gltf.scene);
    cave.castShadow = true;
    lessonScene.add(cave);
  });

  //Loads Grand Canyon model
  loader.load("/resources/models/Grand-Canyon-Sketchfab-edit.glb", function (gltf) {
    //landsat = gltf.scene;
    grandCanyonModel.userData.name = "GrandCanyon";
    // grandCanyonModel.scale.set(0.3, 0.3, 0.3);
    // grandCanyonModel.position.set(-2.85, -1.34, 1.81);

    //grandCanyonModel.scale.set(0.3, 0.3, 0.3);
    grandCanyonModel.position.set(-4.83, -1.55, 1);
    grandCanyonModel.rotation.set(0, -3.104, 0); //0.247
    
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      {
        //o.material.normalScale = {x: .000001, y: .000001};
        //o.material.bumpscale = .1;
        //o.material.normalMapType = 0;
        //console.log("O:" + o.name);
        
        // o.material.map = arizona_height_texture;
        // o.material.map.flipY = false;
        // console.log( o.material );
        
        var colorMap = o.material.map;
        
        if(o.name == "Sun")
        {
          var newMaterial = new THREE.MeshBasicMaterial({});
          o.material = newMaterial;
          o.material.color.set(0xFF7900);
          console.log("O:" + o.name);
        }
        else if(o.name == "Plane_1")
        {
          var newMaterial = new THREE.MeshBasicMaterial({});
          o.material = newMaterial;
          o.material.map = colorMap;
          //console.log(o.name + ": " + o.scale);
          o.scale.set(10, 1, 4);
          o.position.set(o.position.x, o.position.y - 0.75, o.position.z)
          console.log("O:" + o.name);
        }
        else
        {
          var newMaterial = new THREE.MeshBasicMaterial({});
          o.material = newMaterial;
          o.material.aoMapIntensity = 0;
          o.material.map = colorMap;
        }

        //o.material.needsUpdate = true;
      }
    });
    
    grandCanyonModel.add(gltf.scene);
    //lessonScene.add(grandCanyonModel);
    grandCanyonModel.castShadow = true;

    //console.log("grand Canyon" + grandCanyonModel.children[0].children[0].children[0].material);  

  });

  //Phoenix Model
  loader.load("/resources/models/phoenix2.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        o.userData.name = "Phoenix";
        var colorMap = o.material.map;
        butTexture_green = colorMap;
        var newMaterial = new THREE.MeshBasicMaterial({});
        o.material = newMaterial;
        o.material.map = colorMap;

        //console.log("O:" + o.name);

        if(o.name == "Plane")
        {
          o.material.transparent = true;
        }
      }
    });
    
    phoenixModel.castShadow = true;

    phoenixModel.add(gltf.scene);
    console.log(phoenixModel);
    //console.log("outline: " + outlineBug.children[0].children[0].name);
  });

  phoenixModel.rotation.set(0, -4.18, 0);
  phoenixModel.position.set(2.05, -2, 2.748);

  //Bug Model
  loader.load("/resources/models/Bugs-1.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        o.userData.name = "bug";
        //outlineBug.geometry = o;
        var colorMap = o.material.map;
        butTexture_green = colorMap;
        var newMaterial = new THREE.MeshToonMaterial({transparent: true});
        o.material = newMaterial;
        o.material.map = colorMap;

        //outlineBug.mesh = o;
        console.log("O:" + o.name);

        if(o.name == "wings001")
        {
          var wingFlapTween = new TWEEN.Tween(o.rotation)
            .to({ x: 0.15}, 25)
            .yoyo(true)
            .repeat(Infinity);
          wingFlapTween.easing(TWEEN.Easing.Quadratic.InOut);
          wingFlapTween.start();
        }
      }
    });
    
    //outlineBug.geometry = gltf.scene;

    //outlineBug = gltf.scene;
    outlineBug.castShadow = true;

    outlineBug.add(gltf.scene);
    console.log(outlineBug);
    //console.log("outline: " + outlineBug.children[0].children[0].name);
  });
  outlineBug.scale.set(0.75, 0.75, 0.75);
  outlineBug.position.set(-2.88, -2.6359, 0);
  outlineBug.rotation.set(0, -2.45, 0);
  outlineBug.userData.name = "bug";
  lessonScene.add(outlineBug);

  const rgbeLoader = new RGBELoader();
  rgbeLoader.load('/resources/images/hdr/GrandCanyonBackdrop.hdr', function(texture){
      texture.mapping = THREE.EquirectangularReflectionMapping;
      lessonScene.background = texture;
      lessonScene.enviroment = texture;
      console.log("LOADED IMAGE");
  });

  //** CAMERA INITIALIZATION */
  //lessonCamera.rotation.x = Math.PI / -2;
  lessonCamera.rotation.y = Math.PI / 2;
  lessonCamera.position.setY(-1);
  lessonCamera.position.setX(1);

  /** ADD LIGHTS */
  dirLightLesson.color.setHSL(0.1, 1, 0.95);
  dirLightLesson.position.set(-1, 1.75, 1);
  dirLightLesson.position.multiplyScalar(30);
  dirLightLesson.castShadow = true;
  dirLightLesson.shadow.mapSize.width = 2048;
  dirLightLesson.shadow.mapSize.height = 2048;
  dirLightLesson.shadow.camera.left = -shadowOffset;
  dirLightLesson.shadow.camera.right = shadowOffset;
  dirLightLesson.shadow.camera.top = shadowOffset;
  dirLightLesson.shadow.camera.bottom = -shadowOffset;
  dirLightLesson.shadow.camera.far = 3500;
  dirLightLesson.shadow.bias = -0.0001;
  //lessonScene.add( dirLightLesson );

  //lessonScene.add(hemisphereLight);
}

function makeTextSprite(message, parameters) {
  if (parameters === undefined) parameters = {};
  var fontface = parameters.hasOwnProperty("fontface")
    ? parameters["fontface"]
    : "Arial";
  var fontsize = parameters.hasOwnProperty("fontsize")
    ? parameters["fontsize"]
    : 18;
  var borderThickness = parameters.hasOwnProperty("borderThickness")
    ? parameters["borderThickness"]
    : 4;
  var borderColor = parameters.hasOwnProperty("borderColor")
    ? parameters["borderColor"]
    : { r: 0, g: 0, b: 0, a: 1.0 };
  var backgroundColor = parameters.hasOwnProperty("backgroundColor")
    ? parameters["backgroundColor"]
    : { r: 255, g: 255, b: 255, a: 0.0 };
  var textColor = parameters.hasOwnProperty("textColor")
    ? parameters["textColor"]
    : { r: 255, g: 255, b: 255, a: 1.0 };

  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  context.font = "Bold " + fontsize + "px " + fontface;
  var metrics = context.measureText(message);
  var textWidth = metrics.width;

  context.fillStyle =
    "rgba(" +
    backgroundColor.r +
    "," +
    backgroundColor.g +
    "," +
    backgroundColor.b +
    "," +
    backgroundColor.a +
    ")";
  context.strokeStyle =
    "rgba(" +
    borderColor.r +
    "," +
    borderColor.g +
    "," +
    borderColor.b +
    "," +
    borderColor.a +
    ")";

  context.lineWidth = borderThickness;
  roundRect(
    context,
    borderThickness / 2,
    borderThickness / 2,
    (textWidth + borderThickness) * 1.1,
    fontsize * 1.4 + borderThickness,
    8
  );

  context.fillStyle =
    "rgba(" + textColor.r + ", " + textColor.g + ", " + textColor.b + ", 1.0)";
  context.fillText(message, borderThickness, fontsize + borderThickness);

  var texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  var spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    useScreenCoordinates: false,
  });
  var sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function locationSpriteSetup() {
  sprite2.userData.locName = "Casa Grande";
  sprite3.userData.locName = "Death Valley";
  sprite4.userData.locName = "Grand Canyon";
  sprite5.userData.locName = "Colorado River";
  sprite6.userData.locName = "Phoenix";
  sprite7.userData.locName = "Phoenix";
  sprite8.userData.locName = "Tempe";
  sprite9.userData.locName = "Tuscon";
  sprite10.userData.locName = "Catalina Mountains";
  sprite11.userData.locName = "Sonoran Desert";
  sprite12.userData.locName = "Roosevelt Lake";
  sprite13.userData.locName = "Gila River";
  sprite14.userData.locName = "Salt River";
  sprite15.userData.locName = "Cathedral Rock";
  sprite16.userData.locName = "Fatman's Loop";
  sprite17.userData.locName = "Horshoe Bend";
  sprite18.userData.locName = "Mica View Trail";
  sprite19.userData.locName = "Navajo Point";
  sprite20.userData.locName = "Painted Desert";
  sprite21.userData.locName = "Peoria";
  sprite22.userData.locName = "Petrified Forest";
  sprite23.userData.locName = "Petrified Forest 2";
  sprite24.userData.locName = "Pinal County";
  sprite25.userData.locName = "Saguaro Nat Park";
  sprite26.userData.locName = "San Simon Rest Area";
  sprite27.userData.locName = "Scaddan Wash";
  sprite28.userData.locName = "Tanque Verde";
  sprite29.userData.locName = "Wymola";

  sprite.userData.popup = true;
  sprite.userData.popupTitle = "Echo The Bat";
  sprite.userData.popupText =
    "This is the text that has been assigned to the echo the bat location UI";

  sprite2.userData.url = "https://landsat.gsfc.nasa.gov/outreach/camp-landsat/";
  sprite2.userData.newScene = true;
  sprite2.userData.ping = true;
  sprite2.userData.index = 0;

  sprite3.userData.popup = true;
  sprite3.userData.popupTitle = "Death Valley";
  sprite3.userData.popupText =
    "Death Valley is a vast national park with over 3 million acres of designated wilderness and hundreds of miles of backcountry roads.";
  sprite3.userData.satelliteImage =
    "/resources/images/landsat/grand-canyon.jpg";
  sprite3.userData.img = "/resources/images/location/death-valley.jpg";
  sprite3.userData.index = 2;

  sprite4.userData.popup = true;
  sprite4.userData.popupTitle = "Grand Canyon";
  sprite4.userData.popupText =
    "Steep cliffs can be seen lining the rim of the Grand Canyon";
  sprite4.userData.satelliteImage =
    "/resources/images/landsat/grand-canyon.jpg";
  sprite4.userData.img = "/resources/images/location/grandCanyon.jpg";
  sprite4.userData.index = 3;

  sprite5.userData.popup = true;
  sprite5.userData.popupTitle = "Colorado River";
  sprite5.userData.popupText =
    "The Colorado River can be seen winding through the Grand Canyon";
  sprite5.userData.satelliteImage =
    "/resources/images/landsat/colorado-river.jpg";
  sprite5.userData.img = "/resources/images/location/colorado-river.jpg";
  sprite5.userData.index = 4;

  sprite6.userData.popup = true;
  sprite6.userData.popupTitle = "Phoenix";
  sprite6.userData.popupText =
    "Mountains in Phoenix overlook the tan neighborhoods";
  sprite6.userData.satelliteImage =
    "/resources/images/landsat/phoenix.jpg";
  sprite6.userData.img = "/resources/images/location/phoenix.jpg";
  sprite6.userData.index = 5;

  sprite7.userData.popup = true;
  sprite7.userData.popupTitle = "Phoenix";
  sprite7.userData.popupText =
    "Phoenix is the capital city of Arizona and is located in the central region of the state.";
  sprite7.userData.satelliteImage =
    "/resources/images/landsat/phoenix.jpg";
  sprite7.userData.img = "/resources/images/location/phoenix2.jpg";
  sprite7.userData.index = 6;

  sprite8.userData.popup = true;
  sprite8.userData.popupTitle = "Tempe";
  sprite8.userData.popupText =
    "Farms look like green and brown rectangles and the mountains look bumpy from above.";
  sprite8.userData.satelliteImage = "/resources/images/landsat/tempe.jpg";
  sprite8.userData.img = "/resources/images/location/tempe.jpg";
  sprite8.userData.index = 7;

  sprite9.userData.popup = true;
  sprite9.userData.popupTitle = "Tuscon";
  sprite9.userData.popupText =
    "Highway 10 cuts through the pattern of streets in Tucson.";
  sprite9.userData.satelliteImage = "/resources/images/landsat/tuscon.jpg";
  sprite9.userData.img = "/resources/images/location/tuscon.jpg";
  sprite9.userData.index = 8;
  // sprite9.userData.newScene = true;
  // sprite9.userData.ping = true;

  sprite10.userData.popup = true;
  sprite10.userData.popupTitle = "Catalina Mountains";
  sprite10.userData.popupText =
    "The Catalina Mountains are covered with oak, pine, and fir trees.";
  sprite10.userData.satelliteImage =
    "/resources/images/landsat/catalina-mountains.jpg";
  sprite10.userData.img =
    "/resources/images/location/catalina-mountains.jpg";
  sprite10.userData.index = 9;

  sprite11.userData.popup = true;
  sprite11.userData.popupTitle = "Sonoran Desert";
  sprite11.userData.popupText =
    "Mountains tower over the landscape of the Sonoran Desert.";
  sprite11.userData.satelliteImage =
    "/resources/images/landsat/sonoran-desert.jpg";
  sprite11.userData.img = "/resources/images/location/sonoran-desert.jpg";
  sprite11.userData.index = 10;

  sprite12.userData.popup = true;
  sprite12.userData.popupTitle = "Roosevelt Lake";
  sprite12.userData.popupText =
    "The dam and bridge on Roosevelt Lake can be seen from space.";
  sprite12.userData.satelliteImage =
    "/resources/images/landsat/roosevelt-lake.jpg";
  sprite12.userData.img = "/resources/images/location/roosevelt-lake.jpg";
  sprite12.userData.index = 11;

  sprite13.userData.popup = true;
  sprite13.userData.popupTitle = "Gila River";
  sprite13.userData.popupText =
    "Farms in the desert are irrigated with water from the Gila River.";
  sprite13.userData.satelliteImage = "/resources/images/landsat/yuma.jpg";
  sprite13.userData.img = "/resources/images/location/yuma.jpg";
  sprite13.userData.index = 12;

  sprite14.userData.popup = true;
  sprite14.userData.popupTitle = "Salt River";
  sprite14.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite14.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite14.userData.img = "/resources/images/location/salt-river.jpg";
  sprite14.userData.index = 13;

  sprite15.userData.popup = true;
  sprite15.userData.popupTitle = "Cathedral Rock";
  sprite15.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite15.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite15.userData.img = "/resources/images/location/cathedralRock.jpg";
  sprite15.userData.index = 14;

  sprite16.userData.popup = true;
  sprite16.userData.popupTitle = "Fatman's Loop";
  sprite16.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite16.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite16.userData.img = "/resources/images/location/fatmansLoop.jpg";
  sprite16.userData.index = 15;

  sprite17.userData.popup = true;
  sprite17.userData.popupTitle = "Horseshoe Bend";
  sprite17.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite17.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite17.userData.img = "/resources/images/location/horseshoeBend.jpg";
  sprite17.userData.index = 16;

  sprite18.userData.popup = true;
  sprite18.userData.popupTitle = "Mica View Trail";
  sprite18.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite18.userData.satelliteImage =
    "/resources/images/landsat/mica-view-trail.jpg";
  sprite18.userData.img = "/resources/images/location/micaViewTrail.jpg";
  sprite18.userData.index = 17;

  sprite19.userData.popup = true;
  sprite19.userData.popupTitle = "Navajo Point";
  sprite19.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite19.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite19.userData.img = "/resources/images/location/navajoPoint.jpg";
  sprite19.userData.index = 18;

  sprite20.userData.popup = true;
  sprite20.userData.popupTitle = "Painted Desert";
  sprite20.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite20.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite20.userData.img = "/resources/images/location/paintedDesert.jpg";
  sprite20.userData.index = 19;

  sprite21.userData.popup = true;
  sprite21.userData.popupTitle = "Peoria";
  sprite21.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite21.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite21.userData.img = "/resources/images/location/peoria.jpg";
  sprite21.userData.index = 20;

  sprite22.userData.popup = true;
  sprite22.userData.popupTitle = "Petrified Forest";
  sprite22.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite22.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite22.userData.img = "/resources/images/location/petrifiedForest.jpg";
  sprite22.userData.index = 21;

  sprite23.userData.popup = true;
  sprite23.userData.popupTitle = "Petrified Forest 2";
  sprite23.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite23.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite23.userData.img = "/resources/images/location/salt-river.jpg";
  sprite23.userData.index = 22;

  sprite24.userData.popup = true;
  sprite24.userData.popupTitle = "Pinal County";
  sprite24.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite24.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite24.userData.img = "/resources/images/location/pinalCounty.jpg";
  sprite24.userData.index = 23;

  sprite25.userData.popup = true;
  sprite25.userData.popupTitle = "Saguaro Nat Park";
  sprite25.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite25.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite25.userData.img = "/resources/images/location/saguaroNatPark.jpg";
  sprite25.userData.index = 24;

  sprite26.userData.popup = true;
  sprite26.userData.popupTitle = "San Simon Rest Area";
  sprite26.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite26.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite26.userData.img = "/resources/images/location/sanSimonRestArea.jpg";
  sprite26.userData.index = 25;

  sprite27.userData.popup = true;
  sprite27.userData.popupTitle = "Scaddan Wash";
  sprite27.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite27.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite27.userData.img = "/resources/images/location/scaddanWash.jpg";
  sprite27.userData.index = 26;

  sprite28.userData.popup = true;
  sprite28.userData.popupTitle = "Tanque Verde";
  sprite28.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite28.userData.satelliteImage =
    "/resources/images/landsat/tanque-verde.jpg";
  sprite28.userData.img = "/resources/images/location/tanqueVerde.jpg";
  sprite28.userData.index = 27;

  sprite29.userData.popup = true;
  sprite29.userData.popupTitle = "Wymola";
  sprite29.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite29.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite29.userData.img = "/resources/images/location/wymola.jpg";
  sprite29.userData.index = 28;
}

//** TOWER ICON INSTANTIATIONS */
function towerSpriteSetup() {
  //lessonSceneRaycast.add(towerIcon);

  for(var i = 0; i < towerIcons.length; i++)
  {
    towerIcons[i].userData.name = "locationUI";
    towerIcons[i].userData.tower = true;
    towerIcons[i].userData.scaling = false;
    towerIcons[i].userData.newScene = true;
    towerIcons[i].userData.ping = false;
    towerIcons[i].scale.set(minSpriteSize, minSpriteSize, minSpriteSize);
    lessonSceneRaycast.add(towerIcons[i]);
    towerIcons[i].position.set(Math.random(0, 50), uiMinheight, Math.random(0, 50));
  }

  towerIcon.position.set(3, uiMinheight, 2);
  towerIcon2.position.set(-2.88, uiMinheight, 2.96);
  towerIcon3.position.set(-0.5, uiMinheight, -2.67);
  towerIcon4.position.set(3.83, uiMinheight, -3.53);
  towerIcon5.position.set(-2.23, uiMinheight, 0.12);
}

//** SETUP FOR LESSON SEQUENCES */
function lessonSequenceSetup()
{
  lesson1Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
   "",
    "https://www.youtube.com/embed/DGE-N8_LQBo?enablejsapi=1&rel=0",
     "done"];
  
  lesson2Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
  "This is some text that would go here",
  "https://www.youtube.com/embed/DGE-N8_LQBo",
    "done"];

  lesson3Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
  "This is some text that would go here",
    "https://www.youtube.com/embed/DGE-N8_LQBo",
    "done"];
   
  lesson4Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
  "This is some text that would go here",
  "https://www.youtube.com/embed/DGE-N8_LQBo",
    "done"];
  
  lessonSequences = [lesson1Sequence, lesson2Sequence, lesson3Sequence, lesson4Sequence];

  //console.log("Lesson Sequences " + lessonSequences[0][0]);
}

//** INITIALIZES ANIMATED SPRITE  */
function makeEchoPing(x, z) {
  //****PING LOCATION SPRITE */
  var pingLocationTexture = new THREE.TextureLoader().load(
    "/resources/sprites/LocationPing-sheet-4x7.png"
  );
  var pingLocationSprite = new TextureAnimator(
    pingLocationTexture,
    4,
    7,
    28,
    70
  );
  const pingLocationMaterial = new THREE.MeshBasicMaterial({
    map: pingLocationTexture,
    transparent: true,
    opacity: 1,
  });
  let pingLocationGeometry = new THREE.PlaneGeometry(10, 10);
  let pingLocationMesh = new THREE.Mesh(
    pingLocationGeometry,
    pingLocationMaterial
  );
  //pingLocationMesh.position.set(Math.random(2), uiMinheight - (uiMinheight/10), Math.random(2));
  pingLocationMesh.position.set(x, uiMinheight - uiMinheight / 10, z);
  pingLocationMesh.scale.set(0.1, 0.1, 0.1);
  pingLocationMesh.rotation.x = Math.PI / -2;
  pingLocationMesh.userData.name = "ping";
  mapScene.add(pingLocationMesh);

  //const elem = locationNameElem;
  //elem.textContent = "ECHO SPOTTED!";
  //labelContainerElem.appendChild(elem);

  return { pingLocationMesh, elem };
}

//** CREATES ECHO's DOTTED LINE PATH, setups up entire path with all positions */
function makeEchoLinePath(intersectPoint) {
  points = [];
  points.push(new THREE.Vector3(10, 0.1, 1));
  points.push(new THREE.Vector3(sceneTransitionSprites[0].position.x, 0.1, sceneTransitionSprites[0].position.z));
  points.push(new THREE.Vector3(sceneTransitionSprites[1].position.x, 0.1, sceneTransitionSprites[1].position.z));
  points.push(new THREE.Vector3(sceneTransitionSprites[2].position.x, 0.1, sceneTransitionSprites[2].position.z));
  points.push(new THREE.Vector3(sceneTransitionSprites[3].position.x, 0.1, sceneTransitionSprites[3].position.x));
  points.push(new THREE.Vector3(-3, 0.1, 1));

  // points.push(new THREE.Vector3(0, 0.1, 0));
  // points.push(new THREE.Vector3(-1, 0.1, -2));
  // points.push(new THREE.Vector3(-1, 0.1, 1));
  // points.push(new THREE.Vector3(-2, 0.1, 1.5));
  // points.push(new THREE.Vector3(-3, 0.1, 1));

  sceneTransitionSprites

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineDashedMaterial({
    color: "white",
    linewidth: 1,
    scale: 20,
    dashSize: 0.5,
    gapSize: 1,
  });

  line = new THREE.Line(geometry, lineMaterial);
  mapScene.add(line);
  line.computeLineDistances();

  line.geometry.setDrawRange(0, 1);
}

//** USED TO UPDATE ECHO's DOTTED LINE PATH, when called will show the next index of the path */
function updateLinePath() {
  if (points.length > pathIndex) {
    pathIndex++;
    console.log("path index: " + pathIndex);
    line.geometry.setDrawRange(0, pathIndex);
  }
}

//** Updates the Lesson Scenes objects after lesson is complete*/
function updateLessonScene()
{
  if(currentLessonSceneIndex == 1)
  {
    console.log("UPDATE SCENE");
    lessonScene.remove(cave);
    lessonScene.add(grandCanyonModel);
    //lessonCamera.setFocalLength(10);
    lessonScene.fog.color.set("#FFFFFF");
    lessonScene.fog.far = 25;
    
    
    outlineBug.rotation.set(0, -5.48, 0);
    outlineBug.position.set(0.534, -1.325, 0.246);
    outlineBug.scale.set(.125, .125, .125);
    outlineBug.children[0].children[0].material.map = bugTexture_yellow;
    outlineBug.children[0].children[0].material.map.flipY = false;
    outlineBug.children[0].children[0].material.map.needsUpdate = true;
    // lightTween.stop();
    // lightTween2.stop();

    // pointLight.intensity = 0;
    // pointLight.intensity = 0;

  }
  else if (currentLessonSceneIndex == 2)
  {
    console.log("UPDATE SCENE");
    lessonScene.remove(grandCanyonModel);
    lessonScene.add(phoenixModel);
    //lessonCamera.setFocalLength(10);

    lessonScene.fog.near = 0.1;
    lessonScene.fog.far = 0;
    
    outlineBug.rotation.set(0, -5.48, 0);
    outlineBug.position.set(0.534, -1.325, 0.246);
    outlineBug.scale.set(.125, .125, .125);
    outlineBug.children[0].children[0].material.map = bugTexture_blue;
    outlineBug.children[0].children[0].material.map.flipY = false;
    outlineBug.children[0].children[0].material.map.needsUpdate = true;
  }

  //** RESET LESSON SCREEN UI */
  if(lessonDoneBtn.classList.contains("active"))
  {
    console.log("DONE BUTTON WAS ACTIVE");
    lessonDoneBtn.classList.toggle("active");
  }
  if(document.getElementById("youtube-player").classList.contains("disabled"))
  {
    console.log("YOUTUBE WAS DISABLED!");
    document.getElementById("youtube-player").classList.toggle("disabled");
  }
}

//** SETS UP CONTROLS FOR THE CAMERA CONTROLLER */
function makeCameraControls() {
  controls.enableDamping = true;
  controls.dampingFactor = 0.01;
  controls.screenSpacePanning = false;

  //controls.autoRotate = true;
  //controls.autoRotateSpeed = 0.25;
  controls.enableZoom = true;
  controls.enableRotate = false;
  controls.zoomSpeed = 0.5;
  controls.zoom0 = 1;
  controls.minDistance = 1.5;
  controls.maxDistance = 2.5;
  //controls.maxDistance = 2.5;

  controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);

  //controls.maxPolarAngle = Math.PI / 8;
  // var minPan = new THREE.Vector3( - 1, - 1, - 1 );
  // var maxPan = new THREE.Vector3( 1, 1, 1);

  // controls.target.clamp(minPan, maxPan);
  //camera.rotation.set(0, 0, Math.PI / 8)
  //controls.maxPolarAngle = 0;
}

//** GETS THE MOUSE POSITION WHEN MOVING, factors for screen resizing */
function onMouseMove(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //console.log(mouse);
}

//Function looks at a THREE.GROUP() and its children to set its
function hoverObject() {
  var intersects;

  //** MAP SCENE */
  if (currentSceneNumber == 1) {
    raycaster.setFromCamera(mouse, mainCamera);
    intersects = raycaster.intersectObjects(lessonSceneRaycast.children);

    //*****CHECK FOR LOCATION UI
    if (intersects.length > 0 && intersects[0].object.userData.name == "locationUI") {
      if (intersects[0].object != intersectObject) 
      {
        intersectObject = intersects[0].object;
        intersected = true;
        intersectObject.userData.scaling = true;

        iconScalingTween(intersects[0].object, true);

        console.log("On Object");
        console.log("name: " + intersects[0].object.userData.locName);
        console.log("spriteIndex: " + intersects[0].object.userData.index);

        // if(!labelSprites[intersects[0].object.userData.index].userData.hover)
        // {
        //   //labelSprites[intersects[0].object.userData.index].material.opacity = 0.0;
        //   labelSprites[intersects[0].object.userData.index].material.opacity = 0.0;
        // }

        try {
          textFadeTween(
            labelSprites[intersects[0].object.userData.index],
            true
          );
          //labelSprites[intersectObject.userData.index].material.opacity = 1.0;
          console.log(labelSprites[intersects[0].object.userData.index]);
        } catch (e) {}

        uiHoverOnSound.play();
        //document.getElementById("title").innerHTML = intersects[0].object.userData.locName;
        
        //** IF IT IS THE TUTORIAL, HOVER WILL ACTIVE INDEX */
        if(tutorial)
        {
          if(!intersects[0].object.userData.tower && tutorialIndex == 2)
          {
            tutorialSequence();
          }
          if(intersects[0].object.userData.tower && tutorialIndex == 3)
          {
            tutorialSequence();
          }
        }
      } 
      else 
      {
        //console.log('same object');
      }
    } 
    else 
    {
      if (intersected) 
      {
        console.log("Off Object");
        console.log("name: " + intersectObject.userData.name);
        console.log("index: " + intersectObject.userData.index);

        try 
        {
          //labelSprites[intersectObject.userData.index].material.opacity = 0.0;
          textFadeTween(labelSprites[intersectObject.userData.index], false);
          console.log("CHANGED OFF");
        } catch (e) {}

        uiHoverOffSound.play();
        // document.getElementById("title").innerHTML = "ECHO";
        intersectObject.userData.scaling = false;
        intersected = false;
        iconScalingTween(intersectObject, false);
        intersectObject = null;
      }
    }
  }
  //** LESSON SCENE */
  else if (currentSceneNumber == 2) 
  {
    raycaster.setFromCamera(mouse, lessonCamera);
    intersects = raycaster.intersectObjects(outlineBug.children[0].children);
    //console.log(intersects);
    //*****CHECK FOR LOCATION UI
    if (intersects.length > 0 && intersects[0].object.userData.name == "bug") 
    {
      if (intersects[0].object != intersectObject) 
      {
        intersectObject = intersects[0].object;
        intersected = true;
        intersectObject.material.opacity = 0.5;
        intersectObject.material.side = THREE.FrontSide;

        //iconScalingTween(intersects[0].object, true);

        console.log("On Object");
      } 
      else 
      {
        //console.log('same object');
      }
    } 
    else 
    {
      if (intersected) 
      {
        console.log("Off Object");
        intersectObject.userData.scaling = false;
        intersected = false;
        intersectObject.material.opacity = 1;
        //iconScalingTween(intersectObject, false);
        intersectObject = null;
      }
    }
  }

  //console.log(intersects[0].object.userData.name);
}

//Opens the 'popup' class in html and dispalys the content based on the object it clicked
function togglePopup() {
  if (!togglePopupOpen) {
    if (intersectObject.userData.popupTitle) {
      //ICON POPUP
      document.getElementById("popup-1").classList.toggle("active");
      document.getElementById("header").innerHTML =
        intersectObject.userData.popupTitle;
      document.getElementById("text").innerHTML =
        intersectObject.userData.popupText;
      //loads img url from the popups user data
      document.getElementById("image1").style.backgroundImage =
        "url('" + intersectObject.userData.satelliteImage + "')";
      document.getElementById("image2").style.backgroundImage =
        "url('" + intersectObject.userData.img + "')";

      controls.enabled = false;
      togglePopupOpen = true;
    } else {
      console.log("Popup does not have a title!");
    }
  } else {
    document.getElementById("popup-1").classList.toggle("active");
    controls.enabled = true;
    togglePopupOpen = false;
  }
}

//Opens the 'popup' class in html and dispalys the content based on the object it clicked
function toggleTowerPopup() {
  if (!toggleTowerPopupOpen) {
    //ICON POPUP
    document.getElementById("iconPopup-1").classList.toggle("active");

    //document.getElementById("popup-1").classList.toggle("active");
    // document.getElementById("header").innerHTML = intersectObject.userData.popupTitle;
    //document.getElementById("text").innerHTML = intersectObject.userData.popupText;
    controls.enabled = false;
    toggleTowerPopupOpen = true;
    console.log("TOWER POPUP ON");
  } else {
    document.getElementById("iconPopup-1").classList.toggle("active");
    controls.enabled = true;
    toggleTowerPopupOpen = false;
    console.log("TOWER POPUP OFF");
  }
}

function toggleLessonPopup() {
  if (!toggleLessonPopupOpen) {
    //ICON POPUP
    document.getElementById("lessonContainer").classList.toggle("active");

    //document.getElementById("popup-1").classList.toggle("active");
    // document.getElementById("header").innerHTML = intersectObject.userData.popupTitle;
    //document.getElementById("text").innerHTML = intersectObject.userData.popupText;
    controls.enabled = false;
    toggleLessonPopupOpen = true;
    togglePopupOpen = true;
    console.log("LESSON POPUP ON");
    //startLesson();

  } else {
    document.getElementById("lessonContainer").classList.toggle("active");
    controls.enabled = true;
    toggleLessonPopupOpen = false;
    togglePopupOpen = false;
    console.log("LESSON POPUP OFF");
  }
}

function clickEvent() {
  var intersects;

  if(!tutorial)
  {
    if (currentSceneNumber == 1) 
    {
      if (cameraMoving) 
      {
        cameraMoving = false;
        controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
      }
  
      raycaster.setFromCamera(mouse, mainCamera);
      intersects = raycaster.intersectObjects(lessonSceneRaycast.children);
      
      if(intersects[0])
      {
        intersectObject = intersects[0].object;
        //** IF PING IS CLICKED */
        if (intersects[0].object.userData.name == "ping") {
        }
        //** ELSE IF LOCATION UI IS CLICKED */
        else if (intersects[0].object.userData.name == "locationUI") {
          if (intersects[0].object.userData.popup) {
            togglePopup(intersects[0].object);
          } else if (intersects[0].object.userData.newScene) {
            //ZOOM TRANSITION
          }
          if (intersects[0].object.userData.tower) {
            console.log("CLICK TOWER");
    
            if (typeof echoPingLocation == "undefined") {
              //echoPingLocation = makeEchoPing();
              //console.log("MAKE PING!");
              cameraTweenTo(intersects, false);
            } else {
              cameraTweenTo(intersects, false);
            }
    
            toggleTowerPopup(intersects[0].object);
            removePing();
          } else if (intersects[0].object.userData.ping) {
            clickPingLocation(intersects);
            cameraTweenTo(intersects, false, 0.1, true);
            //intersects[0].object.userData.ping = false;
          } else {
            clickOpenURL(intersects);
            cameraTweenTo(intersects, true);
          }
    
          clickSound.play();
        }
      }
  
      console.log(intersects[0]);
    } 
    else if (currentSceneNumber == 2) 
    {
      raycaster.setFromCamera(mouse, lessonCamera);
      
      //SEARCH ONLY IN THE BUG MODEL TO GET RAYCAST
      intersects = raycaster.intersectObjects(outlineBug.children[0].children);
      
      if (intersects[0])
      {
        intersectObject = intersects[0].object;
        console.log(intersectObject);

        console.log(intersects[0]);
    
        //** CLICK BUG FUNCTIONALITY */
        if (intersectObject.userData.name == "bug") 
        {
          bugAmount++;
          console.log("BUG: " + bugAmount);
          //lessonScene.remove(intersects[0].object);
    
          toggleLessonPopup();
        } 
        else if (intersectObject.name == "left_Button" || intersectObject.name == "right_Button") 
        {
          if (!intersectObject.userData.tweening) 
          {
            console.log(intersectObject.name);
    
            //** USED FOR BUTTON CLICK */
            var buttonTween = new TWEEN.Tween(intersectObject.position)
              .to(
                {
                  x: intersectObject.position.x - 0.1,
                  y: intersectObject.position.y,
                  z: intersectObject.position.z,
                },
                100
              )
              .onComplete((intersectObject.userData.tweening = false))
              .yoyo(true)
              .repeat(1);
            buttonTween.easing(TWEEN.Easing.Quadratic.Out);
            buttonTween.onUpdate(() => {
              //intersectObject.position.set(mainCamera.rotation);
            });
            buttonTween.start();
    
            intersectObject.userData.tweening = true;
    
            if (intersectObject.name == "left_Button") {
            } 
            else if (intersectObject.name == "right_Button") {
            }
          }
        }
      }
      console.log(intersects[0]);
    }
  }
  else
  {
    if(tutorialIndex == 0)
    {
      tutorialSequence();
    }
    else if(tutorialIndex == 1)
    {
      tutorialSequence();
    }
    if(tutorialIndex == 3)
    {
      //tutorialSequence();
    }
  }
}

function doubleClickEvent() {
  raycaster.setFromCamera(mouse, mainCamera);
  const intersects = raycaster.intersectObjects(mapScene.children);
  cameraPos = intersects[0].point;

  //updateLinePath();
}

function clickOpenURL(intersects) {
  //*****CHECK FOR LOCATION UI
  if (
    intersects.length > 0 &&
    intersects[0].object.userData.name == "locationUI"
  ) {
    //If it has a URL open in another window
    if (intersects[0].object.userData.url) {
      //window.open(intersects[0].object.userData.url,'_blank');
      console.log(
        "Opening: " + intersects[0].object.userData.url + " in a new tab"
      );
    } else {
      console.log("UI does not have a link");
    }

    console.log("Clicked: " + intersects[0].object.userData.name);
    cameraPos = intersects[0].object.position;
    cameraMoving = true;
  }
}

function clickPingLocation(intersects) {
  if (intersects.length > 0 && intersects[0].object.userData.ping) {
    console.log("Click Ping");
    cameraPos = intersects[0].object.position;
    cameraMoving = true;

    var camTween = new TWEEN.Tween(mainCamera.position)
      .to(
        {
          x: cameraPos.x,
          y: 1,
          z: cameraPos.z,
        },
        1000
      )
      .onComplete(tweenComplete);
    //.delay (1000)
    camTween.easing(TWEEN.Easing.Quadratic.Out);
    camTween.onUpdate(() => {
      mainCamera.rotation.set(mainCamera.rotation);
      //console.log(camera.position);
      isTweening = true;
      controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
    });
    camTween.start();

    //camera.controls.update();
    //controls.target = intersects[0].point;

    removePing();
  }
}

function tweenComplete() {
  isTweening = false;
}

function removePing() {
  if (typeof echoPingLocation != "undefined") {
    //echoPingLocation.pingLocationMesh.visible = false;
    echoPingLocation.elem.textContent = "";

    //echoPingLocation.pingLocationMesh.position.set(Math.random(5), .5, Math.random(5));
    console.log("Ping Removed");
    mapScene.remove(echoPingLocation.pingLocationMesh);
    echoPingLocation = undefined;
    //echoPingLocation = makeEchoPing();
  }
}

function cameraTweenTo(intersects, camPos, yPos, transition, center) {
  cameraMoving = true;

  if (camPos) {
    yPos = mainCamera.position.y;
  }

  //USED TO MOVE CAMERA DEPENDING ON IF IT IS A TRANSITION OR NOT
  if (typeof intersects != "undefined") {
    cameraPos = intersects[0].object.position;

    if (!transition) {
      var camTween = new TWEEN.Tween(mainCamera.position).to(
        {
          x: cameraPos.x,
          y: yPos,
          z: cameraPos.z,
        },
        2000
      );
      //.delay (1000)
      camTween.easing(TWEEN.Easing.Quadratic.InOut);
      camTween.onUpdate(() => {
        mainCamera.rotation.set(mainCamera.rotation);
        controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
      });
      camTween.start();
    } else {
      var camTween = new TWEEN.Tween(mainCamera.position)
        .to(
          {
            x: cameraPos.x,
            y: yPos,
            z: cameraPos.z,
          },
          2000
        )
        .onComplete(pingLocationReached);
      //.delay (1000)
      camTween.easing(TWEEN.Easing.Quadratic.InOut);
      camTween.onUpdate(() => {
        mainCamera.rotation.set(mainCamera.rotation);
        controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
      });
      camTween.start();
    }
  }
  //USED to Zoom The camera Back out
  else {
    console.log("INTERSECTS IS NULL");
    cameraPos = mainCamera.position;

    if (!center) {
      var camTween = new TWEEN.Tween(mainCamera.position).to(
        {
          x: cameraPos.x,
          y: yPos,
          z: cameraPos.z,
        },
        2000
      );
      //.delay (1000)
      camTween.easing(TWEEN.Easing.Quadratic.InOut);
      camTween.onUpdate(() => {
        mainCamera.rotation.set(mainCamera.rotation);
        controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
      });
      camTween.start();
    } else {
      var camTween = new TWEEN.Tween(mainCamera.position).to(
        {
          x: 0,
          y: yPos,
          z: 0,
        },
        2000
      );
      //.delay (1000)
      camTween.easing(TWEEN.Easing.Quadratic.InOut);
      camTween.onUpdate(() => {
        mainCamera.rotation.set(mainCamera.rotation);
        controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
      });
      camTween.start();
    }
  }
}

function iconScalingTween(obj, scaleUp) {
  let finalScale;
  console.log(obj);

  if (scaleUp) {
    finalScale = new THREE.Vector3(maxSpriteSize, maxSpriteSize, maxSpriteSize);
  } else {
    finalScale = new THREE.Vector3(minSpriteSize, minSpriteSize, minSpriteSize);
  }

  var iconTween = new TWEEN.Tween(obj.scale).to(
    {
      x: finalScale.x,
      y: finalScale.y,
      z: finalScale.z,
    },
    200
  );
  //.delay (1000)
  iconTween.easing(TWEEN.Easing.Quadratic.InOut);
  iconTween.onUpdate(() => {});
  iconTween.start();
}

function textFadeTween(obj, fadeIn) {
  let finalOpacity;
  console.log(obj);

  if (fadeIn) {
    finalOpacity = 1.0;
    console.log("FADE IN TEXT!");
  } else {
    finalOpacity = 0.0;
    console.log("FADE OUT TEXT!");
  }

  var fadeTween = new TWEEN.Tween(obj.material).to(
    {
      opacity: finalOpacity,
    },
    200
  );
  //.delay (1000)
  fadeTween.easing(TWEEN.Easing.Quadratic.InOut);
  fadeTween.onUpdate(() => {});
  fadeTween.start();
}

//** USED WHEN THE LESSON IS DONE TO CHANGE WHICH POPUP LEADS TO THE NEXT LESSON */
function lessonComplete()
{
  sceneTransitionSprites[currentLessonSceneIndex].userData.ping = false;
  sceneTransitionSprites[currentLessonSceneIndex].userData.popup = true;
  currentLessonSceneIndex++
  console.log("Lesson Scene Index: " + currentLessonSceneIndex);

  if(currentLessonSceneIndex == 1)
  {
    sceneTransitionSprites[currentLessonSceneIndex].userData.ping = true;
    sceneTransitionSprites[currentLessonSceneIndex].userData.popup = false;
    document.getElementById("towerMessage").innerHTML = "May or may not be the grand canyon";
    echoPingLocation = makeEchoPing(towerIcons[currentLessonSceneIndex].position.x, towerIcons[currentLessonSceneIndex].position.z);
    bugIcon.classList.toggle("filled");
  }
  else if(currentLessonSceneIndex == 2)
  {
    sceneTransitionSprites[currentLessonSceneIndex].userData.ping = true;
    sceneTransitionSprites[currentLessonSceneIndex].userData.popup = false;
    document.getElementById("towerMessage").innerHTML = "May or may not be Phoenix";
    echoPingLocation = makeEchoPing(towerIcons[currentLessonSceneIndex].position.x, towerIcons[currentLessonSceneIndex].position.z);
    bugIcon2.classList.toggle("filled");
  }
  else if(currentLessonSceneIndex == 3)
  {
    sceneTransitionSprites[currentLessonSceneIndex].userData.ping = true;
    sceneTransitionSprites[currentLessonSceneIndex].userData.popup = false;
    document.getElementById("towerMessage").innerHTML = "May or may not be Tempe";
    echoPingLocation = makeEchoPing(towerIcons[currentLessonSceneIndex].position.x, towerIcons[currentLessonSceneIndex].position.z);
    bugIcon3.classList.toggle("filled");
  }
}

//** SETS UP LESSON SLIDES DEPENDING ON WHICH SCENE YOU ARE IN */
function startLesson()
{
  currentLessonIndex = 0;

  //** LESSON 1 */
  if(currentSceneNumber == 2)
  {
    
    console.log("LESSON SEQUENCE: " + lessonSequences[0][0]);
    //youtubePlayer.src = lessonSequences[0][0];
  }
  //** LESSON 2 */
  else if(currentSceneNumber == 3)
  {

  }
  //** LESSON 3 */
  else if(currentSceneNumber == 4)
  {

  }
  //** LESSON 4 */
  else if(currentSceneNumber == 5)
  {

  }

  document.getElementById("slideNumb").innerHTML = (currentLessonIndex+1) + "/" +  lessonSequences[0].length;
}

//** USED TO GO NAVIGATE BETWEEN SLIDES */
function navigateLesson(forward)
{
  //Forward Navigation
  if(forward)
  {
    //** LESSON 1 */
    if(currentSceneNumber == 2)
    {

      //** Make sure its not the end of the lesson */
      if(lessonSequences[currentLessonSceneIndex].length - 1 > currentLessonIndex)
      {
        currentLessonIndex++;
        document.getElementById("slideNumb").innerHTML = (currentLessonIndex+1) + "/" +  lessonSequences[currentLessonSceneIndex].length;
        var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
        iframe.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");

        console.log("Is it disabled?: " + document.getElementById("youtube-player").classList.contains("disabled"));

        console.log("LESSON SEQUENCE: " + lessonSequences[currentLessonSceneIndex][currentLessonIndex]);

        //** IF THE CURRENT INDEX IS A YOUTUBE LINK */
        if(lessonSequences[currentLessonSceneIndex][currentLessonIndex].startsWith("https"))
        {
          //** IF YOUTUBE VIDEO IS DISABLED RENABLE IT */
          if(document.getElementById("youtube-player").classList.contains("disabled"))
          {
            document.getElementById("youtube-player").classList.toggle("disabled");
          }
          else
          {
            
          }
          if(lesson1Container.classList.contains("active"))
          {
            lesson1Container.classList.toggle("active");
          }
          
          youtubePlayer.src = lessonSequences[currentLessonSceneIndex][currentLessonIndex];
        }

        else if(lessonSequences[currentLessonSceneIndex][currentLessonIndex] == "done")
        {
          document.getElementById("youtube-player").classList.toggle("disabled");

          if(!lessonDoneBtn.classList.contains("active"))
          {
            lessonDoneBtn.classList.toggle("active");
          }

          console.log("DONE");
        }

        //** IF THE CURRENT INDEX IS NOT A YOUTUBE LINK */
        else
        {
          console.log("Is it disabled?: " + document.getElementById("youtube-player").classList.contains("disabled"));
          document.getElementById("youtube-player").classList.toggle("disabled");

          //document.getElementById("lessonTextContent").innerHTML = lessonSequences[0][currentLessonIndex];
          
          //** SPECIFIC SLIDE VALUES */
          if(currentLessonIndex == 1)
          {
            lesson1Container.classList.toggle("active");
            //document.getElementById("lessonTextContent").style.fontSize = "100%";
          }
          else if(currentLessonIndex == 3)
          {
          }
        }
      }
      //** AT THE END OF THE LESSON */
      else
      {
      }
    }
  }
  //Backward Navigation
  else
  {
    //** LESSON 1 */
    if(currentSceneNumber == 2)
    {
     
      if(lessonSequences[currentLessonSceneIndex].length >= currentLessonIndex && currentLessonIndex > 0)
      {
        currentLessonIndex--;
        document.getElementById("slideNumb").innerHTML = (currentLessonIndex+1) + "/" +  lessonSequences[currentLessonSceneIndex].length;
        var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
        iframe.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");

        console.log("Is it disabled?: " + document.getElementById("youtube-player").classList.contains("disabled"));

        console.log("LESSON SEQUENCE: " + lessonSequences[currentLessonSceneIndex][currentLessonIndex]);

        //** IF THE CURRENT INDEX IS A YOUTUBE LINK */
        if(lessonSequences[currentLessonSceneIndex][currentLessonIndex].startsWith("https"))
        {
          //** IF YOUTUBE VIDEO IS DISABLED RENABLE IT */
          if(document.getElementById("youtube-player").classList.contains("disabled"))
          {
            document.getElementById("youtube-player").classList.toggle("disabled");
          }
          else
          {
            
          }
          
          if(lesson1Container.classList.contains("active"))
          {
            lesson1Container.classList.toggle("active");
          }

          youtubePlayer.src = lessonSequences[currentLessonSceneIndex][currentLessonIndex];
        }

        else if(lessonSequences[currentLessonSceneIndex][currentLessonIndex] == "done")
        {
          document.getElementById("youtube-player").classList.toggle("disabled");
          
          if(!lessonDoneBtn.classList.contains("active"))
          {
            lessonDoneBtn.classList.toggle("active");
          }

          console.log("DONE");
        }

        //** IF THE CURRENT INDEX IS NOT A YOUTUBE LINK */
        else
        {
          console.log("Is it disabled?: " + document.getElementById("youtube-player").classList.contains("disabled"));
          document.getElementById("youtube-player").classList.toggle("disabled");

          //document.getElementById("lessonTextContent").innerHTML = lessonSequences[0][currentLessonIndex];
          
          //** SPECIFIC SLIDE VALUES */
          if(currentLessonIndex == 1)
          {
            console.log("BACK!! CONTAINER");
            lesson1Container.classList.toggle("active");
            //document.getElementById("lessonTextContent").style.fontSize = "100%";
          }
          else if(currentLessonIndex == 3)
          {
            //document.getElementById("lessonTextContent").style.fontSize = "90%";
          }
        }
      }
      //** AT THE END OF THE LESSON */
      else
      {
      }
    }
  }
}

//*** LERP For scaling the map Icons, based on their userdata 'scaling' */
function lerpMapIconScaling() {
  for (let i = 0; i < mapImages.length; i++) {
    if (mapImages[i].userData.scaling) {
      mapImages[i].scale.lerp(new THREE.Vector3(0.5, 0.5, 0.5), 0.1);
    } else {
      mapImages[i].scale.lerp(new THREE.Vector3(0.3, 0.3, 0.3), 0.1);
    }
  }
}

//Lerps the Cameras position based on its current movement state
function lerpCameraMovement(intersectPoint) {
  if (cameraMoving) {
    if (intersectPoint != focusCube.position) {
      focusCube.position.lerpVectors(
        new THREE.Vector3(mainCamera.position.x, 0, mainCamera.position.z),
        new THREE.Vector3(cameraPos.x, 0, cameraPos.z),
        0.05
      );

      // var cubeTWEEN = new TWEEN.Tween({x: camera.position.x, y: 0, z: camera.position.z})
      // .to({
      //     x: cameraPos.x,
      //     y: cameraPos.y,
      //     z: cameraPos.z
      // }, 5000)
      // //.delay (1000)
      // cubeTWEEN.easing(TWEEN.Easing.Quadratic.InOut)
      // //.onUpdate(() => render())
      // cubeTWEEN.start()

      // focusCube.position.set(cubeTWEEN);

      mainCamera.position.set(
        focusCube.position.x,
        mainCamera.position.y,
        focusCube.position.z
      );
      mainCamera.rotation.set(mainCamera.rotation);
      controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
      //console.log("LERPING");
    }
  }
}

function htmlTrack3d() {
  if (currentScene != 0) {
    return;
  }

  if (typeof echoPingLocation != "undefined") {
    //Create a popup object at echoLocation
    echoPingLocation.pingLocationMesh.updateWorldMatrix(true, false);
    echoPingLocation.pingLocationMesh.getWorldPosition(pingWrldPosTemp);
    pingWrldPosTemp.project(mainCamera);

    const x = (pingWrldPosTemp.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (pingWrldPosTemp.y * -0.5 + 0.5) * canvas.clientHeight;

    echoPingLocation.elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
  }

  for (var i = 0; i < uiLocationSprites.length; i++) {}
}

function createCityLabels() {
  const positionHelper = new THREE.Object3D();
  positionHelper.position.z = 1;
  const labelParentElem = document.querySelector("#labels");

  for (var i = 0; i < uiLocationSprites.length; i++) {
    positionHelper.updateWorldMatrix(true, false);
    const position = new THREE.Vector3();
    positionHelper.getWorldPosition(position);
    position = uiLocationSprites[i].position;

    const elem = document.createElement("div");
    elem.textContent = "name";
    labelParentElem.appendChild(elem);
    countryInfo.elem = elem;
  }
}

function TextureAnimator(texture, tilesHoriz, tilesVert, tileDispDuration) {
  let obj = {};

  obj.texture = texture;
  obj.tilesHorizontal = tilesHoriz;
  obj.tilesVertical = tilesVert;
  obj.tileDisplayDuration = tileDispDuration;

  obj.numberOfTiles = tilesHoriz * tilesVert;

  obj.texture.wrapS = THREE.RepeatWrapping;
  obj.texture.wrapT = THREE.RepeatWrapping;
  obj.texture.repeat.set(1 / tilesHoriz, 1 / tilesVert);
  obj.currentTile = 0;

  obj.nextFrame = function () {
    obj.currentTile++;
    if (obj.currentTile == obj.numberOfTiles) obj.currentTile = 0;

    let currentColumn = obj.currentTile % obj.tilesHorizontal;
    obj.texture.offset.x = currentColumn / obj.tilesHorizontal;

    let currentRow = Math.floor(obj.currentTile / obj.tilesHorizontal);
    obj.texture.offset.y = obj.tilesVertical - currentRow / obj.tilesVertical;
  };

  obj.start = function () {
    obj.intervalID = setInterval(obj.nextFrame, obj.tileDisplayDuration);
  };

  obj.stop = function () {
    clearInterval(obj.intervalID);
  };

  obj.start();
  return obj;
}

function renderTransition() {
  let clockdelta;

  transition.render(clock.getDelta());

  // new TWEEN.Tween( clockdelta )
  //   .to( { transition: 1 }, 5000 )
  //   //.repeat( Infinity )
  //   // .delay( 2000 )
  //   //.yoyo( true )
  //   .start()
  //   .onComplete(console("LERP DONE"));
}

function lessonCameraMove() {
  lessonCamera.rotation.y = THREE.MathUtils.lerp(
    lessonCamera.rotation.y,
    (-mouse.x * Math.PI) / 20 + Math.PI / 2,
    0.1
  );
  lessonCamera.rotation.z = THREE.MathUtils.lerp(
    lessonCamera.rotation.x,
    (-mouse.y * Math.PI) / 20,
    0.1
  );
}
//** ANIMATION LOOP, ADD THINGS THAT MOVE HERE */
function animate() {
  if (gameStarted == false) {
    requestAnimationFrame(animate);

    renderer.render(loadingScreen.scene, loadingScreen.camera);
    return;
  }

  requestAnimationFrame(animate);
  hoverObject();
  //htmlTrack3d();
  lessonCameraMove();

  //console.log("TRANSITIONING: " + transitioning);
  //console.log("Current Lesson SCENE Index: " + currentLessonSceneIndex);
  //console.log("CURRENT LESSON INDEX: " + currentLessonIndex);

  TWEEN.update();
  controls.update();

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  //labelRenderer.render( mapScene, mainCamera );

  if (!transitioning) {
    renderer.render(currentScene, currentCamera);
  } else {
    renderTransition();
  }

  //** LIMITS THE CAMERA FROM GOING OUT OF THE BOUNDS */
  // mainCamera.position.clamp(minPan, maxPan);
  // controls.target.set(mainCamera.position.x,0, mainCamera.position.z);

  //console.log("Cam Position: x:" + mainCamera.position.x + " z:" + mainCamera.position.z);
}

function TransitionStart() {
  console.log("TRANSITION HAS STARTED");
  transitioning = true;
  transitionSound.play();
  //controls.enabled = false;
}

function TransitionDone() {
  console.log("TRANSITION IS DONE");
  transitioning = false;
  //controls.enabled = true;

  if (currentSceneNumber == 1) {
    currentScene = lessonScene;
    currentCamera = lessonCamera;
    currentSceneNumber = 2;
    console.log("TRANSITIONED TO LESSON SCENE");
    startLesson();

    //Toggle UI When scene Transitions
    backButton.classList.toggle("disabled");
    backButton.classList.toggle("active");

    controls.enabled = false;
    //lessonSceneControls.enabled = true;
  } else if (currentSceneNumber == 2) {
    currentScene = mapScene;
    currentCamera = mainCamera;
    currentSceneNumber = 1;
    console.log("TRANSITIONED TO MAIN SCENE");

    updateLessonScene();
    cameraTweenTo(undefined, false, 3, false);

    //Toggle UI When scene Transitions
    //hamburger.classList.toggle("disabled");
    controls.enabled = true;
    //lessonSceneControls.enabled = false;
  }
}

function pingLocationReached() {
  console.log("PING LOCATION REACHED");
  var rndTextureIndex = Math.floor(Math.random() * 5);

  console.log("TEXTURE INDEX: " + rndTextureIndex);
  transition.setTexture(rndTextureIndex);

  //Toggle UI When scene Transitions
  //hamburger.classList.toggle("disabled");
  mapButton.classList.toggle("disabled");

  new TWEEN.Tween(transitionParams)
    .to({ transition: 1 }, 2000)
    // .delay( 2000 )
    //.yoyo( true )
    .start(TransitionStart())
    .onComplete(TransitionDone);
}

function youAreHereUpdate() {
  var camX = mainCamera.position.x;
  var camZ = mainCamera.position.z;
  
  //CAM BOUNDS 
  // right: x: 7.1 
  // left: -7.6
  // top: z: -8.75
  // bottom: 8.5

  //HTML BOUNDS
  // right: left:87%
  // left: left:12%
  // top: top:4%
  // bottom: top:96%

  var posX = mapLinear(camX, -7.32, 6.8, 15, 85);
  var posZ = mapLinear(camZ, -8.52, 8.31, 7, 88);

  youAreHereIcon.style.top = posZ + "%";
  youAreHereIcon.style.left = posX + "%";

  console.log("You are here update X: " + posX + ", Y: " + posZ);
}

function FXScene(scene, camera) {
  const cam = camera;

  // Setup scene
  //const scene = new THREE.Scene();
  //scene.add( new THREE.AmbientLight( 0x555555 ) );

  // const light = new THREE.SpotLight( 0xffffff, 1.5 );
  // light.position.set( 0, 500, 2000 );
  // scene.add( light );

  // const color = geometry.type === 'BoxGeometry' ? 0x0000ff : 0xff0000;
  // const material = new THREE.MeshPhongMaterial( { color: color, flatShading: true } );
  // const mesh = generateInstancedMesh( geometry, material, 500 );
  // scene.add( mesh );

  this.fbo = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

  this.render = function (rtt) {
    if (rtt) {
      renderer.setRenderTarget(this.fbo);
      renderer.clear();
      renderer.render(scene, cam);
    } else {
      renderer.setRenderTarget(null);
      renderer.render(scene, cam);
    }
  };
}

//** A FUNCTION THAT CREATES A TRANSITION OBJECT BY USING A BUFFER IMAGE AND LERPING WITH A GLSL SHADER */
function Transition(sceneA, sceneB) {
  const scene = new THREE.Scene();

  const width = window.innerWidth;
  const height = window.innerHeight;

  const camera = new THREE.OrthographicCamera(
    width / -2,
    width / 2,
    height / 2,
    height / -2,
    -10,
    10
  );

  const textures = [];

  const loader = new THREE.TextureLoader();

  //** LOADS TRANSITION TEXTURES */
  for (let i = 0; i < 6; i++) {
    textures[i] = loader.load(
      "/resources/images/transition/transition" + 2 + ".png"
    );
    //"/resources/images/transition/transition" + (i + 1) + ".png"
  }

  //Shader code -- material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse1: {
        value: null,
      },
      tDiffuse2: {
        value: null,
      },
      mixRatio: {
        value: 0.0,
      },
      threshold: {
        value: 0.1,
      },
      useTexture: {
        value: 1,
      },
      tMixTexture: {
        value: textures[0],
      },
    },
    vertexShader: [
      "varying vec2 vUv;",

      "void main() {",

      "vUv = vec2( uv.x, uv.y );",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

      "}",
    ].join("\n"),
    fragmentShader: [
      "uniform float mixRatio;",

      "uniform sampler2D tDiffuse1;",
      "uniform sampler2D tDiffuse2;",
      "uniform sampler2D tMixTexture;",

      "uniform int useTexture;",
      "uniform float threshold;",

      "varying vec2 vUv;",

      "void main() {",

      "	vec4 texel1 = texture2D( tDiffuse1, vUv );",
      "	vec4 texel2 = texture2D( tDiffuse2, vUv );",

      "	if (useTexture==1) {",

      "		vec4 transitionTexel = texture2D( tMixTexture, vUv );",
      "		float r = mixRatio * (1.0 + threshold * 2.0) - threshold;",
      "		float mixf=clamp((transitionTexel.r - r)*(1.0/threshold), 0.0, 1.0);",

      "		gl_FragColor = mix( texel1, texel2, mixf );",

      "	} else {",

      "		gl_FragColor = mix( texel2, texel1, mixRatio );",

      "	}",

      "}",
    ].join("\n"),
  });

  const geometry = new THREE.PlaneGeometry(
    window.innerWidth,
    window.innerHeight
  );
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  material.uniforms.tDiffuse1.value = sceneA.fbo.texture;
  material.uniforms.tDiffuse2.value = sceneB.fbo.texture;

  // //** TRANSITION TWEEN */
  //** activated here will start the transition immediately.
  // new TWEEN.Tween( transitionParams )
  //   .to( { transition: 1 }, 2000 )
  //   // .delay( 2000 )
  //   //.yoyo( true )
  //   .start(TransitionStart())
  //   .onComplete(TransitionDone);

  this.needsTextureChange = false;

  this.setTextureThreshold = function (value) {
    material.uniforms.threshold.value = value;
  };

  this.useTexture = function (value) {
    material.uniforms.useTexture.value = value ? 1 : 0;
  };

  this.setTexture = function (i) {
    material.uniforms.tMixTexture.value = textures[i];
  };

  this.render = function (delta) {
    // Transition animation
    if (transitionParams.animate) {
      TWEEN.update();

      // Change the current alpha texture after each transition
      if (transitionParams.cycle) {
        if (
          transitionParams.transition == 0 ||
          transitionParams.transition == 1
        ) {
          if (this.needsTextureChange) {
            transitionParams.texture =
              (transitionParams.texture + 1) % textures.length;
            material.uniforms.tMixTexture.value =
              textures[transitionParams.texture];
            this.needsTextureChange = false;
          }
        } else {
          this.needsTextureChange = true;
        }
      } else {
        this.needsTextureChange = true;
      }
    }

    material.uniforms.mixRatio.value = transitionParams.transition;

    // Prevent render both scenes when it's not necessary
    if (transitionParams.transition == 0) {
      sceneB.render(delta, false);
    } else if (transitionParams.transition == 1) {
      sceneA.render(delta, false);
    } else {
      // When 0<transition<1 render transition between two scenes

      sceneA.render(delta, true);
      sceneB.render(delta, true);

      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(scene, camera);
    }
  };
}

//** EVENT LISTENERS */


//** LESSON 1 ACTIVITY */
draggableElements.forEach(elem =>{
  elem.addEventListener("dragstart", dragStart);
  //elem.addEventListener("drag", drag);
  //elem.addEventListener("dragend", dragEnd);
});

droppableElements.forEach(elem =>{
  elem.addEventListener("dragenter", dragEnter);
  elem.addEventListener("dragover", dragOver);
  //elem.addEventListener("dragleave", dragLeave);
  elem.addEventListener("drop", drop);
});

function dragStart(event)
{
  if(event.target.dataset.dropped == "false")
  {
    event.dataTransfer.setData('text/plain', event.target.id);
    console.log("dragging...");
  }
  else
  {
    console.log("Can't drag a dropped...");
  }
  
}
function dragEnter(event)
{
  if(event.target.dataset.dropped == "false")
  {
    console.log("drag enter...");
  }
  else
  {

  }
  //event.target.classList.add("droppable-hover");
}
function dragOver(event)
{
  event.preventDefault();
  if(event.target.dataset.dropped == "false")
  {
    console.log("drag over...");
  }
  else
  {

  }
}
function dropLeave(event)
{
  //event.target.classList.remove("droppable-hover");
  console.log("drop leave...");
}

var r, g, b;
function drop(event)
{
  event.preventDefault();
  console.log("drop...");
  var allFilled = false;
  var count = 0;
  const sourceID = event.dataTransfer.getData('text/plain');

  console.log(document.getElementById(sourceID).dataset.dropped);

  if(document.getElementById(sourceID).dataset.dropped == "false")
  {
    event.target.appendChild(document.getElementById(sourceID));
    event.target.dataset.filled = "true";
    document.getElementById(sourceID).style.top = 0;
    document.getElementById(sourceID).style.left = 0;
    document.getElementById(sourceID).dataset.dropped = "true";

    droppableElements.forEach(elem =>
    {
        console.log(elem.children);
        if(elem.dataset.filled == "true")
        {
          count++;
          //event.target.id

          if(event.target.id == "dropRed")
          {
            if(elem.children)
            {
              r = elem.children[0].id;
              elem.dataset.filled = true;
            }
            else
            {
              r = "";
              elem.dataset.filled = false;
            }
          }
          else if(event.target.id == "dropGreen")
          {
            if(elem.children)
            {
              g = elem.children[0].id;
              elem.dataset.filled = true;
            }
            else
            {
              g = "";
              elem.dataset.filled = false;
            }
          }
          else if(event.target.id == "dropBlue")
          {
            if(elem.children)
            {
              b = elem.children[0].id;
              elem.dataset.filled = true;
            }
            else
            {
              b = "";
              elem.dataset.filled = false;
            }
          }

          console.log("R: " + r + " G: " + g + " B: " + b);
        }
        if(count == 3)
        {
          allFilled = true;
          console.log("ALL FILLED");
          imagesFilled(r, g, b);
        }
    });
  }
  else
  {
    if(event.target.firstChild)
    {
      console.log(event.target.firstChild);
    }
  }
}
function imagesFilled(r, g, b)
{
  var bandCombo = r+g+b;
  document.getElementById("finalImage").style.backgroundImage = "url('resources/images/landsat/catalina-mountains.jpg')";
  console.log(bandCombo);
}
function resetLesson1()
{
  draggableElements.forEach(elem =>
  {
    elem.dataset.dropped = false;
  });
  droppableElements.forEach(elem =>
  {
    elem.dataset.filled = false;
  });
  console.log(draggableElements[0]);

  //lesson1Container.classList.toggle("active");

  //RESET STYLES AND POSITIONS//
  for(var i = 0;i < draggableElements.length; i++)
  {
    document.getElementById("lesson1Activity").appendChild(draggableElements[i]);
    if(i == 0)
    {
      draggableElements[i].style.top = "10%";
      draggableElements[i].style.left = "15%";
    }
    else if(i == 1)
    {
      draggableElements[i].style.top = "38%";
      draggableElements[i].style.left = "15%";
    }
    else
    {
      draggableElements[i].style.top = "66%";
      draggableElements[i].style.left = "15%";
    }
  }
}

lesson1ResetBtn.addEventListener("click", function (ev) {
  console.log("RESET");
  //creditsContainer.classList.toggle("active");
  resetLesson1();
  clickSound.play();
});

lessonDoneBtn.addEventListener("click", function (ev) {
  //ev.stopPropagation(); // prevent event from bubbling up to .container
  ev.stopPropagation()
  toggleLessonPopup();
  clickSound.play();

  var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
  iframe.postMessage('{"event":"command","func":"stopVideo","args":""}', "*");
  // ...do whatever you like
  
  if (!transitioning && !isTweening) {
    if (currentSceneNumber == 2) {
      new TWEEN.Tween(transitionParams)
        .to({ transition: 0 }, 2000)
        // .delay( 2000 )
        //.yoyo( true )
        .start(TransitionStart())
        .onComplete(TransitionDone);
      updateLinePath();

      lessonComplete();

      backButton.classList.toggle("active");
      backButton.classList.toggle("disabled");
      mapButton.classList.toggle("disabled");

      console.log("MAP ICON SCENE: " + currentSceneNumber);
    } else if (currentSceneNumber == 1) {
    }
  }

  clickSound.play();
});

//** LESSON 1 ACTIVITY */

//xButton.addEventListener('click', togglePopup, false);
//window.addEventListener('mousemove', onMouseMove, false);
//window.addEventListener('click', clickEvent, false);
audioButton.addEventListener("click", function (ev) {
  ev.stopPropagation();
  if (audioPlaying) {
    audioPlaying = false;
    music.pause();
    clickSound.play();
    audioButton.style.backgroundImage =
      "url('/resources/images/audio-pause.png')";
  } else {
    audioPlaying = true;
    music.play();
    clickSound.play();
    audioButton.style.backgroundImage =
      "url('/resources/images/audio-play.png')";
  }

  //** STOP MUSIC FROM PLAYING */
  // if(music.isPlaying)
  // {
  //   music.pause();
  // }
  // else
  // {
  //   music.play();
  // }
});

//** START BUTTON EVENT LISTENER */
startButton.addEventListener("click", function (ev) {
  ev.stopPropagation();
  if (RESOURCES_LOADED) {
    gameStarted = true;
    startButton.classList.toggle("active");
    audioButton.classList.toggle("disabled");
    hamburger.classList.toggle("disabled");
    mapButton.classList.toggle("disabled");
    bugIcon.classList.toggle("disabled");
    bugIcon2.classList.toggle("disabled");
    bugIcon3.classList.toggle("disabled");
    bugIcon4.classList.toggle("disabled");
    
    //tutorialHighlight.classList.toggle("active");
    //highlightText.classList.toggle("active");
    //mouseIcon.classList.toggle("active");

    //tutorialSequence();

    currentSceneNumber = 1;
    music.play();
  }
  console.log("START BUTTON");
});
//** SIDE BY SIDE X BUTTON */
xButton.addEventListener("click", function (ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container
  togglePopup();
  clickSound.play();
});
//** TOWER POPUP X BUTTON */
xButton2.addEventListener("click", function (ev) {
  //ev.stopPropagation(); // prevent event from bubbling up to .container

  toggleTowerPopup();
  clickSound.play();
});
//** YOUTUBE POPUP X BUTTON*/
// xButton3.addEventListener("click", function (ev) {
//   //ev.stopPropagation(); // prevent event from bubbling up to .container
//   ev.stopPropagation()
//   toggleLessonPopup();
//   clickSound.play();

//   var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
//   iframe.postMessage('{"event":"command","func":"stopVideo","args":""}', "*");
//   // ...do whatever you like
// });
//** MAP POPUP X BUTTON*/
xButton4.addEventListener("click", function (ev) {
  //ev.stopPropagation(); // prevent event from bubbling up to .container

  document.getElementById("mapPopup").classList.toggle("active");
  clickSound.play();
  // ...do whatever you like
});
//** CREDITS POPUP X BUTTON*/
xButton5.addEventListener("click", function (ev) {
  console.log("CLOSE");
  creditsContainer.classList.toggle("active");
  clickSound.play();
});


//** MAP BUTTON CLICK FUNCTIONALITY */
mapButton.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  
  if(!transitioning && !isTweening)
  {
    if(currentSceneNumber == 2)
    {
      // new TWEEN.Tween( transitionParams )
      // .to( { transition: 0 }, 2000 )
      // // .delay( 2000 )
      // //.yoyo( true )
      // .start(TransitionStart())
      // .onComplete(TransitionDone);
      // updateLinePath();
      
      // console.log("MAP ICON SCENE: " + currentSceneNumber);
    }
    else if(currentSceneNumber == 1)
    {
      //console.log("MAP ICON SCENE: " + currentSceneNumber);
      //controls.maxDistance = 12;
      //cameraTweenTo(undefined, false, 12, false, true);
      
      //mapPopup.classList.toggle("acitve");
      document.getElementById("mapPopup").classList.toggle("active");
    }

    if(tutorial)
    {
      if(tutorialIndex == 4)
      {
        tutorialSequence();
      }
    }

    youAreHereUpdate();
  }
  
  clickSound.play();
});

//** ROAD BUTTON INSIDE MAP POPUP */
roadButton.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if(!transitioning && !isTweening)
  {
    if(currentSceneNumber == 2)
    {
      
    }
    else if(currentSceneNumber == 1)
    {
      document.getElementById("mapImage").src = "resources/images/arizona-road.png";
    }
  }

  clickSound.play();
});
//** MOSAIC BUTTON INSIDE MAP POPUP */
mosaicButton.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if(!transitioning && !isTweening)
  {
    if(currentSceneNumber == 2)
    {
      
    }
    else if(currentSceneNumber == 1)
    {
      document.getElementById("mapImage").src = "resources/images/arizona-mosaic.jpg";
    }
  }

  clickSound.play();
});
//** GEOGRAPHY BUTTON INSIDE MAP POPUP */
geographyButton.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if(!transitioning && !isTweening)
  {
    if(currentSceneNumber == 2)
    {
      
    }
    else if(currentSceneNumber == 1)
    {
      document.getElementById("mapImage").src = "resources/images/arizona-geography.jpg";
    }
  }

  clickSound.play();
});

backButton.addEventListener("click", function (ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if (!transitioning && !isTweening) {
    if (currentSceneNumber == 2) {
      new TWEEN.Tween(transitionParams)
        .to({ transition: 0 }, 2000)
        // .delay( 2000 )
        //.yoyo( true )
        .start(TransitionStart())
        .onComplete(TransitionDone);
      updateLinePath();

      lessonComplete();

      backButton.classList.toggle("active");
      backButton.classList.toggle("disabled");
      mapButton.classList.toggle("disabled");

      console.log("MAP ICON SCENE: " + currentSceneNumber);
    } else if (currentSceneNumber == 1) {
    }
  }

  clickSound.play();
});

//** CLICK IN WINDOW USED FOR POPUPS */
window.addEventListener("click", () => {
  if (!transitioning && !isTweening) {
    if (currentSceneNumber == 1) {
      if (!togglePopupOpen) {
        clickEvent();
      }
    } else if (currentSceneNumber == 2) {
      if (!togglePopupOpen) {
        clickEvent();
      }
    }
  }
});
//** DOUBLE CLICK IN WINDOW */
window.addEventListener("dblclick", doubleClickEvent, false);

window.addEventListener("mousemove", function (event) {
  if (!transitioning && !isTweening) {
    if (currentSceneNumber == 1) {
      if (!togglePopupOpen) {
        onMouseMove(event);
      }
    } else if (currentSceneNumber == 2) {
      if (!togglePopupOpen) {
        onMouseMove(event);
      }
    }
  }
});
//** USED FOR RESIZING THE WINDOW TO MAINTAIN ASPECT RATIOS */
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  mainCamera.aspect = sizes.width / sizes.height;
  mainCamera.updateProjectionMatrix();

  lessonCamera.aspect = sizes.width / sizes.height;
  lessonCamera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
//** USED TO CONTROL HAMBURGER CLICK */
document.addEventListener("click", (e) => {
  const isDropdownButton = e.target.matches("[data-dropdown-button]");
  if (!isDropdownButton && e.target.closest("[data-dropdown]") != null) {
    return;
  }

  let currentDropdown;
  if (isDropdownButton) {
    currentDropdown = e.target.closest("[data-dropdown]");
    currentDropdown.classList.toggle("active");
    clickSound.play();
  }

  document.querySelectorAll("[data-dropdown].active").forEach((dropdown) => {
    if (dropdown == currentDropdown) {
      console.log("CURRENT DROPDOWN?!?!?!");

      return;
    } else {
      dropdown.classList.remove("active");
      clickSound.play();
    }
  });
});

helpButton.addEventListener("click", (e) => {
  if(!tutorial)
  {
    if (!transitioning && !isTweening) 
    {
      if(currentSceneNumber != 2)
      {
        console.log("HELP BUTTON");
        //tutorialSequence();
        tutorialReset();
      }
    }
  }
});

creditsButton.addEventListener("click", (e) => {
  if(!tutorial)
  {
    if (!transitioning && !isTweening) 
    {
      creditsContainer.classList.toggle("active");
      console.log("CREDITS BUTTON");
    }
  }
});

//** USED TO CHANGE MAP MODE TO: ROAD */
// roadDropdown.addEventListener("click", function (ev) {
//   ev.stopPropagation(); // prevent event from bubbling up to .container

//   if (!transitioning && !isTweening) {
//     if (currentSceneNumber == 2) {
//     } else if (currentSceneNumber == 1) {
//       //arizona_mosaic_texture = arizona.children[0].children[0].material.map;
//       arizona.children[0].children[0].material.map = arizona_road_texture;
//       arizona.children[0].children[0].material.map.flipY = false;
//       arizona.children[0].children[0].material.needsUpdate = true;
//     }
//   }

//   clickSound.play();
// });
// //** USED TO CHANGE MAP MODE TO: MOSAIC */
// mosaicDropdown.addEventListener("click", function (ev) {
//   ev.stopPropagation(); // prevent event from bubbling up to .container

//   if (!transitioning && !isTweening) {
//     if (currentSceneNumber == 2) {
//     } else if (currentSceneNumber == 1) {
//       arizona.children[0].children[0].material.map = arizona_mosaic_texture;
//       arizona.children[0].children[0].material.map.flipY = false;
//       arizona.children[0].children[0].material.needsUpdate = true;
//     }
//   }

//   clickSound.play();
// });
// //** USED TO CHANGE MAP MODE TO: GEOGRAPHY */
// geographyDropdown.addEventListener("click", function (ev) {
//   ev.stopPropagation(); // prevent event from bubbling up to .container

//   if (!transitioning && !isTweening) {
//     if (currentSceneNumber == 2) {
//     } else if (currentSceneNumber == 1) {
//       arizona.children[0].children[0].material.map = arizona_height_texture;
//       arizona.children[0].children[0].material.map.flipY = false;
//       arizona.children[0].children[0].material.needsUpdate = true;
//     }
//   }

//   clickSound.play();
// });

//** EVENT FOR RIGHT LESSON BUTTON */
lessonButton_right.addEventListener("click", function (ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if (!transitioning && !isTweening) {
    if (currentSceneNumber == 2) 
    {
      // console.log("RIGHT LESSON BUTTON");
      // youtubePlayer.src = "https://www.youtube.com/embed/DGE-N8_LQBo";

      navigateLesson(true);
      youtubePlayButton.src = "resources/images/UI/Play.png";
      videoPlaying = false;
    } 
    else if (currentSceneNumber == 1) 
    {
    }
  }

  clickSound.play();
});
//** EVENT FOR LEFT LESSON BUTTON */
lessonButton_left.addEventListener("click", function (ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if (!transitioning && !isTweening) 
  {
    if (currentSceneNumber == 2) 
    {
      // console.log("LEFT LESSON BUTTON");
      // var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
      // iframe.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");

      navigateLesson(false);
      youtubePlayButton.src = "resources/images/UI/Play.png";
      videoPlaying = false;
    } 
    else if (currentSceneNumber == 1) 
    {
    }
  }

  clickSound.play();
});
//** EVENT FOR MIDDLE LESSON BUTTON */
lessonButton_middle.addEventListener("click", function (ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if (!transitioning && !isTweening) {
    if (currentSceneNumber == 2) 
    {
      var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
      
      if(videoPlaying)
      {
        iframe.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          "*"
          );
        
          videoPlaying = false;
          youtubePlayButton.src = "resources/images/UI/Play.png";  
      }
      else
      {
        iframe.postMessage(
          '{"event":"command","func":"playVideo","args":""}',
          "*"
        );

        videoPlaying = true;
        youtubePlayButton.src = "resources/images/UI/Pause.png";  
      }
      
      console.log("MIDDLE LESSON BUTTON");
      //console.log(youtubePlayer);

      //player.stopVideo();
    } else if (currentSceneNumber == 1) {
    }
  }

  clickSound.play();
});

animate();
