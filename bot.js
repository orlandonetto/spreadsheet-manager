const {Builder, By, Key, until} = require('selenium-webdriver');
const {parse} = require('json2csv');

async function start() {
    let driver = await new Builder().forBrowser('firefox').build();
    try {
        await driver.get('http://www.safraasset.com.br/fundos/lista_fundos_new.asp');

        let response = [];

        const tables = await driver.findElements(By.className('table table-sm table-hover'));
        console.log('tables: ' + tables.length);

        for (const table of tables) {
            const thead = await table.findElement(By.tagName('thead'));

            const theadRow = await thead.findElements(By.tagName('tr'))

            const ths = await theadRow[0].findElement(By.tagName('th'))
            response.push([await ths.getText()]);
            // const heads = [];
            // for (const th of ths)
            //     heads.push(await th.getText());
            //
            // response.push(heads);

            const bodies = await table.findElements(By.tagName('tbody'));
            for (const body of bodies) {
                const trs = await body.findElements(By.tagName('tr'));
                for (const tr of trs) {
                    const tds = await tr.findElements(By.tagName('td'));

                    const line = [];

                    if (tds.length < 1)
                        line.push(await tr.getText())

                    for (const td of tds) {
                        line.push(await td.getText());
                    }
                    response.push(line);
                }
            }
        }

        console.log(JSON.stringify(response));

        const csv = parse(response, {});

        const {writeFile} = require('fs');
        writeFile('./bot.csv', csv, () => console.log('Created.'))

    } finally {
        await driver.quit();
    }
}

start();
