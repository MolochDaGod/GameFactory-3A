# Rapier Physics for Three.js: Complete Guide and Routing

Status: Master index for Rapier physics integration in Grudge Studio game development

This document routes you to the correct Rapier documentation based on your task and experience level.

## Quick Navigation

### "I want to learn Rapier physics"
→ Start here: `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md`

### "I want to build a game mechanic with physics"
→ Start here: `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md`

### "I want to integrate Rapier with my Three.js game"
→ Start here: `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md`

### "I need to optimize physics performance"
→ Start here: `<REPO_PATH>/agent_skills/engine_context/rapier_performance_guide.md`

### "I need the complete API reference"
→ Start here: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md`

### "I want to do something advanced (networked physics, soft bodies, etc)"
→ Start here: `<REPO_PATH>/agent_skills/engine_context/rapier_advanced_techniques.md`

## Learning Path by Experience Level

### Beginner (New to Rapier)

**Goal**: Understand core physics concepts and build a simple game

1. Read **Physics Fundamentals** (30 min)
   - `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md`
   - Learn: worlds, bodies, colliders, forces, simulation loop

2. Read **Three.js Integration - Quick Start** (20 min)
   - `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md` (sections 1-3)
   - Learn: setup, architecture, basic examples

3. Implement **Simple Game Mechanic** (60 min)
   - `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md` (Pattern 1-2)
   - Build: character movement, jumping

4. Read **Performance Basics** (20 min)
   - `<REPO_PATH>/agent_skills/engine_context/rapier_performance_guide.md` (strategies 1-2)
   - Learn: collision groups, basic optimization

**Total time**: ~2.5 hours to build your first physics game

### Intermediate (Comfortable with Rapier)

**Goal**: Build sophisticated game mechanics with multiple physics patterns

1. Review **Integration Patterns** (30 min)
   - `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md` (all sections)
   - Learn: entity systems, character controllers, ragdolls, vehicles

2. Study **Gameplay Patterns** (60 min)
   - `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md` (all patterns)
   - Implement: 3-4 patterns for your game

3. Optimize **Performance** (45 min)
   - `<REPO_PATH>/agent_skills/engine_context/rapier_performance_guide.md` (all strategies)
   - Profile and optimize your game

4. Reference **API** as needed
   - `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md`
   - Look up specific operations

**Total time**: ~3 hours to advanced gameplay level

### Advanced (Shipping production game)

**Goal**: Master all Rapier capabilities for production game

1. Complete all beginner and intermediate paths

2. Deep dive **Advanced Techniques** (90 min)
   - `<REPO_PATH>/agent_skills/engine_context/rapier_advanced_techniques.md`
   - Learn: motors, networked physics, soft bodies, debugging

3. Study **Performance Deep Dive** (60 min)
   - `<REPO_PATH>/agent_skills/engine_context/rapier_performance_guide.md` (profiling section)
   - Profile on target platform (desktop, mobile)

4. Implement platform-specific optimization

5. Write diagnostics and validation code
   - See: Advanced Techniques section on debugging

**Total time**: ~4 hours to production readiness

## Document Quick Reference

### Core Concepts (Read First)

| Document | Purpose | Time |
|---|---|---|
| `rapier_physics_fundamentals.md` | Core physics concepts (world, bodies, colliders, forces, joints) | 30 min |
| `rapier_threejs_integration.md` | How to integrate with Three.js (separation of physics/render, entity systems) | 30 min |

### Gameplay Implementation

| Document | Purpose | Time |
|---|---|---|
| `rapier_gameplay_patterns.md` | Common game mechanics (character, projectile, vehicle, ragdoll) | 60 min |
| `rapier_api_reference.md` | Detailed API for all physics operations | as needed |

### Optimization and Production

| Document | Purpose | Time |
|---|---|---|
| `rapier_performance_guide.md` | Performance tuning, profiling, platform optimization | 45 min |
| `rapier_advanced_techniques.md` | Advanced patterns (motors, networking, soft bodies) | 60 min |

## Task-Based Routing

### Task: Build a game with physics

**Step 1**: Define requirements
- What moves? (character, objects, vehicles)
- What collides? (terrain, enemies, projectiles)
- What's the target platform? (desktop/mobile)

**Step 2**: Select appropriate pattern
- `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md`
- Find patterns matching your requirements

**Step 3**: Understand physics concepts
- `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md`
- Read sections relevant to your patterns

**Step 4**: Integrate with Three.js
- `<REPO_PATH>/agent_skills/engine_context/rapier_threejs_integration.md`
- Use entity system or custom pattern

**Step 5**: Implement game mechanics
- `<REPO_PATH>/agent_skills/code_gen/mechanic/rapier_gameplay_patterns.md`
- Code each pattern

**Step 6**: Optimize
- `<REPO_PATH>/agent_skills/engine_context/rapier_performance_guide.md`
- Profile and tune

### Task: Optimize slow physics

**Step 1**: Profile
- Run game, measure physics time (see performance guide)
- Identify bottleneck (broad phase vs narrow phase vs solver)

**Step 2**: Apply optimization in order
1. Add collision groups (biggest impact)
2. Simplify colliders
3. Reduce body count
4. Adjust timestep
5. Consider multi-world approach

See: `<REPO_PATH>/agent_skills/engine_context/rapier_performance_guide.md` - Strategy 1-5

### Task: Add advanced feature (motors, networking, soft body)

**Step 1**: Find in advanced guide
- `<REPO_PATH>/agent_skills/engine_context/rapier_advanced_techniques.md`

**Step 2**: Understand concept
- Read the "Advanced Topic X" section for your feature

**Step 3**: Verify performance impact
- Check performance tips table in same section
- Profile before and after

**Task**: Debug physics issue (unstable, objects falling through ground, etc.)

See: `<REPO_PATH>/agent_skills/engine_context/rapier_advanced_techniques.md`
Section: "Physics Debugging and Introspection"

## API Quick Reference by Operation Type

### Creating Physics Objects
- Create world: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - World Operations
- Create body: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Rigid Body Operations
- Create collider: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Collider Operations
- Create joint: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Joint/Constraint Operations

### Querying Physics State
- Get body state: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Get Body State
- Raycast: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Query Operations
- Shape cast: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Query Operations
- Region query: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Query Operations

### Applying Physics
- Apply force: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Apply Body Force
- Apply impulse: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Apply Body Impulse
- Set velocity: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Set Body Velocity

### Events and Debugging
- Collision events: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Collision Event Operations
- World info: `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Get World Info
- Validation: `<REPO_PATH>/agent_skills/engine_context/rapier_advanced_techniques.md` - Physics State Validation

## Pattern Selection Decision Tree

```
What do you want to build?

├─ Character movement
│  └─ Read: Gameplay Patterns, Pattern 1 (Character Movement)
│     Concepts: Kinematic bodies, raycasting for ground, gravity
│
├─ Projectiles / Thrown objects
│  └─ Read: Gameplay Patterns, Pattern 4 (Projectiles)
│     Concepts: Dynamic bodies, impulse on creation, collision detection
│
├─ Vehicles
│  └─ Read: Gameplay Patterns, Pattern 6 (Vehicle)
│     Concepts: Dynamic body, steering, forces/torque
│
├─ Ragdoll / Character death
│  └─ Read: Gameplay Patterns, Pattern 5 (Ragdoll)
│     Concepts: Multiple bodies, joints connecting limbs
│
├─ Pushable objects
│  └─ Read: Gameplay Patterns, Pattern 3 (Pushable Objects)
│     Concepts: Dynamic bodies, collision response, impulse application
│
├─ Physics-based door / hinge
│  └─ Read: Gameplay Patterns, Pattern 7 (Compound Shapes)
│     Concepts: Static base + dynamic lid + revolute joint
│
├─ Performance optimization
│  └─ Read: Performance Guide, Strategies 1-3
│     Concepts: Collision groups, kinematic bodies, simplification
│
└─ Advanced (motors, networking, soft bodies)
   └─ Read: Advanced Techniques
      Choose section based on feature
```

## Skill Development Path

### Skill 1: Character Control
**Prerequisites**: Fundamentals, Integration
**Time**: 1-2 hours
**Outcome**: Working player character with movement and jumping
**Apply**: Gameplay Patterns - Pattern 1

### Skill 2: Physics-Based Gameplay
**Prerequisites**: Character Control
**Time**: 3-4 hours
**Outcome**: Game with multiple physics-based interactions
**Apply**: Gameplay Patterns - Patterns 2-4

### Skill 3: Performance Optimization
**Prerequisites**: Physics-Based Gameplay
**Time**: 2-3 hours
**Outcome**: Game running at target FPS on target platform
**Apply**: Performance Guide - Strategies 1-5

### Skill 4: Advanced Mechanics
**Prerequisites**: All above
**Time**: 4-5 hours per feature
**Outcome**: Specialized physics behavior (motors, networking, etc.)
**Apply**: Advanced Techniques - Specific topic

## Common Questions Answered

**Q: Which physics concepts do I need to know?**
A: Start with Fundamentals. You need to understand: worlds, bodies, colliders, forces, joints. That's 80% of what you'll use.

**Q: What's the hardest part?**
A: Keeping physics and rendering separate. Read the Architecture section of Integration carefully.

**Q: How do I debug physics?**
A: Profile first (see Performance Guide). Then check: collision groups, body count, timestep, collider shapes.

**Q: Is Rapier good for mobile?**
A: Yes, if optimized. Use kinematic bodies for NPCs, reduce body count, simplify shapes. See Performance Guide - Mobile section.

**Q: Can I have multiple physics worlds?**
A: Yes. See Advanced Techniques - Multi-World Pattern. Useful for large games.

**Q: How do I sync physics over network?**
A: Use fixed timestep and deterministic input. See Advanced Techniques - Networked Physics topic.

## File Size and Learning Time Summary

| Document | Size | Read Time | Skill Building |
|---|---|---|---|
| rapier_physics_fundamentals.md | 11KB | 30 min | Concepts |
| rapier_threejs_integration.md | 16KB | 30 min | Architecture |
| rapier_gameplay_patterns.md | 26KB | 60 min | Patterns |
| rapier_api_reference.md | 16KB | as needed | Reference |
| rapier_performance_guide.md | 15KB | 45 min | Optimization |
| rapier_advanced_techniques.md | 19KB | 60 min | Advanced |
| **Total** | **~93KB** | **~4 hours** | **Professional** |

## Next Steps

1. **Identify your task** - What game feature do you want to build?
2. **Find the right document** - Use routing above
3. **Read and understand** - Don't skip sections
4. **Implement** - Start simple, expand gradually
5. **Profile and optimize** - Always measure before and after
6. **Reference API** as needed - `rapier_api_reference.md`

## Support Resources

For questions beyond this guide:
- [Official Rapier Documentation](https://rapier.rs/)
- [Rapier Discord Community](https://discord.gg/rapier-physics)
- Three.js Documentation: https://threejs.org/docs/
- See examples in `<REPO_PATH>/engine_adapters/three_js/examples/`

---

**Last Updated**: 2026-08-25
**Status**: Complete and tested
**Recommended for**: Grudge Studio game development with Three.js + Rapier physics
