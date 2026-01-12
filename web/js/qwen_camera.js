import { app } from "../../../../scripts/app.js";
import { VIEWER_HTML } from "./camera_viewer.js";

/**
 * ComfyUI Extension for Qwen Multiangle Lightning Node
 * Provides a 3D lighting control widget with color preview
 */

app.registerExtension({
    name: "qwen.multiangle.lightning",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "QwenMultiangleLightningNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;

            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                const node = this;
                
                // 初始化多输出配置数据
                // _lightConfigs 存储每个输出的参数配置
                node._lightConfigs = [
                    { azimuth: 0, elevation: 30, intensity: 5.0, color: "#FFFFFF" }
                ];
                node._activeConfigIndex = 0; // 当前激活的配置索引
                
                // Tab 栏配置
                const tabBarHeight = 26;
                
                // 默认参数值
                const defaultConfig = {
                    azimuth: 0,
                    elevation: 30,
                    intensity: 5.0,
                    color: "#FFFFFF"
                };
                
                // 保存当前 widget 值到当前激活的配置
                const saveCurrentConfig = () => {
                    const config = node._lightConfigs[node._activeConfigIndex];
                    if (!config) return;
                    
                    const hWidget = node.widgets?.find(w => w.name === "light_azimuth");
                    const vWidget = node.widgets?.find(w => w.name === "light_elevation");
                    const zWidget = node.widgets?.find(w => w.name === "light_intensity");
                    const colorWidget = node.widgets?.find(w => w.name === "light_color_hex");
                    
                    if (hWidget) config.azimuth = hWidget.value;
                    if (vWidget) config.elevation = vWidget.value;
                    if (zWidget) config.intensity = zWidget.value;
                    if (colorWidget) config.color = colorWidget.value;
                };
                
                // 加载配置到 widgets
                const loadConfig = (index) => {
                    const config = node._lightConfigs[index];
                    if (!config) return;
                    
                    const hWidget = node.widgets?.find(w => w.name === "light_azimuth");
                    const vWidget = node.widgets?.find(w => w.name === "light_elevation");
                    const zWidget = node.widgets?.find(w => w.name === "light_intensity");
                    const colorWidget = node.widgets?.find(w => w.name === "light_color_hex");
                    
                    if (hWidget) hWidget.value = config.azimuth;
                    if (vWidget) vWidget.value = config.elevation;
                    if (zWidget) zWidget.value = config.intensity;
                    if (colorWidget) colorWidget.value = config.color;
                    
                    // 同步到 3D 视图
                    setTimeout(() => syncTo3DView(), 50);
                };
                
                // 添加新配置（重置参数）
                const addNewConfig = () => {
                    saveCurrentConfig();
                    node._lightConfigs.push({ ...defaultConfig });
                    node._activeConfigIndex = node._lightConfigs.length - 1;
                    loadConfig(node._activeConfigIndex);
                };
                
                // 删除配置
                const removeConfig = (index) => {
                    if (node._lightConfigs.length <= 1) return;
                    
                    node._lightConfigs.splice(index, 1);
                    
                    // 调整激活索引
                    if (node._activeConfigIndex >= node._lightConfigs.length) {
                        node._activeConfigIndex = node._lightConfigs.length - 1;
                    } else if (node._activeConfigIndex > index) {
                        node._activeConfigIndex--;
                    }
                    
                    loadConfig(node._activeConfigIndex);
                };
                
                // 切换到指定配置
                const switchToConfig = (index) => {
                    if (index === node._activeConfigIndex) return;
                    saveCurrentConfig();
                    node._activeConfigIndex = index;
                    loadConfig(index);
                    // 同步 3D viewer
                    syncTo3DView();
                };
                
                // 同步到 3D 视图的函数（提前声明）
                let syncTo3DView = () => {};
                
                // Add custom drawing for color preview
                const origOnDrawForeground = this.onDrawForeground;
                this.onDrawForeground = function(ctx) {
                    if (origOnDrawForeground) {
                        origOnDrawForeground.apply(this, arguments);
                    }
                    
                    // Find color widget and draw preview
                    const colorWidget = this.widgets?.find(w => w.name === "light_color_hex");
                    if (colorWidget && colorWidget.last_y !== undefined) {
                        const color = colorWidget.value || "#FFFFFF";
                        const x = this.size[0] - 35;
                        const y = colorWidget.last_y + 5;
                        const size = 20;
                        
                        // Draw color preview box with border
                        ctx.save();
                        ctx.fillStyle = color;
                        ctx.strokeStyle = "#888";
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.roundRect(x, y, size, size, 4);
                        ctx.fill();
                        ctx.stroke();
                        
                        // Draw inner highlight
                        ctx.strokeStyle = "rgba(255,255,255,0.3)";
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.roundRect(x + 2, y + 2, size - 4, size - 4, 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                };
                
                // 创建容器（透明背景，让节点底色显示）
                const container = document.createElement("div");
                container.style.width = "100%";
                container.style.height = "100%";
                container.style.display = "flex";
                container.style.flexDirection = "column";
                container.style.backgroundColor = "transparent";
                container.style.borderRadius = "8px";
                
                // 创建 Tab 栏 DOM 元素（透明背景）
                const tabBar = document.createElement("div");
                tabBar.style.display = "flex";
                tabBar.style.alignItems = "center";
                tabBar.style.padding = "4px 4px";
                tabBar.style.gap = "6px";
                tabBar.style.backgroundColor = "transparent";
                tabBar.style.flexShrink = "0";
                
                // 更新 Tab 栏的函数
                const updateTabBar = () => {
                    tabBar.innerHTML = "";
                    const count = node._lightConfigs?.length || 1;
                    const activeIndex = node._activeConfigIndex || 0;
                    
                    for (let i = 0; i < count; i++) {
                        const tab = document.createElement("div");
                        const isActive = i === activeIndex;
                        tab.style.position = "relative";
                        tab.style.display = "inline-flex";
                        tab.style.alignItems = "center";
                        tab.style.justifyContent = "center";
                        tab.style.cursor = "pointer";
                        tab.style.color = isActive ? "#4ecdc4" : "rgba(255,255,255,0.5)";
                        tab.style.fontSize = "14px";
                        tab.style.fontWeight = "normal";
                        tab.style.transition = "all 0.15s ease";
                        tab.style.userSelect = "none";
                        // 标签方框样式
                        tab.style.backgroundColor = "#0a0a0f";
                        tab.style.border = "1px solid rgba(255,255,255,0.1)";
                        tab.style.borderRadius = "4px";
                        tab.style.padding = "4px 8px";
                        tab.style.minWidth = "24px";
                        
                        // Hover 效果
                        tab.addEventListener("mouseenter", () => {
                            if (!isActive) {
                                tab.style.color = "rgba(255,255,255,0.8)";
                            }
                        });
                        tab.addEventListener("mouseleave", () => {
                            if (!isActive) {
                                tab.style.color = "rgba(255,255,255,0.5)";
                            }
                        });
                        
                        // Tab 数字
                        const num = document.createElement("span");
                        num.textContent = String(i + 1);
                        tab.appendChild(num);
                        
                        // 删除按钮（第一个标签不显示×，因为不能删除）- 放在右上角，红色
                        if (i > 0) {
                            const closeBtn = document.createElement("span");
                            closeBtn.textContent = "×";
                            closeBtn.style.position = "absolute";
                            closeBtn.style.top = "-6px";
                            closeBtn.style.right = "-2px";
                            closeBtn.style.fontSize = "10px";
                            closeBtn.style.color = "#ff4444";
                            closeBtn.style.opacity = "0.8";
                            closeBtn.style.cursor = "pointer";
                            closeBtn.style.transition = "opacity 0.1s";
                            closeBtn.style.fontWeight = "bold";
                            closeBtn.addEventListener("mouseenter", () => {
                                closeBtn.style.opacity = "1";
                            });
                            closeBtn.addEventListener("mouseleave", () => {
                                closeBtn.style.opacity = "0.8";
                            });
                            closeBtn.addEventListener("click", (e) => {
                                e.stopPropagation();
                                removeConfig(i);
                                updateTabBar();
                                app.graph.setDirtyCanvas(true, true);
                            });
                            tab.appendChild(closeBtn);
                        }
                        
                        // 点击切换 tab
                        tab.addEventListener("click", () => {
                            switchToConfig(i);
                            updateTabBar();
                            app.graph.setDirtyCanvas(true, true);
                        });
                        
                        tabBar.appendChild(tab);
                    }
                    
                    // 加号按钮
                    const plusBtn = document.createElement("div");
                    plusBtn.style.display = "flex";
                    plusBtn.style.alignItems = "center";
                    plusBtn.style.justifyContent = "center";
                    plusBtn.style.cursor = "pointer";
                    plusBtn.style.color = "rgba(255,255,255,0.5)";
                    plusBtn.style.fontSize = "14px";
                    plusBtn.style.transition = "color 0.15s ease";
                    plusBtn.style.userSelect = "none";
                    plusBtn.textContent = "+";
                    plusBtn.addEventListener("mouseenter", () => {
                        plusBtn.style.color = "#fff";
                    });
                    plusBtn.addEventListener("mouseleave", () => {
                        plusBtn.style.color = "rgba(255,255,255,0.5)";
                    });
                    plusBtn.addEventListener("click", () => {
                        addNewConfig();
                        updateTabBar();
                        app.graph.setDirtyCanvas(true, true);
                    });
                    tabBar.appendChild(plusBtn);
                };
                
                // 初始化 Tab 栏
                node._updateTabBar = updateTabBar;
                updateTabBar();
                
                container.appendChild(tabBar);
                
                // Create iframe for 3D viewer（与标签栏相同的背景和边框）
                const iframe = document.createElement("iframe");
                iframe.style.width = "100%";
                iframe.style.flex = "1";
                iframe.style.border = "1px solid rgba(255,255,255,0.1)";
                iframe.style.backgroundColor = "#0a0a0f";
                iframe.style.borderRadius = "8px";
                iframe.style.display = "block";

                // Create blob URL from inline HTML
                const blob = new Blob([VIEWER_HTML], { type: 'text/html' });
                const blobUrl = URL.createObjectURL(blob);
                iframe.src = blobUrl;

                iframe.addEventListener('load', () => {
                    iframe._blobUrl = blobUrl;
                });
                
                container.appendChild(iframe);

                // Add widget
                const widget = this.addDOMWidget("viewer", "LIGHTING_3D_VIEW", container, {
                    getValue() { return ""; },
                    setValue(v) { }
                });

                widget.computeSize = function (width) {
                    const w = width || 320;
                    return [w, 360 + tabBarHeight + 4];
                };

                widget.element = container;
                this._viewerIframe = iframe;
                this._viewerReady = false;

                // Message handler
                const onMessage = (event) => {
                    if (event.source !== iframe.contentWindow) return;
                    const data = event.data;

                    if (data.type === 'VIEWER_READY') {
                        this._viewerReady = true;
                        // Send pending image if any
                        if (this._pendingImageSend) {
                            this._pendingImageSend();
                            delete this._pendingImageSend;
                        }
                        // Send initial values
                        const hWidget = node.widgets.find(w => w.name === "light_azimuth");
                        const vWidget = node.widgets.find(w => w.name === "light_elevation");
                        const zWidget = node.widgets.find(w => w.name === "light_intensity");
                        const colorWidget = node.widgets.find(w => w.name === "light_color_hex");
                        const cinematicWidget = node.widgets.find(w => w.name === "cinematic_mode");

                        iframe.contentWindow.postMessage({
                            type: "INIT",
                            horizontal: hWidget?.value || 0,
                            vertical: vWidget?.value || 30,
                            zoom: zWidget?.value || 5.0,
                            lightColor: colorWidget?.value || "#FFFFFF",
                            useDefaultPrompts: cinematicWidget?.value || true,
                            cameraView: false
                        }, "*");
                    } else if (data.type === 'ANGLE_UPDATE') {
                        // Update node widgets from 3D view
                        const hWidget = node.widgets.find(w => w.name === "light_azimuth");
                        const vWidget = node.widgets.find(w => w.name === "light_elevation");
                        const zWidget = node.widgets.find(w => w.name === "light_intensity");

                        if (hWidget) hWidget.value = data.horizontal;
                        if (vWidget) vWidget.value = data.vertical;
                        if (zWidget) zWidget.value = data.zoom;

                        // Mark graph as changed
                        app.graph.setDirtyCanvas(true, true);
                    }
                };
                window.addEventListener('message', onMessage);

                // Resize handling
                const notifyIframeResize = () => {
                    if (iframe.contentWindow) {
                        const rect = iframe.getBoundingClientRect();
                        iframe.contentWindow.postMessage({
                            type: 'RESIZE',
                            width: rect.width,
                            height: rect.height
                        }, '*');
                    }
                };

                // ResizeObserver for responsive updates
                let resizeTimeout = null;
                let lastSize = { width: 0, height: 0 };
                const resizeObserver = new ResizeObserver((entries) => {
                    const entry = entries[0];
                    const newWidth = entry.contentRect.width;
                    const newHeight = entry.contentRect.height;

                    if (Math.abs(newWidth - lastSize.width) < 1 && Math.abs(newHeight - lastSize.height) < 1) {
                        return;
                    }
                    lastSize = { width: newWidth, height: newHeight };

                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }
                    resizeTimeout = setTimeout(() => {
                        notifyIframeResize();
                    }, 50);
                });
                resizeObserver.observe(iframe);

                // Sync slider widgets to 3D view - 赋值给前面声明的变量
                syncTo3DView = () => {
                    if (!this._viewerReady || !iframe.contentWindow) return;

                    const hWidget = node.widgets.find(w => w.name === "light_azimuth");
                    const vWidget = node.widgets.find(w => w.name === "light_elevation");
                    const zWidget = node.widgets.find(w => w.name === "light_intensity");
                    const colorWidget = node.widgets.find(w => w.name === "light_color_hex");
                    const cinematicWidget = node.widgets.find(w => w.name === "cinematic_mode");

                    iframe.contentWindow.postMessage({
                        type: "SYNC_ANGLES",
                        horizontal: hWidget?.value || 0,
                        vertical: vWidget?.value || 30,
                        zoom: zWidget?.value || 5.0,
                        lightColor: colorWidget?.value || "#FFFFFF",
                        useDefaultPrompts: cinematicWidget?.value || true,
                        cameraView: false
                    }, "*");
                };

                // Override widget callback to sync
                const origCallback = this.onWidgetChanged;
                this.onWidgetChanged = function (name, value, old_value, widget) {
                    if (origCallback) {
                        origCallback.apply(this, arguments);
                    }
                    if (name === "light_azimuth" || name === "light_elevation" || name === "light_intensity" || name === "light_color_hex" || name === "cinematic_mode") {
                        syncTo3DView();
                    }
                };

                // Handle execution - receive image from backend
                const onExecuted = this.onExecuted;
                this.onExecuted = function (message) {
                    onExecuted?.apply(this, arguments);

                    if (message?.image_base64 && message.image_base64[0]) {
                        const imageData = message.image_base64[0];

                        const sendImage = () => {
                            if (iframe.contentWindow) {
                                iframe.contentWindow.postMessage({
                                    type: "UPDATE_IMAGE",
                                    imageUrl: imageData
                                }, "*");
                            }
                        };

                        if (this._viewerReady) {
                            sendImage();
                        } else {
                            this._pendingImageSend = sendImage;
                        }
                    }
                };
                
                // 使用 addDOMWidget 创建隐藏的配置 widget
                const nodeRef = this;
                const hiddenWidget = this.addDOMWidget("light_configs_json", "hidden", document.createElement("div"), {
                    serialize: true,
                    getValue: () => {
                        // 动态生成配置 JSON
                        saveCurrentConfig();
                        return JSON.stringify(nodeRef._lightConfigs || []);
                    },
                    setValue: () => {
                        // 不需要存储，因为 getValue 会动态生成
                    }
                });
                
                // 序列化时保存配置数据
                const origSerialize = this.serialize;
                this.serialize = function() {
                    const data = origSerialize ? origSerialize.apply(this, arguments) : {};
                    // 保存前先更新当前配置
                    saveCurrentConfig();
                    data._lightConfigs = this._lightConfigs;
                    data._activeConfigIndex = this._activeConfigIndex;
                    return data;
                };
                
                // 反序列化时恢复配置数据
                const origConfigure = this.configure;
                this.configure = function(data) {
                    if (origConfigure) {
                        origConfigure.apply(this, arguments);
                    }
                    // 恢复配置数据
                    if (data._lightConfigs && data._lightConfigs.length > 0) {
                        this._lightConfigs = data._lightConfigs;
                        this._activeConfigIndex = data._activeConfigIndex || 0;
                        // 加载激活的配置到 widgets
                        loadConfig(this._activeConfigIndex);
                        // 更新 Tab 栏
                        if (this._updateTabBar) {
                            this._updateTabBar();
                        }
                    }
                };
                
                // 重写 getExtraMenuOptions 显示配置信息
                const origGetExtraMenuOptions = this.getExtraMenuOptions;
                this.getExtraMenuOptions = function(canvas, options) {
                    if (origGetExtraMenuOptions) {
                        origGetExtraMenuOptions.apply(this, arguments);
                    }
                    // 添加输出数量菜单项
                    options.unshift({
                        content: `Outputs: ${this._lightConfigs?.length || 1} | Active: ${(this._activeConfigIndex || 0) + 1}`,
                        disabled: true
                    });
                };

                // Clean up on node removal
                const originalOnRemoved = this.onRemoved;
                this.onRemoved = function () {
                    resizeObserver.disconnect();
                    window.removeEventListener('message', onMessage);
                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }
                    delete this._pendingImageSend;
                    if (iframe._blobUrl) {
                        URL.revokeObjectURL(iframe._blobUrl);
                    }
                    if (originalOnRemoved) {
                        originalOnRemoved.apply(this, arguments);
                    }
                };

                // Set initial node size
                this.setSize([350, 520]);

                return r;
            };
        }
    }
});
