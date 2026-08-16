# RanBox

**竹小冉测试百宝箱**是一个零依赖、纯前端的开发与测试工具集合。所有数据、文件和密钥只在浏览器本地处理，不会上传到服务器。

## 在线访问

<https://ranbox.zhuxiaoran.cc.cd/>

## 功能

- JSON 与数据：JSON 格式化、JSON Diff、JSONPath、Query 参数、Mock 造数
- 文本与编码：文本 Diff、正则测试、URL、Base64、HTML/Unicode、进制与字节、cURL ↔ Fetch
- 安全计算：JWT、Hash、HMAC/Webhook、AES-GCM/AES-CBC
- 时间与生成：时间戳、UUID v4、随机字符串

Mock 造数支持手机号、身份证、姓名、邮箱、地址等合成测试数据，并可导出 JSON、CSV 和 MySQL INSERT SQL。

## 使用方式

项目只有静态 HTML、CSS 和 JavaScript，可直接打开 `index.html`，也可以启动一个本地静态服务器：

```bash
python3 -m http.server 4173
```

然后访问 <http://127.0.0.1:4173/>。

## 项目结构

```text
RanBox/
├── index.html   # 页面结构
├── style.css    # 主题与响应式样式
├── app.js       # 工具注册、交互与算法实现
└── CNAME        # GitHub Pages 自定义域名
```

## 特性

- 无框架、无 CDN、无第三方依赖
- 自动跟随系统亮色/暗色主题
- 支持桌面端和移动端
- 使用 URL Hash 直达每个工具
- Web Crypto 用于 HMAC、JWT、AES 和 SHA 计算
- 输入内容和密钥不写入本地存储

## 安全说明

手机号、身份证和地址生成器只保证测试格式，不验证现实分配状态，也不应将生成结果当作真实个人信息使用。

## License

当前仓库未指定开源许可证，默认保留所有权利。
