import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, Html } from '@react-three/drei';
import Avatar from './Avatar';
import ErrorBoundary from './ErrorBoundary';

function Loader() {
  return (
    <Html center>
      <div style={{ color: 'white', background: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: '20px' }}>
        Loading Studio...
      </div>
    </Html>
  );
}

export default function Experience({ analyser, scheduledVisemes, audioCtx, onReady, modelUrl, config }) {
  return (
    <div style={{ 
      width: '100%', height: '100%',
      backgroundImage: 'url(/office.png)',
      backgroundSize: 'cover', backgroundPosition: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)' }} />

      <Canvas shadows gl={{ alpha: true }} camera={{ position: [0, 0.2, 2.6], fov: 50}} resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}>
        <Environment preset="apartment" />
        <directionalLight position={[-2, 2, 5]} intensity={1.2} />
        <spotLight position={[5, 5, -5]} intensity={2} color="#badeff" />

        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <group position={[0, -0.1, 0]}>
              <Avatar
                key={modelUrl}
                analyser={analyser}
                scheduledVisemes={scheduledVisemes}
                audioCtx={audioCtx}
                onReady={onReady}
                modelUrl={modelUrl}
                config={config}
              />
            </group>
          </Suspense>
        </ErrorBoundary>

        <OrbitControls
          makeDefault enableZoom={true} enablePan={false}
          minPolarAngle={Math.PI / 2.2} maxPolarAngle={Math.PI / 1.8}
          minAzimuthAngle={-Math.PI / 4} maxAzimuthAngle={Math.PI / 4}
          target={[0, 0.2, 0]}
        />
      </Canvas>
    </div>
  );
}