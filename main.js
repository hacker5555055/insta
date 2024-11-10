const Apify = require('apify');

Apify.main(async () => {
    const { keyword } = await Apify.getInput();

    const requestList = await Apify.openRequestList('start-urls', [
        { url: `https://www.instagram.com/explore/tags/${keyword}/` }
    ]);

    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        launchContext: {
            useChrome: true,
            stealth: true, // Enables stealth mode
        },
        handlePageFunction: async ({ page, request }) => {
            console.log(`Processing: ${request.url}`);

            // Scroll to load more results
            await page.evaluate(async () => {
                for (let i = 0; i < 3; i++) { // Limit scrolls to avoid detection
                    window.scrollBy(0, window.innerHeight);
                    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
                }
            });

            // Extract profile URLs
            const profileLinks = await page.$$eval('a[href*="/p/"]', links => links.map(link => link.href));
            
            for (const link of profileLinks) {
                await page.goto(link, { waitUntil: 'networkidle2' });
                
                const username = await page.$eval('h2', el => el.textContent.trim());
                const bio = await page.$eval('.-vDIg span', el => el.textContent.trim());
                const followers = await page.$eval('a[href$="followers/"] span', el => el.textContent);

                await Apify.pushData({ username, bio, followers, profileLink: link });
            }
        },
    });

    await crawler.run();
});

