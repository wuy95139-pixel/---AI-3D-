// server.js - 根据展品外观详细讲解
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

// 从 .env 文件（如存在）加载环境变量
if (fs.existsSync('.env')) {
    try { process.loadEnvFile('.env'); } catch (e) { /* 忽略加载错误 */ }
}

const app = express();
const PORT = 3000;

// ★★★ 阿里云 DashScope API Key（从环境变量读取，勿硬编码进源码）★★★
const API_KEY = process.env.DASHSCOPE_API_KEY;

if (!API_KEY) {
    console.warn('⚠️  未设置 DASHSCOPE_API_KEY，AI 生成将回退到预设解说文案。');
    console.warn('    请在 .env 文件中填入：DASHSCOPE_API_KEY=你的新Key');
}

app.use(cors());
app.use(express.json());

function makeApiRequest(exhibitName) {
    return new Promise((resolve, reject) => {
        // 为每个展品提供详细的描述性提示
        const detailedPrompts = {
            '生化boss': `请仔细观察这个生化BOSS模型的细节：它融合了机械结构与生物组织，表面有复杂的电路纹路和肌肉纹理。请描述：
            1. 整体造型给你的第一印象（比如压迫感、未来感）
            2. 颜色搭配和材质质感（金属、生物组织、发光部件）
            3. 最吸引人的设计细节（比如某个特殊部位、动态结构）
            4. 这种设计体现了什么样的科幻美学
            请用生动的语言，描述约150字。`,
            
            '妲己': `仔细观察这个妲己角色模型，请描述：
            1. 角色的面部表情和眼神传达了什么情感
            2. 服饰的颜色、材质和装饰细节（如花纹、配饰）
            3. 姿态和动作的设计特点
            4. 模型在光线下的视觉效果
            5. 哪些细节体现了角色性格
            请详细描述约150字。`,
            
            '兰博基尼跑车': `这是一款兰博基尼跑车模型，请仔细观察：
            1. 车身线条和空气动力学设计
            2. 颜色和漆面质感
            3. 轮毂、车灯、进气口等细节
            4. 整体比例和姿态
            5. 内部结构是否可见
            请从设计美学的角度详细描述，约150字。`,
            
            '哆啦A梦': `这是哆啦A梦模型，请描述：
            1. 经典蓝白色调搭配
            2. 圆润可爱的造型特征
            3. 面部表情的细节
            4. 道具（如铃铛、口袋）的精致度
            5. 模型的材质感和光泽度
            请用温暖亲切的语气描述，约150字。`,
            
            '红苹果': `这是一个苹果模型，请仔细观察：
            1. 颜色的渐变和真实度
            2. 表面的光泽和纹理
            3. 叶片和果柄的细节
            4. 整体造型的自然感
            5. 在灯光下的视觉效果
            请详细描述这个超写实水果模型，约150字。`,
            
            '向日葵': `这是向日葵模型，请描述：
            1. 花瓣的层次和颜色
            2. 花盘和种子的细节
            3. 茎叶的形态
            4. 整体姿态（是否向阳）
            5. 材质的真实感
            请描述这个充满生机的植物模型，约150字。`,
            
            '瘌蛤蟆': `这是瘌蛤蟆模型，请描述
            1. 皮肤的纹理和质感
            2. 夸张的艺术化特征
            3. 姿态和表情
            4. 颜色搭配
            5. 给你的视觉感受
            请描述这个独特的艺术模型，约150字。`,
            
            '犀牛': `这是犀牛模型，请描述：
            1. 皮肤的厚重感和褶皱
            2. 犀角的质感和细节
            3. 肌肉线条和力量感
            4. 姿态和稳定性
            5. 整体比例和真实度
            请详细描述这个野生动物模型，约150字。`
        };

        let prompt = detailedPrompts[exhibitName] || 
            `请仔细观察${exhibitName}展品的外观特征，描述它的造型、颜色、材质、细节设计等视觉特点，约150字。`;

        const postData = JSON.stringify({
            model: "qwen-plus",
            messages: [
                { 
                    role: "system", 
                    content: "你是一位专业的艺术评论家和博物馆导览员。请根据展品的外观特征进行详细描述，重点描述视觉元素、造型特点、材质质感、颜色搭配等。语言要生动形象，让听众能通过你的描述想象出展品的样子。" 
                },
                { role: "user", content: prompt }
            ],
            max_tokens: 250,
            temperature: 0.7 // 适当创造性
        });

        const options = {
            hostname: 'dashscope.aliyuncs.com',
            port: 443,
            path: '/compatible-mode/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Length': Buffer.byteLength(postData, 'utf8')
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.choices && result.choices[0]) {
                        resolve(result.choices[0].message.content);
                    } else {
                        resolve(`现在您看到的是${exhibitName}展品。让我为您详细介绍这个模型的外观特征...`);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 更新备用文本，提供更详细的描述
app.post('/api/chat', async (req, res) => {
    try {
        const exhibitName = req.body.item;
        console.log(`正在为 ${exhibitName} 生成详细外观讲解...`);
        
        const text = await makeApiRequest(exhibitName);
        res.json({ text: text });
    } catch (error) {
        console.error('API Error:', error);
        
        // 提供更详细的备用描述
        const detailedBackupTexts = {
            '兰博基尼跑车': `您面前的是一款兰博基尼跑车的精美模型。流畅的车身线条展现了空气动力学的极致美学，犀利的棱角切割赋予它强烈的未来感。深色的漆面在灯光下泛着金属般的光泽，轮毂的细节雕刻得一丝不苟。车头标志性的"Y"字形大灯设计犀利有神，侧面的进气口不仅实用更增添了运动气息。整个模型比例精准，姿态低趴，仿佛随时准备呼啸而出，完美诠释了超级跑车的速度与力量美学。`,
            
            '生化boss': `这个生化BOSS模型充满了视觉冲击力。机械与生物的融合创造了独特的赛博朋克美感：金属骨架支撑着半透明的生物组织，表面覆盖着复杂的电路纹路和发光管道。头部设计尤其引人注目，多个复眼排列成几何图案，散发着幽蓝的光芒。胸口的能量核心有节奏地脉动，肢体的关节处暴露着精密的齿轮结构。整体造型既有生物的有机曲线，又有机械的硬朗线条，体现了设计师对未来生命形态的大胆想象。`,
            
            '妲己': `妲己模型精致地还原了角色的经典形象。她微微侧首，眼波流转间流露出魅惑与智慧并存的气质。服饰以红色为主调，金色纹饰点缀其间，纱质的裙摆轻盈飘逸。头饰繁复而精美，每一处珠串都闪烁着细腻的光泽。手中轻握的法杖镶嵌着宝石，在光照下折射出迷人的色彩。模型的皮肤质感逼真，面部表情细腻生动，将这位经典角色的魅力展现得淋漓尽致。`,
            
            '红苹果': `这个苹果模型达到了惊人的写实程度。鲜艳的红色从果柄处向四周渐变，过渡自然柔和，仿佛能闻到苹果的清香。表面有着细腻的光泽，隐约可见微小的果皮纹理。翠绿的叶片栩栩如生，叶脉清晰可见，边缘的锯齿状细节也十分精致。果柄的褐色与果实的红色形成了完美的色彩搭配。在展厅灯光的照射下，苹果表面泛着诱人的光泽，让人几乎想伸手触摸确认是否为真。`
        };
        
        const backupText = detailedBackupTexts[exhibitName] || 
            `现在您看到的是${exhibitName}展品。这个模型展现了精湛的制作工艺，每一个细节都经过精心雕琢。展品的造型设计富有创意，颜色搭配和谐，材质质感逼真。建议您仔细观察模型的各个角度，欣赏设计师的匠心独运。`;
        
        res.json({ text: backupText });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AI 展馆讲解服务器已启动: http://localhost:${PORT}`);
});