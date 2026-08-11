(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const state = { active: "json-format", cleanup: null, example: null };

  const groups = [
    ["JSON 与数据", ["json-format", "json-diff", "jsonpath", "query", "mock-data"]],
    ["文本与编码", ["text-diff", "regex", "url", "base64", "entities", "radix", "curl-fetch"]],
    ["安全计算", ["jwt", "hash", "hmac", "aes"]],
    ["时间与生成", ["timestamp", "uuid", "random-string"]]
  ];

  const tools = [
    { id: "json-format", name: "JSON 格式化", group: "JSON 与数据", icon: "{}", keywords: "校验 压缩 pretty validate" },
    { id: "json-diff", name: "JSON Diff", group: "JSON 与数据", icon: "Δ", keywords: "比较 对比 差异" },
    { id: "jsonpath", name: "JSONPath", group: "JSON 与数据", icon: "$.", keywords: "查询 提取 filter" },
    { id: "query", name: "Query 参数", group: "JSON 与数据", icon: "?=", keywords: "url 参数 parse" },
    { id: "mock-data", name: "Mock 造数", group: "JSON 与数据", icon: "M", keywords: "手机号 身份证 SQL CSV 测试数据" },
    { id: "text-diff", name: "文本 Diff", group: "文本与编码", icon: "±", keywords: "文本 比较 行" },
    { id: "regex", name: "正则测试", group: "文本与编码", icon: ".*", keywords: "regex regexp 替换" },
    { id: "url", name: "URL 编解码", group: "文本与编码", icon: "%", keywords: "encode decode uri" },
    { id: "base64", name: "Base64", group: "文本与编码", icon: "64", keywords: "编码 解码 utf8" },
    { id: "entities", name: "HTML / Unicode", group: "文本与编码", icon: "&", keywords: "实体 转义 unicode emoji" },
    { id: "radix", name: "进制与字节", group: "文本与编码", icon: "01", keywords: "二进制 十六进制 单位 byte" },
    { id: "curl-fetch", name: "cURL ↔ Fetch", group: "文本与编码", icon: "↔", keywords: "请求 转换 http" },
    { id: "jwt", name: "JWT 解析验签", group: "安全计算", icon: "J", keywords: "token hmac verify" },
    { id: "hash", name: "Hash 计算", group: "安全计算", icon: "#", keywords: "md5 sha 文件" },
    { id: "hmac", name: "HMAC / Webhook", group: "安全计算", icon: "H", keywords: "签名 secret timestamp" },
    { id: "aes", name: "AES 加解密", group: "安全计算", icon: "A", keywords: "gcm cbc crypto" },
    { id: "timestamp", name: "时间戳转换", group: "时间与生成", icon: "T", keywords: "日期 UTC ISO 秒 毫秒" },
    { id: "uuid", name: "UUID 生成", group: "时间与生成", icon: "U", keywords: "v4 guid 批量" },
    { id: "random-string", name: "随机字符串", group: "时间与生成", icon: "R", keywords: "random password 生成" }
  ];

  const toolMap = Object.fromEntries(tools.map((tool) => [tool.id, tool]));

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function intro(text, badge = "本地处理") {
    return `<div class="tool-intro"><p>${text}</p><span class="tool-badge">${badge}</span></div>`;
  }

  function button(text, id, secondary = false) {
    return `<button class="${secondary ? "secondary-button" : "button"}" id="${id}" type="button">${text}</button>`;
  }

  function copyButton(target, label = "复制结果") {
    return `<button class="secondary-button" type="button" data-copy="${target}">${label}</button>`;
  }

  function card(title, body, actions = "") {
    return `<section class="card"><div class="card-header"><h2>${title}</h2><div class="toolbar">${actions}</div></div><div class="card-body">${body}</div></section>`;
  }

  const templates = {
    "json-format": () => intro("校验、格式化或压缩 JSON。格式化器按词法处理，避免改写超出 JavaScript 安全范围的整数。", "保留大整数") +
      card("JSON 输入", `<textarea class="code tall" id="json-input" spellcheck="false" placeholder='粘贴 JSON，例如 {"name":"竹小冉"}'></textarea><div class="result-actions">${button("校验", "json-validate", true)}${button("压缩", "json-minify", true)}${button("格式化", "json-format")}</div>`) +
      card("处理结果", `<div class="output empty" id="json-output">结果会显示在这里</div><div id="json-error" class="notice error hidden"></div>`, copyButton("#json-output")),

    "json-diff": () => intro("比较两份 JSON。结构模式关注字段和值，文本模式关注格式化后的行级变化。", "双模式") +
      `<div class="toolbar push"><div class="toolbar"><div class="segmented" id="json-diff-mode"><button class="active" data-mode="structure">结构模式</button><button data-mode="text">文本模式</button></div><div class="segmented" id="json-diff-view"><button class="active" data-view="unified">统一视图</button><button data-view="side">并排视图</button></div></div><div class="check-row"><label class="check"><input type="checkbox" id="diff-only" checked>仅显示差异</label></div></div>` +
      card("左右输入", `<div class="grid-2"><label class="field"><span>原始 JSON</span><textarea class="code medium" id="json-left" spellcheck="false"></textarea></label><label class="field"><span>目标 JSON</span><textarea class="code medium" id="json-right" spellcheck="false"></textarea></label></div><div class="result-actions">${button("交换", "json-diff-swap", true)}${button("开始比较", "json-diff-run")}</div>`) +
      card("差异结果", `<div class="metric-row" id="json-diff-metrics"></div><div id="json-diff-result" class="output empty" style="margin-top:12px">等待比较</div>`),

    jsonpath: () => intro("在 JSON 中查询路径和值。支持属性、索引、通配符、递归、切片与安全过滤。", "无 eval") +
      card("查询", `<div class="grid-2"><label class="field"><span>JSON</span><textarea class="code tall" id="jp-json" spellcheck="false"></textarea></label><div class="stack"><label class="field"><span>JSONPath 表达式</span><input class="code" id="jp-path" type="text" value="$.users[*].name"></label><div class="notice">示例：<code>$..name</code>、<code>$.items[0:3]</code>、<code>$.users[?(@.age &gt;= 18)]</code></div>${button("执行查询", "jp-run")}</div></div>`) +
      card("匹配结果", `<div class="metric-row" id="jp-metrics"></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>路径</th><th>类型</th><th>值</th></tr></thead><tbody id="jp-results"><tr><td colspan="3">等待查询</td></tr></tbody></table></div>`, copyButton("#jp-results", "复制结果 JSON")),

    query: () => intro("解析完整 URL 或查询字符串，保留重复键、空值和原始顺序，再重新构建参数。") +
      card("解析参数", `<label class="field"><span>URL 或 Query String</span><textarea class="code short" id="query-input" placeholder="https://example.com/api?page=1&tag=a&tag=b"></textarea></label><div class="result-actions">${button("解析", "query-parse")}</div>`) +
      card("参数表", `<div class="key-value-list" id="query-rows"></div><div class="result-actions">${button("添加参数", "query-add", true)}${button("重新构建", "query-build")}</div>`) +
      card("构建结果", `<div class="output empty" id="query-output">结果会显示在这里</div>`, copyButton("#query-output")),

    "mock-data": () => intro("生成格式合法但不对应现实身份的合成测试数据，可导出 JSON、CSV 或 MySQL INSERT SQL。", "合成测试数据") +
      card("生成设置", `<div class="grid-4"><label class="field"><span>数量</span><input id="mock-count" type="number" min="1" max="1000" value="10"></label><label class="field"><span>随机种子（可选）</span><input id="mock-seed" type="text" placeholder="相同种子可复现"></label><label class="field"><span>MySQL 表名</span><input id="mock-table" type="text" value="test_data"></label><label class="field"><span>每批 SQL 行数</span><input id="mock-batch" type="number" min="1" max="1000" value="100"></label></div><div class="notice warning" style="margin-top:12px">手机号、身份证和地址只保证测试格式，不验证现实分配状态，不应作为真实个人信息使用。</div>`) +
      card("JSON 模板（可选）", `<label class="field"><span>填写后优先使用模板；留空则使用下方字段配置</span><textarea class="code short" id="mock-template" spellcheck="false" placeholder='{"id":"{{uuid}}","name":"{{name}}","score":"{{integer:60:100}}"}'></textarea></label><div class="notice" style="margin-top:12px">支持占位符：name、mobile、idCard、email、address、uuid、integer、float、boolean、date、datetime、timestamp、ipv4、ipv6、url、enum。</div>`) +
      card("字段配置", `<div class="table-wrap"><table><thead><tr><th>字段名</th><th>类型</th><th>规则 / 默认值</th><th>可空 %</th><th></th></tr></thead><tbody id="mock-fields"></tbody></table></div><div class="result-actions">${button("添加字段", "mock-add", true)}${button("生成数据", "mock-run")}</div>`) +
      card("生成结果", `<div class="toolbar"><div class="segmented" id="mock-format"><button class="active" data-format="json">JSON</button><button data-format="csv">CSV</button><button data-format="sql">MySQL SQL</button></div><button class="secondary-button" id="mock-download" type="button">下载</button></div><div class="output empty" id="mock-output" style="margin-top:12px;max-height:520px">等待生成</div>`, copyButton("#mock-output")),

    "text-diff": () => intro("比较两段文本，显示行级增删并突出修改行中的字符差异。") +
      card("比较设置", `<div class="check-row"><label class="check"><input type="checkbox" id="td-case">忽略大小写</label><label class="check"><input type="checkbox" id="td-trailing">忽略行尾空格</label><label class="check"><input type="checkbox" id="td-space">忽略全部空白</label></div><div class="grid-2" style="margin-top:12px"><label class="field"><span>原始文本</span><textarea class="code medium" id="td-left"></textarea></label><label class="field"><span>目标文本</span><textarea class="code medium" id="td-right"></textarea></label></div><div class="result-actions">${button("交换", "td-swap", true)}${button("开始比较", "td-run")}</div>`) +
      card("差异结果", `<div class="metric-row" id="td-metrics"></div><div id="td-result" class="diff-view" style="margin-top:12px"><div class="output empty">等待比较</div></div>`),

    regex: () => intro("测试 JavaScript 正则表达式，查看每个匹配、捕获组和替换预览。") +
      card("表达式", `<div class="grid-4"><label class="field" style="grid-column:span 2"><span>Pattern</span><input class="code" id="regex-pattern" type="text" placeholder="(foo)-(?<id>\\d+)"></label><label class="field"><span>Flags</span><input class="code" id="regex-flags" type="text" value="g"></label><label class="field"><span>替换表达式</span><input class="code" id="regex-replace" type="text" placeholder="$1-$<id>"></label></div><label class="field" style="margin-top:12px"><span>测试文本</span><textarea class="code medium" id="regex-text"></textarea></label><div class="result-actions">${button("开始匹配", "regex-run")}</div>`) +
      card("匹配结果", `<div class="metric-row" id="regex-metrics"></div><div id="regex-highlight" class="output" style="margin-top:12px"></div><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>#</th><th>索引</th><th>完整匹配</th><th>捕获组</th></tr></thead><tbody id="regex-results"></tbody></table></div><label class="field" style="margin-top:12px"><span>替换预览</span><div class="output" id="regex-preview"></div></label>`),

    url: () => intro("在 URL 组件与完整 URL 两种语义之间切换，避免误编码路径分隔符。") +
      transformTemplate("URL", "url", `<div class="segmented" id="url-mode"><button class="active" data-mode="component">URL 组件</button><button data-mode="full">完整 URL</button></div>`, "输入 URL 或参数文本"),

    base64: () => intro("基于 UTF-8 进行 Base64 编解码，正确处理中文、Emoji 与换行。") +
      transformTemplate("Base64", "b64", "", "输入普通文本或 Base64"),

    entities: () => intro("处理 HTML 实体和 JavaScript Unicode 转义；解码过程不执行输入代码。") +
      card("转换设置", `<div class="toolbar push"><div class="segmented" id="entity-type"><button class="active" data-type="html">HTML 实体</button><button data-type="unicode">Unicode 转义</button></div><select id="entity-style" style="width:auto"><option value="named">命名实体 / \\uXXXX</option><option value="numeric">数字实体 / \\u{XXXXX}</option></select></div><label class="field" style="margin-top:12px"><span>输入</span><textarea class="code medium" id="entity-input"></textarea></label><div class="result-actions">${button("解码", "entity-decode", true)}${button("编码", "entity-encode")}</div>`) +
      card("结果", `<div class="output empty" id="entity-output">结果会显示在这里</div>`, copyButton("#entity-output")),

    radix: () => intro("使用 BigInt 无损转换超大整数，并区分十进制与二进制字节单位。") +
      card("整数进制", `<div class="grid-2"><label class="field"><span>输入进制</span><select id="radix-from"><option value="2">二进制</option><option value="8">八进制</option><option value="10" selected>十进制</option><option value="16">十六进制</option></select></label><label class="field"><span>整数</span><input class="code" id="radix-input" type="text" value="255"></label></div><div class="result-actions">${button("转换", "radix-run")}</div><div class="metric-row" id="radix-results" style="margin-top:12px"></div>`) +
      card("字节单位", `<div class="grid-3"><label class="field"><span>数值</span><input id="byte-value" type="text" value="1024"></label><label class="field"><span>源单位</span><select id="byte-from">${byteUnitOptions("B")}</select></label><label class="field"><span>目标单位</span><select id="byte-to">${byteUnitOptions("KiB")}</select></label></div><div class="result-actions">${button("换算", "byte-run")}</div><div class="output empty" id="byte-output" style="margin-top:12px">结果会显示在这里</div>`),

    "curl-fetch": () => intro("在常用 cURL 与字面量 Fetch 代码之间转换。只解析文本，不发送请求、不执行代码。", "不发起请求") +
      card("请求代码", `<div class="toolbar"><div class="segmented" id="request-input-type"><button class="active" data-type="curl">输入 cURL</button><button data-type="fetch">输入 Fetch</button></div></div><textarea class="code tall" id="request-input" style="margin-top:12px" spellcheck="false"></textarea><div class="result-actions">${button("解析并转换", "request-run")}</div>`) +
      card("转换结果", `<div class="grid-2"><label class="field"><span>cURL</span><textarea class="code medium" id="request-curl" readonly></textarea></label><label class="field"><span>Fetch JavaScript</span><textarea class="code medium" id="request-fetch" readonly></textarea></label></div><div class="notice warning" id="request-warning" style="margin-top:12px">复杂 Shell 变量、命令替换和动态 JavaScript 不在支持范围内。</div>`, `${copyButton("#request-curl", "复制 cURL")}${copyButton("#request-fetch", "复制 Fetch")}`),

    jwt: () => intro("解析 JWT Header/Payload，并使用共享密钥验证 HS256、HS384 或 HS512 签名。", "解析成功 ≠ 签名可信") +
      card("Token", `<textarea class="code medium" id="jwt-token" spellcheck="false" placeholder="eyJhbGciOiJIUzI1Ni... "></textarea><div class="grid-3" style="margin-top:12px"><label class="field"><span>共享密钥</span><input id="jwt-secret" type="password" autocomplete="off"></label><label class="field"><span>密钥格式</span><select id="jwt-secret-format"><option value="text">文本 UTF-8</option><option value="hex">Hex</option><option value="base64">Base64</option></select></label><div class="field"><span>&nbsp;</span>${button("解析并验签", "jwt-run")}</div></div>`) +
      card("解析结果", `<div class="metric-row" id="jwt-metrics"></div><div class="grid-2" style="margin-top:12px"><label class="field"><span>Header</span><div class="output" id="jwt-header"></div></label><label class="field"><span>Payload</span><div class="output" id="jwt-payload"></div></label></div><div id="jwt-times" class="metric-row" style="margin-top:12px"></div>`),

    hash: () => intro("对 UTF-8 文本或本地文件计算 MD5、SHA-1、SHA-256、SHA-512。") +
      card("输入", `<div class="segmented" id="hash-source"><button class="active" data-source="text">文本</button><button data-source="file">文件</button></div><label class="field" id="hash-text-wrap" style="margin-top:12px"><span>文本</span><textarea class="code medium" id="hash-text"></textarea></label><div class="drop-zone hidden" id="hash-file-wrap" style="margin-top:12px"><input id="hash-file" type="file"><p>文件不会上传，Hash 在浏览器中计算。</p></div><div class="result-actions">${button("计算 Hash", "hash-run")}</div>`) +
      card("结果", `<div class="stack" id="hash-results"><div class="output empty">等待计算</div></div>`),

    hmac: () => intro("计算 HMAC 或构造 Webhook 签名原文，并与期望签名安全比较。") +
      card("签名设置", `<div class="grid-4"><label class="field"><span>算法</span><select id="hmac-alg"><option>SHA-256</option><option>SHA-1</option><option>SHA-384</option><option>SHA-512</option></select></label><label class="field"><span>密钥格式</span><select id="hmac-key-format"><option value="text">文本</option><option value="hex">Hex</option><option value="base64">Base64</option></select></label><label class="field"><span>输出格式</span><select id="hmac-output-format"><option value="hex">Hex</option><option value="base64">Base64</option></select></label><label class="field"><span>时间戳</span><input id="hmac-timestamp" type="text"></label></div><div class="grid-2" style="margin-top:12px"><label class="field"><span>密钥</span><input id="hmac-key" type="password" autocomplete="off"></label><label class="field"><span>签名原文模板</span><input class="code" id="hmac-template" type="text" value="{{body}}"></label></div><label class="field" style="margin-top:12px"><span>Body / 消息</span><textarea class="code short" id="hmac-body"></textarea></label><label class="field" style="margin-top:12px"><span>期望签名（可选）</span><input class="code" id="hmac-expected" type="text"></label><div class="result-actions">${button("计算签名", "hmac-run")}</div>`) +
      card("签名结果", `<label class="field"><span>最终待签名文本</span><div class="output" id="hmac-message"></div></label><label class="field" style="margin-top:12px"><span>签名</span><div class="output empty" id="hmac-output">等待计算</div></label><div id="hmac-verify" style="margin-top:12px"></div>`, copyButton("#hmac-output")),

    aes: () => intro("使用 Web Crypto 执行 AES-GCM 或 AES-CBC。默认采用带认证的 GCM。") +
      card("加密设置", `<div class="grid-4"><label class="field"><span>模式</span><select id="aes-mode"><option value="GCM">AES-GCM</option><option value="CBC">AES-CBC</option></select></label><label class="field"><span>密钥位数</span><select id="aes-size"><option value="256">256</option><option value="128">128</option><option value="192">192</option></select></label><label class="field"><span>数据格式</span><select id="aes-format"><option value="base64">Base64</option><option value="hex">Hex</option></select></label><label class="field"><span>密钥格式</span><select id="aes-key-format"><option value="base64">Base64</option><option value="hex">Hex</option><option value="text">文本 UTF-8</option></select></label></div><div class="grid-2" style="margin-top:12px"><label class="field"><span>密钥</span><input class="code" id="aes-key" type="password" autocomplete="off"></label><label class="field"><span>IV</span><input class="code" id="aes-iv" type="text"></label></div><div class="result-actions">${button("生成密钥和 IV", "aes-generate", true)}</div>`) +
      card("内容", `<label class="field"><span>明文（UTF-8）</span><textarea class="code short" id="aes-plain"></textarea></label><label class="field" style="margin-top:12px"><span>密文</span><textarea class="code short" id="aes-cipher"></textarea></label><label class="field" id="aes-tag-wrap" style="margin-top:12px"><span>认证 Tag</span><input class="code" id="aes-tag" type="text"></label><div class="notice warning hidden" id="aes-warning" style="margin-top:12px">CBC 不提供完整性认证，请优先使用 GCM。</div><div class="result-actions">${button("解密", "aes-decrypt", true)}${button("加密", "aes-encrypt")}</div>`),

    timestamp: () => intro("在秒、毫秒时间戳与本地日期、UTC、ISO 8601 之间转换。") +
      card("时间戳转日期", `<div class="inline-field"><label class="field"><span>时间戳（自动识别秒/毫秒）</span><input class="code" id="ts-input" type="text"></label>${button("使用当前时间", "ts-now", true)}${button("转换", "ts-convert")}</div><div class="metric-row" id="ts-results" style="margin-top:12px"></div>`) +
      card("日期转时间戳", `<div class="inline-field"><label class="field"><span>本地日期时间</span><input id="date-input" type="datetime-local" step=".001"></label>${button("转换", "date-convert")}</div><div class="metric-row" id="date-results" style="margin-top:12px"></div>`),

    uuid: () => intro("生成符合 RFC 4122 版本位和 variant 位要求的 UUID v4。") +
      generatorTemplate("UUID v4", "uuid", `<label class="field"><span>生成数量</span><input id="uuid-count" type="number" min="1" max="1000" value="10"></label>`, "生成 UUID"),

    "random-string": () => intro("使用密码学安全随机数和拒绝采样生成均匀分布的随机字符串。") +
      generatorTemplate("随机字符串", "random", `<div class="grid-2"><label class="field"><span>长度</span><input id="random-length" type="number" min="1" max="256" value="24"></label><label class="field"><span>数量</span><input id="random-count" type="number" min="1" max="100" value="10"></label></div><div class="check-row" style="margin-top:12px"><label class="check"><input id="random-lower" type="checkbox" checked>小写字母</label><label class="check"><input id="random-upper" type="checkbox" checked>大写字母</label><label class="check"><input id="random-number" type="checkbox" checked>数字</label><label class="check"><input id="random-symbol" type="checkbox">符号</label></div>`, "生成随机字符串")
  };

  function transformTemplate(name, prefix, extra, placeholder) {
    return card("转换设置", `${extra}<label class="field" style="margin-top:12px"><span>输入</span><textarea class="code medium" id="${prefix}-input" placeholder="${placeholder}"></textarea></label><div class="result-actions">${button("解码", `${prefix}-decode`, true)}${button("编码", `${prefix}-encode`)}</div>`) +
      card("结果", `<div class="output empty" id="${prefix}-output">结果会显示在这里</div>`, copyButton(`#${prefix}-output`));
  }

  function generatorTemplate(title, prefix, controls, actionLabel) {
    return card("生成设置", `${controls}<div class="result-actions">${button(actionLabel, `${prefix}-run`)}</div>`) +
      card(title, `<div class="output empty" id="${prefix}-output">等待生成</div>`, copyButton(`#${prefix}-output`));
  }

  function byteUnitOptions(selected) {
    return ["B", "KB", "MB", "GB", "TB", "KiB", "MiB", "GiB", "TiB"].map((u) => `<option${u === selected ? " selected" : ""}>${u}</option>`).join("");
  }

  function toast(message, type = "success") {
    const node = document.createElement("div");
    node.className = `toast ${type === "error" ? "error" : ""}`;
    node.textContent = message;
    $("#toast-region").append(node);
    setTimeout(() => node.remove(), 2600);
  }

  function setStatus(main, meta = [], kind = "ok") {
    $("#status-main").textContent = main;
    $("#status-light").className = `status-light ${kind === "error" ? "error" : kind === "busy" ? "busy" : ""}`;
    $("#status-meta").innerHTML = meta.map((item) => `<span>${esc(item)}</span>`).join("");
  }

  function byteLength(value) { return encoder.encode(String(value ?? "")).length; }
  function toHex(bytes) { return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
  function fromHex(value) {
    const clean = value.replace(/\s+/g, "");
    if (!/^[0-9a-f]*$/i.test(clean) || clean.length % 2) throw new Error("Hex 必须由偶数个十六进制字符组成");
    return new Uint8Array(clean.match(/.{2}/g)?.map((v) => parseInt(v, 16)) || []);
  }
  function toBase64(bytes) {
    let binary = "";
    const data = new Uint8Array(bytes);
    for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
    return btoa(binary);
  }
  function fromBase64(value, urlSafe = false) {
    let clean = value.replace(/\s+/g, "");
    if (urlSafe) clean = clean.replace(/-/g, "+").replace(/_/g, "/");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) throw new Error("Base64 格式无效");
    clean += "=".repeat((4 - clean.length % 4) % 4);
    const binary = atob(clean);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  function decodeByFormat(value, format) {
    if (format === "hex") return fromHex(value);
    if (format === "base64") return fromBase64(value);
    return encoder.encode(value);
  }
  function encodeByFormat(bytes, format) { return format === "hex" ? toHex(bytes) : toBase64(bytes); }

  async function copyText(value) {
    if (!value) throw new Error("没有可复制的内容");
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const area = document.createElement("textarea");
      area.value = value; area.style.position = "fixed"; area.style.opacity = "0";
      document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
    }
  }

  function getTargetText(selector) {
    const target = $(selector);
    if (!target) return "";
    return "value" in target ? target.value : target.innerText;
  }

  function downloadText(name, text, type = "text/plain;charset=utf-8") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a"); link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function bind(id, event, handler) {
    const node = $(`#${id}`);
    if (node) node.addEventListener(event, async (e) => {
      try { await handler(e); } catch (error) { setStatus(error.message, [], "error"); toast(error.message, "error"); }
    });
  }

  function markOutput(node, value, emptyText = "结果会显示在这里") {
    node.textContent = value || emptyText;
    node.classList.toggle("empty", !value);
  }

  function renderNavigation(query = "") {
    const needle = query.trim().toLowerCase();
    $("#tool-nav").innerHTML = groups.map(([group, ids]) => {
      const matches = ids.map((id) => toolMap[id]).filter((tool) => !needle || `${tool.name} ${tool.keywords}`.toLowerCase().includes(needle));
      if (!matches.length) return "";
      return `<section class="nav-group"><h2 class="nav-group-title">${group}</h2>${matches.map((tool) => `<button class="nav-item ${tool.id === state.active ? "active" : ""}" data-tool="${tool.id}" type="button"><span class="nav-icon">${esc(tool.icon)}</span><span>${tool.name}</span></button>`).join("")}</section>`;
    }).join("") || `<div class="notice">没有匹配的工具</div>`;
  }

  function closeMenu() {
    $("#sidebar").classList.remove("open");
    $("#mobile-backdrop").classList.remove("show");
    $("#menu-button").setAttribute("aria-expanded", "false");
  }

  function activateTool(id, pushHash = true) {
    const tool = toolMap[id] || tools[0];
    state.cleanup?.(); state.cleanup = null; state.active = tool.id;
    $("#tool-group").textContent = tool.group;
    $("#tool-title").textContent = tool.name;
    $("#workspace").innerHTML = `<article class="tool-panel" data-active-tool="${tool.id}">${templates[tool.id]()}</article>`;
    renderNavigation($("#tool-search").value);
    if (pushHash && location.hash !== `#${tool.id}`) history.replaceState(null, "", `#${tool.id}`);
    state.example = null;
    state.cleanup = initializers[tool.id]?.() || null;
    setStatus("准备就绪", ["0 字符", "0 字节", "本地处理"]);
    closeMenu();
  }

  function lexicalJson(value, pretty) {
    JSON.parse(value);
    let output = "", inString = false, escaped = false, indent = 0;
    for (const char of value) {
      if (inString) {
        output += char;
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; output += char; continue; }
      if (/\s/.test(char)) continue;
      if (!pretty) { output += char; continue; }
      if (char === "{" || char === "[") { indent++; output += `${char}\n${"  ".repeat(indent)}`; }
      else if (char === "}" || char === "]") { indent--; output = output.replace(/[ \t]+$/, ""); output += `\n${"  ".repeat(indent)}${char}`; }
      else if (char === ",") output += `,\n${"  ".repeat(indent)}`;
      else if (char === ":") output += ": ";
      else output += char;
    }
    return output.replace(/([\[{])\n\s*([\]}])/g, "$1$2");
  }

  function jsonErrorDetail(error, value) {
    const pos = Number(error.message.match(/position\s+(\d+)/i)?.[1]);
    if (!Number.isFinite(pos)) return error.message;
    const before = value.slice(0, pos), lines = before.split("\n");
    return `${error.message}（第 ${lines.length} 行，第 ${lines.at(-1).length + 1} 列）`;
  }

  function initJsonFormat() {
    const input = $("#json-input"), output = $("#json-output"), errorBox = $("#json-error");
    const run = (mode) => {
      try {
        if (!input.value.trim()) throw new Error("请输入 JSON");
        const result = lexicalJson(input.value, mode === "format");
        errorBox.classList.add("hidden");
        markOutput(output, mode === "validate" ? "JSON 格式有效" : result);
        setStatus("JSON 格式有效", [`${input.value.length} 字符`, `${byteLength(input.value)} 字节`, mode === "validate" ? "已校验" : mode === "format" ? "已格式化" : "已压缩"]);
      } catch (error) {
        const message = jsonErrorDetail(error, input.value); errorBox.textContent = message; errorBox.classList.remove("hidden");
        setStatus("JSON 格式无效", [`${input.value.length} 字符`, `${byteLength(input.value)} 字节`], "error");
      }
    };
    bind("json-format", "click", () => run("format")); bind("json-minify", "click", () => run("minify")); bind("json-validate", "click", () => run("validate"));
    input.addEventListener("input", () => setStatus("等待处理", [`${input.value.length} 字符`, `${byteLength(input.value)} 字节`, "本地处理"]));
    state.example = () => { input.value = '{"project":"竹小冉测试百宝箱","active":true,"largeId":9223372036854775807,"tools":["JSON","Base64","Hash"]}'; run("format"); };
  }

  function structureDiff(left, right, path = "$") {
    const result = [];
    const leftArray = Array.isArray(left), rightArray = Array.isArray(right);
    const leftObj = left && typeof left === "object", rightObj = right && typeof right === "object";
    if (leftArray !== rightArray || leftObj !== rightObj || (!leftObj && typeof left !== typeof right)) return [{ type: "change", path, left, right }];
    if (!leftObj) return Object.is(left, right) ? [] : [{ type: "change", path, left, right }];
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
    for (const key of keys) {
      const childPath = Array.isArray(left) && Array.isArray(right) ? `${path}[${key}]` : `${path}.${key}`;
      if (!Object.prototype.hasOwnProperty.call(left, key)) result.push({ type: "add", path: childPath, right: right[key] });
      else if (!Object.prototype.hasOwnProperty.call(right, key)) result.push({ type: "remove", path: childPath, left: left[key] });
      else result.push(...structureDiff(left[key], right[key], childPath));
    }
    return result;
  }

  function myersDiff(a, b) {
    const n = a.length, m = b.length, max = n + m, v = new Map([[1, 0]]), trace = [];
    for (let d = 0; d <= max; d++) {
      trace.push(new Map(v));
      for (let k = -d; k <= d; k += 2) {
        let x;
        if (k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1))) x = v.get(k + 1) ?? 0;
        else x = (v.get(k - 1) ?? 0) + 1;
        let y = x - k;
        while (x < n && y < m && a[x] === b[y]) { x++; y++; }
        v.set(k, x);
        if (x >= n && y >= m) return backtrackDiff(trace, a, b);
      }
    }
    return [];
  }

  function backtrackDiff(trace, a, b) {
    let x = a.length, y = b.length; const out = [];
    for (let d = trace.length - 1; d >= 0; d--) {
      const v = trace[d], k = x - y;
      const prevK = k === -d || (k !== d && (v.get(k - 1) ?? -1) < (v.get(k + 1) ?? -1)) ? k + 1 : k - 1;
      const prevX = v.get(prevK) ?? 0, prevY = prevX - prevK;
      while (x > prevX && y > prevY) { out.push({ type: "equal", value: a[x - 1] }); x--; y--; }
      if (d === 0) break;
      if (x === prevX) { out.push({ type: "add", value: b[y - 1] }); y--; }
      else { out.push({ type: "remove", value: a[x - 1] }); x--; }
    }
    return out.reverse();
  }

  function inlineHighlight(left, right) {
    let prefix = 0; while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix++;
    let suffix = 0; while (suffix < left.length - prefix && suffix < right.length - prefix && left[left.length - 1 - suffix] === right[right.length - 1 - suffix]) suffix++;
    const render = (value, className) => `${esc(value.slice(0, prefix))}<span class="${className}">${esc(value.slice(prefix, value.length - suffix || value.length))}</span>${suffix ? esc(value.slice(-suffix)) : ""}`;
    return [render(left, "diff-inline-remove"), render(right, "diff-inline-add")];
  }
  function renderTextDiff(ops) {
    let l = 0, r = 0, html = "";
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i], next = ops[i + 1];
      if (op.type === "remove" && next?.type === "add") {
        const [left, right] = inlineHighlight(op.value, next.value); l++; r++;
        html += `<div class="diff-line remove"><span class="ln">${l}</span><span class="ln"></span><span>${left}</span></div><div class="diff-line add"><span class="ln"></span><span class="ln">${r}</span><span>${right}</span></div>`; i++; continue;
      }
      if (op.type !== "add") l++; if (op.type !== "remove") r++;
      html += `<div class="diff-line ${op.type}"><span class="ln">${op.type === "add" ? "" : l}</span><span class="ln">${op.type === "remove" ? "" : r}</span><span>${esc(op.value)}</span></div>`;
    }
    return html;
  }
  function renderSideDiff(ops) {
    let leftLine = 0, rightLine = 0, left = "", right = "";
    for (const op of ops) {
      if (op.type === "equal") { leftLine++; rightLine++; left += `<div class="diff-line side"><span class="ln">${leftLine}</span><span>${esc(op.value)}</span></div>`; right += `<div class="diff-line side"><span class="ln">${rightLine}</span><span>${esc(op.value)}</span></div>`; }
      else if (op.type === "remove") { leftLine++; left += `<div class="diff-line side remove"><span class="ln">${leftLine}</span><span>${esc(op.value)}</span></div>`; right += `<div class="diff-line side remove"><span class="ln"></span><span> </span></div>`; }
      else { rightLine++; left += `<div class="diff-line side add"><span class="ln"></span><span> </span></div>`; right += `<div class="diff-line side add"><span class="ln">${rightLine}</span><span>${esc(op.value)}</span></div>`; }
    }
    return `<div class="grid-2"><div class="diff-view">${left}</div><div class="diff-view">${right}</div></div>`;
  }

  function initJsonDiff() {
    let mode = "structure", view = "unified";
    $$("#json-diff-mode button").forEach((node) => node.addEventListener("click", () => { mode = node.dataset.mode; $$("#json-diff-mode button").forEach((b) => b.classList.toggle("active", b === node)); }));
    $$("#json-diff-view button").forEach((node) => node.addEventListener("click", () => { view = node.dataset.view; $$("#json-diff-view button").forEach((b) => b.classList.toggle("active", b === node)); }));
    bind("json-diff-swap", "click", () => { const a = $("#json-left"); const b = $("#json-right"); [a.value, b.value] = [b.value, a.value]; });
    bind("json-diff-run", "click", () => {
      const lText = $("#json-left").value, rText = $("#json-right").value;
      if (Math.max(byteLength(lText), byteLength(rText)) > 2 * 1024 * 1024 || Math.max(lText.split("\n").length, rText.split("\n").length) > 10000) throw new Error("单侧内容不能超过 2 MB 或 10,000 行");
      const left = JSON.parse(lText), right = JSON.parse(rText), result = $("#json-diff-result");
      if (mode === "structure") {
        const diffs = structureDiff(left, right); const only = $("#diff-only").checked;
        $("#json-diff-metrics").innerHTML = diffMetrics(diffs);
        result.className = "table-wrap";
        result.innerHTML = `<table><thead><tr><th>类型</th><th>JSONPath</th><th>原值</th><th>新值</th></tr></thead><tbody>${diffs.length ? diffs.map((d) => `<tr><td><span class="tag ${d.type}">${{ add: "新增", remove: "删除", change: "修改" }[d.type]}</span></td><td><code>${esc(d.path)}</code></td><td><code>${esc(d.left === undefined ? "—" : JSON.stringify(d.left))}</code></td><td><code>${esc(d.right === undefined ? "—" : JSON.stringify(d.right))}</code></td></tr>`).join("") : `<tr><td colspan="4">两份 JSON 完全一致</td></tr>`}</tbody></table>`;
        void only;
        setStatus(diffs.length ? `发现 ${diffs.length} 项差异` : "JSON 完全一致", [`${diffs.length} 项差异`, "结构比较", "对象忽略键顺序"]);
      } else {
        const l = lexicalJson(lText, true).split("\n"), r = lexicalJson(rText, true).split("\n"), ops = myersDiff(l, r);
        const diffs = ops.filter((op) => op.type !== "equal");
        $("#json-diff-metrics").innerHTML = diffMetrics(diffs);
        const visibleOps = $("#diff-only").checked ? ops.filter((op) => op.type !== "equal") : ops;
        result.className = view === "unified" ? "diff-view" : ""; result.innerHTML = view === "unified" ? renderTextDiff(visibleOps) : renderSideDiff(visibleOps);
        setStatus(diffs.length ? `发现 ${diffs.length} 行变化` : "JSON 文本一致", [`${l.length} → ${r.length} 行`, "Myers Diff", "已格式化"]);
      }
    });
    state.example = () => { $("#json-left").value = '{"name":"竹小冉","version":1,"tools":["JSON","URL"]}'; $("#json-right").value = '{"version":2,"name":"竹小冉","tools":["JSON","URL","Hash"],"active":true}'; $("#json-diff-run").click(); };
  }

  function diffMetrics(diffs) {
    const count = (type) => diffs.filter((d) => d.type === type).length;
    return [["新增", count("add")], ["删除", count("remove")], ["修改", count("change")], ["合计", diffs.length]].map(([k, v]) => `<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join("");
  }

  function parseJsonPath(expression) {
    if (!expression.startsWith("$")) throw new Error("JSONPath 必须以 $ 开头");
    const tokens = []; let i = 1;
    while (i < expression.length) {
      if (expression.startsWith("..", i)) {
        i += 2; const match = expression.slice(i).match(/^(\*|[A-Za-z_$][\w$-]*)/); if (!match) throw new Error(`递归字段语法错误：位置 ${i}`);
        tokens.push({ type: "recursive", key: match[1] }); i += match[1].length;
      } else if (expression[i] === ".") {
        i++; const match = expression.slice(i).match(/^(\*|[A-Za-z_$][\w$-]*)/); if (!match) throw new Error(`属性语法错误：位置 ${i}`);
        tokens.push({ type: match[1] === "*" ? "wildcard" : "key", key: match[1] }); i += match[1].length;
      } else if (expression[i] === "[") {
        let end = i + 1, quote = null, depth = 1;
        for (; end < expression.length; end++) { const c = expression[end]; if (quote) { if (c === quote && expression[end - 1] !== "\\") quote = null; } else if (c === '"' || c === "'") quote = c; else if (c === "[") depth++; else if (c === "]" && --depth === 0) break; }
        if (end >= expression.length) throw new Error("缺少右方括号 ]");
        const content = expression.slice(i + 1, end).trim();
        if (content === "*") tokens.push({ type: "wildcard" });
        else if (/^-?\d+$/.test(content)) tokens.push({ type: "index", index: Number(content) });
        else if (/^-?\d*:-?\d*(?::-?\d+)?$/.test(content)) tokens.push({ type: "slice", parts: content.split(":").map((v) => v === "" ? null : Number(v)) });
        else if (/^(['"]).*\1$/.test(content)) tokens.push({ type: "key", key: content.slice(1, -1).replace(/\\(['"\\])/g, "$1") });
        else if (content.startsWith("?(") && content.endsWith(")")) tokens.push({ type: "filter", expression: content.slice(2, -1) });
        else throw new Error(`不支持的方括号表达式：[${content}]`);
        i = end + 1;
      } else throw new Error(`无法识别位置 ${i} 的字符`);
    }
    return tokens;
  }

  function filterValue(item, expression) {
    const orParts = expression.split(/\s*\|\|\s*/);
    return orParts.some((orPart) => orPart.split(/\s*&&\s*/).every((condition) => {
      const match = condition.trim().match(/^@(?:\.([A-Za-z_$][\w$-]*))?\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
      if (!match) throw new Error(`不支持的过滤条件：${condition}`);
      const actual = match[1] ? item?.[match[1]] : item; let expected;
      try { expected = JSON.parse(match[3]); } catch { expected = match[3].replace(/^(['"])(.*)\1$/, "$2"); }
      return ({ "==": () => actual === expected, "!=": () => actual !== expected, ">": () => actual > expected, ">=": () => actual >= expected, "<": () => actual < expected, "<=": () => actual <= expected }[match[2]])();
    }));
  }

  function runJsonPath(root, expression) {
    let nodes = [{ value: root, path: "$" }];
    for (const token of parseJsonPath(expression)) {
      const next = [];
      const addRecursive = (value, path) => {
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          const childPath = Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`;
          if (token.key === "*" || key === token.key) next.push({ value: child, path: childPath });
          addRecursive(child, childPath);
        }
      };
      for (const node of nodes) {
        const value = node.value;
        if (token.type === "key" && value != null && Object.prototype.hasOwnProperty.call(Object(value), token.key)) next.push({ value: value[token.key], path: `${node.path}.${token.key}` });
        else if (token.type === "index" && Array.isArray(value)) { const index = token.index < 0 ? value.length + token.index : token.index; if (index >= 0 && index < value.length) next.push({ value: value[index], path: `${node.path}[${index}]` }); }
        else if (token.type === "wildcard" && value && typeof value === "object") Object.entries(value).forEach(([key, child]) => next.push({ value: child, path: Array.isArray(value) ? `${node.path}[${key}]` : `${node.path}.${key}` }));
        else if (token.type === "slice" && Array.isArray(value)) { let [start, end, step = 1] = token.parts; step ||= 1; start = start ?? (step > 0 ? 0 : value.length - 1); end = end ?? (step > 0 ? value.length : -1); if (start < 0) start += value.length; if (end < 0 && token.parts[1] !== null) end += value.length; for (let j = start; step > 0 ? j < end : j > end; j += step) if (j >= 0 && j < value.length) next.push({ value: value[j], path: `${node.path}[${j}]` }); }
        else if (token.type === "filter" && Array.isArray(value)) value.forEach((child, index) => { if (filterValue(child, token.expression)) next.push({ value: child, path: `${node.path}[${index}]` }); });
        else if (token.type === "recursive") addRecursive(value, node.path);
      }
      nodes = next;
    }
    return nodes;
  }

  function initJsonPath() {
    bind("jp-run", "click", () => {
      const results = runJsonPath(JSON.parse($("#jp-json").value), $("#jp-path").value.trim());
      $("#jp-metrics").innerHTML = `<div class="metric"><span>匹配数量</span><strong>${results.length}</strong></div><div class="metric"><span>表达式</span><strong>${esc($("#jp-path").value)}</strong></div>`;
      $("#jp-results").innerHTML = results.length ? results.map((r) => `<tr><td><code>${esc(r.path)}</code></td><td>${Array.isArray(r.value) ? "array" : r.value === null ? "null" : typeof r.value}</td><td><code>${esc(JSON.stringify(r.value))}</code></td></tr>`).join("") : `<tr><td colspan="3">没有匹配项</td></tr>`;
      $("#jp-results").dataset.copyValue = JSON.stringify(results.map((r) => ({ path: r.path, value: r.value })), null, 2);
      setStatus(`匹配 ${results.length} 项`, [$("#jp-path").value, `${results.length} 项结果`, "安全解析"]);
    });
    state.example = () => { $("#jp-json").value = JSON.stringify({ users: [{ name: "小冉", age: 24 }, { name: "阿竹", age: 17 }, { name: "测试员", age: 31 }] }, null, 2); $("#jp-path").value = "$.users[?(@.age >= 18)].name"; $("#jp-run").click(); };
  }

  function queryRow(key = "", value = "") {
    const row = document.createElement("div"); row.className = "key-value-row";
    row.innerHTML = `<input type="text" aria-label="参数名" value="${esc(key)}"><input type="text" aria-label="参数值" value="${esc(value)}"><button class="danger-button" type="button">删除</button>`;
    $("button", row).addEventListener("click", () => row.remove()); return row;
  }
  function initQuery() {
    const rows = $("#query-rows");
    const add = (k, v) => rows.append(queryRow(k, v));
    bind("query-add", "click", () => add("", ""));
    bind("query-parse", "click", () => {
      let value = $("#query-input").value.trim(); if (!value) throw new Error("请输入 URL 或 Query String");
      const base = /^[a-z][a-z\d+.-]*:/i.test(value) ? new URL(value) : new URL(value.startsWith("?") ? `https://local.test/${value}` : `https://local.test/?${value}`);
      rows.innerHTML = ""; base.searchParams.forEach((v, k) => add(k, v)); if (!rows.children.length) add("", "");
      rows.dataset.base = /^[a-z][a-z\d+.-]*:/i.test(value) ? `${base.origin}${base.pathname}${base.hash}` : "";
      setStatus(`解析 ${base.searchParams.size} 个参数`, [`${base.searchParams.size} 项`, "保留重复键", "本地处理"]);
    });
    bind("query-build", "click", () => {
      const params = new URLSearchParams(); $$(".key-value-row", rows).forEach((row) => { const inputs = $$('input', row); if (inputs[0].value) params.append(inputs[0].value, inputs[1].value); });
      const query = params.toString(), output = `${rows.dataset.base || ""}${query ? `?${query}` : ""}`; markOutput($("#query-output"), output || "?");
      setStatus("参数已构建", [`${params.size} 项`, `${output.length} 字符`, "顺序已保留"]);
    });
    state.example = () => { $("#query-input").value = "https://api.example.com/search?q=%E7%AB%B9%E5%B0%8F%E5%86%89&tag=json&tag=tools&empty="; $("#query-parse").click(); $("#query-build").click(); };
  }

  const mockTypes = [
    ["name", "中文姓名"], ["mobile", "手机号"], ["idCard", "身份证"], ["email", "邮箱"], ["address", "地址"], ["postcode", "邮编"],
    ["uuid", "UUID"], ["string", "随机字符串"], ["integer", "整数"], ["float", "小数"], ["boolean", "布尔"], ["date", "日期"],
    ["datetime", "日期时间"], ["timestamp", "时间戳"], ["ipv4", "IPv4"], ["ipv6", "IPv6"], ["url", "URL"], ["enum", "枚举"], ["fixed", "固定值"]
  ];
  const mockTypeOptions = () => mockTypes.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const provinceCodes = { "随机": ["110101", "310101", "440106", "330106", "320102", "510104", "420106", "610102", "500103", "370102"], "北京": ["110101"], "上海": ["310101"], "广东": ["440106"], "浙江": ["330106"], "江苏": ["320102"], "四川": ["510104"], "湖北": ["420106"], "陕西": ["610102"], "重庆": ["500103"], "山东": ["370102"] };
  const surnames = "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳唐罗薛雷贺倪汤";
  const givenChars = "子涵宇轩梓萱浩然欣怡若曦思远雨桐一诺嘉怡晨曦俊杰明哲诗涵安然可欣博文知夏清越景行";
  const addressParts = ["北京市东城区", "上海市黄浦区", "广东省广州市天河区", "浙江省杭州市西湖区", "江苏省南京市玄武区", "四川省成都市锦江区", "湖北省武汉市武昌区", "陕西省西安市新城区", "重庆市渝中区", "山东省济南市历下区"];

  function seededRandom(seedText) {
    if (!seedText) return () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    let h = 2166136261;
    for (const char of seedText) { h ^= char.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pick = (items, random) => items[Math.floor(random() * items.length)];
  const randomInt = (min, max, random) => Math.floor(random() * (max - min + 1)) + min;

  function makeIdCard(rule, random) {
    const parts = String(rule || "随机,不限,1960-01-01,2005-12-31").split(",").map((v) => v.trim());
    const province = provinceCodes[parts[0]] ? parts[0] : "随机", gender = parts[1] || "不限";
    const start = new Date(`${parts[2] || "1960-01-01"}T00:00:00`), end = new Date(`${parts[3] || "2005-12-31"}T00:00:00`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) throw new Error("身份证规则日期范围无效");
    const date = new Date(start.getTime() + Math.floor(random() * (end.getTime() - start.getTime() + 86400000)));
    const birth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    let seq = randomInt(1, 999, random); if (gender === "男" && seq % 2 === 0) seq++; if (gender === "女" && seq % 2 === 1) seq++;
    if (seq > 999) seq -= 2;
    const first17 = `${pick(provinceCodes[province], random)}${birth}${String(seq).padStart(3, "0")}`;
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2], checks = "10X98765432";
    return first17 + checks[[...first17].reduce((sum, n, i) => sum + Number(n) * weights[i], 0) % 11];
  }

  function uuidV4(randomBytes) {
    const bytes = randomBytes || crypto.getRandomValues(new Uint8Array(16)); bytes[6] = bytes[6] & 0x0f | 0x40; bytes[8] = bytes[8] & 0x3f | 0x80;
    const h = toHex(bytes); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  function seededBytes(length, random) { return Uint8Array.from({ length }, () => Math.floor(random() * 256)); }
  function makeRandomString(length, chars, random) { let result = ""; for (let i = 0; i < length; i++) result += chars[Math.floor(random() * chars.length)]; return result; }

  function generateMock(type, rule, random, index) {
    const [a, b] = String(rule || "").split(/[,|]/).map((v) => v.trim());
    if (type === "name") return pick([...surnames], random) + pick([...givenChars], random) + (random() > .6 ? pick([...givenChars], random) : "");
    if (type === "mobile") return `1${randomInt(3, 9, random)}${String(randomInt(0, 999999999, random)).padStart(9, "0")}`;
    if (type === "idCard") return makeIdCard(rule, random);
    if (type === "email") return `${pick(["test", "qa", "mock", "user"], random)}${randomInt(1000, 999999, random)}@${pick(["example.com", "test.local", "mail.example"], random)}`;
    if (type === "address") return `${pick(addressParts, random)}测试路${randomInt(1, 999, random)}号${randomInt(1, 20, random)}栋${randomInt(101, 2508, random)}室`;
    if (type === "postcode") return String(randomInt(100000, 999999, random));
    if (type === "uuid") return uuidV4(seededBytes(16, random));
    if (type === "string") return makeRandomString(Number(a) || 16, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", random);
    if (type === "integer") return randomInt(Number(a) || 0, Number(b) || 100, random);
    if (type === "float") return Number((random() * ((Number(b) || 100) - (Number(a) || 0)) + (Number(a) || 0)).toFixed(2));
    if (type === "boolean") return random() >= .5;
    if (type === "date" || type === "datetime") { const start = new Date(a || "2020-01-01"), end = new Date(b || "2030-12-31"); const d = new Date(start.getTime() + random() * (end - start)); return type === "date" ? d.toISOString().slice(0, 10) : d.toISOString(); }
    if (type === "timestamp") return Math.floor(Date.now() / 1000) + index;
    if (type === "ipv4") return Array.from({ length: 4 }, () => randomInt(1, 254, random)).join(".");
    if (type === "ipv6") return Array.from({ length: 8 }, () => randomInt(0, 65535, random).toString(16)).join(":");
    if (type === "url") return `https://${pick(["api", "test", "mock"], random)}.example.com/${makeRandomString(8, "abcdefghijklmnopqrstuvwxyz", random)}`;
    if (type === "enum") return pick(String(rule || "A|B|C").split("|"), random);
    if (type === "fixed") { try { return JSON.parse(rule); } catch { return rule; } }
    return null;
  }

  function mockFromPlaceholder(token, random, index) {
    const [name, ...args] = token.trim().split(":");
    if (!mockTypes.some(([type]) => type === name)) throw new Error(`未知 Mock 占位符：${name}`);
    return generateMock(name, name === "enum" ? args.join(":") : args.join(","), random, index);
  }
  function renderMockTemplate(node, random, index) {
    if (Array.isArray(node)) return node.map((item) => renderMockTemplate(item, random, index));
    if (node && typeof node === "object") return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, renderMockTemplate(value, random, index)]));
    if (typeof node !== "string") return node;
    const exact = node.match(/^\{\{([^{}]+)\}\}$/); if (exact) return mockFromPlaceholder(exact[1], random, index);
    return node.replace(/\{\{([^{}]+)\}\}/g, (_, token) => String(mockFromPlaceholder(token, random, index)));
  }

  function mockFieldRow(name = "field", type = "string", rule = "", nullable = 0) {
    const row = document.createElement("tr");
    row.innerHTML = `<td><input type="text" value="${esc(name)}" aria-label="字段名"></td><td><select aria-label="字段类型">${mockTypeOptions()}</select></td><td><input type="text" value="${esc(rule)}" aria-label="生成规则" placeholder="按类型填写规则"></td><td><input type="number" min="0" max="100" value="${nullable}" aria-label="可空概率"></td><td><button class="danger-button" type="button">删除</button></td>`;
    $("select", row).value = type; $("button", row).addEventListener("click", () => row.remove()); return row;
  }

  function csvValue(value) { const s = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
  function toCsv(data) { if (!data.length) return ""; const keys = Object.keys(data[0]); return [keys.map(csvValue).join(","), ...data.map((row) => keys.map((key) => csvValue(row[key])).join(","))].join("\r\n"); }
  function sqlIdentifier(value) { if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(value)) throw new Error(`SQL 标识符无效：${value}`); return `\`${value}\``; }
  function sqlValue(value) { if (value === null) return "NULL"; if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL"; if (typeof value === "boolean") return value ? "1" : "0"; return `'${(typeof value === "object" ? JSON.stringify(value) : String(value)).replace(/'/g, "''")}'`; }
  function toSql(data, table, batchSize) {
    if (!data.length) return ""; const keys = Object.keys(data[0]), chunks = [];
    for (let i = 0; i < data.length; i += batchSize) chunks.push(`INSERT INTO ${sqlIdentifier(table)} (${keys.map(sqlIdentifier).join(", ")}) VALUES\n${data.slice(i, i + batchSize).map((row) => `(${keys.map((k) => sqlValue(row[k])).join(", ")})`).join(",\n")};`);
    return chunks.join("\n\n");
  }

  function initMockData() {
    const tbody = $("#mock-fields"), output = $("#mock-output"); let data = [], format = "json";
    [["name", "name", ""], ["mobile", "mobile", ""], ["id_card", "idCard", "随机,不限,1980-01-01,2005-12-31"], ["email", "email", ""], ["created_at", "datetime", "2024-01-01,2026-12-31"]].forEach((row) => tbody.append(mockFieldRow(...row)));
    bind("mock-add", "click", () => tbody.append(mockFieldRow(`field_${tbody.children.length + 1}`)));
    const render = () => {
      let value, ext, mime;
      if (format === "json") { value = JSON.stringify(data, null, 2); ext = "json"; mime = "application/json;charset=utf-8"; }
      else if (format === "csv") { value = toCsv(data); ext = "csv"; mime = "text/csv;charset=utf-8"; }
      else { value = toSql(data, $("#mock-table").value.trim(), Math.max(1, Number($("#mock-batch").value) || 100)); ext = "sql"; mime = "text/sql;charset=utf-8"; }
      markOutput(output, value); output.dataset.ext = ext; output.dataset.mime = mime;
    };
    $$("#mock-format button").forEach((node) => node.addEventListener("click", () => { format = node.dataset.format; $$("#mock-format button").forEach((b) => b.classList.toggle("active", b === node)); render(); }));
    bind("mock-run", "click", () => {
      const count = Math.min(1000, Math.max(1, Number($("#mock-count").value) || 1)), random = seededRandom($("#mock-seed").value);
      const fields = $$("tr", tbody).map((row) => { const inputs = $$("input,select", row); const name = inputs[0].value.trim(); if (!name) throw new Error("字段名不能为空"); return { name, type: inputs[1].value, rule: inputs[2].value, nullable: Math.max(0, Math.min(100, Number(inputs[3].value) || 0)) }; });
      const templateText = $("#mock-template").value.trim();
      if (templateText) {
        const template = JSON.parse(templateText); if (!template || Array.isArray(template) || typeof template !== "object") throw new Error("Mock JSON 模板顶层必须是对象");
        data = Array.from({ length: count }, (_, index) => renderMockTemplate(template, random, index));
      } else {
        if (!fields.length) throw new Error("至少添加一个字段"); if (new Set(fields.map((f) => f.name)).size !== fields.length) throw new Error("字段名不能重复");
        data = Array.from({ length: count }, (_, index) => Object.fromEntries(fields.map((field) => [field.name, random() * 100 < field.nullable ? null : generateMock(field.type, field.rule, random, index)])));
      }
      const fieldCount = Object.keys(data[0] || {}).length; render(); setStatus(`已生成 ${count} 条合成数据`, [`${count} 条`, `${fieldCount} 个字段`, $("#mock-seed").value ? "可复现" : "安全随机"]);
    });
    bind("mock-download", "click", () => { if (!data.length) throw new Error("请先生成数据"); downloadText(`mock-data.${output.dataset.ext}`, output.textContent, output.dataset.mime); });
    state.example = () => { $("#mock-count").value = 5; $("#mock-seed").value = "zhuxiaoran-demo"; $("#mock-run").click(); };
  }

  function normalizeDiffLine(value, options) { let line = value; if (options.trailing) line = line.replace(/\s+$/, ""); if (options.space) line = line.replace(/\s+/g, ""); if (options.case) line = line.toLowerCase(); return line; }
  function initTextDiff() {
    bind("td-swap", "click", () => { const a = $("#td-left"), b = $("#td-right"); [a.value, b.value] = [b.value, a.value]; });
    bind("td-run", "click", () => {
      const leftText = $("#td-left").value, rightText = $("#td-right").value;
      if (Math.max(byteLength(leftText), byteLength(rightText)) > 2 * 1024 * 1024 || Math.max(leftText.split("\n").length, rightText.split("\n").length) > 10000) throw new Error("单侧内容不能超过 2 MB 或 10,000 行");
      const opts = { case: $("#td-case").checked, trailing: $("#td-trailing").checked, space: $("#td-space").checked };
      const left = leftText.split("\n"), right = rightText.split("\n"), normLeft = left.map((v) => normalizeDiffLine(v, opts)), normRight = right.map((v) => normalizeDiffLine(v, opts));
      const rawOps = myersDiff(normLeft, normRight); let li = 0, ri = 0;
      const ops = rawOps.map((op) => { if (op.type === "equal") return { ...op, value: left[li++], rightValue: right[ri++] }; if (op.type === "remove") return { ...op, value: left[li++] }; return { ...op, value: right[ri++] }; });
      $("#td-result").innerHTML = renderTextDiff(ops); $("#td-metrics").innerHTML = diffMetrics(ops.filter((o) => o.type !== "equal"));
      const changes = ops.filter((o) => o.type !== "equal").length; setStatus(changes ? `发现 ${changes} 行变化` : "文本完全一致", [`${left.length} → ${right.length} 行`, `${changes} 行变化`, "Myers Diff"]);
    });
    state.example = () => { $("#td-left").value = "name: 竹小冉\nversion: 1\ntools: 16\nstatus: beta"; $("#td-right").value = "name: 竹小冉\nversion: 2\ntools: 19\nstatus: ready\noffline: true"; $("#td-run").click(); };
  }

  function initRegex() {
    bind("regex-run", "click", () => {
      const pattern = $("#regex-pattern").value, flagsInput = $("#regex-flags").value;
      if (/[^dgimsuvy]/.test(flagsInput) || new Set(flagsInput).size !== flagsInput.length) throw new Error("Flags 包含无效或重复字符");
      const flags = flagsInput.includes("g") ? flagsInput : `${flagsInput}g`, regex = new RegExp(pattern, flags), text = $("#regex-text").value, matches = [];
      let match; while ((match = regex.exec(text)) && matches.length < 10000) { matches.push(match); if (match[0] === "") regex.lastIndex++; }
      let cursor = 0, highlighted = ""; for (const m of matches) { highlighted += esc(text.slice(cursor, m.index)) + `<mark>${esc(m[0])}</mark>`; cursor = m.index + m[0].length; } highlighted += esc(text.slice(cursor));
      $("#regex-highlight").innerHTML = highlighted || "没有匹配内容";
      $("#regex-results").innerHTML = matches.length ? matches.map((m, i) => `<tr><td>${i + 1}</td><td>${m.index}</td><td><code>${esc(m[0])}</code></td><td><code>${esc(JSON.stringify({ groups: m.slice(1), named: m.groups || {} }))}</code></td></tr>`).join("") : `<tr><td colspan="4">没有匹配项</td></tr>`;
      $("#regex-metrics").innerHTML = `<div class="metric"><span>匹配数</span><strong>${matches.length}</strong></div><div class="metric"><span>Flags</span><strong>${esc(flagsInput || "—")}</strong></div>`;
      const replaceRegex = new RegExp(pattern, flagsInput), replacement = $("#regex-replace").value; markOutput($("#regex-preview"), replacement ? text.replace(replaceRegex, replacement) : text);
      setStatus(`匹配 ${matches.length} 项`, [`${text.length} 字符`, `${matches.length} 项`, matches.length >= 10000 ? "已达上限" : "JavaScript RegExp"]);
    });
    state.example = () => { $("#regex-pattern").value = "(?<tool>[A-Za-z]+)-(?<version>\\d+)"; $("#regex-flags").value = "gi"; $("#regex-text").value = "json-1 base64-2 HASH-3"; $("#regex-replace").value = "$<tool>@v$<version>"; $("#regex-run").click(); };
  }

  function initTransform(prefix, encode, decode, example) {
    bind(`${prefix}-encode`, "click", () => { const input = $(`#${prefix}-input`).value, result = encode(input); markOutput($(`#${prefix}-output`), result); setStatus("编码完成", [`${input.length} 字符`, `${byteLength(input)} 字节`, "本地处理"]); });
    bind(`${prefix}-decode`, "click", () => { const input = $(`#${prefix}-input`).value, result = decode(input); markOutput($(`#${prefix}-output`), result); setStatus("解码完成", [`${result.length} 字符`, `${byteLength(result)} 字节`, "本地处理"]); });
    state.example = () => { $(`#${prefix}-input`).value = example; $(`#${prefix}-encode`).click(); };
  }
  function initUrl() {
    let mode = "component"; $$("#url-mode button").forEach((node) => node.addEventListener("click", () => { mode = node.dataset.mode; $$("#url-mode button").forEach((b) => b.classList.toggle("active", b === node)); }));
    initTransform("url", (v) => mode === "component" ? encodeURIComponent(v) : encodeURI(v), (v) => mode === "component" ? decodeURIComponent(v) : decodeURI(v), "https://example.com/搜索?q=竹小冉&tag=JSON 工具");
  }
  function initBase64() {
    initTransform("b64", (v) => toBase64(encoder.encode(v)), (v) => decoder.decode(fromBase64(v)), "竹小冉测试百宝箱 🧰");
  }

  function initEntities() {
    let type = "html"; $$("#entity-type button").forEach((node) => node.addEventListener("click", () => { type = node.dataset.type; $$("#entity-type button").forEach((b) => b.classList.toggle("active", b === node)); }));
    bind("entity-encode", "click", () => {
      const input = $("#entity-input").value, style = $("#entity-style").value; let result;
      if (type === "html") { const named = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }; result = input.replace(/[&<>"']/g, (c) => style === "named" ? named[c] : `&#${c.codePointAt(0)};`); }
      else result = [...input].map((char) => { const cp = char.codePointAt(0); if (style === "numeric" && cp > 0xffff) return `\\u{${cp.toString(16).toUpperCase()}}`; if (cp <= 0x7e && cp >= 0x20) return char; if (cp <= 0xffff) return `\\u${cp.toString(16).padStart(4, "0").toUpperCase()}`; const x = cp - 0x10000; return `\\u${(0xd800 + (x >> 10)).toString(16).toUpperCase()}\\u${(0xdc00 + (x & 1023)).toString(16).toUpperCase()}`; }).join("");
      markOutput($("#entity-output"), result); setStatus("编码完成", [`${input.length} 字符`, type === "html" ? "HTML 实体" : "Unicode", "本地处理"]);
    });
    bind("entity-decode", "click", () => {
      const input = $("#entity-input").value; let result;
      if (type === "html") { const area = document.createElement("textarea"); area.innerHTML = input; result = area.value; }
      else result = input.replace(/\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})/g, (_, braced, fixed) => { const cp = parseInt(braced || fixed, 16); if (cp > 0x10ffff) throw new Error("Unicode 码点超出范围"); return String.fromCodePoint(cp); });
      markOutput($("#entity-output"), result); setStatus("解码完成", [`${result.length} 字符`, type === "html" ? "HTML 实体" : "Unicode", "未执行代码"]);
    });
    state.example = () => { $("#entity-input").value = '<div title="竹小冉">工具 🧰</div>'; $("#entity-encode").click(); };
  }

  function parseBigIntRadix(value, radix) {
    let clean = value.trim(), sign = 1n; if (clean.startsWith("-")) { sign = -1n; clean = clean.slice(1); } else if (clean.startsWith("+")) clean = clean.slice(1);
    const digits = "0123456789abcdef"; if (!clean || [...clean.toLowerCase()].some((c) => digits.indexOf(c) < 0 || digits.indexOf(c) >= radix)) throw new Error(`不是有效的 ${radix} 进制整数`);
    let out = 0n; for (const char of clean.toLowerCase()) out = out * BigInt(radix) + BigInt(digits.indexOf(char)); return out * sign;
  }
  function initRadix() {
    bind("radix-run", "click", () => {
      const n = parseBigIntRadix($("#radix-input").value, Number($("#radix-from").value));
      $("#radix-results").innerHTML = [[2, "二进制"], [8, "八进制"], [10, "十进制"], [16, "十六进制"]].map(([base, label]) => `<div class="metric"><span>${label}</span><strong>${n.toString(base)}</strong></div>`).join("");
      setStatus("进制转换完成", [`${n.toString(10).length} 位十进制`, "BigInt 无损", "本地处理"]);
    });
    bind("byte-run", "click", () => {
      const value = Number($("#byte-value").value); if (!Number.isFinite(value)) throw new Error("请输入有效数值");
      const units = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 };
      const from = $("#byte-from").value, to = $("#byte-to").value, result = value * units[from] / units[to];
      markOutput($("#byte-output"), `${value} ${from} = ${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 12 }).format(result)} ${to}\n${from.includes("i") || to.includes("i") ? "二进制单位基数：1024" : "十进制单位基数：1000"}`);
      setStatus("字节换算完成", [`${from} → ${to}`, "已标明基数", "本地处理"]);
    });
    state.example = () => { $("#radix-input").value = "9223372036854775807"; $("#radix-run").click(); };
  }

  function shellSplit(command) {
    if (/`|\$\(/.test(command)) throw new Error("不支持命令替换或动态 Shell 表达式");
    const tokens = []; let current = "", quote = null, escaped = false;
    for (const char of command.replace(/\\\r?\n/g, " ").trim()) {
      if (escaped) { current += char; escaped = false; continue; }
      if (char === "\\" && quote !== "'") { escaped = true; continue; }
      if (quote) { if (char === quote) quote = null; else current += char; continue; }
      if (char === "'" || char === '"') { quote = char; continue; }
      if (/\s/.test(char)) { if (current) { tokens.push(current); current = ""; } }
      else current += char;
    }
    if (quote) throw new Error("cURL 中存在未闭合的引号"); if (escaped) current += "\\"; if (current) tokens.push(current); return tokens;
  }
  function parseCurl(command) {
    const tokens = shellSplit(command); if (tokens[0] !== "curl") throw new Error("cURL 命令必须以 curl 开头");
    const request = { url: "", method: "GET", headers: {}, body: "", form: [], auth: "" };
    for (let i = 1; i < tokens.length; i++) {
      const token = tokens[i];
      if (["-X", "--request"].includes(token)) request.method = (tokens[++i] || "").toUpperCase();
      else if (["-H", "--header"].includes(token)) { const header = tokens[++i] || "", pos = header.indexOf(":"); if (pos < 1) throw new Error(`Header 格式无效：${header}`); request.headers[header.slice(0, pos).trim()] = header.slice(pos + 1).trim(); }
      else if (["-d", "--data", "--data-raw", "--data-binary"].includes(token)) { request.body = tokens[++i] ?? ""; if (request.method === "GET") request.method = "POST"; }
      else if (["-F", "--form"].includes(token)) { const part = tokens[++i] || "", pos = part.indexOf("="); if (pos < 1) throw new Error(`Form 格式无效：${part}`); request.form.push([part.slice(0, pos), part.slice(pos + 1)]); if (request.method === "GET") request.method = "POST"; }
      else if (["-u", "--user"].includes(token)) request.auth = tokens[++i] || "";
      else if (["-k", "--insecure", "-s", "--silent", "-L", "--location", "--compressed"].includes(token)) { /* transport-only flags */ }
      else if (token.startsWith("-")) throw new Error(`暂不支持 cURL 参数：${token}`);
      else if (!request.url) request.url = token;
      else throw new Error(`无法识别的 cURL 内容：${token}`);
    }
    if (!request.url) throw new Error("cURL 中缺少 URL");
    if (request.auth) request.headers.Authorization = `Basic ${toBase64(encoder.encode(request.auth))}`;
    return request;
  }
  function parseFetch(code) {
    if (/`|\$\{|\beval\s*\(|\bFunction\s*\(/.test(code)) throw new Error("不支持模板字符串或动态 JavaScript");
    const match = code.trim().match(/^fetch\(\s*("(?:\\.|[^"\\])*")\s*(?:,\s*([\s\S]*?))?\s*\)\s*;?$/);
    if (!match) throw new Error("仅支持 URL 和 options 都是 JSON 字面量的 fetch() 代码");
    const url = JSON.parse(match[1]), options = match[2] ? JSON.parse(match[2]) : {};
    return { url, method: String(options.method || "GET").toUpperCase(), headers: options.headers || {}, body: options.body || "", form: [], auth: "" };
  }
  function shellQuote(value) { return `'${String(value).replace(/'/g, `'"'"'`)}'`; }
  function requestToCurl(request) {
    const parts = ["curl", "-X", request.method, shellQuote(request.url)];
    Object.entries(request.headers).forEach(([k, v]) => parts.push("-H", shellQuote(`${k}: ${v}`)));
    if (request.form.length) request.form.forEach(([k, v]) => parts.push("-F", shellQuote(`${k}=${v}`)));
    else if (request.body) parts.push("--data-raw", shellQuote(request.body));
    return parts.map((part, i) => i && i % 4 === 0 ? `\\\n  ${part}` : part).join(" ");
  }
  function requestToFetch(request) {
    if (request.form.length) {
      const lines = ["const form = new FormData();", ...request.form.map(([k, v]) => `form.append(${JSON.stringify(k)}, ${JSON.stringify(v)});`), "", `fetch(${JSON.stringify(request.url)}, ${JSON.stringify({ method: request.method, headers: request.headers }, null, 2).replace(/\n}/, ',\n  "body": form\n}')});`];
      return lines.join("\n");
    }
    const options = { method: request.method, headers: request.headers }; if (request.body) options.body = request.body;
    return `fetch(${JSON.stringify(request.url)}, ${JSON.stringify(options, null, 2)});`;
  }
  function initCurlFetch() {
    let type = "curl"; $$("#request-input-type button").forEach((node) => node.addEventListener("click", () => { type = node.dataset.type; $$("#request-input-type button").forEach((b) => b.classList.toggle("active", b === node)); }));
    bind("request-run", "click", () => {
      const request = type === "curl" ? parseCurl($("#request-input").value) : parseFetch($("#request-input").value);
      $("#request-curl").value = requestToCurl(request); $("#request-fetch").value = requestToFetch(request);
      setStatus("请求代码已转换", [request.method, new URL(request.url).host, `${Object.keys(request.headers).length} 个 Header`]);
    });
    state.example = () => { $("#request-input").value = `curl -X POST 'https://api.example.com/users' \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-Request-Id: toolbox-demo' \\\n  --data-raw '{"name":"竹小冉","active":true}'`; $("#request-run").click(); };
  }

  async function hmacBytes(algorithm, keyBytes, dataBytes) {
    if (!crypto.subtle) throw new Error("当前环境不支持 Web Crypto，请使用现代浏览器或本地服务器打开");
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: algorithm }, false, ["sign", "verify"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", key, dataBytes));
  }
  function constantTimeEqual(a, b, ignoreCase = false) { const normalize = (v) => ignoreCase ? String(v).trim().toLowerCase() : String(v).trim(); const x = encoder.encode(normalize(a)), y = encoder.encode(normalize(b)); let diff = x.length ^ y.length; for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i % (x.length || 1)] || 0) ^ (y[i % (y.length || 1)] || 0); return diff === 0; }

  function initJwt() {
    bind("jwt-run", "click", async () => {
      const token = $("#jwt-token").value.trim(), parts = token.split("."); if (parts.length !== 3) throw new Error("JWT 必须包含 Header、Payload、Signature 三段");
      const header = JSON.parse(decoder.decode(fromBase64(parts[0], true))), payload = JSON.parse(decoder.decode(fromBase64(parts[1], true)));
      $("#jwt-header").textContent = JSON.stringify(header, null, 2); $("#jwt-payload").textContent = JSON.stringify(payload, null, 2);
      const algMap = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" }; let verifyText = "未验证", kind = "busy";
      if (header.alg === "none") { verifyText = "拒绝 alg: none"; kind = "error"; }
      else if (!algMap[header.alg]) { verifyText = `不支持 ${header.alg || "未知算法"}`; kind = "error"; }
      else if (!$("#jwt-secret").value) verifyText = "已解析，未提供密钥";
      else {
        const signature = await hmacBytes(algMap[header.alg], decodeByFormat($("#jwt-secret").value, $("#jwt-secret-format").value), encoder.encode(`${parts[0]}.${parts[1]}`));
        const valid = constantTimeEqual(toBase64(signature).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_"), parts[2]); verifyText = valid ? "签名有效" : "签名无效"; kind = valid ? "ok" : "error";
      }
      $("#jwt-metrics").innerHTML = `<div class="metric"><span>算法</span><strong>${esc(header.alg || "—")}</strong></div><div class="metric"><span>验签结果</span><strong>${esc(verifyText)}</strong></div><div class="metric"><span>Token 类型</span><strong>${esc(header.typ || "—")}</strong></div>`;
      $("#jwt-times").innerHTML = ["iat", "nbf", "exp"].filter((key) => Number.isFinite(payload[key])).map((key) => `<div class="metric"><span>${key}</span><strong>${esc(new Date(payload[key] * 1000).toLocaleString())}</strong></div>`).join("");
      setStatus(verifyText, [header.alg || "未知算法", `${Object.keys(payload).length} 个 Payload 字段`, "本地处理"], kind);
    });
    state.example = () => { $("#jwt-token").value = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0b29sYm94LXVzZXIiLCJuYW1lIjoi56u55bCP5YaJIiwiaWF0IjoxNzAwMDAwMDAwfQ.gevS0mKOArVAkJ6dQ_WtAbnoiCsiPHWEkZhF-kuKrOc"; $("#jwt-secret").value = "toolbox-secret"; $("#jwt-run").click(); };
  }

  function md5(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input), length = bytes.length, bitLength = BigInt(length) * 8n;
    const paddedLength = ((length + 9 + 63) >> 6) << 6, data = new Uint8Array(paddedLength); data.set(bytes); data[length] = 0x80;
    const view = new DataView(data.buffer); view.setUint32(paddedLength - 8, Number(bitLength & 0xffffffffn), true); view.setUint32(paddedLength - 4, Number(bitLength >> 32n & 0xffffffffn), true);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const k = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0);
    const rot = (x, n) => (x << n | x >>> (32 - n)) >>> 0;
    for (let offset = 0; offset < paddedLength; offset += 64) {
      const m = Array.from({ length: 16 }, (_, i) => view.getUint32(offset + i * 4, true)); let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g; if (i < 16) { f = b & c | ~b & d; g = i; } else if (i < 32) { f = d & b | ~d & c; g = (5 * i + 1) % 16; } else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; } else { f = c ^ (b | ~d); g = 7 * i % 16; }
        const temp = d; d = c; c = b; b = (b + rot((a + f + k[i] + m[g]) >>> 0, s[i])) >>> 0; a = temp;
      }
      a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
    }
    const out = new Uint8Array(16), outView = new DataView(out.buffer); [a0,b0,c0,d0].forEach((v, i) => outView.setUint32(i * 4, v, true)); return out;
  }

  async function digestAll(bytes) {
    if (!crypto.subtle) throw new Error("当前环境不支持 Web Crypto");
    const algorithms = [["MD5", null], ["SHA-1", "SHA-1"], ["SHA-256", "SHA-256"], ["SHA-512", "SHA-512"]], results = {};
    for (const [label, algorithm] of algorithms) results[label] = algorithm ? toHex(await crypto.subtle.digest(algorithm, bytes)) : toHex(md5(new Uint8Array(bytes)));
    return results;
  }
  function initHash() {
    let source = "text"; $$("#hash-source button").forEach((node) => node.addEventListener("click", () => { source = node.dataset.source; $$("#hash-source button").forEach((b) => b.classList.toggle("active", b === node)); $("#hash-text-wrap").classList.toggle("hidden", source !== "text"); $("#hash-file-wrap").classList.toggle("hidden", source !== "file"); }));
    bind("hash-run", "click", async () => {
      let bytes, label; if (source === "text") { label = "UTF-8 文本"; bytes = encoder.encode($("#hash-text").value); } else { const file = $("#hash-file").files[0]; if (!file) throw new Error("请选择文件"); label = file.name; bytes = await file.arrayBuffer(); }
      setStatus("正在计算 Hash", [label, `${bytes.byteLength ?? bytes.length} 字节`, "本地处理"], "busy"); const results = await digestAll(bytes);
      $("#hash-results").innerHTML = Object.entries(results).map(([alg, value]) => `<div class="grid-2"><div class="field-label">${alg}</div><div class="output">${value}</div></div>`).join("");
      setStatus("Hash 计算完成", [label, `${bytes.byteLength ?? bytes.length} 字节`, "4 种算法"]);
    });
    state.example = () => { $("#hash-text").value = "abc"; $("#hash-run").click(); };
  }

  function initHmac() {
    $("#hmac-timestamp").value = String(Math.floor(Date.now() / 1000));
    bind("hmac-run", "click", async () => {
      const message = $("#hmac-template").value.replaceAll("{{body}}", $("#hmac-body").value).replaceAll("{{timestamp}}", $("#hmac-timestamp").value);
      const signature = await hmacBytes($("#hmac-alg").value, decodeByFormat($("#hmac-key").value, $("#hmac-key-format").value), encoder.encode(message));
      const result = encodeByFormat(signature, $("#hmac-output-format").value); markOutput($("#hmac-message"), message); markOutput($("#hmac-output"), result);
      const expected = $("#hmac-expected").value.trim(), matches = constantTimeEqual(expected, result, $("#hmac-output-format").value === "hex"); $("#hmac-verify").innerHTML = expected ? `<div class="notice ${matches ? "success" : "error"}">${matches ? "期望签名一致" : "期望签名不一致"}</div>` : "";
      setStatus("HMAC 计算完成", [$("#hmac-alg").value, $("#hmac-output-format").value.toUpperCase(), expected ? "已比较" : "未比较"]);
    });
    state.example = () => { $("#hmac-key").value = "toolbox-secret"; $("#hmac-body").value = '{"event":"test.completed"}'; $("#hmac-template").value = "{{timestamp}}.{{body}}"; $("#hmac-run").click(); };
  }

  function initAes() {
    const updateMode = () => { const cbc = $("#aes-mode").value === "CBC"; $("#aes-tag-wrap").classList.toggle("hidden", cbc); $("#aes-warning").classList.toggle("hidden", !cbc); };
    $("#aes-mode").addEventListener("change", updateMode);
    const generate = () => { const size = Number($("#aes-size").value), mode = $("#aes-mode").value, format = $("#aes-key-format").value === "text" ? "base64" : $("#aes-key-format").value; if ($("#aes-key-format").value === "text") $("#aes-key-format").value = "base64"; $("#aes-key").value = encodeByFormat(crypto.getRandomValues(new Uint8Array(size / 8)), format); $("#aes-iv").value = encodeByFormat(crypto.getRandomValues(new Uint8Array(mode === "GCM" ? 12 : 16)), $("#aes-format").value); };
    bind("aes-generate", "click", generate);
    const getConfig = async (usage) => {
      if (!crypto.subtle) throw new Error("当前环境不支持 Web Crypto"); const mode = $("#aes-mode").value, size = Number($("#aes-size").value), keyBytes = decodeByFormat($("#aes-key").value, $("#aes-key-format").value); if (keyBytes.length !== size / 8) throw new Error(`密钥必须正好是 ${size / 8} 字节`);
      const iv = decodeByFormat($("#aes-iv").value, $("#aes-format").value); if (iv.length !== (mode === "GCM" ? 12 : 16)) throw new Error(`${mode} IV 必须是 ${mode === "GCM" ? 12 : 16} 字节`);
      const key = await crypto.subtle.importKey("raw", keyBytes, { name: `AES-${mode}` }, false, [usage]); return { mode, key, iv, algorithm: mode === "GCM" ? { name: "AES-GCM", iv, tagLength: 128 } : { name: "AES-CBC", iv } };
    };
    bind("aes-encrypt", "click", async () => {
      const config = await getConfig("encrypt"), encrypted = new Uint8Array(await crypto.subtle.encrypt(config.algorithm, config.key, encoder.encode($("#aes-plain").value))), format = $("#aes-format").value;
      if (config.mode === "GCM") { $("#aes-cipher").value = encodeByFormat(encrypted.slice(0, -16), format); $("#aes-tag").value = encodeByFormat(encrypted.slice(-16), format); } else $("#aes-cipher").value = encodeByFormat(encrypted, format);
      setStatus("AES 加密完成", [`AES-${config.mode}`, `${$("#aes-size").value} 位`, format.toUpperCase()]);
    });
    bind("aes-decrypt", "click", async () => {
      const config = await getConfig("decrypt"), format = $("#aes-format").value; let cipher = decodeByFormat($("#aes-cipher").value, format);
      if (config.mode === "GCM") { const tag = decodeByFormat($("#aes-tag").value, format); if (tag.length !== 16) throw new Error("GCM Tag 必须是 16 字节"); const combined = new Uint8Array(cipher.length + tag.length); combined.set(cipher); combined.set(tag, cipher.length); cipher = combined; }
      const plain = await crypto.subtle.decrypt(config.algorithm, config.key, cipher); $("#aes-plain").value = decoder.decode(plain, { fatal: true }); setStatus("AES 解密完成", [`AES-${config.mode}`, `${$("#aes-size").value} 位`, "认证通过"]);
    });
    generate(); updateMode(); state.example = () => { $("#aes-plain").value = "竹小冉测试百宝箱"; $("#aes-encrypt").click(); };
  }

  function metric(label, value) { return `<div class="metric"><span>${label}</span><strong>${esc(value)}</strong></div>`; }
  function initTimestamp() {
    const nowLocalValue = () => { const d = new Date(), offset = d.getTimezoneOffset(); return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 23); };
    $("#ts-input").value = String(Date.now()); $("#date-input").value = nowLocalValue();
    bind("ts-now", "click", () => { $("#ts-input").value = String(Date.now()); $("#ts-convert").click(); });
    bind("ts-convert", "click", () => {
      const raw = $("#ts-input").value.trim(); if (!/^-?\d+(?:\.\d+)?$/.test(raw)) throw new Error("请输入有效的数字时间戳");
      const input = Number(raw); if (!Number.isFinite(input)) throw new Error("时间戳超出可处理范围"); const ms = Math.abs(input) < 1e11 ? input * 1000 : input, date = new Date(ms); if (!Number.isFinite(date.getTime())) throw new Error("时间戳对应的日期无效");
      $("#ts-results").innerHTML = metric("识别单位", Math.abs(input) < 1e11 ? "秒" : "毫秒") + metric("本地时间", date.toLocaleString()) + metric("UTC", date.toUTCString()) + metric("ISO 8601", date.toISOString());
      setStatus("时间戳转换完成", [Math.abs(input) < 1e11 ? "秒" : "毫秒", date.toLocaleDateString(), "本地 + UTC"]);
    });
    bind("date-convert", "click", () => {
      const date = new Date($("#date-input").value); if (!Number.isFinite(date.getTime())) throw new Error("请选择有效的本地日期时间");
      $("#date-results").innerHTML = metric("秒", Math.floor(date.getTime() / 1000)) + metric("毫秒", date.getTime()) + metric("ISO 8601", date.toISOString());
      setStatus("日期转换完成", [date.toLocaleString(), "秒 + 毫秒", "本地时区"]);
    });
    state.example = () => { $("#ts-now").click(); };
  }

  function initUuid() {
    bind("uuid-run", "click", () => {
      const count = Math.min(1000, Math.max(1, Number($("#uuid-count").value) || 1)), values = Array.from({ length: count }, () => uuidV4()); markOutput($("#uuid-output"), values.join("\n"));
      setStatus(`已生成 ${count} 个 UUID`, [`${count} 个`, "UUID v4", "安全随机"]);
    }); state.example = () => { $("#uuid-run").click(); };
  }

  function secureRandomString(length, chars) {
    if (!chars) throw new Error("至少选择一种字符集"); let result = "", limit = Math.floor(256 / chars.length) * chars.length;
    while (result.length < length) { const bytes = crypto.getRandomValues(new Uint8Array(Math.max(32, (length - result.length) * 2))); for (const byte of bytes) { if (byte < limit) result += chars[byte % chars.length]; if (result.length === length) break; } }
    return result;
  }
  function initRandomString() {
    bind("random-run", "click", () => {
      const length = Math.min(256, Math.max(1, Number($("#random-length").value) || 1)), count = Math.min(100, Math.max(1, Number($("#random-count").value) || 1)); let chars = "";
      if ($("#random-lower").checked) chars += "abcdefghijklmnopqrstuvwxyz"; if ($("#random-upper").checked) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; if ($("#random-number").checked) chars += "0123456789"; if ($("#random-symbol").checked) chars += "!@#$%^&*()-_=+[]{}:,.?";
      markOutput($("#random-output"), Array.from({ length: count }, () => secureRandomString(length, chars)).join("\n")); setStatus(`已生成 ${count} 个随机字符串`, [`每个 ${length} 位`, `${chars.length} 个可用字符`, "拒绝采样"]);
    }); state.example = () => { $("#random-run").click(); };
  }

  const initializers = {
    "json-format": initJsonFormat,
    "json-diff": initJsonDiff,
    jsonpath: initJsonPath,
    query: initQuery,
    "mock-data": initMockData,
    "text-diff": initTextDiff,
    regex: initRegex,
    url: initUrl,
    base64: initBase64,
    entities: initEntities,
    radix: initRadix,
    "curl-fetch": initCurlFetch,
    jwt: initJwt,
    hash: initHash,
    hmac: initHmac,
    aes: initAes,
    timestamp: initTimestamp,
    uuid: initUuid,
    "random-string": initRandomString
  };

  document.addEventListener("click", async (event) => {
    const nav = event.target.closest("[data-tool]"); if (nav) activateTool(nav.dataset.tool);
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      try { const target = $(copy.dataset.copy), value = target?.dataset.copyValue || getTargetText(copy.dataset.copy); await copyText(value); toast("已复制到剪贴板"); }
      catch (error) { toast(error.message, "error"); }
    }
  });
  $("#tool-search").addEventListener("input", (event) => renderNavigation(event.target.value));
  $("#tool-search").addEventListener("keydown", (event) => { if (event.key === "Enter") { const first = $(".nav-item"); if (first) activateTool(first.dataset.tool); } });
  document.addEventListener("keydown", (event) => { if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { event.preventDefault(); $("#tool-search").focus(); } if (event.key === "Escape") closeMenu(); });
  $("#menu-button").addEventListener("click", () => { const open = !$("#sidebar").classList.contains("open"); $("#sidebar").classList.toggle("open", open); $("#mobile-backdrop").classList.toggle("show", open); $("#menu-button").setAttribute("aria-expanded", String(open)); });
  $("#mobile-backdrop").addEventListener("click", closeMenu);
  $("#load-example").addEventListener("click", () => { if (state.example) state.example(); else toast("当前工具暂无示例", "error"); });
  $("#clear-tool").addEventListener("click", () => activateTool(state.active, false));
  window.addEventListener("hashchange", () => { const id = location.hash.slice(1); if (toolMap[id] && id !== state.active) activateTool(id, false); });

  activateTool(toolMap[location.hash.slice(1)] ? location.hash.slice(1) : "json-format", !location.hash);
})();
