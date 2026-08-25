# Rapier Physics Engine Fundamentals for Three.js

## Overview

Rapier is a high-performance 2D and 3D physics engine written in Rust and compiled to WebAssembly (WASM). It provides deterministic, accurate physics simulation suitable for games, interactive applications, and real-time visualization.

**For Three.js game development**, Rapier provides:
- Rigid body dynamics
- Collision detection and response
- Constraints and joints
- Ray casting and shape casting
- Deterministic physics (important for networked games)
- High performance through native code compilation

This document covers Rapier 0.x concepts essential for game developers. Complete API details belong in the engine integration guide and official Rapier documentation.

## Core Concepts

### 1. World

The **World** is the container for all physics objects and the physics simulation. Every game scene has exactly one World instance.

```javascript
import RAPIER from '@react-three/rapier';

// Create a physics world
const world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0)); // gravity
```

Key properties:
- **Gravity**: Vector3 pointing in the direction of gravitational acceleration (typically 0, -9.81, 0 for Earth gravity)
- **Time step**: Controls simulation accuracy and stability (typically 1/60 for 60 FPS)
- **Sleeping**: Inactive bodies are removed from simulation to save CPU

### 2. Rigid Bodies

A **rigid body** represents a solid object that can move and rotate. It's defined by:

```javascript
// Define body descriptor (properties)
const bodyDesc = RAPIER.RigidBodyDesc.dynamic() // or .static() or .kinematic()
    .setTranslation(0, 2, 0)
    .setRotation({ w: 1, x: 0, y: 0, z: 0 });

// Create body in world
const body = world.createRigidBody(bodyDesc);
```

**Body types:**

| Type | Behavior | Use case |
|---|---|---|
| **Dynamic** | Affected by gravity and forces | Characters, projectiles, falling objects, vehicles |
| **Static** | Immovable, position and rotation fixed | Ground, walls, building structures |
| **Kinematic** | Script-controlled position, no gravity | Moving platforms, animated obstacles, character bodies for ragdoll attachment |

**Body properties:**
- **Mass**: Affects response to forces and collisions (higher mass = less acceleration)
- **Velocity**: Linear velocity (m/s) and angular velocity (rad/s)
- **Gravity scale**: Multiplier on gravity (0 = no gravity, useful for weightless objects)
- **Friction**: Controls sliding resistance (0 = frictionless, 1+ = highly frictional)
- **Restitution**: Bounciness (0 = no bounce, 1 = perfect bounce)

### 3. Colliders

A **collider** is the shape used for collision detection. Bodies have one or more colliders attached.

```javascript
// Create a collider shape
const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 1.0, 0.5)
    .setDensity(1.0)
    .setRestitution(0.3)
    .setFriction(0.5);

// Attach collider to body
const collider = world.createCollider(colliderDesc, body);
```

**Primitive shapes:**

| Shape | Constructor | Use case |
|---|---|---|
| **Box** | `ColliderDesc.cuboid(hx, hy, hz)` | Buildings, platforms, boxes, vehicles |
| **Sphere** | `ColliderDesc.ball(radius)` | Balls, rounded objects, simple humanoids |
| **Capsule** | `ColliderDesc.capsule(hh, radius)` | Character bodies, pills, cylinders |
| **Cylinder** | `ColliderDesc.cylinder(hh, radius)` | Pillars, wheels, cylindrical objects |
| **Cone** | `ColliderDesc.cone(hh, radius)` | Cones, cone-shaped objects |
| **Polyhedron** | `ColliderDesc.convexMesh(vertices)` | Custom convex shapes |
| **Triangle Mesh** | `ColliderDesc.trimesh(vertices, indices)` | Complex static geometry |
| **Heightfield** | `ColliderDesc.heightfield(heights)` | Terrain, landscapes |

**Collider properties:**
- **Sensor**: When true, reports collisions but doesn't apply forces (trigger volumes)
- **Collision groups**: Control which bodies can collide with each other
- **Density**: Used to auto-calculate mass from shape volume

### 4. Constraints (Joints)

**Constraints** restrict how bodies can move relative to each other. Common types:

```javascript
// Fixed joint - bodies move together rigidly
const rigidJointDesc = new RAPIER.RigidJointBuilder(RAPIER.JointData.fixed(
    new RAPIER.Vector3(0, 0, 0), // attachment point on body1
    new RAPIER.Vector3(0, 0, 0)  // attachment point on body2
));
world.createImpulseJoint(rigidJointDesc, body1, body2, true);

// Revolute joint - rotation around one axis (like a hinge door)
const revoluteJointDesc = new RAPIER.RigidJointBuilder(RAPIER.JointData.revolute(
    new RAPIER.Vector3(0, 0, 0), // attachment point
    new RAPIER.Vector3(0, 1, 0)  // axis of rotation (Y-up)
));
```

**Joint types:**

| Joint | Behavior |
|---|---|
| **Fixed** | Rigid connection, no relative movement |
| **Revolute** | Rotation around one axis (door hinge) |
| **Prismatic** | Linear movement along one axis (piston) |
| **Spherical** | Ball-and-socket, rotation in all directions |
| **Ball** | Limited spherical joint |
| **Distance** | Maintains fixed distance between bodies |
| **Rope** | Maintains maximum distance (slack rope) |

### 5. Forces and Impulses

**Forces** are continuous (applied every frame), while **impulses** are instantaneous (one-time application).

```javascript
// Apply continuous force
body.addForce(new RAPIER.Vector3(0, 10, 0), true); // true = wake body if sleeping

// Apply instantaneous impulse
body.applyImpulse(new RAPIER.Vector3(0, 5, 0), true);

// Set velocity directly
body.setLinvel(new RAPIER.Vector3(5, 0, 0), true);
body.setAngvel(new RAPIER.Vector3(0, 10, 0), true);
```

### 6. Collision Events

Rapier provides collision callbacks for gameplay events:

```javascript
// Handle collision start
const unsubscribe = world.contactsWith(body1Handle, (collider) => {
    // Body1 is colliding with collider
    console.log("Collision detected!");
});

// For fine-grained control, use event queue
world.stepSimulation();
let events = [];
world.drainCollisionEvents((handle1, handle2, started) => {
    if (started) {
        events.push({ handle1, handle2, type: 'start' });
    }
});
```

### 7. Ray Casting and Shape Casting

**Ray casting** finds what a ray intersects. **Shape casting** checks collisions along a swept path.

```javascript
// Ray cast from point in direction
const ray = new RAPIER.Ray(
    new RAPIER.Vector3(0, 1, 0),  // origin
    new RAPIER.Vector3(0, -1, 0)  // direction
);
const hit = world.castRay(ray, 100, false); // max distance, solid check
if (hit) {
    console.log(`Hit at parameter: ${hit.toi}`); // distance along ray
    console.log(`Collider: ${hit.collider}`);
}

// Shape cast - sweep a sphere along a path
const shape = new RAPIER.Ball(0.5); // radius
const shapeVel = new RAPIER.Vector3(0, -10, 0);
const hit = world.castShape(
    new RAPIER.Vector3(0, 5, 0), // origin
    new RAPIER.Quaternion.identity(), // rotation
    shapeVel,
    shape,
    100, // max distance
    false // solid check
);
```

## Physics Simulation Loop

The standard game loop integrates physics with rendering:

```javascript
import * as THREE from 'three';
import RAPIER from '@react-three/rapier';

// Initialize
const scene = new THREE.Scene();
const world = new RAPIER.World(new RAPIER.Vector3(0, -9.81, 0));
const clock = new THREE.Clock();

// Main loop
function animate() {
    requestAnimationFrame(animate);
    
    // Time step
    const delta = clock.getDelta();
    
    // Step physics simulation
    world.step(delta);
    
    // Update Three.js objects from physics bodies
    // (This is typically handled by a framework like @react-three/rapier)
    updateRenderFromPhysics();
    
    // Render frame
    renderer.render(scene, camera);
}
animate();
```

## Best Practices for Game Development

### 1. Scale Consistency

Rapier works best when world scale matches real-world physics:
- **1 unit = 1 meter** (standard)
- Object sizes: 0.1m to 10m for best stability
- Character height: typically 1.7-2.0m
- Avoid very small (<0.01m) or very large (>100m) objects in same world

### 2. Timestep and Simulation Quality

```javascript
// For 60 FPS gameplay
const timeStep = 1 / 60; // 0.0167 seconds
world.step(timeStep);

// Multiple sub-steps for better stability (at performance cost)
for (let i = 0; i < 2; i++) {
    world.step(timeStep / 2);
}
```

### 3. Body Configuration

- **Default gravity scale**: 1.0 (affected by world gravity)
- **Character bodies**: Often use kinematic bodies that you control, with dynamic ragdoll parts
- **Projectiles**: Dynamic bodies with no rotation constraint if only linear motion needed
- **Sleeping**: Significantly reduces CPU; tune sleep thresholds if gameplay needs precise control

### 4. Collider Configuration

- **Collision groups**: Use bitmasks to control what collides with what
- **Sensor colliders**: Use for triggers, area detection, loot pickups
- **Material properties**: Set friction and restitution per collider, not just body
- **Mesh colliders**: Use sparingly; trimesh has higher CPU cost than primitives

### 5. Debugging and Visualization

Rapier typically works "invisibly" - physics bodies don't render by default. Always:
1. Visualize colliders with wireframes or debug geometry
2. Show velocity vectors for dynamic bodies
3. Display collision points during development
4. Use pause/step controls to debug physics issues frame-by-frame

## Common Gameplay Patterns

### Pattern: Character Walking

```javascript
// Character setup:
// - Kinematic body for main character shape (capsule)
// - Script controls position based on input
// - Ray cast downward to detect ground for jump validation
// - Use velocity snapshots for momentum/knockback
```

### Pattern: Projectile

```javascript
// - Dynamic sphere body
// - Gravity enabled (scale 1.0)
// - Initial velocity set on creation
// - Rigid joint to parent object if it's held before throwing
```

### Pattern: Physics-Based Door

```javascript
// - Static frame body
// - Dynamic door body
// - Revolute joint connecting them
// - Optional limits on rotation angle
```

### Pattern: Ragdoll Character

```javascript
// - Multiple dynamic bodies for limbs
// - Spherical/revolute joints connecting limbs
// - Optional limits on joint rotation
// - Collision groups to prevent self-collision
```

## Performance Considerations

| Factor | Impact | Optimization |
|---|---|---|
| Number of dynamic bodies | High | Use kinematic bodies for NPCs if possible |
| Collision shape complexity | High | Use primitives instead of trimesh; combine shapes if needed |
| World size | Medium | Split large worlds into multiple physics worlds |
| Joint count | Medium | Limit ragdoll limb count |
| Collision events | Low | Only listen to events you need |
| Sub-stepping | High | Use sparingly; only when stability is critical |

## Next Steps

- Read `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md` for engine integration specifics
- Read `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md` for game mechanic patterns
- Consult official Rapier documentation at https://rapier.rs/

## References

- [Rapier Official Documentation](https://rapier.rs/)
- [Rapier JavaScript API](https://docs.rs/rapier/latest/rapier_js/)
- Three.js Physics Integration Patterns (in this repository)
