import { chromium } from 'playwright';

const url = 'http://127.0.0.1:3010';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

const logs = [];
page.on('console', msg => logs.push(`[console:${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => logs.push(`[pageerror] ${err.message}`));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);

const promptToggle = page.getByText('没命中？描述你的任务');
if (await promptToggle.count()) {
  await promptToggle.first().click();
}

const textarea = page.locator('textarea').first();
await textarea.fill('帮我做一个登录页并优化交互文案');

const startBtn = page.getByRole('button', { name: /开始匹配|匹配中/ }).first();
await startBtn.click();

await page.waitForTimeout(12000);

const statusTexts = await page.locator('p').allTextContents();
const matchedStatus = statusTexts.filter(t => /匹配完成|匹配失败|任务匹配失败|返回 0 条|规则回退|网络请求失败/.test(t));
const itemCount = await page.locator('button').filter({ hasText: /图像生成能力|OpenAI 官方文档检索|prd|技能/ }).count().catch(() => 0);
const promptCards = await page.locator('text=/AI 为你匹配的 \\d+ 个 skill/').count();

await page.screenshot({ path: 'D:/AI-Coding/skill dashboard/.runtime/pw-prompt-debug.png', fullPage: true });

console.log(JSON.stringify({ matchedStatus, itemCount, promptCards, logs }, null, 2));
await browser.close();
