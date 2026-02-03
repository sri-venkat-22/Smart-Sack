import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useMouse } from '@/hooks/useMouse';

interface FloatingBoxProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  speed?: number;
  rotationIntensity?: number;
  floatIntensity?: number;
}

function FloatingBox({ 
  position, 
  size, 
  color, 
  speed = 1,
  rotationIntensity = 0.5,
  floatIntensity = 0.5 
}: FloatingBoxProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <Float
      speed={speed}
      rotationIntensity={rotationIntensity}
      floatIntensity={floatIntensity}
    >
      <mesh ref={meshRef} position={position}>
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.6}
          roughness={0.1}
          metalness={0.8}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
          <lineBasicMaterial color="#00d4ff" transparent opacity={0.4} />
        </lineSegments>
      </mesh>
    </Float>
  );
}

function CameraController() {
  const mouse = useMouse();
  
  useFrame(({ camera }) => {
    camera.position.x += (mouse.normalizedX * 0.5 - camera.position.x) * 0.02;
    camera.position.y += (mouse.normalizedY * 0.3 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

function Scene() {
  const boxes = useMemo(() => [
    { position: [-3, 2, -2] as [number, number, number], size: [0.8, 0.8, 0.8] as [number, number, number], color: '#00d4ff', speed: 1.5 },
    { position: [3, -1, -3] as [number, number, number], size: [1, 0.6, 0.8] as [number, number, number], color: '#8b5cf6', speed: 1.2 },
    { position: [0, 1.5, -4] as [number, number, number], size: [0.6, 1, 0.6] as [number, number, number], color: '#00d4ff', speed: 1.8 },
    { position: [-2, -1.5, -2.5] as [number, number, number], size: [0.7, 0.7, 1] as [number, number, number], color: '#10b981', speed: 1.3 },
    { position: [2.5, 1, -3.5] as [number, number, number], size: [0.5, 0.9, 0.5] as [number, number, number], color: '#f59e0b', speed: 1.6 },
    { position: [-1, 0, -5] as [number, number, number], size: [1.2, 0.5, 0.7] as [number, number, number], color: '#00d4ff', speed: 1.1 },
    { position: [1.5, -2, -4] as [number, number, number], size: [0.6, 0.6, 0.6] as [number, number, number], color: '#ec4899', speed: 1.4 },
    { position: [-3.5, 0.5, -4.5] as [number, number, number], size: [0.4, 0.8, 0.4] as [number, number, number], color: '#8b5cf6', speed: 1.7 },
  ], []);

  return (
    <>
      <CameraController />
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#00d4ff" />
      <pointLight position={[5, -5, 3]} intensity={0.3} color="#8b5cf6" />
      
      {boxes.map((box, i) => (
        <FloatingBox key={i} {...box} />
      ))}
      
      {/* Grid floor effect */}
      <gridHelper 
        args={[20, 20, '#1a2744', '#0f172a']} 
        position={[0, -3, 0]} 
        rotation={[0, 0, 0]}
      />
    </>
  );
}

export function FloatingBoxesCanvas() {
  return (
    <div className="absolute inset-0 -z-10 opacity-60">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
