import { app } from "../../../../scripts/app.js";
import { VIEWER_HTML } from "./camera_viewer.js";

/**
 * ComfyUI Extension for Qwen Multiangle Lightning Node
 * Provides a 3D lighting control widget with color preview and multi-config tabs
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
                node._lightConfigs = [
                    { azimuth: 0, elevation: 30, intensity: 5.0, color: "#FFFFFF" }
                ];
                node._activeConfigIndex = 0;
                
                // Tab 栏配置
                const tabBarHeight = 30;
                
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
                    
                    setTimeout(() => syncTo3DView(), 50);
                };
                
                // 添加新配置
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
                    if (node._activeConfigIndex >= node._lightConfigs.length) {
                        node._activeConfigIndex = node._lightConfigs.length - 1;
                    } else if (node._activeConfigIndex > index) {
                        node._activeConfigIndex--;
                    }
                    loadConfig(node._activeConfigIndex);
                };
                
                // 切换配置
                const switchToConfig = (index) => {
                    if (index === node._activeConfigIndex) return;
                    saveCurrentConfig();
                    node._activeConfigIndex = index;
                    loadConfig(index);
                    syncTo3DView();
                };
                
                // 同步到 3D 视图的函数（提前声明）
                let syncTo3DView = () => {};



                // 创建主容器
                const container = document.createElement("div");
                container.style.width = "100%";
                container.style.display = "flex";
                container.style.flexDirection = "column";
                container.style.backgroundColor = "transparent";

                // 创建 Tab 栏
                const tabBar = document.createElement("div");
                tabBar.style.display = "flex";
                tabBar.style.alignItems = "center";
                tabBar.style.padding = "4px";
                tabBar.style.gap = "6px";
                tabBar.style.backgroundColor = "transparent";
                tabBar.style.flexShrink = "0";
                tabBar.style.height = tabBarHeight + "px";
                
                // 更新 Tab 栏
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
                        tab.style.transition = "all 0.15s ease";
                        tab.style.userSelect = "none";
                        tab.style.backgroundColor = "#0a0a0f";
                        tab.style.border = "1px solid rgba(255,255,255,0.1)";
                        tab.style.borderRadius = "4px";
                        tab.style.padding = "4px 8px";
                        tab.style.minWidth = "24px";
                        
                        tab.addEventListener("mouseenter", () => {
                            if (!isActive) tab.style.color = "rgba(255,255,255,0.8)";
                        });
                        tab.addEventListener("mouseleave", () => {
                            if (!isActive) tab.style.color = "rgba(255,255,255,0.5)";
                        });
                        
                        const num = document.createElement("span");
                        num.textContent = String(i + 1);
                        tab.appendChild(num);
                        
                        // 删除按钮（第一个不显示）
                        if (i > 0) {
                            const closeBtn = document.createElement("span");
                            closeBtn.textContent = "×";
                            closeBtn.style.position = "absolute";
                            closeBtn.style.top = "-6px";
                            closeBtn.style.right = "-2px";
                            closeBtn.style.fontSize = "10px";
                            closeBtn.style.color = "#ff4444";
                            closeBtn.style.cursor = "pointer";
                            closeBtn.style.fontWeight = "bold";
                            closeBtn.addEventListener("click", (e) => {
                                e.stopPropagation();
                                removeConfig(i);
                                updateTabBar();
                                app.graph.setDirtyCanvas(true, true);
                            });
                            tab.appendChild(closeBtn);
                        }
                        
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
                    plusBtn.style.userSelect = "none";
                    plusBtn.textContent = "+";
                    plusBtn.addEventListener("mouseenter", () => plusBtn.style.color = "#fff");
                    plusBtn.addEventListener("mouseleave", () => plusBtn.style.color = "rgba(255,255,255,0.5)");
                    plusBtn.addEventListener("click", () => {
                        addNewConfig();
                        updateTabBar();
                        app.graph.setDirtyCanvas(true, true);
                    });
                    tabBar.appendChild(plusBtn);
                };
                
                node._updateTabBar = updateTabBar;
                updateTabBar();
                container.appendChild(tabBar);

                // Create iframe for 3D viewer
                const iframe = document.createElement("iframe");
                iframe.style.width = "100%";
                iframe.style.flex = "1";
                iframe.style.minHeight = "320px";
                iframe.style.border = "1px solid rgba(255,255,255,0.1)";
                iframe.style.backgroundColor = "#0a0a0f";
                iframe.style.borderRadius = "8px";
                iframe.style.display = "block";

                const blob = new Blob([VIEWER_HTML], { type: 'text/html' });
                const blobUrl = URL.createObjectURL(blob);
                iframe.src = blobUrl;
                iframe.addEventListener('load', () => { iframe._blobUrl = blobUrl; });
                
                container.appendChild(iframe);

                // Add DOM widget
                const widget = this.addDOMWidget("viewer", "LIGHTING_3D_VIEW", container, {
                    getValue() { return ""; },
                    setValue() { }
                });

                const viewerHeight = 320 + tabBarHeight + 8;
                widget.computeSize = function(width) {
                    return [Math.max(width || 350, 350), viewerHeight];
                };
                container.style.height = viewerHeight + "px";

                widget.element = container;
                this._viewerIframe = iframe;
                this._viewerReady = false;

                // Message handler
                const onMessage = (event) => {
                    if (event.source !== iframe.contentWindow) return;
                    const data = event.data;

                    if (data.type === 'VIEWER_READY') {
                        this._viewerReady = true;
                        if (this._pendingImageSend) {
                            this._pendingImageSend();
                            delete this._pendingImageSend;
                        }
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
                        const hWidget = node.widgets.find(w => w.name === "light_azimuth");
                        const vWidget = node.widgets.find(w => w.name === "light_elevation");
                        const zWidget = node.widgets.find(w => w.name === "light_intensity");
                        const colorWidget = node.widgets.find(w => w.name === "light_color_hex");

                        if (hWidget) hWidget.value = data.horizontal;
                        if (vWidget) vWidget.value = data.vertical;
                        if (zWidget) zWidget.value = data.zoom;
                        if (colorWidget && data.lightColor) colorWidget.value = data.lightColor;

                        saveCurrentConfig();
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

                let resizeTimeout = null;
                let lastSize = { width: 0, height: 0 };
                const resizeObserver = new ResizeObserver((entries) => {
                    const entry = entries[0];
                    const newWidth = entry.contentRect.width;
                    const newHeight = entry.contentRect.height;
                    if (Math.abs(newWidth - lastSize.width) < 1 && Math.abs(newHeight - lastSize.height) < 1) return;
                    lastSize = { width: newWidth, height: newHeight };
                    if (resizeTimeout) clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => notifyIframeResize(), 50);
                });
                resizeObserver.observe(iframe);

                // Sync to 3D view
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

                // Widget change callback
                const origCallback = this.onWidgetChanged;
                this.onWidgetChanged = function(name, value, old_value, widget) {
                    if (origCallback) origCallback.apply(this, arguments);
                    if (["light_azimuth", "light_elevation", "light_intensity", "light_color_hex", "cinematic_mode"].includes(name)) {
                        saveCurrentConfig();
                        syncTo3DView();
                    }
                };

                // Handle execution
                const onExecuted = this.onExecuted;
                this.onExecuted = function(message) {
                    onExecuted?.apply(this, arguments);
                    if (message?.image_base64 && message.image_base64[0]) {
                        const imageData = message.image_base64[0];
                        const sendImage = () => {
                            if (iframe.contentWindow) {
                                iframe.contentWindow.postMessage({ type: "UPDATE_IMAGE", imageUrl: imageData }, "*");
                            }
                        };
                        if (this._viewerReady) sendImage();
                        else this._pendingImageSend = sendImage;
                    }
                };

                // 创建隐藏的配置 widget 用于传递数据到后端
                const nodeRef = this;
                const hiddenEl = document.createElement("div");
                hiddenEl.style.display = "none";
                
                const hiddenWidget = this.addDOMWidget("light_configs_json", "hidden", hiddenEl, {
                    serialize: true,
                    getValue: () => {
                        saveCurrentConfig();
                        return JSON.stringify(nodeRef._lightConfigs || []);
                    },
                    setValue: () => {}
                });
                hiddenWidget.computeSize = () => [0, -4]; // 不占用空间

                // 序列化
                const origSerialize = this.serialize;
                this.serialize = function() {
                    const data = origSerialize ? origSerialize.apply(this, arguments) : {};
                    saveCurrentConfig();
                    data._lightConfigs = this._lightConfigs;
                    data._activeConfigIndex = this._activeConfigIndex;
                    return data;
                };

                // 反序列化
                const origConfigure = this.configure;
                this.configure = function(data) {
                    if (origConfigure) origConfigure.apply(this, arguments);
                    if (data._lightConfigs && data._lightConfigs.length > 0) {
                        this._lightConfigs = data._lightConfigs;
                        this._activeConfigIndex = data._activeConfigIndex || 0;
                        loadConfig(this._activeConfigIndex);
                        if (this._updateTabBar) this._updateTabBar();
                    }
                };

                // 右键菜单显示配置信息
                const origGetExtraMenuOptions = this.getExtraMenuOptions;
                this.getExtraMenuOptions = function(canvas, options) {
                    if (origGetExtraMenuOptions) origGetExtraMenuOptions.apply(this, arguments);
                    options.unshift({
                        content: `Outputs: ${this._lightConfigs?.length || 1} | Active: ${(this._activeConfigIndex || 0) + 1}`,
                        disabled: true
                    });
                };

                // Clean up
                const originalOnRemoved = this.onRemoved;
                this.onRemoved = function() {
                    resizeObserver.disconnect();
                    window.removeEventListener('message', onMessage);
                    if (resizeTimeout) clearTimeout(resizeTimeout);
                    delete this._pendingImageSend;
                    if (iframe._blobUrl) URL.revokeObjectURL(iframe._blobUrl);
                    if (originalOnRemoved) originalOnRemoved.apply(this, arguments);
                };

                // Set initial node size
                this.setSize([350, 520]);

                return r;
            };
        }
    }
});
