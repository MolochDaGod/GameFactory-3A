# Rapier Physics Advanced Techniques and Topics

Status: Advanced production guide for Rapier physics in Three.js

This guide covers advanced physics patterns for sophisticated game mechanics.

## Prerequisites

Read these first:
- `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md`
- `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md`
- `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md`

## Advanced Topic 1: Joint Motor Control

**Context**: Powered joints for animated mechanisms, powered doors, rotating platforms

Motors apply force to maintain a target angular or linear velocity:

```python
# Create a revolute joint with a motor
three.physics.create_joint(
    world_id=world_id,
    body1_id=frame_body_id,
    body2_id=door_body_id,
    joint_type="revolute",
    joint_params={
        "anchor1": [0, 0, 0],
        "anchor2": [0, 0, 0],
        "axis": [0, 1, 0],  # Rotate around Y axis
        "motor": {
            "target_velocity": 2.0,  # rad/s (full rotation in ~3.14 seconds)
            "max_impulse": 10.0      # Force limit
        },
        "limits": [-1.57, 1.57]  # ±90 degrees
    }
)
```

**Use cases:**
- Powered doors that open/close
- Rotating platforms
- Animated machinery
- Powered hinges with mechanical feel

### Varying Motor Speed (Smooth animation)

```python
class MotorControlledDoor:
    def __init__(self, world_id, joint_id):
        self.world_id = world_id
        self.joint_id = joint_id
        self.target_angle = 0  # radians
        self.max_speed = 2.0   # rad/s
    
    def open(self):
        self.target_angle = 1.57  # 90 degrees
    
    def close(self):
        self.target_angle = 0
    
    def update(self, delta_time):
        # Smoothly adjust motor speed toward target
        # This creates natural acceleration/deceleration
        current_angle = three.physics.get_joint_angle(
            world_id=self.world_id,
            joint_id=self.joint_id
        )
        
        angle_diff = self.target_angle - current_angle
        desired_velocity = angle_diff * 2.0  # Proportional control
        clamped_velocity = max(-self.max_speed, min(self.max_speed, desired_velocity))
        
        three.physics.set_joint_motor_velocity(
            world_id=self.world_id,
            joint_id=self.joint_id,
            target_velocity=clamped_velocity
        )
```

## Advanced Topic 2: Custom Collision Callbacks

**Context**: Game-specific collision behavior beyond standard physics response

### Damage on Collision

```python
class DamageOnImpact:
    def __init__(self, world_id, body_id, damage_per_speed=1.0):
        self.world_id = world_id
        self.body_id = body_id
        self.damage_per_speed = damage_per_speed
        self.last_collision_damage = 0
    
    def on_collision(self, contact_event, world_id):
        """Called when this body collides with something."""
        if contact_event['type'] != 'start':
            return
        
        other_body_id = contact_event['body2_id'] if \
            contact_event['body1_id'] == self.body_id \
            else contact_event['body1_id']
        
        # Get impact velocity
        my_state = three.physics.get_body_state(
            world_id=world_id,
            body_id=self.body_id
        )
        impact_velocity = magnitude(my_state['linear_velocity'])
        
        # Calculate damage
        damage = max(0, impact_velocity - 2.0) * self.damage_per_speed
        
        if damage > 0.1:  # Minimum damage threshold
            self.last_collision_damage = damage
            return {
                'damage': damage,
                'target_id': other_body_id,
                'impact_velocity': impact_velocity
            }
        
        return None
```

### Custom Material Interactions

```python
class MaterialPhysics:
    """Different collision behavior based on materials."""
    
    MATERIALS = {
        'stone': {'friction': 0.8, 'restitution': 0.1},
        'metal': {'friction': 0.3, 'restitution': 0.5},
        'rubber': {'friction': 0.9, 'restitution': 0.8},
        'ice': {'friction': 0.0, 'restitution': 0.9},
    }
    
    @staticmethod
    def create_collider(world_id, body_id, shape, material):
        """Create collider with material properties."""
        mat_props = MaterialPhysics.MATERIALS.get(material, {})
        
        return three.physics.create_collider(
            world_id=world_id,
            body_id=body_id,
            shape=shape,
            friction=mat_props.get('friction', 0.5),
            restitution=mat_props.get('restitution', 0.0)
        )
```

## Advanced Topic 3: Networked Physics

**Context**: Multiplayer games where physics must be synchronized

### Deterministic Simulation

Rapier is deterministic, making it suitable for networked games:

```python
class NetworkedPhysicsWorld:
    """Physics world synchronized across network."""
    
    def __init__(self, world_id, is_host=False):
        self.world_id = world_id
        self.is_host = is_host
        self.frame_number = 0
    
    def step(self, delta_time, network_input):
        """Step with network input."""
        # Apply network input (player commands)
        # This must be IDENTICAL on all clients
        for player_id, input_state in network_input.items():
            self._apply_player_input(player_id, input_state)
        
        # Step physics (deterministic)
        three.physics.step_world(
            world_id=self.world_id,
            delta_time=1/60  # FIXED timestep (critical!)
        )
        
        self.frame_number += 1
    
    def _apply_player_input(self, player_id, input_state):
        """Apply input consistently."""
        body_id = self.get_player_body(player_id)
        
        if input_state.get('jump'):
            three.physics.apply_body_impulse(
                world_id=self.world_id,
                body_id=body_id,
                impulse=(0, 5, 0)
            )
```

**Critical for networked physics:**
- Use FIXED timestep (1/60, not variable delta)
- Identical input on all clients
- Deterministic operations only
- Verify frame-by-frame on debug builds

### State Compression for Network

```python
class PhysicsStateSnapshot:
    """Compressed state for network transmission."""
    
    @staticmethod
    def capture(world_id, tracked_body_ids):
        """Create compact snapshot for network."""
        snapshot = {
            'frame': frame_number,
            'bodies': {}
        }
        
        for body_id in tracked_body_ids:
            state = three.physics.get_body_state(
                world_id=world_id,
                body_id=body_id
            )
            
            # Only transmit changed data
            snapshot['bodies'][body_id] = {
                'p': quantize_vector(state['position']),  # Position
                'r': quantize_quaternion(state['rotation']),  # Rotation
                'v': quantize_vector(state['linear_velocity']),  # Velocity
            }
        
        return snapshot
    
    @staticmethod
    def quantize_vector(v, precision=100):
        """Reduce precision for network."""
        return [
            round(v[0] * precision) / precision,
            round(v[1] * precision) / precision,
            round(v[2] * precision) / precision,
        ]
```

## Advanced Topic 4: Scripted Physics (CinematicPhysics)

**Context**: Authored physics sequences for cinematics or puzzle solutions

### Physics Playback

```python
class PhysicsSequence:
    """Pre-recorded physics sequence for cinematics."""
    
    def __init__(self, world_id):
        self.world_id = world_id
        self.recorded_states = {}  # frame -> body_state
        self.is_recording = False
        self.is_playing = False
        self.current_frame = 0
    
    def start_recording(self):
        """Begin recording physics state."""
        self.is_recording = True
        self.recorded_states = {}
        self.current_frame = 0
    
    def record_frame(self, body_ids):
        """Capture current frame's physics state."""
        if not self.is_recording:
            return
        
        states = {}
        for body_id in body_ids:
            states[body_id] = three.physics.get_body_state(
                world_id=self.world_id,
                body_id=body_id
            )
        
        self.recorded_states[self.current_frame] = states
        self.current_frame += 1
    
    def start_playback(self):
        """Begin playing back recorded sequence."""
        self.is_recording = False
        self.is_playing = True
        self.current_frame = 0
    
    def update_playback(self):
        """Update bodies to recorded positions."""
        if not self.is_playing:
            return
        
        if self.current_frame not in self.recorded_states:
            self.is_playing = False  # End of sequence
            return
        
        states = self.recorded_states[self.current_frame]
        
        for body_id, state in states.items():
            three.physics.set_body_position(
                world_id=self.world_id,
                body_id=body_id,
                position=state['position']
            )
            # Velocity/rotation also applied if needed
        
        self.current_frame += 1
```

## Advanced Topic 5: Soft Body Physics (Ropes, Cloth)

**Context**: Simulating flexible objects using rigid body chains

### Rope Physics

```python
class Rope:
    """Rope simulation using distance joints."""
    
    def __init__(self, world_id, start_pos, end_pos, segment_count=10):
        self.world_id = world_id
        self.segments = []
        
        # Create segment bodies
        segment_length = distance(start_pos, end_pos) / segment_count
        
        for i in range(segment_count):
            pos = lerp(start_pos, end_pos, i / segment_count)
            
            if i == 0:
                # First segment: fixed
                body = world_id.create_body(
                    body_type='static',
                    position=pos
                )
            else:
                # Middle segments: dynamic
                body = world_id.create_body(
                    body_type='dynamic',
                    position=pos
                )
            
            collider = world_id.create_collider(
                body_id=body,
                shape='ball',
                shape_params={'radius': 0.05}
            )
            
            self.segments.append(body)
            
            # Connect to previous segment with distance joint
            if i > 0:
                three.physics.create_joint(
                    world_id=world_id,
                    body1_id=self.segments[i-1],
                    body2_id=body,
                    joint_type='distance',
                    joint_params={'distance': segment_length}
                )
    
    def set_anchor(self, position):
        """Move rope's anchor point."""
        three.physics.set_body_position(
            world_id=self.world_id,
            body_id=self.segments[0],
            position=position
        )
```

## Advanced Topic 6: Constraint Solvers and Iterations

**Context**: Fine-tuning physics accuracy vs performance

### Multiple Solver Iterations

```python
class PhysicsQualityMode:
    """Adjust physics quality for performance."""
    
    PRESETS = {
        'low': {
            'timestep': 1/30,
            'substeps': 1,
            'solver_iterations': 4
        },
        'medium': {
            'timestep': 1/60,
            'substeps': 1,
            'solver_iterations': 8
        },
        'high': {
            'timestep': 1/60,
            'substeps': 2,
            'solver_iterations': 16
        }
    }
    
    @staticmethod
    def apply_preset(world_id, preset_name):
        """Apply quality preset."""
        preset = PhysicsQualityMode.PRESETS[preset_name]
        
        # Substeps are handled by calling step multiple times
        # Solver iterations would be configured via world settings
        # (Currently Rapier auto-optimizes; this is for future API)
```

## Advanced Topic 7: Collision Events and Filtering

### Complex Collision Groups

```python
class CollisionManager:
    """Centralized collision behavior management."""
    
    def __init__(self, world_id):
        self.world_id = world_id
        self.collision_handlers = {}  # (group1, group2) -> handler
    
    def register_handler(self, group1, group2, callback):
        """Register callback for collision between groups."""
        key = tuple(sorted([group1, group2]))
        self.collision_handlers[key] = callback
    
    def process_collisions(self):
        """Process all collision events."""
        events = three.physics.get_collision_events(
            world_id=self.world_id
        )
        
        for event in events:
            collider1 = three.physics.get_collider_info(
                world_id=self.world_id,
                collider_id=event['collider1_id']
            )
            collider2 = three.physics.get_collider_info(
                world_id=self.world_id,
                collider_id=event['collider2_id']
            )
            
            # Find handler for this collision
            key = tuple(sorted([
                collider1['collision_group'],
                collider2['collision_group']
            ]))
            
            handler = self.collision_handlers.get(key)
            if handler:
                handler(event)
```

## Advanced Topic 8: Physics Debugging and Introspection

### Physics State Validation

```python
class PhysicsValidator:
    """Verify physics world consistency."""
    
    @staticmethod
    def validate_world(world_id):
        """Check for physics problems."""
        issues = []
        
        info = three.physics.get_world_info(world_id)
        
        # Check for excessive bodies
        if info['body_count'] > 500:
            issues.append(
                f"High body count: {info['body_count']} "
                "(may impact performance)"
            )
        
        # Check for sleeping ratio
        if info['active_bodies'] < info['body_count'] * 0.1:
            issues.append(
                f"Most bodies sleeping: {info['active_bodies']}/{info['body_count']}"
            )
        
        return issues
    
    @staticmethod
    def validate_body(world_id, body_id):
        """Check individual body health."""
        state = three.physics.get_body_state(
            world_id=world_id,
            body_id=body_id
        )
        
        issues = []
        
        # Check for nan/inf
        pos = state['position']
        if any(p != p or p in [float('inf'), float('-inf')] for p in pos):
            issues.append("Invalid position (NaN or Inf)")
        
        # Check for excessive velocity
        vel = state['linear_velocity']
        speed = magnitude(vel)
        if speed > 100:
            issues.append(f"Excessive velocity: {speed} m/s")
        
        return issues
```

### Visualization Helpers

```python
def visualize_collision_pairs(world_id, scene):
    """Debug: Show all active collision pairs."""
    info = three.physics.get_world_info(world_id)
    
    # Create debug lines between colliding bodies
    # Implementation depends on your rendering system
    
    # This is conceptual; actual implementation needs 
    # access to collision pair data (may require API extension)
    pass

def visualize_forces(world_id, scene):
    """Debug: Show forces acting on bodies."""
    # Similar visualization of current forces
    # Useful for debugging force application
    pass
```

## Advanced Topic 9: Custom Constraint Types

**Context**: Game-specific constraints not provided by standard joints

### Rope Constraint (Limited Distance)

```python
class RopeConstraint:
    """Constraint that limits maximum distance (rope, not chain)."""
    
    def __init__(self, world_id, body1_id, body2_id, max_length):
        self.world_id = world_id
        self.body1_id = body1_id
        self.body2_id = body2_id
        self.max_length = max_length
    
    def update(self):
        """Enforce constraint each frame."""
        state1 = three.physics.get_body_state(
            world_id=self.world_id,
            body_id=self.body1_id
        )
        state2 = three.physics.get_body_state(
            world_id=self.world_id,
            body_id=self.body2_id
        )
        
        pos1 = state1['position']
        pos2 = state2['position']
        
        distance = vec3_distance(pos1, pos2)
        
        if distance > self.max_length:
            # Pull apart to max_length
            direction = normalize_vector(
                (pos2[0] - pos1[0], pos2[1] - pos1[1], pos2[2] - pos1[2])
            )
            target_pos = (
                pos1[0] + direction[0] * self.max_length,
                pos1[1] + direction[1] * self.max_length,
                pos1[2] + direction[2] * self.max_length
            )
            
            three.physics.set_body_position(
                world_id=self.world_id,
                body_id=self.body2_id,
                position=target_pos
            )
```

## Performance Tips for Advanced Techniques

| Technique | Cost | Notes |
|---|---|---|
| Motor joints | Medium | One motor: negligible; many motors: ~1-2ms per 10 motors |
| Rope/chain | Medium | 10 segments: ~0.5ms; 50 segments: ~3ms |
| Networked physics | Low | Overhead is serialization, not physics |
| Soft body cloth | High | Per-vertex: expensive; use simplifications |
| Recording sequence | Medium | Storage: ~1KB per frame per body; replay: free |

## Debugging Workflow

1. **Identify issue** - Is it physics, rendering, or gameplay?
2. **Isolate problem** - Single body? Multiple? All physics?
3. **Validate state** - Use `validate_world()` and `validate_body()`
4. **Check collisions** - Log collision events for your case
5. **Inspect constraints** - Verify joint configuration
6. **Visualize** - Draw collision shapes, forces, velocity
7. **Profile** - Measure impact of your advanced technique

## Next Steps

- Implement specific advanced pattern for your game
- Profile impact on frame time
- Test edge cases thoroughly
- Read related patterns in `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md`

## References

- [Rapier Joint Documentation](https://rapier.rs/docs/user_guide/using_joints/)
- [Rapier Custom Constraints](https://rapier.rs/docs/api/rapier3d/struct.RevoluteJointBuilder/)
- [Deterministic Physics for Multiplayer](https://gafferongames.com/post/deterministic_lockstep/)

