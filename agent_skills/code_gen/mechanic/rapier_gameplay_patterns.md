# Rapier Gameplay Patterns for Three.js

Status: Production skill for common Rapier-based game mechanics

This skill document describes common gameplay patterns when building games with Rapier physics in Three.js. Use this as a reference when generating code for physics-based mechanics.

## Required Reading

- `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md` - Core physics concepts
- `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md` - Integration with Three.js
- `<REPO_PATH>/agent_skills/code_gen/mechanic/game_generation.md` - General mechanic generation

## Pattern Selection Checklist

When designing a game mechanic with physics:

1. **What moves?**
   - Player character → Character controller pattern
   - Enemy AI → AI steering with dynamic bodies
   - Objects pushed by player → Pushable rigidbody pattern
   - Projectiles/grenades → Projectile pattern
   - Destructible structures → Ragdoll or composite pattern

2. **What constraints exist?**
   - No rotation needed → Lock rotations on rigidbody
   - Connected parts → Joint constraints
   - Limited motion → Prismatic or revolute joints
   - Fixed distance → Distance joint

3. **What triggers gameplay events?**
   - Collision detection → Use contact events
   - Raycast queries → Ground check, aim detection
   - Spatial queries → Sphere cast for area effects

4. **What's the performance budget?**
   - Under 50 bodies → Any pattern works
   - 50-200 bodies → Avoid complex meshes, use primitives
   - 200+ bodies → Aggressive pooling, kinematic bodies for NPCs

## Core Patterns

### Pattern 1: Character Movement

**Context**: Player-controlled character that walks on ground and can jump

**Physics setup**:
```javascript
class PlayerCharacter {
    constructor(world, startPos) {
        // Kinematic body (we control position)
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.kinematic()
                .setTranslation(...startPos)
                .lockRotations()  // Character doesn't rotate
        );
        
        // Capsule shaped collider (shoulders and hips)
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.capsule(0.9, 0.4)
                .setFriction(0.5),
            this.body
        );
        
        // Movement state
        this.velocity = { x: 0, y: 0, z: 0 };
        this.isGrounded = false;
        this.moveSpeed = 5.0;
        this.jumpPower = 7.0;
    }
    
    update(deltaTime, inputVector, shouldJump, world) {
        const currentPos = this.body.translation();
        
        // Check ground contact with raycast
        const rayOrigin = new RAPIER.Vector3(
            currentPos.x,
            currentPos.y - 0.5,  // Just below character
            currentPos.z
        );
        const rayDir = new RAPIER.Vector3(0, -1, 0);
        const ray = new RAPIER.Ray(rayOrigin, rayDir);
        this.isGrounded = world.castRay(ray, 0.6, false) !== null;
        
        // Horizontal movement (input-based)
        this.velocity.x = inputVector.x * this.moveSpeed;
        this.velocity.z = inputVector.z * this.moveSpeed;
        
        // Jump (only from ground)
        if (shouldJump && this.isGrounded) {
            this.velocity.y = this.jumpPower;
        }
        
        // Gravity (when airborne)
        if (!this.isGrounded) {
            this.velocity.y -= 9.81 * deltaTime;
        } else if (this.velocity.y < 0) {
            // Clamp downward velocity when grounded
            this.velocity.y = 0;
        }
        
        // Calculate new position
        const newPos = new RAPIER.Vector3(
            currentPos.x + this.velocity.x * deltaTime,
            currentPos.y + this.velocity.y * deltaTime,
            currentPos.z + this.velocity.z * deltaTime
        );
        
        // Update kinematic body (doesn't collide, but still reports what it touches)
        this.body.setNextKinematicTranslation(newPos);
    }
    
    canMove(newPos, world) {
        // Optional: predict if movement would collide
        // Useful for ledge detection, collision avoidance, etc.
    }
}
```

**Input handling** (in game update):
```javascript
const input = { x: 0, z: 0, jump: false };

// Keyboard
document.addEventListener('keydown', e => {
    if (e.key === 'w' || e.key === 'W') input.z = -1;
    if (e.key === 's' || e.key === 'S') input.z = 1;
    if (e.key === 'a' || e.key === 'A') input.x = -1;
    if (e.key === 'd' || e.key === 'D') input.x = 1;
    if (e.key === ' ') input.jump = true;
});

// In animation loop
player.update(deltaTime, input, input.jump, world);
input.jump = false;  // Reset jump
```

**Variations**:
- **Momentum-based**: Store velocity and apply acceleration/deceleration
- **Sprint**: Increase moveSpeed when sprinting, drain stamina
- **Slope sliding**: Check slope angle under character, reduce friction on steep slopes
- **Wall running**: Raycast to sides, allow wall jumps if touching wall
- **Ledge climbing**: Detect ledges ahead, pull character up

### Pattern 2: Jumping and Double-Jump

**Context**: Character that can double-jump mid-air

```javascript
class JumpController {
    constructor(jumpPower = 7.0, doubleJumpPower = 5.0) {
        this.jumpPower = jumpPower;
        this.doubleJumpPower = doubleJumpPower;
        this.hasAirJump = false;  // One-time jump while airborne
    }
    
    update(deltaTime, isGrounded, body) {
        // Reset double-jump when landing
        if (isGrounded) {
            this.hasAirJump = true;
        }
    }
    
    jump(isGrounded, body) {
        if (isGrounded) {
            // Ground jump (full power)
            body.applyImpulse(
                new RAPIER.Vector3(0, this.jumpPower, 0),
                true
            );
        } else if (this.hasAirJump) {
            // Double jump (less power, spent)
            body.applyImpulse(
                new RAPIER.Vector3(0, this.doubleJumpPower, 0),
                true
            );
            this.hasAirJump = false;
        }
    }
}
```

### Pattern 3: Pushable Objects

**Context**: Dynamic objects that player can push and interact with

```javascript
class PushableObject {
    constructor(world, mesh, mass = 1.0) {
        this.mesh = mesh;
        
        // Dynamic body (affected by forces and collisions)
        const pos = mesh.position;
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(pos.x, pos.y, pos.z)
        );
        
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.cuboid(
                mesh.scale.x * 0.5,
                mesh.scale.y * 0.5,
                mesh.scale.z * 0.5
            )
                .setDensity(mass)
                .setFriction(0.5)
                .setRestitution(0.2),
            this.body
        );
        
        this.world = world;
    }
    
    syncRender() {
        const trans = this.body.translation();
        const rot = this.body.rotation();
        
        this.mesh.position.set(trans.x, trans.y, trans.z);
        this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
    
    getPushed(pushDirection, force = 5.0) {
        const impulse = pushDirection.normalize().scale(force);
        this.body.applyImpulse(impulse, true);
    }
    
    destroy() {
        this.world.removeRigidBody(this.body);
    }
}

// Integration with character controller
function checkPushInteraction(playerPos, playerDirection, pushables, world) {
    const rayOrigin = playerPos;
    const rayDir = playerDirection.normalize();
    const ray = new RAPIER.Ray(rayOrigin, rayDir);
    
    const hit = world.castRay(ray, 2.0, false);  // 2m reach
    
    if (hit) {
        const collider = world.getCollider(hit.collider);
        if (collider.rigidBody && isPushable(collider)) {
            const body = collider.rigidBody;
            const pushable = findPushableByBody(pushables, body);
            if (pushable) {
                pushable.getPushed(playerDirection);
            }
        }
    }
}
```

### Pattern 4: Projectiles

**Context**: Bullets, grenades, or thrown objects with physics

```javascript
class Projectile {
    constructor(world, startPos, direction, speed, radius = 0.1) {
        this.mesh = createProjectileMesh(radius);  // Three.js mesh
        this.mesh.position.copy(startPos);
        
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(startPos.x, startPos.y, startPos.z)
                .setLinvel(
                    direction.x * speed,
                    direction.y * speed,
                    direction.z * speed
                )
        );
        
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.ball(radius)
                .setRestitution(0.4)   // Bouncy
                .setFriction(0.1),
            this.body
        );
        
        this.world = world;
        this.lifetime = 30.0;  // seconds
        this.age = 0;
        this.onHit = null;  // Callback when projectile hits something
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        
        // Sync render
        const trans = this.body.translation();
        const rot = this.body.rotation();
        this.mesh.position.set(trans.x, trans.y, trans.z);
        this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        
        // Auto-destroy after lifetime
        return this.age < this.lifetime;
    }
    
    destroy() {
        this.world.removeRigidBody(this.body);
        this.mesh.parent?.remove(this.mesh);
    }
    
    onCollision(other) {
        if (this.onHit) {
            this.onHit(other);
        }
    }
}

// Firing projectiles
function fireProjectile(world, camera, projectiles) {
    const startPos = new THREE.Vector3();
    camera.getWorldPosition(startPos);
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const projectile = new Projectile(world, startPos, direction, 20.0);
    projectile.onHit = (other) => {
        console.log("Projectile hit:", other);
        // Gameplay logic: deal damage, create effect, etc.
    };
    
    projectiles.push(projectile);
}
```

### Pattern 5: Ragdoll Physics

**Context**: Character ragdoll for death/knockback animations

```javascript
class Ragdoll {
    constructor(world, skeleton, limbDefinitions) {
        this.parts = {};
        this.joints = [];
        
        // Create rigid body for each limb
        limbDefinitions.forEach(limb => {
            const bone = skeleton.getBoneByName(limb.name);
            const worldPos = new THREE.Vector3();
            bone.getWorldPosition(worldPos);
            
            const body = world.createRigidBody(
                RAPIER.RigidBodyDesc.dynamic()
                    .setTranslation(worldPos.x, worldPos.y, worldPos.z)
            );
            
            const collider = world.createCollider(
                createColliderForLimb(limb),  // Function to create appropriate shape
                body
            );
            
            this.parts[limb.name] = {
                bone,
                body,
                collider,
                initialRotation: bone.quaternion.clone()
            };
        });
        
        // Create joints between connected limbs
        limbDefinitions.forEach(limb => {
            limb.joints?.forEach(jointDef => {
                this.createJoint(world, jointDef);
            });
        });
        
        this.world = world;
    }
    
    createJoint(world, jointDef) {
        const fromBody = this.parts[jointDef.from].body;
        const toBody = this.parts[jointDef.to].body;
        
        // Create appropriate joint type
        let jointData;
        if (jointDef.type === 'revolute') {
            // Hinge joint (shoulder, hip)
            jointData = RAPIER.JointData.revolute(
                jointDef.fromOffset,
                jointDef.toOffset,
                jointDef.axis
            );
        } else if (jointDef.type === 'spherical') {
            // Ball and socket (neck, wrist)
            jointData = RAPIER.JointData.spherical(
                jointDef.fromOffset,
                jointDef.toOffset
            );
        }
        
        const jointDesc = new RAPIER.RigidJointBuilder(jointData);
        const joint = world.createImpulseJoint(jointDesc, fromBody, toBody, true);
        this.joints.push(joint);
    }
    
    syncRender() {
        Object.values(this.parts).forEach(part => {
            const trans = part.body.translation();
            const rot = part.body.rotation();
            
            // Update bone position and rotation
            part.bone.position.set(trans.x, trans.y, trans.z);
            part.bone.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        });
    }
    
    enableRagdoll() {
        // Convert character from animation to ragdoll
        Object.values(this.parts).forEach(part => {
            // Apply small random velocities so ragdoll doesn't look stiff
            const vel = new RAPIER.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            );
            part.body.setLinvel(vel.scale(0.5), true);
        });
    }
    
    applyExplosion(center, force) {
        // Ragdoll responds to explosions
        Object.values(this.parts).forEach(part => {
            const partPos = part.body.translation();
            const direction = new RAPIER.Vector3(
                partPos.x - center.x,
                partPos.y - center.y,
                partPos.z - center.z
            ).normalize();
            
            const distance = partPos.distanceTo(center);
            const falloff = Math.max(0, 1 - distance / 10);
            
            part.body.applyImpulse(direction.scale(force * falloff), true);
        });
    }
    
    destroy() {
        Object.values(this.parts).forEach(part => {
            this.world.removeRigidBody(part.body);
        });
        this.joints.forEach(joint => {
            this.world.removeImpulseJoint(joint);
        });
    }
}
```

### Pattern 6: Vehicle (Simple Car)

**Context**: Player-controlled car with wheel rotation

```javascript
class SimpleVehicle {
    constructor(world, mesh, config = {}) {
        this.mesh = mesh;
        this.config = {
            acceleration: config.acceleration ?? 20,
            maxSpeed: config.maxSpeed ?? 30,
            steerSpeed: config.steerSpeed ?? 3,
            maxSteer: config.maxSteer ?? 0.4,
            brakePower: config.brakePower ?? 30,
            ...config
        };
        
        // Main chassis body
        const pos = mesh.position;
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(pos.x, pos.y, pos.z)
        );
        
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.8, 0.5, 1.5)
                .setFriction(0.6)
                .setRestitution(0.3),
            this.body
        );
        
        this.world = world;
        this.steerAngle = 0;
        this.enginePower = 0;
        this.isBraking = false;
    }
    
    update(deltaTime, input) {
        const vel = this.body.linvel();
        const currentSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        
        // Steering
        this.steerAngle = THREE.MathUtils.lerp(
            this.steerAngle,
            input.steer * this.config.maxSteer,
            this.config.steerSpeed * deltaTime
        );
        
        // Acceleration
        if (input.accelerate) {
            this.enginePower = Math.min(
                this.enginePower + this.config.acceleration * deltaTime,
                1.0
            );
        } else {
            this.enginePower = 0;
        }
        
        // Braking
        this.isBraking = input.brake;
        if (this.isBraking) {
            // Apply opposing force
            const brakingForce = this.config.brakePower *
                (currentSpeed / this.config.maxSpeed);
            const brakingVector = new RAPIER.Vector3(
                -vel.x * brakingForce,
                0,
                -vel.z * brakingForce
            );
            this.body.addForce(brakingVector, true);
        }
        
        // Forward force (in direction car is facing)
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
        
        if (currentSpeed < this.config.maxSpeed && this.enginePower > 0) {
            const driveForce = this.config.acceleration * this.enginePower * 2;
            this.body.addForce(
                new RAPIER.Vector3(
                    forward.x * driveForce,
                    0,
                    forward.z * driveForce
                ),
                true
            );
        }
        
        // Steering (rotate toward steer angle)
        if (currentSpeed > 1) {
            const torque = this.steerAngle * currentSpeed * 5;
            this.body.addTorque(
                new RAPIER.Vector3(0, torque, 0),
                true
            );
        }
        
        // Sync render
        this.syncRender();
    }
    
    syncRender() {
        const trans = this.body.translation();
        const rot = this.body.rotation();
        
        this.mesh.position.set(trans.x, trans.y, trans.z);
        this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
    }
    
    destroy() {
        this.world.removeRigidBody(this.body);
    }
}
```

### Pattern 7: Compound Shapes

**Context**: Complex objects made of multiple connected rigid bodies

```javascript
class ChestWithLid {
    constructor(world, basePos) {
        // Main chest body
        this.baseBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.static()
                .setTranslation(basePos.x, basePos.y, basePos.z)
        );
        this.baseCollider = world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.5, 0.4, 0.6)
                .setFriction(0.5),
            this.baseBody
        );
        
        // Lid (dynamic, can open)
        this.lidBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(basePos.x, basePos.y + 0.4, basePos.z + 0.5)
        );
        this.lidCollider = world.createCollider(
            RAPIER.ColliderDesc.cuboid(0.5, 0.1, 0.6),
            this.lidBody
        );
        
        // Revolute joint (hinge)
        const lidHingeDesc = new RAPIER.RigidJointBuilder(
            RAPIER.JointData.revolute(
                new RAPIER.Vector3(0, 0.4, 0.5),  // Hinge position on chest
                new RAPIER.Vector3(0, -0.1, 0),    // Hinge position on lid
                new RAPIER.Vector3(1, 0, 0)        // Hinge axis (X = side-to-side rotation)
            )
        );
        
        this.hinge = world.createImpulseJoint(
            lidHingeDesc,
            this.baseBody,
            this.lidBody,
            true
        );
        
        this.world = world;
        this.lidMesh = null;  // Reference to Three.js mesh for render sync
    }
    
    syncRender() {
        if (this.lidMesh) {
            const trans = this.lidBody.translation();
            const rot = this.lidBody.rotation();
            this.lidMesh.position.set(trans.x, trans.y, trans.z);
            this.lidMesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        }
    }
    
    destroy() {
        this.world.removeRigidBody(this.baseBody);
        this.world.removeRigidBody(this.lidBody);
        this.world.removeImpulseJoint(this.hinge);
    }
}
```

## Collision Response Patterns

### Damage on Impact

```javascript
function handleImpact(projectileVelocity, targetBody) {
    // Damage based on impact speed
    const speed = projectileVelocity.norm();
    const damage = Math.max(0, speed - 5.0) * 10;  // Damage threshold
    
    return damage;
}
```

### Knockback Effect

```javascript
function applyKnockback(targetBody, sourcePos, force) {
    const targetPos = targetBody.translation();
    const direction = new RAPIER.Vector3(
        targetPos.x - sourcePos.x,
        0,  // Keep knockback horizontal
        targetPos.z - sourcePos.z
    ).normalize();
    
    targetBody.applyImpulse(direction.scale(force), true);
}
```

### Explosion

```javascript
function explode(world, centerPos, radius, force) {
    // Query all bodies in radius
    const boundingBox = new RAPIER.AABB(
        new RAPIER.Vector3(
            centerPos.x - radius,
            centerPos.y - radius,
            centerPos.z - radius
        ),
        new RAPIER.Vector3(
            centerPos.x + radius,
            centerPos.y + radius,
            centerPos.z + radius
        )
    );
    
    world.colliders.forEachCollider((collider) => {
        if (!boundingBox.contains(collider.translation())) return;
        
        const body = collider.rigidBody;
        if (!body) return;
        
        const distance = body.translation().distanceTo(centerPos);
        if (distance > radius) return;
        
        // Falloff based on distance
        const falloff = Math.pow(1 - distance / radius, 2);
        const impulseMagnitude = force * falloff;
        
        const direction = new RAPIER.Vector3(
            body.translation().x - centerPos.x,
            body.translation().y - centerPos.y,
            body.translation().z - centerPos.z
        ).normalize();
        
        body.applyImpulse(direction.scale(impulseMagnitude), true);
    });
}
```

## Sensor/Trigger Patterns

### Area Trigger

```javascript
class AreaTrigger {
    constructor(world, position, radius) {
        this.body = world.createRigidBody(
            RAPIER.RigidBodyDesc.kinematic()
                .setTranslation(position.x, position.y, position.z)
        );
        
        this.collider = world.createCollider(
            RAPIER.ColliderDesc.ball(radius)
                .setSensor(true),  // Trigger volume, no physics response
            this.body
        );
        
        this.objectsInside = new Set();
        this.world = world;
    }
    
    update(world) {
        // Check what's intersecting this trigger
        this.objectsInside.clear();
        
        world.colliders.forEachCollider((other) => {
            if (other.handle === this.collider.handle) return;
            
            if (world.contactsWith(this.collider.handle, other)) {
                this.objectsInside.add(other);
            }
        });
    }
    
    containsBody(body) {
        return this.objectsInside.has(body);
    }
}
```

## Performance Tips

1. **Pool physics objects** - Create projectiles/effects in advance, reuse them
2. **Use primitive shapes** - Spheres and boxes faster than mesh colliders
3. **Disable rotation** when not needed - `body.lockRotations()`
4. **Batch-update mesh positions** - Update multiple objects per frame
5. **Destroy distant objects** - Clean up bodies outside gameplay area
6. **Use kinematic bodies for NPCs** - Cheaper than fully dynamic
7. **Collision group filtering** - Reduce unnecessary collision checks

## Debugging Patterns

```javascript
// Visualize body positions
function debugDrawPhysics(world, scene) {
    world.colliders.forEachCollider((collider) => {
        const pos = collider.translation();
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        marker.position.set(pos.x, pos.y, pos.z);
        scene.add(marker);
    });
}

// Log body state
function debugBodyState(body) {
    console.group('Body State');
    console.log('Position:', body.translation());
    console.log('Rotation:', body.rotation());
    console.log('Velocity:', body.linvel());
    console.log('Angular Velocity:', body.angvel());
    console.log('Sleeping:', body.isSleeping());
    console.groupEnd();
}
```

## Pattern Decision Tree

```
Does object move autonomously?
├─ No → Use Static body or Sensor collider
└─ Yes → Do I control position?
    ├─ Yes (character, platform) → Kinematic body
    └─ No (falling, rolling) → Dynamic body
        └─ Does it need complex behavior?
            ├─ No → Single primitive shape
            └─ Yes → Multiple shapes with joints
```

## Next Steps

- Implement specific pattern in your game
- Test collision behavior and adjust properties
- Profile performance and optimize if needed
- Read `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md` for deeper physics concepts

## Common Issues and Solutions

| Issue | Solution |
|---|---|
| Objects pass through walls | Increase collision shape size; ensure walls have colliders |
| Physics too loose/squishy | Increase rigid body density or use heavier materials |
| Jittery movement | Reduce timestep or use substeps |
| Character stuck on terrain | Use capsule (not box) for character; round corners |
| Joints breaking apart | Adjust constraint parameters; reduce time step |
| Performance degradation | Reduce body count; use collision groups; remove distant bodies |

