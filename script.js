// 疼痛標記應用程式
class PainMarkerApp {
    constructor() {
        this.currentLevel = 1;
        this.currentView = 'front';
        this.painMarkers = {
            front: [],
            back: []
        };
        this.levelColors = {
            1: '#FF6B6B',
            2: '#FF8C8C',
            3: '#FF5252',
            4: '#FF0000'
        };
        this.levelBgColors = {
            1: '#FFE5E5',
            2: '#FFCCCC',
            3: '#FF9999',
            4: '#FF6666'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFromStorage();
    }

    setupEventListeners() {
        // 疼痛等級選擇
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentLevel = parseInt(btn.dataset.level);
            });
        });

        // 視圖切換
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.switchView(this.currentView);
            });
        });

        // 身體圖示點擊／觸控事件（手機與桌面皆可用）
        const frontSvg = document.getElementById('front-body');
        const backSvg = document.getElementById('back-body');

        [frontSvg, backSvg].forEach(svg => {
            const view = svg.id === 'front-body' ? 'front' : 'back';
            const handleTap = (clientX, clientY) => {
                const coords = this.getSVGCoords(svg, clientX, clientY);
                if (coords) this.addPainMarker(coords.x, coords.y, view);
            };
            svg.addEventListener('click', (e) => {
                if (e.target.classList.contains('pain-marker-svg')) return;
                handleTap(e.clientX, e.clientY);
            });
            svg.addEventListener('touchstart', (e) => {
                if (e.target.classList.contains('pain-marker-svg')) return;
                e.preventDefault();
                const touch = e.touches[0];
                handleTap(touch.clientX, touch.clientY);
            }, { passive: false });
        });

        // 清除按鈕
        document.getElementById('clear-btn').addEventListener('click', () => this.clearMarkers());

        // 儲存按鈕
        document.getElementById('save-btn').addEventListener('click', () => this.saveImage());

        // 分享按鈕
        document.getElementById('share-btn').addEventListener('click', () => this.shareImage());
    }

    /**
     * 將螢幕座標轉成 SVG viewBox 座標（0~200, 0~400）
     * 手動計算 preserveAspectRatio="xMidYMid meet" 的對應，避免手機上 getScreenCTM 不準
     */
    getSVGCoords(svg, clientX, clientY) {
        const rect = svg.getBoundingClientRect();
        const vbW = 200, vbH = 400;
        const scale = Math.min(rect.width / vbW, rect.height / vbH);
        const drawW = vbW * scale, drawH = vbH * scale;
        const offsetX = (rect.width - drawW) / 2;
        const offsetY = (rect.height - drawH) / 2;
        const x = clientX - rect.left - offsetX;
        const y = clientY - rect.top - offsetY;
        const svgX = x / scale;
        const svgY = y / scale;
        if (svgX < 0 || svgX > vbW || svgY < 0 || svgY > vbH) return null;
        return { x: svgX, y: svgY };
    }

    addPainMarker(x, y, view) {
        // 檢查是否點擊在身體範圍內
        if (!this.isPointOnBody(x, y)) {
            return;
        }

        const marker = {
            x: x,
            y: y,
            level: this.currentLevel,
            color: this.levelColors[this.currentLevel],
            bgColor: this.levelBgColors[this.currentLevel],
            id: Date.now() + Math.random()
        };

        this.painMarkers[view].push(marker);
        this.renderMarkers(view);
        this.saveToStorage();
    }

    isPointOnBody(x, y) {
        // 簡單的範圍檢查（可以根據實際 SVG 形狀優化）
        return x > 30 && x < 170 && y > 20 && y < 400;
    }

    renderMarkers(view) {
        const svg = document.getElementById(`${view}-body`);
        
        // 清除現有標記
        svg.querySelectorAll('.pain-marker-svg').forEach(m => m.remove());

        // 渲染所有標記
        this.painMarkers[view].forEach(marker => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', marker.x);
            circle.setAttribute('cy', marker.y);
            circle.setAttribute('r', '8');
            circle.setAttribute('fill', marker.color);
            circle.setAttribute('stroke', 'white');
            circle.setAttribute('stroke-width', '2');
            circle.setAttribute('opacity', '0.8');
            circle.setAttribute('class', 'pain-marker-svg');
            circle.style.cursor = 'pointer';
            
            const removeThis = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removeMarker(marker.id, view);
            };
            circle.addEventListener('click', removeThis);
            circle.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.preventDefault();
            }, { passive: false });
            circle.addEventListener('touchend', removeThis, { passive: false });

            svg.appendChild(circle);
        });
    }

    removeMarker(id, view) {
        this.painMarkers[view] = this.painMarkers[view].filter(m => m.id !== id);
        this.renderMarkers(view);
        this.saveToStorage();
    }

    switchView(view) {
        document.querySelectorAll('.body-view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        this.renderMarkers(view);
    }

    clearMarkers() {
        if (confirm('確定要清除所有標記嗎？')) {
            this.painMarkers[this.currentView] = [];
            this.renderMarkers(this.currentView);
            this.saveToStorage();
        }
    }

    saveImage() {
        const view = this.currentView;
        const svg = document.getElementById(`${view}-body`);
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = 400;
        canvas.height = 800;
        
        img.onload = () => {
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 繪製標記
            this.painMarkers[view].forEach(marker => {
                ctx.fillStyle = marker.color;
                ctx.beginPath();
                ctx.arc(marker.x * 2, marker.y * 2, 16, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.stroke();
            });
            
            // 下載圖片
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `疼痛標記_${view === 'front' ? '正面' : '背面'}_${new Date().toISOString().slice(0, 10)}.png`;
                a.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    shareImage() {
        const view = this.currentView;
        const svg = document.getElementById(`${view}-body`);
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = 400;
        canvas.height = 800;
        
        img.onload = () => {
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // 繪製標記
            this.painMarkers[view].forEach(marker => {
                ctx.fillStyle = marker.color;
                ctx.beginPath();
                ctx.arc(marker.x * 2, marker.y * 2, 16, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.stroke();
            });
            
            // 分享功能
            canvas.toBlob((blob) => {
                if (navigator.share) {
                    const file = new File([blob], `疼痛標記_${view === 'front' ? '正面' : '背面'}.png`, { type: 'image/png' });
                    navigator.share({
                        title: '我的疼痛部位標記',
                        text: '這是我標記的疼痛部位',
                        files: [file]
                    }).catch(err => {
                        console.log('分享失敗:', err);
                        this.fallbackShare(canvas);
                    });
                } else {
                    this.fallbackShare(canvas);
                }
            }, 'image/png');
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }

    fallbackShare(canvas) {
        // 如果瀏覽器不支援分享 API，則複製到剪貼簿或下載
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `疼痛標記_${new Date().toISOString().slice(0, 10)}.png`;
            a.click();
            URL.revokeObjectURL(url);
            alert('圖片已下載，您可以透過 LINE 傳送給醫生');
        }, 'image/png');
    }

    saveToStorage() {
        try {
            localStorage.setItem('painMarkers', JSON.stringify(this.painMarkers));
        } catch (e) {
            console.log('無法儲存到本地:', e);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('painMarkers');
            if (saved) {
                this.painMarkers = JSON.parse(saved);
                this.renderMarkers(this.currentView);
            }
        } catch (e) {
            console.log('無法從本地載入:', e);
        }
    }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    new PainMarkerApp();
});
