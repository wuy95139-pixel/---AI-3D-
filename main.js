import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

class AdvancedGallery {
    constructor() {
        this.initScene();
        this.initLights();
        this.buildGallery();
        this.loadExhibits();
        this.loadGuide();
        this.addEvents();
        this.animate();
        
        this.guideTargetPos = new THREE.Vector3(0, 0, 0);
        this.isGuideMoving = false;
        this.isAIProcessing = false;
        this.currentExhibit = null;
        window.app = this;
        // 【新增】语音讲解相关状态
        this.isSpeaking = false;  // 是否正在语音讲解
        this.currentSpeech = null; // 当前语音对象
        this.aiRequestController = null; // AI请求控制器
        // 【防穿模与视角限制】
        this.controls.minDistance = 4;        
        this.controls.maxDistance = 25;       // 缩小距离防止看到墙外
        this.controls.maxPolarAngle = Math.PI / 2.2; 
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05; // 阻尼系数，值越小越平滑
        this.controls.rotateSpeed = 0.5;    // 旋转速度
        this.controls.zoomSpeed = 1.0;      // 缩放速度
        this.controls.panSpeed = 0.5;       // 平移速度
        
        // 视角限制（已经有的设置）
        this.controls.minPolarAngle = 0;    // 限制最小俯仰角
        
        // 屏幕空间平移限制
        this.controls.screenSpacePanning = true;
        this.controls.enablePan = true;     // 启用平移
        this.controls.keyPanSpeed = 7.0;  
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); // 黑色主题背景
        this.scene.fog = new THREE.Fog(0x000000, 15, 80);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 8, 22);
        this.targetPos = this.camera.position.clone();

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/royal_esplanade_1k.hdr', (hdr) => {
            hdr.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = hdr;
        });

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.clock = new THREE.Clock();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    initLights() {
        // 环境光调暗以配合黑色风格
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        
        // 顶部矩形柔光灯箱，模拟高级展厅顶灯
        const topLight = new THREE.RectAreaLight(0xffffff, 5, 40, 40);
        topLight.position.set(0, 14, 0);
        topLight.lookAt(0, 0, 0);
        this.scene.add(topLight);
    }

    buildGallery() {
    // 1. 深灰哑光地面（降低金属度，提升粗糙度，与墙面质感统一）
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ 
            color: 0x1e1e1e,  // 墙面同色系深灰
            roughness: 0.15,   // 轻微反光，避免过于死板
            metalness: 0.2     // 降低金属感，与墙面匹配
        })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. 墙面材质优化（统一色调+纹理弱化）
    const textureLoader = new THREE.TextureLoader();
    const wallTexture = textureLoader.load('textures/wall_pattern.png'); 
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(4, 1);
    wallTexture.alphaTest = 0.1;

    const wallMat = new THREE.MeshStandardMaterial({ 
        map: wallTexture, 
        color: 0x282828, // 比地面浅一度的深灰，形成层次
        roughness: 0.8,
        metalness: 0.1   // 弱化金属感，与地面风格统一
    });

    const h = 12; 
    const walls = [
        [0, h/2, -30, 60, h, 0.5], [0, h/2, 30, 60, h, 0.5],
        [-30, h/2, 0, 0.5, h, 60], [30, h/2, 0, 0.5, h, 60]
    ];
    walls.forEach(d => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(d[3],d[4],d[5]), wallMat);
        wall.position.set(d[0], d[1], d[2]);
        this.scene.add(wall);
    });

    // 3. 屋顶材质同步
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(60, 60),
        new THREE.MeshStandardMaterial({ 
            color: 0x181818, // 比地面稍深，形成空间层次感
            side: THREE.BackSide,
            roughness: 0.1,
            metalness: 0.1
        })
    );
    ceiling.position.y = h;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);
}

    loadExhibits() {
        this.exhibitMeshes = [];
        // 【保持你原始的路径不变】
        this.config = [
            { id:'flower', url:'models/Sunburst_Blossom.glb', pos:[-10, 2.2, -20], name:'向日葵' },
            { id:'doraemon', url:'models/doraemon.glb', pos:[10, 2.3, -20], name:'哆啦A梦' },
            { id:'laihama', url:'models/laihama.gltf', pos:[-20, 1.5, -8], name:'瘌蛤蟆' },
            { id:'indian', url:'models/xiniu/indian.gltf', pos:[20, 1.5, -8], name:'犀牛' },
            { id:'boss', url:'models/boss/boss.glb', pos:[-10, 1.1, 20], name:'生化boss' },
            { id:'scene', url:'models/lmodel/scene.gltf', pos:[10, 1.1, 20], name:'车' },
            { id:'daji', url:'models/daji.glb', pos:[-20, 1.1, 8], name:'妲己' },
            { id:'apple', url:'models/apple/apple.gltf', pos:[20, 0.3, 8], name:'苹果' }
        ];

        const loader = new GLTFLoader();
        this.config.forEach(item => {
            // 将展台也改为深灰色以配合主题
            const stand = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 1.1, 2.5),
                new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.1 })
            );
            stand.position.set(item.pos[0], 0.55, item.pos[2]);
            this.scene.add(stand);
            item.stand = stand;

            loader.load(item.url, (gltf) => {
                const model = gltf.scene;
                model.position.set(...item.pos);
                
                // 【根据需求调整大小】
                if (item.id === 'apple') {
                    model.scale.set(5, 5, 5); // 放大苹果
                } else if (item.id === 'scene') {
                    model.scale.set(0.45, 0.45, 0.45); // 缩小车
                } else if (item.id === 'laihama') {
                    model.scale.set(0.2, 0.2, 0.3);
                } else if (item.id === 'daji') {
                    model.scale.set(2, 2, 2);
                } else if (item.id === 'boss') {
                    model.scale.set(0.5, 0.5, 0.5);
                } else if (item.id === 'doraemon') {
                    model.scale.set(2, 2, 2);
                }

                model.lookAt(0, item.pos[1], 0);
                model.traverse(m => {
                    if (m.isMesh) {
                        m.castShadow = true;
                        m.userData = { id: item.id };
                        this.exhibitMeshes.push(m);
                    }
                });
                this.scene.add(model);
            });
        });
    }

    loadGuide() {
        new GLTFLoader().load('https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', (gltf) => {
            this.guide = gltf.scene;
            this.guide.scale.set(0.4, 0.4, 0.4);
            this.guide.position.set(0, 0, 0); 
            this.scene.add(this.guide);
            this.mixer = new THREE.AnimationMixer(this.guide);
            this.actions = {};
            gltf.animations.forEach(a => this.actions[a.name] = this.mixer.clipAction(a));
            if(this.actions['Idle']) this.actions['Idle'].play();
        });
    }

    // --- 大语言模型接入讲解逻辑 ---
    async generateAIExplanation(exhibit) {
        // 如果正在处理，先停止之前的讲解
        if (this.isAIProcessing || this.isSpeaking) {
            this.stopAllSpeaking();
        }
        
        this.isAIProcessing = true;
        
        const contentDiv = document.getElementById('content');
        contentDiv.innerText = "🤖 机器人正在为您生成详细讲解...";
        document.getElementById('talk-btn').style.display = 'none';

        try {
            // 使用 AbortController 支持中断
            this.aiRequestController = new AbortController();
            const timeoutId = setTimeout(() => this.aiRequestController?.abort(), 10000);
            
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: exhibit.name }),
                signal: this.aiRequestController.signal
            });
            
            clearTimeout(timeoutId);
            
            const data = await response.json();
            const text = data.text;
            
            // 更新UI
            contentDiv.innerText = text;
            
            // 开始语音讲解
            this.speak(text, () => {
                // 语音结束后的回调
                this.isSpeaking = false;
                this.isAIProcessing = false;
                this.currentSpeech = null;
                
                // 只有当当前展品没有变化时才显示按钮
                if (this.currentExhibit?.id === exhibit.id) {
                    document.getElementById('talk-btn').style.display = 'block';
                }
            });
            
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log("AI请求被中断");
                return;
            }
            
            console.error("AI讲解失败:", e);
            
            // 降级方案
            const presetText = this.getPresetExplanation(exhibit.name);
            contentDiv.innerText = presetText;
            
            this.speak(presetText, () => {
                this.isSpeaking = false;
                this.isAIProcessing = false;
                if (this.currentExhibit?.id === exhibit.id) {
                    document.getElementById('talk-btn').style.display = 'block';
                }
            });
        } finally {
            this.aiRequestController = null;
        }
    }

    // 添加语音合成方法
    speak(text, onEndCallback = null) {
        // 先停止之前的语音
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        if (!('speechSynthesis' in window)) {
            console.log('浏览器不支持语音合成');
            if (onEndCallback) onEndCallback();
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0; // 正常语速
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        this.isSpeaking = true;
        this.currentSpeech = utterance;
        
        utterance.onstart = () => {
            console.log('开始语音讲解');
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            this.currentSpeech = null;
            if (onEndCallback) onEndCallback();
        };
        
        utterance.onerror = (event) => {
            console.error('语音讲解错误:', event);
            this.isSpeaking = false;
            this.currentSpeech = null;
            if (onEndCallback) onEndCallback();
        };
        
        // 保存引用，以便后续中断
        this.currentSpeech = utterance;
        window.speechSynthesis.speak(utterance);
    }
    stopAllSpeaking() {
        // 停止语音合成
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        // 取消AI请求
        if (this.aiRequestController) {
            this.aiRequestController.abort();
            this.aiRequestController = null;
        }
        
        // 重置状态
        this.isSpeaking = false;
        this.isAIProcessing = false;
        this.currentSpeech = null;
        
        console.log('讲解已停止');
    }
    // 预置讲解方法
    getPresetExplanation(name) {
        const explanations = {
            '生化boss': '这是一个充满科幻感的生化BOSS模型，设计灵感来自未来科技与生物工程的结合。其独特的机械结构与有机形态展现了设计师对赛博朋克美学的深刻理解。',
            '妲己': '妲己，是某荣耀热门游戏的角色。她以魅惑与智慧著称且十分被人喜欢，这个模型精致还原了其经典造型，展现了数字艺术的精湛技艺。',
            '哆啦A梦': '来自22世纪的猫型机器人哆啦A梦，拥有神奇的四次元口袋。这个模型生动再现了它圆润可爱的造型，唤起无数人的童年回忆。',
            '车': '这是一款精致的汽车模型，展现了现代工业设计的优雅线条与精密结构，体现了交通工具设计的艺术与科技的完美融合。',
            '向日葵': '向日葵模型展现了这种向阳植物的生机与活力，金色的花瓣和粗壮的茎干象征着阳光与希望。',
            '瘌蛤蟆': '这个独特的瘌蛤蟆模型以夸张的艺术手法表现了生物的原始形态，具有浓厚的民间艺术风格。',
            '犀牛': '犀牛模型展现了这种珍稀动物的强大力量感，厚重的皮肤和尖锐的角体现了自然进化的神奇。',
            '苹果': '这个苹果模型以超写实的手法展现了水果的新鲜质感，红色的果皮和绿色的叶片充满自然气息。'
        };
        return explanations[name] || `欢迎参观${name}，这是我们展馆的特色展品之一。`;
    }
    
    flyTo(id) {
        // 【关键】立即停止当前所有讲解
        this.stopAllSpeaking();
        
        const item = this.config.find(i => i.id === id);
        if (!item || !this.guide) return;

        this.currentExhibit = item;
        
        // 重置AI处理状态
        this.isAIProcessing = false;
        
        // 隐藏讲解按钮直到移动到位置
        document.getElementById('talk-btn').style.display = 'none';
        
        const dirToCenter = new THREE.Vector3(0, 0, 0).sub(item.stand.position).normalize();
        const leftVec = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dirToCenter).normalize();
        const robotPos = new THREE.Vector3().copy(item.stand.position).add(leftVec.multiplyScalar(3.5));
        
        this.guideTargetPos.copy(robotPos);
        this.guideTargetPos.y = 0; 

        const cameraOffset = new THREE.Vector3().copy(dirToCenter).negate().multiplyScalar(-6); 
        this.targetPos.copy(item.stand.position).add(cameraOffset);
        this.targetPos.y = 4; 
        
        this.controls.target.copy(item.stand.position);

        this.isGuideMoving = true;
        if (this.actions) {
            Object.values(this.actions).forEach(a => a.fadeOut(0.3));
            this.actions['Walking']?.reset().fadeIn(0.3).play();
        }
        
        // 更新UI
        document.getElementById('exhibit-title').innerText = item.name;
        document.getElementById('content').innerText = `正在前往${item.name}展位...`;
    }

    goHome() {
        // 停止所有讲解
        this.stopAllSpeaking();
        
        this.targetPos.set(0, 8, 22);
        this.controls.target.set(0, 0, 0);
        
        this.currentExhibit = null; 
        this.guideTargetPos.set(0, 0, 0);
        this.isGuideMoving = true; 
        
        document.getElementById('talk-btn').style.display = 'none';
        document.getElementById('exhibit-title').innerText = "请选择展品";
        document.getElementById('content').innerText = "点击地面上的展品，机器人将带您前往参观。";
        
        if (this.actions) {
            Object.values(this.actions).forEach(a => a.fadeOut(0.3));
            this.actions['Walking']?.reset().fadeIn(0.3).play();
        }
    }

    // --- 修改 addEvents 方法中的点击事件 ---
    addEvents() {
        document.getElementById('enter-btn').onclick = () => {
            document.getElementById('welcome-screen').classList.add('fade-out');
            document.getElementById('ui-container').style.display = 'block';
        };

        // 绑定讲解按钮
        document.getElementById('talk-btn').onclick = () => {
            if (this.currentExhibit) this.generateAIExplanation(this.currentExhibit);
        };
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // 重置控制器的响应区域
            this.controls.handleResize();
        });
        window.addEventListener('click', (e) => {
            // 如果点击的是UI容器内的元素，不处理场景点击
            if (e.target.closest('#ui-container')) return;
            
            // 射线检测
            this.mouse.set(
                (e.clientX / window.innerWidth) * 2 - 1,
                -(e.clientY / window.innerHeight) * 2 + 1
            );
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // 优先检测角色点击
            if (this.guide) {
                const robotHits = this.raycaster.intersectObject(this.guide, true);
                if (robotHits.length > 0) {
                    this.triggerInteraction();
                    return;
                }
            }

            // 检测展品点击
            const hits = this.raycaster.intersectObjects(this.exhibitMeshes);
            if (hits.length) {
                this.flyTo(hits[0].object.userData.id);
            }
            // 如果点击空白处且正在讲解，可以选择是否停止讲解
            // 这里选择不停止，只在点击其他展品时停止
        });
    }

    animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta); // 动画与渲染帧同步
    
    // 相机平滑移动（降低插值速度，解决瞬移卡顿）
    this.camera.position.lerp(this.targetPos, 0.03); 

    if (this.guide && this.isGuideMoving) {
        this.guide.position.lerp(this.guideTargetPos, 0.04);
        this.guide.position.y = 0;

        // 角色视角对齐：空值检查 + 平滑看向目标
        const lookTarget = this.currentExhibit 
            ? this.currentExhibit.stand.position 
            : new THREE.Vector3(0,0,0);
        this.guide.lookAt(lookTarget.x, 0, lookTarget.z);
        
        // 移动结束判定：距离阈值优化，避免角色抖动
        if (this.guide.position.distanceTo(this.guideTargetPos) < 0.1) {
            this.isGuideMoving = false;
            this.actions['Walking']?.fadeOut(0.3);
            this.actions['Idle']?.reset().fadeIn(0.3).play();
            if (this.currentExhibit) {
                document.getElementById('talk-btn').style.display = 'block';
            }
        }
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
}

    triggerInteraction() {
    if (!this.actions || this.isGuideMoving) return; // 移动中不触发
    // 停止当前所有动画 → 播放Jump → 恢复Idle
    Object.values(this.actions).forEach(a => a.stop());
    this.actions['Jump']?.reset().setLoop(THREE.LoopOnce).play();
    setTimeout(() => {
        this.actions['Idle']?.reset().play();
    }, 1000); 
}
}
new AdvancedGallery();