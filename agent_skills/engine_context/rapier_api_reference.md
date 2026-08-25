# Rapier Physics API Reference for Three.js

Status: Rapier 0.x physics integration API documentation

This document extends `<REPO_PATH>/agent_skills/engine_context/three_js_api.md` with Rapier physics capabilities for Three.js game development.

## Physics Module

Physics operations are accessed through the `three.physics.*` namespace in the ThreeClient.

```python
from engine_adapters.three_js import ThreeClient

three = ThreeClient(project_path=...)

# Access physics operations
three.physics.create_world(...)
three.physics.create_body(...)
```

## World Operations

### `three.physics.create_world`

Creates a new physics simulation world.

**Parameters:**
- `gravity` (Vector3, default=[0, -9.81, 0]): Gravitational acceleration
- `time_step` (float, default=0.0167): Simulation timestep (1/60 for 60 FPS)
- `world_id` (str, optional): Unique identifier for this world; if omitted, returns default world

**Returns:**
```json
{
  "ok": true,
  "operation": "physics.create_world",
  "payload": {
    "world_id": "default",
    "gravity": [0, -9.81, 0],
    "time_step": 0.0167
  }
}
```

**Example:**
```python
result = three.physics.create_world(
    gravity=(0, -9.81, 0),
    world_id="game_world"
)
assert result['ok']
world_id = result['payload']['world_id']
```

### `three.physics.get_world_info`

Retrieves current state of a physics world.

**Parameters:**
- `world_id` (str): World to query

**Returns:**
```json
{
  "ok": true,
  "payload": {
    "body_count": 42,
    "collider_count": 45,
    "joint_count": 8,
    "active_bodies": 12,
    "time_step": 0.0167
  }
}
```

### `three.physics.set_world_gravity`

Changes gravity for a world (useful for planet-specific gravity or gravity toggles).

**Parameters:**
- `world_id` (str): Target world
- `gravity` (Vector3): New gravity vector

**Returns:**
```json
{
  "ok": true,
  "operation": "physics.set_world_gravity",
  "payload": {
    "gravity": [0, -3.71, 0]
  }
}
```

### `three.physics.step_world`

Advances physics simulation by one timestep.

**Parameters:**
- `world_id` (str): World to step
- `delta_time` (float, optional): Override default timestep

**Returns:**
```json
{
  "ok": true,
  "operation": "physics.step_world",
  "payload": {
    "stepped": true,
    "collision_events": [
      {
        "type": "start",
        "body1": 2,
        "body2": 5,
        "collider1": 3,
        "collider2": 6
      }
    ]
  }
}
```

## Rigid Body Operations

### `three.physics.create_body`

Creates a rigid body in the physics world.

**Parameters:**
- `world_id` (str): Target world
- `body_type` (str): One of "dynamic", "kinematic", "static"
- `position` (Vector3, default=[0, 0, 0]): Initial position
- `rotation` (Quaternion, default=[0, 0, 0, 1]): Initial rotation
- `mass` (float, default=1.0): Body mass (for dynamic bodies)
- `gravity_scale` (float, default=1.0): Gravity multiplier
- `linvel` (Vector3, optional): Initial linear velocity
- `angvel` (Vector3, optional): Initial angular velocity
- `linear_damping` (float, optional): Linear velocity damping
- `angular_damping` (float, optional): Angular velocity damping

**Returns:**
```json
{
  "ok": true,
  "operation": "physics.create_body",
  "payload": {
    "body_id": 1,
    "body_handle": 1,
    "type": "dynamic"
  }
}
```

**Body Types:**

| Type | Behavior | Use case |
|---|---|---|
| `dynamic` | Gravity + forces applied, collisions move it | Characters, projectiles, vehicles |
| `static` | Immovable by physics, no gravity | Ground, walls, structures |
| `kinematic` | Script-controlled position, collisions reported | Platforms, enemies, ragdoll attachment |

### `three.physics.delete_body`

Removes a rigid body from the world.

**Parameters:**
- `world_id` (str)
- `body_id` (int)

### `three.physics.set_body_position`

Updates body position (teleport, not physics-based).

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `position` (Vector3)

### `three.physics.get_body_state`

Retrieves current body properties.

**Parameters:**
- `world_id` (str)
- `body_id` (int)

**Returns:**
```json
{
  "ok": true,
  "payload": {
    "position": [0.0, 1.5, 0.0],
    "rotation": [0.0, 0.0, 0.0, 1.0],
    "linear_velocity": [0.5, 0.0, 0.0],
    "angular_velocity": [0.0, 2.0, 0.0],
    "type": "dynamic",
    "sleeping": false,
    "mass": 1.0,
    "gravity_scale": 1.0
  }
}
```

### `three.physics.set_body_velocity`

Sets linear and/or angular velocity.

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `linvel` (Vector3, optional)
- `angvel` (Vector3, optional)

### `three.physics.apply_body_force`

Applies a continuous force (each frame).

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `force` (Vector3): Force vector
- `wake_up` (bool, default=True): Wake sleeping body

### `three.physics.apply_body_impulse`

Applies an instantaneous velocity change.

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `impulse` (Vector3): Impulse vector
- `wake_up` (bool, default=True): Wake sleeping body

### `three.physics.set_body_sleeping`

Control whether a body can sleep.

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `can_sleep` (bool)

### `three.physics.lock_body_rotations`

Prevents body from rotating (useful for characters).

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `lock_x` (bool, default=False)
- `lock_y` (bool, default=False)
- `lock_z` (bool, default=False)

**Example:** Prevent all rotation
```python
three.physics.lock_body_rotations(
    world_id="game_world",
    body_id=1,
    lock_x=True, lock_y=True, lock_z=True
)
```

## Collider Operations

Colliders define the shape used for collision detection. Each body must have at least one collider.

### `three.physics.create_collider`

Creates a collision shape and attaches it to a body.

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `shape` (str): Shape type
- `shape_params` (dict): Shape-specific parameters
- `density` (float, default=1.0)
- `friction` (float, default=0.5)
- `restitution` (float, default=0.0): Bounciness
- `is_sensor` (bool, default=False): If true, triggers don't apply forces

**Shape Types and Parameters:**

```python
# Box (cuboid)
three.physics.create_collider(
    world_id=world_id, body_id=body_id,
    shape="box",
    shape_params={"half_x": 0.5, "half_y": 1.0, "half_z": 0.5}
)

# Sphere
three.physics.create_collider(
    world_id=world_id, body_id=body_id,
    shape="ball",
    shape_params={"radius": 0.5}
)

# Capsule (cylinder with rounded ends)
three.physics.create_collider(
    world_id=world_id, body_id=body_id,
    shape="capsule",
    shape_params={"half_height": 0.9, "radius": 0.4}
)

# Cylinder
three.physics.create_collider(
    world_id=world_id, body_id=body_id,
    shape="cylinder",
    shape_params={"half_height": 1.0, "radius": 0.5}
)

# Cone
three.physics.create_collider(
    world_id=world_id, body_id=body_id,
    shape="cone",
    shape_params={"half_height": 1.0, "radius": 0.5}
)

# Triangle mesh (from imported 3D model)
three.physics.create_collider(
    world_id=world_id, body_id=body_id,
    shape="trimesh",
    shape_params={"mesh_asset_id": "terrain"}
)

# Heightfield (terrain)
three.physics.create_collider(
    world_id=world_id, body_id=body_id,
    shape="heightfield",
    shape_params={"height_data": [...], "scale": 1.0}
)
```

### `three.physics.delete_collider`

Removes a collider from a body.

**Parameters:**
- `world_id` (str)
- `collider_id` (int)

### `three.physics.get_collider_info`

Queries collider properties.

**Parameters:**
- `world_id` (str)
- `collider_id` (int)

**Returns:**
```json
{
  "ok": true,
  "payload": {
    "collider_id": 5,
    "body_id": 2,
    "shape": "capsule",
    "density": 1.0,
    "friction": 0.5,
    "restitution": 0.0,
    "is_sensor": false
  }
}
```

## Joint/Constraint Operations

Joints connect bodies and constrain their relative motion.

### `three.physics.create_joint`

Creates a constraint between two bodies.

**Parameters:**
- `world_id` (str)
- `body1_id` (int): First body
- `body2_id` (int): Second body
- `joint_type` (str): Type of joint
- `joint_params` (dict): Joint-specific parameters

**Joint Types:**

```python
# Fixed joint (rigid connection)
three.physics.create_joint(
    world_id=world_id,
    body1_id=body1, body2_id=body2,
    joint_type="fixed"
)

# Revolute joint (hinge, like a door)
three.physics.create_joint(
    world_id=world_id,
    body1_id=body1, body2_id=body2,
    joint_type="revolute",
    joint_params={
        "anchor1": [0, 0, 0],
        "anchor2": [0, 0, 0],
        "axis": [1, 0, 0],
        "limits": [-1.57, 1.57]  # ±90 degrees in radians
    }
)

# Spherical joint (ball-and-socket)
three.physics.create_joint(
    world_id=world_id,
    body1_id=body1, body2_id=body2,
    joint_type="spherical",
    joint_params={
        "anchor1": [0, 0, 0],
        "anchor2": [0, 0, 0]
    }
)

# Prismatic joint (linear, like a piston)
three.physics.create_joint(
    world_id=world_id,
    body1_id=body1, body2_id=body2,
    joint_type="prismatic",
    joint_params={
        "anchor1": [0, 0, 0],
        "anchor2": [0, 0, 0],
        "axis": [0, 1, 0]
    }
)

# Distance joint (maintains fixed distance)
three.physics.create_joint(
    world_id=world_id,
    body1_id=body1, body2_id=body2,
    joint_type="distance",
    joint_params={
        "anchor1": [0, 0, 0],
        "anchor2": [0, 0, 0],
        "distance": 2.0
    }
)
```

### `three.physics.delete_joint`

Removes a constraint.

**Parameters:**
- `world_id` (str)
- `joint_id` (int)

## Query Operations

### `three.physics.raycast`

Casts a ray through the world to find collisions.

**Parameters:**
- `world_id` (str)
- `origin` (Vector3): Ray starting point
- `direction` (Vector3): Ray direction (will be normalized)
- `max_distance` (float): How far to search
- `solid_check` (bool, default=False): If true, doesn't hit sensors

**Returns:**
```json
{
  "ok": true,
  "operation": "physics.raycast",
  "payload": {
    "hit": true,
    "toi": 1.5,
    "body_id": 3,
    "collider_id": 7,
    "position": [1.0, 2.0, 3.0],
    "normal": [0, 1, 0]
  }
}
```

**Example:** Ground detection
```python
result = three.physics.raycast(
    world_id=world_id,
    origin=(character_x, character_y - 0.5, character_z),
    direction=(0, -1, 0),
    max_distance=0.6
)
is_grounded = result['payload']['hit']
```

### `three.physics.shapecast`

Sweeps a collision shape along a path.

**Parameters:**
- `world_id` (str)
- `shape` (str): Shape type ("ball", "box", etc.)
- `shape_params` (dict): Shape parameters
- `origin` (Vector3): Starting position
- `direction` (Vector3): Direction and distance
- `solid_check` (bool, default=False)

**Returns:** Similar to raycast

### `three.physics.get_colliders_in_region`

Finds all colliders intersecting a bounding box.

**Parameters:**
- `world_id` (str)
- `min_corner` (Vector3)
- `max_corner` (Vector3)

**Returns:**
```json
{
  "ok": true,
  "payload": {
    "collider_ids": [1, 3, 5, 12],
    "body_ids": [1, 2, 3, 4]
  }
}
```

## Collision Event Operations

### `three.physics.get_collision_events`

Retrieves collision events that occurred during the last world step.

**Parameters:**
- `world_id` (str)

**Returns:**
```json
{
  "ok": true,
  "operation": "physics.get_collision_events",
  "payload": {
    "events": [
      {
        "type": "start",
        "body1_id": 1,
        "body2_id": 2,
        "collider1_id": 3,
        "collider2_id": 4
      },
      {
        "type": "end",
        "body1_id": 1,
        "body2_id": 3
      }
    ]
  }
}
```

### `three.physics.set_collision_groups`

Configures which bodies can collide with each other using bitmasks.

**Parameters:**
- `world_id` (str)
- `body_id` (int)
- `collision_group` (int): Bitmask identifying this body's group
- `collision_mask` (int): Bitmask of groups this body collides with

**Example:**
```python
GROUND = 0b0001
PLAYER = 0b0010
ENEMY = 0b0100
PROJECTILE = 0b1000

# Player collides with ground and enemy
three.physics.set_collision_groups(
    world_id=world_id,
    body_id=player_body_id,
    collision_group=PLAYER,
    collision_mask=GROUND | ENEMY
)

# Projectile only collides with ground and enemy
three.physics.set_collision_groups(
    world_id=world_id,
    body_id=projectile_body_id,
    collision_group=PROJECTILE,
    collision_mask=GROUND | ENEMY
)
```

## Synchronized Rendering

Physics bodies must be synchronized with Three.js meshes each frame.

```python
result = three.physics.get_body_state(world_id, body_id)
body_state = result['payload']

# Update Three.js mesh position and rotation
mesh.position.set(*body_state['position'])
mesh.quaternion.set(
    body_state['rotation'][0],  # x
    body_state['rotation'][1],  # y
    body_state['rotation'][2],  # z
    body_state['rotation'][3]   # w
)
```

Generated gameplay code handles this synchronization automatically through entity systems.

## Performance Guidelines

| Operation | Cost | Notes |
|---|---|---|
| create_body | Low | Safe to call frequently |
| delete_body | Medium | Prefer reuse pools for projectiles |
| step_world | High | Call once per frame; biggest performance cost |
| raycast | Medium | Fast for single rays; avoid excessive queries |
| shapecast | Medium | More expensive than raycast |
| get_colliders_in_region | Medium | O(n) in world size |
| get_collision_events | Low | Free when called; cost is during stepping |

**Optimization strategies:**
- Call `step_world` once per game frame only
- Use collision group masks to reduce collision pairs
- Delete bodies outside gameplay area
- Pool and reuse dynamic bodies for projectiles/effects
- Use kinematic bodies for non-player characters

## Error Handling

All physics operations return the standard result contract:

```python
result = three.physics.create_body(...)
if not result['ok']:
    for error in result.get('errors', []):
        print(f"Error: {error}")
    for warning in result.get('warnings', []):
        print(f"Warning: {warning}")
```

Common errors:
- `world_not_found` - world_id references non-existent world
- `body_not_found` - body_id invalid
- `invalid_body_type` - body_type not in {dynamic, static, kinematic}
- `invalid_shape_type` - shape not recognized
- `invalid_joint_type` - joint_type not recognized
- `collision_shape_error` - shape_params invalid

## Integration with Gameplay Code

The ThreeClient physics APIs are typically wrapped by gameplay generation code. Agents rarely call these directly; instead, they generate game-specific physics classes:

```javascript
// Generated gameplay code (Three.js)
class PlayerCharacter {
    constructor(world) {
        this.bodyId = world.createBody('dynamic', /* ... */);
        this.colliderId = world.createCollider(/* ... */);
    }
    
    update(deltaTime) {
        // Physics happens automatically during world.step()
        // Gameplay code just sets velocities and checks events
    }
}
```

## Next Steps

- Read `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md` for physics concepts
- Read `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md` for integration patterns
- Read `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md` for gameplay examples
- See `<REPO_PATH>/engine_adapters/three_js/examples/` for complete working examples

