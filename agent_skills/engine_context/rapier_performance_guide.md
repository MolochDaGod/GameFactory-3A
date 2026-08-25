# Rapier Physics Performance Optimization Guide

Status: Production optimization guide for Rapier physics in Three.js games

This guide covers performance tuning and optimization strategies for Rapier-powered games.

## Performance Baseline

Rapier is a high-performance physics engine, but performance depends on configuration:

**Typical performance:**
- **50 dynamic bodies**: < 1ms per frame
- **200 dynamic bodies**: 2-5ms per frame
- **1000 dynamic bodies**: 10-30ms per frame (depends on complexity)

On a modern desktop:
- Target: 60 FPS = 16.67ms per frame
- Physics budget: typically 2-4ms (12-24% of frame)
- Test on intended target platform (mobile < 5ms for 60 FPS)

## Profiling First

Always profile before optimizing:

```javascript
// Simple frame time measurement
const perfMarkers = {
    physicsStart: 0,
    physicsEnd: 0
};

function gameLoop() {
    perfMarkers.physicsStart = performance.now();
    world.step(deltaTime);
    perfMarkers.physicsEnd = performance.now();
    
    const physicsMs = perfMarkers.physicsEnd - perfMarkers.physicsStart;
    console.log(`Physics: ${physicsMs.toFixed(2)}ms`);
}

// Or use browser DevTools Performance tab
performance.mark('physics-start');
world.step(deltaTime);
performance.mark('physics-end');
performance.measure('physics', 'physics-start', 'physics-end');
```

## Optimization Strategies

### Strategy 1: Broad Phase Optimization

The **broad phase** quickly eliminates pairs that cannot collide. This is the first and cheapest step.

**Current approach**: Rapier uses Sweep-and-Prune (SAP) by default, which is very efficient.

**Tuning:**
```javascript
// Already optimized by default; no agent configuration needed
// For massive worlds (1000+ bodies), consider:
// - Using collision groups aggressively to reduce pairs
// - Splitting worlds into regions (see Multi-World Pattern below)
```

### Strategy 2: Narrow Phase Optimization

The **narrow phase** performs precise collision detection on pairs the broad phase identified.

**Optimization 1: Collision Group Filtering**

This is the **#1 most impactful optimization**. Use bitmasks to prevent unnecessary collision checks:

```python
# Define collision groups
GROUND = 0b0001
PLAYER = 0b0010
ENEMY = 0b0100
PROJECTILE = 0b1000
ENEMY_PROJECTILE = 0b10000
PROP = 0b100000

# Player collides ONLY with: ground, enemy, enemy projectiles
three.physics.set_collision_groups(
    world_id=world_id,
    body_id=player_body_id,
    collision_group=PLAYER,
    collision_mask=GROUND | ENEMY | ENEMY_PROJECTILE
)

# Enemy collides ONLY with: ground, player, player projectiles
three.physics.set_collision_groups(
    world_id=world_id,
    body_id=enemy_body_id,
    collision_group=ENEMY,
    collision_mask=GROUND | PLAYER | PROJECTILE
)

# Projectiles don't collide with each other
three.physics.set_collision_groups(
    world_id=world_id,
    body_id=projectile_body_id,
    collision_group=PROJECTILE,
    collision_mask=GROUND | ENEMY  # Only hit ground and enemies
)
```

**Impact**: Can reduce collision pairs by 50-90%, saving 30-50% of physics time.

**Optimization 2: Sensor Colliders**

Use sensor colliders (triggers) for area detection instead of raycasts:

```python
# SLOW: Raycast every frame
result = three.physics.raycast(
    world_id=world_id,
    origin=character_pos,
    direction=(0, -1, 0),
    max_distance=0.5
)
is_grounded = result['payload']['hit']

# FAST: Use sensor collider below character
three.physics.create_collider(
    world_id=world_id,
    body_id=character_foot_trigger_id,
    shape="ball",
    shape_params={"radius": 0.1},
    is_sensor=True  # No physics response, just collision reports
)

# Check collision events
events = three.physics.get_collision_events(world_id=world_id)
is_grounded = any(e['type'] == 'start' for e in events 
                   if (e['collider1_id'] == foot_trigger or 
                       e['collider2_id'] == foot_trigger))
```

**Optimization 3: Simplified Colliders**

Replace complex mesh colliders with simpler primitives:

```python
# SLOW: Triangle mesh collider (100+ triangles)
# Every collision check: complex geometric calculations
three.physics.create_collider(
    world_id=world_id,
    body_id=complex_prop_body_id,
    shape="trimesh",
    shape_params={"mesh_asset_id": "ornate_vase"}  # 500 triangles
)

# FAST: Single sphere or box
# One collision check: single mathematical operation
three.physics.create_collider(
    world_id=world_id,
    body_id=vase_body_id,
    shape="ball",
    shape_params={"radius": 0.3}
)

# If you need shape accuracy, combine multiple primitives
three.physics.create_collider(
    world_id=world_id,
    body_id=sword_body_id,
    shape="capsule",
    shape_params={"half_height": 0.4, "radius": 0.05}
)
```

**Performance comparison:**
- Sphere: ~0.001ms per collision check
- Box: ~0.001ms per collision check
- Capsule: ~0.002ms per collision check
- Triangle mesh (10 triangles): ~0.01ms per collision check
- Triangle mesh (100 triangles): ~0.05ms per collision check

### Strategy 3: Body Count Reduction

The most direct optimization: fewer bodies = faster simulation.

**Technique 1: Kinematic Bodies for NPCs**

```python
# SLOW: 20 enemy NPCs as dynamic bodies
# Each frame: gravity, forces, collision response
for i in range(20):
    three.physics.create_body(
        world_id=world_id,
        body_type="dynamic",
        position=enemy_positions[i]
    )

# FAST: 20 enemy NPCs as kinematic bodies
# Each frame: you just set position (no simulation)
for i in range(20):
    three.physics.create_body(
        world_id=world_id,
        body_type="kinematic",  # Script-controlled, no forces
        position=enemy_positions[i]
    )
    # Move them with AI steering, not physics
    three.physics.set_body_position(
        world_id=world_id,
        body_id=enemy_id,
        position=new_position_from_ai
    )
```

**Performance impact**: Kinematic ~100x faster than dynamic bodies in isolation.

**Technique 2: Object Pooling**

Reuse objects instead of creating/destroying:

```python
class ProjectilePool:
    def __init__(self, world_id, pool_size=50):
        self.pool = []
        self.active = []
        self.world_id = world_id
        
        for _ in range(pool_size):
            # Pre-create bodies
            body_id = three.physics.create_body(
                world_id=world_id,
                body_type="dynamic"
            )
            collider_id = three.physics.create_collider(
                world_id=world_id,
                body_id=body_id,
                shape="ball",
                shape_params={"radius": 0.1}
            )
            self.pool.append({'body_id': body_id, 'active': False})
    
    def fire(self, origin, direction, speed):
        if not self.pool:
            return None  # Pool empty
        
        proj = self.pool.pop()
        proj['active'] = True
        self.active.append(proj)
        
        # Reuse existing body
        three.physics.set_body_position(
            world_id=self.world_id,
            body_id=proj['body_id'],
            position=origin
        )
        three.physics.set_body_velocity(
            world_id=self.world_id,
            body_id=proj['body_id'],
            linvel=direction.scale(speed)
        )
        
        return proj
    
    def update(self, deltaTime):
        # Mark dead projectiles as reusable
        for proj in self.active[:]:
            state = three.physics.get_body_state(
                world_id=self.world_id,
                body_id=proj['body_id']
            )
            
            if out_of_bounds(state['position']):
                proj['active'] = False
                self.active.remove(proj)
                self.pool.append(proj)
```

**Performance impact**: Eliminates creation/destruction overhead; reuse reduces memory fragmentation.

**Technique 3: Remove Distant Bodies**

```python
def cleanup_distant_bodies(world_id, camera_pos, max_distance=100):
    # Get all bodies
    world_info = three.physics.get_world_info(world_id=world_id)
    
    for body_id in range(world_info['body_count']):
        state = three.physics.get_body_state(
            world_id=world_id,
            body_id=body_id
        )
        
        distance = vec3_distance(state['position'], camera_pos)
        if distance > max_distance:
            three.physics.delete_body(
                world_id=world_id,
                body_id=body_id
            )
```

### Strategy 4: Solver and Timestep Optimization

**Technique 1: Adaptive Timestep**

```python
def game_loop(frame_delta_time):
    # Cap timestep to prevent instability
    clamped_delta = min(frame_delta_time, 0.033)  # Max 33ms
    
    # For 60 FPS, use 1/60 (0.0167)
    # For 30 FPS, use 1/30 (0.0333)
    timestep = 1.0 / target_fps
    
    three.physics.step_world(
        world_id=world_id,
        delta_time=timestep
    )
```

**Technique 2: Sub-stepping Trade-off**

Only use substeps when you need stability, not by default:

```python
# Standard: 1 step per frame = fastest
three.physics.step_world(world_id=world_id, delta_time=1/60)

# Better stability: 2 substeps = 2x slower but more stable
# Only use for ragdoll, chains, or stiff joints
for i in range(2):
    three.physics.step_world(world_id=world_id, delta_time=1/120)
```

**Performance impact:**
- 1 step: 1.0x
- 2 substeps: 1.8x (not 2.0x due to cache effects)
- 4 substeps: 3.5x

### Strategy 5: Multi-World Pattern

For very large games (1000+ bodies), split into multiple physics worlds:

```python
class WorldRegion:
    def __init__(self, region_id, bounds):
        self.world_id = f"region_{region_id}"
        self.bounds = bounds
        
        # Create separate world for this region
        three.physics.create_world(
            world_id=self.world_id,
            gravity=(0, -9.81, 0)
        )
    
    def add_body(self, body_type, position):
        return three.physics.create_body(
            world_id=self.world_id,
            body_type=body_type,
            position=position
        )
    
    def step(self, delta_time):
        three.physics.step_world(
            world_id=self.world_id,
            delta_time=delta_time
        )

# Usage
outdoor_world = WorldRegion("outdoor", bounds=...)
indoor_world = WorldRegion("indoor", bounds=...)

# Player in outdoor world
player_body = outdoor_world.add_body('dynamic', player_pos)

# Each frame, step only active worlds
outdoor_world.step(delta_time)
if player_near_indoor:
    indoor_world.step(delta_time)
```

**Performance impact**: Scales linearly; two 500-body worlds are ~2x faster than one 1000-body world.

### Strategy 6: Sleeping and Deactivation

**Automatic Sleeping** (already done by Rapier):
- Bodies at rest are "asleep" and don't consume CPU
- Automatically wake on collision
- No tuning needed; works out of the box

**Manual Control** (when needed):

```python
# Put body to sleep manually
three.physics.set_body_sleeping(
    world_id=world_id,
    body_id=body_id,
    can_sleep=False  # Disable automatic sleeping
)

# Useful for: ragdolls (want to simulate decay), swinging objects
# Not needed for: projectiles (inherently short-lived)
```

## Platform-Specific Optimization

### Desktop/Web (60 FPS, 16.67ms budget)

**Recommended budget**: 2-3ms for physics (12-18% of frame)

- Use all optimization strategies above
- Aggressive collision group filtering
- 200-300 dynamic bodies typical maximum
- Kinematic bodies for NPCs (unlimited count)

### Mobile (30-60 FPS, 16.67-33ms budget)

**Recommended budget**: 1-2ms for physics (6-12% of frame)

- Use kinematic bodies exclusively for non-player characters
- Reduce body count to 50-100 maximum
- Simplified collider shapes only
- No substeps; use 1/30 timestep for stability

```python
if target_platform == "mobile":
    # Aggressive optimization
    timestep = 1 / 30  # Lower FPS
    max_dynamic_bodies = 50
    # Use collision groups heavily
    # Prefer kinematic NPCs
```

## Profiling Results Example

**Before optimization:**
```
Physics time: 8.5ms
- Broad phase: 1.2ms
- Narrow phase: 5.3ms (collision pairs: 500)
- Solver: 2.0ms
Total frame: 24.5ms (41.2 FPS)
```

**After optimization (collision groups):**
```
Physics time: 2.1ms (-75%)
- Broad phase: 1.2ms
- Narrow phase: 0.6ms (collision pairs: 50) ← 90% reduction!
- Solver: 0.3ms
Total frame: 12.3ms (81.3 FPS)
```

## Common Bottlenecks and Solutions

| Symptom | Cause | Solution |
|---|---|---|
| Consistent 8-15ms physics | Too many collision pairs | Add collision groups |
| Physics OK but sudden spikes | Raycast/shapecast every frame | Use sensors instead |
| Performance degrades over time | Bodies not deleted or sleeping | Cleanup distant bodies; verify sleeping |
| Jittery movement | Timestep too large | Use 1/60; add substeps if unstable |
| Memory grows unbounded | Bodies not deleted | Verify destroy() called in pool |
| NPC performance bad | Using dynamic bodies | Switch to kinematic |

## Debugging Performance

```javascript
// Log physics metrics each frame
function debugPhysicsPerformance(world_id) {
    const info = three.physics.get_world_info(world_id);
    
    console.log(`
        Bodies: ${info.body_count}
        Active: ${info.active_bodies}
        Colliders: ${info.collider_count}
        Joints: ${info.joint_count}
        Time step: ${info.time_step}ms
    `);
}

// Identify slow raycast queries
const raycastPerf = performance.now();
const result = three.physics.raycast(...);
console.log(`Raycast: ${performance.now() - raycastPerf}ms`);

// Profile world step
const stepPerf = performance.now();
three.physics.step_world(world_id);
console.log(`World step: ${performance.now() - stepPerf}ms`);
```

## Checklist: Performance Optimization

- [ ] Profile with real game content
- [ ] Measure baseline FPS and physics time
- [ ] Enable collision group filtering for all bodies
- [ ] Switch NPCs to kinematic bodies
- [ ] Replace mesh colliders with primitives
- [ ] Implement object pooling for projectiles/effects
- [ ] Set timestep to 1/60 (or target FPS)
- [ ] Disable substeps (only add if stability issues)
- [ ] Implement cleanup for distant bodies
- [ ] Test on target platform (mobile if shipping mobile)
- [ ] Re-profile after optimizations
- [ ] Document findings and constraints

## Next Steps

- Implement profiling in your game
- Apply optimization strategies in priority order
- Measure impact of each change
- Target platform FPS and profile there
- Read `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` for API details

