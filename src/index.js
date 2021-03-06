import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TextureLoader } from 'three/src/loaders/TextureLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

var camera, scene, renderer, controls;
var objects = [];
var raycaster;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;
var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();
var sky, sunSphere;

init();
animate();

function initSky() {
	sky = new Sky();
	sky.scale.setScalar( 450000 );
	scene.add( sky );

	sunSphere = new THREE.Mesh(
		new THREE.SphereBufferGeometry( 20000, 16, 8 ),
		new THREE.MeshBasicMaterial( { color: 0xffffff } )
	);
	sunSphere.position.y = - 700000;
	sunSphere.visible = true;
	scene.add( sunSphere );

	var effectController = {
		turbidity: 10,
		rayleigh: 2,
		mieCoefficient: 0.005,
		mieDirectionalG: 0.8,
		luminance: 1,
		inclination: 0.15, 
		azimuth: 0.25, 
		sun: ! true
	};

	var distance = 400000;

	var uniforms = sky.material.uniforms;
	uniforms[ "turbidity" ].value = effectController.turbidity;
	uniforms[ "rayleigh" ].value = effectController.rayleigh;
	uniforms[ "luminance" ].value = effectController.luminance;
	uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
	uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;

	var theta = Math.PI * ( effectController.inclination - 0.5 );
	var phi = 2 * Math.PI * ( effectController.azimuth - 0.5 );

	sunSphere.position.x = distance * Math.cos( phi );
	sunSphere.position.y = distance * Math.sin( phi ) * Math.sin( theta );
	sunSphere.position.z = distance * Math.sin( phi ) * Math.cos( theta );

	sunSphere.visible = effectController.sun;

	uniforms[ "sunPosition" ].value.copy( sunSphere.position );
}

function init() {
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 1000 );
	camera.position.y = 10;
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xffffff );
	scene.fog = new THREE.Fog( 0xffffff, 0, 750 );
	var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 1 );
	light.position.set( 0.5, 1, 0.75 );
	scene.add( light );
	var loader = new GLTFLoader();
	loader.load('models/garage.gltf', function ( gltf ) {
		console.log(gltf);
		scene.add(gltf.scene);
		gltf.animations; // Array<THREE.AnimationClip>
		gltf.scene; // THREE.Scene
		gltf.scenes; // Array<THREE.Scene>
		gltf.cameras; // Array<THREE.Camera>
		gltf.asset; // Object
	});
	controls = new PointerLockControls( camera );
	var blocker = document.getElementById( 'blocker' );
	var instructions = document.getElementById( 'instructions' );
	instructions.addEventListener( 'click', function () {
		controls.lock();
	}, false );
	controls.addEventListener( 'lock', function () {
		instructions.style.display = 'none';
		blocker.style.display = 'none';
	} );
	controls.addEventListener( 'unlock', function () {
		blocker.style.display = 'block';
		instructions.style.display = '';
	} );
	scene.add( controls.getObject() );
	var onKeyDown = function ( event ) {
		switch ( event.keyCode ) {
			case 38: // up
			case 87: // w
				moveForward = true;
				break;
			case 37: // left
			case 65: // a
				moveLeft = true;
				break;
			case 40: // down
			case 83: // s
				moveBackward = true;
				break;
			case 39: // right
			case 68: // d
				moveRight = true;
				break;
			case 32: // space
				if ( canJump === true ) velocity.y += 210;
				canJump = false;
				break;
		}
	};
	var onKeyUp = function ( event ) {
		switch ( event.keyCode ) {
			case 38: // up
			case 87: // w
				moveForward = false;
				break;
			case 37: // left
			case 65: // a
				moveLeft = false;
				break;
			case 40: // down
			case 83: // s
				moveBackward = false;
				break;
			case 39: // right
			case 68: // d
				moveRight = false;
				break;
		}
	};
	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );
	raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
	// floor
	var floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
	floorGeometry.rotateX( - Math.PI / 2 );
	//~ // vertex displacement
	var position = floorGeometry.attributes.position;
	//~ for ( var i = 0, l = position.count; i < l; i ++ ) {
		//~ vertex.fromBufferAttribute( position, i );
		//~ vertex.x += Math.random() * 20 - 10;
		//~ vertex.y += Math.random() * 2;
		//~ vertex.z += Math.random() * 20 - 10;
		//~ position.setXYZ( i, vertex.x, vertex.y, vertex.z );
	//~ }
	//~ floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices
	//~ position = floorGeometry.attributes.position;
	var colors = [];
	for ( var i = 0, l = position.count; i < l; i ++ ) {
		color.setHSL( Math.random() * 0.3 + 0.5, 0.75, Math.random() * 0.25 + 0.75 );
		colors.push( color.r, color.g, color.b );
	}
	var texture = new THREE.TextureLoader().load( 'models/concrete_clean_0037_01.jpg' );
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set( 6, 6 );
	floorGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
	var floorMaterial = new THREE.MeshBasicMaterial( { map: texture } );
	var floor = new THREE.Mesh( floorGeometry, floorMaterial );
	scene.add( floor );
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	//
	initSky();
	window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.render( scene, camera );
}

function animate() {
requestAnimationFrame( animate );
if ( controls.isLocked === true ) {
	raycaster.ray.origin.copy( controls.getObject().position );
	raycaster.ray.origin.y -= 10;
	var intersections = raycaster.intersectObjects( objects );
	var onObject = intersections.length > 0;
	var time = performance.now();
	var delta = ( time - prevTime ) / 1000;
	velocity.x -= velocity.x * 10.0 * delta;
	velocity.z -= velocity.z * 10.0 * delta;
	velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass
	direction.z = Number( moveForward ) - Number( moveBackward );
	direction.x = Number( moveLeft ) - Number( moveRight );
	direction.normalize(); // this ensures consistent movements in all directions
	if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
	if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;
	if ( onObject === true ) {
		velocity.y = Math.max( 0, velocity.y );
		canJump = true;
	}
	controls.getObject().translateX( velocity.x * delta );
	controls.getObject().position.y += ( velocity.y * delta ); // new behavior
	controls.getObject().translateZ( velocity.z * delta );
	if ( controls.getObject().position.y < 10 ) {
		velocity.y = 0;
		controls.getObject().position.y = 10;
		canJump = true;
	}
	prevTime = time;
}
renderer.render( scene, camera );
}
