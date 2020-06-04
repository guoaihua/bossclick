const puppeteer = require("puppeteer");
const fs = require("fs");
const {cookies1} = require("./cookies/cookie");
const TARGETURL = "https://www.zhipin.com/chat/im?mu=%2Fvue%2Findex%2F%23%2Fdashboard%2Fcandidate%2Frecommend%3Fjobid%3D1835b1bd7e3f7efa0XJ53Nm5EFU~%26status%3D0%26source%3D1"
const TARGETURL2 = "https://www.zhipin.com/web/geek/resume"

let id = 1;
let isOk = false;

let isFinish = false;
let start = Date.now();
let now = "";

async function task() {
  isOk = false;
  console.log("当前task id为%d",id);
  const {page,browser} = await launchPage();
  await page.goto(TARGETURL,{
    waitUntil: "networkidle2"
  });

  page.on("response", async res => {
    try{
      let url = await res.url();
      if(/https:\/\/www\.zhipin\.com\/wapi\/zpboss\/h5\/chat\/start/.test(url)){
        let data =  await res.json();

        if(data.zpData && data.zpData.stateDesc){
          now = Date.now();
          if(now - start > 2000){
            console.log(data.zpData.stateDesc);
            console.log("本次点击流程结束");
            isOk = true;
            browser.close();
            console.log("间隔超过2秒，可以进行下一次task");
            start = now;
            id++;
            if(id > 10){
              browser.close();
              return;
            }
            task();
          }

        }
      }
      return;
    }catch (e) {

    }
  });
try {
    while (!isOk) {
      // 已经打开了页面，可以开始点击操作
      const number = await bossclick(page,browser);
      console.log("此次点击%d个", number);
      console.log("是否ok?", isOk);
      // 下次刷新page时要注意等待请求判断完成，太快会导致判断失效
      await page.waitFor(5000);
      if(!isOk){
        await page.reload({
          waitUntil: "networkidle2"
        });
      }
    }
  }catch (e) {
  console.log(22);
  }
}

async function bossclick(page,browser){
try{
  if(isOk){
    browser.close();
    return
  }
  await page.click("a[ka=menu-geek-recommend]",{delay: 300});

  // 展开选项栏
  await page.click("#wrap .top-op.top-recommend .dropdown-select");
  // 点击选择合适的招聘岗位，job- 后面跟的就是岗位栏目
  await page.click(`li[ka=recommend-job-${id}]`,{delay: 1000});
  await page.waitFor(1000);


  // 检测页面ifream加载情况
  const frame = await page.frames().find(frame => frame.name() === 'syncFrame');

 // const btn = await frame.$(".dropdown-recommend.dropdown-text.cancel-filter");
  await frame.click(".dropdown-recommend.dropdown-text.fl.disable",{delay:1000});

  //  选择经验1-3 3-5
  await frame.click("a[ka=recommend-experience-3]",{delay:300});
  await frame.click("a[ka=recommend-experience-4]",{delay:300});

  // 选择学历  大专、本科
 // await frame.click("a[ka=recommend-degree-4]",{delay:300});
  await frame.click("a[ka=recommend-degree-5]",{delay:300});

  await frame.click("span[ka=dialog_confirm]",{delay:300});

  await frame.waitFor(1000);
  // 遍历推荐列表，如果内容为大招乎，则点击 （recommend-list)
  const number = await frame.$$eval("#recommend-list .recommend-card-list li",elements=>{
    var count = 0;
    elements.forEach((item,index)=>{
      try{
        // 先查找存在则操作,一次点10个
        if(count>15){
          return;
        }
        let btn = $(`#recommend-list .recommend-card-list li:nth-child(${index+1}) .btn.btn-greet`)[0];
        if(btn && btn.innerText && btn.innerText === "打招呼"){
          btn.click();
          count++;
        }
      }catch (e) {
        console.log(e);
        return;
      }
    })
    return count;
  });

  return number;
}catch (e) {
  //console.log(e);
}

}

async function launchPage() {
  const config = {
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ignoreDefaultArgs: ['--enable-automation']
  }
  const browser = await puppeteer.launch(config);
  const page = await browser.newPage();
  // 注入js伪装函数
  const tricker = fs.readFileSync('./src/tricker/tricker.js','utf8');
  await page.evaluateOnNewDocument(tricker);

  //console.log(cookies);


  await Promise.all(cookies1.map(pair => {
    return page.setCookie(pair)
  }))

  await page.setViewport({
    width: 1200,
    height: 800
  });

  return {
    page:page,
    browser: browser
  };
}

task();




