import * as THREE from 'three';

// All people use metre-scale proportions and share the same inexpensive geometry.
const sphere = new THREE.SphereGeometry(1, 12, 10);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 10);
const box = new THREE.BoxGeometry(1, 1, 1);
const materials = new Map();
function material(color, roughness = 0.8, metalness = 0) {
  const key = `${color}/${roughness}/${metalness}`;
  if (!materials.has(key))
    materials.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return materials.get(key);
}
function shape(parent, geometry, color, position, scale, roughness, metalness) {
  const mesh = new THREE.Mesh(geometry, material(color, roughness, metalness));
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
const ellipsoid = (p, c, pos, size, r, m) => shape(p, sphere, c, pos, size, r, m);
const block = (p, c, pos, size, r, m) => shape(p, box, c, pos, size, r, m);
const bone = (p, c, pos, size, r, m) => shape(p, cylinder, c, pos, size, r, m);

function person(config) {
  const root = new THREE.Group();
  root.name = config.name;
  root.userData = {
    type: 'npc',
    id: config.id,
    name: config.name,
    label: `Speak to ${config.name}`,
    radius: 1.95,
  };
  const body = new THREE.Group();
  root.add(body);
  const skin = config.skin || 0xbd8d74,
    hair = config.hair || 0x32241e;
  const female = config.female,
    coat = config.coat;
  // Trousers/skirt and narrow shoes define a readable human silhouette.
  if (config.dress) {
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.29, 0.77, 16),
      material(coat, 0.9),
    );
    skirt.position.y = 0.68;
    body.add(skirt);
  }
  for (const side of [-1, 1]) {
    const x = side * 0.103;
    bone(body, config.dress ? skin : config.trousers || coat, [x, 0.51, 0], [0.075, 0.78, 0.075]);
    ellipsoid(body, 0x171617, [x, 0.065, 0.057], [0.082, 0.063, 0.148], 0.35);
  }
  ellipsoid(body, coat, [0, 1.075, 0], [female ? 0.205 : 0.235, 0.35, 0.125]);
  block(body, coat, [0, 1.135, 0], [female ? 0.34 : 0.4, 0.41, 0.23]);
  // Shirt inset, separate lapels, buttons and waistcoat.
  block(body, config.shirt || 0xd7ceba, [0, 1.255, 0.121], [0.13, 0.27, 0.012]);
  for (const side of [-1, 1]) {
    const lapel = block(
      body,
      config.lapel || coat,
      [side * 0.079, 1.25, 0.139],
      [0.055, 0.24, 0.018],
    );
    lapel.rotation.z = side * 0.25;
  }
  if (!female) {
    block(body, config.tie || 0x563e36, [0, 1.23, 0.146], [0.037, 0.17, 0.012]);
    ellipsoid(body, config.tie || 0x563e36, [0, 1.335, 0.145], [0.026, 0.025, 0.014]);
    for (let i = 0; i < 3; i++)
      ellipsoid(body, 0x7a694a, [0.036, 1.1 - i * 0.075, 0.133], [0.009, 0.009, 0.008], 0.3, 0.65);
    block(body, config.shirt || 0xc8c2af, [-0.135, 1.265, 0.124], [0.066, 0.025, 0.01]);
  } else if (config.id === 'eleanor') {
    for (let i = 0; i < 9; i++) {
      const a = (Math.PI * i) / 8;
      ellipsoid(
        body,
        0xd9cfb3,
        [Math.cos(a) * 0.082, 1.34 - Math.sin(a) * 0.073, 0.14],
        [0.012, 0.012, 0.01],
        0.24,
        0.2,
      );
    }
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * (female ? 0.207 : 0.236), 1.345, 0);
    body.add(arm);
    arm.rotation.z = side * 0.06;
    bone(arm, coat, [side * 0.008, -0.155, 0], [0.067, 0.31, 0.069]);
    const forearm = new THREE.Group();
    forearm.position.set(side * 0.013, -0.31, 0);
    arm.add(forearm);
    forearm.rotation.x = -0.12;
    bone(forearm, coat, [0, -0.125, 0], [0.053, 0.25, 0.056]);
    bone(forearm, config.shirt || 0xc8c2af, [0, -0.245, 0], [0.05, 0.025, 0.053]);
    ellipsoid(forearm, skin, [0, -0.312, 0.012], [0.045, 0.068, 0.03]);
    ellipsoid(forearm, skin, [-side * 0.041, -0.295, 0.025], [0.017, 0.038, 0.019]);
    arms.push({ arm, forearm, side });
  }
  bone(body, skin, [0, 1.439, 0], [0.063, 0.12, 0.063]);
  const head = new THREE.Group();
  head.position.y = 1.59;
  body.add(head);
  ellipsoid(head, skin, [0, 0, 0], [0.116, 0.155, 0.108]);
  ellipsoid(head, skin, [0, -0.081, 0.028], [0.087, 0.067, 0.074]);
  for (const side of [-1, 1]) {
    ellipsoid(head, skin, [side * 0.115, -0.01, -0.006], [0.022, 0.042, 0.027]);
    ellipsoid(head, 0xb0a89b, [side * 0.044, 0.017, 0.096], [0.026, 0.012, 0.009]);
    ellipsoid(head, config.eyes || 0x424b45, [side * 0.044, 0.017, 0.105], [0.009, 0.009, 0.004]);
    const brow = ellipsoid(head, hair, [side * 0.044, 0.044, 0.099], [0.03, 0.006, 0.006]);
    brow.rotation.z = side * 0.09;
  }
  ellipsoid(head, skin, [0, -0.019, 0.109], [0.018, 0.034, 0.023]);
  ellipsoid(head, 0x805851, [0, -0.067, 0.097], [0.032, 0.006, 0.005]);
  ellipsoid(head, hair, [0, 0.109, -0.022], [0.12, 0.061, 0.101]);
  ellipsoid(head, hair, [0, 0.032, -0.077], [0.112, 0.104, 0.05]);
  if (female) {
    for (const side of [-1, 1]) {
      ellipsoid(head, hair, [side * 0.096, 0.005, -0.026], [0.032, 0.116, 0.073]);
      if (config.id === 'eleanor')
        ellipsoid(head, 0xbca06b, [side * 0.12, -0.055, 0.006], [0.012, 0.019, 0.01], 0.23, 0.65);
    }
    if (config.id === 'eleanor') ellipsoid(head, hair, [0, -0.025, -0.119], [0.076, 0.061, 0.047]);
  } else {
    const part = ellipsoid(head, hair, [0.044, 0.119, 0.038], [0.083, 0.043, 0.06]);
    part.rotation.z = -0.18;
    if (config.id === 'thomas') {
      bone(head, 0x172229, [0, 0.138, 0], [0.137, 0.067, 0.121]);
      block(head, 0x11191d, [0, 0.113, 0.087], [0.24, 0.02, 0.125]);
      ellipsoid(head, 0xbc9952, [0, 0.145, 0.117], [0.024, 0.018, 0.007], 0.3, 0.65);
      block(body, 0xba9b52, [0.14, 1.29, 0.132], [0.072, 0.016, 0.008], 0.3, 0.7);
    }
  }
  if (config.id === 'clara') {
    for (const side of [-1, 1]) {
      const frame = new THREE.Mesh(
        new THREE.TorusGeometry(0.029, 0.003, 5, 16),
        material(0x9c8563, 0.4, 0.5),
      );
      frame.position.set(side * 0.041, 0.018, 0.116);
      head.add(frame);
    }
    block(head, 0x9c8563, [0, 0.021, 0.116], [0.025, 0.004, 0.004]);
    block(body, 0x4a3223, [-0.125, 0.98, 0.143], [0.096, 0.13, 0.04]);
  }
  return { root, body, head, arms, config, emotion: 'idle', phase: Math.random() * 6.28 };
}

export function createCharacters(scene) {
  const configs = [
    {
      id: 'eleanor',
      name: 'Eleanor Vale',
      female: true,
      dress: true,
      coat: 0x253d3a,
      lapel: 0x324b46,
      hair: 0x37251e,
      skin: 0xd0a18b,
      position: [-1.25, 0, 28],
    },
    {
      id: 'marcus',
      name: 'Marcus Reed',
      coat: 0x403e42,
      trousers: 0x292930,
      tie: 0x673c3c,
      hair: 0x29201b,
      skin: 0xc29276,
      position: [-1.25, 0, 15],
    },
    {
      id: 'clara',
      name: 'Clara Shaw',
      female: true,
      coat: 0x69584a,
      trousers: 0x333b3b,
      shirt: 0xbbb39a,
      hair: 0x4d2e20,
      skin: 0xbf8a6b,
      position: [-1.25, 0, 42],
    },
    {
      id: 'thomas',
      name: 'Thomas Bell',
      coat: 0x1c2c36,
      trousers: 0x17232a,
      tie: 0x22282c,
      hair: 0x68615a,
      skin: 0xb9927c,
      position: [-1.6, 0, -12],
    },
  ];
  const actors = configs.map((c) => {
    const a = person(c);
    a.root.position.set(...c.position);
    a.root.rotation.y = Math.PI / 2;
    scene.add(a.root);
    return a;
  });
  const victim = person({
    id: 'daniel',
    name: 'Daniel Vale',
    coat: 0x302b2d,
    shirt: 0xcbc1ac,
    tie: 0x552b29,
    hair: 0x726557,
    skin: 0x999087,
  });
  victim.root.userData = { type: 'scenery', id: 'daniel', name: 'Daniel Vale' };
  victim.root.position.set(-1.8, 0.66, 2);
  victim.root.rotation.set(0, 0, -Math.PI / 2 + 0.11);
  scene.add(victim.root);
  // Low chaise keeps the body fully out of the walking aisle.
  const chaise = new THREE.Group();
  chaise.position.set(-1.8, 0, 2);
  scene.add(chaise);
  block(chaise, 0x362823, [0, 0.43, 0], [0.79, 0.22, 2.06], 0.55);
  block(chaise, 0x382a24, [-0.35, 0.72, 0], [0.14, 0.54, 2.1], 0.55);
  for (const z of [-0.82, 0.82])
    for (const x of [-0.27, 0.27])
      bone(chaise, 0x947648, [x, 0.2, z], [0.04, 0.4, 0.04], 0.36, 0.65);
  // Lay Daniel lengthwise along the chaise, head at the forward end.
  victim.root.rotation.set(Math.PI / 2, 0, 0.07);
  victim.root.position.set(-1.8, 0.66, 1.2);
  victim.arms[0].arm.rotation.z = -0.16;
  victim.arms[1].arm.rotation.z = 0.18;
  return {
    interactables: actors.map((a) => a.root),
    update(time, dt) {
      for (const a of actors) {
        const t = time + a.phase,
          nervous = a.emotion === 'nervous' || a.emotion === 'defensive' || a.emotion === 'hostile',
          talk = a.emotion === 'talking' || a.emotion === 'cooperative';
        a.body.position.y = Math.sin(t * 1.35) * 0.003;
        a.head.rotation.y = Math.sin(t * 0.39) * 0.075 + (nervous ? Math.sin(t * 1.8) * 0.06 : 0);
        a.head.rotation.z = Math.sin(t * 0.61) * 0.015;
        for (const { arm, forearm, side } of a.arms) {
          arm.rotation.x = Math.sin(t * 0.63 + side) * 0.024 + (talk && side === 1 ? -0.15 : 0);
          forearm.rotation.x =
            -0.12 +
            (talk ? Math.sin(t * 2.3 + side) * 0.14 : 0) +
            (nervous ? Math.sin(t * 4) * 0.035 : 0);
        }
      }
    },
    setEmotion(id, emotion) {
      const a = actors.find((a) => a.config.id === id);
      if (a) a.emotion = emotion;
    },
  };
}
