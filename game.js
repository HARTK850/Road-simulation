// Import Three.js (השורה הזו נמחקה/הוערה)

// Game State Management
const GameState = {
  coins: 0,
  highScore: 0,
  gardenItems: [],

  load() {
    const saved = localStorage.getItem("catCashDash")
    if (saved) {
      const data = JSON.parse(saved)
      this.coins = data.coins || 0
      this.highScore = data.highScore || 0
      this.gardenItems = data.gardenItems || []
    }
  },

  save() {
    localStorage.setItem(
      "catCashDash",
      JSON.stringify({
        coins: this.coins,
        highScore: this.highScore,
        gardenItems: this.gardenItems,
      }),
    )
  },

  addCoins(amount) {
    this.coins += amount
    this.save()
  },

  spendCoins(amount) {
    if (this.coins >= amount) {
      this.coins -= amount
      this.save()
      return true
    }
    return false
  },

  updateHighScore(score) {
    if (score > this.highScore) {
      this.highScore = score
      this.save()
    }
  },

  addGardenItem(item) {
    this.gardenItems.push(item)
    this.save()
  },

  removeGardenItem(index) {
    this.gardenItems.splice(index, 1)
    this.save()
  },

  reset() {
    this.coins = 0
    this.highScore = 0
    this.gardenItems = []
    localStorage.removeItem("catCashDash")
  },
}

// Garden Items Catalog
const GardenCatalog = {
  flowers: [
    { id: "rose", name: "ורד אדום", icon: "🌹", price: 50, color: 0xff0000, size: 0.3 },
    { id: "tulip", name: "צבעוני", icon: "🌷", price: 40, color: 0xff69b4, size: 0.3 },
    { id: "sunflower", name: "חמנייה", icon: "🌻", price: 60, color: 0xffff00, size: 0.4 },
    { id: "daisy", name: "חיננית", icon: "🌼", price: 35, color: 0xffffff, size: 0.25 },
    { id: "hibiscus", name: "היביסקוס", icon: "🌺", price: 70, color: 0xff1493, size: 0.35 },
    { id: "blossom", name: "פריחה", icon: "🌸", price: 45, color: 0xffb6c1, size: 0.3 },
  ],
  trees: [
    { id: "palm", name: "דקל", icon: "🌴", price: 200, color: 0x228b22, size: 1.5 },
    { id: "pine", name: "אורן", icon: "🌲", price: 180, color: 0x006400, size: 1.8 },
    { id: "deciduous", name: "עץ נשיר", icon: "🌳", price: 150, color: 0x32cd32, size: 1.6 },
    { id: "cherry", name: "דובדבן", icon: "🌸", price: 250, color: 0xffb6c1, size: 1.4 },
  ],
  decorations: [
    { id: "bench", name: "ספסל", icon: "🪑", price: 100, color: 0x8b4513, size: 0.8 },
    { id: "fountain", name: "מזרקה", icon: "⛲", price: 300, color: 0x4169e1, size: 1.0 },
    { id: "lamp", name: "פנס", icon: "💡", price: 120, color: 0xffd700, size: 1.2 },
    { id: "statue", name: "פסל", icon: "🗿", price: 250, color: 0x808080, size: 1.0 },
  ],
  bushes: [
    { id: "bush1", name: "שיח קטן", icon: "🌿", price: 80, color: 0x228b22, size: 0.5 },
    { id: "bush2", name: "שיח בינוני", icon: "🪴", price: 100, color: 0x2e8b57, size: 0.7 },
    { id: "bush3", name: "שיח גדול", icon: "🌳", price: 130, color: 0x006400, size: 0.9 },
  ],
  special: [
    { id: "rainbow", name: "קשת", icon: "🌈", price: 500, color: 0xff00ff, size: 2.0 },
    { id: "mushroom", name: "פטרייה", icon: "🍄", price: 150, color: 0xff0000, size: 0.6 },
    { id: "crystal", name: "גביש", icon: "💎", price: 400, color: 0x00ffff, size: 0.8 },
  ],
  animals: [
    { id: "butterfly", name: "פרפר", icon: "🦋", price: 90, color: 0xff69b4, size: 0.3 },
    { id: "bird", name: "ציפור", icon: "🐦", price: 110, color: 0x1e90ff, size: 0.4 },
    { id: "rabbit", name: "ארנב", icon: "🐰", price: 180, color: 0xffffff, size: 0.5 },
  ],
}

// Screen Management
class ScreenManager {
  constructor() {
    this.screens = {
      loading: document.getElementById("loading-screen"),
      menu: document.getElementById("main-menu"),
      runner: document.getElementById("runner-mode"),
      garden: document.getElementById("garden-mode"),
    }
    this.currentScreen = "loading"
  }

  show(screenName) {
    Object.values(this.screens).forEach((screen) => screen.classList.remove("active"))
    this.screens[screenName].classList.add("active")
    this.currentScreen = screenName
  }
}

// Runner Game
class RunnerGame {
  constructor() {
    this.canvas = document.getElementById("runner-canvas")
    this.scene = null
    this.camera = null
    this.renderer = null
    this.playerCat = null
    this.thiefCat = null
    this.obstacles = []
    this.coins = []
    this.powerups = []
    this.activePowerups = new Map()

    this.gameState = {
      running: false,
      paused: false,
      distance: 0,
      speed: 0.1,
      coinsCollected: 0,
      lane: 0, // -1 left, 0 center, 1 right
    }

    this.keys = {}
    this.setupEventListeners()
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      this.keys[e.key] = true

      if (this.gameState.running && !this.gameState.paused) {
        if (e.key === "ArrowLeft" && this.gameState.lane > -1) {
          this.gameState.lane--
          this.movePlayerToLane()
        } else if (e.key === "ArrowRight" && this.gameState.lane < 1) {
          this.gameState.lane++
          this.movePlayerToLane()
        } else if (e.key === " ") {
          this.jump()
        }
      }
    })

    document.addEventListener("keyup", (e) => {
      this.keys[e.key] = false
    })

    document.getElementById("pause-btn").addEventListener("click", () => this.pause())
    document.getElementById("resume-btn").addEventListener("click", () => this.resume())
    document.getElementById("restart-runner-btn").addEventListener("click", () => this.restart())
    document.getElementById("menu-from-runner-btn").addEventListener("click", () => this.backToMenu())
    document.getElementById("menu-from-pause-btn").addEventListener("click", () => this.backToMenu())
  }

  init() {
    // Setup Three.js scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.Fog(0x87ceeb, 10, 50)

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 3, 5)
    this.camera.lookAt(0, 0, -5)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    this.scene.add(directionalLight)

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(10, 100)
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.z = -25
    ground.receiveShadow = true
    this.scene.add(ground)

    // Road lanes
    for (let i = -1; i <= 1; i++) {
      const laneGeometry = new THREE.PlaneGeometry(2, 100)
      const laneMaterial = new THREE.MeshLambertMaterial({ color: 0x404040 })
      const lane = new THREE.Mesh(laneGeometry, laneMaterial)
      lane.rotation.x = -Math.PI / 2
      lane.position.set(i * 2.5, 0.01, -25)
      this.scene.add(lane)

      // Lane markings
      for (let j = 0; j < 20; j++) {
        const markingGeometry = new THREE.PlaneGeometry(0.2, 1)
        const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
        const marking = new THREE.Mesh(markingGeometry, markingMaterial)
        marking.rotation.x = -Math.PI / 2
        marking.position.set(i  2.5 + 1.25, 0.02, j  5 - 25)
        this.scene.add(marking)
      }
    }

    // Player cat
    this.createPlayerCat()

    // Thief cat
    this.createThiefCat()

    // Window resize
    window.addEventListener("resize", () => this.onWindowResize())

    this.start()
  }

  createPlayerCat() {
    const catGroup = new THREE.Group()

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.8)
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff8c00 })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.castShadow = true
    catGroup.add(body)

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16)
    const head = new THREE.Mesh(headGeometry, bodyMaterial)
    head.position.set(0, 0.3, 0.4)
    head.castShadow = true
    catGroup.add(head)

    // Ears
    const earGeometry = new THREE.ConeGeometry(0.1, 0.2, 8)
    const leftEar = new THREE.Mesh(earGeometry, bodyMaterial)
    leftEar.position.set(-0.15, 0.5, 0.4)
    catGroup.add(leftEar)

    const rightEar = new THREE.Mesh(earGeometry, bodyMaterial)
    rightEar.position.set(0.15, 0.5, 0.4)
    catGroup.add(rightEar)

    // Tail
    const tailGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.6, 8)
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial)
    tail.position.set(0, 0.2, -0.5)
    tail.rotation.x = Math.PI / 4
    catGroup.add(tail)

    catGroup.position.set(0, 0.5, 0)
    this.playerCat = catGroup
    this.scene.add(catGroup)
  }

  createThiefCat() {
    const catGroup = new THREE.Group()

    // Body (black cat)
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.35, 0.7)
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.castShadow = true
    catGroup.add(body)

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16)
    const head = new THREE.Mesh(headGeometry, bodyMaterial)
    head.position.set(0, 0.25, 0.35)
    head.castShadow = true
    catGroup.add(head)

    // Money bag
    const bagGeometry = new THREE.SphereGeometry(0.2, 16, 16)
    const bagMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 })
    const bag = new THREE.Mesh(bagGeometry, bagMaterial)
    bag.position.set(0, 0.1, -0.4)
    catGroup.add(bag)

    catGroup.position.set(0, 0.5, -8)
    this.thiefCat = catGroup
    this.scene.add(catGroup)
  }

  movePlayerToLane() {
    const targetX = this.gameState.lane * 2.5
    this.playerCat.position.x = targetX
  }

  jump() {
    if (this.playerCat.userData.jumping) return

    this.playerCat.userData.jumping = true
    this.playerCat.userData.jumpVelocity = 0.15
  }

  spawnObstacle() {
    const types = ["box", "cone", "barrier"]
    const type = types[Math.floor(Math.random() * types.length)]
    const lane = Math.floor(Math.random() * 3) - 1

    let obstacle
    const material = new THREE.MeshLambertMaterial({ color: 0x8b4513 })

    switch (type) {
      case "box":
        const boxGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8)
        obstacle = new THREE.Mesh(boxGeometry, material)
        break
      case "cone":
        const coneGeometry = new THREE.ConeGeometry(0.4, 1, 8)
        obstacle = new THREE.Mesh(coneGeometry, new THREE.MeshLambertMaterial({ color: 0xff6600 }))
        break
      case "barrier":
        const barrierGeometry = new THREE.BoxGeometry(2, 0.5, 0.3)
        obstacle = new THREE.Mesh(barrierGeometry, new THREE.MeshLambertMaterial({ color: 0xff0000 }))
        break
    }

    obstacle.position.set(lane * 2.5, 0.5, -30)
    obstacle.castShadow = true
    obstacle.userData.type = "obstacle"
    this.scene.add(obstacle)
    this.obstacles.push(obstacle)
  }

  spawnCoin() {
    const lane = Math.floor(Math.random() * 3) - 1

    const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16)
    const coinMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 })
    const coin = new THREE.Mesh(coinGeometry, coinMaterial)

    coin.position.set(lane * 2.5, 1, -30)
    coin.rotation.x = Math.PI / 2
    coin.userData.type = "coin"
    coin.userData.rotation = 0
    this.scene.add(coin)
    this.coins.push(coin)
  }

  spawnPowerup() {
    const types = ["magnet", "invincible", "double", "slow"]
    const type = types[Math.floor(Math.random() * types.length)]
    const lane = Math.floor(Math.random() * 3) - 1

    const colors = {
      magnet: 0xff00ff,
      invincible: 0x00ffff,
      double: 0xffff00,
      slow: 0x00ff00,
    }

    const powerupGeometry = new THREE.SphereGeometry(0.4, 16, 16)
    const powerupMaterial = new THREE.MeshLambertMaterial({ color: colors[type] })
    const powerup = new THREE.Mesh(powerupGeometry, powerupMaterial)

    powerup.position.set(lane * 2.5, 1, -30)
    powerup.userData.type = "powerup"
    powerup.userData.powerupType = type
    powerup.userData.bobOffset = Math.random()  Math.PI  2
    this.scene.add(powerup)
    this.powerups.push(powerup)
  }

  activatePowerup(type) {
    const duration = 5000 // 5 seconds
    const icons = {
      magnet: "🧲",
      invincible: "⭐",
      double: "💰",
      slow: "🐌",
    }
    const names = {
      magnet: "מגנט",
      invincible: "בלתי מנוצח",
      double: "מטבעות כפולים",
      slow: "האטה",
    }

    this.activePowerups.set(type, Date.now() + duration)
    this.updatePowerupDisplay()

    setTimeout(() => {
      this.activePowerups.delete(type)
      this.updatePowerupDisplay()
    }, duration)
  }

  updatePowerupDisplay() {
    const container = document.getElementById("active-powerups")
    container.innerHTML = ""

    const icons = {
      magnet: "🧲",
      invincible: "⭐",
      double: "💰",
      slow: "🐌",
    }
    const names = {
      magnet: "מגנט",
      invincible: "בלתי מנוצח",
      double: "מטבעות כפולים",
      slow: "האטה",
    }

    this.activePowerups.forEach((endTime, type) => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000)
      const div = document.createElement("div")
      div.className = "powerup-indicator"
      div.innerHTML = 
                <span class="powerup-icon">${icons[type]}</span>
                <span>${names[type]}</span>
                <span class="powerup-timer">${remaining}s</span>
            
      container.appendChild(div)
    })
  }

  checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(this.playerCat)

    // Check obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i]
      const obstacleBox = new THREE.Box3().setFromObject(obstacle)

      if (playerBox.intersectsBox(obstacleBox)) {
        if (!this.activePowerups.has("invincible")) {
          this.gameOver()
          return
        } else {
          // Destroy obstacle
          this.scene.remove(obstacle)
          this.obstacles.splice(i, 1)
        }
      }
    }

    // Check coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i]
      const coinBox = new THREE.Box3().setFromObject(coin)

      const magnetRange = this.activePowerups.has("magnet") ? 3 : 1
      const distance = this.playerCat.position.distanceTo(coin.position)

      if (distance < magnetRange) {
        // Move coin towards player
        const direction = new THREE.Vector3().subVectors(this.playerCat.position, coin.position).normalize()
        coin.position.add(direction.multiplyScalar(0.2))
      }

      if (playerBox.intersectsBox(coinBox)) {
        const coinValue = this.activePowerups.has("double") ? 2 : 1
        this.gameState.coinsCollected += coinValue
        this.scene.remove(coin)
        this.coins.splice(i, 1)
        this.updateUI()
      }
    }

    // Check powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const powerup = this.powerups[i]
      const powerupBox = new THREE.Box3().setFromObject(powerup)

      if (playerBox.intersectsBox(powerupBox)) {
        this.activatePowerup(powerup.userData.powerupType)
        this.scene.remove(powerup)
        this.powerups.splice(i, 1)
      }
    }
  }

  updateUI() {
    document.getElementById("runner-coins").textContent = this.gameState.coinsCollected
    document.getElementById("runner-distance").textContent = Math.floor(this.gameState.distance)
    document.getElementById("runner-speed").textContent = (1 + this.gameState.speed * 5).toFixed(1) + "x"
  }

  start() {
    this.gameState.running = true
    this.gameState.paused = false
    this.gameState.distance = 0
    this.gameState.speed = 0.1
    this.gameState.coinsCollected = 0
    this.gameState.lane = 0

    this.obstacles = []
    this.coins = []
    this.powerups = []
    this.activePowerups.clear()

    this.playerCat.position.set(0, 0.5, 0)
    this.updateUI()
    this.updatePowerupDisplay()

    this.animate()
  }

  pause() {
    this.gameState.paused = true
    document.getElementById("pause-overlay").classList.add("active")
  }

  resume() {
    this.gameState.paused = false
    document.getElementById("pause-overlay").classList.remove("active")
  }

  restart() {
    document.getElementById("game-over").classList.remove("active")

    // Clear scene
    this.obstacles.forEach((obj) => this.scene.remove(obj))
    this.coins.forEach((obj) => this.scene.remove(obj))
    this.powerups.forEach((obj) => this.scene.remove(obj))

    this.start()
  }

  gameOver() {
    this.gameState.running = false

    GameState.addCoins(this.gameState.coinsCollected)
    GameState.updateHighScore(Math.floor(this.gameState.distance))

    document.getElementById("final-distance").textContent = Math.floor(this.gameState.distance)
    document.getElementById("final-coins").textContent = this.gameState.coinsCollected
    document.getElementById("total-coins").textContent = GameState.coins
    document.getElementById("game-over").classList.add("active")
  }

  backToMenu() {
    this.gameState.running = false
    document.getElementById("game-over").classList.remove("active")
    document.getElementById("pause-overlay").classList.remove("active")
    screenManager.show("menu")
    updateMenuStats()
  }

  animate() {
    if (!this.gameState.running) return

    requestAnimationFrame(() => this.animate())

    if (this.gameState.paused) return

    // Update speed
    this.gameState.speed = Math.min(0.3, 0.1 + this.gameState.distance * 0.0001)
    const currentSpeed = this.activePowerups.has("slow") ? this.gameState.speed * 0.5 : this.gameState.speed

    // Update distance
    this.gameState.distance += currentSpeed * 10

    // Move thief cat
    this.thiefCat.position.z += currentSpeed * 0.5
    if (this.thiefCat.position.z > 5) {
      this.thiefCat.position.z = -15
    }

    // Animate thief cat
    this.thiefCat.rotation.y = Math.sin(Date.now()  0.005)  0.2

    // Jump physics
    if (this.playerCat.userData.jumping) {
      this.playerCat.position.y += this.playerCat.userData.jumpVelocity
      this.playerCat.userData.jumpVelocity -= 0.01

      if (this.playerCat.position.y <= 0.5) {
        this.playerCat.position.y = 0.5
        this.playerCat.userData.jumping = false
      }
    }

    // Animate player cat
    this.playerCat.rotation.z = Math.sin(Date.now()  0.01)  0.1

    // Move and remove obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      this.obstacles[i].position.z += currentSpeed

      if (this.obstacles[i].position.z > 5) {
        this.scene.remove(this.obstacles[i])
        this.obstacles.splice(i, 1)
      }
    }

    // Move and animate coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      this.coins[i].position.z += currentSpeed
      this.coins[i].userData.rotation += 0.05
      this.coins[i].rotation.y = this.coins[i].userData.rotation

      if (this.coins[i].position.z > 5) {
        this.scene.remove(this.coins[i])
        this.coins.splice(i, 1)
      }
    }

    // Move and animate powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      this.powerups[i].position.z += currentSpeed
      this.powerups[i].position.y = 1 + Math.sin(Date.now()  0.005 + this.powerups[i].userData.bobOffset)  0.2
      this.powerups[i].rotation.y += 0.05

      if (this.powerups[i].position.z > 5) {
        this.scene.remove(this.powerups[i])
        this.powerups.splice(i, 1)
      }
    }

    // Spawn new objects
    if (Math.random() < 0.02) this.spawnObstacle()
    if (Math.random() < 0.05) this.spawnCoin()
    if (Math.random() < 0.005) this.spawnPowerup()

    // Check collisions
    this.checkCollisions()

    // Update UI
    this.updateUI()

    // Update powerup timers
    if (this.activePowerups.size > 0) {
      this.updatePowerupDisplay()
    }

    // Render
    this.renderer.render(this.scene, this.camera)
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}

// Garden Mode
class GardenMode {
  constructor() {
    this.canvas = document.getElementById("garden-canvas")
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = {
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
      rotation: { x: 0, y: 0 },
    }
    this.placedItems = []
    this.selectedItem = null
    this.selectedCategory = "flowers"
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.previewObject = null

    this.setupEventListeners()
  }

  setupEventListeners() {
    document.getElementById("back-to-menu-btn").addEventListener("click", () => this.backToMenu())
    document.getElementById("shop-toggle-btn").addEventListener("click", () => this.toggleShop())
    document.getElementById("shop-close-btn").addEventListener("click", () => this.toggleShop())

    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e))
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e))
    this.canvas.addEventListener("mouseup", () => this.onMouseUp())
    this.canvas.addEventListener("click", (e) => this.onCanvasClick(e))

    document.addEventListener("keydown", (e) => {
      if (e.key === "Delete" && this.selectedPlacedItem) {
        this.removeItem(this.selectedPlacedItem)
      }
    })
  }

  init() {
    // Setup Three.js scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    this.camera.position.set(0, 10, 15)
    this.camera.lookAt(0, 0, 0)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    this.scene.add(directionalLight)

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(30, 30)
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 })
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    // Grid helper
    const gridHelper = new THREE.GridHelper(30, 30, 0x888888, 0xcccccc)
    this.scene.add(gridHelper)

    // Load saved items
    this.loadGardenItems()

    // Setup shop
    this.setupShop()

    // Update UI
    this.updateUI()

    // Window resize
    window.addEventListener("resize", () => this.onWindowResize())

    this.animate()
  }

  setupShop() {
    const categoriesContainer = document.getElementById("shop-categories")
    const categories = Object.keys(GardenCatalog)

    const categoryNames = {
      flowers: "פרחים",
      trees: "עצים",
      decorations: "קישוטים",
      bushes: "שיחים",
      special: "מיוחדים",
      animals: "חיות",
    }

    categories.forEach((category) => {
      const btn = document.createElement("button")
      btn.className = "category-btn"
      if (category === this.selectedCategory) btn.classList.add("active")
      btn.textContent = categoryNames[category]
      btn.addEventListener("click", () => this.selectCategory(category))
      categoriesContainer.appendChild(btn)
    })

    this.updateShopItems()
  }

  selectCategory(category) {
    this.selectedCategory = category

    document.querySelectorAll(".category-btn").forEach((btn) => btn.classList.remove("active"))
    event.target.classList.add("active")

    this.updateShopItems()
  }

  updateShopItems() {
    const itemsContainer = document.getElementById("shop-items")
    itemsContainer.innerHTML = ""

    const items = GardenCatalog[this.selectedCategory]

    items.forEach((item) => {
      const div = document.createElement("div")
      div.className = "shop-item"
      if (GameState.coins < item.price) div.classList.add("insufficient")
      if (this.selectedItem && this.selectedItem.id === item.id) div.classList.add("selected")

      div.innerHTML = 
                <div class="item-header">
                    <span class="item-icon">${item.icon}</span>
                    <span class="item-price">💰 ${item.price}</span>
                </div>
                <div class="item-name">${item.name}</div>
                <div class="item-description">לחץ לבחירה ואז לחץ בגן למיקום</div>
            

      div.addEventListener("click", () => this.selectItem(item))
      itemsContainer.appendChild(div)
    })
  }

  selectItem(item) {
    if (GameState.coins < item.price) return

    this.selectedItem = item
    this.updateShopItems()

    // Create preview
    if (this.previewObject) {
      this.scene.remove(this.previewObject)
    }

    this.previewObject = this.createItemMesh(item)
    this.previewObject.material.transparent = true
    this.previewObject.material.opacity = 0.5
    this.scene.add(this.previewObject)
  }

  createItemMesh(item) {
    let geometry, material, mesh

    material = new THREE.MeshLambertMaterial({ color: item.color })

    if (
      item.id.includes("tree") ||
      item.id === "palm" ||
      item.id === "pine" ||
      item.id === "deciduous" ||
      item.id === "cherry"
    ) {
      // Tree
      const group = new THREE.Group()

      const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, item.size * 0.6, 8)
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
      trunk.position.y = item.size * 0.3
      trunk.castShadow = true
      group.add(trunk)

      const leavesGeometry = new THREE.SphereGeometry(item.size * 0.4, 16, 16)
      const leaves = new THREE.Mesh(leavesGeometry, material)
      leaves.position.y = item.size * 0.8
      leaves.castShadow = true
      group.add(leaves)

      return group
    } else if (item.id.includes("flower") || item.id.includes("rose") || item.id.includes("tulip")) {
      // Flower
      const group = new THREE.Group()

      const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, item.size * 1.5, 8)
      const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 })
      const stem = new THREE.Mesh(stemGeometry, stemMaterial)
      stem.position.y = item.size * 0.75
      group.add(stem)

      const petalGeometry = new THREE.SphereGeometry(item.size * 0.5, 8, 8)
      const petal = new THREE.Mesh(petalGeometry, material)
      petal.position.y = item.size * 1.5
      petal.castShadow = true
      group.add(petal)

      return group
    } else if (item.id === "bench") {
      // Bench
      const group = new THREE.Group()

      const seatGeometry = new THREE.BoxGeometry(item.size  1.5, 0.1, item.size  0.5)
      const seat = new THREE.Mesh(seatGeometry, material)
      seat.position.y = item.size * 0.5
      seat.castShadow = true
      group.add(seat)

      const backGeometry = new THREE.BoxGeometry(item.size  1.5, item.size  0.6, 0.1)
      const back = new THREE.Mesh(backGeometry, material)
      back.position.set(0, item.size  0.8, -item.size  0.2)
      back.castShadow = true
      group.add(back)

      return group
    } else if (item.id === "fountain") {
      // Fountain
      const group = new THREE.Group()

      const baseGeometry = new THREE.CylinderGeometry(item.size  0.6, item.size  0.8, item.size * 0.3, 16)
      const base = new THREE.Mesh(baseGeometry, material)
      base.position.y = item.size * 0.15
      base.castShadow = true
      group.add(base)

      const pillarGeometry = new THREE.CylinderGeometry(item.size  0.2, item.size  0.2, item.size * 0.8, 16)
      const pillar = new THREE.Mesh(pillarGeometry, material)
      pillar.position.y = item.size * 0.7
      group.add(pillar)

      const topGeometry = new THREE.SphereGeometry(item.size * 0.3, 16, 16)
      const top = new THREE.Mesh(topGeometry, material)
      top.position.y = item.size * 1.1
      top.castShadow = true
      group.add(top)

      return group
    } else {
      // Default shape
      geometry = new THREE.BoxGeometry(item.size, item.size, item.size)
      mesh = new THREE.Mesh(geometry, material)
      mesh.castShadow = true
      return mesh
    }
  }

  onMouseDown(e) {
    if (e.button === 0 && !this.selectedItem) {
      this.controls.isDragging = true
      this.controls.previousMousePosition = { x: e.clientX, y: e.clientY }
    }
  }

  onMouseMove(e) {
    // Update mouse position for raycasting
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1

    // Camera rotation
    if (this.controls.isDragging) {
      const deltaX = e.clientX - this.controls.previousMousePosition.x
      const deltaY = e.clientY - this.controls.previousMousePosition.y

      this.controls.rotation.y += deltaX * 0.005
      this.controls.rotation.x += deltaY * 0.005

      this.controls.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.controls.rotation.x))

      const radius = 15
      this.camera.position.x = radius  Math.sin(this.controls.rotation.y)  Math.cos(this.controls.rotation.x)
      this.camera.position.y = 10 + radius * Math.sin(this.controls.rotation.x)
      this.camera.position.z = radius  Math.cos(this.controls.rotation.y)  Math.cos(this.controls.rotation.x)
      this.camera.lookAt(0, 0, 0)

      this.controls.previousMousePosition = { x: e.clientX, y: e.clientY }
    }

    // Update preview position
    if (this.previewObject) {
      this.raycaster.setFromCamera(this.mouse, this.camera)
      const intersects = this.raycaster.intersectObject(this.ground)

      if (intersects.length > 0) {
        const point = intersects[0].point
        this.previewObject.position.set(point.x, 0, point.z)
      }
    }
  }

  onMouseUp() {
    this.controls.isDragging = false
  }

  onCanvasClick(e) {
    if (this.controls.isDragging) return

    this.raycaster.setFromCamera(this.mouse, this.camera)

    if (this.selectedItem) {
      // Place item
      const intersects = this.raycaster.intersectObject(this.ground)

      if (intersects.length > 0) {
        if (GameState.spendCoins(this.selectedItem.price)) {
          const point = intersects[0].point
          this.placeItem(this.selectedItem, point.x, point.z)

          this.selectedItem = null
          if (this.previewObject) {
            this.scene.remove(this.previewObject)
            this.previewObject = null
          }

          this.updateUI()
          this.updateShopItems()
        }
      }
    } else {
      // Select placed item
      const intersects = this.raycaster.intersectObjects(this.placedItems.map((item) => item.mesh))

      if (intersects.length > 0) {
        this.selectPlacedItem(intersects[0].object)
      }
    }
  }

  placeItem(item, x, z) {
    const mesh = this.createItemMesh(item)
    mesh.position.set(x, 0, z)
    this.scene.add(mesh)

    const placedItem = {
      item: item,
      mesh: mesh,
      position: { x, z },
    }

    this.placedItems.push(placedItem)
    GameState.addGardenItem({ itemId: item.id, x, z })

    this.updateUI()
  }

  selectPlacedItem(mesh) {
    // Deselect previous
    if (this.selectedPlacedItem) {
      this.selectedPlacedItem.mesh.traverse((child) => {
        if (child.material) {
          child.material.emissive.setHex(0x000000)
        }
      })
    }

    // Select new
    const item = this.placedItems.find((item) => item.mesh === mesh || item.mesh.children.includes(mesh))
    if (item) {
      this.selectedPlacedItem = item
      item.mesh.traverse((child) => {
        if (child.material) {
          child.material.emissive.setHex(0x444444)
        }
      })
    }
  }

  removeItem(placedItem) {
    const index = this.placedItems.indexOf(placedItem)
    if (index > -1) {
      this.scene.remove(placedItem.mesh)
      this.placedItems.splice(index, 1)
      GameState.removeGardenItem(index)
      this.selectedPlacedItem = null
      this.updateUI()
    }
  }

  loadGardenItems() {
    GameState.gardenItems.forEach((savedItem) => {
      // Find item in catalog
      let item = null
      for (const category in GardenCatalog) {
        item = GardenCatalog[category].find((i) => i.id === savedItem.itemId)
        if (item) break
      }

      if (item) {
        const mesh = this.createItemMesh(item)
        mesh.position.set(savedItem.x, 0, savedItem.z)
        this.scene.add(mesh)

        this.placedItems.push({
          item: item,
          mesh: mesh,
          position: { x: savedItem.x, z: savedItem.z },
        })
      }
    })
  }

  toggleShop() {
    const panel = document.getElementById("shop-panel")
    panel.classList.toggle("open")
  }

  updateUI() {
    document.getElementById("garden-coins").textContent = GameState.coins
    document.getElementById("garden-items-count").textContent = this.placedItems.length
  }

  backToMenu() {
    screenManager.show("menu")
    updateMenuStats()
  }

  animate() {
    requestAnimationFrame(() => this.animate())

    // Animate placed items
    this.placedItems.forEach((item) => {
      if (item.item.id.includes("flower")) {
        item.mesh.rotation.y += 0.005
      }
    })

    this.renderer.render(this.scene, this.camera)
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  dispose() {
    if (this.renderer) {
      this.renderer.dispose()
    }
  }
}

// Main Application
const screenManager = new ScreenManager()
let runnerGame = null
let gardenMode = null

function updateMenuStats() {
  document.getElementById("menu-coins").textContent = GameState.coins
  document.getElementById("menu-high-score").textContent = GameState.highScore
}

function init() {
  // Load game state
  GameState.load()

  // Simulate loading
  setTimeout(() => {
    screenManager.show("menu")
    updateMenuStats()
  }, 2000)

  // Menu buttons
  document.getElementById("start-runner-btn").addEventListener("click", () => {
    screenManager.show("runner")
    if (!runnerGame) {
      runnerGame = new RunnerGame()
    }
    runnerGame.init()
  })

  document.getElementById("open-garden-btn").addEventListener("click", () => {
    screenManager.show("garden")
    if (!gardenMode) {
      gardenMode = new GardenMode()
    }
    gardenMode.init()
  })

  document.getElementById("reset-game-btn").addEventListener("click", () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את כל ההתקדמות?")) {
      GameState.reset()
      updateMenuStats()
      if (gardenMode) {
        gardenMode.placedItems.forEach((item) => gardenMode.scene.remove(item.mesh))
        gardenMode.placedItems = []
        gardenMode.updateUI()
      }
    }
  })
}

// Start the game
window.addEventListener("load", init)
