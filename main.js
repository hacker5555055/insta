const Apify = require('apify');

Apify.main(async () => {
    // Capture the input keyword (for example, {"helloWorld": "doctor"})
    const input = await Apify.getInput();
    const keyword = input.helloWorld || 'doctor';  // Default to "doctor" if no input is provided

    const requestList = await Apify.openRequestList('start-urls', [
        { url: `https://www.instagram.com/explore/tags/${keyword}/` }
    ]);

    const crawler = new Apify.PuppeteerCrawler({
        requestList,
        handlePageFunction: async ({ page, request }) => {
            console.log(`Processing search results for keyword: ${keyword}`);

            // Scroll to load more results
            await page.evaluate(async () => {
                for (let i = 0; i < 5; i++) {
                    window.scrollBy(0, window.innerHeight);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            });

            // Select profile URLs or posts from search results page
            const profileLinks = await page.$$eval('a[href*="/p/"]', (links) =>
                links.map(link => link.href)
            );

            // Visit each profile and extract data
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
