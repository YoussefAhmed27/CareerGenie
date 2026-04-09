import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Avatar configurations

export const AVATAR_PROFILES = {
  male_standard: {
    visemeBase: 0.80,
    visemeStrong: 0.95,
    visemeOpen: 0.70,
    visemeOpenOU: 0.80, 
    jawSpeaking: 0.35,  
    jawIdle: 0.18,      
    mouthPress: 0.60,
    smileMax: 0.25,
    visemeSpeed: 20.0,
    jawSpeed: 12.0,
    decaySpeed: 10.0,
    smileSpeedIdle: 5.0
  },
  female_standard: {
    visemeBase: 0.65,
    visemeStrong: 0.75,  
    visemeOpen: 0.90,    
    visemeOpenOU: 0.90,  
    jawSpeaking: 0.10,
    jawIdle: 0.05,       
    mouthPress: 0.15,
    smileMax: 0.25,
    visemeSpeed: 15.0,
    jawSpeed: 10.0,
    decaySpeed: 10.0,
    smileSpeedIdle: 5.0
  }
};

const DEFAULT_AVATAR_URL = "./model-f2.glb";

const JAW_OPEN_VISEMES   = new Set(['viseme_aa', 'viseme_O', 'viseme_E', 'viseme_I', 'viseme_U', 'jawOpen']);
const JAW_CLOSED_VISEMES = new Set(['viseme_PP', 'viseme_FF', 'viseme_TH']);

export default function Avatar({ 
  modelUrl = DEFAULT_AVATAR_URL, 
  config = AVATAR_PROFILES.female_standard,
  analyser, 
  audioCtx, 
  scheduledVisemes, 
  onReady 
}) {
  const group = useRef();
  const { scene } = useGLTF(modelUrl);

  const dataArrayRef       = useRef(null);
  const currentViseme      = useRef(null);
  const smoothIntensityRef = useRef(0);
  const scheduledRef       = useRef([]);

  // Autonomic Blinking
  const nextBlinkAt   = useRef(2.0);
  const blinkDuration = useRef(0.12);

  // Organic Body Drift
  const headDriftX     = useRef(0);
  const headDriftY     = useRef(0);
  const headDriftTargX = useRef(0);
  const headDriftTargY = useRef(0);
  const nextDriftAt    = useRef(2.0);

  // Head Nod (Chin down)
  const headBoneRef        = useRef(null);
  const initialHeadRot     = useRef(new THREE.Euler());
  const headBoneSet        = useRef(false);
  const nodActive          = useRef(false);
  const nodStartTime       = useRef(0);
  const nodSpeedMultiplier = useRef(1.0);

  // Active Listening Micro-expressions
  const listeningTilt      = useRef(0);
  const listeningSmile     = useRef(0);
  const listeningSquint    = useRef(0);
  const nextListenActionAt = useRef(5.0); 

  // Eyebrow idle
  const browIdleTarget = useRef(0);
  const nextBrowAt     = useRef(5.0);

  // Tamed Eye Constraints
  const eyeLookTargetX = useRef(0);
  const eyeLookTargetY = useRef(0);
  const nextEyeLookAt  = useRef(4.0);
  const saccadeX       = useRef(0);
  const saccadeY       = useRef(0);
  const nextSaccadeAt  = useRef(1.0);

  useEffect(() => {
    if (!scheduledVisemes || scheduledVisemes.length === 0) {
      scheduledRef.current  = [];
      currentViseme.current = null;
      return;
    }
    const now  = audioCtx ? audioCtx.currentTime : 0;
    const copy = [...scheduledVisemes];
    let last = null;
    while (copy.length > 0 && copy[0].activateAt <= now) {
      last = copy.shift().viseme;
    }
    if (last !== null) currentViseme.current = last;
    scheduledRef.current = copy;
  }, [scheduledVisemes, audioCtx]);

  useEffect(() => { if (onReady) onReady(); }, [onReady]);

  useEffect(() => {
    if (analyser) dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
  }, [analyser]);

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isBone) {
        const name = obj.name.toLowerCase();
        if (name.includes("upperarm_l") || name.includes("leftarm"))  obj.rotation.set(THREE.MathUtils.degToRad(70), 0, 0);
        if (name.includes("upperarm_r") || name.includes("rightarm")) obj.rotation.set(THREE.MathUtils.degToRad(70), 0, 0);
        
        if (name.includes("head") && !name.includes("top") && !name.includes("end")) {
          headBoneRef.current = obj;
          initialHeadRot.current.copy(obj.rotation); 
          headBoneSet.current = true;
        }
      }
    });
  }, [scene]);

  const { meshes, blinkTargets } = useMemo(() => {
    const meshList = [];
    const blinks   = [];
    scene.traverse((obj) => {
      if (obj.isSkinnedMesh && obj.morphTargetDictionary) {
        meshList.push(obj);
        if (obj.morphTargetDictionary["eyeBlinkLeft"] !== undefined) {
          blinks.push({
            mesh:  obj,
            left:  obj.morphTargetDictionary["eyeBlinkLeft"],
            right: obj.morphTargetDictionary["eyeBlinkRight"],
          });
        }
      }
    });
    return { meshes: meshList, blinkTargets: blinks };
  }, [scene]);

  useFrame((state, delta) => {
    const safeDelta = Math.min(delta, 0.05);
    const time      = state.clock.elapsedTime;

    // audio-clock synchronization for viseme scheduling
    if (audioCtx) {
      const now = audioCtx.currentTime;
      while (scheduledRef.current.length > 0 && scheduledRef.current[0].activateAt <= now) {
        currentViseme.current = scheduledRef.current.shift().viseme;
      }
      if (scheduledRef.current.length === 0 && !currentViseme.current) {
        currentViseme.current = null;
      }
    }

    const isSpeaking = currentViseme.current !== null && currentViseme.current !== 'rest';

    let rawIntensity = 0;
    if (analyser && dataArrayRef.current) {
      analyser.getByteFrequencyData(dataArrayRef.current);
      let sum = 0;
      for (let i = 0; i < 40; i++) sum += dataArrayRef.current[i];
      const rawVolume = sum / 40;
      rawIntensity = Math.min(1, rawVolume / 50);
    }
    smoothIntensityRef.current = THREE.MathUtils.lerp(smoothIntensityRef.current, rawIntensity, 20 * safeDelta);
    const smoothIntensity = smoothIntensityRef.current;

    // Active listening micro-expressions and head nods
    if (!isSpeaking) {
      if (time > nextListenActionAt.current) {
        const actionRoll = Math.random();
        
        if (actionRoll < 0.30) { 
          nodActive.current = true;
          nodStartTime.current = time;
          nodSpeedMultiplier.current = 2.0; 
          listeningSmile.current = config.smileMax + Math.random() * 0.10; 
          listeningSquint.current = 0;
          listeningTilt.current = 0;
        } else if (actionRoll < 0.65) { 
          listeningTilt.current = (Math.random() - 0.5) * 0.08;
          listeningSquint.current = 0.15 + Math.random() * 0.1;
        } else { 
          listeningTilt.current = 0;
          listeningSquint.current = 0;
        }
        
        nextListenActionAt.current = time + 5.0 + Math.random() * 4.0;
      }

      listeningSmile.current = THREE.MathUtils.lerp(listeningSmile.current, 0, 1.2 * safeDelta);

    } else {
      listeningTilt.current = 0;
      listeningSmile.current = 0;
      listeningSquint.current = 0;
      nodSpeedMultiplier.current = 1.0; 
    }

    // Body animation for realism
    if (group.current) {
      const breatheY = Math.sin(time * 0.9) * 0.002;
      const breatheX = Math.sin(time * 0.9) * 0.005;

      if (time > nextDriftAt.current) {
        headDriftTargX.current = (Math.random() - 0.5) * 0.03;
        headDriftTargY.current = (Math.random() - 0.5) * 0.05;
        nextDriftAt.current    = time + 3.0 + Math.random() * 4.0;
      }
      
      headDriftX.current = THREE.MathUtils.lerp(headDriftX.current, headDriftTargX.current, 1.0 * safeDelta);
      headDriftY.current = THREE.MathUtils.lerp(headDriftY.current, headDriftTargY.current, 1.0 * safeDelta);

      let nodOffset = 0;
      
      if (nodActive.current) {
        const elapsed = time - nodStartTime.current;
        const dur     = 1.2 / nodSpeedMultiplier.current;
        if (elapsed < dur) {
          nodOffset = Math.sin((elapsed / dur) * Math.PI) * 0.06; 
        } else {
          nodActive.current = false;
        }
      }

      group.current.position.y = -1.6 + breatheY;
      group.current.rotation.y = headDriftY.current;
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, (Math.sin(time * 0.2) + Math.sin(time * 0.31)) * 0.003 + listeningTilt.current, 1.5 * safeDelta);
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0.04 + breatheX, 2.0 * safeDelta);

      if (headBoneRef.current && headBoneSet.current) {
        headBoneRef.current.rotation.x = THREE.MathUtils.lerp(
          headBoneRef.current.rotation.x,
          initialHeadRot.current.x + nodOffset,
          10.0 * safeDelta
        );
      }
    }

    // Morph Targets and Viseme Logic
    meshes.forEach((mesh) => {
      const meshDict = mesh.morphTargetDictionary;
      if (!meshDict) return;

      Object.keys(meshDict).forEach((key) => {
        if (key.startsWith("viseme_") || key === "jawOpen") {
          mesh.morphTargetInfluences[meshDict[key]] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[meshDict[key]], 0, config.decaySpeed * safeDelta
          );
        }
      });

      if (currentViseme.current && currentViseme.current !== 'rest' && meshDict[currentViseme.current] !== undefined) {
        let targetWeight = config.visemeBase;
        
        if (currentViseme.current === "viseme_PP" || currentViseme.current === "viseme_FF") targetWeight = config.visemeStrong;
        if (currentViseme.current === "viseme_aa" || currentViseme.current === "viseme_I" || currentViseme.current === "viseme_E") targetWeight = config.visemeOpen;
        if (currentViseme.current === "viseme_O" || currentViseme.current === "viseme_U") targetWeight = config.visemeOpenOU;
        
        const flutter = isSpeaking ? Math.random() * 0.05 : 0;
        mesh.morphTargetInfluences[meshDict[currentViseme.current]] = THREE.MathUtils.lerp(
          mesh.morphTargetInfluences[meshDict[currentViseme.current]], targetWeight + flutter, config.visemeSpeed * safeDelta
        );
      }

      if (meshDict["jawOpen"] !== undefined) {
        let jawTarget = 0;
        if (currentViseme.current && currentViseme.current !== 'rest') {
          if (JAW_CLOSED_VISEMES.has(currentViseme.current))       jawTarget = 0;
          else if (JAW_OPEN_VISEMES.has(currentViseme.current))    jawTarget = isSpeaking ? config.jawSpeaking * smoothIntensity : config.jawSpeaking * (0.30 / 0.35);
          else                                                     jawTarget = isSpeaking ? config.jawIdle * smoothIntensity : config.jawIdle * (0.15 / 0.18);
        }
        mesh.morphTargetInfluences[meshDict["jawOpen"]] = THREE.MathUtils.lerp(
          mesh.morphTargetInfluences[meshDict["jawOpen"]], jawTarget, config.jawSpeed * safeDelta
        );
      }

      const cv = currentViseme.current;
      const mouthIsOpen = cv && cv !== 'rest' && !JAW_CLOSED_VISEMES.has(cv);

      if (meshDict["mouthPressLeft"] !== undefined && meshDict["mouthPressRight"] !== undefined) {
        const pressTarget = mouthIsOpen ? (JAW_OPEN_VISEMES.has(cv) ? config.mouthPress : config.mouthPress * (0.40 / 0.60)) : 0;
        mesh.morphTargetInfluences[meshDict["mouthPressLeft"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["mouthPressLeft"]],  pressTarget, config.decaySpeed * safeDelta);
        mesh.morphTargetInfluences[meshDict["mouthPressRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["mouthPressRight"]], pressTarget, config.decaySpeed * safeDelta);
      }

      const targetSmile = isSpeaking ? 0 : listeningSmile.current;
      const smileSpeed  = isSpeaking ? 30 : config.smileSpeedIdle;

      if (meshDict["mouthSmileLeft"] !== undefined && meshDict["mouthSmileRight"] !== undefined) {
        mesh.morphTargetInfluences[meshDict["mouthSmileLeft"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["mouthSmileLeft"]], targetSmile, smileSpeed * safeDelta);
        mesh.morphTargetInfluences[meshDict["mouthSmileRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["mouthSmileRight"]], targetSmile, smileSpeed * safeDelta);
      }
      if (meshDict["mouthDimpleLeft"] !== undefined && meshDict["mouthDimpleRight"] !== undefined) {
        mesh.morphTargetInfluences[meshDict["mouthDimpleLeft"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["mouthDimpleLeft"]], targetSmile * 0.8, smileSpeed * safeDelta);
        mesh.morphTargetInfluences[meshDict["mouthDimpleRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["mouthDimpleRight"]], targetSmile * 0.8, smileSpeed * safeDelta);
      }

      if (meshDict["eyeSquintLeft"] !== undefined && meshDict["eyeSquintRight"] !== undefined) {
        mesh.morphTargetInfluences[meshDict["eyeSquintLeft"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeSquintLeft"]], listeningSquint.current, 5 * safeDelta);
        mesh.morphTargetInfluences[meshDict["eyeSquintRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeSquintRight"]], listeningSquint.current, 5 * safeDelta);
      }

      if (meshDict["browInnerUp"] !== undefined) {
        let targetBrow = 0;
        if (isSpeaking) {
          targetBrow = smoothIntensity * 0.25 * Math.max(0, Math.sin(time * 2.5));
        } else {
          if (time > nextBrowAt.current) {
            browIdleTarget.current = 0.25 + Math.random() * 0.15;
            nextBrowAt.current     = time + 5.0 + Math.random() * 8.0;
          }
          browIdleTarget.current = THREE.MathUtils.lerp(browIdleTarget.current, 0, 0.5 * safeDelta);
          targetBrow = browIdleTarget.current;
        }
        mesh.morphTargetInfluences[meshDict["browInnerUp"]] = THREE.MathUtils.lerp(
          mesh.morphTargetInfluences[meshDict["browInnerUp"]], targetBrow, 8 * safeDelta
        );
      }

      if (!isSpeaking) {
        if (meshDict["browOuterUpLeft"] !== undefined) {
          mesh.morphTargetInfluences[meshDict["browOuterUpLeft"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["browOuterUpLeft"]], Math.sin(time * 0.4) * 0.08 + 0.05, 3 * safeDelta);
        }
        if (meshDict["browOuterUpRight"] !== undefined) {
          mesh.morphTargetInfluences[meshDict["browOuterUpRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["browOuterUpRight"]], Math.sin(time * 0.4 + 0.8) * 0.08 + 0.05, 3 * safeDelta);
        }
      }

      // Eyes/head movement logic
      if (time > nextEyeLookAt.current) {
        const r = Math.random();
        
        const isActivelyFocusing = Math.abs(listeningTilt.current) > 0.01 || nodActive.current;
        
        eyeLookTargetX.current = (r < 0.85 || isActivelyFocusing) ? 0 : (Math.random() - 0.5) * 0.4;
        eyeLookTargetY.current = (r < 0.85 || isActivelyFocusing) ? 0 : (Math.random() - 0.5) * 0.2;
        nextEyeLookAt.current  = time + 3.0 + Math.random() * 5.0;
      }

      if (time > nextSaccadeAt.current) {
        saccadeX.current = (Math.random() - 0.5) * 0.05;
        saccadeY.current = (Math.random() - 0.5) * 0.05;
        nextSaccadeAt.current = time + 0.5 + Math.random() * 1.0;
      }

      const gazeCompX = -headDriftY.current * 1.0; 
      const gazeCompY = headDriftX.current * 1.0;

      const finalEyeX = eyeLookTargetX.current + saccadeX.current + gazeCompX;
      const finalEyeY = eyeLookTargetY.current + saccadeY.current + gazeCompY;

      if (meshDict["eyeLookOutLeft"] !== undefined)
        mesh.morphTargetInfluences[meshDict["eyeLookOutLeft"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookOutLeft"]],  finalEyeX < 0 ? Math.abs(finalEyeX) : 0, 15.0 * safeDelta);
      if (meshDict["eyeLookInLeft"] !== undefined)
        mesh.morphTargetInfluences[meshDict["eyeLookInLeft"]]   = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookInLeft"]],   finalEyeX > 0 ? finalEyeX : 0,           15.0 * safeDelta);
      if (meshDict["eyeLookOutRight"] !== undefined)
        mesh.morphTargetInfluences[meshDict["eyeLookOutRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookOutRight"]], finalEyeX > 0 ? finalEyeX : 0,           15.0 * safeDelta);
      if (meshDict["eyeLookInRight"] !== undefined)
        mesh.morphTargetInfluences[meshDict["eyeLookInRight"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookInRight"]],  finalEyeX < 0 ? Math.abs(finalEyeX) : 0, 15.0 * safeDelta);
      
      if (meshDict["eyeLookUpLeft"] !== undefined && meshDict["eyeLookUpRight"] !== undefined) {
        const upAmt = finalEyeY > 0 ? finalEyeY : 0;
        mesh.morphTargetInfluences[meshDict["eyeLookUpLeft"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookUpLeft"]], upAmt, 15.0 * safeDelta);
        mesh.morphTargetInfluences[meshDict["eyeLookUpRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookUpRight"]], upAmt, 15.0 * safeDelta);
      }
      if (meshDict["eyeLookDownLeft"] !== undefined && meshDict["eyeLookDownRight"] !== undefined) {
        const dnAmt = finalEyeY < 0 ? Math.abs(finalEyeY) : 0;
        mesh.morphTargetInfluences[meshDict["eyeLookDownLeft"]]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookDownLeft"]], dnAmt, 15.0 * safeDelta);
        mesh.morphTargetInfluences[meshDict["eyeLookDownRight"]] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[meshDict["eyeLookDownRight"]], dnAmt, 15.0 * safeDelta);
      }
    });

    if (time > nextBlinkAt.current + blinkDuration.current) {
      nextBlinkAt.current   = time + 2.0 + Math.random() * 4.0;
      blinkDuration.current = 0.10 + Math.random() * 0.05; 
    }
    
    const isBlinking = (time > nextBlinkAt.current && time < nextBlinkAt.current + blinkDuration.current);
    const blinkSpeed = isBlinking ? 40 : 15; 
    
    blinkTargets.forEach(({ mesh, left, right }) => {
      mesh.morphTargetInfluences[left]  = THREE.MathUtils.lerp(mesh.morphTargetInfluences[left],  isBlinking ? 1 : 0, blinkSpeed * safeDelta);
      mesh.morphTargetInfluences[right] = THREE.MathUtils.lerp(mesh.morphTargetInfluences[right], isBlinking ? 1 : 0, blinkSpeed * safeDelta);
    });
  });

  return (
    <group ref={group} dispose={null} position={[0, 1, 1.4]} rotation={[0.08, 0, 0]}>
      <primitive object={scene} scale={1.1} />
    </group>
  );
}