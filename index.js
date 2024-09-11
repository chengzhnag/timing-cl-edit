const puppeteer = require('puppeteer');
const fs = require("fs");
const codeData = require('./codeData');
const isDebugger = false;
let times = 0;

function start() {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch({ headless: !isDebugger });
      console.log('10☔︎');
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      console.log('13☔︎');
      await page.goto('https://user.cli.im/login');
      // await page.goto('https://console.cli.im/nedit/85058777?categoryId=10583233&p=1&pageFrom=codeInfo&originFrom=center2', { timeout: 0 });
      console.log('15☔︎');
      // 等待登录页面#captcha-form存在
      await page.waitForSelector('#common-login-content');

      /* 进行登录操作 */
      await page.type('#loginemail', process.env.ACCOUNT, { delay: 100 });
      // 密码输入框输入
      await page.type('#loginpassword', process.env.PASSWORD, { delay: 100 });
      // 点击登录按钮
      await page.click('#login-btn');
      console.log('25☔︎');
      await page.once('load');
      await sleep(6000);
      await page.goto('https://console.cli.im/nedit/85058777?categoryId=10583233&p=1&pageFrom=codeInfo&originFrom=center2', { timeout: 0 });
      await sleep(3000);
      // await page.waitForNavigation();
      console.log('27☔︎');
      // reload是因为有个弹窗显示错误，点击确认一样的重新加载页面
      reloadPage({ page, browser, resolve });
      page.on('response', async e => {
        const url = e.url();
        if (url.includes('operateQrcodeMsg')) {
          //           const text = await e.text();
          //           console.log('text:', text);
          const json = await e.json();
          console.log('json:', json);
        }
      });
    } catch (error) {
      reject(error);
    }
  })
}

function reloadPage({ page, browser, resolve }) {
  let flag = false;
  page.reload({ timeout: 8000 }).then(async () => {
    console.log('30☔︎');
    await page.waitForSelector('#ckEditor');
    console.log('32☔︎');
    async function setContent() {
      const result = await page.$eval('#ckEditor', el => el.innerHTML);
      console.log('35☔︎');
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
          console.log({ innerHtml: el.innerHTML, curText });
          if (curText) {
            console.log('curText:', curText);
            el.innerHTML = curText;
          }
          return el.innerHTML;
        }, getCurContent());
        console.log('57☔︎');
      } else {
        setTimeout(async () => {
          await setContent();
        }, 1000)
      }
    }
    // 修改富文本编辑器内容
    await setContent();
    console.log('65☔︎');
    // 检测到自己增加的id
    await page.waitForSelector('#zs-add-bs');
    console.log('66☔︎');
    const result = await page.$eval('#ckEditor', el => el.innerHTML);
    console.log('result22:', result);
    const saveRes = await page.$eval('#__activeCodeSaveBtn', el => {
      el.click();
      return el.innerHTML;
    });
    console.log('saveRes:', saveRes);
    flag = true;
    await page.click('#__activeCodeSaveBtn');
    setTimeout(() => {
      page.click('#__activeCodeSaveBtn');
    }, 3000);
    // 点击保存
    // await page.click('#__activeCodeSaveBtn');
    setTimeout(() => {
      console.log('77☔︎');
      browser.close();
      resolve(getCurContent());
    }, 16000);
  }).catch(err => {
    console.log('page.reload', err || err.message);
  });
  setTimeout(() => {
    if (!flag && times <= 5) {
      times++;
      console.log('再执行', times);
      reloadPage({ page, browser, resolve });
    }
  }, 16000);
}

function sleep(timeout) {
  return new Promise((resolve,reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  })
}

function getCurContent() {
  // github服务器执行比北京时间晚8小时，加上延迟半小时
  const d = new Date().getTime() + 60 * 60 * 8.5 * 1000;
  const date = parseTime(new Date(d));
  const year = new Date(d).getFullYear();
  const list = codeData[year] || [];
  const item = list.find(i => i.date === date);
  if (item) {
    return `
    <div>
      <p id="zs-add-bs"><span style="font-size:24px;margin-left:30px;">${item.date}</span></p>
      <br />
      <p style="font-size:24px;">作业日期码为：${item.code}</p>
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
  let context = `<!DOCTYPE html>
  <html lang="zh">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover">
      <meta name="format-detection" content="telephone=no" />
      <meta name="referrer" content="no-referrer" />
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
