const xj = require('xls-to-json');
const express = require('express');
const {parse} = require('json2csv');
const formidable = require('formidable');
const fs = require('fs');

const app = express()
app.set("json spaces", 2);

function stringPut(origin, put, index) {
    return (""
        + origin.substring(0, index)
        + put
        + origin.substring(index)
    );
}

async function processFile(req) {
    return await new Promise((resolve, reject) => {
        try {
            const form = formidable.IncomingForm({uploadDir: __dirname + '/temp'});
            form.keepExtensions = true;

            form.parse(req, (err, fields, files) => {
                if (err)
                    return reject({ok: false, message: err});

                if (Object.keys(files).length < 1)
                    return reject({ok: false, message: 'Fail to process file, because has not informed.'});

                const file = Object.entries(files)[0];
                if (!file)
                    return reject({ok: false, message: 'Fail to process file.'});

                const filename = /upload_.*/.exec(file[1]['path'])[0];
                const data = {
                    filepath: file[1]['path'],
                    filename: filename
                };

                return resolve({ok: true, data: data});
            });
        } catch (err) {
            return reject({ok: false, message: err.message});
        }
    });
}

// HEADERS: User ID | User Name | Full Name | Phone | Email | Business
app.post('/spreadsheet/phone/format', async (req, res) => {
    await processFile(req)
        .then(file => {
            const config = {
                input: file.data.filepath,
                output: "./temp/output.json",
            }

            xj(config, (err, result) => {
                // deletando file
                fs.unlinkSync(file.data.filepath);

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
            });
        })
        .catch(err => res.status(400).json(err));
});

app.listen(3010, () => console.log('Started on 3010.'));
