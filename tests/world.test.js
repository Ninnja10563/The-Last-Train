import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEnvironment } from '../src/world/environment.js';

const context = new Proxy(
  {},
  {
    get(target, key) {
      return target[key] ?? (() => {});
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  },
);
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
const scene = new THREE.Scene();
const world = createEnvironment(scene);

test('entire train has a clear two-way center aisle', () => {
  for (let z = -20; z <= 48; z += 0.2) {
    const player = new THREE.Box3(
      new THREE.Vector3(-0.2, 0.05, z - 0.2),
      new THREE.Vector3(0.2, 1.8, z + 0.2),
    );
    for (const obstacle of world.colliders)
      assert.ok(!player.intersectsBox(obstacle), `Aisle obstructed near z=${z}`);
  }
});

test('all eight canonical clues are reachable from the aisle', () => {
  assert.deepEqual(world.interactables.map((object) => object.userData.id).sort(), [
    'glass',
    'key',
    'ledger',
    'letter',
    'note',
    'photograph',
    'ticket',
    'watch',
  ]);
  for (const object of world.interactables) {
    const position = object.getWorldPosition(new THREE.Vector3());
    assert.ok(
      Math.hypot(position.x, position.y - 1.68) <= 2.6,
      `Unreachable clue: ${object.userData.id}`,
    );
    assert.ok(position.z >= -20 && position.z <= 48);
    assert.ok(object.children.length > 1, 'Each clue has actual 3D geometry');
  }
});

test('all generated vertices and transforms are finite', () => {
  scene.traverse((object) => {
    assert.ok(object.position.toArray().every(Number.isFinite));
    if (!object.geometry) return;
    assert.ok(
      Array.from(object.geometry.attributes.position.array).every(Number.isFinite),
      `Invalid geometry in ${object.name}`,
    );
  });
  for (const time of [0, 35.6, 95, 110, 200000]) world.update(time, 0.016);
});

test('static batching preserves separate carriage culling', () => {
  const carriages = new Set();
  scene.traverse((object) => {
    const match = object.name.match(/^Carriage (\d) static surfaces$/);
    if (match) carriages.add(match[1]);
  });
  assert.equal(carriages.size, 5);
});

test('victim chaise clears the salon furniture', () => {
  const chaise = new THREE.Box3(
    new THREE.Vector3(-2.22, 0.1, 0.95),
    new THREE.Vector3(-1.37, 1.1, 3.06),
  );
  for (const obstacle of world.colliders)
    assert.ok(!chaise.intersectsBox(obstacle), 'Furniture intersects Daniel’s chaise');
});
