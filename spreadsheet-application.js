const xj = require('xls-to-json');
const express = require('express');
const {parse} = require('json2csv');
const fs = require('fs');

const app = express()
app.set("json spaces", 2);

const config = {
    input: "input.xlsx",
    output: "output.json",
}

function stringPut(origin, put, index) {
    return (""
        + origin.substring(0, index)
        + put
        + origin.substring(index)
    );
}

// HEADERS: User ID | User Name | Full Name | Phone | Email | Business
app.get('/', function (req, res) {
    xj(config, function (err, result) {
        if (err)
            return res.send(err);

        const invalid = [];

        const valid = result
            .map(e => { // Retirando todos os caracteres que nao sejam numeros
                e['Phone'] = e['Phone'].replace(/[^0-9]/g, '');
                return e;
            })
            .map(e => { // Pegando apenas os que não estão vazios ou totalmente inválidos (Ter pelo menos DDD(2 dig.) + NUM(8 dig.)
                if (e['Phone'].length >= 10)
                    return e;
                invalid.push(e);
            })
            .filter(e => !!e) // Removendo os undefined
            .map(e => { // Verificando se é celular ou fixo
                e['Tipo'] = e['Phone'].charAt(e['Phone'].length - 8) <= 3 ? 'FIXO' : 'CELULAR';
                return e;
            })
            .map(e => { // Verificar caso seja fixo e nao possuir DDI, adicionar 55 no inicio
                if (e['Tipo'] === 'FIXO' && e['Phone'].length <= 10)
                    e['Phone'] = '55'.concat(e['Phone']);
                return e;
            })
            .map(e => { // Verificar caso seja celular, se já possui o 9 na frente (Teremos um problema caso o DDD tenha um 9 Ex: DDD 89)
                if (e['Tipo'] === "CELULAR" && e['Phone'].charAt(e['Phone'].length - 9) !== "9")
                    e['Phone'] = stringPut(e['Phone'], '9', e['Phone'].length - 8);
                return e;
            })
            .map(e => { // Verificar caso seja celular, se ja possui o DDI, caso nao possua adicionar 55 por padrão
                if (e['Tipo'] === "CELULAR" && e['Phone'].length <= 11)
                    e['Phone'] = '55'.concat(e['Phone']);
                return e;
            })
            .map(e => { // Verificar caso seja celular, e após passar por todas as validações nao possuir um 9 na frente, adiciona-lo
                if (e['Tipo'] === "CELULAR" && e['Phone'].length < 13)
                    e['Phone'] = stringPut(e['Phone'], '9', e['Phone'].length - 8);
                return e;
            })
            // Todos os que tem um DDD acima de 2 casas ficarão inválidos, pois será adicionado um 9 na frente com o passo anterior.
            .map(e => {
                // Pegando apenas os do brasil (55)
                if (e['Phone'].substring(0, 2) === '55')
                    return e;
                invalid.push(e);
            })
            .filter(e => !!e) // Removendo os undefined
            .sort();

        // Removendo duplicados
        const validDistinct = [];
        valid.forEach(e => {
            const duplicated = validDistinct.findIndex(el => {
                return e['Phone'] === el['Phone'];
            }) > -1;

            if (!duplicated)
                validDistinct.push(e);
        });

        // Removendo duplicados
        const invalidDistinct = [];
        invalid.forEach(e => {
            const duplicated = invalidDistinct.findIndex(el => {
                return e['Phone'] === el['Phone'];
            }) > -1;

            if (!duplicated)
                invalidDistinct.push(e);
        });

        const fields = ['User ID', 'User Name', 'Full Name', 'Phone', 'Email', 'Business', 'Tipo'];
        const opts = {fields};

        const csv = parse(validDistinct, opts);

        res.attachment('/output.csv', csv);
        res.send(csv);

        // fs.writeFile('output.csv', csv, () => {
            // res.json({
            //     link: 'https://json-csv.com/',
            //     valid_size: valid.length,
            //     valid_distinct_size: validDistinct.length,
            //     invalid_size: invalid.length,
            //     invalid_distinct_size: invalidDistinct.length,
            // });
        // })

        // const options = {
        //     fieldSeparator: ',',
        //     quoteStrings: '"',
        //     decimalSeparator: '.',
        //     showLabels: true,
        //     showTitle: true,
        //     title: 'My Awesome CSV',
        //     useTextFile: false,
        //     useBom: true,
        //     useKeysAsHeaders: true,
        //     // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
        // };
        //
        // const csvExporter = new ExportToCsv(options);
        // const a = csvExporter.generateCsv(result);
        //
        // return res.send(a);
    });
})

app.listen(3000, () => console.log('Started on 3000.'));