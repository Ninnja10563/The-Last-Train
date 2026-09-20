import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hand-built, texture-light scenery. Everything is generated locally: no asset downloads.
export function createEnvironment(scene) {
  const colliders = [],
    interactables = [],
    rain = [],
    lamps = [];
  let scenerySeed = 1947;
  const random = () => {
    scenerySeed = (scenerySeed * 16807) % 2147483647;
    return scenerySeed / 2147483647;
  };
  const root = new THREE.Group();
  root.name = 'The Midnight Express';
  scene.add(root);
  const rooms = [
    { id: 'luggage', name: 'LUGGAGE & CONDUCTOR', z: -14 },
    { id: 'private', name: 'VALE’S PRIVATE SALON', z: 0 },
    { id: 'dining', name: 'THE DINING CAR', z: 14 },
    { id: 'passenger', name: 'SLEEPING COMPARTMENTS', z: 28 },
    { id: 'observation', name: 'THE OBSERVATION CAR', z: 42 },
  ];
  function texture(kind) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const cx = c.getContext('2d');
    cx.fillStyle = kind === 'wood' ? '#34231d' : kind === 'carpet' ? '#33222a' : '#25403e';
    cx.fillRect(0, 0, 256, 256);
    let seed = 420;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 1200; i++) {
      cx.strokeStyle = `rgba(${kind === 'wood' ? '161,110,68' : '187,162,110'},${rand() * 0.12})`;
      cx.lineWidth = rand() * 2 + 0.3;
      cx.beginPath();
      const x = rand() * 256,
        y = rand() * 256;
      cx.moveTo(x, y);
      cx.lineTo(
        kind === 'wood' ? x + rand() * 8 : x + 2,
        kind === 'wood' ? y + rand() * 120 : y + 2,
      );
      cx.stroke();
    }
    if (kind === 'carpet') {
      cx.strokeStyle = '#886b43';
      cx.lineWidth = 2;
      for (let i = 10; i < 256; i += 42) {
        cx.beginPath();
        cx.moveTo(128, i);
        cx.lineTo(139, i + 14);
        cx.lineTo(128, i + 28);
        cx.lineTo(117, i + 14);
        cx.closePath();
        cx.stroke();
      }
      cx.fillStyle = '#80643d';
      cx.fillRect(13, 0, 2, 256);
      cx.fillRect(241, 0, 2, 256);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(kind === 'carpet' ? 1 : 2, kind === 'carpet' ? 5 : 2);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const mats = {
    wood: new THREE.MeshStandardMaterial({
      map: texture('wood'),
      roughness: 0.48,
      metalness: 0.08,
    }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x171d1c, roughness: 0.55 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xad874d, metalness: 0.8, roughness: 0.3 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc6a66c, metalness: 0.68, roughness: 0.28 }),
    leather: new THREE.MeshStandardMaterial({
      color: 0x294442,
      roughness: 0.7,
      map: texture('leather'),
    }),
    redLeather: new THREE.MeshStandardMaterial({ color: 0x552e29, roughness: 0.67 }),
    carpet: new THREE.MeshStandardMaterial({ map: texture('carpet'), roughness: 1 }),
    cream: new THREE.MeshStandardMaterial({ color: 0xd2c2a0, roughness: 0.85 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0x77776a, roughness: 0.85 }),
    lamp: new THREE.MeshStandardMaterial({
      color: 0xffd19a,
      emissive: 0xffbd6c,
      emissiveIntensity: 1.1,
      roughness: 0.7,
    }),
    window: new THREE.MeshStandardMaterial({
      color: 0x172e3e,
      emissive: 0x0c2335,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.35,
      roughness: 0.13,
      metalness: 0.3,
      depthWrite: false,
    }),
    paper: new THREE.MeshStandardMaterial({ color: 0xd1c19e, roughness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x131818, roughness: 0.8 }),
    bottle: new THREE.MeshStandardMaterial({ color: 0x25372b, roughness: 0.16, metalness: 0.2 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0xabcbd2,
      transparent: true,
      opacity: 0.45,
      roughness: 0.12,
      metalness: 0.25,
    }),
    evidenceGlow: new THREE.MeshBasicMaterial({
      color: 0xc6ab74,
      transparent: true,
      opacity: 0.65,
    }),
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, x, y, z, mat = mats.wood, parent = root, collision = false) {
    const o = new THREE.Mesh(boxGeo, mat);
    o.scale.set(w, h, d);
    o.position.set(x, y, z);
    parent.add(o);
    o.castShadow = false;
    o.receiveShadow = true;
    if (collision) {
      o.updateWorldMatrix(true, false);
      colliders.push(new THREE.Box3().setFromObject(o));
    }
    return o;
  }
  function cyl(r1, r2, h, x, y, z, mat, parent = root, segments = 16) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), mat);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function sphere(r, x, y, z, mat, parent = root) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function label(text, w, h, x, y, z, size = 36, color = '#c7ad77', bg = '#192726', parent = root) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const cx = c.getContext('2d');
    cx.fillStyle = bg;
    cx.fillRect(0, 0, 512, 128);
    cx.strokeStyle = color;
    cx.lineWidth = 2;
    cx.strokeRect(8, 8, 496, 112);
    cx.font = `${size}px Georgia`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillStyle = color;
    cx.fillText(text, 256, 65, 478);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const o = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, side: THREE.DoubleSide }),
    );
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function lamp(x, z, side = 1) {
    box(0.14, 0.42, 0.14, x, 2.07, z, mats.brass);
    cyl(0.2, 0.3, 0.35, x - side * 0.13, 2.26, z, mats.lamp);
    cyl(0.08, 0.13, 0.07, x - side * 0.13, 2.47, z, mats.brass);
  }
  function table(x, z, w = 1.35, d = 1.1) {
    box(w, 0.1, d, x, 0.88, z, mats.wood, root, true);
    box(w + 0.025, 0.022, d + 0.025, x, 0.94, z, mats.brass);
    cyl(0.1, 0.17, 0.84, x, 0.43, z, mats.darkWood);
    box(0.8, 0.08, 0.6, x, 0.06, z, mats.darkWood);
  }
  function chair(x, z, rot = 0, material = mats.leather) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    root.add(g);
    box(0.7, 0.19, 0.75, 0, 0.48, 0, material, g);
    box(0.7, 0.72, 0.14, 0, 0.94, 0.33, material, g);
    [-0.3, 0.3].forEach((xx) =>
      [-0.28, 0.28].forEach((zz) => box(0.065, 0.43, 0.065, xx, 0.23, zz, mats.wood, g)),
    );
    [-0.38, 0.38].forEach((xx) => {
      box(0.1, 0.1, 0.62, xx, 0.73, 0, mats.wood, g);
      box(0.045, 0.28, 0.045, xx, 0.59, -0.24, mats.brass, g);
    });
    g.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(g));
  }
  function couch(x, z, rotation = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    root.add(g);
    box(0.92, 0.38, 2.45, 0, 0.4, 0, mats.leather, g);
    box(0.22, 0.8, 2.45, 0.4, 0.93, 0, mats.leather, g);
    for (const zz of [-1.13, 1.13]) box(0.92, 0.5, 0.2, 0, 0.77, zz, mats.leather, g);
    for (const zz of [-0.72, 0, 0.72]) box(0.8, 0.12, 0.68, -0.04, 0.66, zz, mats.leather, g);
    g.updateMatrixWorld(true);
    colliders.push(new THREE.Box3().setFromObject(g));
  }
  function luggage(x, y, z, scale = 1, rot = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rot;
    root.add(g);
    box(0.85 * scale, 0.52 * scale, 0.45 * scale, 0, 0.26 * scale, 0, mats.redLeather, g);
    [-0.26, 0.26].forEach((xx) => {
      box(0.05 * scale, 0.54 * scale, 0.47 * scale, xx * scale, 0.26 * scale, 0, mats.brass, g);
    });
    box(0.25 * scale, 0.055, 0.06, 0, 0.56 * scale, 0, mats.black, g);
  }
  function paper(x, y, z, title, rot = 0) {
    const o = label(title, 0.42, 0.28, x, y, z, 30, '#34281e', '#d1c19e');
    o.rotation.set(-Math.PI / 2, 0, rot);
    return o;
  }
  function evidence(id, x, y, z, build) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.userData = { type: 'evidence', id };
    root.add(g);
    build(g);
    // Small engraved brass exhibit halo; responds naturally to surrounding light.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.008, 5, 24), mats.evidenceGlow);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.015;
    g.add(ring);
    interactables.push(g);
    return g;
  }
  function glass(x, y, z, parent = root) {
    cyl(0.075, 0.048, 0.18, x, y + 0.12, z, mats.glass, parent);
    cyl(0.045, 0.045, 0.05, x, y + 0.055, z, mats.redLeather, parent);
    cyl(0.008, 0.008, 0.1, x, y - 0.015, z, mats.glass, parent);
    cyl(0.063, 0.063, 0.012, x, y - 0.065, z, mats.glass, parent);
  }
  function book(x, y, z, rot = 0) {
    const o = box(0.29, 0.08, 0.4, x, y, z, mats.redLeather);
    o.rotation.y = rot;
    box(0.27, 0.05, 0.38, x, y, z, mats.paper);
  }
  // Carriage shell, panelled walls, mullions, carpet, brass rails, crown moulding.
  for (const room of rooms) {
    const z = room.z;
    box(6.1, 0.2, 14, 0, -0.12, z, mats.wood);
    box(1.7, 0.018, 13.9, 0, 0.004, z, mats.carpet);
    box(6.1, 0.14, 14, 0, 3.04, z, mats.ceiling);
    for (const x of [-2.99, 2.99]) {
      box(0.16, 1.18, 14, x, 0.55, z, mats.wood, root, true);
      box(0.16, 0.55, 14, x, 2.76, z, mats.wood);
      box(0.21, 0.05, 14, x, 1.12, z, mats.brass);
      box(0.23, 0.05, 14, x, 2.5, z, mats.brass);
      box(0.21, 0.08, 14, x, 0.13, z, mats.darkWood);
      for (let offset = -5.5; offset <= 5.6; offset += 2.2) {
        box(0.14, 1.35, 0.16, x, 1.82, z + offset, mats.wood);
        box(0.17, 0.04, 1.88, x, 1.23, z + offset + 1.05, mats.brass);
        box(0.045, 1.19, 1.86, x, 1.86, z + offset + 1.05, mats.window);
        // Pane droplets use one line-segment geometry, avoiding transparency stacks.
        const vertices = [];
        for (let i = 0; i < 14; i++) {
          const zz = z + offset + 0.2 + random() * 1.55,
            yy = 1.3 + random();
          vertices.push(
            x - Math.sign(x) * 0.05,
            yy,
            zz,
            x - Math.sign(x) * 0.05,
            yy - 0.07 - random() * 0.12,
            zz - 0.015,
          );
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        root.add(
          new THREE.LineSegments(
            geo,
            new THREE.LineBasicMaterial({ color: 0x8198a7, transparent: true, opacity: 0.23 }),
          ),
        );
        box(0.065, 0.76, 1.55, x - Math.sign(x) * 0.1, 0.62, z + offset + 1.05, mats.darkWood);
        box(0.07, 0.61, 1.38, x - Math.sign(x) * 0.14, 0.62, z + offset + 1.05, mats.wood);
      }
      for (const dz of [-4.4, 0, 4.4]) lamp(x - Math.sign(x) * 0.2, z + dz, Math.sign(x));
      box(0.075, 0.06, 13.8, x - Math.sign(x) * 0.25, 2.88, z, mats.brass);
    }
    const light = new THREE.PointLight(0xffc587, 22, 12, 2);
    light.position.set(0, 2.63, z);
    root.add(light);
    lamps.push(light);
    const shade = cyl(0.35, 0.48, 0.13, 0, 2.86, z, mats.lamp);
    cyl(0.52, 0.52, 0.04, 0, 2.95, z, mats.brass);
    for (const dz of [-6.92, 6.92]) {
      for (const x of [-1.99, 1.99]) box(2, 0.3, 0.15, x, 2.83, z + dz, mats.wood);
      for (const x of [-2, 2]) box(2, 2.55, 0.13, x, 1.28, z + dz, mats.wood, root, true);
      for (const x of [-1, 1]) box(0.065, 2.7, 0.2, x, 1.35, z + dz, mats.brass);
      box(2, 0.3, 0.2, 0, 2.84, z + dz, mats.darkWood);
      label(room.name, 1.7, 0.22, 0, 2.83, z + dz + (dz < 0 ? 0.12 : -0.12), 27);
      box(1.85, 0.02, 0.35, 0, 0.015, z + dz, mats.brass);
    }
  }
  // Terminate the train; connected vestibules remain fully traversable.
  box(2, 2.7, 0.2, 0, 1.35, -21, mats.wood, root, true);
  box(2, 2.7, 0.2, 0, 1.35, 49, mats.wood, root, true);
  label('MIDNIGHT EXPRESS', 1.55, 0.45, 0, 2, -20.86, 38);
  // Daniel's stopped clock corroborates the 23:47 discovery time.
  const clock = new THREE.Group();
  clock.name = 'Salon clock — 23:47';
  clock.position.set(2, 2.02, -6.8);
  root.add(clock);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.31, 48), mats.paper);
  clock.add(face);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.023, 8, 48), mats.brass);
  clock.add(rim);
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const tick = box(
      i % 5 ? 0.006 : 0.014,
      i % 5 ? 0.014 : 0.035,
      0.005,
      Math.sin(angle) * 0.274,
      Math.cos(angle) * 0.274,
      0.005,
      mats.black,
      clock,
    );
    tick.rotation.z = -angle;
  }
  function clockHand(angle, length, width) {
    const hand = box(
      width,
      length,
      0.01,
      (Math.sin(angle) * length) / 2,
      (Math.cos(angle) * length) / 2,
      0.016,
      mats.black,
      clock,
    );
    hand.rotation.z = -angle;
  }
  clockHand(((11 + 47 / 60) / 12) * Math.PI * 2, 0.16, 0.025);
  clockHand((47 / 60) * Math.PI * 2, 0.24, 0.013);
  sphere(0.021, 0, 0, 0.022, mats.brass, clock);
  // Private salon. A writing desk, decanter, library and chaise.
  table(-1.95, -1.3, 1.55, 1.5);
  chair(-1.95, -2.55, Math.PI);
  couch(2.25, 1.4);
  box(0.65, 1.65, 2.4, -2.52, 0.84, 4.5, mats.wood, root, true);
  for (let k = 0; k < 3; k++) {
    box(0.7, 0.05, 2.4, -2.49, 0.45 + k * 0.52, 4.5, mats.brass);
    for (let j = 0; j < 10; j++)
      box(
        0.34,
        0.34,
        0.13,
        -2.33,
        0.25 + k * 0.52,
        3.52 + j * 0.2,
        j % 3 === 0 ? mats.redLeather : mats.darkWood,
      );
  }
  table(1.85, -3.9, 1.25, 0.9);
  cyl(0.1, 0.11, 0.36, 1.92, 1.13, -3.9, mats.bottle);
  cyl(0.04, 0.04, 0.14, 1.92, 1.38, -3.9, mats.brass);
  paper(-1.97, 0.964, -1.7, 'D. VALE — PRIVATE');
  book(-2.16, 0.99, -0.83, -0.2);
  evidence('watch', -1.2, 0.12, 2, (g) => {
    cyl(0.115, 0.115, 0.035, 0, 0.035, 0, mats.gold, g, 32);
    cyl(0.096, 0.096, 0.005, 0, 0.055, 0, mats.paper, g, 32);
    for (const [angle, length, width] of [
      [((11 + 42 / 60) / 12) * Math.PI * 2, 0.055, 0.01],
      [(42 / 60) * Math.PI * 2, 0.081, 0.006],
    ]) {
      const hand = box(
        width,
        0.007,
        length,
        (Math.sin(angle) * length) / 2,
        0.061,
        (-Math.cos(angle) * length) / 2,
        mats.black,
        g,
      );
      hand.rotation.y = -angle;
    }
    const cracks = new THREE.BufferGeometry();
    cracks.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          -0.06, 0.064, -0.06, -0.018, 0.064, -0.014, -0.018, 0.064, -0.014, 0.068, 0.064, 0.047,
          -0.018, 0.064, -0.014, -0.035, 0.064, 0.055,
        ],
        3,
      ),
    );
    g.add(new THREE.LineSegments(cracks, new THREE.LineBasicMaterial({ color: 0x665b49 })));
    for (let i = 0; i < 4; i++) {
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 5, 10), mats.brass);
      chain.rotation.x = Math.PI / 2;
      chain.position.set(-0.12 - i * 0.027, 0.02, 0.015 * Math.sin(i));
      g.add(chain);
    }
  });
  evidence('glass', 1.42, 1.04, -3.9, (g) => {
    // The fatal drink and the medicine it was adulterated with share an inspectable tray.
    box(0.53, 0.014, 0.32, 0.14, -0.072, 0, mats.brass, g);
    glass(0, 0, 0, g);
    cyl(0.058, 0.06, 0.19, 0.3, 0.025, 0.035, mats.bottle, g);
    cyl(0.025, 0.03, 0.065, 0.3, 0.152, 0.035, mats.bottle, g);
    cyl(0.035, 0.035, 0.035, 0.3, 0.193, 0.035, mats.black, g);
    const medicineLabel = label(
      'CARDIAC DROPS',
      0.13,
      0.075,
      0.238,
      0.028,
      0.035,
      35,
      '#30271f',
      '#ddd0ac',
      g,
    );
    medicineLabel.rotation.y = -Math.PI / 2;
    const doseLabel = label(
      'ORAL USE',
      0.13,
      0.043,
      0.237,
      -0.017,
      0.035,
      40,
      '#803b32',
      '#ddd0ac',
      g,
    );
    doseLabel.rotation.y = -Math.PI / 2;
    const foldedLabel = label(
      'VALE CARDIAC DROPS — ORAL PREPARATION',
      0.43,
      0.12,
      0.12,
      -0.081,
      0.19,
      22,
      '#34281e',
      '#d1c19e',
      g,
    );
    foldedLabel.rotation.x = -Math.PI / 2;
  });
  evidence('letter', -1.5, 0.97, -1.79, (g) => {
    box(0.34, 0.007, 0.25, 0, 0.02, 0, mats.paper, g);
    box(0.27, 0.009, 0.004, 0, 0.027, -0.05, mats.black, g);
    box(0.22, 0.009, 0.004, -0.02, 0.027, -0.02, mats.black, g);
    cyl(0.037, 0.037, 0.01, 0.1, 0.03, 0.07, mats.redLeather, g);
  });
  // Dining: paired booths with cloths, wine, dishes and newspapers.
  for (const dz of [-4.1, 0, 4.1])
    for (const side of [-1, 1]) {
      const x = side * 2;
      table(x, 14 + dz, 1.35, 1.3);
      box(1.1, 0.016, 1.26, x, 0.956, 14 + dz, mats.cream);
      chair(x, 14 + dz - 0.99, Math.PI);
      chair(x, 14 + dz + 0.99, 0);
      cyl(0.17, 0.17, 0.025, x, 0.98, 14 + dz - 0.34, mats.cream);
      cyl(0.17, 0.17, 0.025, x, 0.98, 14 + dz + 0.34, mats.cream);
      cyl(0.07, 0.08, 0.26, x + 0.33, 1.1, 14 + dz, mats.bottle);
      glass(x - 0.32, 1.05, 14 + dz - 0.3);
      cyl(0.025, 0.035, 0.2, x, 1.09, 14 + dz, mats.brass);
      sphere(0.032, x, 1.21, 14 + dz, mats.lamp);
    }
  evidence('ticket', -1.4, 0.99, 13.75, (g) => {
    box(0.33, 0.012, 0.17, 0, 0.02, 0, mats.paper, g);
    box(0.035, 0.016, 0.17, -0.1, 0.023, 0, mats.redLeather, g);
    for (let i = 0; i < 5; i++)
      box(0.15, 0.016, 0.004, 0.04, 0.024, -0.05 + i * 0.02, mats.black, g);
  });
  // Passenger compartments; openings face the public central corridor.
  for (const dz of [-4.2, 0, 4.2])
    for (const side of [-1, 1]) {
      const x = side * 2.23;
      couch(x, 28 + dz, side < 0 ? Math.PI : 0);
      for (const edge of [-1.65, 1.65])
        box(1.8, 2.65, 0.1, side * 2.1, 1.33, 28 + dz + edge, mats.wood, root, true);
      const p = label(
        `${side < 0 ? '0' : '1'}${Math.round((dz + 4.2) / 4.2) + 1}`,
        0.27,
        0.18,
        side * 1.2,
        2,
        28 + dz + 1.72,
        56,
      );
      p.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      luggage(side * 2.3, 0.04, 28 + dz + 0.75, 0.55, 0.1);
    }
  table(-1.7, 25.7, 1, 0.65);
  evidence('note', -1.32, 0.98, 25.7, (g) => {
    box(0.26, 0.008, 0.21, 0, 0.02, 0, mats.paper, g).rotation.y = 0.25;
    for (let i = 0; i < 4; i++) box(0.14, 0.01, 0.003, 0, 0.027, -0.055 + i * 0.024, mats.black, g);
  });
  // Panoramic observation lounge and a brass telescope.
  couch(-2.25, 41, Math.PI);
  couch(2.25, 41);
  table(-1.8, 44.4, 1.2, 1);
  table(1.8, 44.4, 1.2, 1);
  paper(1.8, 0.97, 44.4, 'THE EVENING CHRONICLE', 0.3);
  book(-1.98, 1, 44.45);
  evidence('photograph', -1.42, 0.98, 44.3, (g) => {
    box(0.32, 0.013, 0.24, 0, 0.025, 0, mats.paper, g);
    box(0.27, 0.016, 0.18, 0, 0.027, 0, mats.darkWood, g);
    sphere(0.035, -0.05, 0.04, 0, mats.cream, g);
    sphere(0.035, 0.05, 0.04, 0, mats.cream, g);
  });
  cyl(0.055, 0.12, 1.25, 1.85, 0.65, 46.5, mats.brass);
  const tube = cyl(0.1, 0.1, 0.65, 1.85, 1.36, 46.5, mats.brass);
  tube.rotation.z = -0.65;
  for (const s of [-1, 1]) {
    const leg = box(0.035, 0.65, 0.035, 1.85 + s * 0.19, 0.3, 46.5, mats.brass);
    leg.rotation.z = s * 0.6;
  }
  label('THE NIGHT HAS ITS SECRETS', 1.6, 0.24, 0, 2.35, 48.87, 29);
  // Luggage / conductor’s office.
  for (const side of [-1, 1])
    for (const zz of [-17, -14.5]) {
      box(1.1, 0.09, 2.1, side * 2.25, 0.85, zz, mats.wood, root, true);
      box(1.1, 0.09, 2.1, side * 2.25, 1.85, zz, mats.wood);
      for (const off of [-0.65, 0.1, 0.65]) {
        luggage(side * 2.25, 0.9, zz + off, 0.75, off * 0.15);
        luggage(side * 2.25, 0.02, zz + off, 0.85, -off * 0.2);
      }
    }
  table(-1.85, -10.8, 1.4, 1.3);
  chair(-2, -9.8);
  paper(-2, 0.97, -10.9, 'RUNNING ORDERS');
  evidence('ledger', -1.38, 0.98, -10.75, (g) => {
    box(0.34, 0.07, 0.42, 0, 0.05, 0, mats.darkWood, g);
    box(0.3, 0.055, 0.39, 0.015, 0.05, 0, mats.paper, g);
    box(0.35, 0.012, 0.42, 0, 0.087, 0, mats.redLeather, g);
    box(0.2, 0.008, 0.024, 0, 0.097, -0.05, mats.gold, g);
  });
  box(0.65, 0.08, 0.65, -1.4, 0.85, -14.1, mats.wood, root, true);
  evidence('key', -1.35, 0.92, -14.1, (g) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 8, 16), mats.gold);
    loop.rotation.x = Math.PI / 2;
    loop.position.set(-0.06, 0.025, 0);
    g.add(loop);
    box(0.14, 0.02, 0.025, 0.04, 0.025, 0, mats.gold, g);
    box(0.025, 0.02, 0.07, 0.1, 0.025, 0.025, mats.gold, g);
  });
  box(0.12, 0.8, 1, -2.84, 1.83, -11, mats.black);
  for (let i = 0; i < 3; i++) {
    const gauge = cyl(0.1, 0.1, 0.03, -2.75, 1.8, -11.3 + i * 0.3, mats.paper);
    gauge.rotation.z = Math.PI / 2;
  }
  // Railway exterior: track, station, distant hills, telegraph poles, wet platform.
  const outside = new THREE.Group();
  scene.add(outside);
  const ground = new THREE.MeshStandardMaterial({
    color: 0x0c171d,
    roughness: 0.72,
    metalness: 0.18,
  });
  box(220, 0.4, 500, 0, -1.3, 30, ground, outside);
  for (const x of [-1, 1]) box(0.1, 0.12, 250, x, -0.52, 35, mats.brass, outside);
  for (let z = -90; z < 150; z += 1.7) box(3.5, 0.08, 0.24, 0, -0.63, z, mats.darkWood, outside);
  box(6, 0.45, 45, -6, -0.1, -8, ground, outside);
  box(0.3, 0.02, 45, -3.25, 0.135, -8, mats.cream, outside);
  box(6, 0.1, 44, -6, 4.14, -8, mats.darkWood, outside);
  for (const z of [-25, -16, -7, 2, 11]) {
    box(0.14, 4, 0.14, -7, 2, z, mats.darkWood, outside);
    box(6, 0.16, 1.1, -6, 4, z, mats.darkWood, outside);
    box(1, 0.07, 0.32, -6, 3.88, z, mats.lamp, outside);
  }
  const sign = label(
    'BLACKTHORN  •  PLATFORM 04',
    4.6,
    0.6,
    -7,
    2.7,
    -10,
    35,
    '#d3c4a2',
    '#172529',
    outside,
  );
  sign.rotation.y = Math.PI / 2;
  for (let i = 0; i < 24; i++) {
    const g = new THREE.Group();
    g.position.set((i % 2 ? 1 : -1) * (12 + random() * 35), 0, -65 + i * 7);
    outside.add(g);
    cyl(0.18, 0.28, 5, 0, 1.5, 0, mats.darkWood, g, 6);
    const tree = new THREE.Mesh(new THREE.ConeGeometry(2 + random(), 6 + random() * 4, 6), ground);
    tree.position.y = 4;
    g.add(tree);
    rain.push(g);
  }
  const rainVertices = [];
  for (let i = 0; i < 700; i++) {
    const x = (random() - 0.5) * 42,
      z = random() * 120 - 35,
      y = random() * 14;
    if (Math.abs(x) < 3.5) continue;
    rainVertices.push(x, y, z, x - 0.12, y - 0.7, z);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
  const rainMesh = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({ color: 0x708a9a, transparent: true, opacity: 0.25 }),
  );
  outside.add(rainMesh);
  scene.background = new THREE.Color(0x081219);
  scene.fog = new THREE.FogExp2(0x081219, 0.021);
  const ambient = new THREE.HemisphereLight(0x9bbbd0, 0x493322, 1.25);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0x8fb4d0, 0.65);
  moon.position.set(8, 8, -10);
  scene.add(moon);
  // Batch static surfaces by material. Evidence stays separate for precise picking.
  root.updateMatrixWorld(true);
  const batches = new Map();
  root.traverse((object) => {
    if (!object.isMesh) return;
    let ancestor = object;
    while (ancestor && ancestor !== root) {
      if (ancestor.userData.type === 'evidence') return;
      ancestor = ancestor.parent;
    }
    // Keep each carriage independently cullable even though its surfaces share materials.
    const position = new THREE.Vector3();
    object.getWorldPosition(position);
    const carriage = Math.max(0, Math.min(4, Math.floor((position.z + 21) / 14)));
    const key = `${carriage}:${object.material.uuid}`;
    if (!batches.has(key)) batches.set(key, { material: object.material, objects: [], carriage });
    batches.get(key).objects.push(object);
  });
  for (const { material, objects, carriage } of batches.values()) {
    if (objects.length < 2) continue;
    const geometries = objects.map((object) =>
      object.geometry.clone().applyMatrix4(object.matrixWorld),
    );
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.receiveShadow = true;
    mesh.name = `Carriage ${carriage} static surfaces`;
    root.add(mesh);
    objects.forEach((object) => object.removeFromParent());
  }
  return {
    colliders,
    interactables,
    rooms,
    spawn: { x: 0, y: 1.68, z: 4.7 },
    update(time, dt) {
      rainMesh.position.y = -(time * 7) % 10;
      // Distant scenery slips past the windows once the investigation is underway.
      for (const tree of rain) {
        tree.position.z -= dt * 3.5;
        if (tree.position.z < -70)
          tree.position.z = -70 + ((((tree.position.z + 70) % 180) + 180) % 180);
      }
      const tunnel = time % 110 > 91 && time % 110 < 104;
      ambient.intensity = tunnel ? 0.55 : 1.25;
      moon.intensity = tunnel ? 0.06 : 0.65;
      const strike = time % 37;
      if (strike > 35.5 && strike < 35.7) moon.intensity = 3.5;
      for (let i = 0; i < lamps.length; i++)
        lamps[i].intensity =
          22 + Math.sin(time * 1.5 + i) * 0.25 + (tunnel ? Math.sin(time * 30) * 0.3 : 0);
    },
  };
}
