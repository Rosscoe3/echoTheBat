import "./style.css";
//import * as THREE from "https://cdn.skypack.dev/three@0.127.0";
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.127.0/build/three.module.js';
import * as TWEEN from "https://cdn.skypack.dev/@tweenjs/tween.js";
//import * as TWEEN from '@tweenjs/tween.js'
import { MapControls } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/loaders/DRACOLoader.js";
import { RGBELoader } from 'https://cdn.jsdelivr.net/npm/three@0.127/examples/jsm/loaders/RGBELoader.js';
import { DragControls } from "https://cdn.skypack.dev/three@0.127.0/examples/jsm/controls/DragControls";
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/shaders/VignetteShader.js';
import { PixelShader } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/shaders/PixelShader.js'; 
import { FXAAShader } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/shaders/FXAAShader.js'; 
import { GammaCorrectionShader } from 'https://cdn.skypack.dev/three@0.127.0/examples/jsm/shaders/GammaCorrectionShader.js';

import * as dat from "dat.gui";
import { mapLinear } from "https://cdn.jsdelivr.net/npm/three@0.139.0/src/math/MathUtils.js";
import Stats from 'https://cdn.skypack.dev/stats.js';

const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
//document.body.appendChild(stats.dom);

//** LOAD MANAGER */
const manager = new THREE.LoadingManager();
manager.onStart = function (url, itemsLoaded, itemsTotal) {
  // console.log(
  //   "Started loading file: " +
  //     url +
  //     ".\nLoaded " +
  //     itemsLoaded +
  //     " of " +
  //     itemsTotal +
  //     " files."
  // );
};
manager.onLoad = function () {
  console.log("Loading complete!");
  RESOURCES_LOADED = true;
  startButton.classList.toggle("disabled");
  document.querySelector(".progress__fill").style.width = 100 + "%";
  document.querySelector(".progress").classList.toggle("disabled");

};
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  console.log(
    // "Loading file: " +
    //   url +
    //   ".\nLoaded " +
    //   itemsLoaded +
    //   " of " +
    //   itemsTotal +
    //   " files."
  );

  //var progress = (itemsTotal / itemsLoaded) * 100;
  var progress = (itemsTotal / 191) * 100;

  //Prevent from going over 100%
  if (progress < 100.0) {
    //progress = 100.0;
    document.querySelector(".progress__fill").style.width = progress + "%";
  }

};
manager.onError = function (url) {
  console.log("There was an error loading " + url);
};

//** CONTROLS AND SCENE SETUP */
const loader = new GLTFLoader(manager);
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderConfig({ type: 'js' });
dracoLoader.setDecoderPath( 'https://www.gstatic.com/draco/v1/decoders/' );
loader.setDRACOLoader( dracoLoader );
const canvas = document.querySelector("#c");
const lessonSceneRaycast = new THREE.Scene();

const mapScene = new THREE.Scene();
const lessonScene = new THREE.Scene();
const hubScene = new THREE.Scene();

const mainCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5
);
const lessonCamera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  600
);
const hubCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  50
);

let renderer = new THREE.WebGLRenderer({ 
  canvas, 
  antialias: true,
  alpha: false, 
  powerPreference: "high-performance" });

//** RENDER PASSES */
var filmPass = new FilmPass(
  0.5,   // noise intensity
  0.1,  // scanline intensity
  648,    // scanline count
  false,  // grayscale
);
filmPass.renderToScreen = true;
  //** VINGETTE */
const shaderVignette = VignetteShader;
const effectVignette = new ShaderPass(shaderVignette);
effectVignette.uniforms[ 'offset' ].value = 1.36;
effectVignette.uniforms[ 'darkness' ].value = 1;
//** GAMMA CORRECTION */
const gammaCorrection = new ShaderPass( GammaCorrectionShader );
  //** PIXEL SHADER */
const shaderPixel = PixelShader;
const effectPixel = new ShaderPass(shaderPixel);
effectPixel.uniforms[ 'resolution' ].value = new THREE.Vector2( window.innerWidth, window.innerHeight );
effectPixel.uniforms[ 'resolution' ].value.multiplyScalar( window.devicePixelRatio );
effectPixel.uniforms[ 'pixelSize' ].value = 3;

const shaderFXAA = FXAAShader;
const effectFXAA = new ShaderPass(shaderFXAA);
const pixelRatio = renderer.getPixelRatio();
effectFXAA.material.uniforms[ 'resolution' ].value.x = 1 / ( container.offsetWidth * pixelRatio );
effectFXAA.material.uniforms[ 'resolution' ].value.y = 1 / ( container.offsetHeight * pixelRatio );
const bloomPass = new UnrealBloomPass({x: 1024, y: 1024}, 1.0, 0.0, 0.75);

let lessonComposer = new EffectComposer(renderer);
lessonComposer.setSize(window.innerWidth, window.innerHeight);
let mapComposer = new EffectComposer(renderer)
mapComposer.setSize(window.innerWidth, window.innerHeight);
let hubComposer = new EffectComposer(renderer)
hubComposer.setSize(window.innerWidth, window.innerHeight);

lessonComposer.addPass(new RenderPass(lessonScene, lessonCamera));
lessonComposer.addPass(bloomPass);
lessonComposer.addPass(filmPass);
lessonComposer.addPass(effectVignette);
lessonComposer.addPass(effectPixel);

mapComposer.addPass(new RenderPass(mapScene, mainCamera));
mapComposer.addPass(effectVignette);
mapComposer.addPass(gammaCorrection);

hubComposer.addPass(new RenderPass(hubScene, hubCamera));

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
let labelRenderer;
let allFilled;

//** MAP CONTROLS */
const controls = new MapControls(mainCamera, renderer.domElement);
const uiMinheight = 0.1;
var mouse, raycaster;
const gui = new dat.GUI();

//** Drag Bug Controls */
var dragabbleObjects = [];
const dragBugControls = new DragControls(dragabbleObjects, lessonCamera, renderer.domElement);
dragBugControls.deactivate();

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
const sceneC = new FXScene(hubScene, hubCamera);
//const sceneC = new FXScene(loadingScreen.scene, loadingScreen.camera);

//transition = new Transition( mapScene, lessonScene );
var clock;

//** MISC GLOBAL VARIABLES */
let line;
let pathIndex = 1;
let points;
let togglePopupOpen = false;
let toggleTowerPopupOpen = false;
let toggleLessonPopupOpen = false;
let hoverMapToggle = false;
let cameraPos = new THREE.Vector3(0, 5, 0);
let transition, transition2;
let transitioning = false;
let hubTransitioning = false;
let hubworldScreenClick = false;
let walkieTalkieView = false;

let isTweening = false;
let cameraMoving = false;
let currentSceneNumber = 0;
let currentScene = mapScene;
let currentCamera;
var intersectObject;
var intersected = false;
var audioPlaying = true;
var bugAmount = 0;
var bugsFound = [];
var bugsEaten = 0;
var bugBlue, bugYellow, bugRed, bugGreen;
var hub_bugBlue, hub_bugYellow, hub_bugRed, hub_bugGreen;
var bugLocations = [0, 1, -1, 2];
var hub_bugLocations = [-0.12, -0.06, 0, 0.06];
var hub_scale = 0.125;
var hub_Bug_pos_x = -2.27;
var hub_Bug_pos_z = 0.69;

var bugFlyTween;
var bugRotTween;
var echoAnimFinal = false;
var echoCurrentAnim = 5;
var echoActiveAction, echoMomActiveAction;
var echoFeedTimeout;

const pingWrldPosTemp = new THREE.Vector3();
var maxSpriteSize = 0.3;
var minSpriteSize = 0.2;
var elem;
var gameStarted = false;
var tutorial = false;
var mouseIsDragging = false;
var tutorialIndex = 0;
var outOfBounds = false;
var videoPlaying = false;
var currentLessonSceneIndex = 0;
var lessonsCompleted = 0;
var currentLessonIndex = 0;
const delta = 0.01;

var lessonSequences;
var lesson1Sequence, lesson2Sequence, lesson3Sequence, lesson4Sequence;
var startingSubtitles, tutorialSubtitles, lessonSubtitles;
var startingSequenceNumb = 0;
var lessonSubtitleSequenceNumber = 0;
var startingSequence = true;
var introHubSequence = true;
var locationFound = false;
var timeoutID1, timeoutID2, lessonTimeout1;

//** SOUNDS AND MUSIC */
const listener = new THREE.AudioListener();
mainCamera.add(listener);
const audioLoader = new THREE.AudioLoader(manager);

const music = new THREE.Audio(listener);
const uiHoverOnSound = new THREE.Audio(listener);
const walkieTalkie1 = new THREE.Audio(listener);
const walkieTalkie2 = new THREE.Audio(listener);
const walkieTalkie3 = new THREE.Audio(listener);
const phoenixSound = new THREE.Audio(listener);
const grandCanyonSound = new THREE.Audio(listener);
const grasshopperSound = new THREE.Audio(listener);
const blackMesaSound = new THREE.Audio(listener);
const caveSound = new THREE.Audio(listener);
const hubworldSound = new THREE.Audio(listener);


var walkieTalkieSounds;
const uiHoverOffSound = new THREE.Audio(listener);
const clickSound = new THREE.Audio(listener);
const transitionSound = new THREE.Audio(listener);

const echoChewSound = new THREE.Audio(listener);
const echoChewSound2 = new THREE.Audio(listener);
const echoChewSound3 = new THREE.Audio(listener);

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
//WALKIE TALK SOUNDS
audioLoader.load("/resources/sounds/fx/walkieTalk-1.mp3", function (buffer) {
  walkieTalkie1.setBuffer(buffer);
  walkieTalkie1.setLoop(false);
  walkieTalkie1.setVolume(0.25);
});
audioLoader.load("/resources/sounds/fx/walkieTalk-2.mp3", function (buffer) {
  walkieTalkie2.setBuffer(buffer);
  walkieTalkie2.setLoop(false);
  walkieTalkie2.setVolume(0.25);
});
audioLoader.load("/resources/sounds/fx/walkieTalk-3.mp3", function (buffer) {
  walkieTalkie3.setBuffer(buffer);
  walkieTalkie3.setLoop(false);
  walkieTalkie3.setVolume(0.25);
});
walkieTalkieSounds = [walkieTalkie1, walkieTalkie2, walkieTalkie3];

//HOVER OFF SOUND
audioLoader.load("/resources/sounds/fx/woosh-deep.wav", function (buffer) {
  uiHoverOffSound.setBuffer(buffer);
  uiHoverOffSound.setLoop(false);
  uiHoverOffSound.setVolume(0.25);
});
//CLICK SOUND
audioLoader.load("/resources/sounds/fx/lightClick.wav", function (buffer) {
  clickSound.setBuffer(buffer);
  clickSound.setLoop(false);
  clickSound.setVolume(0.75);
});

//** ECHO CHEWING SOUNDS */
audioLoader.load("resources/sounds/fx/chew.mp3", function (buffer) {
  echoChewSound.setBuffer(buffer);
  echoChewSound.setLoop(false);
  echoChewSound.setVolume(1);
});
audioLoader.load("resources/sounds/fx/chew2.mp3", function (buffer) {
  echoChewSound2.setBuffer(buffer);
  echoChewSound2.setLoop(false);
  echoChewSound2.setVolume(1);
});
audioLoader.load("resources/sounds/fx/chew3.mp3", function (buffer) {
  echoChewSound3.setBuffer(buffer);
  echoChewSound3.setLoop(false);
  echoChewSound3.setVolume(1);
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

//** HUBWORLD SOUND */
audioLoader.load(
  "/resources/sounds/fx/hubworld.mp3",
  function (buffer) {
    hubworldSound.setBuffer(buffer);
    hubworldSound.setLoop(true);
    hubworldSound.setVolume(0.05);
    //transitionSound.stop();
  }
);
//** PHOENIX */
audioLoader.load(
  "/resources/sounds/fx/phoenix.mp3",
  function (buffer) {
    phoenixSound.setBuffer(buffer);
    phoenixSound.setLoop(true);
    phoenixSound.setVolume(0.05);
  }
);
//** GRAND CANYON */
audioLoader.load(
  "/resources/sounds/fx/grandCanyon.mp3",
  function (buffer) {
    grandCanyonSound.setBuffer(buffer);
    grandCanyonSound.setLoop(true);
    grandCanyonSound.setVolume(0.1);
  }
);
//** GRASSHOPPER POINT */
audioLoader.load(
  "/resources/sounds/fx/desert.mp3",
  function (buffer) {
    grasshopperSound.setBuffer(buffer);
    grasshopperSound.setLoop(true);
    grasshopperSound.setVolume(0.05);
  }
);
//** BLACK MESA */
audioLoader.load(
  "/resources/sounds/fx/BlackMesa.mp3",
  function (buffer) {
    blackMesaSound.setBuffer(buffer);
    blackMesaSound.setLoop(true);
    blackMesaSound.setVolume(0.025);
  }
);
//** CAVE SCENE */
audioLoader.load(
  "/resources/sounds/fx/cave.mp3",
  function (buffer) {
    caveSound.setBuffer(buffer);
    caveSound.setLoop(true);
    caveSound.setVolume(0.1);
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
const towerIconTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/towericon.png"
);
const glowTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/yellow-glow.png"
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
const chiricahuaMntsTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/chiricahua-mts.jpg"
);
const superstitionMntsTexture = new THREE.TextureLoader(manager).load(
  "/resources/images/location/superstition-mnts.jpg"
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
const lessonLocation_phoenix_texture = new THREE.TextureLoader(manager).load(
  "/resources/images/UI/icon-phoenix.jpg"
);
const lessonLocation_horseshoe_texture = new THREE.TextureLoader(manager).load(
  "/resources/images/UI/icon-horseshoeBend.jpg"
);
const lessonLocation_cathedralRock_texture = new THREE.TextureLoader(manager).load(
  "/resources/images/UI/icon-cathedralRock.jpg"
); 
const lessonLocation_blackMesa_texture = new THREE.TextureLoader(manager).load(
  "/resources/images/UI/icon-yuma.jpg"
);

const arizona_road_texture = new THREE.TextureLoader(manager).load(
  "/resources/images/arizona-road.png"
);
let arizona_mosaic_texture;

const bugTexture_yellow = new THREE.TextureLoader().load(
  "/resources/models/textures/bug-yellow.png"
);
const bugTexture_blue = new THREE.TextureLoader().load(
  "/resources/models/textures/bug-blue.png"
);
const bugTexture_red = new THREE.TextureLoader().load(
  "/resources/models/textures/bug-red.png"
);
let bugTexture_green;

const towerIconMaterial = new THREE.SpriteMaterial({ map: towerIconTexture });
const glowMaterial = new THREE.SpriteMaterial({map: glowTexture});

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
const chiricahuaMntsMaterial = new THREE.SpriteMaterial({map: chiricahuaMntsTexture});

const superstitionMntsMaterial = new THREE.SpriteMaterial({ map: superstitionMntsTexture});
const saguaroNatParkMaterial = new THREE.SpriteMaterial({ map: saguaroNatParkTexture});
const sanSimonRestAreaMaterial = new THREE.SpriteMaterial({ map: sanSimonRestAreaTexture});
const scaddanWashMaterial = new THREE.SpriteMaterial({ map: scaddanWashTexture});
const tanqueVerdeMaterial = new THREE.SpriteMaterial({ map: tanqueVerdeTexture});
const wymolaMaterial = new THREE.SpriteMaterial({ map: wymolaTexture});

const lessonLocation_phoenix_material = new THREE.SpriteMaterial({ map: lessonLocation_phoenix_texture});
const lessonLocation_horseshoe_material = new THREE.SpriteMaterial({ map: lessonLocation_horseshoe_texture});
const lessonLocation_cathedralRock_material = new THREE.SpriteMaterial({ map: lessonLocation_cathedralRock_texture});
const lessonLocation_blackMesa_material = new THREE.SpriteMaterial({ map: lessonLocation_blackMesa_texture});

let towerHints = ["ECHO spotted catching bugs around the streetlights in Phoenix!", 
"ECHO seen heading north toward the Grand Canyon", 
"ECHO spotted heading south on Route 17", 
"ECHO was seen in the Sonoran desert", 
"ECHO seen heading toward the mountains southeast of Tucson"];

let towerHints2 = ["ECHO spotted catching bugs around the streetlights in Phoenix! \n Look at the maps to find the city of Phoenix.", 
"ECHO seen heading toward the Grand Canyon. Look at the maps to find the Grand Canyon.", 
"ECHO spotted heading south on Route 17. Look at the road map to find Route 17.", 
"ECHO was seen in the Sonoran desert. Look at a physical map of Arizona.", 
"ECHO seen heading toward the mountains southeast of Tucson. Look at the road map to find Tucson. And the physical map to find the mountains."];

let towerClicked = false;

const towerIcon = new THREE.Sprite(towerIconMaterial);
const towerIcon2 = new THREE.Sprite(towerIconMaterial);
const towerIcon3 = new THREE.Sprite(towerIconMaterial);
const towerIcon4 = new THREE.Sprite(towerIconMaterial);
const towerIcon5 = new THREE.Sprite(towerIconMaterial);

const towerIcons = [towerIcon, towerIcon2, towerIcon3, towerIcon4, towerIcon5];

//const mapImages = [sprite, sprite2, towerIcon];
var sprite_grandCanyon,
  sprite_coloradoRiver,
  sprite_phoenix,
  sprite_tempe,
  sprite_tuscon,
  sprite_catalinaMountains,
  sprite_sonoranDesert,
  sprite_rooseveltLake,
  sprite_gilaRiver,
  sprite_saltRiver,
  sprite_cathedralRock,
  sprite_fatmansLoop,
  sprite_horseshoeBend,
  sprite_micaViewTrail,
  sprite_navajoPoint,
  sprite_paintedDesert,
  sprite_peoria,
  sprite_petrifiedForest,
  sprite_superstitionMnts,
  sprite_saguaroNatPark,
  sprite_sanSimon,
  sprite_scaddanWash,
  sprite_tanqueVerde,
  sprite_wymola,
  sprite_chiricahuaMnts,
  lessonLocation_phoenix_sprite,
  lessonLocation_horseshoe_sprite,
  lessonLocation_cathedralRock_sprite,
  lessonLocation_blackMesa_sprite,
  lessonLocation_tuscon_sprite, 
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

const cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );
const cubeMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, transparent: true } );
const cube = new THREE.Mesh( cubeGeometry, cubeMaterial );

let outlineBug = new THREE.Group();
outlineBug.name = 'outlineBug';
let bugTogether = new THREE.Group();
bugTogether.name = 'bugTogether';
let Echo = new THREE.Group();
Echo.name = 'Echo';
let EchoMom = new THREE.Group();
EchoMom.name = 'EchoMom';

var mixer, momMixer;
var echoBox, echoActions, echoMomActions;
var echoClicked = false;
var echoLocTween, echoRotTween, echoScaleTween;

let phoenixModel = new THREE.Group();
phoenixModel.name = "phoenixModel";
let grasshopperModel = new THREE.Group();
grasshopperModel.name = "cathedralRockModel";
let blackMesaModel = new THREE.Group();
blackMesaModel.name = "blackMesaModel";
let cave = new THREE.Group();
cave.name = 'cave';
let grandCanyonModel = new THREE.Group();
grandCanyonModel.name = "grandCanyonModel";

let hubworldModel = new THREE.Group();
let hubworldRaycast = new THREE.Group();
let garminModel = new THREE.Group();
let garminHover = false;
let computerScreen;
var animationSmoothTime = 1.0;

//Load Arizona Map Model
let arizona = new THREE.Group();
let walkieTalkie = new THREE.Group();

/** HTML ELEMENTS */
let continueButton = document.getElementById("continueButton");
let startYoutubeContainer = document.getElementById("startYoutubeVideo");
let startButton = document.getElementById("startBtn");
let retryButton = document.getElementById("retryButton");
const labelContainerElem = document.querySelector("#labels");
const locationNameElem = document.createElement("div");
let audioButton = document.getElementById("audioToggle");
let xButton = document.getElementById("close-btn");
let xButton2 = document.getElementById("close-btn2");
let xButton3 = document.getElementById("close-btn3");
let xButton4 = document.getElementById("close-btn4");
// let xButton5 = document.getElementById("creditsCloseBtn");
let miniMap = document.getElementById("miniMap");
let mapPopup = document.getElementById("mapPopup");

let mapMoveIcon = document.getElementById("mapImage");
let youAreHere = document.getElementById("youAreHere");

let toggleMapPopup = document.getElementById("toggleMapPopup");
let hamburger = document.getElementById("dropdown");
let roadButton = document.getElementById("roadBtn");
let mosaicButton = document.getElementById("mosaicBtn");
let geographyButton = document.getElementById("geographyBtn");
let backButton = document.getElementById("backButton");
let youtubePlayButton = document.getElementById("playPauseBtn");
let tutorialHighlight = document.getElementById("tutorialHighlight");
let highlightText = document.getElementById("highlightText");
let mouseIcon = document.getElementById("mouseICON");
let tutClickImage = document.getElementById("tutClickImage");

// let bugIcon = document.getElementById("bugIcon1");
// let bugIcon2 = document.getElementById("bugIcon2");
// let bugIcon3 = document.getElementById("bugIcon3");
// let bugIcon4 = document.getElementById("bugIcon4");
var bugClicked = false;

let helpButton = document.getElementById("helpButton");
let creditsButton = document.getElementById("creditsButton");
let creditsContainer = document.getElementById("creditsContainer");

let youAreHereIcon = document.getElementById("youAreHere");
let youAreHereIconPopup = document.getElementById("youAreHere2");

let lessonButton_right = document.getElementById("talkie-button-right");
let lessonButton_left = document.getElementById("talkie-button-left");
let lessonButton_middle = document.getElementById("talkie-button-middle");
let youtubePlayer = document.getElementById("youtubePlayer");

let lesson1ResetBtn = document.getElementById("lesson1Reset");
let lesson1Container = document.getElementById("lesson1Activity");
let lesson2Container = document.getElementById("lesson2Activity");
let lessonDoneBtn = document.getElementById("doneButton");
let combinationText = document.getElementById("comboText");
//** LESSON 2 */
//let lesson2Container = document.getElementById("lesson2Image");

let draggableElements = document.querySelectorAll(".drag");
let draggable2Elements = document.querySelectorAll(".drag2");
let droppableElements = document.querySelectorAll(".droppable");
let droppable2Elements = document.querySelectorAll(".droppable2");

let lesson2ActivityList = [["url('resources/images/lesson2/false-mendocino.jpg')", false], 
["url('resources/images/lesson2/true-mendocino.jpg')", true]];
let lesson2ActivityIndex = 0;

let transitionCover = document.getElementById("screenTransition");
let startScreenCover = document.getElementById("startScreenBlock");

let subtitles = document.getElementById("subtitles");
let subtitleLines = document.getElementById("subtitleLine");

let computerScreenVideo = document.getElementById("video");
let computerScreenTexture = new THREE.VideoTexture(computerScreenVideo);
var computerScreenMaterial = new THREE.MeshBasicMaterial({
    map: computerScreenTexture, 
    side: THREE.FrontSide, 
    toneMapped: false,
    transparent: true,
});

let walkieTalkieVideo = document.getElementById("callVideo");
let walkieTalkieVideoTexture = new THREE.VideoTexture(walkieTalkieVideo);
var walkieTalkieVideoMaterial = new THREE.MeshBasicMaterial({
    map: walkieTalkieVideoTexture, 
    side: THREE.FrontSide, 
    toneMapped: false,
    transparent: true,
});
var walkieTalkieScreenModel;

locationNameElem.textContent = "";
var echoPingLocation;
var heartSprite = new THREE.Group();

var hubsceneLabels = [
  makeTextLabel(-2.25, 0.175, 0.675, "Collect bugs for Echo"),
  makeTextLabel(-2.25, 0.175, -0.05, "Follow Echo"),
  makeTextLabel(-1.9, 0.0, -0.3, "Where is Echo?"),
  makeTextLabel(-2.25, 0.05, -1.15, "About Landsat", true),
  makeTextLabel(-2.25, 0.08, -1.5, "Camp Landsat", true),
];

var mapSceneLables = [
  makeTextLabel(-0.65, uiMinheight, 1.7, "Phoenix", false, true),
  makeTextLabel(-1.56, uiMinheight, -6.27, "Colorado River", false, true),
  makeTextLabel(-0.2, uiMinheight, -5.66, "Grand Canyon", false, true),
  makeTextLabel(-0.04, uiMinheight, 2.07, "Tempe", false, true),
  makeTextLabel(1.772, uiMinheight, 5.41, "Tuscon", false, true),
  makeTextLabel(2.227, uiMinheight, 5.26, "Catalina Mts.", false, true),
  makeTextLabel(-2.02, uiMinheight, 5.07, "Sonoran Desert", false, true),
  makeTextLabel(1.77, uiMinheight, 1.16, "Roosevelt Lake", false, true),
  makeTextLabel(-5.207, uiMinheight, 3.44, "Gila River", false, true),
  makeTextLabel(1.2, uiMinheight, 1.46, "Salt River", false, true),
  makeTextLabel(0.29, uiMinheight, -1.9, "Cathedral Rock", false, true),
  makeTextLabel(0.72, uiMinheight, -3.1, "Fatman's Loop", false, true),
  makeTextLabel(1.25, uiMinheight, -7.65, "Horseshoe Bend", false, true),
  makeTextLabel(2.45, uiMinheight, 5.65, "Mica View Trail", false, true),
  makeTextLabel(0.45, uiMinheight, -5.35, "Navajo Point", false, true),
  makeTextLabel(4.3, uiMinheight, -3.8, "Painted Desert", false, true),
  makeTextLabel(-1, uiMinheight, 0.79, "Peoria", false, true),
  makeTextLabel(4.95, uiMinheight, -2.45, "Petrified Forest", false, true),
  makeTextLabel(1.45, uiMinheight, 1.88, "Superstition Mts.", false, true),
  makeTextLabel(1.26, uiMinheight, 5.2, "Saguaro Nat Park", false, true),
  makeTextLabel(6.3, uiMinheight, 5.56, "San Simon", false, true),
  makeTextLabel(-5.5, uiMinheight, 1.01, "Scaddan Wash", false, true),
  makeTextLabel(2.53, uiMinheight, 5.34, "Tanque Verde", false, true),
  makeTextLabel(0.8, uiMinheight, 4.2, "Wymola", false, true),
  makeTextLabel(5.56, uiMinheight, 6.65, "Chiricahua Mts.", false, true),
];

init();
initLessonScene();
initHubScene();
initSubtitles();

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
    //console.log("PLAYER READY");
  }

  function onPlayerStateChange(event) {
    var videoStatuses = Object.entries(window.YT.PlayerState);
    console.log(videoStatuses.find((status) => status[1] === event.data)[0]);
  }
}
if (document.readyState !== "loading") {
  //console.info(`document.readyState ==>`, document.readyState);
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
  //startButton.classList.toggle("active");
  startButton.classList.toggle("disabled");
  audioButton.classList.toggle("disabled");
  miniMap.classList.toggle("disabled");
  //hamburger.classList.toggle("disabled");
  backButton.classList.toggle("disabled");
  // bugIcon.classList.toggle("disabled");
  // bugIcon2.classList.toggle("disabled");
  // bugIcon3.classList.toggle("disabled");
  // bugIcon4.classList.toggle("disabled");

  mapScene.background = new THREE.Color(0xd4d2d2);
  // mapScene.fog = new THREE.Fog(0xd4d2d2, 0.015, 10);

  /** RENDERER & CAMERA SETUP */
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.physicallyCorrectLights = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.Reinhard;
  renderer.toneMappingExposure = 1;

  mainCamera.rotation.x = Math.PI / -2;
  mainCamera.position.setX(1.4);
  mainCamera.position.setZ(3.12);
  mainCamera.position.setY(cameraPos.y);
  currentCamera = mainCamera;

  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();

  //** DIRECT LIGHT SETUP */
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  // dirLight.castShadow = true;
  // dirLight.shadow.mapSize.width = 2048;
  // dirLight.shadow.mapSize.height = 2048;
  // dirLight.shadow.camera.left = -shadowOffset;
  // dirLight.shadow.camera.right = shadowOffset;
  // dirLight.shadow.camera.top = shadowOffset;
  // dirLight.shadow.camera.bottom = -shadowOffset;
  // dirLight.shadow.camera.far = 3500;
  // dirLight.shadow.bias = -0.0001;
  mapScene.add(dirLight);
  //mapScene.add(ambientLight);

  /** SPRITE INSTANTIATION */
  glowSprite = new THREE.Sprite(glowMaterial);

  //sprite_deathValley = new THREE.Sprite(deathValleyMaterial);

  sprite_grandCanyon = new THREE.Sprite(grandCanyonMaterial);
  sprite_coloradoRiver = new THREE.Sprite(coloradoRiverMaterial);
  sprite_phoenix = new THREE.Sprite(phoenixMaterial);
  sprite_phoenix.name = 'phoenix';

  sprite_tempe = new THREE.Sprite(tempeMaterial);
  sprite_tuscon = new THREE.Sprite(tusconMaterial);

  sprite_catalinaMountains = new THREE.Sprite(catalinaMountainsMaterial);
  sprite_sonoranDesert = new THREE.Sprite(sonoranDesertMaterial);
  sprite_rooseveltLake = new THREE.Sprite(rooseveltLakeMaterial);
  sprite_gilaRiver = new THREE.Sprite(yumaMaterial);
  sprite_gilaRiver.name = 'gilaRiver';

  sprite_saltRiver = new THREE.Sprite(saltRiverMaterial);
  sprite_cathedralRock = new THREE.Sprite(cathedralRockMaterial);
  sprite_cathedralRock.name = 'cathedralRock';

  sprite_fatmansLoop = new THREE.Sprite(fatmansLoopMaterial);
  sprite_horseshoeBend = new THREE.Sprite(horseshoeBendMaterial);
  sprite_horseshoeBend.name = 'horseshoe';

  sprite_micaViewTrail = new THREE.Sprite(micaViewTrailMaterial);
  sprite_navajoPoint = new THREE.Sprite(navajoPointMaterial);
  sprite_paintedDesert = new THREE.Sprite(paintedDesertMaterial);
  sprite_peoria = new THREE.Sprite(peoriaMaterial);
  sprite_petrifiedForest = new THREE.Sprite(petrifiedForestMaterial);
  sprite_superstitionMnts = new THREE.Sprite(superstitionMntsMaterial);
  sprite_saguaroNatPark = new THREE.Sprite(saguaroNatParkMaterial);
  sprite_sanSimon = new THREE.Sprite(sanSimonRestAreaMaterial);
  sprite_scaddanWash = new THREE.Sprite(scaddanWashMaterial);
  sprite_tanqueVerde = new THREE.Sprite(tanqueVerdeMaterial);
  sprite_wymola = new THREE.Sprite(wymolaMaterial);
  sprite_chiricahuaMnts = new THREE.Sprite(chiricahuaMntsMaterial);
  sprite_chiricahuaMnts.name = 'chiricahuaMts';

  lessonLocation_phoenix_sprite = new THREE.Sprite(lessonLocation_phoenix_material);
  lessonLocation_horseshoe_sprite = new THREE.Sprite(lessonLocation_horseshoe_material);
  lessonLocation_cathedralRock_sprite = new THREE.Sprite(lessonLocation_cathedralRock_material);
  lessonLocation_blackMesa_sprite = new THREE.Sprite(lessonLocation_blackMesa_material);

  locationSpriteSetup();
  lessonSequenceSetup();
  youAreHereUpdate();

  uiLocationSprites = [
    sprite_grandCanyon,
    sprite_coloradoRiver,
    sprite_phoenix,
    sprite_tempe,
    sprite_tuscon,
    sprite_catalinaMountains,
    sprite_sonoranDesert,
    sprite_rooseveltLake,
    sprite_gilaRiver,
    sprite_saltRiver,
    sprite_cathedralRock,
    sprite_fatmansLoop,
    sprite_horseshoeBend,
    sprite_micaViewTrail,
    sprite_navajoPoint,
    sprite_paintedDesert,
    sprite_peoria,
    sprite_petrifiedForest,
    sprite_superstitionMnts,
    sprite_saguaroNatPark,
    sprite_sanSimon,
    sprite_scaddanWash,
    sprite_tanqueVerde,
    sprite_wymola,
    sprite_chiricahuaMnts,
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
    sprite_phoenix,
    sprite_horseshoeBend,
    sprite_cathedralRock,
    sprite_gilaRiver,
    sprite_chiricahuaMnts
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

  // sprite_deathValley.position.set(-4.68, sprite_deathValley.position.y, -0.65);
  sprite_grandCanyon.position.set(-0.2, sprite_grandCanyon.position.y, -5.66);
  sprite_coloradoRiver.position.set(-1.56, sprite_coloradoRiver.position.y, -6.2697);
  sprite_phoenix.position.set(-0.65, sprite_phoenix.position.y, 1.7);
  sprite_tempe.position.set(-0.04, sprite_tempe.position.y, 2.07);
  sprite_tuscon.position.set(1.772, sprite_tuscon.position.y, 5.41);
  sprite_catalinaMountains.position.set(2.227, sprite_catalinaMountains.position.y, 5.26);
  sprite_sonoranDesert.position.set(-2.02, sprite_sonoranDesert.position.y, 5.07);
  sprite_rooseveltLake.position.set(1.77, sprite_rooseveltLake.position.y, 1.16);
  sprite_gilaRiver.position.set(-5.207, sprite_gilaRiver.position.y, 3.44);
  sprite_saltRiver.position.set(1.2, sprite_saltRiver.position.y, 1.46);
  sprite_cathedralRock.position.set(0.29, sprite_cathedralRock.position.y, -1.9);
  sprite_fatmansLoop.position.set(0.72, sprite_fatmansLoop.position.y, -3.1);
  sprite_horseshoeBend.position.set(1.25, sprite_horseshoeBend.position.y, -7.65);
  sprite_micaViewTrail.position.set(2.45, sprite_micaViewTrail.position.y, 5.65);
  sprite_navajoPoint.position.set(0.45, sprite_navajoPoint.position.y, -5.35);
  sprite_paintedDesert.position.set(4.3, sprite_paintedDesert.position.y, -3.8);
  sprite_peoria.position.set(-1, sprite_peoria.position.y, 0.79);
  sprite_petrifiedForest.position.set(4.95, sprite_petrifiedForest.position.y, -2.45);
  sprite_superstitionMnts.position.set(1.45, sprite_superstitionMnts.position.y, 1.88);
  sprite_saguaroNatPark.position.set(1.26, sprite_petrifiedForest.position.y, 5.2);
  sprite_sanSimon.position.set(6.3, sprite_petrifiedForest.position.y, 5.56);
  sprite_scaddanWash.position.set(-5.5, sprite_petrifiedForest.position.y, 1.01);
  sprite_tanqueVerde.position.set(2.53, sprite_petrifiedForest.position.y, 5.34);
  sprite_wymola.position.set(0.8, sprite_petrifiedForest.position.y, 4.2);
  sprite_chiricahuaMnts.position.set(5.56, sprite_petrifiedForest.position.y, 6.65);

  glowSprite.position.set(sprite_rooseveltLake.position.x, uiMinheight, sprite_rooseveltLake.position.z);
  //lessonSceneRaycast.add(glowSprite);

  //** HTML LABEL CONTENT */
  elem = locationNameElem;
  elem.textContent = "";
  labelContainerElem.appendChild(elem);

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
  gui.add(guiWorld.xPos, "x", -20, 20).onChange(() => {
    towerIcon4.position.set(
      guiWorld.xPos.x,
      towerIcon4.position.y,
      towerIcon4.position.z
    );

    console.log(towerIcon4.position);
  });

  gui.add(guiWorld.xPos, "y", -100, 100).onChange(() => {
    blackMesaModel.position.set(
      blackMesaModel.position.x,
      guiWorld.xPos.y,
      blackMesaModel.position.z
    );
    //effectVignette.uniforms[ 'darkness' ].value = guiWorld.xPos.y;
    console.log(blackMesaModel.position);
    
  });

  gui.add(guiWorld.xPos, "z", -20, 20).onChange(() => {
    towerIcon4.position.set(
      towerIcon4.position.x,
      towerIcon4.position.y,
      guiWorld.xPos.z
    );
    console.log(towerIcon4.position);
  });

  //** TOWER ICON INSTANTIATIONS */
  towerSpriteSetup();

  //** 3D Objects Instantiation */
  focusCube.scale.set(0.1, 0.1, 0.1);
  focusCube.visible = true;
  //Loads arizona Map
  loader.load("/resources/models/arizona-map-5.glb", function (gltf) {
    arizona.userData.name = "Arizona";
    arizona.scale.setY(1);
    arizona.rotation.y = Math.PI / -2.15;

    var model = gltf.scene;
    var newMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    model.traverse((o) => {
      if (o.isMesh) {
        o.material.normalScale = { x: 0.000001, y: 0.000001 };
        o.material.bumpscale = 0.1;
        o.material.normalMapType = 0;
        //console.log(o.material);
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
  });

  transition = new Transition(sceneB, sceneA);
  transition2 = new Transition(sceneA, sceneC);

  //** INITIALIZING FUNCTIONS */
  makeCameraControls();
  makeEchoLinePath();

  echoPingLocation = makeEchoPing(towerIcon.position.x, towerIcon.position.z);
  mapScene.add(lessonSceneRaycast);

  clock = new THREE.Clock();
}

function tutorialSequence()
{
  console.log("TUTORIAL: " + tutorialIndex);
  tutorial = true;

  if(!subtitles.classList.contains("active"))
  {
    subtitles.classList.toggle("active");
  }

  if(walkieTalkie1.isPlaying)
  {
    walkieTalkie1.stop();
  }
  else if(walkieTalkie2.isPlaying)
  {
    walkieTalkie2.stop();
  }
  else if(walkieTalkie3.isPlaying)
  {
    walkieTalkie3.stop();
  }

  if(tutorialIndex != 6)
  {
    tutorialIndex++;
  }
  
  if(tutorialIndex == 0)
  {
    tutorialHighlight.style.width = '30vh';
    tutorialHighlight.style.height = '20vh';
    mouseIcon.classList.toggle("init");
    
    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
      
      //** SET TO THE SECOND HINT AFTER WAITING SOME TIME AFTER CLICKING CLOSE */
      setTimeout(function() 
      {
        subtitleLines.innerHTML = tutorialSubtitles[tutorialIndex];
        subtitles.classList.toggle("active");
      }, 500);
    }
  }
  else if(tutorialIndex == 1)
  {
    tutorialHighlight.style.width = '15vh';
    tutorialHighlight.style.height = '15vh';
    controls.enabled = false;
    
    mouseIcon.classList.toggle("active");
    mouseIcon.classList.toggle("init");
    walkieTalkieSounds[Math.floor(Math.random() * 3)].play();

    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
      setTimeout(function() 
      {
        subtitleLines.innerHTML = tutorialSubtitles[tutorialIndex];
        subtitles.classList.toggle("active");
      }, 500);
    }

    tutClickImage.classList.toggle("active");
    tutClickImage.style = "background-image: url('/resources/images/UI/BugImage.png');";
  }
  else if(tutorialIndex == 2)
  {
    glowSprite.position.set(towerIcon.position.x, uiMinheight - 0.01, towerIcon.position.z);
    tutClickImage.style = "background-image: url('/resources/images/location/horseshoeBend.jpg');";
    walkieTalkieSounds[Math.floor(Math.random() * 3)].play();

    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
      setTimeout(function() 
      {
        subtitleLines.innerHTML = tutorialSubtitles[tutorialIndex];
        subtitles.classList.toggle("active");
      }, 500);
    }
  }
  else if(tutorialIndex == 3)
  {
    glowSprite.position.set(towerIcon.position.x, uiMinheight - 0.01, towerIcon.position.z);
    tutClickImage.style = "background-image: url('/resources/images/towericon.png');";
    walkieTalkieSounds[Math.floor(Math.random() * 3)].play();

    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
      setTimeout(function() 
      {
        subtitleLines.innerHTML = tutorialSubtitles[tutorialIndex];
        subtitles.classList.toggle("active");
      }, 500);
    }
  }
  else if(tutorialIndex == 4)
  {
    tutorialHighlight.style.bottom = "6vh";
    tutorialHighlight.style.right = "5.5vh";
    tutorialHighlight.style.width = '8vh';
    tutorialHighlight.style.height = '10vh';
    lessonSceneRaycast.remove(glowSprite);
    
    mouseIcon.classList.toggle("active");
    mouseIcon.classList.toggle("mapClick");
    
    tutClickImage.classList.toggle("active");
    walkieTalkieSounds[Math.floor(Math.random() * 3)].play();

    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
      setTimeout(function() 
      {
        subtitleLines.innerHTML = tutorialSubtitles[tutorialIndex];
        subtitles.classList.toggle("active");
      }, 500);
    }
  }
  else if(tutorialIndex == 5)
  {
    controls.enabled = true;
    toggleMapSceneLabels();
    tutorialIndex = 0;
    tutorial = false;
    tutorialHighlight.classList.toggle("active");
    console.log("TUTORIAL INDEX IS 5");
    //highlightText.classList.toggle("active");

    mouseIcon.classList.toggle("mapClick");
    mouseIcon.classList.toggle("active");

    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
      subtitleLines.innerHTML = tutorialSubtitles[tutorialIndex];

      setTimeout(function() 
      {
        subtitleLines.innerHTML = "Good luck finding Echo!";
        tutorialHighlight.style.bottom = "50%";
        tutorialHighlight.style.right = "50%";
        subtitles.classList.toggle("active");
        setTimeout(function() 
        {
          subtitles.classList.toggle("active");
        }, 10000);
      }, 500);
    }
  }

  clickSound.play();
  console.log("TUTORIAL: " + tutorialIndex);
}

function tutorialReset()
{
  tutorialHighlight.style.width = '30vh';
  tutorialHighlight.style.height = '20vh';
  tutorialHighlight.style.bottom = "50%";
  tutorialHighlight.style.right = "50%";
  highlightText.innerHTML = "PRESS and drag to move around the map";
  console.log("TOGGLE OFF MAP LABELS, at TUTORIAL RESET");
  toggleMapSceneLabels();

  if(walkieTalkie1.isPlaying)
  {
    walkieTalkie1.stop();
  }
  else if(walkieTalkie2.isPlaying)
  {
    walkieTalkie2.stop();
  }
  else if(walkieTalkie3.isPlaying)
  {
    walkieTalkie3.stop();
  }
  walkieTalkieSounds[Math.floor(Math.random() * 3)].play();
  clickSound.play();

  glowSprite.position.set(sprite_rooseveltLake.position.x, uiMinheight - 0.01, sprite_rooseveltLake.position.z);

  tutorialIndex = 0;
  tutorial = true;

  mouseIcon.classList.toggle("active");
  if(!mouseIcon.classList.contains("init"))
  {
    mouseIcon.classList.toggle("init");
  }
  tutorialHighlight.classList.toggle("active");
  //highlightText.classList.toggle("active");
  subtitleLines.innerHTML = "PRESS and drag to move around the map";
  subtitles.classList.toggle("active");
}

function initLessonScene() {
  //** LIGHTS */
  pointLight.position.set(-20, 0, 12);
  pointLight2.position.set(0, 0, 0);
  pointLight3.position.set(-12, 0, -10);
  pointLight4.position.set(2, -1.1, -0.6);
  //lessonScene.add(pointLight);
  //lessonScene.add(pointLight2);
  lessonScene.add(pointLight3);
  lessonScene.add(pointLight4);
  
  lessonScene.background = new THREE.Color(0x000000);
  lessonScene.fog = new THREE.Fog(0xffffff, 0.1, 0); 

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
  loader.load("/resources/models/cave.glb", function (gltf) {
    //landsat = gltf.scene;
    cave.userData.name = "Cave";
    cave.scale.set(0.5, 0.5, 0.5);
    cave.add(gltf.scene);
    //cave.castShadow = true;

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
        var newMaterial = new THREE.MeshBasicMaterial({});
          o.material = newMaterial;
          o.material.map = colorMap;
          //console.log("O:" + o.name);
      }
    });
  });

  //Loads Grand Canyon model
  loader.load("/resources/models/Grand-Canyon-Sketchfab.glb", function (gltf) {
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
    //grandCanyonModel.castShadow = true;

    //console.log("grand Canyon" + grandCanyonModel.children[0].children[0].children[0].material);  

  });

  //Phoenix Model
  loader.load("/resources/models/phoenix.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        o.userData.name = "Phoenix";
        var colorMap = o.material.map;
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
    lessonScene.add(phoenixModel);
  });

  phoenixModel.rotation.set(0, -4.18, 0);
  phoenixModel.position.set(2.05, -2, 2.748);

  //Phoenix Model
  loader.load("/resources/models/CathedralRock-noBake.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        o.userData.name = "Grasshopper Point";
        var colorMap = o.material.map;
        var newMaterial = new THREE.MeshBasicMaterial({});
        o.material = newMaterial;
        o.material.map = colorMap;

        //console.log("O:" + o.name);
      }
    });
    grasshopperModel.add(gltf.scene);
  });
  grasshopperModel.scale.set(0.1, 0.1, 0.1);
  grasshopperModel.rotation.set(0, -0.534, 0);
  grasshopperModel.position.set(-133, -18.17, 41.96);

  //BlackMesa Model
  loader.load("/resources/models/yuma.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        o.userData.name = "Black Mesa";
        var colorMap = o.material.map;
        var newMaterial = new THREE.MeshBasicMaterial({});
        o.material = newMaterial;
        o.material.map = colorMap;

        //console.log("O:" + o.name);
      }
    });
    blackMesaModel.add(gltf.scene);
  });

  blackMesaModel.scale.set(0.5, 0.5, 0.5);
  blackMesaModel.rotation.set(0, 0.9, 0);
  blackMesaModel.position.set(-50.55, -4.68, 0.69);

  //Bug Model
  loader.load("/resources/models/Bug.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      //**EDIT ITS IMPORTED MATERIAL**//
      if (o.isMesh)
      { 
        o.userData.name = "bug";
        var colorMap = o.material.map;
        bugTexture_green = colorMap;
        //var newMaterial = new THREE.MeshToonMaterial({transparent: true});
        var newMaterial = new THREE.MeshBasicMaterial({transparent: true});
        o.material = newMaterial;
        o.material.map = bugTexture_blue;
        o.material.map.flipY = false;

        o.material.map.needsUpdate = true;
        o.material.side = THREE.DoubleSide;
        //console.log("O:" + o.name);

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
    //outlineBug.castShadow = true;
    outlineBug.add(gltf.scene);

    outlineBug.userData.name = "bug";
    //console.log(outlineBug);
    //console.log("outline: " + outlineBug.children[0].children[0].name);
    lessonScene.add(outlineBug);
  });
  outlineBug.rotation.set(-0.25, -0.06, -0.25);
  outlineBug.position.set(-2.41, -1.01, 1.48);
  outlineBug.scale.set(.5, .5, .5);

  loader.load("/resources/models/Bug-together.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      //**EDIT ITS IMPORTED MATERIAL**//
      if (o.isMesh)
      { 
        var colorMap = o.material.map;
        bugTexture_green = colorMap;
        //var newMaterial = new THREE.MeshToonMaterial({transparent: true});
        var newMaterial = new THREE.MeshBasicMaterial({transparent: true});
        o.material = newMaterial;
        o.material.map = bugTexture_blue;
        o.material.map.flipY = false;

        o.material.map.needsUpdate = true;
        o.material.side = THREE.DoubleSide;
      }
    });
    bugTogether.add(gltf.scene);

    bugTogether.userData.name = "bug";
    // lessonScene.add(outlineBug);
  });
  bugTogether.rotation.set(-0.25, -0.06, -0.25);
  bugTogether.position.set(-2.41, -1.01, 1.48);
  bugTogether.scale.set(.5, .5, .5);

  loader.load("/resources/models/echo-tan-1.glb", function (gltf) 
  {
    gltf.animations; // Array<THREE.AnimationClip>
    gltf.scene; // THREE.Group
    gltf.scenes; // Array<THREE.Group>
    gltf.cameras; // Array<THREE.Camera>
    gltf.asset; // Object
    
    var model = gltf.scene;
    
    model.traverse((o) => 
    {
      //**EDIT ITS IMPORTED MATERIAL**//
      //lessonScene.add(model);
    
    if (o.isMesh)
    { 
      o.name = "Echo";
      //outlineBug.geometry = o;
      var colorMap = o.material.map;
      echoBox = new THREE.Box3().setFromObject(o);
      //var newMaterial = new THREE.MeshToonMaterial({transparent: true});
      var newMaterial = new THREE.MeshBasicMaterial({transparent: true});
      o.material = newMaterial;
      o.material.map = colorMap;
      o.material.skinning = true;
      o.material.morphTargets = true;
      //console.log("O:" + o.name);
      o.scale.set(5, 5, 5);
    }
    });

    mixer = new THREE.AnimationMixer(model);
    echoActions = gltf.animations;
    console.log(echoActions);

    //playEchoAnimation(4);
    echoActiveAction = mixer.clipAction(echoActions[echoCurrentAnim]);
    echoActiveAction.reset();
    echoActiveAction.weight = 1;
    echoActiveAction.fadeIn(transition);
    echoActiveAction.play();

    Echo.name = "Echo";
    Echo.add(model);
    Echo.add(echoBox);
    lessonScene.add(Echo);

  });
  Echo.scale.set(0.1, 0.1, 0.1);
  Echo.position.set(-1.11, -1.5, -0.251);

  loader.load("/resources/models/echo-mom-1.glb", function (gltf) 
  {
    gltf.animations; // Array<THREE.AnimationClip>
    gltf.scene; // THREE.Group
    gltf.scenes; // Array<THREE.Group>
    gltf.cameras; // Array<THREE.Camera>
    gltf.asset; // Object
    
    var model = gltf.scene;
    
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        o.name = "EchoMom";
        var colorMap = o.material.map;
        var newMaterial = new THREE.MeshBasicMaterial({transparent: true});
        o.material = newMaterial;
        o.material.map = colorMap;
        o.material.skinning = true;
        o.material.morphTargets = true;
        o.scale.set(5, 5, 5);
      }
    });

    momMixer = new THREE.AnimationMixer(model);
    echoMomActions = gltf.animations;
    console.log(momMixer);

    //playEchoAnimation(4);
    var action = momMixer.clipAction(echoMomActions[4]);
    action.play();
    action.timeScale = 0.75;

    EchoMom.name = "EchoMom";
    EchoMom.add(model);
    //lessonScene.add(EchoMom);
  });
  EchoMom.position.set(-6.5, 0.364, -0.71);
  EchoMom.rotation.set(-3, 0, 0);
  EchoMom.scale.set(0.3, 0.3, 0.3);

  //console.log(outlineBug);

  //** INITIAL BUG TWEEN */
  bugFlyTween = new TWEEN.Tween(outlineBug.position)
    .to({ y: -0.63}, 3000)
    .yoyo(true)
    .repeat(Infinity);
  bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
  bugFlyTween.start();

  // bugRotTween = new TWEEN.Tween(outlineBug.rotation)
  //   .to({x: 0.25, y: 3, z: 0.25}, 2750)
  //   .yoyo(true)
  //   .repeat(Infinity);
  // bugRotTween.easing(TWEEN.Easing.Quadratic.InOut);
  // bugRotTween.start();

  var hdr1;
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load('/resources/images/hdr/GrandCanyonBackdrop.hdr', function(texture){
      texture.mapping = THREE.EquirectangularReflectionMapping;
      lessonScene.background = texture;
      lessonScene.enviroment = texture;
      hdr1 = texture;
  });

  //** CAMERA INITIALIZATION */
  lessonCamera.rotation.y = Math.PI / 2;
  lessonCamera.position.setY(-1);
  lessonCamera.position.setX(1);

  /** ADD LIGHTS */
  dirLightLesson.color.setHSL(0.1, 1, 0.95);
  dirLightLesson.position.set(-1, 1.75, 1);
  dirLightLesson.position.multiplyScalar(30);
  // dirLightLesson.castShadow = true;
  // dirLightLesson.shadow.mapSize.width = 2048;
  // dirLightLesson.shadow.mapSize.height = 2048;
  // dirLightLesson.shadow.camera.left = -shadowOffset;
  // dirLightLesson.shadow.camera.right = shadowOffset;
  // dirLightLesson.shadow.camera.top = shadowOffset;
  // dirLightLesson.shadow.camera.bottom = -shadowOffset;
  // dirLightLesson.shadow.camera.far = 3500;
  // dirLightLesson.shadow.bias = -0.0001;
  //lessonScene.add( dirLightLesson );
}

function initHubScene()
{
  hubScene.fog = new THREE.Fog(0xffffff, 0.1, 0);
  //hubScene.add( cube );
  
  cube.userData.name = "CUBE";
  cube.position.set(-1.8, -0.06, -0.28);
  cube.scale.set(.1, .1, .1);

  const rgbeLoader = new RGBELoader();
  rgbeLoader.load('/resources/images/hdr/GrandCanyonBackdrop.hdr', function(texture){
      texture.mapping = THREE.EquirectangularReflectionMapping;
      hubScene.background = texture;
      hubScene.enviroment = texture;
  });

  loader.load("/resources/models/Hub-World.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        var colorMap = o.material.map;
        var newMaterial = new THREE.MeshBasicMaterial({transparent: true});
        o.material = newMaterial;
        o.material.map = colorMap;

        //console.log("O:" + o.name);


        if(o.name == "Computer_Screen")
        {
          o.material = computerScreenMaterial;
          o.material.map.flipY = false;
          o.renderOrder = 2;
        }
        if(o.name == "Jar")
        {
          o.material.transparent = true;
          o.fog = false; 
          o.receiveShadow = false;
          o.renderOrder = 1;
          o.material.opacity = 0.5;
          console.log(o.material);
        }
      }
    });
    
    hubworldModel.add(gltf.scene);
    //console.log(phoenixModel);
    hubScene.add(hubworldModel);
    //console.log("outline: " + outlineBug.children[0].children[0].name);
  });
  hubworldModel.position.set(-1.37, -0.5, -0.5);

  loader.load("/resources/models/Walke-Talkie-Garmin.glb", function (gltf) 
  {
    var model = gltf.scene;
    model.traverse((o) => 
    {
      if (o.isMesh)
      { 
        var colorMap = o.material.map;
        var newMaterial = new THREE.MeshBasicMaterial({transparent: true});
        o.material = newMaterial;
        o.material.map = colorMap;

        //console.log("O:" + o.name);

        if(o.name == "Screen")
        {
          o.material = walkieTalkieVideoMaterial;
          o.material.map.flipY = false;
          walkieTalkieScreenModel = o;
        }
      }
    });
    
    garminModel.add(gltf.scene);
    //hubworldModel.add(garminModel);
    //console.log(phoenixModel);
    hubScene.add(garminModel);
    //console.log(hubScene);
    //console.log("outline: " + outlineBug.children[0].children[0].name);
  });

  garminModel.scale.set(0.035, 0.035, 0.035);
  garminModel.position.set(-1.9, -0.28, -0.3);

  //** CAMERA INITIALIZATION */
  hubCamera.rotation.y = Math.PI / 2;

  //** LOCATION SPRITE SETUP */
  var xMulti = .4;
  
  lessonLocation_phoenix_sprite.scale.set(0.3, 0.3, 0.3);
  lessonLocation_phoenix_sprite.parent = garminModel;
  lessonLocation_phoenix_sprite.position.set(0.376, 0.98, 0.65);
  lessonLocation_phoenix_sprite.name = "sprite_phoenix";

  lessonLocation_horseshoe_sprite.scale.set(0.3, 0.3, 0.3);
  lessonLocation_horseshoe_sprite.parent = garminModel;
  lessonLocation_horseshoe_sprite.position.set(0.376, 0.98, 0.65 + (xMulti * -1));
  lessonLocation_horseshoe_sprite.name = "sprite_horseshoe";

  lessonLocation_cathedralRock_sprite.scale.set(0.3, 0.3, 0.3);
  lessonLocation_cathedralRock_sprite.parent = garminModel;
  lessonLocation_cathedralRock_sprite.position.set(0.376, 0.98, 0.65 + (xMulti * -2));
  lessonLocation_cathedralRock_sprite.name = "sprite_cathedralRock";

  lessonLocation_blackMesa_sprite.scale.set(0.3, 0.3, 0.3);
  lessonLocation_blackMesa_sprite.parent = garminModel;
  lessonLocation_blackMesa_sprite.position.set(0.376, 0.98, 0.65 + (xMulti * -3));
  lessonLocation_blackMesa_sprite.name = "sprite_blackMesa";

  // garminModel.add(lessonLocation_phoenix_sprite);
  // garminModel.add(lessonLocation_horseshoe_sprite);
  // garminModel.add(lessonLocation_cathedralRock_sprite);
  // garminModel.add(lessonLocation_blackMesa_sprite);
  //hubScene.add(lessonLocation_phoenix_sprite);

  computerScreenVideo.play();
  walkieTalkieVideo.play();
}

function initSubtitles()
{
  startingSubtitles = 
  ["Bravo to tower",
   "We need your help locating <i>ECHO</i>!",
    "We've just gotten word he's been spotted, sending you the ping now",
     "Click on your <i>computer</i>, and let's get started!"];
  tutorialSubtitles = ["PRESS and drag to move around the map",
  "Collect Bugs to feed to Echo",
  "Look for Echo by clicking on the photos",
  "Click on the towers for a report on Echo’s location",
  "Use the maps to help find the places mentioned in the tower report" ];
  lessonSubtitles = ["*PSHHH*...You found Echo! Hope you can get a good view through this trail cam...*PSHHH*", 
  "*PSHHH*...There he goes... Lets do some research and find out where he's headed next!...*PSHHH*", 
  "*PSHHH*...You found Echo! Wow, what a beautiful view...*PSHHH*", "*PSHHH*...And he's off! Pulling up your device now...*PSHHH*", 
  "*PSHHH*...You found him again!...*PSHHH*", "*PSHHH*... Hope he's close. Your device should give us more info...*PSHHH*",
  "*PSHHH*...There he is!...*PSHHH*", "*PSHHH*... He can't have much farther to go!...*PSHHH*",
  "*PSHHH*... Look like Echo's all safe and sound! WE DID IT!!...*PSHHH*"];
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
    //useScreenCoordinates: false,
  });
  var sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
  return sprite;
}

function makeTextLabel(x, y, z, name, img, map) {
  const material = new THREE.MeshPhongMaterial({});
 
  const cube = new THREE.Mesh(geometry, material);
  cube.scale.set(0.1, 0.1, 0.1);
  //hubScene.add(cube);
 
  cube.position.x = x;
  cube.position.y = y;
  cube.position.z = z;
  
  let elem = document.createElement('div');
  elem.textContent = name;
  labelContainerElem.appendChild(elem);
  
  if(map)
  {
    elem.className = "map";
  }
  if(img)
  {
    const img = document.createElement('img');
    img.src = "/resources/images/exit-icon.png";
    elem.appendChild(img);
  }
 
  return {cube, elem};
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
  // sprite_deathValley.userData.locName = "Black Mesa";
  sprite_grandCanyon.userData.locName = "Grand Canyon";
  sprite_coloradoRiver.userData.locName = "Colorado River";
  sprite_phoenix.userData.locName = "Phoenix";
  sprite_tempe.userData.locName = "Tempe";
  sprite_tuscon.userData.locName = "Tuscon";
  sprite_catalinaMountains.userData.locName = "Catalina Mountains";
  sprite_sonoranDesert.userData.locName = "Sonoran Desert";
  sprite_rooseveltLake.userData.locName = "Roosevelt Lake";
  sprite_gilaRiver.userData.locName = "Gila River";
  sprite_saltRiver.userData.locName = "Salt River";
  sprite_cathedralRock.userData.locName = "Cathedral Rock";
  sprite_fatmansLoop.userData.locName = "Fatman's Loop";
  sprite_horseshoeBend.userData.locName = "Horshoe Bend";
  sprite_micaViewTrail.userData.locName = "Mica View Trail";
  sprite_navajoPoint.userData.locName = "Navajo Point";
  sprite_paintedDesert.userData.locName = "Painted Desert";
  sprite_peoria.userData.locName = "Peoria";
  sprite_petrifiedForest.userData.locName = "Petrified Forest";
  sprite_superstitionMnts.userData.locName = "Superstition Mts.";
  sprite_saguaroNatPark.userData.locName = "Saguaro Nat Park";
  sprite_sanSimon.userData.locName = "San Simon Rest Area";
  sprite_scaddanWash.userData.locName = "Scaddan Wash";
  sprite_tanqueVerde.userData.locName = "Tanque Verde";
  sprite_wymola.userData.locName = "Wymola";
  sprite_chiricahuaMnts.userData.locName = "Chiricahua Mts."

  // sprite_deathValley.userData.popup = true;
  // sprite_deathValley.userData.popupTitle = "Black Mesa";
  // sprite_deathValley.userData.popupText =
  //   "Death Valley is a vast national park with over 3 million acres of designated wilderness and hundreds of miles of backcountry roads.";
  // sprite_deathValley.userData.satelliteImage =
  //   "/resources/images/landsat/algodones-dunes.jpg";
  // sprite_deathValley.userData.img = "/resources/images/location/death-valley.jpg";
  // sprite_deathValley.userData.index = 0;

  sprite_grandCanyon.userData.popup = true;
  sprite_grandCanyon.userData.popupTitle = "Grand Canyon";
  sprite_grandCanyon.userData.popupText =
    "Steep cliffs can be seen lining the rim of the Grand Canyon";
  sprite_grandCanyon.userData.satelliteImage =
    "/resources/images/landsat/grand-canyon.jpg";
  sprite_grandCanyon.userData.img = "/resources/images/location/grandCanyon.jpg";
  sprite_grandCanyon.userData.index = 1;

  sprite_coloradoRiver.userData.popup = true;
  sprite_coloradoRiver.userData.popupTitle = "Colorado River";
  sprite_coloradoRiver.userData.popupText =
    "The Colorado River can be seen winding through the Grand Canyon";
  sprite_coloradoRiver.userData.satelliteImage =
    "/resources/images/landsat/colorado-river.jpg";
  sprite_coloradoRiver.userData.img = "/resources/images/location/colorado-river.jpg";
  sprite_coloradoRiver.userData.index = 2;

  sprite_phoenix.userData.popup = false;
  sprite_phoenix.userData.popupTitle = "Phoenix";
  sprite_phoenix.userData.popupText =
    "Mountains in Phoenix overlook the tan neighborhoods";
  sprite_phoenix.userData.satelliteImage =
    "/resources/images/landsat/phoenix.jpg";
  sprite_phoenix.userData.img = "/resources/images/location/phoenix.jpg";
  sprite_phoenix.userData.index = 3;
  sprite_phoenix.userData.newScene = true;
  sprite_phoenix.userData.ping = true;

  sprite_tempe.userData.popup = true;
  sprite_tempe.userData.popupTitle = "Tempe";
  sprite_tempe.userData.popupText =
    "Farms look like green and brown rectangles and the mountains look bumpy from above.";
  sprite_tempe.userData.satelliteImage = "/resources/images/landsat/tempe.jpg";
  sprite_tempe.userData.img = "/resources/images/location/tempe.jpg";
  sprite_tempe.userData.index = 4;

  sprite_tuscon.userData.popup = true;
  sprite_tuscon.userData.popupTitle = "Tuscon";
  sprite_tuscon.userData.popupText =
    "Highway 10 cuts through the pattern of streets in Tucson.";
  sprite_tuscon.userData.satelliteImage = "/resources/images/landsat/tuscon.jpg";
  sprite_tuscon.userData.img = "/resources/images/location/tuscon.jpg";
  sprite_tuscon.userData.index = 5;

  sprite_catalinaMountains.userData.popup = true;
  sprite_catalinaMountains.userData.popupTitle = "Catalina Mountains";
  sprite_catalinaMountains.userData.popupText =
    "The Catalina Mountains are covered with oak, pine, and fir trees.";
  sprite_catalinaMountains.userData.satelliteImage =
    "/resources/images/landsat/catalina-mountains.jpg";
  sprite_catalinaMountains.userData.img =
    "/resources/images/location/catalina-mountains.jpg";
  sprite_catalinaMountains.userData.index = 6;

  sprite_sonoranDesert.userData.popup = true;
  sprite_sonoranDesert.userData.popupTitle = "Sonoran Desert";
  sprite_sonoranDesert.userData.popupText =
    "Mountains tower over the landscape of the Sonoran Desert.";
  sprite_sonoranDesert.userData.satelliteImage =
    "/resources/images/landsat/sonoran-desert.jpg";
  sprite_sonoranDesert.userData.img = "/resources/images/location/sonoran-desert.jpg";
  sprite_sonoranDesert.userData.index = 7;

  sprite_rooseveltLake.userData.popup = true;
  sprite_rooseveltLake.userData.popupTitle = "Roosevelt Lake";
  sprite_rooseveltLake.userData.popupText =
    "The dam and bridge on Roosevelt Lake can be seen from space.";
  sprite_rooseveltLake.userData.satelliteImage =
    "/resources/images/landsat/roosevelt-lake.jpg";
  sprite_rooseveltLake.userData.img = "/resources/images/location/roosevelt-lake.jpg";
  sprite_rooseveltLake.userData.index = 8;

  sprite_gilaRiver.userData.popup = true;
  sprite_gilaRiver.userData.popupTitle = "Gila River";
  sprite_gilaRiver.userData.popupText =
    "Farms in the desert are irrigated with water from the Gila River.";
  sprite_gilaRiver.userData.satelliteImage = "/resources/images/landsat/yuma.jpg";
  sprite_gilaRiver.userData.img = "/resources/images/location/yuma.jpg";
  sprite_gilaRiver.userData.index = 9;

  sprite_saltRiver.userData.popup = true;
  sprite_saltRiver.userData.popupTitle = "Salt River";
  sprite_saltRiver.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_saltRiver.userData.satelliteImage =
    "/resources/images/landsat/salt-river.jpg";
  sprite_saltRiver.userData.img = "/resources/images/location/salt-river.jpg";
  sprite_saltRiver.userData.index = 10;

  sprite_cathedralRock.userData.popup = true;
  sprite_cathedralRock.userData.popupTitle = "Cathedral Rock";
  sprite_cathedralRock.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_cathedralRock.userData.satelliteImage =
    "/resources/images/landsat/cathedral-rock.jpg";
  sprite_cathedralRock.userData.img = "/resources/images/location/cathedralRock.jpg";
  sprite_cathedralRock.userData.index = 11;

  sprite_fatmansLoop.userData.popup = true;
  sprite_fatmansLoop.userData.popupTitle = "Fatman's Loop";
  sprite_fatmansLoop.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_fatmansLoop.userData.satelliteImage =
    "/resources/images/landsat/fatmans-loop.jpg";
  sprite_fatmansLoop.userData.img = "/resources/images/location/fatmansLoop.jpg";
  sprite_fatmansLoop.userData.index = 12;

  sprite_horseshoeBend.userData.popup = true;
  sprite_horseshoeBend.userData.popupTitle = "Horseshoe Bend";
  sprite_horseshoeBend.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_horseshoeBend.userData.satelliteImage =
    "/resources/images/landsat/horseshoe-bend.jpg";
  sprite_horseshoeBend.userData.img = "/resources/images/location/horseshoeBend.jpg";
  sprite_horseshoeBend.userData.index = 13;

  sprite_micaViewTrail.userData.popup = true;
  sprite_micaViewTrail.userData.popupTitle = "Mica View Trail";
  sprite_micaViewTrail.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_micaViewTrail.userData.satelliteImage =
    "/resources/images/landsat/mica-view-trail.jpg";
  sprite_micaViewTrail.userData.img = "/resources/images/location/micaViewTrail.jpg";
  sprite_micaViewTrail.userData.index = 14;

  sprite_navajoPoint.userData.popup = true;
  sprite_navajoPoint.userData.popupTitle = "Navajo Point";
  sprite_navajoPoint.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_navajoPoint.userData.satelliteImage =
    "/resources/images/landsat/navajo-point.jpg";
  sprite_navajoPoint.userData.img = "/resources/images/location/navajoPoint.jpg";
  sprite_navajoPoint.userData.index = 15;

  sprite_paintedDesert.userData.popup = true;
  sprite_paintedDesert.userData.popupTitle = "Painted Desert";
  sprite_paintedDesert.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_paintedDesert.userData.satelliteImage =
    "/resources/images/landsat/painted-desert.jpg";
  sprite_paintedDesert.userData.img = "/resources/images/location/paintedDesert.jpg";
  sprite_paintedDesert.userData.index = 16;

  sprite_peoria.userData.popup = true;
  sprite_peoria.userData.popupTitle = "Peoria";
  sprite_peoria.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_peoria.userData.satelliteImage =
    "/resources/images/landsat/peoria.jpg";
  sprite_peoria.userData.img = "/resources/images/location/peoria.jpg";
  sprite_peoria.userData.index = 17;

  sprite_petrifiedForest.userData.popup = true;
  sprite_petrifiedForest.userData.popupTitle = "Petrified Forest";
  sprite_petrifiedForest.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_petrifiedForest.userData.satelliteImage =
    "/resources/images/landsat/petrified-forest.jpg";
  sprite_petrifiedForest.userData.img = "/resources/images/location/petrifiedForest.jpg";
  sprite_petrifiedForest.userData.index = 18;

  sprite_superstitionMnts.userData.popup = true;
  sprite_superstitionMnts.userData.popupTitle = "Superstition Mountains";
  sprite_superstitionMnts.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_superstitionMnts.userData.satelliteImage =
    "/resources/images/landsat/superstition-mnts.jpg";
  sprite_superstitionMnts.userData.img = "/resources/images/location/superstition-mnts.jpg";
  sprite_superstitionMnts.userData.index = 19;

  sprite_saguaroNatPark.userData.popup = true;
  sprite_saguaroNatPark.userData.popupTitle = "Saguaro Nat Park";
  sprite_saguaroNatPark.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_saguaroNatPark.userData.satelliteImage =
    "/resources/images/landsat/saguaro-nat-park.jpg";
  sprite_saguaroNatPark.userData.img = "/resources/images/location/saguaroNatPark.jpg";
  sprite_saguaroNatPark.userData.index = 20;

  sprite_sanSimon.userData.popup = true;
  sprite_sanSimon.userData.popupTitle = "San Simon Rest Area";
  sprite_sanSimon.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_sanSimon.userData.satelliteImage =
    "/resources/images/landsat/sanSimon-restArea.jpg";
  sprite_sanSimon.userData.img = "/resources/images/location/sanSimonRestArea.jpg";
  sprite_sanSimon.userData.index = 21;

  sprite_scaddanWash.userData.popup = true;
  sprite_scaddanWash.userData.popupTitle = "Scaddan Wash";
  sprite_scaddanWash.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_scaddanWash.userData.satelliteImage =
    "/resources/images/landsat/scaddan-wash.jpg";
  sprite_scaddanWash.userData.img = "/resources/images/location/scaddanWash.jpg";
  sprite_scaddanWash.userData.index = 22;

  sprite_tanqueVerde.userData.popup = true;
  sprite_tanqueVerde.userData.popupTitle = "Tanque Verde";
  sprite_tanqueVerde.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_tanqueVerde.userData.satelliteImage =
    "/resources/images/landsat/tanque-verde.jpg";
  sprite_tanqueVerde.userData.img = "/resources/images/location/tanqueVerde.jpg";
  sprite_tanqueVerde.userData.index = 23;

  sprite_wymola.userData.popup = true;
  sprite_wymola.userData.popupTitle = "Wymola";
  sprite_wymola.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_wymola.userData.satelliteImage =
    "/resources/images/landsat/wymola.jpg";
  sprite_wymola.userData.img = "/resources/images/location/wymola.jpg";
  sprite_wymola.userData.index = 24;

  sprite_chiricahuaMnts.userData.popup = true;
  sprite_chiricahuaMnts.userData.popupTitle = "Chiricahua Mountains";
  sprite_chiricahuaMnts.userData.popupText = "A dam on the Salt River formed Apache Lake.";
  sprite_chiricahuaMnts.userData.satelliteImage =
    "/resources/images/landsat/chiricahua-mts.jpg";
  sprite_chiricahuaMnts.userData.img = "/resources/images/location/chiricahua-mts.jpg";
  sprite_chiricahuaMnts.userData.index = 25;
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
  towerIcon2.position.set(-2.3, uiMinheight, 0.2);
  towerIcon3.position.set(4.1, uiMinheight, -6.2);
  towerIcon4.position.set(2.46, uiMinheight, -1.43);
  towerIcon5.position.set(-2.74, uiMinheight, 3.3);
}

//** SETUP FOR LESSON SEQUENCES */
function lessonSequenceSetup()
{
  lesson1Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
   "",
    "https://www.youtube.com/embed/DGE-N8_LQBo?enablejsapi=1&rel=0",
     "done"];
  
  lesson2Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
  "",
   "https://www.youtube.com/embed/DGE-N8_LQBo?enablejsapi=1&rel=0",
    "done"];

  lesson3Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
  "",
   "https://www.youtube.com/embed/DGE-N8_LQBo?enablejsapi=1&rel=0",
    "done"];
   
  lesson4Sequence = ["https://www.youtube.com/embed/yrs9IkbkfQE?enablejsapi=1&rel=0",
  "",
   "https://www.youtube.com/embed/DGE-N8_LQBo?enablejsapi=1&rel=0",
    "done"];
  
  lessonSequences = [lesson1Sequence, lesson2Sequence, lesson3Sequence, lesson4Sequence];

  //console.log("Lesson Sequences " + lessonSequences[0][0]);
}

//** INITIALIZES ANIMATED SPRITE  */
function makeEchoPing(x, z) {
  //****PING LOCATION SPRITE */
  var pingLocationTexture = new THREE.TextureLoader().load(
    "/resources/sprites/LocationPing-sheet-new.png"
  );
  var pingLocationSprite = new TextureAnimator(
    pingLocationTexture,
    17,
    2,
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
  pingLocationMesh.name = "ping";
  mapScene.add(pingLocationMesh);

  //const elem = locationNameElem;
  //elem.textContent = "ECHO SPOTTED!";
  //labelContainerElem.appendChild(elem);

  return { pingLocationMesh, elem };
}

function makeAnimSprite(x, y, z) {
  
  if(!lessonScene.getObjectByName('hearts'))
  {
    var animSpriteTexture = new THREE.ImageUtils.loadTexture( '/resources/sprites/Hearts-13x4.png' );
    heartSprite = new TextureAnimator( animSpriteTexture, 13, 5, 30, 52 ); // texture, #horiz, #vert, #total, duration.
    var animSpriteMaterial = new THREE.MeshBasicMaterial( { map: animSpriteTexture, side:THREE.DoubleSide, transparent: true, opacity: 1 } );
    var animSpriteGeometry = new THREE.PlaneGeometry(50, 50, 1, 1);
    var animSpriteMesh = new THREE.Mesh(animSpriteGeometry, animSpriteMaterial);
    animSpriteMesh.position.set(-3, -0.1, 0.147);
    animSpriteMesh.scale.set(0.01, 0.01, 0.01);
    animSpriteMesh.rotation.y = Math.PI / -2;
    animSpriteMesh.name = "hearts";
    animSpriteMesh.renderOrder = 3;
  
    lessonScene.add(animSpriteMesh);

    console.log("HEARTS DON'T EXIST");
  }
  else
  {
    console.log("HEARTS DO EXIST");
  }

  if(echoFeedTimeout)
  {
    clearTimeout(echoFeedTimeout);
  }

  playEchoAnimation(4);
  console.log("Un-Wrapping");
  echoFeedTimeout = setTimeout(function() 
  {
    playEchoAnimation(1);
    console.log("Flailing");
    setTimeout(function() 
    {
      playEchoAnimation(5);
      console.log("wrapping");
      setTimeout(function() 
      {
        lessonScene.remove(animSpriteMesh);
      }, 3000);
    }, 2000);
  }, 3000);
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

  //sceneTransitionSprites

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
function updateLessonScene(index)
{
  echoClicked = false;
  bugClicked = false;

  if(echoLocTween)
  {
    echoLocTween.stop();
  }
  if(echoRotTween)
  {
    echoRotTween.stop();
  }
  if(echoScaleTween)
  {
    echoScaleTween.stop();
  }

  console.log("UPDATE LESSON SCENE!!!");

  //** UPDATE SCENE FROM WALKIE TALKIE FUNCTION */
  if(index != null)
  {
    console.log("Update lesson scene: " + index);
    
    //** BACK TO PHOENIX SCENE */
    if(index == 0)
    {
      //** FROM HORSESHOE BEND */
      lessonScene.remove(Echo);
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(filmPass); 
      lessonScene.fog = new THREE.Fog(0xffffff, 0.1, 0);

      //** IF THE BUG HAS ALREADY BEEN FOUND */
      if(bugsFound.includes(0))
      {
        lessonScene.remove(outlineBug);
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 6000);
      }
      else
      {
        if(!lessonScene.getObjectByName('outlineBug'))
        {
          console.log("ADDED OUTLINE BUG BACK");
          lessonScene.add(outlineBug);
        }
        
        outlineBug.rotation.set(-0.25, -0.06, -0.25);
        outlineBug.position.set(-2.41, -1.01, 1.48);
        outlineBug.scale.set(.5, .5, .5);
        outlineBug.children[0].children[0].material.map = bugTexture_blue;
        outlineBug.children[0].children[0].material.map.flipY = false;
        outlineBug.children[0].children[0].material.map.needsUpdate = true;
        
        bugFlyTween = new TWEEN.Tween(outlineBug.position)
          .to({ y: -0.63}, 3000)
          .yoyo(true)
          .repeat(Infinity);
        bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
        bugFlyTween.start();
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 10000);
      }

      //** IF COMING FROM GRAND CANYON */
      if(lessonsCompleted == 1)
      {
        lessonScene.remove(grandCanyonModel);
        lessonScene.add(phoenixModel);
      }
      //** IF COMING FROM CATHEDRAL ROCK */
      else if(lessonsCompleted == 2)
      {
        lessonScene.remove(grasshopperModel);
        lessonScene.add(phoenixModel);
      }
      //** IF COMING FROM BLACK MESA */
      else if(lessonsCompleted == 3)
      {
        lessonScene.remove(blackMesaModel);
        lessonScene.add(phoenixModel);
      }
      //** IF COMING FROM TUSCON */
      else if(lessonsCompleted == 4)
      {
        if(lessonScene.getObjectByName('bugBlue'))
        {
          bugBlue.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugYellow'))
        {
          bugYellow.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugRed'))
        {
          bugRed.position.set(0, -5, 0);
          console.log("get rid of bug red");
        }
        if(lessonScene.getObjectByName('bugGreen'))
        {
          bugGreen.position.set(0, -5, 0);
          console.log("get rid of bug green");
        }
        
        lessonScene.remove(cave);
        lessonScene.remove(EchoMom);
        lessonScene.add(phoenixModel);
      }
    }
    //** BACK TO HORSESHOE SCENE */
    else if(index == 1)
    {
      lessonScene.remove(Echo);
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(filmPass); 
      lessonScene.fog.color.set("#FFFFFF");
      lessonScene.fog.far = 25;

      //** IF THE BUG HAS ALREADY BEEN FOUND */
      if(bugsFound.includes(1))
      {
        lessonScene.remove(outlineBug);
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 6000);
      }
      else
      {
        if(!lessonScene.getObjectByName('outlineBug'))
        {
          console.log("ADDED OUTLINE BUG BACK");
          lessonScene.add(outlineBug);
        }
        
        outlineBug.rotation.set(-0.4, 0.12, 0);
        outlineBug.position.set(0.39, -1.2, 0.79);
        outlineBug.scale.set(.125, .125, .125);
        outlineBug.children[0].children[0].material.map = bugTexture_yellow;
        outlineBug.children[0].children[0].material.map.flipY = false;
        outlineBug.children[0].children[0].material.map.needsUpdate = true;

        bugFlyTween = new TWEEN.Tween(outlineBug.position)
        .to({ y: -1.1}, 4000)
        .yoyo(true)
        .repeat(Infinity);
        bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
        bugFlyTween.start();
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 10000);
      }

      //** IF COMING FROM CATHEDRAL ROCK */
      if(lessonsCompleted == 2)
      {
        lessonScene.remove(grasshopperModel);
        lessonScene.add(grandCanyonModel);
      }
      //** IF COMING FROM BLACK MESA */
      else if(lessonsCompleted == 3)
      {
        lessonScene.remove(blackMesaModel);
        lessonScene.add(grandCanyonModel);
      }
      //** IF COMING FROM TUSCON */
      else if(lessonsCompleted == 4)
      {
        if(lessonScene.getObjectByName('bugBlue'))
        {
          bugBlue.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugYellow'))
        {
          bugYellow.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugRed'))
        {
          bugRed.position.set(0, -5, 0);
          console.log("get rid of bug red");
        }
        if(lessonScene.getObjectByName('bugGreen'))
        {
          bugGreen.position.set(0, -5, 0);
          console.log("get rid of bug green");
        }
        
        lessonScene.remove(cave);
        lessonScene.remove(EchoMom);
        lessonScene.add(grandCanyonModel);
      }
    }
    //** BACK TO CATHEDRAL ROCK SCENE */
    else if(index == 2)
    {
      lessonScene.remove(Echo);
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(filmPass); 
      lessonScene.fog.near = 0.015;
      lessonScene.fog.far = 1000;
      lessonScene.fog.color.set("#ffffff");

      //** IF THE BUG HAS ALREADY BEEN FOUND */
      if(bugsFound.includes(2))
      {
        lessonScene.remove(outlineBug);
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 6000);
      }
      else
      {
        if(!lessonScene.getObjectByName('outlineBug'))
        {
          console.log("ADDED OUTLINE BUG BACK");
          lessonScene.add(outlineBug);
        }
        
        outlineBug.position.set(0.23, -1.03, 0.926);
        outlineBug.rotation.set(-0.49, -0.49, -0.375);
        outlineBug.scale.set(0.1, 0.1, 0.1);
        outlineBug.children[0].children[0].material.map = bugTexture_red;
        outlineBug.children[0].children[0].material.map.flipY = false;
        outlineBug.children[0].children[0].material.map.needsUpdate = true;

        bugFlyTween = new TWEEN.Tween(outlineBug.position)
        .to({ y: -0.9}, 4000)
        .yoyo(true)
        .repeat(Infinity);
        bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
        bugFlyTween.start();
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 10000);
      }
      //** IF COMING FROM BLACK MESA */
      if(lessonsCompleted == 3)
      {
        lessonScene.remove(blackMesaModel);
        lessonScene.add(grasshopperModel);
      }
      //** IF COMING FROM TUSCON */
      else if(lessonsCompleted == 4)
      {
        if(lessonScene.getObjectByName('bugBlue'))
        {
          bugBlue.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugYellow'))
        {
          bugYellow.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugRed'))
        {
          bugRed.position.set(0, -5, 0);
          console.log("get rid of bug red");
        }
        if(lessonScene.getObjectByName('bugGreen'))
        {
          bugGreen.position.set(0, -5, 0);
          console.log("get rid of bug green");
        }
        
        lessonScene.remove(cave);
        lessonScene.remove(EchoMom);
        lessonScene.add(grasshopperModel);
      }
    }
    //** BACK TO BLAC MESA SCENE */
    else if(index == 3)
    {
      lessonScene.remove(Echo);
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(filmPass); 
      lessonScene.fog.near = 0.015;
      lessonScene.fog.far = 150;
      lessonScene.fog.color.set("#ffffff");

      //** IF THE BUG HAS ALREADY BEEN FOUND */
      if(bugsFound.includes(3))
      {
        lessonScene.remove(outlineBug);
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 6000);
      }
      else
      {
        if(!lessonScene.getObjectByName('outlineBug'))
        {
          console.log("ADDED OUTLINE BUG BACK");
          lessonScene.add(outlineBug);
        }
        
        outlineBug.position.set(-3.85, -1.89, -8.21);
        outlineBug.rotation.set(0.57, 3.18, 0.23);
        outlineBug.scale.set(0.5, 0.5, 0.5);
        outlineBug.children[0].children[0].material.map = bugTexture_green;
        outlineBug.children[0].children[0].material.map.flipY = false;
        outlineBug.children[0].children[0].material.map.needsUpdate = true;

        bugFlyTween = new TWEEN.Tween(outlineBug.position)
        .to({ y: -1.24}, 4000)
        .yoyo(true)
        .repeat(Infinity);
        bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
        bugFlyTween.start();
        
        setTimeout(function() 
        {
          toggleLessonPopup();
          startLesson();
        }, 10000);
      }
      //** IF COMING FROM TUSCON */
      if(lessonsCompleted == 4)
      {
        if(lessonScene.getObjectByName('bugBlue'))
        {
          bugBlue.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugYellow'))
        {
          bugYellow.position.set(0, -5, 0);
          console.log("get rid of bug blue");
        }
        if(lessonScene.getObjectByName('bugRed'))
        {
          bugRed.position.set(0, -5, 0);
          console.log("get rid of bug red");
        }
        if(lessonScene.getObjectByName('bugGreen'))
        {
          bugGreen.position.set(0, -5, 0);
          console.log("get rid of bug green");
        }
        
        lessonScene.remove(cave);
        lessonScene.remove(EchoMom);
        lessonScene.add(blackMesaModel);
      }
    }
  }
  else
  {
    console.log(bugsFound);
    
    //** REMOVING OBJECTS BASED ON WHAT CURRENT SCENE IS OPEN */
    if(!lessonScene.getObjectByName('Echo'))
    {
      console.log("ADDED ECHO BACK");
      lessonScene.add(Echo);
    }
    if(!lessonScene.getObjectByName('outlineBug'))
    {
      console.log("ADDED OUTLINE BUG BACK");
      lessonScene.add(outlineBug);
    }
    if(lessonScene.getObjectByName('phoenixModel'))
    {
      lessonScene.remove(phoenixModel);
    }
    else if(lessonScene.getObjectByName('grandCanyonModel'))
    {
      lessonScene.remove(grandCanyonModel);
    }
    else if(lessonScene.getObjectByName('cathedralRockModel'))
    {
      lessonScene.remove(grasshopperModel);
    }
    else if(lessonScene.getObjectByName('blackMesaModel'))
    {
      lessonScene.remove(blackMesaModel);
    }
    else if(lessonScene.getObjectByName('cave'))
    {
      lessonScene.remove(cave);
      lessonScene.remove(EchoMom);
    }

    console.log("blue: " + bugBlue);
    console.log("yellow: " + bugYellow);
    console.log("red: " + bugRed);
    console.log("green: " + bugYellow);

    //**HORSESHOE BEND SCENE**//
    if(lessonsCompleted == 1)
    { 
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(filmPass); 
      
      Echo.position.set(0.621, -1.14, -0.05);
      Echo.rotation.set(0, 0, 0);
      Echo.scale.set(0.03, 0.03, 0.03);
      playEchoAnimation(1);
  
      console.log("UPDATE SCENE");
      lessonScene.remove(phoenixModel);
      lessonScene.add(grandCanyonModel);
      //lessonCamera.setFocalLength(10);
      lessonScene.fog.color.set("#FFFFFF");
      lessonScene.fog.far = 25;
      
      outlineBug.rotation.set(-0.4, 0.12, 0);
      outlineBug.position.set(0.39, -1.2, 0.79);
      outlineBug.scale.set(.125, .125, .125);
      outlineBug.children[0].children[0].material.map = bugTexture_yellow;
      outlineBug.children[0].children[0].material.map.flipY = false;
      outlineBug.children[0].children[0].material.map.needsUpdate = true;
  
      bugFlyTween = new TWEEN.Tween(outlineBug.position)
      .to({ y: -1.1}, 4000)
      .yoyo(true)
      .repeat(Infinity);
      bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
      bugFlyTween.start();
  
      // bugRotTween = new TWEEN.Tween(outlineBug.rotation)
      // .to({x: 0.5, y: -4, z: 0.25}, 3750)
      // .yoyo(true)
      // .repeat(Infinity);
      // bugRotTween.easing(TWEEN.Easing.Quadratic.InOut);
      // bugRotTween.start();
  
    }
    //** CATHEDRAL ROCK */
    else if(lessonsCompleted == 2)
    {
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(filmPass); 
      
      Echo.position.set(0.465, -1.075, -0.05);
      Echo.rotation.set(0, 0, 0);
      Echo.scale.set(0.03, 0.03, 0.03);
      playEchoAnimation(5);
      lessonScene.remove(grandCanyonModel);
      lessonScene.add(grasshopperModel);
  
      outlineBug.position.set(0.23, -1.03, 0.926);
      outlineBug.rotation.set(-0.49, -0.49, -0.375);
      outlineBug.scale.set(0.1, 0.1, 0.1);
      outlineBug.children[0].children[0].material.map = bugTexture_red;
      outlineBug.children[0].children[0].material.map.flipY = false;
      outlineBug.children[0].children[0].material.map.needsUpdate = true;
  
      bugFlyTween = new TWEEN.Tween(outlineBug.position)
      .to({ y: -0.9}, 4000)
      .yoyo(true)
      .repeat(Infinity);
      bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
      bugFlyTween.start();
  
      // bugRotTween = new TWEEN.Tween(outlineBug.rotation)
      // .to({x: 0.5, y: 1, z: 0.25}, 3750)
      // .yoyo(true)
      // .repeat(Infinity);
      // bugRotTween.easing(TWEEN.Easing.Quadratic.InOut);
      // bugRotTween.start();

      lessonScene.fog.near = 0.015;
      lessonScene.fog.far = 1000;
      lessonScene.fog.color.set("#ffffff");
  
      lessonScene.add(pointLight);
      lessonScene.add(pointLight2);
      lessonScene.add(pointLight3);
      lessonScene.add(pointLight4);
  
      console.log("GRASSHOPPER!!!");
    }
    //** BLACK MESA */
    else if(lessonsCompleted == 3)
    {
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
        );
      lessonComposer.addPass(filmPass); 
      
      Echo.position.set(0.29, -1.11, -0.05);
      Echo.rotation.set(0, 0, 0);
      Echo.scale.set(0.03, 0.03, -0.03);
      playEchoAnimation(5);

      bugFlyTween = new TWEEN.Tween(outlineBug.position)
      .to({ y: -1.24}, 4000)
      .yoyo(true)
      .repeat(Infinity);
      bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
      bugFlyTween.start();
  
      lessonScene.remove(grasshopperModel);
      lessonScene.add(blackMesaModel);
  
      lessonScene.fog.near = 0.015;
      lessonScene.fog.far = 2000;
      lessonScene.fog.color.set("#ffffff");
  
      outlineBug.position.set(-3.85, -1.89, -8.21);
      outlineBug.rotation.set(0.57, 3.18, 0.23);
      outlineBug.scale.set(0.5, 0.5, 0.5);
      outlineBug.children[0].children[0].material.map = bugTexture_green;
      outlineBug.children[0].children[0].material.map.flipY = false;
      outlineBug.children[0].children[0].material.map.needsUpdate = true;
  
      lessonScene.add(pointLight);
      lessonScene.add(pointLight2);
      lessonScene.add(pointLight3);
      lessonScene.add(pointLight4);
    }
    //**CAVE SCENE**//
    else if(lessonsCompleted == 4)
    {
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(bloomPass); 
      lessonComposer.addPass(filmPass);
      
      bugsEaten = 0;
      
      Echo.position.set(-3.75, -0.03, 0.147);
      Echo.rotation.set(-3, 0, 0);
      Echo.scale.set(0.2, 0.2, 0.2);
      var bbox = new THREE.Box3().setFromObject(Echo);

      const geometry = new THREE.PlaneGeometry( 1, 1 );
      const material = new THREE.MeshBasicMaterial( {transparent: true, side: THREE.DoubleSide, opacity: 0} );
      
      lessonScene.remove(blackMesaModel);
      lessonScene.remove(outlineBug);
      lessonScene.add(cave);
      lessonScene.add(EchoMom);
      filmPass.grayscale = true;
      lessonSubtitleSequenceNumber = 8;
      playEchoAnimation(5);

      //** ADDS BUGS DEPENDING ON WHICH ONES YOU HAVE COLLECTED */
      console.log(bugsFound.length);
      for(var i = 0; i < bugsFound.length; i++)
      {
        //var newBug = outlineBug.clone(true);
  
        //** PHOENIX BUG */
        if(bugsFound[i] == 0)
        {
          if(!lessonScene.getObjectByName('bugBlue'))
          {
            bugBlue = bugTogether.clone(true);
            var blueBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
            bugBlue.children[0].children[0].material = blueBugMaterial;
    
            bugBlue.children[0].children[0].material.map = bugTexture_blue;
            bugBlue.children[0].children[0].material.map.flipY = false;
            bugBlue.children[0].children[0].material.map.needsUpdate = true;
            bugBlue.position.set(-2.88, -2.5, bugLocations[i]);
            bugBlue.rotation.set(0, -1, 0);
            bugBlue.scale.set(0.5, 0.5, 0.5);
            bugBlue.name = "bugBlue";
            lessonScene.add(bugBlue);
            dragabbleObjects.push(bugBlue);
          }
          else
          {
            bugBlue.position.set(-2.88, -2.5, bugLocations[i]);
            bugBlue.scale.set(0.5, 0.5, 0.5);
            bugBlue.rotation.set(0, -1, 0);
          }
        }
        //** HORSESHOEBEND BUG */
        else if(bugsFound[i] == 1)
        {
          
          if(!lessonScene.getObjectByName('bugYellow'))
          {
            bugYellow = bugTogether.clone(true);
            var yellowBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
            bugYellow.children[0].children[0].material = yellowBugMaterial;
    
            bugYellow.children[0].children[0].material.map = bugTexture_yellow;
            bugYellow.children[0].children[0].material.map.flipY = false;
            bugYellow.children[0].children[0].material.map.needsUpdate = true;
            bugYellow.position.set(-2.88, -2.5, bugLocations[i]);
            bugYellow.rotation.set(bugYellow.rotation.x, -1.25, bugYellow.rotation.x);
            bugYellow.scale.set(0.5, 0.5, 0.5);
            
            bugYellow.name = "bugYellow";
            lessonScene.add(bugYellow);
            dragabbleObjects.push(bugYellow);
          }
          else
          {
            bugYellow.position.set(-2.88, -2.5, bugLocations[i]);
            bugYellow.scale.set(0.5, 0.5, 0.5);
            bugYellow.rotation.set(bugYellow.rotation.x, -1.25, bugYellow.rotation.x);
          }
        }
        //** CATHEDRAL ROCK BUG */
        else if(bugsFound[i] == 2)
        {
          
          if(!lessonScene.getObjectByName('bugRed'))
          {
            bugRed = bugTogether.clone(true);
            var redBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
            bugRed.children[0].children[0].material = redBugMaterial;
            
            bugRed.children[0].children[0].material.map = bugTexture_red;
            bugRed.children[0].children[0].material.map.flipY = false;
            bugRed.children[0].children[0].material.map.needsUpdate = true;
            bugRed.position.set(-2.88, -2.5, bugLocations[i]);
            bugRed.rotation.set(bugRed.rotation.x, -1.5, bugRed.rotation.x);
            bugRed.scale.set(0.5, 0.5, 0.5);

            bugRed.name = "bugRed";
            lessonScene.add(bugRed);
            dragabbleObjects.push(bugRed);
          }
          else
          {
            bugRed.position.set(-2.88, -2.5, bugLocations[i]);
            bugRed.rotation.set(bugRed.rotation.x, -1.5, bugRed.rotation.x);
            bugRed.scale.set(0.5, 0.5, 0.5);
          }
  
          console.log(bugRed.children[0].children[0].material.map);
        }
        //** BLACK MESA BUG */
        else if(bugsFound[i] == 3)
        {
          
          if(!lessonScene.getObjectByName('bugGreen'))
          {
            bugGreen = bugTogether.clone(true);
            var greenBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
            bugGreen.children[0].children[0].material = greenBugMaterial;
            
            bugGreen.children[0].children[0].material.map = bugTexture_green;
            bugGreen.children[0].children[0].material.map.flipY = false;
            bugGreen.children[0].children[0].material.map.needsUpdate = true;
            bugGreen.position.set(-2.88, -2.5, bugLocations[i]);
            bugGreen.rotation.set(bugGreen.rotation.x, -1, bugGreen.rotation.x);
            bugGreen.scale.set(0.5, 0.5, 0.5);
            bugGreen.name = "bugGreen";
            lessonScene.add(bugGreen);
            dragabbleObjects.push(bugGreen);
          }
          else
          {
            bugGreen.position.set(-2.88, -2.5, bugLocations[i]);
            bugGreen.rotation.set(bugGreen.rotation.x, -1, bugGreen.rotation.x);
            bugGreen.scale.set(0.5, 0.5, 0.5);
          }
        }
        
        //lessonScene.add(newBug);
        console.log("BUGS FOUND NUMBER:" + bugsFound[i]);
      }
  
      //lessonScene.background = new THREE.Color(0x000000);
      lessonScene.fog.near = 0.015;
      lessonScene.fog.far = 115;
      lessonScene.fog.color.set("#66000f");
      lessonScene.add(pointLight);
      lessonScene.add(pointLight2);
      lessonScene.add(pointLight3);
      lessonScene.add(pointLight4);
    }
    //**PHOENIX SCENE**//
    else if (lessonsCompleted == 0)
    {
      lessonComposer.removePass(filmPass);
      filmPass = new FilmPass(
        0.5,   // noise intensity
        0.1,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
      );
      lessonComposer.addPass(filmPass); 
      // console.log("UPDATE SCENE");
      // lessonScene.remove(grandCanyonModel);
      // lessonScene.add(phoenixModel);
      // //lessonCamera.setFocalLength(10);
  
      // lessonScene.fog.near = 0.1;
      // lessonScene.fog.far = 0;
  
      bugFlyTween = new TWEEN.Tween(outlineBug.position)
        .to({ y: -0.63}, 3000)
        .yoyo(true)
        .repeat(Infinity);
      bugFlyTween.easing(TWEEN.Easing.Quadratic.InOut);
      bugFlyTween.start();
      
      // outlineBug.rotation.set(0, -5.48, 0);
      // outlineBug.position.set(0.534, -1.325, 0.246);
      // outlineBug.scale.set(.125, .125, .125);
      // outlineBug.children[0].children[0].material.map = bugTexture_blue;
      // outlineBug.children[0].children[0].material.map.flipY = false;
      // outlineBug.children[0].children[0].material.map.needsUpdate = true;
    }
  }
  console.log("Lesson Index:" + currentLessonSceneIndex);

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

//** UPDATES HUBWORLD TO ADD BUGS TOO THE JAR */
function updateHubworldScene()
{
  console.log("UPDATE HUBWOLRD SCENE");
  
  //** PHOENIX BUG */
  for(var i = 0; i < bugsFound.length; i++)
  {
    if(bugsFound[i] == 0)
    {
      if(!hubScene.getObjectByName('hub_bugBlue'))
      {
        hub_bugBlue = bugTogether.clone(true);
        var blueBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
        hub_bugBlue.children[0].children[0].material = blueBugMaterial;
  
        hub_bugBlue.children[0].children[0].material.map = bugTexture_blue;
        hub_bugBlue.children[0].children[0].material.map.flipY = false;
        hub_bugBlue.children[0].children[0].material.map.needsUpdate = true;
        hub_bugBlue.position.set(-2.28, hub_bugLocations[i], 0.68);
        hub_bugBlue.rotation.set(-0.49, -0.49, -0.4);
        hub_bugBlue.scale.set(hub_scale, hub_scale, hub_scale);
        hub_bugBlue.name = "hub_bugBlue";
        hubScene.add(hub_bugBlue);

        console.log("MAKE BLUE BUG");
      }
      else
      {
        hub_bugBlue.position.set(hub_Bug_pos_x, hub_bugLocations[i], hub_Bug_pos_z);
        hub_bugBlue.rotation.set(-0.49, -0.49, -0.4);
        hub_bugBlue.scale.set(hub_scale, hub_scale, hub_scale);
      }
    }
    //** HORSESHOEBEND BUG */
    else if(bugsFound[i] == 1)
    {
      if(!hubScene.getObjectByName('hub_bugYellow'))
      {
        hub_bugYellow = bugTogether.clone(true);
        var yellowBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
        hub_bugYellow.children[0].children[0].material = yellowBugMaterial;
  
        hub_bugYellow.children[0].children[0].material.map = bugTexture_yellow;
        hub_bugYellow.children[0].children[0].material.map.flipY = false;
        hub_bugYellow.children[0].children[0].material.map.needsUpdate = true;
        hub_bugYellow.position.set(hub_Bug_pos_x, hub_bugLocations[i], hub_Bug_pos_z);
        hub_bugYellow.rotation.set(-2, -1, -2);
        hub_bugYellow.scale.set(hub_scale, hub_scale, hub_scale);
        hub_bugYellow.name = "hub_bugYellow";
        hubScene.add(hub_bugYellow);
      }
      else
      {
        hub_bugYellow.position.set(hub_Bug_pos_x, hub_bugLocations[i], hub_Bug_pos_z);
        hub_bugYellow.rotation.set(-2, -1, -2);
        hub_bugYellow.scale.set(hub_scale, hub_scale, hub_scale);
      }
    }
    //** CATHEDRAL ROCK BUG */
    else if(bugsFound[i] == 2)
    {
      
      if(!hubScene.getObjectByName('hub_bugRed'))
      {
        hub_bugRed = bugTogether.clone(true);
        var redBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
        hub_bugRed.children[0].children[0].material = redBugMaterial;
        
        hub_bugRed.children[0].children[0].material.map = bugTexture_red;
        hub_bugRed.children[0].children[0].material.map.flipY = false;
        hub_bugRed.children[0].children[0].material.map.needsUpdate = true;
        hub_bugRed.position.set(hub_Bug_pos_x, hub_bugLocations[i], hub_Bug_pos_z);
        hub_bugRed.rotation.set(-0.2, 2.83, 0.57);
        hub_bugRed.scale.set(hub_scale, hub_scale, hub_scale);
  
        hub_bugRed.name = "hub_bugRed";
        hubScene.add(hub_bugRed);
      }
      else
      {
        hub_bugRed.position.set(hub_Bug_pos_x, hub_bugLocations[i], hub_Bug_pos_z);
        hub_bugRed.rotation.set(-0.2, 2.83, 0.57);
        hub_bugRed.scale.set(hub_scale, hub_scale, hub_scale);
      }
  
      console.log(bugRed.children[0].children[0].material.map);
    }
    //** BLACK MESA BUG */
    else if(bugsFound[i] == 3)
    {
      
      if(!hubScene.getObjectByName('hub_bugGreen'))
      {
        hub_bugGreen = bugTogether.clone(true);
        var greenBugMaterial = new THREE.MeshBasicMaterial({transparent: true});
        hub_bugGreen.children[0].children[0].material = greenBugMaterial;
        
        hub_bugGreen.children[0].children[0].material.map = bugTexture_green;
        hub_bugGreen.children[0].children[0].material.map.flipY = false;
        hub_bugGreen.children[0].children[0].material.map.needsUpdate = true;
        hub_bugGreen.position.set(hub_Bug_pos_x, hub_bugLocations[i], hub_Bug_pos_z);
        hub_bugGreen.rotation.set(4, -1.15, -2.1);
        hub_bugGreen.scale.set(hub_scale, hub_scale, hub_scale);
        hub_bugGreen.name = "hub_bugGreen";
        hubScene.add(hub_bugGreen);
      }
      else
      {
        hub_bugGreen.position.set(hub_Bug_pos_x, hub_bugLocations[i], hub_Bug_pos_z);
        hub_bugGreen.rotation.set(4, -1.15, -2.1);
        hub_bugGreen.scale.set(hub_scale, hub_scale, hub_scale);
      }
    }
  }
}

//** RESET HUBWORLD OBJECTS TO ORGINIAL POSITIONS */
function resetHubWorld()
{
  //** SET HUB OBJECTS TO OG POSITIONS */
  hubCamera.position.set(0, 0, 0);
  garminModel.position.set(-1.9, -0.28, -0.3);
  garminHover = false;
  walkieTalkieScreenModel.material.opacity = 0;
  hubworldScreenClick = false;
}

//** USED WHEN THE LESSON IS DONE TO CHANGE WHICH POPUP LEADS TO THE NEXT LESSON */
function lessonComplete()
{
  sceneTransitionSprites[lessonsCompleted].userData.ping = false;
  sceneTransitionSprites[lessonsCompleted].userData.popup = true;
  
  //** PREVENT COMPLETING ANOTHER LESSON WHEN GOING BACK AGAIN */
  if(currentLessonSceneIndex >= lessonsCompleted)
  {
    lessonsCompleted++;
  }

  console.log("Lesson Scene Index: " + currentLessonSceneIndex);
  console.log("Lesson's completed " + lessonsCompleted);
  towerClicked = false;

  if(lessonsCompleted == 1)
  {
    sceneTransitionSprites[lessonsCompleted].userData.ping = true;
    sceneTransitionSprites[lessonsCompleted].userData.popup = false;
    document.getElementById("towerMessage").innerHTML = towerHints[1];
    
    if(!mapScene.getObjectByName("ping"))
    {
      console.log("ADDING A NEW PING");
      echoPingLocation = makeEchoPing(towerIcons[lessonsCompleted].position.x, towerIcons[lessonsCompleted].position.z);
    }
    
    
    //** SETUP ALL LOCATION SPRITES */
    lessonLocation_phoenix_sprite.material.opacity = 1;
    lessonLocation_horseshoe_sprite.material.opacity = 0.1;
    lessonLocation_cathedralRock_sprite.material.opacity = 0.1;
    lessonLocation_blackMesa_sprite.material.opacity = 0.1;
    
    garminModel.add(lessonLocation_phoenix_sprite);
    garminModel.add(lessonLocation_horseshoe_sprite);
    garminModel.add(lessonLocation_cathedralRock_sprite);
    garminModel.add(lessonLocation_blackMesa_sprite);
  }
  else if(lessonsCompleted == 2)
  {
    sceneTransitionSprites[lessonsCompleted].userData.ping = true;
    sceneTransitionSprites[lessonsCompleted].userData.popup = false;
    document.getElementById("towerMessage").innerHTML = towerHints[2];
    
    if(!mapScene.getObjectByName("ping"))
    {
      console.log("ADDING A NEW PING");
      echoPingLocation = makeEchoPing(towerIcons[lessonsCompleted].position.x, towerIcons[lessonsCompleted].position.z);
    }

    lessonLocation_horseshoe_sprite.material.opacity = 1;
  }
  else if(lessonsCompleted == 3)
  {
    sceneTransitionSprites[lessonsCompleted].userData.ping = true;
    sceneTransitionSprites[lessonsCompleted].userData.popup = false;
    document.getElementById("towerMessage").innerHTML = towerHints[3];
    
    if(!mapScene.getObjectByName("ping"))
    {
      console.log("ADDING A NEW PING");
      echoPingLocation = makeEchoPing(towerIcons[lessonsCompleted].position.x, towerIcons[lessonsCompleted].position.z);
    }
    
    lessonLocation_cathedralRock_sprite.material.opacity = 1;
  }
  else if(lessonsCompleted == 4)
  {
    sceneTransitionSprites[lessonsCompleted].userData.ping = true;
    sceneTransitionSprites[lessonsCompleted].userData.popup = false;
    document.getElementById("towerMessage").innerHTML = towerHints[4];
    
    if(!mapScene.getObjectByName("ping"))
    {
      console.log("ADDING A NEW PING");
      echoPingLocation = makeEchoPing(towerIcons[lessonsCompleted].position.x, towerIcons[lessonsCompleted].position.z);
    }
  
    lessonLocation_blackMesa_sprite.material.opacity = 1;
  }
}

//** SETS UP LESSON SLIDES DEPENDING ON WHICH SCENE YOU ARE IN */
function startLesson()
{
  currentLessonIndex = 0;

  if(lessonButton_right.classList.contains("disabled"))
  {
    lessonButton_right.classList.toggle("disabled");
  }
  lessonButton_left.classList.toggle("disabled");

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

//** SETS UP CONTROLS FOR THE CAMERA CONTROLLER */
function makeCameraControls() {
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.screenSpacePanning = false;
  controls.enableZoom = true;
  controls.enableRotate = false;
  controls.zoomSpeed = 0.5;
  controls.zoom0 = 1;
  controls.minDistance = 1.5;
  controls.maxDistance = 2.5;
  controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
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

  //** HUB SCENE */
  if (currentSceneNumber == 0)
  {
    raycaster.setFromCamera(mouse, hubCamera);
    
    //intersects = raycaster.intersectObjects(hubworldModel.children[0].children);
    intersects = raycaster.intersectObjects(hubScene.children, true);

    if (intersects.length > 0 && intersects[0].object.userData.name == "CUBE")
    {
      intersectObject = intersects[0].object;
      intersected = true;
      intersectObject.material.opacity = 0.5;
      intersectObject.material.side = THREE.FrontSide;
      console.log("On Object");
      document.body.style.cursor = 'pointer'; 
    }
    else if (intersects.length > 0 && intersects[0].object.name == "Computer_Screen")
    {
      if (intersects[0].object != intersectObject) 
      {
        uiHoverOnSound.play();
      }
      intersectObject = intersects[0].object;
      intersected = true;
      intersectObject.material.opacity = 0.75;
      document.body.style.cursor = 'pointer';

    }
    else if (intersects.length > 0 && intersects[0].object.name == "Jar" && lessonsCompleted == 4)
    {
      if (intersects[0].object != intersectObject) 
      {
        uiHoverOnSound.play();
      }
      intersectObject = intersects[0].object;
      intersected = true;
      intersectObject.material.opacity = 0.25;
      document.body.style.cursor = 'pointer';

    }
    else if (intersects.length > 0 && intersects[0].object.name == "Landsat")
    {
      if (intersects[0].object != intersectObject) 
      {
        uiHoverOnSound.play();
      }
      intersectObject = intersects[0].object;
      intersected = true;
      intersectObject.material.opacity = 0.5;
      document.body.style.cursor = 'pointer';
    }
    else if (intersects.length > 0 && intersects[0].object.name == "Camp_Landsat")
    {
      if (intersects[0].object != intersectObject) 
      {
        uiHoverOnSound.play();
      }
      intersectObject = intersects[0].object;
      intersected = true;
      intersectObject.material.opacity = 0.5;
      document.body.style.cursor = 'pointer';
    }
    else if (intersects.length > 0 && intersects[0].object.name == "StillObjects")
    {
      //** FIRST TIME YOU HOVER OVER THE DESK */
      if(!garminHover)
      {
        if (startingSequence)
        {
          new TWEEN.Tween(garminModel.position).to({
            x: -1.9,
            y: -0.1, 
            z: -0.3
          }, 3000)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .start();
  
          console.log("SUBTITLES ACTIVE");
          subtitleLines.innerHTML = startingSubtitles[0];
          subtitleChange();
  
          garminHover = true;
        }
        else
        {
          new TWEEN.Tween(garminModel.position).to({
            x: -1.9,
            y: -0.1, 
            z: -0.3
          }, 3000)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .start();
          garminHover = true;
        }
      }
      
      intersectObject = intersects[0].object;
      intersected = true;
      //document.body.style.cursor = 'pointer';
    }
    //** WALKIE TALKIE - GARMIN HOVER */
    else if (intersects.length > 0 && intersects[0].object.name == "Screen")
    {
      if (intersects[0].object != intersectObject) 
      {
        uiHoverOnSound.play();
      }
      intersectObject = intersects[0].object;
      intersected = true;

      if(locationFound)
      {
        intersectObject.material.opacity = 0;
        
        if(lessonsCompleted == 1)
        {
          lessonLocation_phoenix_sprite.material.opacity = 1;
          lessonLocation_horseshoe_sprite.material.opacity = 0.1;
          lessonLocation_cathedralRock_sprite.material.opacity = 0.1;
          lessonLocation_blackMesa_sprite.material.opacity = 0.1;
        }
        else if(lessonsCompleted == 2)
        {
          lessonLocation_phoenix_sprite.material.opacity = 1;
          lessonLocation_horseshoe_sprite.material.opacity = 1;
          lessonLocation_cathedralRock_sprite.material.opacity = 0.1;
          lessonLocation_blackMesa_sprite.material.opacity = 0.1;
        }
        else if(lessonsCompleted == 3)
        {
          lessonLocation_phoenix_sprite.material.opacity = 1;
          lessonLocation_horseshoe_sprite.material.opacity = 1;
          lessonLocation_cathedralRock_sprite.material.opacity = 1;
          lessonLocation_blackMesa_sprite.material.opacity = 0.1;
        }
        else if(lessonsCompleted == 4)
        {
          lessonLocation_phoenix_sprite.material.opacity = 1;
          lessonLocation_horseshoe_sprite.material.opacity = 1;
          lessonLocation_cathedralRock_sprite.material.opacity = 1;
          lessonLocation_blackMesa_sprite.material.opacity = 1;
        }
      }
      else
      {
        intersectObject.material.opacity = 0.1;
      }

      document.body.style.cursor = 'pointer';
    }
    else if (intersects.length > 0 
      && intersects[0].object.name == "sprite_phoenix" ||
    intersects[0].object.name == "sprite_horseshoe" || 
    intersects[0].object.name == "sprite_cathedralRock" || 
    intersects[0].object.name == "sprite_blackMesa")
    {
      if (intersects[0].object != intersectObject) 
      {
        uiHoverOnSound.play();
      }
      intersectObject = intersects[0].object;
      intersected = true;

      if(locationFound)
      {
        intersectObject.material.opacity = 0.1;
      }
      else
      {
        intersectObject.material.opacity = 0;
      }

      document.body.style.cursor = 'pointer';
    }
    else
    {
      if (intersected) 
      {
        intersectObject.userData.scaling = false;
        intersected = false;

        if(intersectObject.name == "Screen")
        {
          if(locationFound)
          {
            intersectObject.material.opacity = 0;
          }
          else
          {
            intersectObject.material.opacity = 1;
          }
        }
        else if (intersects[0].name == "sprite_phoenix" ||
        intersects[0].name == "sprite_horseshoe" || 
        intersects[0].name == "sprite_cathedralRock" || 
        intersects[0].name == "sprite_blackMesa")
        {
          if(locationFound)
          {
            intersectObject.material.opacity = 1;
          }
          else
          {
            intersectObject.material.opacity = 0;
          }
        }
        else if(intersectObject.name == "Jar")
        {
          intersectObject.material.opacity = 0.5;
        }
        else
        {
          intersectObject.material.opacity = 1;
        }

        intersectObject = null;
        document.body.style.cursor = 'default';
      }
    }

    //**Used to change the cursor**//
    if (intersects && intersects.length > 0) 
    { 
      //document.body.style.cursor = 'pointer' 
    } 
    else 
    { 
      document.body.style.cursor = 'default' 
    }
  }
  //** MAP SCENE */
  else if (currentSceneNumber == 1) {
    raycaster.setFromCamera(mouse, mainCamera);
    intersects = raycaster.intersectObjects(lessonSceneRaycast.children);

    //*****CHECK FOR LOCATION UI
    if(!tutorial)
    {
      if (intersects.length > 0 && intersects[0].object.userData.name == "locationUI") {
        if (intersects[0].object != intersectObject) 
        {
          intersectObject = intersects[0].object;
          intersected = true;
          intersectObject.userData.scaling = true;
  
          iconScalingTween(intersects[0].object, true);
  
          console.log("On Object");
          uiHoverOnSound.play();
  
          //** IF IT IS THE TUTORIAL, HOVER WILL ACTIVE INDEX */
          if(tutorial)
          {
            if(!intersects[0].object.userData.tower && tutorialIndex == 2)
            {
              //tutorialSequence();
            }
            if(intersects[0].object.userData.tower && tutorialIndex == 3)
            {
              //tutorialSequence();
            }
          }
        }
        else 
        {
          //console.log('same object');
        }
  
        document.body.style.cursor = 'pointer';
      }
      else 
      {
        if (intersected) 
        {
          uiHoverOffSound.play();
          intersectObject.userData.scaling = false;
          intersected = false;
  
          if(intersectObject.userData.name == "locationUI")
          {
            iconScalingTween(intersectObject, false);
          }
  
          intersectObject = null;
        }
      }
    }
  }
  //** LESSON SCENE */
  else if (currentSceneNumber == 2) 
  {
    raycaster.setFromCamera(mouse, lessonCamera);
    intersects = raycaster.intersectObjects(lessonScene.children, true);
    //outlineBug.children[0].children[0]
    //console.log(lessonScene);
    
    if (intersects.length > 0)
    {
      //console.log(intersects[0]);
      if (intersects.length > 0 && intersects[0].object.userData.name == "bug") 
      {
        if (intersects[0].object != intersectObject && lessonsCompleted != 4) 
        {
          intersectObject = intersects[0].object;
          intersected = true;
          intersectObject.material.opacity = 0.5;
          intersectObject.material.side = THREE.FrontSide;
  
          document.body.style.cursor = 'grab'
  
          //iconScalingTween(intersects[0].object, true);
  
          console.log("On Object");
        } 
        else 
        {
          //console.log('same object');
        }
      }
      else if (intersects.length > 0 && intersects[0].object.name == "Echo" && !echoClicked) 
      {
        //playEchoAnimation(2, true);
        intersectObject = intersects[0].object;
        intersected = true;
        intersectObject.material.opacity = 0.9;
        intersectObject.material.side = THREE.FrontSide;
        document.body.style.cursor = 'pointer'
  
        console.log("On Object");
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
          //document.body.style.cursor = 'default'
          document.body.style.cursor = 'default'
        }
        document.body.style.cursor = 'default'
      }
    }

  }
}

//** UPDATE THE SUBTITLES FOR DIALOGUE */
function subtitleChange()
{
  //** IF ITS NOT ACTIVE, ACTIVATE IT */

  if(startingSequenceNumb == 0)
  {
    subtitleLines.innerHTML = startingSubtitles[startingSequenceNumb];
  }

  if(!subtitles.classList.contains("active"))
  {
    //console.log("ACTIVATED");
    subtitles.classList.toggle("active");
  }
  if(startingSequenceNumb < startingSubtitles.length - 1 && startingSequence)
  {
    clearTimeout(timeoutID1);
    clearTimeout(timeoutID2);
    
    //** FIRST WAIT FOR TIME OUT */
    timeoutID1 = setTimeout(function() 
    {
      startingSequenceNumb++;
      
      //**Disable It */
      if(subtitles.classList.contains("active"))
      {
        console.log("DISABLE IT")
        subtitles.classList.toggle("active");
      }
      
      //** RUNS AFTER INITIAL ONE */
      timeoutID2 = setTimeout(function() {
        subtitleLines.innerHTML = startingSubtitles[startingSequenceNumb];
        console.log("RERUN");
        subtitleChange();
      }, 500);
    }, 10000);
  }
  else
  {
    console.log("SUBTITLE SEQUENCE IS OVER");
    startingSequence = false;
  }
  
  if(currentSceneNumber == 2)
  {
    //** CLEAR TIMEOUT */
    if(lessonTimeout1)
    {
      clearTimeout(lessonTimeout1);
    }

    subtitleLines.innerHTML = lessonSubtitles[lessonSubtitleSequenceNumber];
    console.log("lessonSubtitle: " + lessonSubtitleSequenceNumber);
    lessonSubtitleSequenceNumber++;

    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
      setTimeout(function(){
        subtitles.classList.toggle("active");
      }, 500);
    }

    lessonTimeout1 = setTimeout(function() 
    {
      if(subtitles.classList.contains("active"))
      {
        subtitles.classList.toggle("active");
      }
      
    }, 10000);
  }

  if(walkieTalkie1.isPlaying)
  {
    walkieTalkie1.stop();
  }
  else if(walkieTalkie2.isPlaying)
  {
    walkieTalkie2.stop();
  }
  else if(walkieTalkie3.isPlaying)
  {
    walkieTalkie3.stop();
  }
  walkieTalkieSounds[Math.floor(Math.random() * 3)].play();
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
  if (!toggleTowerPopupOpen) 
  {
    //ICON POPUP
    document.getElementById("iconPopup-1").classList.toggle("active");

    //document.getElementById("popup-1").classList.toggle("active");
    // document.getElementById("header").innerHTML = intersectObject.userData.popupTitle;
    //document.getElementById("text").innerHTML = intersectObject.userData.popupText;
    controls.enabled = false;
    toggleTowerPopupOpen = true;
    console.log("TOWER POPUP ON");
  } 
  else 
  {
    document.getElementById("iconPopup-1").classList.toggle("active");
    controls.enabled = true;
    toggleTowerPopupOpen = false;

    if(towerClicked)
    {
      setTimeout(function() 
      {
        document.getElementById("towerMessage").innerHTML = towerHints2[lessonsCompleted];
      }, 1000);
    }
    
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

    if(subtitles.classList.contains("active"))
    {
      subtitles.classList.toggle("active");
    }

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
    //** HUBWORLD  */ 
    if(currentSceneNumber == 0 && gameStarted)
    {
      raycaster.setFromCamera(mouse, hubCamera);
      intersects = raycaster.intersectObjects(hubScene.children, true);
      if(intersects[0])
      {
        intersectObject = intersects[0].object;
        console.log(intersectObject);
        
        //** COMPUTER SCREEN */
        if(intersects[0].object.name == "Computer_Screen" && !startingSequence)
        {
          //transitioning = true;
          //hubToMapTransition();

          //** USED FOR THE INTRO SUBTITLE SEQUENCE */
          if(subtitles.classList.contains("active"))
          {
            subtitles.classList.toggle("active");
          }

          //Used to toggle off Labels if they are active//
          hubsceneLabels.forEach((cubeInfo) => {
            const {cube, elem} = cubeInfo;
        
            if(elem.classList.contains("active"))
            {
              elem.classList.toggle("active");
            }
          });

          //** TWEEN TO MAP SCREEN */
          if(!hubworldScreenClick && !isTweening)
          {
            hubworldScreenClick = true;
            console.log("Computer Screen Click");
            new TWEEN.Tween(hubCamera.position).to({x: -1.65, 
            y: 0, z: -0.027}, 3000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start()
            .onComplete(hubToMapTransition);
            clickSound.play();
            isTweening = true;

            new TWEEN.Tween(hubCamera.rotation).to(
              { 
              y: Math.PI / 2
            }, 3000).start();
          }

        }
        //** LANDSAT */
        else if(intersects[0].object.name == "Landsat")
        {
          console.log("landsat click");
          clickOpenURL(intersects, "https://landsat.gsfc.nasa.gov/");
          clickSound.play();
        }
        //** MICROSCOPE */
        else if(intersects[0].object.name == "Camp_Landsat")
        {
          console.log("landsat click");
          clickOpenURL(intersects, "https://landsat.gsfc.nasa.gov/outreach/camp-landsat/");
          clickSound.play();
        }
        //** WALKIE TALKIE */
        else if(intersects[0].object.name == "Screen" && !walkieTalkieView)
        {
          //startingSequence = false;

          //** CAMERA TWEEN */
          if(locationFound && !isTweening && !startingSequence)
          {
            new TWEEN.Tween(hubCamera.position).to({
              x: -1.75, 
              y: -0.07,
              z: -0.3 
            }, 3000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start()
            .onComplete(tweenComplete);
            clickSound.play();
            isTweening = true;

            walkieTalkieView = true;

            hubsceneLabels.forEach((cubeInfo) => {
              const {cube, elem} = cubeInfo;
          
              if(elem.classList.contains("active"))
              {
                elem.classList.toggle("active");
              }
            });
          }

          if(subtitles.classList.contains("active"))
          {
            clearTimeout(timeoutID1);
            clearTimeout(timeoutID2);
            
            subtitles.classList.toggle("active");
            console.log("cleared Timeout: " + startingSequenceNumb);
            
            setTimeout(function() 
            {
              if(startingSequenceNumb < startingSubtitles.length)
              {
                if(startingSequenceNumb == 0)
                {
                  console.log("ZERO");
                  startingSequenceNumb = 2;
                }
                else
                {
                  startingSequenceNumb++;
                }
                subtitleLines.innerHTML = startingSubtitles[startingSequenceNumb-1];
              }
              subtitleChange();
            }, 500);
          }
          
          console.log("Walkie Talkie Click: " + startingSequenceNumb + ", " + startingSubtitles.length);
          clickSound.play();
        }
        else if (intersects[0].object.name == "sprite_phoenix" || 
        intersects[0].object.name == "sprite_horseshoe" ||
        intersects[0].object.name == "sprite_cathedralRock" ||
        intersects[0].object.name == "sprite_blackMesa")
        {
          console.log(intersects[0].object.name);
      
          if(locationFound && !transitioning)
          {
            if(walkieTalkieView)
            {
              if(intersects[0].object.name == "sprite_phoenix")
              {
                console.log("Clicked on phoenix");
                updateLessonScene(0);
                currentLessonSceneIndex = 0;
              }
              else if(intersects[0].object.name == "sprite_horseshoe")
              {
                console.log("Clicked on horseshoe");
                updateLessonScene(1);
                currentLessonSceneIndex = 1;
              }
              else if(intersects[0].object.name == "sprite_cathedralRock")
              {
                console.log("Clicked on Cathedral");
                updateLessonScene(2);
                currentLessonSceneIndex = 2;
              }
              else if(intersects[0].object.name == "sprite_blackMesa")
              {
                console.log("Clicked on phoenix");
                updateLessonScene(3);
                currentLessonSceneIndex = 3;
              }
  
              transitionParams.transition = 1;
              new TWEEN.Tween(transitionParams)
              .to({ transition: 0 }, 2000)
              .start(TransitionStart())
              .onComplete(TransitionDone);

            }
            else
            {
              new TWEEN.Tween(hubCamera.position).to({
                x: -1.75, 
                y: -0.07,
                z: -0.3 
              }, 3000)
              .easing(TWEEN.Easing.Quadratic.InOut)
              .start()
              .onComplete(tweenComplete);
              clickSound.play();
              isTweening = true;
  
              walkieTalkieView = true;
  
              hubsceneLabels.forEach((cubeInfo) => {
                const {cube, elem} = cubeInfo;
            
                if(elem.classList.contains("active"))
                {
                  elem.classList.toggle("active");
                }
              });
            }
          }  
        }
        else if (intersects[0].object.name == "Jar" && lessonsCompleted == 4)
        {
          console.log(intersects[0].object.name);
      
          if(locationFound && !transitioning)
          {
            // updateLessonScene(4);
            currentLessonSceneIndex = 4;
            transitionParams.transition = 1;
            new TWEEN.Tween(transitionParams)
            .to({ transition: 0 }, 2000)
            .start(TransitionStart())
            .onComplete(TransitionDone);
          }  
        }              
      }
    }
    //** MAP SCENE */ 
    else if (currentSceneNumber == 1) 
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
    
            if (typeof echoPingLocation == "undefined") 
            {
              cameraTweenTo(intersects, false);
            } 
            else 
            {
              cameraTweenTo(intersects, false);
            }
            if(!towerClicked)
            {
              towerClicked = true;
            }
    
            toggleTowerPopup(intersects[0].object);
            removePing();
          } else if (intersects[0].object.userData.ping) {
            clickPingLocation(intersects);
            cameraTweenTo(intersects, false, 0.1, true);

            if(intersects[0].object.name == 'phoenix')
            {
              currentLessonSceneIndex = 0;
            }
            else if(intersects[0].object.name == 'horseshoe')
            {
              currentLessonSceneIndex = 1;
            }
            else if(intersects[0].object.name == 'cathedralRock')
            {
              currentLessonSceneIndex = 2;
            }
            else if(intersects[0].object.name == 'gilaRiver')
            {
              currentLessonSceneIndex = 3;
            }
            else if(intersects[0].object.name == 'chiricahuaMts')
            {
              currentLessonSceneIndex = 4;
            }
            console.log(intersects[0].object.name);

            //** USED TO TELL IF ANY LOCATION HAS BEEN REACHED */
            if(!locationFound)
            {
              locationFound = true;
            }

            //intersects[0].object.userData.ping = false;
          } else {
            clickOpenURL(intersects);
            cameraTweenTo(intersects, true);
          }

          clickSound.play();
        }
      }
  
      //console.log(intersects[0]);
    }
    //** LESSON SCENE */ 
    else if (currentSceneNumber == 2) 
    {
      raycaster.setFromCamera(mouse, lessonCamera);
      
      //SEARCH ONLY IN THE BUG MODEL TO GET RAYCAST
      intersects = raycaster.intersectObjects(lessonScene.children, true);
      //outlineBug.children[0].children
      if (intersects[0])
      {
        intersectObject = intersects[0].object;
        //console.log(intersects[0]);
        //console.log(lessonScene.children);
    
        //** CLICK BUG FUNCTIONALITY */
        if (intersectObject.userData.name == "bug" && currentLessonSceneIndex != 4 && bugAmount < 4 && !bugClicked) 
        {
          bugAmount++;
          console.log("BUG: " + bugAmount);
          bugClicked = true;
          //lessonScene.remove(intersects[0].object);
          tweenBug();
          //toggleLessonPopup();
          
          if(bugFlyTween)
          {
            bugFlyTween.stop();
            console.log("BUG FLY STOP");
          }
          if(bugRotTween)
          {
            bugRotTween.stop();
          }


          clickSound.play();
        }
        //** CLICK ON ECHO */ 
        else if (intersectObject.name == "Echo") 
        {
          console.log("ECHO CLICK: " + currentLessonSceneIndex);
          //playEchoAnimation(Math.floor(Math.random() * 7));

          if(currentLessonSceneIndex == 4)
          {
            //** RANDOM EITHER OR */
            if(echoAnimFinal)
            {
              playEchoAnimation(5, true);
              echoAnimFinal = false;
            }
            else
            {
              playEchoAnimation(1, true);
              echoAnimFinal = true;
            }
          }
          if(!echoClicked)
          {
            console.log("Echo Flying animation!!");
            playEchoAnimation(2, true);
            subtitleChange();
          }
          clickSound.play();
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
    //** IF ITS THE TUTORIAL */
    if(!mouseIsDragging)
    {
      if(tutorialIndex == 1)
      {
        console.log("tutorial click: " + tutorialIndex);
        tutorialSequence();
      }
    }
  }
}

function tweenBug(bugNumb)
{
  //** BUG PICKUP INTERACTION */

  if(bugAmount == 1)
  {
    //bugIcon.classList.toggle("filled");
  }
  else if(bugAmount == 2)
  {
    //bugIcon2.classList.toggle("filled");
  }
  else if(bugAmount == 3)
  {
    //bugIcon3.classList.toggle("filled");
  }
  else if(bugAmount == 4)
  {
    //bugIcon4.classList.toggle("filled");
  }
  
  bugsFound.push(currentLessonSceneIndex);
  console.log(bugsFound); 
  var bugTween = new TWEEN.Tween(outlineBug.position)
    .to(
      {
        x: lessonCamera.position.x,
        y: lessonCamera.position.y - 0.5,
        z: lessonCamera.position.z,
      },
      2000)
    bugTween.easing(TWEEN.Easing.Quadratic.Out);
    bugTween.onUpdate(() => {
    });
    bugTween.onComplete(() => {
      console.log("bug is now invisible");
      lessonScene.remove(outlineBug);
    });
    bugTween.start();

    if(bugFlyTween)
    {
      bugFlyTween.stop();
      console.log("BUG FLY STOP STOP");
    }
    if(bugRotTween)
    {
      bugRotTween.stop();
    }
}

function playEchoAnimation(index, tween, transition)
{
  echoActiveAction = mixer.clipAction(echoActions[echoCurrentAnim]);
  echoCurrentAnim = index;
  
  if(!transition)
  {
    transition = 0.5;
  }

  if(echoCurrentAnim == 3)
  {
    echoCurrentAnim = 5;
  }
  
  if(tween)
  {
    echoClicked = true;
    //** PHOENIX */
    if(currentLessonSceneIndex == 0)
    {

      var flyUpTween = new TWEEN.Tween(Echo.position)
      .to(
        {
          x: Echo.position.x,
          y: Echo.position.y + 1,
          z: Echo.position.z,
        },
        1000)
        flyUpTween.easing(TWEEN.Easing.Quadratic.Out);
        flyUpTween.onUpdate(() => {
      });
      flyUpTween.start();

      setTimeout(function()
      {
        echoLocTween = new TWEEN.Tween(Echo.position)
          .to(
            {
              x: -30,
              y: 0,
              z: Echo.position.z,
            },
            7500)
            echoLocTween.easing(TWEEN.Easing.Sinusoidal.In);
            echoLocTween.onComplete(toggleLessonPopup);
          echoLocTween.start();
  
        echoRotTween = new TWEEN.Tween(Echo.rotation)
        .to(
          {
            x: lessonCamera.rotation.x,
            y: lessonCamera.rotation.y + Math.PI/2,
            z: lessonCamera.rotation.z,
          },
          2500)
          echoRotTween.easing(TWEEN.Easing.Cubic.InOut);
          echoRotTween.onUpdate(() => {
        });
        echoRotTween.start();

        echoScaleTween = new TWEEN.Tween(Echo.scale)
        .to(
          {
            x: 0,
            y: 0,
            z: 0,
          },
          10000)
          echoScaleTween.easing(TWEEN.Easing.Cubic.InOut);
        echoScaleTween.start();
      },1000);
    }
    //** HORSESHOE BEND */
    else if(currentLessonSceneIndex == 1)
    {
      var flyUpTween = new TWEEN.Tween(Echo.position)
      .to(
        {
          x: Echo.position.x,
          y: -0.9,
          z: Echo.position.z,
        },
        1000)
        flyUpTween.easing(TWEEN.Easing.Quadratic.Out);
        flyUpTween.onUpdate(() => {
      });
      flyUpTween.start();

      setTimeout(function()
      {
        echoLocTween = new TWEEN.Tween(Echo.position)
        .to(
          {
            x: -30,
            y: -2,
            z: -5,
          },
          10000)
          echoLocTween.easing(TWEEN.Easing.Sinusoidal.In);
          echoLocTween.onComplete(toggleLessonPopup);
        echoLocTween.start();

        echoRotTween = new TWEEN.Tween(Echo.rotation)
        .to(
          {
            x: lessonCamera.rotation.x,
            y: lessonCamera.rotation.y + Math.PI/2,
            z: lessonCamera.rotation.z,
          },
          2500)
          echoRotTween.easing(TWEEN.Easing.Cubic.InOut);
          echoRotTween.onUpdate(() => {
        });
        echoRotTween.start();

        echoScaleTween = new TWEEN.Tween(Echo.scale)
        .to(
          {
            x: 0,
            y: 0,
            z: 0,
          },
          15000)
          echoScaleTween.easing(TWEEN.Easing.Cubic.InOut);
        echoScaleTween.start();
      },1500);
    }
    //** GRASSHOPPER */
    else if(currentLessonSceneIndex == 2)
    {
      var flyUpTween = new TWEEN.Tween(Echo.position)
      .to(
        {
          x: Echo.position.x,
          y: -0.85,
          z: Echo.position.z,
        },
        1000)
        flyUpTween.easing(TWEEN.Easing.Quadratic.Out);
        flyUpTween.onUpdate(() => {
      });
      flyUpTween.start();

      setTimeout(function()
      {
        echoLocTween = new TWEEN.Tween(Echo.position)
        .to(
          {
            x: -10,
            y: 0,
            z: -4,
          },
          10000)
          echoLocTween.easing(TWEEN.Easing.Sinusoidal.In);
          echoLocTween.onComplete(toggleLessonPopup);
        echoLocTween.start();

        echoRotTween = new TWEEN.Tween(Echo.rotation)
        .to(
          {
            x: lessonCamera.rotation.x,
            y: lessonCamera.rotation.y + Math.PI/4,
            z: lessonCamera.rotation.z,
          },
          2500)
          echoRotTween.easing(TWEEN.Easing.Cubic.InOut);
          echoRotTween.onUpdate(() => {
        });
        echoRotTween.start();

        echoScaleTween = new TWEEN.Tween(Echo.scale)
        .to(
          {
            x: 0,
            y: 0,
            z: 0,
          },
          15000)
          echoScaleTween.easing(TWEEN.Easing.Cubic.InOut);
        echoScaleTween.start();
      },1500);
    }
    //** BLACK MESA */
    else if(currentLessonSceneIndex == 3)
    {
      var flyUpTween = new TWEEN.Tween(Echo.position)
      .to(
        {
          x: Echo.position.x,
          y: -0.68,
          z: Echo.position.z,
        },
        1000)
        flyUpTween.easing(TWEEN.Easing.Quadratic.Out);
        flyUpTween.onUpdate(() => {
      });
      flyUpTween.start();

      setTimeout(function()
      {
        echoLocTween = new TWEEN.Tween(Echo.position)
        .to(
          {
            x: -10,
            y: -0.25,
            z: -4,
          },
          10000)
          echoLocTween.easing(TWEEN.Easing.Sinusoidal.In);
          echoLocTween.onComplete(toggleLessonPopup);
        echoLocTween.start();

        echoRotTween = new TWEEN.Tween(Echo.rotation)
        .to(
          {
            x: lessonCamera.rotation.x,
            y: lessonCamera.rotation.y + Math.PI/4,
            z: lessonCamera.rotation.z,
          },
          2500)
          echoRotTween.easing(TWEEN.Easing.Cubic.InOut);
          echoRotTween.onUpdate(() => {
        });
        echoRotTween.start();

        echoScaleTween = new TWEEN.Tween(Echo.scale)
        .to(
          {
            x: 0,
            y: 0,
            z: 0,
          },
          15000)
          echoScaleTween.easing(TWEEN.Easing.Cubic.InOut);
        echoScaleTween.start();
      },1500);
    }

    console.log("ECHO TWEENING!: " + currentLessonSceneIndex);
        
  }
  
  var endAction = mixer.clipAction(echoActions[index]);

  setWeight( endAction, 1 );
  endAction.time = 0;
  endAction.play();

  // Crossfade with warping - you can also try without warping by setting the third parameter to false
  echoActiveAction.crossFadeTo( endAction, 1.0, true );
}

function setWeight( action, weight ) {

  action.enabled = true;
  action.setEffectiveTimeScale( 1 );
  action.setEffectiveWeight( weight );

}

function clickOpenURL(intersects, url) {
  //*****CHECK FOR LOCATION UI
  
  
  if (intersects.length > 0) 
  {
    //console.log("CLICK OPEN");
    //If it has a URL open in another window
    if (url) 
    {
      window.open(url,'_blank');
      // console.log(
      //   "Opening: " + url + " in a new tab"
      // );
    } 
    else 
    {
      //console.log("UI does not have a link");
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
  console.log(hubCamera.position);
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

    if (!center) 
    {
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
    } 
    else 
    {
      var camTween = new TWEEN.Tween(mainCamera.position).to(
        {
          x: 0,
          y: yPos,
          z: 0,
        },
        5000
      );
      //.delay (1000)
      camTween.easing(TWEEN.Easing.Quadratic.InOut);
      camTween.onUpdate(() => {
        mainCamera.rotation.set(mainCamera.rotation);
        controls.target.set(mainCamera.position.x, 0, mainCamera.position.z);
      });
      camTween.onComplete(function() {
        outOfBounds = false;
      });
      camTween.start();
    }
  }
}

function iconScalingTween(obj, scaleUp) {
  let finalScale;
  //console.log(obj);

  if (scaleUp) {
    finalScale = new THREE.Vector3(maxSpriteSize, maxSpriteSize, maxSpriteSize);
  } else {
    //console.log("rescale!");
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
  //console.log(obj);

  if (fadeIn) {
    finalOpacity = 1.0;
    //console.log("FADE IN TEXT!");
  } else {
    finalOpacity = 0.0;
    //console.log("FADE OUT TEXT!");
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

        //** USED TO TOGGLE ARROWS */
        if(currentLessonIndex == lessonSequences[currentLessonSceneIndex].length - 1)
        {
          if(!lessonButton_right.classList.contains("disabled"))
          {
            lessonButton_right.classList.toggle("disabled");
          }
        }
        else if(lessonButton_left.classList.contains("disabled"))
        {
          lessonButton_left.classList.toggle("disabled");
        }

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
            console.log("lesson 1 off");
            lesson1Container.classList.toggle("active");
          }
          if(lesson2Container.classList.contains("active"))
          {
            console.log("lesson 2 off");
            lesson2Container.classList.toggle("active");
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
          if(currentLessonSceneIndex == 0)
          {
            console.log("lesson 1 ON");
            lesson1Container.classList.toggle("active");
            //document.getElementById("lessonTextContent").style.fontSize = "100%";
          }
          else if(currentLessonSceneIndex == 1)
          {
            console.log("lesson 2 ON");
            lesson2Container.classList.toggle("active");
          }
        }
      }
    }
  }
  //Backward Navigation
  else
  {
    //** LESSON 1 */
    if(currentSceneNumber == 2)
    {
     
      if(lessonButton_right.classList.contains("disabled"))
      {
        lessonButton_right.classList.toggle("disabled");
      }

      if(lessonSequences[currentLessonSceneIndex].length >= currentLessonIndex && currentLessonIndex > 0)
      {
        currentLessonIndex--;
        document.getElementById("slideNumb").innerHTML = (currentLessonIndex+1) + "/" +  lessonSequences[currentLessonSceneIndex].length;
        var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
        iframe.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*");

        console.log("Is it disabled?: " + document.getElementById("youtube-player").classList.contains("disabled"));

        console.log("LESSON SEQUENCE: " + lessonSequences[currentLessonSceneIndex][currentLessonIndex]);

        //** USED TO TOGGLE ARROWS */
        if(currentLessonIndex == 0)
        {
          if(!lessonButton_left.classList.contains("disabled"))
          {
            lessonButton_left.classList.toggle("disabled");
          }
        }
        else if(lessonButton_right.classList.contains("disabled"))
        {
          lessonButton_right.classList.toggle("disabled");
        }

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
            console.log("lesson 1 off");
            lesson1Container.classList.toggle("active");
          }
          if(lesson2Container.classList.contains("active"))
          {
            console.log("lesson 2 off");
            lesson2Container.classList.toggle("active");
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
          if(currentLessonSceneIndex == 0)
          {
            lesson1Container.classList.toggle("active");
          }
          else if(currentLessonSceneIndex == 1)
          {
            lesson2Container.classList.toggle("active");
          }
        }
      }
      //** AT THE END OF THE LESSON */
      else
      {
        if(!lessonButton_left.classList.contains("disabled"))
        {
          lessonButton_left.classList.toggle("disabled");
        }
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
  var positionHelper = new THREE.Object3D();
  positionHelper.position.z = 1;
  const labelParentElem = document.querySelector("#labels");

  for (var i = 0; i < uiLocationSprites.length; i++) {
    positionHelper.updateWorldMatrix(true, false);
    var position = new THREE.Vector3();
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

  if(hubTransitioning)
  {
    console.log("TRANSITION 2");
    transition2.render(clock.getDelta());
  }
  else
  {
    console.log("TRANSITION 1");
    transition.render(clock.getDelta());
  }


  //RENDER TRANSITION 2
  //transition2.render(clock.getDelta());

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

function hubCameraMove() {
  hubCamera.rotation.y = THREE.MathUtils.lerp(
    hubCamera.rotation.y,
    (-mouse.x * Math.PI) / 20 + Math.PI / 2,
    0.1
  );
  hubCamera.rotation.z = THREE.MathUtils.lerp(
    hubCamera.rotation.x,
    (-mouse.y * Math.PI) / 20,
    0.1
  );
}
//** ANIMATION LOOP, ADD THINGS THAT MOVE HERE */

function animate() {
  if (gameStarted == false) {
    requestAnimationFrame(animate);

    renderer.render(hubScene, hubCamera);
    return;
  }

  stats.begin();

  requestAnimationFrame(animate);
  hoverObject();
  lessonCameraMove();
  hubCameraMove();
  

  var delta = clock.getDelta();

  if(mixer)
  {
    mixer.update(delta);
  }
  if(momMixer)
  {
    momMixer.update(delta);
  }

  //console.log("TRANSITIONING: " + transitioning);
  //console.log("Current Lesson SCENE Index: " + currentLessonSceneIndex);
  //console.log("CURRENT LESSON INDEX: " + currentLessonIndex);

  TWEEN.update();
  controls.update();

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  if (!transitioning) {
    if(currentSceneNumber == 0)
    {
      hubComposer.setPixelRatio(window.devicePixelRatio);
      hubComposer.render(delta);
      //console.log("RENDER 0");
    }
    else if(currentSceneNumber == 1)
    {
      mapComposer.setPixelRatio(window.devicePixelRatio);
      mapComposer.render(delta);
      //composer.render(lessonScene, lessonCamera);
      //console.log("RENDER 1");
    }
    else if(currentSceneNumber == 2)
    {
      lessonComposer.setPixelRatio(window.devicePixelRatio);
      lessonComposer.render(delta);
      //composer.render(lessonScene, lessonCamera);
      //console.log("RENDER 2");
    }
    else
    {
      renderer.render(currentScene, currentCamera);
    }
    
  } else {
    //renderTransition();
  }

  computerScreenTexture.needsUpdate = true;
  walkieTalkieVideoTexture.needsUpdate = true;

  //console.log("Lessons Completed: " + lessonsCompleted);
  // console.log("Scene polycount:", renderer.info.render.triangles);
  // console.log("Active Drawcalls:", renderer.info.render.calls);
  // console.log("Textures in Memory", renderer.info.memory.textures);
  // console.log("Geometries in Memory", renderer.info.memory.geometries);

  //console.log(renderer.info.render.calls);

  //console.log("Current Lesson Index: " + currentLessonSceneIndex);
  //console.log("Current Scene: " + currentSceneNumber);
  //console.log("HUB TRANSITION: " + hubTransitioning);

  //** LIMITS THE CAMERA FROM GOING OUT OF THE BOUNDS */
  // mainCamera.position.z.clamp(-12, 12);
  // mainCamera.position.x.clamp(-12, 12);
  // controls.target.set(mainCamera.position.x,0, mainCamera.position.z);

  //** MOVE CAMERA BACK IF ITS OUT OF BOUNDS */
  if(mainCamera.position.x >= 10 || mainCamera.position.x <= -10 ||
    mainCamera.position.z >= 10 || mainCamera.position.z <= -10)
    {
      if(!outOfBounds)
      { 
        console.log("OUT OF BOUNDS");
        outOfBounds = true;
        const camPos = new THREE.Vector3( 1.64, mainCamera.position.y, 2 );
        cameraTweenTo(undefined, camPos, 2, false, true);
      }
    }

    const tempV = new THREE.Vector3();

    hubsceneLabels.forEach((cubeInfo) => {
      const {cube, elem} = cubeInfo;
      
      // get the position of the center of the cube
      cube.updateWorldMatrix(true, false);
      cube.getWorldPosition(tempV);
      
      // get the normalized screen coordinate of that position
      // x and y will be in the -1 to +1 range with x = -1 being
      // on the left and y = -1 being on the bottom
      tempV.project(hubCamera);
      
      // convert the normalized position to CSS coordinates
      const x = (tempV.x *  .5 + .5) * canvas.clientWidth;
      const y = (tempV.y * -.5 + .5) * canvas.clientHeight;
      
      // move the elem to that position
      elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
    });

    const tempY = new THREE.Vector3();
    mapSceneLables.forEach((cubeInfo) => {
      const {cube, elem} = cubeInfo;
      
      // get the position of the center of the cube
      cube.updateWorldMatrix(true, false);
      cube.getWorldPosition(tempY);
      
      // get the normalized screen coordinate of that position
      // x and y will be in the -1 to +1 range with x = -1 being
      // on the left and y = -1 being on the bottom
      tempY.project(mainCamera);
      
      // convert the normalized position to CSS coordinates
      const x = (tempY.x *  .5 + .5) * canvas.clientWidth;
      const y = (tempY.y * -.5 + .5) * canvas.clientHeight;
      
      // move the elem to that position
      elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;
    });

    //console.log("Cam Position: x:" + mainCamera.position.x + " z:" + mainCamera.position.z);
    stats.end();
}

function TransitionStart() {
  console.log("TRANSITION HAS STARTED");
  transitioning = true;
  transitionSound.play();
  transitionCover.classList.toggle("active");
  //controls.enabled = false;
}

function TransitionDone() {
  console.log("TRANSITION IS DONE");
  transitioning = false;
  //controls.enabled = true;
  //console.log(string);

  transitionCover.classList.toggle("active");

  //**HUB TO MAP**//
  if(hubTransitioning)
  {
    if (currentSceneNumber == 0) {
      currentScene = mapScene;
      currentCamera = mainCamera;
      currentSceneNumber = 1;
      console.log("TRANSITIONED TO MAP SCENE");

      if(miniMap.classList.contains("disabled"))
      {
        miniMap.classList.toggle("disabled");
      }
      if(mapPopup.classList.contains("open"))
      {
        mapPopup.classList.toggle("open");
      }
      if(!backButton.classList.contains("active"))
      {
        backButton.classList.toggle("active");
      }

      //** STOP HUBWORLD SOUND */
      if(hubworldSound.isPlaying)
      {
        //hubworldSound.stop();
        hubworldSound.setVolume(0.025);
      }

      
      //** TOGGLE ON MAP SCENE LABELS */
      mapSceneLables.forEach((cubeInfo) => {
        const {cube, elem} = cubeInfo;
        if(!elem.classList.contains("active"))
        {
          elem.classList.toggle("active");
        }
      });
      
      //** TUTORIAL FOR THE FIRST TIME YOU PLAY */
      if(introHubSequence)
      {
        introHubSequence = false;
        tutorialReset();
      }

      resetHubWorld();
      
      controls.enabled = true;
      renderer.render(currentScene, currentCamera);
    } 
    else if (currentSceneNumber == 1) {
      currentScene = hubScene;
      currentCamera = hubCamera;
      currentSceneNumber = 0;
      walkieTalkieView = false;

      console.log("TRANSITIONED TO HUB SCENE");
      
      //** TOGGLE ON MAP SCENE LABELS */
      mapSceneLables.forEach((cubeInfo) => {
        const {cube, elem} = cubeInfo;

        if(elem.classList.contains("active"))
        {
          elem.classList.toggle("active");
          console.log("THEY'RE ACTIVE");
        }
      });


      controls.enabled = false;
      renderer.render(currentScene, currentCamera);

      if(!miniMap.classList.contains("disabled"))
      {
        miniMap.classList.toggle("disabled");
      }
      if(backButton.classList.contains("active"))
      {
        backButton.classList.toggle("active");
      }
    }
    else if (currentSceneNumber == 2) {
      currentScene = hubScene;
      currentCamera = hubCamera;
      currentSceneNumber = 0;
      walkieTalkieView = false;

      console.log("LESSON TO HUB SCENE");
      controls.enabled = false;
      renderer.render(currentScene, currentCamera);
      updateLessonScene();

      if(!miniMap.classList.contains("disabled"))
      {
        miniMap.classList.toggle("disabled");
      }
      if(backButton.classList.contains("active"))
      {
        backButton.classList.toggle("active");
      }
    }

    hubTransitioning = false;
  }
  //**MAP TO LESSON**//
  else
  {
    if (currentSceneNumber == 0) {
      console.log("HUB TO LESSON SCENE?");
      currentScene = lessonScene;
      currentCamera = lessonCamera;
      currentSceneNumber = 2;
      resetHubWorld();

      console.log(currentLessonSceneIndex);
      if(currentLessonSceneIndex == 4)
      {
        dragBugControls.activate();

        console.log(backButton.classList.contains("active"));
        if(!backButton.classList.contains("active"))
        {
          backButton.classList.toggle("active");
        }
      }
    }
    else if (currentSceneNumber == 1) {
      currentScene = lessonScene;
      currentCamera = lessonCamera;
      currentSceneNumber = 2;
      console.log("TRANSITIONED TO LESSON SCENE");
      startLesson();
      subtitleChange();

      if(!miniMap.classList.contains("disabled"))
      {
        miniMap.classList.toggle("disabled");
      }
      if(backButton.classList.contains("active"))
      {
        backButton.classList.toggle("active");
      }

      //** TOGGLE ON MAP SCENE LABELS */
      mapSceneLables.forEach((cubeInfo) => {
        const {cube, elem} = cubeInfo;
    
        if(elem.classList.contains("active"))
        {
          elem.classList.toggle("active");
          console.log("THEY'RE ACTIVE");
        }
      });

      //** STOP HUBWORLD SOUND */
      if(hubworldSound.isPlaying)
      {
        hubworldSound.stop();
        if(currentLessonSceneIndex == 0)
        {
          phoenixSound.play();
        }
        else if(currentLessonSceneIndex == 1)
        {
          grandCanyonSound.play();
        }
        else if(currentLessonSceneIndex == 2)
        {
          grasshopperSound.play();
        }
        else if(currentLessonSceneIndex == 3)
        {
          blackMesaSound.play();
        }
        else if(currentLessonSceneIndex == 4)
        {
          caveSound.play();
        }
      }

      //** ALLOW BACK BUTTON ON LAST SCENE */
      if(currentLessonSceneIndex == 4)
      {
        //console.log(currentLessonSceneIndex);
        dragBugControls.activate();

        if(!backButton.classList.contains("active"))
        {
          backButton.classList.toggle("active");
        }
      }
  
      //Toggle UI When scene Transitions
      //backButton.classList.toggle("disabled");
      //backButton.classList.toggle("active");
  
      controls.enabled = false;
      renderer.render(currentScene, currentCamera);
      //lessonSceneControls.enabled = true;
    } else if (currentSceneNumber == 2) {
      currentScene = mapScene;
      currentCamera = mainCamera;
      currentSceneNumber = 1;
      console.log("TRANSITIONED TO MAP SCENE");

      if(miniMap.classList.contains("disabled"))
      {
        miniMap.classList.toggle("disabled");
      }
      if(mapPopup.classList.contains("open"))
      {
        mapPopup.classList.toggle("open");
      }
      if(!backButton.classList.contains("active"))
      {
        backButton.classList.toggle("active");
      }

      if(!hubworldSound.isPlaying)
      {
        hubworldSound.play();
      }
      if(phoenixSound.isPlaying)
      {
        phoenixSound.stop();
      }
      else if(grandCanyonSound.isPlaying)
      {
        grandCanyonSound.stop();
      }
      else if(grasshopperSound.isPlaying)
      {
        grasshopperSound.stop();
      }
      else if(blackMesaSound.isPlaying)
      {
        blackMesaSound.stop();
      }
      else if(caveSound.isPlaying)
      {
        caveSound.stop();
      }

      //** TOGGLE ON MAP SCENE LABELS */
      mapSceneLables.forEach((cubeInfo) => {
        const {cube, elem} = cubeInfo;
        if(!elem.classList.contains("active"))
        {
          elem.classList.toggle("active");
        }
      });

      console.log(currentLessonSceneIndex);

      updateLessonScene();
      console.log("Camera tween");
      cameraTweenTo(undefined, false, 3, false);
  
      //Toggle UI When scene Transitions
      //hamburger.classList.toggle("disabled");
      controls.enabled = true;
      renderer.render(currentScene, currentCamera);
      //lessonSceneControls.enabled = false;
    }
  }
}

function pingLocationReached() {
  console.log("PING LOCATION REACHED");
  var rndTextureIndex = Math.floor(Math.random() * 5);

  console.log("TEXTURE INDEX: " + rndTextureIndex);
  transition.setTexture(rndTextureIndex);

  //Toggle UI When scene Transitions
  //hamburger.classList.toggle("disabled");
  miniMap.classList.toggle("disabled");

  transitionParams.transition = 0;
  new TWEEN.Tween(transitionParams)
    .to({ transition: 1 }, 2000)
    // .delay( 2000 )
    //.yoyo( true )
    .start(TransitionStart())
    .onComplete(TransitionDone);
}

function hubToMapTransition()
{
  console.log("HUB TO MAP!");
  
  hubTransitioning = true;
  isTweening = false;
  mainCamera.position.set(mainCamera.position.x, 3, mainCamera.position.z);
  
  // new TWEEN.Tween(hubCamera.position).to({x: -1.65},2000)
  //   .easing(TWEEN.Easing.Quadratic.InOut)
  //   .start(console.log("HELP!"));

  transitionParams.transition = 0;
  new TWEEN.Tween(transitionParams).to({ transition: 1 }, 2000)
  .start(TransitionStart())
  .onComplete(TransitionDone);
}

function youAreHereUpdate() {
  var camX = mainCamera.position.x;
  var camZ = mainCamera.position.z;
  

  var posX = mapLinear(camX, -7.27, 6.78, 7, 93);
  var posZ = mapLinear(camZ, -8.49, 8.25, 5, 95);

  // var posX = mapLinear(camX, -7.27, 6.78, 49, -37);
  // var posZ = mapLinear(camZ, -8.49, 8.25, 45, -45);

  //mapMoveIcon.style.transform = "translate(" + posX + "%, " + posZ + "%)";
  youAreHereIcon.style.top = posZ + "%";
  youAreHereIcon.style.left = posX + "%";

  youAreHereIconPopup.style.top = posZ + "%";
  youAreHereIconPopup.style.left = posX + "%";

  // console.log("You are here cam: " + camX + ", Z: " + camZ);
  // console.log("You are here update X: " + posX + ", Y: " + posZ);
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
    // textures[i] = loader.load(
    //   "/resources/images/transition/transition" + 2 + ".png"
    // );
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
});

draggable2Elements.forEach(elem =>{
  elem.addEventListener("dragstart", dragStart);
});

droppableElements.forEach(elem =>{
  elem.addEventListener("dragenter", dragEnter);
  elem.addEventListener("dragover", dragOver);
  elem.addEventListener("dragleave", dragLeave)
  //elem.addEventListener("dragleave", dragLeave);
  elem.addEventListener("drop", drop);
});

droppable2Elements.forEach(elem =>{
  elem.addEventListener("dragenter", dragEnter);
  elem.addEventListener("dragover", dragOver);
  elem.addEventListener("dragleave", dragLeave)
  //elem.addEventListener("dragleave", dragLeave);
  elem.addEventListener("drop", drop);
});

function dragStart(event)
{
  console.log(event.target);
  
  if(event.target.dataset.dropped == "false")
  {
    event.dataTransfer.setData('text/plain', event.target.id);
    console.log("dragging...");
  }
  //** LESSON 2 */
  if(currentLessonSceneIndex == 1)
  {
    event.dataTransfer.setData('text/plain', event.target.id);
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
    //console.log("drag enter...");
  }
}
function dragOver(event)
{
  event.preventDefault();
  
  //** LESSON 1 */
  if(currentLessonSceneIndex == 0)
  {
    if(event.target.dataset.dropped == "false")
    {
      console.log("drag over...");
    }
  }
  //** LESSON 2 */
  else if(currentLessonSceneIndex == 1)
  {
    if(!event.target.classList.contains('hovered'))
    {
      event.target.classList.toggle('hovered');
    }
  }
}
function dragLeave(event)
{
  //event.target.classList.remove("droppable-hover");
  console.log("drop leave...");

  if(event.target.classList.contains('hovered'))
  {
    event.target.classList.toggle('hovered');
  }
}

var r, g, b;
function drop(event)
{
  event.preventDefault();
  //console.log("drop...");
  
  var count = 0;
  const sourceID = event.dataTransfer.getData('text/plain');
  //** LESSON 1 */
  if(currentLessonSceneIndex == 0)
  {
    if(event.target.dataset.filled == "false")
    {
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
                  elem.dataset.filled = "true";
                }
                else
                {
                  r = "";
                  elem.dataset.filled = "false";
                }
              }
              else if(event.target.id == "dropGreen")
              {
                if(elem.children)
                {
                  g = elem.children[0].id;
                  elem.dataset.filled = "true";
                }
                else
                {
                  g = "";
                  elem.dataset.filled = "false";
                }
              }
              else if(event.target.id == "dropBlue")
              {
                if(elem.children)
                {
                  b = elem.children[0].id;
                  elem.dataset.filled = "true";
                }
                else
                {
                  b = "";
                  elem.dataset.filled = "false";
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
    }
    else
    {
      if(event.target.firstChild)
      {
        console.log(event.target.firstChild);
      }
    }
    console.log("DROPPED");
  }
  //** LESSON 2 */
  else if(currentLessonIndex == 1)
  {
    if(event.target.classList.contains('hovered'))
    {
      event.target.classList.toggle('hovered');
    }

    console.log(lesson2ActivityList[0][1] + lesson2ActivityList.length);
    let answer = document.getElementById("lesson2Answer");

    if(sourceID == "dropTrueColor" && lesson2ActivityList[lesson2ActivityIndex][1] || sourceID == "dropFalseColor" && !lesson2ActivityList[lesson2ActivityIndex][1])
    {
      if(answer.classList.contains("wrong"))
      {
        answer.classList.toggle("wrong");
      }
      
      if(lesson2ActivityIndex < lesson2ActivityList.length - 1)
      {
        lesson2ActivityIndex++;
      }
      else
      {
        lesson2ActivityIndex = 0;
      }

      draggable2Elements.forEach(elem =>{
        elem.setAttribute('draggable', false);
      });

      if(!answer.classList.contains("active"))
      {
        answer.classList.toggle("active");
      }

      setTimeout(function() 
      {
        draggable2Elements.forEach(elem =>{
          elem.setAttribute('draggable', true);
        });
        
        if(answer.classList.contains("active"))
        {
          answer.classList.toggle("active");
        }

        droppable2Elements[0].style.backgroundImage = lesson2ActivityList[lesson2ActivityIndex][0];
      }, 2500);

      console.log("RIGHT ANSWER");
    }
    else
    {
      if(!answer.classList.contains("active"))
      {
        answer.classList.toggle("active");
      }
      if(!answer.classList.contains("wrong"))
      {
        answer.classList.toggle("wrong");
      }
      setTimeout(function() 
      {
        if(answer.classList.contains("active"))
        {
          answer.classList.toggle("active");
        }
        if(answer.classList.contains("wrong"))
        {
          answer.classList.toggle("wrong");
        }

      }, 2500);
      
      console.log("WRONG ANSWER");
    }
  }
}
function updateLesson2Activity()
{
  
}
function imagesFilled(r, g, b)
{
  var bandCombo = r.charAt(0) + g.charAt(0) + b.charAt(0);
  bandCombo = "";
  
  droppableElements.forEach(elem =>{
    console.log(elem.children[0].id);
    bandCombo += elem.children[0].id.charAt(0);
  });
  
  document.getElementById("finalImage").style.backgroundImage = "url('resources/images/lesson1/" + bandCombo + ".jpg')";
  console.log(bandCombo);

  if(bandCombo == "rgb")
  { 
    if(combinationText.classList.contains('active'))
    {
      console.log("CONTAINS ACTIVE");
      //combinationText.classList.toggle("active");
    }
    else
    {
      console.log("DOESN'T CONTAIN ACTIVE");
      combinationText.classList.toggle("active");
    }
  }
  else
  {
    if(combinationText.classList.contains('active'))
    {
      combinationText.classList.toggle("active");
    }
  }

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

  r = null;
  g = null;
  b = null;
  allFilled = false;

  if(combinationText.classList.contains('active'))
  {
    combinationText.classList.toggle("active");
  }
  //lesson1Container.classList.toggle("active");

  //RESET STYLES AND POSITIONS//
  for(var i = 0;i < draggableElements.length; i++)
  {
    document.getElementById("lesson1Activity").appendChild(draggableElements[i]);
    if(i == 0)
    {
      draggableElements[i].style.top = "38%";
      draggableElements[i].style.left = "15%";
    }
    else if(i == 1)
    {
      draggableElements[i].style.top = "10%";
      draggableElements[i].style.left = "15%";
    }
    else
    {
      draggableElements[i].style.top = "66%";
      draggableElements[i].style.left = "15%";
    }
  }
}

//** LESSON 1 ACTIVITY */
audioButton.addEventListener("click", function (ev) {
  ev.stopPropagation();
  if (audioPlaying) {
    audioPlaying = false;
    clickSound.play();
    listener.setMasterVolume(0.0);
    audioButton.style.backgroundImage =
      "url('/resources/images/audio-pause.png')";
  } else {
    audioPlaying = true;
    clickSound.play();
    listener.setMasterVolume(1.0);
    audioButton.style.backgroundImage =
      "url('/resources/images/audio-play.png')";
  }
});
//** CONTINUE BUTTON, FOR START WITH YOUTUBE VIDEO */
continueButton.addEventListener("click", function (ev) {
  ev.stopPropagation();

  if(!continueButton.classList.contains("disabled"))
  {
    continueButton.classList.toggle("disabled");
    startYoutubeContainer.classList.toggle("disabled");
    startButton.classList.toggle("active");

    var iframe = document.getElementsByTagName("iframe")[0].contentWindow;
    iframe.postMessage('{"event":"command","func":"pauseVideo","args":""}',"*");
  }

  clickSound.play();
});
//** START BUTTON EVENT LISTENER */
startButton.addEventListener("click", function (ev) {
  ev.stopPropagation();
  if (RESOURCES_LOADED && !gameStarted) {

    gameStarted = true;
    startButton.classList.toggle("active");
    audioButton.classList.toggle("disabled");
    //hamburger.classList.toggle("disabled");
    //miniMap.classList.toggle("disabled");
    // bugIcon.classList.toggle("disabled");
    // bugIcon2.classList.toggle("disabled");
    // bugIcon3.classList.toggle("disabled");
    // bugIcon4.classList.toggle("disabled");
    startScreenCover.classList.toggle("disabled");
    music.play();
    hubworldSound.play();
    
    //tutorialHighlight.classList.toggle("active");
    //highlightText.classList.toggle("active");
    //mouseIcon.classList.toggle("active");

    //tutorialSequence();

    currentSceneNumber = 0;
    controls.enabled = false;

    currentCamera = hubCamera;
    currentScene = hubScene;
    clickSound.play();
  }
  console.log("START BUTTON");
});

//** RETRY BUTTON EVENT LISTENER */
retryButton.addEventListener("click", function (ev) {
  console.log("RETRY BUTTON");
  location.reload();
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

//** MAP POPUP BUTTON **/
xButton4.addEventListener("click", function (ev) {
  if(mapPopup.classList.contains("open"))
  {
    mapPopup.classList.toggle("open");
  }
  clickSound.play();
});

//** CREDITS POPUP X BUTTON*/
// xButton5.addEventListener("click", function (ev) {
//   console.log("CLOSE");
//   creditsContainer.classList.toggle("active");
//   clickSound.play();
// });

/** TUTORIAL */
tutClickImage.addEventListener('click', function(ev){
  if(!transitioning && !isTweening && tutorial)
  {
    
    
    
    if(tutorialIndex <= 3)
    {
      tutorialSequence();
      console.log("Tutorial Image Click: " + tutorialIndex);
    }
  }
});

//** MAP BUTTON CLICK FUNCTIONALITY */
miniMap.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  
  if(!transitioning && !isTweening)
  {
    if(tutorial)
    {
      if(tutorialIndex == 4)
      {
        tutorialSequence();
        document.getElementById("mapPopup").classList.toggle("open");
        if(document.getElementById("toggleMapPopup").classList.contains("active"))
        {
          document.getElementById("toggleMapPopup").classList.toggle("active");
        }
      }
    }
    else
    {
      if(currentSceneNumber == 1)
      {
        document.getElementById("mapPopup").classList.toggle("open");
      }
    }
    
  }
  
  clickSound.play();
});
//** ROAD BUTTON INSIDE MAP POPUP */
roadButton.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if(!transitioning && !isTweening)
  {
    if(currentSceneNumber == 1)
    {
      if(tutorial)
      {
        if(tutorialIndex == 4)
        {
          tutorialSequence();
        }
      }
      
      if(!mapPopup.classList.contains("open"))
      {
        mapPopup.classList.toggle("open");
      }
      
      document.getElementById("mapImage").src = "resources/images/arizona-road.png";
      mosaicButton.style.borderColor = "rgba(255, 255, 255, 0.25)";
      geographyButton.style.borderColor = "rgba(255, 255, 255, 0.25)";
      roadButton.style.borderColor = "rgba(255, 0, 0, 0.5)";
    }
  }

  clickSound.play();
});
//** MOSAIC BUTTON INSIDE MAP POPUP */
mosaicButton.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if(!transitioning && !isTweening)
  {
    if(currentSceneNumber == 1)
    {
      if(tutorial)
      {
        if(tutorialIndex == 4)
        {
          tutorialSequence();
        }
      }
      
      if(!mapPopup.classList.contains("open"))
      {
        mapPopup.classList.toggle("open");
      }
      
      document.getElementById("mapImage").src = "resources/images/arizona-mosaic.png";
      mosaicButton.style.borderColor = "rgba(255, 0, 0, 0.5)";
      geographyButton.style.borderColor = "rgba(255, 255, 255, 0.25)";
      roadButton.style.borderColor = "rgba(255, 255, 255, 0.25)";
    }
  }

  clickSound.play();
});
//** GEOGRAPHY BUTTON INSIDE MAP POPUP */
geographyButton.addEventListener('click', function(ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if(!transitioning && !isTweening)
  {
    if(!mapPopup.classList.contains("open"))
    {
      mapPopup.classList.toggle("open");
    }

    if(tutorial)
    {
      if(tutorialIndex == 4)
      {
        tutorialSequence();
      }
    }

    if(currentSceneNumber == 1)
    {
      document.getElementById("mapImage").src = "resources/images/arizona-geography.png";
      mosaicButton.style.borderColor = "rgba(255, 255, 255, 0.25)";
      geographyButton.style.borderColor = "rgba(255, 0, 0, 0.5)";
      roadButton.style.borderColor = "rgba(255, 255, 255, 0.25)";
    }
  }

  clickSound.play();
});
backButton.addEventListener("click", function (ev) {
  ev.stopPropagation(); // prevent event from bubbling up to .container

  if (!transitioning && !isTweening && !tutorial) {
    if (currentSceneNumber == 2) 
    {
      console.log("click back in index 2");
      hubTransitioning = true;
      transitionParams.transition = 1;
      new TWEEN.Tween(transitionParams)
        .to({ transition: 0 }, 2000)
        // .delay( 2000 )
        //.yoyo( true )
        .start(TransitionStart())
        .onComplete(TransitionDone);

      if(document.getElementById("lessonContainer").classList.contains("active"))
      {
        document.getElementById("lessonContainer").classList.toggle("active");
      }
    } 
    else if (currentSceneNumber == 1) 
    {
      hubTransitioning = true;
      transitionParams.transition = 1;
      new TWEEN.Tween(transitionParams)
        .to({ transition: 0 }, 2000)
        // .delay( 2000 )
        //.yoyo( true )
        .start(TransitionStart())
        .onComplete(TransitionDone);
    }

    if(currentLessonSceneIndex == 4)
    {
      dragBugControls.deactivate();
    }
    updateHubworldScene();
  }

  clickSound.play();
});
//** CLICK IN WINDOW USED FOR POPUPS */
window.addEventListener("click", () => {
  if (!transitioning && !isTweening) {
    
    if(currentSceneNumber == 0)
    {
      clickEvent();
    }
    else if (currentSceneNumber == 1) {
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
//**EVENT FOR WHEN MOUSE IS MOVING**//
window.addEventListener("mousemove", function (event) {
  if (!transitioning && !isTweening) {
    if(currentSceneNumber == 0)
    {
      onMouseMove(event);
    }
    else if (currentSceneNumber == 1) {
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

  hubCamera.aspect = sizes.width / sizes.height;
  hubCamera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  if(currentSceneNumber == 0)
  {
    hubComposer.setSize(window.innerWidth, window.innerHeight);
  }
  else if(currentSceneNumber == 1)
  {
    mapComposer.setSize(window.innerWidth, window.innerHeight);
  }
  else if(currentSceneNumber == 2)
  {
    lessonComposer.setSize(window.innerWidth, window.innerHeight);
  }
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
})
helpButton.addEventListener("click", (e) => {
  if(!tutorial)
  {
    if (!transitioning && !isTweening) 
    {
      //** HUBSCENE LABELS */
      if(currentSceneNumber == 0)
      {
        console.log("HELP BUTTON");
        toggleHubSceneLabels();
        startingSequence = true;
        startingSequenceNumb = 0;
        subtitleChange();
      }
      else if(currentSceneNumber == 1)
      {
        console.log("HELP BUTTON");
        tutorialReset();
      }
    }
  }
});

function toggleHubSceneLabels()
{
  hubsceneLabels.forEach((cubeInfo) => {
    const {cube, elem} = cubeInfo;

    elem.classList.toggle("active");
  });
}
function toggleMapSceneLabels()
{
  mapSceneLables.forEach((cubeInfo) => {
    const {cube, elem} = cubeInfo;

    elem.classList.toggle("active");
  });
}


// creditsButton.addEventListener("click", (e) => {
//   if(!tutorial)
//   {
//     if (!transitioning && !isTweening) 
//     {
//       creditsContainer.classList.toggle("active");
//       console.log("CREDITS BUTTON");
//     }
//   }
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
      youtubePlayButton.src = "resources/images/UI/play-white.png";
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
      youtubePlayButton.src = "resources/images/UI/play-white.png";
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
      
      //** MAKE SURE CURRENT SLIDE IS A YOUTUBE VIDEO *//
      if(lessonSequences[currentLessonSceneIndex][currentLessonIndex].startsWith("https"))
      {
        if(videoPlaying)
        {
          iframe.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            "*"
            );
          
            videoPlaying = false;
            youtubePlayButton.src = "resources/images/UI/play-white.png";  
        }
        else
        {
          iframe.postMessage(
            '{"event":"command","func":"playVideo","args":""}',
            "*"
          );
  
          videoPlaying = true;
          youtubePlayButton.src = "resources/images/UI/pause-white.png";  
        }
      }
      
      console.log("MIDDLE LESSON BUTTON");
      //console.log(youtubePlayer);

      //player.stopVideo();
    } else if (currentSceneNumber == 1) {
    }
  }

  clickSound.play();
});
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
      //updateLinePath();

      lessonComplete();

      //backButton.classList.toggle("active");
      //backButton.classList.toggle("disabled");
      //miniMap.classList.toggle("disabled");

      console.log("MAP ICON SCENE: " + currentSceneNumber);
    } else if (currentSceneNumber == 1) {
    }
  }

  clickSound.play();
});

//** MINI MAP FUNCTIONALITY **//
miniMap.addEventListener("mouseover", function (ev) {
  ev.stopPropagation();

  if(!transitioning && !isTweening)
  {
    if(tutorial)
    {
      if(tutorialIndex == 4)
      {
        //tutorialSequence();
        if(!document.getElementById("toggleMapPopup").classList.contains("active"))
        {
          document.getElementById("toggleMapPopup").classList.toggle("active");
        }
      }
    }
    else
    {
      if(!document.getElementById("miniMap").classList.contains("open"))
      {
        if(!document.getElementById("toggleMapPopup").classList.contains("active"))
        {
          document.getElementById("toggleMapPopup").classList.toggle("active");
        }
      }
      
    }

  }

});
miniMap.addEventListener("mouseleave", function (ev) {
  ev.stopPropagation();

  setTimeout(function() 
  {
    if(!hoverMapToggle)
    {
      if(document.getElementById("toggleMapPopup").classList.contains("active"))
      {
        document.getElementById("toggleMapPopup").classList.toggle("active");
      }
    }
  }, 250);

});

toggleMapPopup.addEventListener("mouseover", function (ev) {
  ev.stopPropagation();

  if(!transitioning && !isTweening)
  {
    hoverMapToggle = true;
  }
});
toggleMapPopup.addEventListener("mouseleave", function (ev) {
  //ev.stopPropagation(); // prevent event from bubbling up to .container
  ev.stopPropagation();

  if(document.getElementById("toggleMapPopup").classList.contains("active"))
  {
    document.getElementById("toggleMapPopup").classList.toggle("active");
  }
  hoverMapToggle = false;
});

var initialBugPos;

//**EVENT TO CHANGE MOUSE CURSOR TO 'GRABBING'**//
controls.addEventListener( 'start', function ( event ) {
	if(currentSceneNumber == 1)
  {
    mouseIsDragging = true;
    document.body.style.cursor = 'grabbing';
  }
} );
controls.addEventListener( 'end', function ( event ) {
  if(currentSceneNumber == 1)
  {
    document.body.style.cursor = 'grab';

    setTimeout(function() {
      mouseIsDragging = false;
    }, 1000);

    if(tutorial)
    {
      if(tutorialIndex == 0)
      {
        console.log("tutorial END DRAG 0");
        tutorialSequence();
      }
    }
    youAreHereUpdate();
  }
} );
dragBugControls.addEventListener('dragend', function ( event ) {

  console.log("END DRAG");
  raycaster.setFromCamera(mouse, lessonCamera);
  var intersects = raycaster.intersectObjects(lessonScene.children, true);

  var pos = new THREE.Vector3();
  event.object.getWorldPosition( pos );
  console.log(pos);

  if (intersects.length > 0)
  {
    console.log(intersects[0]);
  }

  if(pos.y >= -0.5 && pos.y <= 0.5 
    && pos.z >= -0.6 && pos.z <= 0.6)
  {
    console.log("DRAGGED ON ECHO!");
      makeAnimSprite();
      var selectedObject = lessonScene.getObjectByName(event.object.parent.parent.name);
      console.log(selectedObject);

      //** SOUND PLAYS HERE */

      if(bugsEaten < bugsFound.length - 1)
      {
        bugsEaten++;
        console.log("Bugs Eaten: " + bugsEaten + " bugsFound: " + bugsFound.length);
      }
      //** ALL BUGS ARE EATEN, TRIGGER END OF GAME */
      else
      {
        if(!creditsContainer.classList.contains("active"))
        {
          creditsContainer.classList.toggle("active");
        }
        if(backButton.classList.contains("active"))
        {
          backButton.classList.toggle("active");
        }

        setTimeout(function() 
        {
          retryButton.classList.toggle("active");
        }, 30000);
        
        console.log("ALL BUGS EATEN!!");
      }

      var rnd = Math.floor(Math.random() * 3);
      if(rnd == 0)
      {
        echoChewSound.play();
      }
      else if(rnd == 1)
      {
        echoChewSound2.play();
      }
      else
      {
        echoChewSound3.play();
      }

      dragabbleObjects.splice(dragabbleObjects.indexOf(selectedObject), 1);
      lessonScene.remove(selectedObject);
  }
  else
  {
    console.log("RESET POSITION");
    event.object.position.set(0, 0, 0);
  }
} );

animate();
