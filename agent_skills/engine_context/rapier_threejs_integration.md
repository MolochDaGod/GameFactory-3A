# Rapier Physics Integration with Three.js

Status: Rapier 0.x integration with Three.js r185+

This guide covers integrating the Rapier physics engine with Three.js using the `@react-three/rapier` framework or direct Rapier-WASM integration.

## Quick Start

### Installation

```bash
npm install @react-three/rapier rapier three
```

Or for manual Rapier integration (without React):

```bash
npm install rapier
```

### Minimal Three.js + Rapier Setup

```javascript
import * as THREE from 'three';
import * as RAPIER from 'rapier3d-compat';

// Initialize Rapier
await RAPIER.init();

// Create scene and physics world
const scene = new THREE.Scene();
const world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));

// Create a dynamic sphere
const sphereBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0)
);
const sphereCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.5),
    sphereBody
);

// Create Three.js mesh (separate from physics)
const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
scene.add(sphereMesh);

// Create static ground
const groundBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -2, 0)
);
world.createCollider(
    RAPIER.ColliderDesc.cuboid(10, 0.5, 10),
    groundBody
);

// Animation loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(0.016, clock.getDelta()); // Cap at 60 FPS
    world.step(delta);
    
    // Sync Three.js mesh with physics body
    const translation = sphereBody.translation();
    const rotation = sphereBody.rotation();
    
    sphereMesh.position.set(translation.x, translation.y, translation.z);
    sphereMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    
    renderer.render(scene, camera);
}
animate();
```

## Architecture: Physics and Rendering Separation

**Key principle**: Keep physics simulation (`RAPIER.RigidBody`, `RAPIER.Collider`) completely separate from Three.js rendering (`THREE.Mesh`, `THREE.Group`).

```
┌─────────────────────────────────────┐
│  Rapier Physics World               │
│  ├─ RigidBody: position, rotation   │
│  └─ Collider: collision shapes      │
│                                     │
│  (No rendering information)         │
└─────────────────────────────────────┘
                 ↕ (sync each frame)
┌─────────────────────────────────────┐
│  Three.js Scene                     │
│  ├─ Mesh: geometry, material        │
│  ├─ Light: illumination             │
│  └─ Camera: view                    │
│                                     │
│  (No physics information)           │
└─────────────────────────────────────┘
```

Benefits:
- Swap visual models without affecting physics
- Use procedural shapes for physics while art models render
- Headless physics simulation (no GPU requirement)
- Reuse same physics world across multiple views

## Detailed Integration Patterns

### 1. Entity Component System

Create an entity system to manage physics-to-render synchronization:

```javascript
class PhysicsEntity {
    constructor(world, physicsDesc, colliderDesc, mesh) {
        this.mesh = mesh;
        this.body = world.createRigidBody(physicsDesc);
        this.collider = world.createCollider(colliderDesc, this.body);
        this.handle = this.body.handle;
    }
    
    syncRender() {
        const translation = this.body.translation();
        const rotation = this.body.rotation();
        
        this.mesh.position.copy(translation);
        this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }
    
    setVelocity(x, y, z) {
        this.body.setLinvel(new RAPIER.Vector3(x, y, z), true);
    }
    
    applyForce(x, y, z) {
        this.body.addForce(new RAPIER.Vector3(x, y, z), true);
    }
    
    destroy(world) {
        world.removeRigidBody(this.body);
    }
}

// Usage
const player = new PhysicsEntity(
    world,
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0),
    RAPIER.ColliderDesc.capsule(0.9, 0.4),
    playerMesh
);

// In animation loop
player.syncRender();
```

### 2. Kinematic Character Controller

For player characters, use kinematic bodies with script-controlled movement:

```javascript
class CharacterController {
    constructor(world, mesh) {
        this.mesh = mesh;
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.kinematic()
                .setTranslation(0, 1, 0)
                .lockRotations()  // Character doesn't rotate
        );
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.capsule(0.9, 0.4),
            this.body
        );
        
        this.velocity = new RAPIER.Vector3(0, 0, 0);
        this.moveSpeed = 5.0;
        this.jumpForce = 7.0;
        this.isGrounded = false;
    }
    
    update(deltaTime, inputX, inputZ, shouldJump, world) {
        // Check if grounded with ray cast
        const rayOrigin = this.body.translation();
        const rayDir = new RAPIER.Vector3(0, -1, 0);
        const ray = new RAPIER.Ray(rayOrigin, rayDir);
        const hit = world.castRay(ray, 0.5, false);
        this.isGrounded = hit !== null;
        
        // Apply horizontal movement
        this.velocity.x = inputX * this.moveSpeed;
        this.velocity.z = inputZ * this.moveSpeed;
        
        // Apply jump
        if (shouldJump && this.isGrounded) {
            this.velocity.y = this.jumpForce;
        }
        
        // Apply gravity
        if (!this.isGrounded) {
            this.velocity.y -= 9.81 * deltaTime;
        } else {
            this.velocity.y = 0;
        }
        
        // Move body
        const newPos = rayOrigin;
        newPos.x += this.velocity.x * deltaTime;
        newPos.y += this.velocity.y * deltaTime;
        newPos.z += this.velocity.z * deltaTime;
        
        this.body.setNextKinematicTranslation(newPos);
        
        // Sync render
        this.mesh.position.copy(newPos);
    }
}
```

### 3. Rigid Body Interaction (Pushing Objects)

For dynamic objects the player can push:

```javascript
// Setup: rigid body with friction for sliding
const pushableBox = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(5, 1, 0)
);
const boxCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
        .setFriction(0.5)
        .setRestitution(0.1)
        .setDensity(1.0),
    pushableBox
);

// Player collision detection and push
world.contactsWith(playerCollider.handle, (collider) => {
    if (collider.rigidBody) {
        const contactBody = collider.rigidBody;
        const pushDirection = playerVelocity.normalized();
        const pushForce = 10.0;
        contactBody.applyImpulse(
            pushDirection.scale(pushForce),
            true
        );
    }
});
```

### 4. Projectile Physics

For bullets, grenades, or thrown objects:

```javascript
class Projectile {
    constructor(world, origin, direction, speed, mesh) {
        this.mesh = mesh;
        this.mesh.position.copy(origin);
        
        // Projectiles are simple dynamic spheres
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(origin.x, origin.y, origin.z)
                .setLinvel(
                    direction.x * speed,
                    direction.y * speed,
                    direction.z * speed
                )
        );
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.ball(0.1)
                .setRestitution(0.2)
                .setFriction(0.1),
            this.body
        );
        
        this.lifetime = 10.0; // seconds
        this.age = 0;
        this.world = world;
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        
        // Sync render
        const trans = this.body.translation();
        this.mesh.position.set(trans.x, trans.y, trans.z);
        
        return this.age < this.lifetime;
    }
    
    destroy() {
        this.world.removeRigidBody(this.body);
    }
}
```

### 5. Ragdoll Physics

For dynamic character bodies:

```javascript
class RagdollPart {
    constructor(world, name, mesh) {
        this.name = name;
        this.mesh = mesh;
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(
                    mesh.position.x,
                    mesh.position.y,
                    mesh.position.z
                )
        );
    }
}

class Ragdoll {
    constructor(world, characterMesh, parts) {
        // Create rigid body for each limb
        this.parts = {};
        const limbBodies = {};
        
        parts.forEach(partName => {
            const partMesh = characterMesh.getObjectByName(partName);
            const part = new RagdollPart(world, partName, partMesh);
            this.parts[partName] = part;
            limbBodies[partName] = part.body;
        });
        
        // Connect with joints (e.g., shoulder to upper arm)
        this.createJoint(world, limbBodies, 'chest', 'upperArm_L', 
            new RAPIER.Vector3(0, 0.2, 0),
            new RAPIER.Vector3(0.5, 0, 0)
        );
        // ... create more joints
        
        this.world = world;
    }
    
    createJoint(world, bodies, from, to, fromOffset, toOffset) {
        const jointDesc = new RAPIER.RigidJointBuilder(
            RAPIER.JointData.spherical(fromOffset, toOffset)
        );
        world.createImpulseJoint(jointDesc, bodies[from], bodies[to], true);
    }
    
    syncRender() {
        Object.values(this.parts).forEach(part => {
            const trans = part.body.translation();
            const rot = part.body.rotation();
            
            part.mesh.position.set(trans.x, trans.y, trans.z);
            part.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        });
    }
    
    applyImpulse(direction, force) {
        const chest = this.parts['chest'];
        chest.body.applyImpulse(direction.scale(force), true);
    }
}
```

## World Configuration

### Gravity

```javascript
// Varies by planet/environment
const world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0)); // Earth
world.gravity = new RAPIER.Vector3(0, -3.71, 0); // Mars

// Zero gravity
const world = new RAPIER.World(new RAPIER.Vector3(0, 0, 0));
```

### Timestep and Substeps

```javascript
// Standard 60 FPS
const timeStep = 1 / 60;
world.step(timeStep);

// Multiple substeps for precision (more CPU)
const subSteps = 2;
for (let i = 0; i < subSteps; i++) {
    world.step(timeStep / subSteps);
}
```

### Sleeping Configuration

```javascript
// Only bodies idle for >0.5s sleep; reduces CPU
// Default settings usually work well

// Manually wake a sleeping body
body.wakeUp();

// Check if sleeping
if (body.isSleeping()) {
    console.log("Body is sleeping");
}
```

## Debugging and Visualization

### Debug Render Helper

Create a helper to visualize colliders during development:

```javascript
function addDebugVisualization(world, scene) {
    const debugGeometries = new THREE.Group();
    scene.add(debugGeometries);
    
    // Get all bodies from world (Rapier provides APIs for this)
    const bodies = world.bodies;
    const colliders = world.colliders;
    
    colliders.forEachCollider((collider) => {
        const pos = collider.translation();
        const shape = collider.shape;
        
        // Create wireframe geometry based on shape
        let geometry;
        if (shape instanceof RAPIER.Ball) {
            geometry = new THREE.SphereGeometry(shape.radius, 8, 8);
        } else if (shape instanceof RAPIER.Cuboid) {
            const he = shape.halfExtents;
            geometry = new THREE.BoxGeometry(he.x*2, he.y*2, he.z*2);
        }
        // ... handle other shapes
        
        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry),
            new THREE.LineBasicMaterial({ color: 0x00ff00 })
        );
        wireframe.position.copy(pos);
        debugGeometries.add(wireframe);
    });
    
    return debugGeometries;
}
```

### Logging and Inspection

```javascript
// Log body properties
console.log("Body translation:", body.translation());
console.log("Body rotation:", body.rotation());
console.log("Body velocity:", body.linvel());
console.log("Body is sleeping:", body.isSleeping());

// Check collider info
console.log("Collider shape type:", collider.shape.type);
console.log("Collider collision groups:", collider.collisionGroups());
```

## Performance Optimization

### Broad Phase Optimization

```javascript
// Use appropriate broad phase for world size
// Default (SAP - Sweep and Prune) works well for most games
// Can tune via world configuration
```

### Collision Group Filtering

Reduce unnecessary collision checks:

```javascript
// Define collision groups (as bit flags)
const GROUND = 0b0001;
const PLAYER = 0b0010;
const ENEMY = 0b0100;
const PROJECTILE = 0b1000;

// Set collider collision groups
const playerCollider = world.createCollider(
    RAPIER.ColliderDesc.capsule(0.9, 0.4)
        .setCollisionGroups(RAPIER.InteractionGroups.new(PLAYER, GROUND | ENEMY)),
    playerBody
);

// Projectile only hits GROUND and ENEMY
const projectileCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.1)
        .setCollisionGroups(RAPIER.InteractionGroups.new(PROJECTILE, GROUND | ENEMY)),
    projectileBody
);
```

### Rigid Body Count Management

```javascript
// Strategy 1: Reuse bodies for temporary objects
const projectilePool = [];
for (let i = 0; i < 50; i++) {
    projectilePool.push(createProjectile(world));
}

// Strategy 2: Remove distant or inactive bodies
if (body.translation().y < -50) {
    world.removeRigidBody(body);
}

// Strategy 3: Use kinematic bodies for NPCs (cheaper than dynamic)
const npcBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematic());
```

## Event Handling

### Contact Events

```javascript
const contacts = [];

// Collect events during world step
world.stepSimulation();
world.drainCollisionEvents((handle1, handle2, started) => {
    if (started) {
        contacts.push({
            handle1,
            handle2,
            type: 'start'
        });
        console.log(`Collision started between ${handle1} and ${handle2}`);
    }
});

// Handle contacts in gameplay logic
contacts.forEach(contact => {
    const collider1 = world.getCollider(contact.handle1);
    const collider2 = world.getCollider(contact.handle2);
    // ... handle collision
});
```

## Troubleshooting

| Problem | Cause | Solution |
|---|---|---|
| Objects fall through ground | Ground is dynamic or has no collider | Make ground static; add collider |
| Physics unstable, jittery | Timestep too large or many sub-objects | Reduce timestep or use substeps |
| Performance degradation | Too many dynamic bodies | Use kinematic or remove distant bodies |
| Character gets stuck | Collision capsule too small or geometry issues | Increase capsule size; check collider shapes |
| Joints feel weak | Constraints not properly configured | Check joint attachment points and rotation axes |

## Next Steps

- Read `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md` for gameplay implementation
- Read `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md` for physics concepts
- Consult the `<REPO_PATH>/engine_adapters/three_js/examples/` for complete working examples

## References

- [Rapier Official Docs](https://rapier.rs/)
- [react-three/rapier Documentation](https://github.com/react-three/rapier)
- Three.js Documentation: https://threejs.org/docs/
