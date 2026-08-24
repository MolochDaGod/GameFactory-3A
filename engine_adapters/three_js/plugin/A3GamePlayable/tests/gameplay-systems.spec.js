import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  A3GameCombatResourceState,
  A3GameElement,
  A3GameElementalBendingCaster,
  A3GameLinearSpellCaster,
  A3GameThirdPersonController,
} from '@a3game/playable';

describe('A3GameThirdPersonController', () => {
  it('moves camera-relative and turns toward movement', () => {
    const controller = new A3GameThirdPersonController({
      terrainHeight: () => 0,
      profile: { walkSpeed: 5, turnResponse: 20 },
    });
    const state = controller.createState();
    controller.applyInput(state, { moveY: 1, yaw: Math.PI / 2 });
    controller.step(state, 0.2);
    expect(state.motion.position.x).toBeCloseTo(-1, 3);
    expect(state.motion.position.z).toBeCloseTo(0, 3);
    expect(state.facing).toBeCloseTo(Math.PI / 2, 2);
  });
});

describe('A3GameCombatResourceState', () => {
  it('spends and restores combat resources with affordability checks', () => {
    const resources = new A3GameCombatResourceState({
      mana: { max: 10, current: 10 },
      focus: { max: 8, current: 8 },
      elementalCharge: { max: 6, current: 6 },
    });
    expect(resources.hasEnough({ mana: 3, focus: 2 })).toBe(true);
    expect(resources.spend({ mana: 3, focus: 2 })).toBe(true);
    expect(resources.snapshot().mana.current).toBe(7);
    expect(resources.snapshot().focus.current).toBe(6);
    expect(resources.hasEnough({ mana: 8 })).toBe(false);
  });
});

describe('A3GameLinearSpellCaster', () => {
  it('emits hit and expiry events when a projectile collides', () => {
    const collision = {
      sweepSphere(from, to) {
        if (from.z > -4 && to.z <= -4) {
          return {
            hit: true,
            point: new THREE.Vector3(0, 0, -4),
            normal: new THREE.Vector3(0, 0, 1),
            object: new THREE.Object3D(),
            distance: 4,
            entityId: 'target_01',
          };
        }
        return {
          hit: false,
          point: null,
          normal: null,
          object: null,
          distance: Infinity,
          entityId: '',
        };
      },
    };
    const resources = new A3GameCombatResourceState({
      mana: { max: 25, current: 25 },
    });
    const caster = new A3GameLinearSpellCaster({
      collision,
      combatResources: resources,
      defaultSpell: { speed: 10, range: 50, lifetimeSeconds: 5, resourceCost: { mana: 5 } },
    });
    const events = [];
    caster.onEvent((event) => events.push(event.type));
    caster.cast({
      origin: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, -1),
      damage: 33,
    });
    caster.tick(0.5);
    expect(events).toContain('spell_hit');
    expect(events).toContain('spell_expired');
    expect(caster.countActive()).toBe(0);
    expect(resources.snapshot().mana.current).toBe(20);
  });

  it('blocks casting when the combat resource budget is insufficient', () => {
    const resources = new A3GameCombatResourceState({
      mana: { max: 3, current: 3 },
    });
    const caster = new A3GameLinearSpellCaster({
      combatResources: resources,
      defaultSpell: { resourceCost: { mana: 5 } },
    });
    const events = [];
    caster.onEvent((event) => events.push(event.type));
    const projectile = caster.cast({
      origin: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, -1),
    });
    expect(projectile).toBeNull();
    expect(events).toContain('spell_blocked');
    expect(resources.snapshot().mana.current).toBe(3);
  });
});

describe('A3GameElementalBendingCaster', () => {
  it('bends projectile direction toward the target direction', () => {
    const resources = new A3GameCombatResourceState({
      mana: { max: 25, current: 25 },
      focus: { max: 25, current: 25 },
      elementalCharge: { max: 25, current: 25 },
    });
    const caster = new A3GameElementalBendingCaster({
      combatResources: resources,
      defaultSpell: { speed: 12, range: 200, lifetimeSeconds: 8 },
    });
    const projectile = caster.cast({
      element: A3GameElement.WATER,
      origin: new THREE.Vector3(0, 0, 0),
      direction: new THREE.Vector3(0, 0, -1),
      targetDirection: new THREE.Vector3(1, 0, 0),
      bendStrength: 2,
      maxTurnRateRadians: Math.PI,
      resourceCost: { mana: 4, focus: 2, elementalCharge: 3 },
    });
    caster.tick(0.25);
    expect(projectile).not.toBeNull();
    expect(projectile.velocity.x).toBeGreaterThan(0.1);
    expect(Math.abs(projectile.velocity.z)).toBeLessThan(0.05);
    expect(resources.snapshot().mana.current).toBe(21);
  });
});
