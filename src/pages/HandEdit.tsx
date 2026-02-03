import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Hand } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HandEdit() {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Initializing Hand Tracking...");

  useEffect(() => {
    if (!mountRef.current || !videoRef.current) return;

    // --- VARIABLES ---
    let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
    let world: CANNON.World, controls: OrbitControls;
    let boxes: any[] = [];
    let isPinching = false;
    let grabbedBody: CANNON.Body | null = null;
    let mouseConstraint: CANNON.PointToPointConstraint | null = null;
    let originalProps = { mass: 0, linearDamping: 0, angularDamping: 0 };

    const raycaster = new THREE.Raycaster();
    const mouse2D = new THREE.Vector2();

    // TUNING PARAMETERS
    const PINCH_START = 0.09;  // Slightly easier start
    const PINCH_STOP = 0.13;   // Harder stop (prevents accidental drops)
    const LERP_FACTOR = 0.25;  // Smoothness
    const MAGNET_RADIUS = 1.5; // Radius to "snap" to nearby boxes (Critical for small items)

    const currentCursorPos = new THREE.Vector3(0, 5, 0);
    const targetCursorPos = new THREE.Vector3(0, 5, 0);

    const init = async () => {
      try {
        const res = await fetch('http://localhost:8000/latest-pack');
        const data = await res.json();

        if (!data.packed_items || data.packed_items.length === 0) {
           setStatus("No packing data. Generate one first.");
           return;
        }

        const binDims = data.bin_dimensions || [10, 10, 10];
        const TRUCK_W = binDims[0];
        const TRUCK_H = binDims[1];
        const TRUCK_D = binDims[2];

        // SCENE
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, TRUCK_H * 1.5, TRUCK_D * 2.5);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        mountRef.current?.appendChild(renderer.domElement);

        // PHYSICS
        world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
        world.solver.iterations = 25;

        const concreteMat = new CANNON.Material('concrete');
        const boxMat = new CANNON.Material('box');

        world.addContactMaterial(new CANNON.ContactMaterial(concreteMat, boxMat, { friction: 0.8, restitution: 0.0 }));
        world.addContactMaterial(new CANNON.ContactMaterial(boxMat, boxMat, { friction: 0.8, restitution: 0.0 }));

        // WALLS
        const createWall = (pos: THREE.Vector3, size: THREE.Vector3, visible: boolean) => {
            if (visible) {
                const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
                const mat = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.2 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.copy(pos);
                scene.add(mesh);
            }
            const body = new CANNON.Body({ mass: 0, material: concreteMat });
            body.addShape(new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)));
            body.position.copy(pos as any);
            world.addBody(body);
        };

        const wallT = 0.5;
        const SAFETY_HEIGHT = 50;

        // Floor & Invisible Silo
        createWall(new THREE.Vector3(0, -wallT/2, 0), new THREE.Vector3(TRUCK_W, wallT, TRUCK_D), true);
        createWall(new THREE.Vector3(0, SAFETY_HEIGHT/2, -TRUCK_D/2 - wallT/2), new THREE.Vector3(TRUCK_W, SAFETY_HEIGHT, wallT), true);
        createWall(new THREE.Vector3(0, SAFETY_HEIGHT/2, TRUCK_D/2 + wallT/2), new THREE.Vector3(TRUCK_W, SAFETY_HEIGHT, wallT), false);
        createWall(new THREE.Vector3(-TRUCK_W/2 - wallT/2, SAFETY_HEIGHT/2, 0), new THREE.Vector3(wallT, SAFETY_HEIGHT, TRUCK_D), false);
        createWall(new THREE.Vector3(TRUCK_W/2 + wallT/2, SAFETY_HEIGHT/2, 0), new THREE.Vector3(wallT, SAFETY_HEIGHT, TRUCK_D), false);

        // BOXES
        data.packed_items.forEach((item: any) => {
             const [w, h, d] = item.dimensions;
             const [x, y, z] = item.position;
             const finalX = (x + w/2) - (TRUCK_W/2);
             const finalY = (y + h/2);
             const finalZ = (z + d/2) - (TRUCK_D/2);

             const color = item.fragile ? 0xff4444 : 0x00d4ff;

             // Enable emissive property for highlighting
             const mat = new THREE.MeshStandardMaterial({
                 color,
                 roughness: 0.4,
                 emissive: 0x000000,
                 emissiveIntensity: 0.5
             });
             const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
             mesh.position.set(finalX, finalY, finalZ);
             mesh.castShadow = true;
             scene.add(mesh);

             mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0x000000 })));

             const body = new CANNON.Body({
                 mass: 5,
                 material: boxMat,
                 linearDamping: 0.2,
                 angularDamping: 0.2
             });
             body.addShape(new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2)));
             body.position.set(finalX, finalY, finalZ);
             body.sleepSpeedLimit = 0.5;
             world.addBody(body);
             boxes.push({ mesh, body });
        });

        const jointBody = new CANNON.Body({ mass: 0 });
        jointBody.collisionFilterGroup = 0;
        jointBody.collisionFilterMask = 0;
        world.addBody(jointBody);

        // CURSOR
        const cursorMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.3),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthTest: false })
        );
        cursorMesh.renderOrder = 999;
        scene.add(cursorMesh);

        // LIGHTS
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirL = new THREE.DirectionalLight(0xffffff, 1);
        dirL.position.set(10, 20, 10);
        dirL.castShadow = true;
        scene.add(dirL);

        // --- MEDIAPIPE ---
        const onResults = (results: any) => {
             setLoading(false);

             // 1. Reset Highlights
             boxes.forEach(b => {
                 if (b.body !== grabbedBody) { // Don't un-highlight the one we are holding
                     b.mesh.material.emissive.setHex(0x000000);
                 }
             });

             if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                  setStatus("Hand Active");
                  const lm = results.multiHandLandmarks[0];
                  const indexTip = lm[8];
                  const thumbTip = lm[4];

                  const midX = (indexTip.x + thumbTip.x) / 2;
                  const midY = (indexTip.y + thumbTip.y) / 2;

                  mouse2D.x = (1 - midX) * 2 - 1;
                  mouse2D.y = -(midY) * 2 + 1;

                  // Target Calculation
                  const distance = camera.position.distanceTo(new THREE.Vector3(0, TRUCK_H/2, 0));
                  const cursorPos = new THREE.Vector3(mouse2D.x, mouse2D.y, 0.5).unproject(camera);
                  const dir = cursorPos.sub(camera.position).normalize();
                  const rawTarget = camera.position.clone().add(dir.multiplyScalar(distance));

                  // Constrain Cursor
                  const wallPad = 0.5;
                  targetCursorPos.x = Math.max(-TRUCK_W/2 + wallPad, Math.min(TRUCK_W/2 - wallPad, rawTarget.x));
                  targetCursorPos.y = Math.max(0, Math.min(TRUCK_H * 3, rawTarget.y));
                  targetCursorPos.z = Math.max(-TRUCK_D/2 + wallPad, Math.min(TRUCK_D/2 - wallPad, rawTarget.z));

                  // Pinch Distance
                  const dist = Math.sqrt(Math.pow(indexTip.x - thumbTip.x, 2) + Math.pow(indexTip.y - thumbTip.y, 2));
                  const threshold = isPinching ? PINCH_STOP : PINCH_START;

                  // --- IMPROVED SELECTION LOGIC ---
                  let potentialGrab = null;

                  // Priority 1: Accurate Raycast
                  raycaster.setFromCamera(mouse2D, camera);
                  const intersects = raycaster.intersectObjects(boxes.map(b => b.mesh));
                  if (intersects.length > 0) {
                      potentialGrab = boxes.find(b => b.mesh === intersects[0].object);
                  }

                  // Priority 2: Magnetic Proximity (Fallback if raycast fails)
                  // This is crucial for small blocks
                  if (!potentialGrab) {
                      let closestDist = MAGNET_RADIUS;
                      boxes.forEach(b => {
                          const distToBox = targetCursorPos.distanceTo(b.mesh.position);
                          if (distToBox < closestDist) {
                              closestDist = distToBox;
                              potentialGrab = b;
                          }
                      });
                  }

                  // Highlight Potential Grab
                  if (potentialGrab && !grabbedBody) {
                      potentialGrab.mesh.material.emissive.setHex(0x444444); // Dark gray glow
                      document.body.style.cursor = 'pointer';
                      cursorMesh.material.color.set(0xffff00); // Yellow
                  } else {
                      document.body.style.cursor = 'default';
                      cursorMesh.material.color.set(0xffffff); // White
                  }

                  // --- GRAB / RELEASE LOGIC ---
                  if (dist < threshold) {
                      if (!isPinching) {
                          // START PINCH
                          isPinching = true;
                          cursorMesh.scale.set(0.7, 0.7, 0.7);

                          if (potentialGrab) {
                              grabbedBody = potentialGrab.body;
                              grabbedBody!.wakeUp();

                              // Highlight grabbed object (Green glow)
                              potentialGrab.mesh.material.emissive.setHex(0x004400);

                              originalProps.mass = grabbedBody!.mass;
                              originalProps.linearDamping = grabbedBody!.linearDamping;
                              originalProps.angularDamping = grabbedBody!.angularDamping;

                              // PHYSICS: Lock it down
                              grabbedBody!.mass = 0.5;
                              grabbedBody!.linearDamping = 0.99;
                              grabbedBody!.angularDamping = 0.99;
                              grabbedBody!.updateMassProperties();

                              jointBody.position.copy(grabbedBody!.position);

                              mouseConstraint = new CANNON.PointToPointConstraint(
                                  grabbedBody!, new CANNON.Vec3(0,0,0),
                                  jointBody, new CANNON.Vec3(0,0,0)
                              );
                              world.addConstraint(mouseConstraint);
                          }
                      }
                  } else {
                      if (isPinching) {
                          // RELEASE
                          isPinching = false;
                          cursorMesh.scale.set(1, 1, 1);

                          if (mouseConstraint) {
                              world.removeConstraint(mouseConstraint);
                              mouseConstraint = null;
                          }
                          if (grabbedBody) {
                              // Reset physics
                              grabbedBody.mass = originalProps.mass;
                              grabbedBody.linearDamping = 0.2;
                              grabbedBody.angularDamping = 0.2;
                              grabbedBody.updateMassProperties();
                              grabbedBody.wakeUp();
                              grabbedBody = null;
                          }
                      }
                  }

             } else {
                 setStatus("Show Hand to Edit");
             }
        };

        const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        hands.onResults(onResults);

        const cameraFeed = new Camera(videoRef.current!, {
             onFrame: async () => { if (videoRef.current) await hands.send({ image: videoRef.current }); },
             width: 1280, height: 720
        });
        cameraFeed.start();

        const animate = () => {
             requestAnimationFrame(animate);
             currentCursorPos.lerp(targetCursorPos, LERP_FACTOR);

             jointBody.position.set(currentCursorPos.x, currentCursorPos.y, currentCursorPos.z);
             cursorMesh.position.copy(currentCursorPos);

             world.step(1/60);

             boxes.forEach(b => {
                 b.mesh.position.copy(b.body.position);
                 b.mesh.quaternion.copy(b.body.quaternion);

                 if (b.body.position.y < -5) {
                     b.body.position.set(0, TRUCK_H + 2, 0);
                     b.body.velocity.set(0,0,0);
                     b.body.angularVelocity.set(0,0,0);
                 }
             });

             if (grabbedBody && isPinching) {
                 grabbedBody.angularVelocity.set(0,0,0);
                 grabbedBody.quaternion.set(0,0,0,1);
                 cursorMesh.material.color.set(0x00ff00); // Green when holding
             }
             renderer.render(scene, camera);
        };
        animate();

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

      } catch (e) {
        console.error(e);
        setStatus("Error loading environment");
      }
    };
    init();
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
       <video ref={videoRef} className="hidden" />
       <div ref={mountRef} className="absolute inset-0 z-0" />

       <div className="absolute top-0 left-0 p-6 z-10 w-full pointer-events-none flex justify-between">
           <div>
               <h1 className="text-white text-2xl font-bold drop-shadow-md">Hand Edit Mode</h1>
               <div className={`mt-2 inline-flex items-center px-4 py-2 rounded-full border ${loading ? 'border-yellow-500 text-yellow-500' : 'border-primary text-primary'} bg-black/80 backdrop-blur-md`}>
                   {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                   <span className="font-mono font-bold text-sm">{status}</span>
               </div>
           </div>
           <div className="pointer-events-auto">
               <Button variant="secondary" onClick={() => navigate('/workspace')}>
                   <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workspace
               </Button>
           </div>
       </div>

       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/60 px-6 py-3 rounded-full border border-white/20 backdrop-blur-md pointer-events-none flex items-center gap-4">
           <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-white block"></span> Idle
           </div>
           <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-yellow-400 block"></span> Hover (Pinch Now)
           </div>
           <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-green-500 block"></span> Holding
           </div>
       </div>
    </div>
  );
}