const puppeteer = require('puppeteer');
const fs = require("fs");
const codeData = require('./codeData');
const isDebugger = false;

function start() {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({ headless: !isDebugger });
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto('https://console.cli.im/nedit/146378806?categoryId=32383517&pageFrom=center&c=qhlKyqL');
      // 等待登录页面#captcha-form存在
      await page.waitForSelector('#common-login-content');

      /* 进行登录操作 */
      await page.type('#loginemail', process.env.ACCOUNT, { delay: 100 });
      // 密码输入框输入
      await page.type('#loginpassword', process.env.PASSWORD, { delay: 100 });
      // 点击登录按钮
      await page.click('#login-btn');
      await page.once('load', () => {
        // reload是因为有个弹窗显示错误，点击确认一样的重新加载页面
        page.reload().then(async () => {
          await page.waitForSelector('#ckEditor');

          async function setContent() {
            const result = await page.$eval('#ckEditor', el => el.innerHTML);
            const maskEle = await page.$('.ant-modal-mask');
            // 移除警告弹窗
            if (maskEle) {
              console.log('has maskEle:');
              await page.$eval('.ant-modal-mask', el => {
                if (el.parentNode) {
                  el.parentNode.remove();
                }
                return el;
              });
            }
            if (result) {
              console.log('result:', result);
              await page.$eval('#ckEditor', (el, curText) => {
                console.log({innerHtml: el.innerHTML, curText});
                if (curText) {
                  console.log('curText:', curText);
                  el.innerHTML = curText;
                }
                return el.innerHTML;
              }, getCurContent());
            } else {
              setTimeout(async () => {
                await setContent();
              }, 1000)
            }
          }
          // 修改富文本编辑器内容
          await setContent();
          // 检测到自己增加的id
          await page.waitForSelector('#zs-add-bs');
          const result = await page.$eval('#ckEditor', el => el.innerHTML);
          console.log('result22:', result);
          cosnt content1 = await page.content();
          console.log('content123:', content1);
          // 点击保存
          await page.click('#__activeCodeSaveBtn');
          cosnt content2 = await page.content();
          console.log('content456:', content2);
          setTimeout(() => {
            browser.close();
            resolve(getCurContent());
          }, 8000);
        }).catch(err => {
          reject(err);
        });
      });
    } catch (error) {
      reject(error);
    }
  })
}

function getCurContent() {
  const date = parseTime(new Date());
  const year = new Date().getFullYear();
  const list = codeData[year] || [];
  const item = list.find(i => i.date === date);
  if (item) {
    return `
    <div>
      <p id="zs-add-bs"><span style="font-size:17px;margin-left:20px;">${item.date}</span></p>
      <br />
      <p style="font-size:17px;">作业日期码为：${item.code}</p>
    </div>
    `;
  }
  return '';
}

/**
 * Parse the time to string
 * @param {(Object|string|number)} time
 * @param {string} cFormat
 * @returns {string | null}
 */
function parseTime(time, cFormat = '{y}-{m}-{d}') {
  if (arguments.length === 0) {
    return null
  }
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if ((typeof time === 'string') && (/^[0-9]+$/.test(time))) {
      time = parseInt(time)
    }
    if ((typeof time === 'number') && (time.toString().length === 10)) {
      time = time * 1000
    }
    date = new Date(time)
  }
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{([ymdhisa])+}/g, (result, key) => {
    const value = formatObj[key]
    // Note: getDay() returns 0 on Sunday
    if (key === 'a') { return ['日', '一', '二', '三', '四', '五', '六'][value] }
    return value.toString().padStart(2, '0')
  })
  return time_str
}

start().then(res => {
  console.log('🦋🦋🦋🦋', res);
  let context = `
  <html>
   <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
   </head>
    <body>
      ${res}
    </body>
  </html>
  `;
  // 当前目录下创建index.html
  fs.writeFileSync("index.html", context, "utf8");
}).catch(err => {
  console.log('start err catch🐰:', err);
})
