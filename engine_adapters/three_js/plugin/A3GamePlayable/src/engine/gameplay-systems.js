import * as THREE from 'three';

const DEFAULT_CONTROLLER_PROFILE = Object.freeze({
  walkSpeed: 4.5,
  runSpeed: 8.5,
  jumpImpulse: 6.4,
  gravity: -18,
  maxFallSpeed: -42,
  eyeHeight: 1.7,
  turnResponse: 12,
});

export const A3GameElement = Object.freeze({
  ARCANE: 'arcane',
  FIRE: 'fire',
  WATER: 'water',
  AIR: 'air',
  EARTH: 'earth',
  LIGHTNING: 'lightning',
});

const DEFAULT_LINEAR_SPELL = Object.freeze({
  speed: 24,
  range: 40,
  radius: 0.2,
  damage: 20,
  lifetimeSeconds: 3,
  pierce: 0,
  element: A3GameElement.ARCANE,
  resourceCost: Object.freeze({ mana: 0, stamina: 0, focus: 0, elementalCharge: 0 }),
});

const DEFAULT_ELEMENTAL_BENDING = Object.freeze({
  ...DEFAULT_LINEAR_SPELL,
  bendStrength: 1,
  maxTurnRateRadians: Math.PI * 1.5,
  resourceCost: Object.freeze({ mana: 4, focus: 2, elementalCharge: 3, stamina: 0 }),
});

const ELEMENTAL_MODIFIERS = Object.freeze({
  [A3GameElement.ARCANE]: { speed: 1, range: 1, bend: 1 },
  [A3GameElement.FIRE]: { speed: 1.08, range: 0.95, bend: 0.82 },
  [A3GameElement.WATER]: { speed: 0.92, range: 1.05, bend: 1.3 },
  [A3GameElement.AIR]: { speed: 1.18, range: 1.12, bend: 1.08 },
  [A3GameElement.EARTH]: { speed: 0.8, range: 1.18, bend: 0.58 },
  [A3GameElement.LIGHTNING]: { speed: 1.35, range: 0.9, bend: 0.72 },
});

function finiteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asVector3(value, fallback = new THREE.Vector3()) {
  if (value instanceof THREE.Vector3) return value.clone();
  if (!value || typeof value !== 'object') return fallback.clone();
  return new THREE.Vector3(
    finiteNumber(value.x, fallback.x),
    finiteNumber(value.y, fallback.y),
    finiteNumber(value.z, fallback.z),
  );
}

function directionVector(value, fallback = new THREE.Vector3(0, 0, -1)) {
  const out = asVector3(value, fallback);
  if (out.lengthSq() < 1e-8) return fallback.clone().normalize();
  return out.normalize();
}

function normalizeAngle(radians) {
  let angle = finiteNumber(radians, 0);
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function turnDirectionTowards(current, target, maxRadians) {
  const start = directionVector(current);
  const goal = directionVector(target, start);
  const limit = Math.max(0, finiteNumber(maxRadians, 0));
  const angle = start.angleTo(goal);
  if (angle <= 1e-6 || limit <= 0) return start;
  if (angle <= limit) return goal;
  const axis = new THREE.Vector3().crossVectors(start, goal);
  if (axis.lengthSq() < 1e-8) return start;
  axis.normalize();
  const delta = new THREE.Quaternion().setFromAxisAngle(axis, limit);
  return start.applyQuaternion(delta).normalize();
}

function cloneResourceCost(cost) {
  const source = cost && typeof cost === 'object' ? cost : {};
  return {
    mana: Math.max(0, finiteNumber(source.mana, 0)),
    stamina: Math.max(0, finiteNumber(source.stamina, 0)),
    focus: Math.max(0, finiteNumber(source.focus, 0)),
    elementalCharge: Math.max(0, finiteNumber(source.elementalCharge, 0)),
  };
}

export class A3GameCombatResourceState {
  constructor(options = {}) {
    const source = options?.resources ?? options ?? {};
    const keys = ['mana', 'stamina', 'focus', 'elementalCharge'];
    this.resources = {};
    for (const key of keys) {
      const profile = source[key] && typeof source[key] === 'object' ? source[key] : {};
      const max = Math.max(0, finiteNumber(profile.max, 100));
      const current = Math.max(0, Math.min(max, finiteNumber(profile.current, max)));
      this.resources[key] = {
        max,
        current,
        regenPerSecond: Math.max(0, finiteNumber(profile.regenPerSecond, 0)),
      };
    }
  }

  _forEachResource(callback) {
    for (const key of Object.keys(this.resources)) {
      const resource = this.resources[key];
      callback(key, resource);
    }
  }

  tick(deltaSeconds) {
    const dt = Math.max(0, finiteNumber(deltaSeconds, 0));
    this._forEachResource((key, resource) => {
      if (resource.regenPerSecond <= 0) return;
      resource.current = Math.min(
        resource.max,
        resource.current + resource.regenPerSecond * dt,
      );
    });
    return this.snapshot();
  }

  snapshot() {
    const out = {};
    this._forEachResource((key, resource) => {
      out[key] = {
        max: resource.max,
        current: resource.current,
        ratio: resource.max > 0 ? resource.current / resource.max : 0,
      };
    });
    return out;
  }

  hasEnough(cost = {}) {
    const required = cloneResourceCost(cost);
    for (const [key, value] of Object.entries(required)) {
      if (value <= 0) continue;
      const resource = this.resources[key];
      if (!resource || resource.current < value) return false;
    }
    return true;
  }

  spend(cost = {}) {
    const required = cloneResourceCost(cost);
    if (!this.hasEnough(required)) return false;
    for (const [key, value] of Object.entries(required)) {
      if (value <= 0) continue;
      this.resources[key].current -= value;
    }
    return true;
  }

  restore(cost = {}) {
    const restored = cloneResourceCost(cost);
    for (const [key, value] of Object.entries(restored)) {
      if (value <= 0) continue;
      const resource = this.resources[key];
      if (!resource) continue;
      resource.current = Math.min(resource.max, resource.current + value);
    }
    return this.snapshot();
  }
}

export class A3GameThirdPersonController {
  /**
   * @param {{collision?: object, terrainHeight?: (x: number, z: number) => number,
   *          profile?: object}} [options]
   */
  constructor(options = {}) {
    this.collision = options.collision ?? null;
    this.terrainHeight = options.terrainHeight ?? null;
    this.profile = { ...DEFAULT_CONTROLLER_PROFILE, ...(options.profile ?? {}) };
  }

  /**
   * @param {{position?: THREE.Vector3 | {x?: number, y?: number, z?: number},
   *          facing?: number, cameraYaw?: number}} [options]
   */
  createState(options = {}) {
    return {
      motion: {
        position: asVector3(options.position, new THREE.Vector3()),
        velocityY: 0,
        grounded: true,
      },
      desired: new THREE.Vector3(),
      pendingJump: false,
      running: false,
      facing: finiteNumber(options.facing, 0),
      cameraYaw: finiteNumber(options.cameraYaw, 0),
    };
  }

  /**
   * @param {ReturnType<A3GameThirdPersonController['createState']>} state
   * @param {{moveX?: number, moveY?: number, run?: boolean, jump?: boolean,
   *          yaw?: number}} inputState
   */
  applyInput(state, inputState) {
    if (!state?.motion || !state?.desired) {
      throw new TypeError('applyInput requires a controller state from createState()');
    }
    const cameraYaw = finiteNumber(inputState?.yaw, state.cameraYaw);
    state.cameraYaw = cameraYaw;
    const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    state.desired
      .copy(forward)
      .multiplyScalar(finiteNumber(inputState?.moveY, 0))
      .addScaledVector(right, finiteNumber(inputState?.moveX, 0));
    if (state.desired.lengthSq() > 1) state.desired.normalize();
    state.running = Boolean(inputState?.run);
    const speed = state.running ? this.profile.runSpeed : this.profile.walkSpeed;
    state.desired.multiplyScalar(speed);
    if (inputState?.jump) state.pendingJump = true;
  }

  /**
   * @param {ReturnType<A3GameThirdPersonController['createState']>} state
   * @param {number} deltaSeconds
   */
  step(state, deltaSeconds) {
    if (!state?.motion || !state?.desired) {
      throw new TypeError('step requires a controller state from createState()');
    }
    const dt = Math.max(0, finiteNumber(deltaSeconds, 0));
    const displacement = state.desired.clone().multiplyScalar(dt);
    if (this.collision) {
      this.collision.stepCharacter(state.motion, displacement, dt, {
        height: this.profile.eyeHeight,
        jump: state.pendingJump,
        jumpImpulse: this.profile.jumpImpulse,
      });
    } else {
      state.motion.position.add(displacement);
      if (state.pendingJump && state.motion.grounded) {
        state.motion.velocityY = this.profile.jumpImpulse;
        state.motion.grounded = false;
      }
      state.motion.velocityY = Math.max(
        this.profile.maxFallSpeed,
        state.motion.velocityY + this.profile.gravity * dt,
      );
      state.motion.position.y += state.motion.velocityY * dt;
      if (this.terrainHeight) {
        const floor = finiteNumber(
          this.terrainHeight(state.motion.position.x, state.motion.position.z),
          state.motion.position.y,
        );
        if (state.motion.position.y <= floor) {
          state.motion.position.y = floor;
          state.motion.velocityY = 0;
          state.motion.grounded = true;
        }
      }
    }
    state.pendingJump = false;
    if (state.desired.lengthSq() > 0.0001) {
      const target = Math.atan2(-state.desired.x, -state.desired.z);
      const delta = normalizeAngle(target - state.facing);
      state.facing = normalizeAngle(
        state.facing + delta * Math.min(1, dt * this.profile.turnResponse),
      );
    }
    return state.motion;
  }
}

export class A3GameLinearSpellCaster {
  /**
   * @param {{collision?: object, defaultSpell?: object, combatResources?: object}} [options]
   */
  constructor(options = {}) {
    this.collision = options.collision ?? null;
    this.combatResources = options.combatResources ?? options.resources ?? null;
    this.defaultSpell = { ...DEFAULT_LINEAR_SPELL, ...(options.defaultSpell ?? {}) };
    this.projectiles = new Map();
    this.nextProjectileId = 1;
    /** @type {Set<(event: object) => void>} */
    this.listeners = new Set();
  }

  /** @param {(event: object) => void} listener */
  onEvent(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('onEvent requires a function');
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * @param {{origin: THREE.Vector3 | object, direction: THREE.Vector3 | object,
   *          speed?: number, range?: number, radius?: number, damage?: number,
   *          lifetimeSeconds?: number, pierce?: number, element?: string,
   *          owner?: THREE.Object3D, metadata?: object}} spell
   */
  cast(spell) {
    const profile = this._composeSpellProfile(spell);
    const cost = cloneResourceCost(profile.resourceCost ?? {});
    const canSpendResources =
      this.combatResources &&
      typeof this.combatResources.hasEnough === 'function' &&
      typeof this.combatResources.spend === 'function';
    if (canSpendResources && !this.combatResources.hasEnough(cost)) {
      this._emit({
        type: 'spell_blocked',
        reason: 'resources',
        cost,
        element: profile.element,
        metadata: spell?.metadata ?? {},
      });
      return null;
    }
    if (canSpendResources) {
      const spent = this.combatResources.spend(cost);
      if (!spent) {
        this._emit({
          type: 'spell_blocked',
          reason: 'resources',
          cost,
          element: profile.element,
          metadata: spell?.metadata ?? {},
        });
        return null;
      }
    }
    const projectileId = `spell_${this.nextProjectileId++}`;
    const projectile = this._buildProjectile(projectileId, profile, spell);
    this.projectiles.set(projectileId, projectile);
    this._emit({ type: 'spell_cast', projectileId, projectile });
    return projectile;
  }

  /**
   * @param {number} deltaSeconds
   * @returns {number} active projectile count
   */
  tick(deltaSeconds) {
    const dt = Math.max(0, finiteNumber(deltaSeconds, 0));
    for (const projectile of this.projectiles.values()) {
      if (!projectile.active) continue;
      this._updateProjectile(projectile, dt);
    }
    return this.countActive();
  }

  countActive() {
    let active = 0;
    for (const projectile of this.projectiles.values()) {
      if (projectile.active) active += 1;
    }
    return active;
  }

  _composeSpellProfile(spell = {}) {
    const merged = { ...this.defaultSpell, ...(spell ?? {}) };
    return {
      speed: Math.max(0.01, finiteNumber(merged.speed, DEFAULT_LINEAR_SPELL.speed)),
      range: Math.max(0.01, finiteNumber(merged.range, DEFAULT_LINEAR_SPELL.range)),
      radius: Math.max(0, finiteNumber(merged.radius, DEFAULT_LINEAR_SPELL.radius)),
      damage: Math.max(0, finiteNumber(merged.damage, DEFAULT_LINEAR_SPELL.damage)),
      lifetimeSeconds: Math.max(
        0.01,
        finiteNumber(merged.lifetimeSeconds, DEFAULT_LINEAR_SPELL.lifetimeSeconds),
      ),
      pierce: Math.max(0, Math.floor(finiteNumber(merged.pierce, DEFAULT_LINEAR_SPELL.pierce))),
      element: String(merged.element ?? DEFAULT_LINEAR_SPELL.element),
      resourceCost: cloneResourceCost(merged.resourceCost ?? DEFAULT_LINEAR_SPELL.resourceCost),
    };
  }

  _buildProjectile(projectileId, profile, spell) {
    const origin = asVector3(spell?.origin, new THREE.Vector3());
    const direction = directionVector(spell?.direction, new THREE.Vector3(0, 0, -1));
    return {
      projectileId,
      active: true,
      position: origin.clone(),
      previous: origin.clone(),
      velocity: direction.multiplyScalar(profile.speed),
      travelled: 0,
      age: 0,
      hits: 0,
      profile,
      owner: spell?.owner ?? null,
      metadata: spell?.metadata ?? {},
    };
  }

  _updateProjectile(projectile, deltaSeconds) {
    if (!projectile.active || deltaSeconds <= 0) return;
    projectile.age += deltaSeconds;
    projectile.previous.copy(projectile.position);
    projectile.position.addScaledVector(projectile.velocity, deltaSeconds);
    const travelledStep = projectile.previous.distanceTo(projectile.position);
    projectile.travelled += travelledStep;

    if (this.collision) {
      const hit = this.collision.sweepSphere(
        projectile.previous,
        projectile.position,
        {
          radius: projectile.profile.radius,
          ignore: projectile.owner ? [projectile.owner] : [],
        },
      );
      if (hit.hit) {
        projectile.position.copy(hit.point ?? projectile.position);
        projectile.hits += 1;
        this._emit({
          type: 'spell_hit',
          projectileId: projectile.projectileId,
          element: projectile.profile.element,
          point: hit.point?.clone() ?? null,
          normal: hit.normal?.clone() ?? null,
          distance: hit.distance,
          entityId: hit.entityId,
          object: hit.object,
          damage: projectile.profile.damage,
          metadata: projectile.metadata,
        });
        if (projectile.hits > projectile.profile.pierce) {
          this._expireProjectile(projectile, 'impact');
          return;
        }
      }
    }

    if (projectile.travelled >= projectile.profile.range) {
      this._expireProjectile(projectile, 'range');
      return;
    }
    if (projectile.age >= projectile.profile.lifetimeSeconds) {
      this._expireProjectile(projectile, 'lifetime');
    }
  }

  _expireProjectile(projectile, reason) {
    if (!projectile.active) return;
    projectile.active = false;
    this._emit({
      type: 'spell_expired',
      projectileId: projectile.projectileId,
      reason: String(reason),
      position: projectile.position.clone(),
      element: projectile.profile.element,
      metadata: projectile.metadata,
    });
  }

  _emit(event) {
    for (const listener of this.listeners) listener(event);
  }
}

export class A3GameElementalBendingCaster extends A3GameLinearSpellCaster {
  /**
   * @param {{collision?: object, defaultSpell?: object}} [options]
   */
  constructor(options = {}) {
    super({
      ...options,
      defaultSpell: {
        ...DEFAULT_ELEMENTAL_BENDING,
        ...(options.defaultSpell ?? {}),
      },
    });
  }

  _composeSpellProfile(spell = {}) {
    const composed = super._composeSpellProfile(spell);
    const modifier = ELEMENTAL_MODIFIERS[composed.element] ?? ELEMENTAL_MODIFIERS.arcane;
    const elementCost = {
      mana: Math.max(0, finiteNumber(spell?.resourceCost?.mana, 4)),
      stamina: Math.max(0, finiteNumber(spell?.resourceCost?.stamina, 0)),
      focus: Math.max(0, finiteNumber(spell?.resourceCost?.focus, 2)),
      elementalCharge: Math.max(
        0,
        finiteNumber(spell?.resourceCost?.elementalCharge, 3),
      ),
    };
    return {
      ...composed,
      speed: composed.speed * modifier.speed,
      range: composed.range * modifier.range,
      resourceCost: cloneResourceCost({
        ...composed.resourceCost,
        ...elementCost,
      }),
      bendStrength: Math.max(
        0,
        finiteNumber(spell?.bendStrength, DEFAULT_ELEMENTAL_BENDING.bendStrength) *
          modifier.bend,
      ),
      maxTurnRateRadians: Math.max(
        0.01,
        finiteNumber(
          spell?.maxTurnRateRadians,
          DEFAULT_ELEMENTAL_BENDING.maxTurnRateRadians,
        ),
      ),
    };
  }

  _buildProjectile(projectileId, profile, spell) {
    const projectile = super._buildProjectile(projectileId, profile, spell);
    projectile.targetDirection = directionVector(
      spell?.targetDirection ?? spell?.direction,
      new THREE.Vector3(0, 0, -1),
    );
    return projectile;
  }

  _updateProjectile(projectile, deltaSeconds) {
    const currentDirection = directionVector(projectile.velocity);
    const targetDirection = directionVector(projectile.targetDirection, currentDirection);
    const turnLimit =
      projectile.profile.maxTurnRateRadians *
      projectile.profile.bendStrength *
      deltaSeconds;
    const turned = turnDirectionTowards(
      currentDirection,
      targetDirection,
      turnLimit,
    );
    projectile.velocity.copy(turned).multiplyScalar(projectile.profile.speed);
    super._updateProjectile(projectile, deltaSeconds);
  }
}
