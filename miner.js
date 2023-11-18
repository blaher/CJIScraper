const puppeteer = require('puppeteer');

function delay(time) {
   return new Promise(function(resolve) {
       setTimeout(resolve, time)
   });
}

(async () => {

  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);
  //page.setDefaultTimeout(0);

  const config = require('./config.js');
  const waitTime = 500;

  // Navigate the page to a URL
  await page.goto(config.url);
  await page.waitForSelector('input[name="password"]');
  await delay(waitTime);
  await page.click('div.client-form footer button[type="button"]');
  await delay(waitTime);

  await page.waitForSelector('#search');
  await page.waitForSelector('button[type="submit"]');
  await page.waitForSelector('input[ng-model="search.criteria"]');
  await delay(waitTime);
  await page.type('input[ng-model="search.criteria"]', 'ben');
  await delay(waitTime);
  await page.click('button[type="submit"]');
  await delay(waitTime);

  await page.waitForSelector('form[ng-submit="simpleSearch()"]');
  await page.waitForSelector('input[placeholder="Enter search string here"]');
  await page.waitForSelector('button[ng-click="docketSearch()"]');
  await delay(waitTime);
  await page.type('input[placeholder="Enter search string here"]', 'ben');
  await page.click('button[ng-click="docketSearch()"]');
  await delay(waitTime);

  await page.waitForSelector('div[role="presentation"]');
  await delay(waitTime);

  const [sort] = await page.$x("//span[contains(., 'File Date')]");
  if (sort) {
      await sort.click();
      await delay(waitTime);
      await sort.click();
  }
  await delay(waitTime);

  await page.waitForSelector('div[ng-repeat="(rowRenderIndex, row) in rowContainer.renderedRows track by $index"]');
  const rows = await page.$$('div[ng-repeat="(rowRenderIndex, row) in rowContainer.renderedRows track by $index"]');

   var ids = {};

   var data = rows.map(async row => {
    const columns = await row.$$('div[ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.colDef.name"]');

    var rowData = columns.map(async column => {
      return page.evaluate(el => el.textContent, column);
    });

    const map = {
      'court': await rowData[0],
      'caseNumber': await rowData[1],
      'caseType': await rowData[2],
      'fileDate': await rowData[3],
      'name': await rowData[4],
      'dob': await rowData[5],
      'charge': await rowData[6],
      'type': await rowData[7],
      'attorney': '',
      'prosecutor': '',
      'judge': '',
    };

    if (map.court == 'CPC' && parseInt(map.caseNumber.substr(0, 4)) >= config.startYear) {
      ids[map.caseNumber] = false;

      const [ccase] = await page.$x("//div[contains(., '" + map.caseNumber + "')]");
      if (ccase) {
          await ccase.click();
          await delay(waitTime);

          await page.waitForSelector('div[ng-transclude]');
          map.attorney = page.$eval('div[ng-repeat="a in cc.participants[0].attorneys"]', el => el.textContent).catch(() => false);
          map.judge = page.$eval('span[ng-show="cc.judge"]', el => el.textContent).catch(() => false);

          page.goBack();
          await delay(waitTime);
      }

      // insert in to table here

      ids[map.caseNumber] = true;
    }
  });

  Promise.all(data).then((values) => {
    console.log(values);
  });
})();
