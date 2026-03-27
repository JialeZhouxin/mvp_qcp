import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import * as THREE from "three";

type BlochSphereCoordinateProps =
  | {
      readonly coordinateMode: "spherical";
      readonly theta: number;
      readonly phi: number;
    }
  | {
      readonly coordinateMode: "cartesian";
      readonly x: number;
      readonly y: number;
      readonly z: number;
    };

interface BlochSphere3DProps extends BlochSphereCoordinateProps {
  readonly accentColor?: string;
}

interface SceneVector {
  readonly scene: readonly [number, number, number];
  readonly bloch: readonly [number, number, number];
}

const LABEL_STYLE: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.45)",
  background: "rgba(8, 15, 28, 0.88)",
  color: "#e2e8f0",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.02em",
  whiteSpace: "nowrap",
  boxShadow: "0 8px 18px rgba(8, 15, 28, 0.38)",
  pointerEvents: "none",
};

function buildCirclePoints(plane: "xy" | "xz" | "yz", radius = 1, segments = 96) {
  const points: [number, number, number][] = [];

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const cosine = Math.cos(angle) * radius;
    const sine = Math.sin(angle) * radius;

    if (plane === "xy") {
      points.push([cosine, sine, 0]);
      continue;
    }
    if (plane === "xz") {
      points.push([cosine, 0, sine]);
      continue;
    }
    points.push([0, cosine, sine]);
  }

  return points;
}

function clampMagnitude(x: number, y: number, z: number): readonly [number, number, number] {
  const magnitude = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  if (magnitude <= 1 || magnitude === 0) {
    return [x, y, z];
  }
  const scale = 1 / magnitude;
  return [x * scale, y * scale, z * scale];
}

function toSceneVector(props: BlochSphereCoordinateProps): SceneVector {
  if (props.coordinateMode === "spherical") {
    const x = Math.sin(props.theta) * Math.cos(props.phi);
    const y = Math.sin(props.theta) * Math.sin(props.phi);
    const z = Math.cos(props.theta);
    return {
      bloch: [x, y, z],
      scene: [y, z, x],
    };
  }

  const [x, y, z] = clampMagnitude(props.x, props.y, props.z);
  return {
    bloch: [x, y, z],
    scene: [y, z, x],
  };
}

function SceneLabel({
  position,
  text,
}: {
  readonly position: readonly [number, number, number];
  readonly text: string;
}) {
  return (
    <Html position={[position[0], position[1], position[2]]} center>
      <span style={LABEL_STYLE}>{text}</span>
    </Html>
  );
}

function StateVectorArrow({
  endpoint,
  color,
}: {
  readonly endpoint: readonly [number, number, number];
  readonly color: string;
}) {
  const [x, y, z] = endpoint;
  const length = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  const direction = useMemo(() => {
    if (length <= 1e-6) {
      return new THREE.Vector3(0, 1, 0);
    }
    return new THREE.Vector3(x / length, y / length, z / length);
  }, [length, x, y, z]);
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction),
    [direction],
  );
  const shaftLength = Math.max(length - 0.16, 0);
  const shaftPosition: [number, number, number] =
    length <= 1e-6
      ? [0, 0, 0]
      : [direction.x * (shaftLength / 2), direction.y * (shaftLength / 2), direction.z * (shaftLength / 2)];
  const headPosition: [number, number, number] =
    length <= 1e-6
      ? [0, 0, 0]
      : [
          direction.x * Math.max(length - 0.08, 0),
          direction.y * Math.max(length - 0.08, 0),
          direction.z * Math.max(length - 0.08, 0),
        ];

  return (
    <group>
      {shaftLength > 0 ? (
        <mesh position={shaftPosition} quaternion={quaternion}>
          <cylinderGeometry args={[0.014, 0.014, shaftLength, 20]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} />
        </mesh>
      ) : null}
      {length > 1e-6 ? (
        <mesh position={headPosition} quaternion={quaternion}>
          <coneGeometry args={[0.055, 0.16, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.15} />
        </mesh>
      ) : null}
      <mesh position={[x, y, z]}>
        <sphereGeometry args={[length > 1e-6 ? 0.038 : 0.05, 18, 18]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[x, y, z]}>
        <sphereGeometry args={[length > 1e-6 ? 0.09 : 0.11, 18, 18]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function BlochScene({ accentColor, ...props }: BlochSphere3DProps) {
  const sceneVector = toSceneVector(props);

  return (
    <>
      <color attach="background" args={["#07111f"]} />
      <ambientLight intensity={0.55} />
      <pointLight position={[2.2, 2.4, 2.6]} intensity={2.1} color="#e2e8f0" />

      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#d1d5db" wireframe transparent opacity={0.3} />
      </mesh>

      <Line points={buildCirclePoints("xy")} color="#94a3b8" transparent opacity={0.55} lineWidth={1.1} />
      <Line points={buildCirclePoints("xz")} color="#94a3b8" transparent opacity={0.45} lineWidth={1} />
      <Line points={buildCirclePoints("yz")} color="#94a3b8" transparent opacity={0.45} lineWidth={1} />

      <Line points={[[-1.15, 0, 0], [1.15, 0, 0]]} color="#cbd5e1" transparent opacity={0.6} lineWidth={1.2} />
      <Line points={[[0, -1.15, 0], [0, 1.15, 0]]} color="#cbd5e1" transparent opacity={0.6} lineWidth={1.2} />
      <Line points={[[0, 0, -1.15], [0, 0, 1.15]]} color="#cbd5e1" transparent opacity={0.6} lineWidth={1.2} />

      <SceneLabel position={[0, 1.22, 0]} text={"|0⟩"} />
      <SceneLabel position={[0, -1.22, 0]} text={"|1⟩"} />
      <SceneLabel position={[0, 0, 1.22]} text={"|+⟩"} />
      <SceneLabel position={[0, 0, -1.22]} text={"|-⟩"} />
      <SceneLabel position={[1.22, 0, 0]} text={"|i⟩"} />
      <SceneLabel position={[-1.22, 0, 0]} text={"|-i⟩"} />

      <StateVectorArrow endpoint={sceneVector.scene} color={accentColor ?? "#06b6d4"} />

      <OrbitControls enablePan={false} minDistance={2.2} maxDistance={6.4} />
    </>
  );
}

function BlochSphere3D(props: BlochSphere3DProps) {
  return (
    <div data-testid="bloch-sphere-3d-shell" style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [2.15, 1.85, 2.5], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: "100%", height: "100%" }}
      >
        <BlochScene {...props} />
      </Canvas>
    </div>
  );
}

export default BlochSphere3D;
