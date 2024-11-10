const Apify = require('apify');

Apify.main(async () => {
    const { keyword } = await Apify.getInput(); // Input keyword dynamically (like 'doctor' or 'realestate')
    
    const requestList = await Apify.openRequestList('start-urls', [
        { url: `https://www.instagram.com/explore/tags/${keyword}/` }
    ]);

    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        handlePageFunction: async ({ page, request }) => {
            console.log(`Processing search results for ${keyword} on ${request.url}...`);

            // Scroll to load more results
            await page.evaluate(async () => {
                for (let i = 0; i < 5; i++) {
                    window.scrollBy(0, window.innerHeight);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            });

            // Select profile URLs from search results page
            const profileLinks = await page.$$eval('a[href*="/p/"]', (links) =>
                links.map(link => link.href)
            );

            // Go through each profile
            for (const link of profileLinks) {
                await page.goto(link, { waitUntil: 'networkidle2' });

                // Extract data
                const username = await page.$eval('h2', el => el.textContent.trim());
                const bio = await page.$eval('.-vDIg span', el => el.textContent.trim());
                const followers = await page.$eval('a[href$="followers/"] span', el => el.textContent);

                // Save results to Apify dataset
                await Apify.pushData({ username, bio, followers, profileLink: link });
            }
        },
    });

    await crawler.run();
});
