# Rapier Physics Asset Quality Assurance

Status: Production QA skill for physics-ready 3D assets

This skill document describes QA procedures for validating that 3D assets are ready for physics simulation in Rapier + Three.js games.

## Required Reading

- `<REPO_PATH>/agent_skills/asset_qa/3d_object/SKILL.md` - General 3D asset QA
- `<REPO_PATH>/agent_skills/engine_context/rapier_physics_fundamentals.md` - Physics concepts
- `<REPO_PATH>/agent_skills/engine_context/rapier_api_reference.md` - Physics API

## Asset Physics Requirements

Before importing an asset into a physics-enabled game, verify:

### 1. Collision Shape Suitability

**Requirement**: Asset geometry must match a Rapier collision shape

**Problem**: Asset is a complex convex/concave mesh
```
Example: Ornate vase with handles, intricate details
- Cannot be well-approximated by primitives (box, sphere, capsule)
- Mesh collider would be expensive in physics simulation
```

**Solutions**:
- **Simplification**: Reduce mesh to convex hull approximation
- **Primitive swap**: Use simple shape (sphere) instead of exact model
- **Composite**: Use multiple primitives combined (capsule + spheres for limbs)

**Acceptance Criteria**:
```
✓ Asset can be approximated by:
  - Single primitive (ball, box, capsule, cylinder, cone)
  - Convex hull of geometry
  - Multiple primitives (no more than 4)

✗ Asset requires:
  - Complex triangle mesh with >50 triangles
  - Dynamic mesh deformation
  - Non-convex surfaces as collision
```

### 2. Collision Mesh Quality

**Requirement**: If using mesh collider, geometry must be clean

**Problems to check**:
- **Non-manifold geometry**: Edges with >2 faces, dangling vertices
- **Self-intersecting faces**: Triangles crossing through each other
- **Flipped normals**: Faces pointing inward instead of outward
- **Degenerate triangles**: Zero-area or near-zero-area triangles
- **High vertex count**: Excessive detail in collision shape

**QA Procedure**:

```python
class MeshCollisionQA:
    @staticmethod
    def validate_mesh(asset_id):
        """Validate asset mesh for physics."""
        issues = []
        
        # 1. Check vertex count (reasonable limit)
        if asset['vertex_count'] > 500:
            issues.append(
                f"High vertex count: {asset['vertex_count']} "
                "(recommend <500 for collision)"
            )
        
        # 2. Check for non-manifold geometry
        if asset.get('non_manifold_edges', 0) > 0:
            issues.append(
                f"Non-manifold edges: {asset['non_manifold_edges']} "
                "(clean geometry required)"
            )
        
        # 3. Check for self-intersection
        if asset.get('self_intersecting', False):
            issues.append("Mesh self-intersects (must be corrected)")
        
        # 4. Check for flipped normals
        inward_faces = asset.get('inward_facing_faces', 0)
        if inward_faces > asset['face_count'] * 0.1:  # >10% flipped
            issues.append(
                f"Many flipped normals: {inward_faces} faces "
                "(recalculate normals)"
            )
        
        return issues
```

### 3. Center of Mass

**Requirement**: Asset's center of mass must be reasonable for intended physics body

**Problem**: Asset center is at corner or extreme position
```
Example: Sword with center at tip (not balanced on handle)
Result: Physics simulation makes object feel unnatural
```

**QA Procedure**:

```python
class CenterOfMassQA:
    @staticmethod
    def validate_com(asset_id, expected_location):
        """Validate center of mass for asset."""
        com = calculate_com(asset_id)
        
        # Check that COM is within reasonable bounds
        # (depends on asset type)
        
        if asset['type'] == 'weapon':
            # Sword: COM should be near center, not at tip
            # Guideline: COM in middle 40% of length
            if com['z'] < -0.3 or com['z'] > 0.3:
                return f"COM off-balance: {com} (adjust model)"
        
        elif asset['type'] == 'character':
            # Character: COM should be near center of mass (hips)
            # Guideline: COM in middle 20% of height
            if com['y'] < asset['height'] * 0.4:
                return "COM too low (adjust rig)"
            if com['y'] > asset['height'] * 0.6:
                return "COM too high (adjust rig)"
        
        elif asset['type'] == 'vehicle':
            # Vehicle: COM should be in middle-lower area
            # Guideline: COM in lower half, centered
            if com['y'] > asset['height'] * 0.5:
                return "COM too high (vehicle will tip)"
        
        return None  # OK
```

### 4. Scale Validation

**Requirement**: Asset must be at correct scale for physics

**Problem**: Asset is 100m tall but marked as 2m character
```
Result: Physics simulation has extreme values, becomes unstable
```

**Acceptance Criteria**:
```
✓ Typical game scales:
  - Character: 1.5-2.0 meters tall
  - Door: 2.0-2.5 meters tall
  - Car: 4-5 meters long
  - Sword: 0.8-1.2 meters long
  - Ball: 0.2-0.5 meters diameter

✗ Problem scales:
  - Character >5m or <0.5m
  - Objects with 10x size variation in one model
  - Millimeter-scale details with meter-scale body
```

**QA Procedure**:

```python
class ScaleQA:
    EXPECTED_SCALES = {
        'character': (1.5, 2.0),
        'vehicle': (3, 6),
        'weapon': (0.5, 1.5),
        'prop': (0.1, 10),
        'terrain': (10, 1000),
    }
    
    @staticmethod
    def validate_scale(asset_id, asset_type):
        """Validate asset is at correct scale."""
        asset_height = get_asset_height(asset_id)
        expected_min, expected_max = ScaleQA.EXPECTED_SCALES[asset_type]
        
        if asset_height < expected_min:
            return f"Asset too small: {asset_height}m (expected {expected_min}-{expected_max}m)"
        
        if asset_height > expected_max:
            return f"Asset too large: {asset_height}m (expected {expected_min}-{expected_max}m)"
        
        return None  # OK
```

### 5. Rigidity and Deformation

**Requirement**: Asset must not deform in ways physics can't represent

**Problem**: Asset has cloth, hair, or soft materials
```
Example: Character with loose clothing or flowing cape
Result: Physics system simulates rigid body, clothing looks wrong
```

**Solutions**:
- **Verify rig is rigid**: Check that all vertices are rigidly bound (no cloth simulation)
- **Simplify soft parts**: Model clothing as separate rigid bodies with joints
- **Separate simulation**: Use cloth simulator separate from Rapier

**QA Procedure**:

```python
class RigidityQA:
    @staticmethod
    def validate_rigidity(asset_id):
        """Verify asset is suitable for rigid body physics."""
        issues = []
        
        # Check for skeletal deformation (skinning)
        if asset['has_armature']:
            # Asset is rigged - check skinning quality
            max_bones_per_vertex = asset.get('max_bones_per_vertex', 4)
            if max_bones_per_vertex > 4:
                issues.append(
                    f"Excessive bone influence: {max_bones_per_vertex} "
                    "(may deform unexpectedly)"
                )
        
        # Check for soft-body simulation
        if asset.get('cloth_sim', False):
            issues.append(
                "Asset has cloth simulation enabled "
                "(disable for physics, or use separate cloth solver)"
            )
        
        # Check for vertex animation
        if asset.get('has_vertex_animation', False):
            issues.append(
                "Asset uses vertex animation "
                "(incompatible with rigid-body physics)"
            )
        
        return issues
```

## Asset-Specific QA Checklists

### Checklist: Dynamic Object (Box, Prop, etc.)

```python
def qa_dynamic_object(asset_id):
    """QA for object that will move in physics."""
    
    issues = []
    
    # 1. Collision shape
    shape_issue = MeshCollisionQA.validate_mesh(asset_id)
    if shape_issue:
        issues.extend(shape_issue)
    
    # 2. Center of mass
    com_issue = CenterOfMassQA.validate_com(asset_id, 'geometric')
    if com_issue:
        issues.append(com_issue)
    
    # 3. Scale
    scale_issue = ScaleQA.validate_scale(asset_id, 'prop')
    if scale_issue:
        issues.append(scale_issue)
    
    # 4. Rigidity
    rigidity_issues = RigidityQA.validate_rigidity(asset_id)
    issues.extend(rigidity_issues)
    
    return issues
```

### Checklist: Character (Avatar, Enemy)

```python
def qa_character(asset_id):
    """QA for character avatar."""
    
    issues = []
    
    # 1. Scale (characters are specific size)
    scale_issue = ScaleQA.validate_scale(asset_id, 'character')
    if scale_issue:
        issues.append(scale_issue)
    
    # 2. Center of mass (critical for balance)
    com_issue = CenterOfMassQA.validate_com(asset_id, 'hips')
    if com_issue:
        issues.append(com_issue)
    
    # 3. Rigidity (check rigging)
    rigidity_issues = RigidityQA.validate_rigidity(asset_id)
    issues.extend(rigidity_issues)
    
    # 4. Skeleton check (for ragdoll)
    skeleton = asset.get('skeleton')
    if skeleton:
        # Check that skeleton is suitable for ragdoll physics
        if len(skeleton['bones']) < 10:
            issues.append("Skeleton has too few bones for ragdoll (need at least 10)")
        if len(skeleton['bones']) > 100:
            issues.append("Skeleton has too many bones for ragdoll (performance)")
    
    return issues
```

### Checklist: Vehicle

```python
def qa_vehicle(asset_id):
    """QA for vehicle asset."""
    
    issues = []
    
    # 1. Scale
    scale_issue = ScaleQA.validate_scale(asset_id, 'vehicle')
    if scale_issue:
        issues.append(scale_issue)
    
    # 2. Center of mass (must be low, centered)
    com = calculate_com(asset_id)
    if com['y'] > asset['height'] * 0.5:
        issues.append("COM too high - vehicle will tip over in physics")
    
    # 3. Wheel positioning
    wheels = asset.get('wheels')
    if wheels:
        for wheel in wheels:
            if wheel['offset_y'] > asset['height'] * 0.3:
                issues.append(f"Wheel {wheel['name']} positioned too high")
    
    return issues
```

### Checklist: Weapon

```python
def qa_weapon(asset_id):
    """QA for weapon asset."""
    
    issues = []
    
    # 1. Scale (relative to character)
    scale_issue = ScaleQA.validate_scale(asset_id, 'weapon')
    if scale_issue:
        issues.append(scale_issue)
    
    # 2. Center of mass (should be near grip, not at tip)
    com = calculate_com(asset_id)
    asset_length = asset['length']
    com_relative_position = (com['z'] - asset['min_z']) / asset_length
    
    # For a sword: COM should be in middle 40% of length (0.3-0.7)
    if com_relative_position < 0.3 or com_relative_position > 0.7:
        issues.append(
            f"COM off-balance: {com_relative_position*100}% "
            "(should be 40-60% for sword)"
        )
    
    # 3. Collision shape (weapons should be simple)
    shape_issue = MeshCollisionQA.validate_mesh(asset_id)
    if shape_issue:
        issues.extend(shape_issue)
    
    return issues
```

## Physics Import Procedure

Once asset passes QA:

```python
def import_physics_asset(three_client, asset_id, asset_type):
    """Import asset into physics world."""
    
    # 1. Validate with QA checklist
    qa_function = {
        'dynamic_object': qa_dynamic_object,
        'character': qa_character,
        'vehicle': qa_vehicle,
        'weapon': qa_weapon,
    }[asset_type]
    
    issues = qa_function(asset_id)
    if issues:
        raise ValueError(f"Asset QA failed: {issues}")
    
    # 2. Import asset into game
    three_client.assets.import_asset(
        source=asset_id,
        options={
            'asset_id': asset_id,
            'asset_type': asset_type,
            'physics_enabled': True,
        }
    )
    
    # 3. Configure physics properties
    if asset_type == 'dynamic_object':
        three_client.physics.create_body(
            body_type='dynamic',
            position=(0, 0, 0),
            mass=1.0,
            gravity_scale=1.0
        )
        three_client.physics.create_collider(
            shape='convex_mesh',
            shape_params={'mesh_asset_id': asset_id},
            density=1.0
        )
    
    # 4. Verify in-game
    # Test: spawn, apply force, observe behavior
    
    return True
```

## Common Physics Asset Issues and Fixes

| Issue | Symptom | Solution |
|---|---|---|
| **Non-manifold mesh** | Physics crashes or ignores collision | Repair mesh in Blender: Mesh > Clean Up > Merge by Distance, then recalculate normals |
| **High triangle count** | Physics too slow | Simplify mesh or use primitive shape |
| **Flipped normals** | Object falls through ground | Recalculate normals (Blender: Shift+N) |
| **COM at wrong location** | Object rotates unexpectedly | Adjust model or use offset in physics config |
| **Scale mismatch** | Physics unstable or jittery | Re-export at correct scale (1 unit = 1 meter) |
| **Rigged asset** | Ragdoll limbs don't match visual | Verify bone influence is 1-4 bones per vertex |
| **Soft parts (cloth, hair)** | Cloth moves incorrectly in physics | Model cloth as separate rigid bodies with joints |

## Physics Asset Metadata

Record this information for each physics asset:

```python
PHYSICS_ASSET_METADATA = {
    'asset_id': 'sword_iron_01',
    'asset_type': 'weapon',
    
    # Geometry
    'vertex_count': 1240,
    'triangle_count': 2480,
    'bounding_box': {'x': 0.1, 'y': 0.15, 'z': 1.2},
    'center_of_mass': {'x': 0, 'y': 0, 'z': 0.15},
    
    # Physics
    'collision_shape': 'capsule',
    'collision_params': {'half_height': 0.6, 'radius': 0.05},
    'recommended_mass': 1.5,
    'recommended_friction': 0.3,
    'recommended_restitution': 0.2,
    
    # QA
    'qa_passed': True,
    'qa_date': '2026-08-25',
    'qa_notes': 'COM verified at balance point',
    'physics_ready': True,
}
```

## QA Report Template

```
PHYSICS ASSET QA REPORT
=====================

Asset: [asset_id]
Type: [asset_type]
Date: [date]
QA Tester: [name/agent]

GEOMETRY CHECKS
- Vertex count: [count] ✓/✗
- Triangle count: [count] ✓/✗
- Non-manifold edges: [count] ✓/✗
- Self-intersecting: [yes/no] ✓/✗
- Flipped normals: [percentage]% ✓/✗

PHYSICS CHECKS
- Scale appropriate: ✓/✗
- Center of mass reasonable: ✓/✗
- Collision shape suitable: ✓/✗
- Rigidity verified: ✓/✗

OVERALL STATUS
- Passes physics QA: ✓/✗
- Ready for import: ✓/✗

ISSUES FOUND
[List any issues and recommended fixes]

SIGN-OFF
QA approved for production: [yes/no]
```

## Integration with Game Generation

When agents generate games that use physics:

1. **Asset selection**: Agent picks physics-ready assets from registry
2. **Validation**: Agent verifies asset has physics metadata
3. **QA check**: Agent re-validates before import
4. **Configuration**: Agent sets physics properties based on metadata
5. **Testing**: Agent spawns asset and verifies behavior

## Next Steps

- Run QA on all physics assets before gameplay generation
- Document results in asset metadata
- Profile in-game physics performance after asset import
- If performance issues, review asset simplification

## References

- `<REPO_PATH>/agent_skills/asset_qa/3d_object/SKILL.md` - General 3D asset QA
- `<REPO_PATH>/agent_skills/asset_qa/3d_object/orientation_review.md` - Asset orientation (also applies to physics)
- Blender documentation on mesh repair and optimization

