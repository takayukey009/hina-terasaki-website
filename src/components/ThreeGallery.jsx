import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { client } from '../lib/microcms';
import { Camera, Video } from 'lucide-react';

// --- 1. Hand Input Component (MediaPipe) ---
const HandInput = ({ onScroll, active, setCameraStatus }) => {
    const videoRef = useRef(null);
    const previousYRef = useRef(null);
    const isPinchingRef = useRef(false);
    const [isPinching, setIsPinching] = useState(false);

    useEffect(() => {
        if (!active) return;

        let hands;
        let camera;

        const onResults = (results) => {
            setCameraStatus('active');

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                const landmarks = results.multiHandLandmarks[0];

                // ピンチ判定 (親指:4 と 人差し指:8 の距離)
                const thumb = landmarks[4];
                const index = landmarks[8];
                const distance = Math.sqrt(Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2));

                const pinching = distance < 0.1;

                if (pinching && !isPinchingRef.current) {
                    previousYRef.current = thumb.y;
                }
                isPinchingRef.current = pinching;
                setIsPinching(pinching);

                if (pinching && previousYRef.current !== null) {
                    const currentY = thumb.y;
                    const deltaY = currentY - previousYRef.current;
                    const sensitivity = 8.0;
                    onScroll(deltaY * sensitivity);
                    previousYRef.current = currentY;
                } else {
                    previousYRef.current = null;
                }
            }
        };

        const initMediaPipe = async () => {
            setCameraStatus('loading');
            try {
                const { Hands } = await import('@mediapipe/hands');
                const { Camera: MPCamera } = await import('@mediapipe/camera_utils');

                hands = new Hands({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
                });

                hands.setOptions({
                    maxNumHands: 1,
                    modelComplexity: 0,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5,
                });

                hands.onResults(onResults);

                if (videoRef.current) {
                    camera = new MPCamera(videoRef.current, {
                        onFrame: async () => {
                            if (videoRef.current) await hands.send({ image: videoRef.current });
                        },
                        width: 320,
                        height: 240,
                        facingMode: 'user'
                    });
                    camera.start();
                }
            } catch (e) {
                console.error("MediaPipe Init Error:", e);
                setCameraStatus('error');
            }
        };

        initMediaPipe();

        return () => {
            if (camera) camera.stop();
            if (hands) hands.close();
        };
    }, [active, onScroll, setCameraStatus]);

    return (
        <div className={`absolute top-20 right-4 z-50 transition-opacity duration-500 ${active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <div className="relative w-32 h-24 bg-black/50 rounded-lg overflow-hidden border border-white/20">
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover -scale-x-100" playsInline muted />
                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full transition-all ${isPinching ? 'bg-green-500 shadow-[0_0_10px_#0f0]' : 'bg-red-500'}`} />
                <div className="absolute bottom-1 w-full text-center text-[8px] text-white/70">
                    PINCH TO SCROLL
                </div>
            </div>
        </div>
    );
};


// --- 2. Config & Layout ---
const CONFIG = {
    count: 12,
    cameraZ: 14,
    focusDist: 3.5,
    mobileBreakpoint: 768,
};

const getLayoutTarget = (index, total, layoutName, isMobile, scrollVal) => {
    const t = index / total;
    const theta = t * Math.PI * 2;
    const xMult = isMobile ? 0.6 : 1.0;

    let pos = new THREE.Vector3();
    let rot = new THREE.Euler();

    switch (layoutName) {
        case 'corridor':
            const spread = isMobile ? 1.8 : 3.0;
            pos.set((index % 2 ? 1 : -1) * spread, -index * 3.5 + scrollVal, 0);
            rot.set(0, index % 2 ? -0.2 : 0.2, 0);
            break;

        case 'ring':
            const r = isMobile ? 6 : 9;
            const ringOffset = scrollVal * 0.2;
            const ringTheta = theta + ringOffset;
            pos.set(Math.cos(ringTheta) * r, 0, Math.sin(ringTheta) * r);
            rot.set(0, -ringTheta + Math.PI / 2, 0);
            break;

        case 'spiral':
            const sr = 4 * xMult;
            const sa = index * 0.6;
            const spiralY = (index - total / 2) * 1.5 + scrollVal * 0.5;
            pos.set(Math.cos(sa) * sr, spiralY, Math.sin(sa) * sr);
            rot.set(0, -sa, 0);
            break;

        case 'heart':
            const sc = 0.3 * xMult;
            const heartOffset = scrollVal * 0.2;
            const heartTheta = theta + heartOffset;

            const hx = 16 * Math.pow(Math.sin(heartTheta), 3);
            const hy = 13 * Math.cos(heartTheta) - 5 * Math.cos(2 * heartTheta) - 2 * Math.cos(3 * heartTheta) - Math.cos(4 * heartTheta);

            pos.set(hx * sc, hy * sc, (index - total / 2) * 0.2);
            rot.set(0, 0, 0);
            break;

        default:
            break;
    }
    return { pos, rot };
};


// --- 3. 3D Components ---

const Photo = ({ index, total, layout, texture, focusedId, setFocusedId, scrollRef }) => {
    const meshRef = useRef();
    const { size, camera } = useThree();
    const isMobile = size.width < CONFIG.mobileBreakpoint;
    const isFocused = focusedId === index;

    const aspect = texture.image ? texture.image.width / texture.image.height : 1;
    const h = 3.2;
    const w = h * aspect;

    useFrame((state) => {
        if (!meshRef.current) return;

        let targetPos = new THREE.Vector3();
        let targetRot = new THREE.Euler();
        let targetScale = new THREE.Vector3(1, 1, 1);

        if (isFocused) {
            const dist = CONFIG.focusDist;
            targetPos.set(0, 0, camera.position.z - dist);
            targetRot.set(0, 0, 0);

            const vFov = (camera.fov * Math.PI) / 180;
            const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
            const visibleWidth = visibleHeight * (size.width / size.height);

            const scaleH = (visibleHeight * 0.85) / h;
            const scaleW = (visibleWidth * 0.85) / w;
            const s = Math.min(scaleH, scaleW);
            targetScale.set(s, s, s);

        } else {
            const currentScroll = scrollRef.current;

            const L = getLayoutTarget(index, total, layout, isMobile, currentScroll);

            targetPos.copy(L.pos);
            targetRot.copy(L.rot);

            const time = state.clock.elapsedTime;
            targetPos.y += Math.sin(time * 2 + index) * 0.1;
            targetRot.z += Math.cos(time + index) * 0.02;

            const px = state.pointer.x;
            const py = state.pointer.y;

            targetPos.x += px * 0.5;
            targetPos.y += py * 0.5;

            targetRot.x -= py * 0.2;
            targetRot.y += px * 0.2;
        }

        const smooth = isFocused ? 0.15 : 0.08;
        meshRef.current.position.lerp(targetPos, smooth);

        meshRef.current.rotation.x += (targetRot.x - meshRef.current.rotation.x) * smooth;
        meshRef.current.rotation.y += (targetRot.y - meshRef.current.rotation.y) * smooth;
        meshRef.current.rotation.z += (targetRot.z - meshRef.current.rotation.z) * smooth;

        meshRef.current.scale.lerp(targetScale, smooth);
    });

    return (
        <mesh
            ref={meshRef}
            onClick={(e) => {
                e.stopPropagation();
                setFocusedId(isFocused ? null : index);
            }}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}
        >
            <planeGeometry args={[w, h]} />
            {isFocused ? (
                <meshBasicMaterial
                    map={texture}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                />
            ) : (
                <meshStandardMaterial
                    map={texture}
                    roughness={0.4}
                    metalness={0.1}
                    side={THREE.DoubleSide}
                />
            )}
        </mesh>
    );
};

const Particles = () => {
    const { size } = useThree();
    const isMobile = size.width < CONFIG.mobileBreakpoint;
    const num = isMobile ? 600 : 1500;

    const points = useMemo(() => {
        const p = new Float32Array(num * 3);
        for (let i = 0; i < num; i++) {
            p[i * 3] = (Math.random() - 0.5) * 30;
            p[i * 3 + 1] = (Math.random() - 0.5) * 40;
            p[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        return p;
    }, [num]);

    const ref = useRef();

    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime * 0.05;
        }
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={num}
                    array={points}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                color="#ffffff"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

const Blackout = ({ active }) => {
    const ref = useRef();
    const { camera } = useThree();

    useFrame(() => {
        if (ref.current) {
            ref.current.position.copy(camera.position);
            ref.current.position.z -= 5;
            const targetOp = active ? 0.95 : 0.0;
            ref.current.material.opacity += (targetOp - ref.current.material.opacity) * 0.1;
            ref.current.visible = ref.current.material.opacity > 0.01;
        }
    });

    return (
        <mesh ref={ref}>
            <planeGeometry args={[100, 100]} />
            <meshBasicMaterial color="#000" transparent opacity={0} />
        </mesh>
    );
}

const Scene = ({ layout, textures, focusedId, setFocusedId, scrollRef }) => {
    return (
        <>
            <ambientLight intensity={0.5} />
            <spotLight position={[0, 15, 20]} angle={0.5} penumbra={1} intensity={80} castShadow />
            <pointLight position={[0, 0, 10]} intensity={2} color="white" />
            <fogExp2 attach="fog" args={['#000000', 0.02]} />

            <group>
                {textures.map((tex, i) => (
                    <Photo
                        key={i}
                        index={i}
                        total={textures.length}
                        layout={layout}
                        texture={tex}
                        focusedId={focusedId}
                        setFocusedId={setFocusedId}
                        scrollRef={scrollRef}
                    />
                ))}
            </group>

            <Particles />
            <Blackout active={focusedId !== null} />
        </>
    );
};

// --- 4. Main Component ---

export default function ThreeGallery() {
    const [layout, setLayout] = useState('corridor');
    const [textures, setTextures] = useState([]);
    const [focusedId, setFocusedId] = useState(null);

    // Hand Camera Control
    const [useCamera, setUseCamera] = useState(false);
    const [cameraStatus, setCameraStatus] = useState('idle');

    // Refs
    const scrollRef = useRef(0);
    const velocityRef = useRef(0);
    const isDraggingRef = useRef(false);
    const lastYRef = useRef(0);

    // Load images from microCMS
    useEffect(() => {
        const fetchImages = async () => {
            try {
                const data = await client.get({ endpoint: 'gallery', queries: { limit: 50 } });
                if (data.contents && data.contents.length > 0) {
                    const loader = new THREE.TextureLoader();
                    const loadedTextures = await Promise.all(data.contents.map(item => {
                        return new Promise((resolve) => {
                            if (item.image && item.image.url) {
                                loader.load(item.image.url, (tex) => {
                                    tex.colorSpace = THREE.SRGBColorSpace;
                                    resolve(tex);
                                });
                            } else {
                                resolve(null);
                            }
                        });
                    }));
                    setTextures(loadedTextures.filter(t => t !== null));
                }
            } catch (err) {
                console.error("Gallery fetch error:", err);
            }
        };
        fetchImages();
    }, []);

    // Momentum Loop
    useEffect(() => {
        let anim;
        const loop = () => {
            if (!isDraggingRef.current) {
                const autoSpeed = 0.005;
                scrollRef.current += autoSpeed;

                scrollRef.current += velocityRef.current;
                velocityRef.current *= 0.95;

                if (Math.abs(velocityRef.current) < 0.001) {
                    velocityRef.current = 0;
                }
            }
            anim = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(anim);
    }, []);

    // Hand Scroll Callback
    const handleHandScroll = useCallback((delta) => {
        scrollRef.current += delta;
        velocityRef.current = delta;

        isDraggingRef.current = true;
        if (window.handDragTimeout) clearTimeout(window.handDragTimeout);
        window.handDragTimeout = setTimeout(() => {
            isDraggingRef.current = false;
        }, 100);
    }, []);

    // Mouse/Touch Handlers
    const handleWheel = (e) => {
        if (focusedId !== null) return;
        const sensitivity = layout === 'ring' || layout === 'heart' ? 0.005 : 0.02;
        velocityRef.current += e.deltaY * sensitivity;
        velocityRef.current = Math.max(Math.min(velocityRef.current, 0.5), -0.5);
    };

    const handleTouchStart = (e) => {
        if (focusedId !== null) return;
        isDraggingRef.current = true;
        lastYRef.current = e.touches[0].clientY;
        velocityRef.current = 0;
    };

    const handleTouchMove = (e) => {
        if (focusedId !== null || !isDraggingRef.current) return;
        const currentY = e.touches[0].clientY;
        const deltaY = lastYRef.current - currentY;
        lastYRef.current = currentY;

        const sensitivity = layout === 'ring' || layout === 'heart' ? 0.01 : 0.05;
        scrollRef.current += deltaY * sensitivity;

        velocityRef.current = deltaY * sensitivity;
    };

    const handleTouchEnd = () => {
        isDraggingRef.current = false;
    };

    return (
        <div
            style={{ width: '100%', height: '100%', background: '#000', overflow: 'hidden', position: 'relative' }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Camera Toggle Button */}
            <button
                onClick={() => setUseCamera(!useCamera)}
                className={`absolute top-4 right-4 z-40 p-3 rounded-full backdrop-blur-md transition-all border ${useCamera
                        ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                        : 'bg-white/10 border-white/20 text-white/50 hover:bg-white/20'
                    }`}
                title={useCamera ? 'カメラOFF' : 'ハンドジェスチャーON'}
            >
                {useCamera ? <Video size={20} /> : <Camera size={20} />}
            </button>

            {/* Hand Controller */}
            <HandInput
                active={useCamera}
                onScroll={handleHandScroll}
                setCameraStatus={setCameraStatus}
            />

            {/* Camera Status Indicator */}
            {useCamera && cameraStatus === 'loading' && (
                <div className="absolute top-20 right-4 z-50 text-xs text-white/50 bg-black/50 px-3 py-2 rounded">
                    カメラ準備中...
                </div>
            )}
            {useCamera && cameraStatus === 'error' && (
                <div className="absolute top-20 right-4 z-50 text-xs text-red-400 bg-black/50 px-3 py-2 rounded">
                    カメラエラー
                </div>
            )}

            {/* Layout Buttons */}
            <div style={{ position: 'absolute', bottom: 30, left: 0, width: '100%', zIndex: 10, display: focusedId !== null ? 'none' : 'flex', justifyContent: 'center', gap: '15px' }}>
                {['corridor', 'heart', 'ring', 'spiral'].map(l => (
                    <button
                        key={l}
                        onClick={() => {
                            setLayout(l);
                            scrollRef.current = 0;
                            velocityRef.current = 0;
                        }}
                        style={{
                            background: layout === l ? 'white' : 'rgba(255,255,255,0.1)',
                            color: layout === l ? 'black' : 'white',
                            border: 'none', width: '50px', height: '50px', borderRadius: '25px',
                            fontSize: '20px', cursor: 'pointer', transition: 'all 0.3s'
                        }}
                    >
                        {l === 'corridor' ? '||' : l === 'heart' ? '♥' : l === 'ring' ? '◎' : '§'}
                    </button>
                ))}
            </div>

            {/* Focus Close Button */}
            {focusedId !== null && (
                <div
                    onClick={() => setFocusedId(null)}
                    style={{
                        position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
                        width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: 'white',
                        zIndex: 20, cursor: 'pointer', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)'
                    }}
                >
                    ×
                </div>
            )}

            {/* 3D Canvas */}
            <Canvas
                camera={{ position: [0, 0, CONFIG.cameraZ], fov: 50 }}
                dpr={[1, 2]}
                gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
            >
                <Scene
                    layout={layout}
                    textures={textures}
                    focusedId={focusedId}
                    setFocusedId={setFocusedId}
                    scrollRef={scrollRef}
                />
            </Canvas>
        </div>
    );
}
