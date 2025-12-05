import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { client } from '../lib/microcms';

// コンフィグ
const CONFIG = {
    count: 12,
    cameraZ: 14,
    focusDist: 3.5,
    mobileBreakpoint: 768,
};

// --- 1. Layout Math (The Antigravity Logic) ---
// レイアウトごとの目標座標を計算する関数
const getLayoutTarget = (index, total, layoutName, isMobile, scrollVal) => {
    const t = index / total;
    const theta = t * Math.PI * 2;
    const xMult = isMobile ? 0.6 : 1.0; // モバイル用縮小係数

    let pos = new THREE.Vector3();
    let rot = new THREE.Euler();

    switch (layoutName) {
        case 'corridor':
            const spread = isMobile ? 1.8 : 3.0;
            // Scroll moves items vertically
            pos.set((index % 2 ? 1 : -1) * spread, -index * 3.5 + scrollVal, 0);
            rot.set(0, index % 2 ? -0.2 : 0.2, 0);
            break;

        case 'ring':
            const r = isMobile ? 6 : 9;
            // Scroll rotates the ring
            const ringOffset = scrollVal * 0.2;
            const ringTheta = theta + ringOffset;
            pos.set(Math.cos(ringTheta) * r, 0, Math.sin(ringTheta) * r);
            rot.set(0, -ringTheta + Math.PI / 2, 0);
            break;

        case 'spiral':
            const sr = 4 * xMult;
            const sa = index * 0.6;
            // Scroll moves spiral vertically
            const spiralY = (index - total / 2) * 1.5 + scrollVal * 0.5;
            pos.set(Math.cos(sa) * sr, spiralY, Math.sin(sa) * sr);
            rot.set(0, -sa, 0);
            break;

        case 'heart':
            const sc = 0.3 * xMult;
            // Scroll rotates the heart
            const heartOffset = scrollVal * 0.2;
            const heartTheta = theta + heartOffset;

            const hx = 16 * Math.pow(Math.sin(heartTheta), 3);
            const hy = 13 * Math.cos(heartTheta) - 5 * Math.cos(2 * heartTheta) - 2 * Math.cos(3 * heartTheta) - Math.cos(4 * heartTheta);

            pos.set(hx * sc, hy * sc, (index - total / 2) * 0.2);
            // Rotate to face center roughly or just keep front
            rot.set(0, 0, 0);
            break;

        default:
            break;
    }
    return { pos, rot };
};


// --- 2. Components ---

// 個別の写真コンポーネント (The Floating Photo)
const Photo = ({ index, total, layout, texture, focusedId, setFocusedId, scrollRef }) => {
    const meshRef = useRef();
    const { size, camera } = useThree();
    const isMobile = size.width < CONFIG.mobileBreakpoint;
    const isFocused = focusedId === index;

    // アスペクト比の計算
    const aspect = texture.image ? texture.image.width / texture.image.height : 1;
    const h = 3.2;
    const w = h * aspect;

    // アニメーションループ (毎フレーム実行)
    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // A. 目標位置の計算
        let targetPos = new THREE.Vector3();
        let targetRot = new THREE.Euler();
        let targetScale = new THREE.Vector3(1, 1, 1);

        if (isFocused) {
            // --- FOCUS MODE (Antigravity Lock) ---
            // カメラの目の前に固定
            const dist = CONFIG.focusDist;
            targetPos.set(0, 0, camera.position.z - dist);
            targetRot.set(0, 0, 0);

            // 画面フィット計算
            const vFov = (camera.fov * Math.PI) / 180;
            const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
            const visibleWidth = visibleHeight * (size.width / size.height);

            const scaleH = (visibleHeight * 0.85) / h;
            const scaleW = (visibleWidth * 0.85) / w;
            const s = Math.min(scaleH, scaleW);
            targetScale.set(s, s, s);

        } else {
            // --- NORMAL MODE (Floating Layout) ---
            // 現在のスクロール値を取得
            const currentScroll = scrollRef.current;

            const L = getLayoutTarget(index, total, layout, isMobile, currentScroll);

            targetPos.copy(L.pos);
            targetRot.copy(L.rot);

            // ★ Antigravity Effect (浮遊感)
            const time = state.clock.elapsedTime;
            targetPos.y += Math.sin(time * 2 + index) * 0.1;
            targetRot.z += Math.cos(time + index) * 0.02;

            // ★ Parallax Effect (マウス/タッチ連動)
            const px = state.pointer.x;
            const py = state.pointer.y;

            // 位置のパララックス (少し動く)
            targetPos.x += px * 0.5;
            targetPos.y += py * 0.5;

            // 回転のパララックス (傾く)
            targetRot.x -= py * 0.2;
            targetRot.y += px * 0.2;
        }

        // B. Lerp (滑らかな補間)
        const smooth = isFocused ? 0.15 : 0.08;
        meshRef.current.position.lerp(targetPos, smooth);

        // EulerのLerpは手動で行う
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

// パーティクルシステム
const Particles = ({ count = 1000 }) => {
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

// 背景の暗幕 (Focus時に背景を隠す)
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

// メインシーン
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

// --- 3. App Entry ---

export default function ThreeGallery() {
    const [layout, setLayout] = useState('corridor');
    const [textures, setTextures] = useState([]);
    const [focusedId, setFocusedId] = useState(null);

    // Scroll State using Ref for performance & momentum
    const scrollRef = useRef(0);
    const velocityRef = useRef(0);
    const isDraggingRef = useRef(false);
    const lastYRef = useRef(0);

    // microCMSから画像をロード
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
                // Auto-scroll (Default Animation)
                const autoSpeed = 0.005;
                scrollRef.current += autoSpeed;

                // Apply momentum
                scrollRef.current += velocityRef.current;
                // Friction
                velocityRef.current *= 0.95;

                // Stop if very slow
                if (Math.abs(velocityRef.current) < 0.001) {
                    velocityRef.current = 0;
                }
            }
            anim = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(anim);
    }, []);

    // Event Handlers
    const handleWheel = (e) => {
        if (focusedId !== null) return;
        // Adjust sensitivity based on layout
        const sensitivity = layout === 'ring' || layout === 'heart' ? 0.005 : 0.02;
        velocityRef.current += e.deltaY * sensitivity;
        // Limit max velocity
        velocityRef.current = Math.max(Math.min(velocityRef.current, 0.5), -0.5);
    };

    const handleTouchStart = (e) => {
        if (focusedId !== null) return;
        isDraggingRef.current = true;
        lastYRef.current = e.touches[0].clientY;
        velocityRef.current = 0; // Reset velocity on grab
    };

    const handleTouchMove = (e) => {
        if (focusedId !== null || !isDraggingRef.current) return;
        const currentY = e.touches[0].clientY;
        const deltaY = lastYRef.current - currentY;
        lastYRef.current = currentY;

        // Adjust sensitivity
        const sensitivity = layout === 'ring' || layout === 'heart' ? 0.01 : 0.05;
        scrollRef.current += deltaY * sensitivity;

        // Store velocity for release
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
