import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';

// Configuration
const CONFIG = {
    spawnRate: 2,
    greenDuration: 5000,
    yellowDuration: 2000,
    pedestrianDuration: 8000,
    carSpeed: 0.05,
    truckSpeed: 0.03,
    leftTurnProbability: 0.2,
    truckProbability: 0.3
};

// Traffic Light States
const LIGHT_STATES = {
    RED: 'red',
    YELLOW: 'yellow',
    GREEN: 'green'
};

// Traffic Phases
const PHASES = {
    NORTH_SOUTH: 'north_south',
    NS_YELLOW: 'ns_yellow',
    EAST_WEST: 'east_west',
    EW_YELLOW: 'ew_yellow',
    PEDESTRIAN_WALK: 'pedestrian_walk'
};

// Directions
const DIRECTIONS = {
    NORTH: 'north',
    SOUTH: 'south',
    EAST: 'east',
    WEST: 'west'
};

// Global state
let scene, camera, renderer, controls;
let trafficLights = {};
let vehicles = [];
let pedestrians = [];
let currentPhase = PHASES.NORTH_SOUTH;
let phaseStartTime = Date.now();
let totalCarsPassed = 0;
let pedestrianQueue = new Set();
let lastSpawnTime = 0;

// Initialize the scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    // Create camera
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(40, 35, 40);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Add OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 20;
    controls.maxDistance = 100;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 50, 30);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -60;
    directionalLight.shadow.camera.right = 60;
    directionalLight.shadow.camera.top = 60;
    directionalLight.shadow.camera.bottom = -60;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Build the intersection
    createGround();
    createIntersection();
    createTrafficLights();

    // Setup UI event listeners
    setupEventListeners();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

function createGround() {
    // Grass ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228B22,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function createIntersection() {
    const roadWidth = 8;
    const roadLength = 50;

    // Asphalt material
    const asphaltMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2F4F4F,
        roughness: 0.9
    });

    // North-South road
    const nsRoadGeometry = new THREE.BoxGeometry(roadWidth, 0.1, roadLength);
    const nsRoad = new THREE.Mesh(nsRoadGeometry, asphaltMaterial);
    nsRoad.position.y = 0.05;
    nsRoad.receiveShadow = true;
    scene.add(nsRoad);

    // East-West road
    const ewRoadGeometry = new THREE.BoxGeometry(roadLength, 0.1, roadWidth);
    const ewRoad = new THREE.Mesh(ewRoadGeometry, asphaltMaterial);
    ewRoad.position.y = 0.05;
    ewRoad.receiveShadow = true;
    scene.add(ewRoad);

    // Sidewalks
    const sidewalkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xD3D3D3,
        roughness: 0.7
    });
    const sidewalkHeight = 0.3;
    const sidewalkWidth = 2;

    // Create sidewalks at corners
    const corners = [
        { x: (roadWidth/2 + sidewalkWidth/2), z: (roadWidth/2 + sidewalkWidth/2) },
        { x: -(roadWidth/2 + sidewalkWidth/2), z: (roadWidth/2 + sidewalkWidth/2) },
        { x: (roadWidth/2 + sidewalkWidth/2), z: -(roadWidth/2 + sidewalkWidth/2) },
        { x: -(roadWidth/2 + sidewalkWidth/2), z: -(roadWidth/2 + sidewalkWidth/2) }
    ];

    corners.forEach(corner => {
        const sidewalkGeometry = new THREE.BoxGeometry(sidewalkWidth, sidewalkHeight, sidewalkWidth);
        const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
        sidewalk.position.set(corner.x, sidewalkHeight/2, corner.z);
        sidewalk.castShadow = true;
        sidewalk.receiveShadow = true;
        scene.add(sidewalk);
    });

    // Crosswalks
    createCrosswalks(roadWidth);
}

function createCrosswalks(roadWidth) {
    const stripeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        roughness: 0.8
    });

    const stripeWidth = 0.5;
    const stripeLength = roadWidth;
    const numStripes = 6;
    const spacing = 0.8;

    // North crosswalk
    for (let i = 0; i < numStripes; i++) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeWidth, 0.11, stripeLength),
            stripeMaterial
        );
        stripe.position.set(0, 0.06, (roadWidth/2 + 1.5) - i * spacing);
        scene.add(stripe);
    }

    // South crosswalk
    for (let i = 0; i < numStripes; i++) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeWidth, 0.11, stripeLength),
            stripeMaterial
        );
        stripe.position.set(0, 0.06, -(roadWidth/2 + 1.5) + i * spacing);
        scene.add(stripe);
    }

    // East crosswalk
    for (let i = 0; i < numStripes; i++) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeLength, 0.11, stripeWidth),
            stripeMaterial
        );
        stripe.position.set((roadWidth/2 + 1.5) - i * spacing, 0.06, 0);
        scene.add(stripe);
    }

    // West crosswalk
    for (let i = 0; i < numStripes; i++) {
        const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeLength, 0.11, stripeWidth),
            stripeMaterial
        );
        stripe.position.set(-(roadWidth/2 + 1.5) + i * spacing, 0.06, 0);
        scene.add(stripe);
    }
}

function createTrafficLights() {
    const positions = [
        { dir: DIRECTIONS.NORTH, x: 5, z: 5 },
        { dir: DIRECTIONS.SOUTH, x: -5, z: -5 },
        { dir: DIRECTIONS.EAST, x: 5, z: -5 },
        { dir: DIRECTIONS.WEST, x: -5, z: 5 }
    ];

    positions.forEach(pos => {
        const light = createTrafficLight(pos.x, pos.z);
        trafficLights[pos.dir] = light;
        scene.add(light.group);
    });

    updateTrafficLights();
}

function createTrafficLight(x, z) {
    const group = new THREE.Group();

    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 4);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 2;
    pole.castShadow = true;
    group.add(pole);

    // Light box
    const boxGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.3);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 4.5;
    box.castShadow = true;
    group.add(box);

    // Create lights
    const lights = {};
    const lightPositions = [
        { color: 0xFF0000, y: 5, name: 'red' },
        { color: 0xFFFF00, y: 4.5, name: 'yellow' },
        { color: 0x00FF00, y: 4, name: 'green' }
    ];

    lightPositions.forEach(lightPos => {
        const lightGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const lightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            emissive: 0x000000
        });
        const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
        lightMesh.position.y = lightPos.y;
        lightMesh.position.z = 0.16;
        box.add(lightMesh);
        lights[lightPos.name] = { mesh: lightMesh, color: lightPos.color };
    });

    group.position.set(x, 0, z);

    return { group, lights, state: LIGHT_STATES.RED };
}

function updateTrafficLights() {
    // Reset all lights
    Object.values(trafficLights).forEach(light => {
        Object.values(light.lights).forEach(bulb => {
            bulb.mesh.material.color.setHex(0x333333);
            bulb.mesh.material.emissive.setHex(0x000000);
            bulb.mesh.material.emissiveIntensity = 0;
        });
    });

    if (currentPhase === PHASES.PEDESTRIAN_WALK) {
        // All red for pedestrians
        Object.values(trafficLights).forEach(light => {
            light.state = LIGHT_STATES.RED;
            const redLight = light.lights.red;
            redLight.mesh.material.color.setHex(redLight.color);
            redLight.mesh.material.emissive.setHex(redLight.color);
            redLight.mesh.material.emissiveIntensity = 0.8;
        });
        return;
    }

    // North-South lights
    const nsState = (currentPhase === PHASES.NORTH_SOUTH) ? LIGHT_STATES.GREEN :
                    (currentPhase === PHASES.NS_YELLOW) ? LIGHT_STATES.YELLOW :
                    LIGHT_STATES.RED;
    
    setLightState(trafficLights[DIRECTIONS.NORTH], nsState);
    setLightState(trafficLights[DIRECTIONS.SOUTH], nsState);

    // East-West lights
    const ewState = (currentPhase === PHASES.EAST_WEST) ? LIGHT_STATES.GREEN :
                    (currentPhase === PHASES.EW_YELLOW) ? LIGHT_STATES.YELLOW :
                    LIGHT_STATES.RED;
    
    setLightState(trafficLights[DIRECTIONS.EAST], ewState);
    setLightState(trafficLights[DIRECTIONS.WEST], ewState);
}

function setLightState(light, state) {
    light.state = state;
    const bulb = light.lights[state];
    bulb.mesh.material.color.setHex(bulb.color);
    bulb.mesh.material.emissive.setHex(bulb.color);
    bulb.mesh.material.emissiveIntensity = 0.8;
}

function updatePhase() {
    const elapsed = Date.now() - phaseStartTime;
    let shouldChangePhase = false;
    let nextPhase = currentPhase;

    switch(currentPhase) {
        case PHASES.NORTH_SOUTH:
            if (elapsed > CONFIG.greenDuration) {
                nextPhase = PHASES.NS_YELLOW;
                shouldChangePhase = true;
            }
            break;
        case PHASES.NS_YELLOW:
            if (elapsed > CONFIG.yellowDuration) {
                nextPhase = checkPedestrianQueue() || PHASES.EAST_WEST;
                shouldChangePhase = true;
            }
            break;
        case PHASES.EAST_WEST:
            if (elapsed > CONFIG.greenDuration) {
                nextPhase = PHASES.EW_YELLOW;
                shouldChangePhase = true;
            }
            break;
        case PHASES.EW_YELLOW:
            if (elapsed > CONFIG.yellowDuration) {
                nextPhase = checkPedestrianQueue() || PHASES.NORTH_SOUTH;
                shouldChangePhase = true;
            }
            break;
        case PHASES.PEDESTRIAN_WALK:
            if (elapsed > CONFIG.pedestrianDuration) {
                nextPhase = PHASES.NORTH_SOUTH;
                shouldChangePhase = true;
                pedestrianQueue.clear();
                updatePedestrianButtons();
            }
            break;
    }

    if (shouldChangePhase) {
        currentPhase = nextPhase;
        phaseStartTime = Date.now();
        updateTrafficLights();
        
        if (currentPhase === PHASES.PEDESTRIAN_WALK) {
            spawnPedestrians();
        }
    }
}

function checkPedestrianQueue() {
    if (pedestrianQueue.size > 0) {
        return PHASES.PEDESTRIAN_WALK;
    }
    return null;
}

function spawnVehicle() {
    const now = Date.now();
    const spawnInterval = 1000 / CONFIG.spawnRate;
    
    if (now - lastSpawnTime < spawnInterval) {
        return;
    }
    
    lastSpawnTime = now;

    const directions = [DIRECTIONS.NORTH, DIRECTIONS.SOUTH, DIRECTIONS.EAST, DIRECTIONS.WEST];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const isTruck = Math.random() < CONFIG.truckProbability;
    const isTurningLeft = Math.random() < CONFIG.leftTurnProbability;

    const vehicle = {
        direction,
        isTruck,
        isTurningLeft,
        speed: isTruck ? CONFIG.truckSpeed : CONFIG.carSpeed,
        waitingForTurn: false,
        hasCrossed: false
    };

    // Create vehicle mesh
    const size = isTruck ? { w: 1, h: 2, d: 3 } : { w: 0.8, h: 0.6, d: 1.5 };
    const geometry = new THREE.BoxGeometry(size.w, size.h, size.d);
    const color = isTruck ? 0x8B4513 : new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
    const material = new THREE.MeshStandardMaterial({ color });
    vehicle.mesh = new THREE.Mesh(geometry, material);
    vehicle.mesh.castShadow = true;
    vehicle.mesh.receiveShadow = true;

    // Set initial position based on direction
    const spawnDistance = 30;
    switch(direction) {
        case DIRECTIONS.NORTH:
            vehicle.mesh.position.set(-2, size.h/2, spawnDistance);
            vehicle.mesh.rotation.y = Math.PI;
            break;
        case DIRECTIONS.SOUTH:
            vehicle.mesh.position.set(2, size.h/2, -spawnDistance);
            vehicle.mesh.rotation.y = 0;
            break;
        case DIRECTIONS.EAST:
            vehicle.mesh.position.set(spawnDistance, size.h/2, 2);
            vehicle.mesh.rotation.y = -Math.PI/2;
            break;
        case DIRECTIONS.WEST:
            vehicle.mesh.position.set(-spawnDistance, size.h/2, -2);
            vehicle.mesh.rotation.y = Math.PI/2;
            break;
    }

    scene.add(vehicle.mesh);
    vehicles.push(vehicle);
}

function updateVehicles() {
    vehicles.forEach((vehicle, index) => {
        const light = trafficLights[vehicle.direction];
        const pos = vehicle.mesh.position;
        let shouldStop = false;

        // Check if should stop at red light
        if (!vehicle.hasCrossed) {
            const stopLine = 6;
            
            switch(vehicle.direction) {
                case DIRECTIONS.NORTH:
                    if (pos.z > -stopLine && light.state !== LIGHT_STATES.GREEN) {
                        shouldStop = true;
                    }
                    if (pos.z < 0) vehicle.hasCrossed = true;
                    break;
                case DIRECTIONS.SOUTH:
                    if (pos.z < stopLine && light.state !== LIGHT_STATES.GREEN) {
                        shouldStop = true;
                    }
                    if (pos.z > 0) vehicle.hasCrossed = true;
                    break;
                case DIRECTIONS.EAST:
                    if (pos.x > -stopLine && light.state !== LIGHT_STATES.GREEN) {
                        shouldStop = true;
                    }
                    if (pos.x < 0) vehicle.hasCrossed = true;
                    break;
                case DIRECTIONS.WEST:
                    if (pos.x < stopLine && light.state !== LIGHT_STATES.GREEN) {
                        shouldStop = true;
                    }
                    if (pos.x > 0) vehicle.hasCrossed = true;
                    break;
            }
        }

        if (!shouldStop) {
            // Handle left turn logic
            if (vehicle.isTurningLeft && !vehicle.waitingForTurn && Math.abs(pos.x) < 2 && Math.abs(pos.z) < 2) {
                vehicle.waitingForTurn = true;
                // Check for opposing traffic
                const hasOpposingTraffic = vehicles.some(other => {
                    if (other === vehicle) return false;
                    const otherPos = other.mesh.position;
                    // Simplified opposing traffic check
                    if (vehicle.direction === DIRECTIONS.NORTH || vehicle.direction === DIRECTIONS.SOUTH) {
                        return Math.abs(otherPos.z) < 10 && otherPos.x * pos.x < 0;
                    } else {
                        return Math.abs(otherPos.x) < 10 && otherPos.z * pos.z < 0;
                    }
                });
                
                if (hasOpposingTraffic) {
                    return; // Wait
                }
            }

            // Move vehicle
            if (vehicle.isTurningLeft && vehicle.waitingForTurn) {
                // Execute turn
                const turnSpeed = vehicle.speed * 0.8;
                switch(vehicle.direction) {
                    case DIRECTIONS.NORTH:
                        vehicle.mesh.position.x -= turnSpeed;
                        vehicle.mesh.position.z -= turnSpeed * 0.5;
                        vehicle.mesh.rotation.y += 0.02;
                        break;
                    case DIRECTIONS.SOUTH:
                        vehicle.mesh.position.x += turnSpeed;
                        vehicle.mesh.position.z += turnSpeed * 0.5;
                        vehicle.mesh.rotation.y += 0.02;
                        break;
                    case DIRECTIONS.EAST:
                        vehicle.mesh.position.x -= turnSpeed * 0.5;
                        vehicle.mesh.position.z -= turnSpeed;
                        vehicle.mesh.rotation.y += 0.02;
                        break;
                    case DIRECTIONS.WEST:
                        vehicle.mesh.position.x += turnSpeed * 0.5;
                        vehicle.mesh.position.z += turnSpeed;
                        vehicle.mesh.rotation.y += 0.02;
                        break;
                }
            } else {
                // Move straight
                switch(vehicle.direction) {
                    case DIRECTIONS.NORTH:
                        vehicle.mesh.position.z -= vehicle.speed;
                        break;
                    case DIRECTIONS.SOUTH:
                        vehicle.mesh.position.z += vehicle.speed;
                        break;
                    case DIRECTIONS.EAST:
                        vehicle.mesh.position.x -= vehicle.speed;
                        break;
                    case DIRECTIONS.WEST:
                        vehicle.mesh.position.x += vehicle.speed;
                        break;
                }
            }
        }

        // Remove vehicle if far enough
        const distanceFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
        if (distanceFromCenter > 35) {
            scene.remove(vehicle.mesh);
            vehicles.splice(index, 1);
            if (vehicle.hasCrossed) {
                totalCarsPassed++;
                updateStats();
            }
        }
    });
}

function spawnPedestrians() {
    const directions = Array.from(pedestrianQueue);
    
    directions.forEach(direction => {
        const numPeds = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numPeds; i++) {
            const pedestrian = {
                direction,
                progress: 0,
                speed: 0.01 + Math.random() * 0.01
            };

            // Create pedestrian mesh
            const geometry = new THREE.CylinderGeometry(0.2, 0.15, 1.2, 8);
            const material = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(Math.random(), 0.6, 0.4)
            });
            pedestrian.mesh = new THREE.Mesh(geometry, material);
            pedestrian.mesh.castShadow = true;

            // Set starting position
            const offset = (i - numPeds/2) * 0.5;
            switch(direction) {
                case DIRECTIONS.NORTH:
                    pedestrian.startPos = { x: offset, z: 6 };
                    pedestrian.endPos = { x: offset, z: -6 };
                    break;
                case DIRECTIONS.SOUTH:
                    pedestrian.startPos = { x: offset, z: -6 };
                    pedestrian.endPos = { x: offset, z: 6 };
                    break;
                case DIRECTIONS.EAST:
                    pedestrian.startPos = { x: 6, z: offset };
                    pedestrian.endPos = { x: -6, z: offset };
                    break;
                case DIRECTIONS.WEST:
                    pedestrian.startPos = { x: -6, z: offset };
                    pedestrian.endPos = { x: 6, z: offset };
                    break;
            }

            pedestrian.mesh.position.set(pedestrian.startPos.x, 0.6, pedestrian.startPos.z);
            scene.add(pedestrian.mesh);
            pedestrians.push(pedestrian);
        }
    });
}

function updatePedestrians() {
    pedestrians.forEach((ped, index) => {
        ped.progress += ped.speed;

        const x = ped.startPos.x + (ped.endPos.x - ped.startPos.x) * ped.progress;
        const z = ped.startPos.z + (ped.endPos.z - ped.startPos.z) * ped.progress;
        ped.mesh.position.set(x, 0.6, z);

        if (ped.progress >= 1) {
            scene.remove(ped.mesh);
            pedestrians.splice(index, 1);
        }
    });
}

function setupEventListeners() {
    // Spawn rate slider
    const spawnRateSlider = document.getElementById('spawn-rate');
    const spawnRateValue = document.getElementById('spawn-rate-value');
    spawnRateSlider.addEventListener('input', (e) => {
        CONFIG.spawnRate = parseFloat(e.target.value);
        spawnRateValue.textContent = CONFIG.spawnRate;
    });

    // Green duration slider
    const greenDurationSlider = document.getElementById('green-duration');
    const greenDurationValue = document.getElementById('green-duration-value');
    greenDurationSlider.addEventListener('input', (e) => {
        CONFIG.greenDuration = parseFloat(e.target.value) * 1000;
        greenDurationValue.textContent = e.target.value;
    });

    // Pedestrian buttons
    const pedButtons = document.querySelectorAll('.ped-button');
    pedButtons.forEach(button => {
        button.addEventListener('click', () => {
            const direction = button.dataset.direction;
            pedestrianQueue.add(direction);
            updatePedestrianButtons();
        });
    });
}

function updatePedestrianButtons() {
    const pedButtons = document.querySelectorAll('.ped-button');
    pedButtons.forEach(button => {
        const direction = button.dataset.direction;
        if (pedestrianQueue.has(direction)) {
            button.classList.add('requested');
        } else {
            button.classList.remove('requested');
        }
    });
}

function updateStats() {
    document.getElementById('total-cars').textContent = totalCarsPassed;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    updatePhase();
    spawnVehicle();
    updateVehicles();
    updatePedestrians();
    
    controls.update();
    renderer.render(scene, camera);
}

// Start the application
init();
